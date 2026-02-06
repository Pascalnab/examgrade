import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  exams,
  examResults,
  questionResults,
  type InsertExam,
  type InsertExamResult,
  type InsertQuestionResult,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User Helpers ───────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Exam Helpers ───────────────────────────────────────────────────────────

export async function createExam(data: InsertExam) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(exams).values(data);
  return result[0].insertId;
}

export async function getExamById(examId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(exams)
    .where(and(eq(exams.id, examId), eq(exams.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateExamStatus(examId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(exams).set({ status }).where(eq(exams.id, examId));
}

export async function getUserExams(userId: number, limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(exams)
    .where(eq(exams.userId, userId))
    .orderBy(desc(exams.createdAt))
    .limit(limit)
    .offset(offset);
}

// ─── Exam Result Helpers ────────────────────────────────────────────────────

export async function createExamResult(data: InsertExamResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(examResults).values(data);
  return result[0].insertId;
}

export async function getExamResultByExamId(examId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(examResults)
    .where(
      and(eq(examResults.examId, examId), eq(examResults.userId, userId))
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserExamResults(userId: number, subject?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(examResults.userId, userId)];

  const rows = await db
    .select({
      examResult: examResults,
      exam: exams,
    })
    .from(examResults)
    .innerJoin(exams, eq(examResults.examId, exams.id))
    .where(
      subject
        ? and(...conditions, eq(exams.subject, subject))
        : and(...conditions)
    )
    .orderBy(desc(examResults.createdAt));

  return rows;
}

/** Delete exam result and its question results (for regrade) */
export async function deleteExamResult(examId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete question results first
  await db
    .delete(questionResults)
    .where(
      and(
        eq(questionResults.examId, examId),
        eq(questionResults.userId, userId)
      )
    );

  // Delete exam result
  await db
    .delete(examResults)
    .where(
      and(eq(examResults.examId, examId), eq(examResults.userId, userId))
    );
}

/** Update a single exam result's overall scores (after dispute re-evaluation) */
export async function updateExamResult(
  examResultId: number,
  data: {
    totalScore: number;
    maxScore: number;
    percentage: number;
    grade: string;
    overallFeedback?: string;
    strengths?: string[];
    weaknesses?: string[];
    focusAreas?: string[];
    drillTopics?: string[];
    analysisData?: Record<string, unknown>;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(examResults)
    .set(data)
    .where(eq(examResults.id, examResultId));
}

// ─── Question Result Helpers ────────────────────────────────────────────────

export async function createQuestionResults(data: InsertQuestionResult[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  await db.insert(questionResults).values(data);
}

export async function getQuestionResultsByExamResult(
  examResultId: number,
  userId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(questionResults)
    .where(
      and(
        eq(questionResults.examResultId, examResultId),
        eq(questionResults.userId, userId)
      )
    )
    .orderBy(questionResults.questionNumber);
}

/** Get a single question result by ID */
export async function getQuestionResultById(
  questionResultId: number,
  userId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select()
    .from(questionResults)
    .where(
      and(
        eq(questionResults.id, questionResultId),
        eq(questionResults.userId, userId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Update a single question result (after dispute) */
export async function updateQuestionResult(
  questionResultId: number,
  data: {
    score?: number;
    isCorrect?: number;
    feedback?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(questionResults)
    .set(data)
    .where(eq(questionResults.id, questionResultId));
}

// ─── Progress/Stats Helpers ─────────────────────────────────────────────────

export async function getUserProgressBySubject(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select({
      subject: exams.subject,
      paperType: exams.paperType,
      avgPercentage: sql<number>`AVG(${examResults.percentage})`.as("avgPercentage"),
      totalExams: sql<number>`COUNT(${examResults.id})`.as("totalExams"),
      latestPercentage: sql<number>`(
        SELECT er2.percentage FROM exam_results er2
        INNER JOIN exams e2 ON er2.examId = e2.id
        WHERE er2.userId = ${userId} AND e2.subject = ${exams.subject} AND e2.paperType = ${exams.paperType}
        ORDER BY er2.createdAt DESC LIMIT 1
      )`.as("latestPercentage"),
    })
    .from(examResults)
    .innerJoin(exams, eq(examResults.examId, exams.id))
    .where(eq(examResults.userId, userId))
    .groupBy(exams.subject, exams.paperType);

  return rows;
}

export async function getUserScoreTrend(
  userId: number,
  subject?: string,
  paperType?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(examResults.userId, userId)];
  if (subject) conditions.push(eq(exams.subject, subject));
  if (paperType) conditions.push(eq(exams.paperType, paperType));

  return db
    .select({
      examId: exams.id,
      subject: exams.subject,
      paperType: exams.paperType,
      sessionLabel: exams.sessionLabel,
      percentage: examResults.percentage,
      totalScore: examResults.totalScore,
      maxScore: examResults.maxScore,
      grade: examResults.grade,
      createdAt: examResults.createdAt,
    })
    .from(examResults)
    .innerJoin(exams, eq(examResults.examId, exams.id))
    .where(and(...conditions))
    .orderBy(examResults.createdAt);
}

export async function getUserTopicPerformance(userId: number, subject?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(questionResults.userId, userId)];
  if (subject) conditions.push(eq(exams.subject, subject));

  return db
    .select({
      topic: questionResults.topic,
      avgScore: sql<number>`AVG(${questionResults.score} / ${questionResults.maxScore} * 100)`.as("avgScore"),
      totalQuestions: sql<number>`COUNT(${questionResults.id})`.as("totalQuestions"),
      correctCount: sql<number>`SUM(CASE WHEN ${questionResults.score} = ${questionResults.maxScore} THEN 1 ELSE 0 END)`.as("correctCount"),
    })
    .from(questionResults)
    .innerJoin(exams, eq(questionResults.examId, exams.id))
    .where(and(...conditions))
    .groupBy(questionResults.topic);
}
