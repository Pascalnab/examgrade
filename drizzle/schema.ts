import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
/**
 * Exams table — stores each uploaded exam submission
 */
export const exams = mysqlTable("exams", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Subject: math, mechanics, physics, chemistry */
  subject: varchar("subject", { length: 64 }).notNull(),
  /** Paper type: paper1, paper2, mcq */
  paperType: varchar("paperType", { length: 64 }).notNull(),
  /** Cambridge paper code, e.g. "9709/12" */
  paperCode: varchar("paperCode", { length: 16 }),
  /** Exam session, e.g. "May/June" */
  sessionLabel: varchar("sessionLabel", { length: 128 }),
  /** Exam year, e.g. 2024 */
  year: int("year"),
  /** S3 URLs for uploaded exam images/pages (JSON array of strings) */
  examFileUrls: json("examFileUrls").$type<string[]>().notNull(),
  /** S3 URL for the mark scheme PDF */
  markSchemeUrl: varchar("markSchemeUrl", { length: 1024 }).notNull(),
  /** Grading status: pending, grading, completed, failed */
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Exam = typeof exams.$inferSelect;
export type InsertExam = typeof exams.$inferInsert;
/**
 * Exam results — overall grading result for an exam
 */
export const examResults = mysqlTable("exam_results", {
  id: int("id").autoincrement().primaryKey(),
  examId: int("examId").notNull(),
  userId: int("userId").notNull(),
  /** Total score achieved */
  totalScore: int("totalScore"),
  /** Maximum possible score */
  maxScore: int("maxScore"),
  /** Percentage score (0-100) */
  percentage: int("percentage"),
  /** Overall grade (A*, A, B, C, D, E, U) */
  grade: varchar("grade", { length: 8 }),
  /** AI-generated overall feedback (markdown) */
  overallFeedback: text("overallFeedback"),
  /** Strengths identified (JSON array of strings) */
  strengths: json("strengths").$type<string[]>(),
  /** Weaknesses identified (JSON array of strings) */
  weaknesses: json("weaknesses").$type<string[]>(),
  /** Topics to focus on (JSON array of strings) */
  focusAreas: json("focusAreas").$type<string[]>(),
  /** Topics to drill (JSON array of strings) */
  drillTopics: json("drillTopics").$type<string[]>(),
  /** Full structured analysis from AI (JSON) */
  analysisData: json("analysisData").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ExamResult = typeof examResults.$inferSelect;
export type InsertExamResult = typeof examResults.$inferInsert;
/**
 * Question-level results — per-question breakdown
 */
export const questionResults = mysqlTable("question_results", {
  id: int("id").autoincrement().primaryKey(),
  examResultId: int("examResultId").notNull(),
  examId: int("examId").notNull(),
  userId: int("userId").notNull(),
  /** Question number/label */
  questionNumber: varchar("questionNumber", { length: 32 }).notNull(),
  /** Topic/section this question belongs to */
  topic: varchar("topic", { length: 128 }),
  /** Score achieved for this question */
  score: int("score"),
  /** Maximum score for this question */
  maxScore: int("maxScore"),
  /** Whether the answer was correct (for MCQ) */
  isCorrect: int("isCorrect"),
  /** AI feedback for this specific question */
  feedback: text("feedback"),
  /** Student's answer (extracted by AI) */
  studentAnswer: text("studentAnswer"),
  /** Correct answer from mark scheme */
  correctAnswer: text("correctAnswer"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type QuestionResult = typeof questionResults.$inferSelect;
export type InsertQuestionResult = typeof questionResults.$inferInsert;
