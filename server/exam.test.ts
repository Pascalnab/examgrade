import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: "test-key",
    url: "https://storage.example.com/test-file.png",
  }),
}));

// Mock db functions
vi.mock("./db", () => ({
  createExam: vi.fn().mockResolvedValue(1),
  getExamById: vi.fn().mockImplementation((examId: number, userId: number) => {
    if (examId === 1 && userId === 1) {
      return Promise.resolve({
        id: 1,
        userId: 1,
        subject: "math",
        paperType: "paper1",
        paperCode: "9709/12",
        sessionLabel: "May/June 2024",
        year: 2024,
        examFileUrls: ["https://storage.example.com/exam.png"],
        markSchemeUrl: "https://storage.example.com/ms.pdf",
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return Promise.resolve(null);
  }),
  updateExamStatus: vi.fn().mockResolvedValue(undefined),
  getUserExams: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      subject: "math",
      paperType: "paper1",
      paperCode: "9709/12",
      sessionLabel: "May/June 2024",
      year: 2024,
      examFileUrls: ["https://storage.example.com/exam.png"],
      markSchemeUrl: "https://storage.example.com/ms.pdf",
      status: "completed",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  createExamResult: vi.fn().mockResolvedValue(1),
  getExamResultByExamId: vi.fn().mockImplementation((examId: number, userId: number) => {
    if (examId === 1 && userId === 1) {
      return Promise.resolve({
        id: 1,
        examId: 1,
        userId: 1,
        totalScore: 45,
        maxScore: 60,
        percentage: 75,
        grade: "A",
        overallFeedback: "Good performance",
        strengths: ["Algebra"],
        weaknesses: ["Calculus"],
        focusAreas: ["Integration"],
        drillTopics: ["Differentiation"],
        analysisData: {},
        createdAt: new Date(),
      });
    }
    return Promise.resolve(null);
  }),
  getUserExamResults: vi.fn().mockResolvedValue([
    {
      examResult: {
        id: 1,
        examId: 1,
        userId: 1,
        totalScore: 45,
        maxScore: 60,
        percentage: 75,
        grade: "A",
        createdAt: new Date(),
      },
      exam: {
        id: 1,
        subject: "math",
        paperType: "paper1",
        sessionLabel: "May/June 2024",
      },
    },
  ]),
  getQuestionResultsByExamResult: vi.fn().mockResolvedValue([
    {
      id: 1,
      examResultId: 1,
      examId: 1,
      userId: 1,
      questionNumber: "1",
      topic: "Algebra",
      score: 5,
      maxScore: 5,
      isCorrect: 1,
      feedback: "Correct",
      studentAnswer: "x = 3",
      correctAnswer: "x = 3",
      createdAt: new Date(),
    },
  ]),
  createQuestionResults: vi.fn().mockResolvedValue(undefined),
  deleteExamResult: vi.fn().mockResolvedValue(undefined),
  getQuestionResultById: vi.fn().mockImplementation((qId: number, userId: number) => {
    if (qId === 1 && userId === 1) {
      return Promise.resolve({
        id: 1,
        examResultId: 1,
        examId: 1,
        userId: 1,
        questionNumber: "1",
        topic: "Algebra",
        score: 3,
        maxScore: 5,
        isCorrect: 0,
        feedback: "Partial marks",
        studentAnswer: "x = 2",
        correctAnswer: "x = 3",
        createdAt: new Date(),
      });
    }
    return Promise.resolve(null);
  }),
  updateQuestionResult: vi.fn().mockResolvedValue(undefined),
  updateExamResult: vi.fn().mockResolvedValue(undefined),
  getUserProgressBySubject: vi.fn().mockResolvedValue([
    {
      subject: "math",
      paperType: "paper1",
      avgPercentage: 75,
      totalExams: 3,
      latestPercentage: 80,
    },
  ]),
  getUserScoreTrend: vi.fn().mockResolvedValue([
    {
      examId: 1,
      subject: "math",
      paperType: "paper1",
      sessionLabel: "May/June 2024",
      percentage: 75,
      totalScore: 45,
      maxScore: 60,
      grade: "A",
      createdAt: new Date(),
    },
  ]),
  getUserTopicPerformance: vi.fn().mockResolvedValue([
    {
      topic: "Algebra",
      avgScore: 85,
      totalQuestions: 10,
      correctCount: 8,
    },
  ]),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

function createAuthContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("exam.create", () => {
  it("creates an exam with valid input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.exam.create({
      subject: "math",
      paperType: "paper1",
      sessionLabel: "May/June 2024",
      examFiles: [
        {
          name: "page1.png",
          data: "aGVsbG8=", // base64 "hello"
          type: "image/png",
        },
      ],
      markSchemeFile: {
        name: "ms.pdf",
        data: "aGVsbG8=",
        type: "application/pdf",
      },
    });

    expect(result).toHaveProperty("examId");
    expect(result.examId).toBe(1);
  });

  it("creates an exam with paper code and year", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.exam.create({
      subject: "math",
      paperType: "paper1",
      paperCode: "9709/12",
      sessionLabel: "May/June 2024",
      year: 2024,
      examFiles: [
        {
          name: "page1.png",
          data: "aGVsbG8=",
          type: "image/png",
        },
      ],
      markSchemeFile: {
        name: "ms.pdf",
        data: "aGVsbG8=",
        type: "application/pdf",
      },
    });

    expect(result).toHaveProperty("examId");
    expect(result.examId).toBe(1);
  });

  it("rejects invalid subject-paper combination", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.exam.create({
        subject: "math",
        paperType: "mcq", // math doesn't have MCQ
        examFiles: [
          { name: "page1.png", data: "aGVsbG8=", type: "image/png" },
        ],
        markSchemeFile: {
          name: "ms.pdf",
          data: "aGVsbG8=",
          type: "application/pdf",
        },
      })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.exam.create({
        subject: "math",
        paperType: "paper1",
        examFiles: [
          { name: "page1.png", data: "aGVsbG8=", type: "image/png" },
        ],
        markSchemeFile: {
          name: "ms.pdf",
          data: "aGVsbG8=",
          type: "application/pdf",
        },
      })
    ).rejects.toThrow();
  });
});

describe("exam.get", () => {
  it("returns exam for valid user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.exam.get({ examId: 1 });
    expect(result).toBeTruthy();
    expect(result.subject).toBe("math");
    expect(result.paperType).toBe("paper1");
  });

  it("throws NOT_FOUND for non-existent exam", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.exam.get({ examId: 999 })).rejects.toThrow();
  });
});

describe("exam.list", () => {
  it("returns user exams", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.exam.list({});
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("result.get", () => {
  it("returns exam result with questions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.result.get({ examId: 1 });
    expect(result).toBeTruthy();
    expect(result.percentage).toBe(75);
    expect(result.grade).toBe("A");
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].questionNumber).toBe("1");
  });

  it("throws NOT_FOUND for missing result", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.result.get({ examId: 999 })).rejects.toThrow();
  });
});

describe("result.list", () => {
  it("returns all results for user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.result.list({});
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("progress.summary", () => {
  it("returns progress summary by subject", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.progress.summary();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].subject).toBe("math");
    expect(result[0].avgPercentage).toBe(75);
  });
});

describe("progress.trend", () => {
  it("returns score trend data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.progress.trend({});
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].percentage).toBe(75);
  });

  it("filters by subject", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.progress.trend({ subject: "math" });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("progress.topics", () => {
  it("returns topic performance data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.progress.topics({});
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].topic).toBe("Algebra");
    expect(result[0].avgScore).toBe(85);
  });
});

describe("result.dispute", () => {
  it("rejects unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.result.dispute({
        examId: 1,
        questionResultId: 1,
        reason: "I used an alternative method",
      })
    ).rejects.toThrow();
  });

  it("rejects empty dispute reason", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.result.dispute({
        examId: 1,
        questionResultId: 1,
        reason: "",
      })
    ).rejects.toThrow();
  });

  it("throws NOT_FOUND for non-existent exam", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.result.dispute({
        examId: 999,
        questionResultId: 1,
        reason: "I used an alternative method",
      })
    ).rejects.toThrow();
  });

  it("throws NOT_FOUND for non-existent question", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.result.dispute({
        examId: 1,
        questionResultId: 999,
        reason: "I used an alternative method",
      })
    ).rejects.toThrow();
  });
});

describe("result.regrade", () => {
  it("deletes existing result and resets exam status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const { deleteExamResult, updateExamStatus } = await import("./db");

    const result = await caller.result.regrade({ examId: 1 });

    expect(result.success).toBe(true);
    expect(result.examId).toBe(1);
    expect(deleteExamResult).toHaveBeenCalledWith(1, 1);
    expect(updateExamStatus).toHaveBeenCalledWith(1, "pending");
  });

  it("throws NOT_FOUND for non-existent exam", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.result.regrade({ examId: 999 })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.result.regrade({ examId: 1 })
    ).rejects.toThrow();
  });
});
