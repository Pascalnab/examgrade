import { COOKIE_NAME } from "@shared/const";
import { SUBJECT_PAPER_MAP } from "@shared/types";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createExam,
  createExamResult,
  createQuestionResults,
  deleteExamResult,
  getExamById,
  getExamResultByExamId,
  getQuestionResultById,
  getQuestionResultsByExamResult,
  getUserExamResults,
  getUserExams,
  getUserProgressBySubject,
  getUserScoreTrend,
  getUserTopicPerformance,
  updateExamResult,
  updateExamStatus,
  updateQuestionResult,
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  exam: router({
    /** Upload exam files and create an exam record */
    create: protectedProcedure
      .input(
        z.object({
          subject: z.string(),
          paperType: z.string(),
          paperCode: z.string().optional(),
          sessionLabel: z.string().optional(),
          year: z.number().optional(),
          examFiles: z.array(
            z.object({
              name: z.string(),
              data: z.string(), // base64
              type: z.string(),
            })
          ),
          markSchemeFile: z.object({
            name: z.string(),
            data: z.string(), // base64
            type: z.string(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;

        // Validate subject-paper combination
        const validPapers = SUBJECT_PAPER_MAP[input.subject];
        if (!validPapers || !validPapers.includes(input.paperType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid paper type "${input.paperType}" for subject "${input.subject}"`,
          });
        }

        // Upload exam files to S3
        const examFileUrls: string[] = [];
        for (const file of input.examFiles) {
          const buffer = Buffer.from(file.data, "base64");
          const key = `exams/${userId}/${nanoid()}-${file.name}`;
          const { url } = await storagePut(key, buffer, file.type);
          examFileUrls.push(url);
        }

        // Upload mark scheme to S3
        const msBuffer = Buffer.from(input.markSchemeFile.data, "base64");
        const msKey = `markschemes/${userId}/${nanoid()}-${input.markSchemeFile.name}`;
        const { url: markSchemeUrl } = await storagePut(
          msKey,
          msBuffer,
          input.markSchemeFile.type
        );

        // Create exam record
        const examId = await createExam({
          userId,
          subject: input.subject,
          paperType: input.paperType,
          paperCode: input.paperCode || null,
          sessionLabel: input.sessionLabel || null,
          year: input.year || null,
          examFileUrls,
          markSchemeUrl,
          status: "pending",
        });

        return { examId };
      }),

    /** Get a single exam by ID */
    get: protectedProcedure
      .input(z.object({ examId: z.number() }))
      .query(async ({ ctx, input }) => {
        const exam = await getExamById(input.examId, ctx.user.id);
        if (!exam) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Exam not found" });
        }
        return exam;
      }),

    /** List user's exams */
    list: protectedProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).optional(),
            offset: z.number().min(0).optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        return getUserExams(
          ctx.user.id,
          input?.limit ?? 50,
          input?.offset ?? 0
        );
      }),

    /** Trigger AI grading for an exam */
    grade: protectedProcedure
      .input(z.object({ examId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        const exam = await getExamById(input.examId, userId);

        if (!exam) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Exam not found" });
        }

        if (exam.status === "completed") {
          const existing = await getExamResultByExamId(exam.id, userId);
          if (existing) return { examResultId: existing.id };
        }

        // Update status to grading
        await updateExamStatus(exam.id, "grading");

        try {
          // Build the LLM prompt with vision
          const contentParts: Array<
            | { type: "text"; text: string }
            | { type: "image_url"; image_url: { url: string; detail: "high" } }
            | { type: "file_url"; file_url: { url: string; mime_type: "application/pdf" } }
          > = [];

          contentParts.push({
            type: "text",
            text: `You are an expert Cambridge AS and A Level exam grader. You are grading a ${exam.subject} ${exam.paperType} exam.

TASK: Compare the student's exam answers against the official Cambridge mark scheme and grade each question.

INSTRUCTIONS:
1. Carefully examine each page of the student's exam paper
2. Read the mark scheme thoroughly
3. For each question, determine the score based on the mark scheme criteria
4. Provide specific, constructive feedback for each question
5. Identify the topic/section each question belongs to
6. Calculate the total score

For MCQ papers: identify each answer choice and compare against the mark scheme.
For written papers: evaluate working, method marks, accuracy marks, and communication marks as per Cambridge standards.

Return your analysis as JSON matching the schema below.`,
          });

          // Add exam images
          for (const url of exam.examFileUrls as string[]) {
            if (url.toLowerCase().endsWith(".pdf")) {
              contentParts.push({
                type: "file_url",
                file_url: { url, mime_type: "application/pdf" },
              });
            } else {
              contentParts.push({
                type: "image_url",
                image_url: { url, detail: "high" },
              });
            }
          }

          // Add mark scheme
          contentParts.push({
            type: "text",
            text: "MARK SCHEME (PDF):",
          });
          contentParts.push({
            type: "file_url",
            file_url: {
              url: exam.markSchemeUrl,
              mime_type: "application/pdf",
            },
          });

          const response = await invokeLLM({
            messages: [
              {
                role: "user",
                content: contentParts,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "exam_grading_result",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    totalScore: {
                      type: "integer",
                      description: "Total marks achieved",
                    },
                    maxScore: {
                      type: "integer",
                      description: "Maximum possible marks",
                    },
                    percentage: {
                      type: "integer",
                      description: "Percentage score (0-100)",
                    },
                    grade: {
                      type: "string",
                      description:
                        "Cambridge grade: A*, A, B, C, D, E, or U",
                    },
                    overallFeedback: {
                      type: "string",
                      description:
                        "Detailed overall feedback in markdown format. Include what the student did well, areas for improvement, and specific study recommendations.",
                    },
                    strengths: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        "List of specific strengths demonstrated in the exam",
                    },
                    weaknesses: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        "List of specific weaknesses or areas needing improvement",
                    },
                    focusAreas: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        "Topics the student should focus on studying next",
                    },
                    drillTopics: {
                      type: "array",
                      items: { type: "string" },
                      description:
                        "Specific topics/skills the student should practice repeatedly",
                    },
                    questions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          questionNumber: {
                            type: "string",
                            description:
                              "Question number (e.g., '1', '2a', '3bi')",
                          },
                          topic: {
                            type: "string",
                            description:
                              "Topic or section this question belongs to",
                          },
                          score: {
                            type: "integer",
                            description: "Marks awarded",
                          },
                          maxScore: {
                            type: "integer",
                            description: "Maximum marks available",
                          },
                          isCorrect: {
                            type: "boolean",
                            description:
                              "Whether the answer is fully correct",
                          },
                          feedback: {
                            type: "string",
                            description:
                              "Specific feedback for this question",
                          },
                          studentAnswer: {
                            type: "string",
                            description:
                              "What the student wrote/selected",
                          },
                          correctAnswer: {
                            type: "string",
                            description:
                              "The correct answer from the mark scheme",
                          },
                        },
                        required: [
                          "questionNumber",
                          "topic",
                          "score",
                          "maxScore",
                          "isCorrect",
                          "feedback",
                          "studentAnswer",
                          "correctAnswer",
                        ],
                        additionalProperties: false,
                      },
                      description: "Per-question grading breakdown",
                    },
                  },
                  required: [
                    "totalScore",
                    "maxScore",
                    "percentage",
                    "grade",
                    "overallFeedback",
                    "strengths",
                    "weaknesses",
                    "focusAreas",
                    "drillTopics",
                    "questions",
                  ],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = response.choices[0]?.message?.content;
          if (!content || typeof content !== "string") {
            throw new Error("No response from AI grading");
          }

          const grading = JSON.parse(content);

          // Save exam result
          const examResultId = await createExamResult({
            examId: exam.id,
            userId,
            totalScore: grading.totalScore,
            maxScore: grading.maxScore,
            percentage: grading.percentage,
            grade: grading.grade,
            overallFeedback: grading.overallFeedback,
            strengths: grading.strengths,
            weaknesses: grading.weaknesses,
            focusAreas: grading.focusAreas,
            drillTopics: grading.drillTopics,
            analysisData: grading,
          });

          // Save question results
          if (grading.questions && grading.questions.length > 0) {
            await createQuestionResults(
              grading.questions.map(
                (q: {
                  questionNumber: string;
                  topic: string;
                  score: number;
                  maxScore: number;
                  isCorrect: boolean;
                  feedback: string;
                  studentAnswer: string;
                  correctAnswer: string;
                }) => ({
                  examResultId,
                  examId: exam.id,
                  userId,
                  questionNumber: q.questionNumber,
                  topic: q.topic,
                  score: q.score,
                  maxScore: q.maxScore,
                  isCorrect: q.isCorrect ? 1 : 0,
                  feedback: q.feedback,
                  studentAnswer: q.studentAnswer,
                  correctAnswer: q.correctAnswer,
                })
              )
            );
          }

          // Update exam status
          await updateExamStatus(exam.id, "completed");

          return { examResultId };
        } catch (error) {
          await updateExamStatus(exam.id, "failed");
          console.error("[Grading] Failed:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "AI grading failed. Please try again.",
          });
        }
      }),
  }),

  result: router({
    /** Get exam result with question breakdown */
    get: protectedProcedure
      .input(z.object({ examId: z.number() }))
      .query(async ({ ctx, input }) => {
        const examResult = await getExamResultByExamId(
          input.examId,
          ctx.user.id
        );
        if (!examResult) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Result not found",
          });
        }

        const questions = await getQuestionResultsByExamResult(
          examResult.id,
          ctx.user.id
        );

        return { ...examResult, questions };
      }),

    /** List all exam results for user */
    list: protectedProcedure
      .input(z.object({ subject: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getUserExamResults(ctx.user.id, input?.subject);
      }),

    /** Dispute a specific question — AI re-evaluates with student's reasoning */
    dispute: protectedProcedure
      .input(
        z.object({
          examId: z.number(),
          questionResultId: z.number(),
          reason: z.string().min(1).max(2000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        const exam = await getExamById(input.examId, userId);
        if (!exam) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Exam not found" });
        }

        const examResult = await getExamResultByExamId(exam.id, userId);
        if (!examResult) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Result not found" });
        }

        const questionResult = await getQuestionResultById(
          input.questionResultId,
          userId
        );
        if (!questionResult) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
        }

        // Build vision content for the dispute
        const contentParts: Array<
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: { url: string; detail: "high" } }
          | { type: "file_url"; file_url: { url: string; mime_type: "application/pdf" } }
        > = [];

        contentParts.push({
          type: "text",
          text: `You are an expert Cambridge AS and A Level exam grader reviewing a DISPUTE on a specific question.

The student is disputing the grade for Question ${questionResult.questionNumber} in a ${exam.subject} ${exam.paperType} exam.

ORIGINAL GRADING:
- Score: ${questionResult.score}/${questionResult.maxScore}
- Student's answer (as read): ${questionResult.studentAnswer}
- Correct answer: ${questionResult.correctAnswer}
- Original feedback: ${questionResult.feedback}

STUDENT'S DISPUTE REASON:
"${input.reason}"

INSTRUCTIONS:
1. Re-examine the student's exam paper for this specific question
2. Re-read the mark scheme for this question
3. Consider the student's dispute reason carefully
4. Determine if the original grading was fair or if the score should be adjusted
5. Be fair — if the student has a valid point (e.g., alternative valid method, misread handwriting), adjust the score
6. If the original grading was correct, keep the same score but explain why

Return JSON matching the schema below.`,
        });

        // Add exam images
        for (const url of exam.examFileUrls as string[]) {
          if (url.toLowerCase().endsWith(".pdf")) {
            contentParts.push({
              type: "file_url",
              file_url: { url, mime_type: "application/pdf" },
            });
          } else {
            contentParts.push({
              type: "image_url",
              image_url: { url, detail: "high" },
            });
          }
        }

        // Add mark scheme
        contentParts.push({ type: "text", text: "MARK SCHEME (PDF):" });
        contentParts.push({
          type: "file_url",
          file_url: { url: exam.markSchemeUrl, mime_type: "application/pdf" },
        });

        const response = await invokeLLM({
          messages: [{ role: "user", content: contentParts }],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "dispute_result",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  newScore: {
                    type: "integer",
                    description: "The revised score for this question",
                  },
                  maxScore: {
                    type: "integer",
                    description: "Maximum marks for this question",
                  },
                  accepted: {
                    type: "boolean",
                    description: "Whether the dispute was accepted (score changed)",
                  },
                  feedback: {
                    type: "string",
                    description: "Detailed explanation of the dispute review decision",
                  },
                },
                required: ["newScore", "maxScore", "accepted", "feedback"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== "string") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No response from AI dispute review",
          });
        }

        const disputeResult = JSON.parse(content);

        // Update question result
        await updateQuestionResult(input.questionResultId, {
          score: disputeResult.newScore,
          isCorrect: disputeResult.newScore === disputeResult.maxScore ? 1 : 0,
          feedback: disputeResult.feedback,
        });

        // Recalculate exam totals
        const allQuestions = await getQuestionResultsByExamResult(
          examResult.id,
          userId
        );
        // Apply the updated score for the disputed question
        const newTotalScore = allQuestions.reduce((sum, q) => {
          if (q.id === input.questionResultId) return sum + disputeResult.newScore;
          return sum + (q.score ?? 0);
        }, 0);
        const totalMaxScore = allQuestions.reduce(
          (sum, q) => sum + (q.maxScore ?? 0),
          0
        );
        const newPercentage = totalMaxScore > 0
          ? Math.round((newTotalScore / totalMaxScore) * 100)
          : 0;

        // Determine new grade
        const gradeFromPct = (pct: number) => {
          if (pct >= 90) return "A*";
          if (pct >= 80) return "A";
          if (pct >= 70) return "B";
          if (pct >= 60) return "C";
          if (pct >= 50) return "D";
          if (pct >= 40) return "E";
          return "U";
        };

        await updateExamResult(examResult.id, {
          totalScore: newTotalScore,
          maxScore: totalMaxScore,
          percentage: newPercentage,
          grade: gradeFromPct(newPercentage),
        });

        return {
          accepted: disputeResult.accepted,
          previousScore: questionResult.score,
          newScore: disputeResult.newScore,
          maxScore: disputeResult.maxScore,
          feedback: disputeResult.feedback,
          newTotalScore,
          newPercentage,
          newGrade: gradeFromPct(newPercentage),
        };
      }),

    /** Regrade — delete old result and re-run full AI grading */
    regrade: protectedProcedure
      .input(z.object({ examId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        const exam = await getExamById(input.examId, userId);
        if (!exam) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Exam not found" });
        }

        // Delete existing result and questions
        await deleteExamResult(exam.id, userId);

        // Reset exam status
        await updateExamStatus(exam.id, "pending");

        return { success: true, examId: exam.id };
      }),
  }),

  progress: router({
    /** Get progress summary by subject */
    summary: protectedProcedure.query(async ({ ctx }) => {
      return getUserProgressBySubject(ctx.user.id);
    }),

    /** Get score trend over time */
    trend: protectedProcedure
      .input(
        z
          .object({
            subject: z.string().optional(),
            paperType: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ ctx, input }) => {
        return getUserScoreTrend(
          ctx.user.id,
          input?.subject,
          input?.paperType
        );
      }),

    /** Get topic-level performance */
    topics: protectedProcedure
      .input(z.object({ subject: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getUserTopicPerformance(ctx.user.id, input?.subject);
      }),
  }),
});

export type AppRouter = typeof appRouter;
