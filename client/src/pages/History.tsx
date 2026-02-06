import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  CAMBRIDGE_SUBJECTS,
  getSubjectLabel,
  getPaperTypeLabel,
  getSubjectColor,
  formatPaperCodeLabel,
} from "@shared/types";
import {
  Clock,
  FileUp,
  History as HistoryIcon,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function History() {
  const [, setLocation] = useLocation();
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  const { data: results, isLoading } = trpc.result.list.useQuery(
    subjectFilter !== "all" ? { subject: subjectFilter } : {}
  );
  const { data: exams, isLoading: examsLoading } = trpc.exam.list.useQuery({});

  const pendingExams =
    exams?.filter(
      (e) => e.status === "pending" || e.status === "grading"
    ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exam History</h1>
          <p className="text-muted-foreground mt-1">
            View all your graded exams and results.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {CAMBRIDGE_SUBJECTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setLocation("/upload")}>
            <FileUp className="h-4 w-4 mr-2" />
            New Exam
          </Button>
        </div>
      </div>

      {isLoading || examsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Pending exams */}
          {pendingExams.map((exam) => {
            const examAny = exam as Record<string, unknown>;
            const paperCode = examAny.paperCode as string | null;
            return (
              <Card key={`pending-${exam.id}`} className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 opacity-60"
                      style={{
                        backgroundColor: getSubjectColor(exam.subject),
                      }}
                    >
                      {getSubjectLabel(exam.subject)
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {getSubjectLabel(exam.subject)} —{" "}
                          {getPaperTypeLabel(exam.paperType)}
                        </p>
                        {paperCode && (
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {paperCode}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {exam.sessionLabel ||
                          new Date(exam.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {exam.status === "grading" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Grading...
                        </>
                      ) : exam.status === "failed" ? (
                        <>
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          Failed
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4" />
                          Pending
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Completed results */}
          {results && results.length > 0 ? (
            results.map((r) => {
              const examAny = r.exam as Record<string, unknown>;
              const paperCode = examAny.paperCode as string | null;
              return (
                <Card
                  key={r.examResult.id}
                  className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setLocation(`/result/${r.exam.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{
                          backgroundColor: getSubjectColor(r.exam.subject),
                        }}
                      >
                        {getSubjectLabel(r.exam.subject)
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">
                            {getSubjectLabel(r.exam.subject)} —{" "}
                            {getPaperTypeLabel(r.exam.paperType)}
                          </p>
                          {paperCode && (
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {paperCode}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {r.exam.sessionLabel ||
                            new Date(
                              r.examResult.createdAt
                            ).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            {r.examResult.percentage}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.examResult.totalScore}/{r.examResult.maxScore}
                          </p>
                        </div>
                        <span className="text-sm font-bold px-3 py-1 rounded-full bg-primary/10 text-primary">
                          {r.examResult.grade}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : pendingExams.length === 0 ? (
            <Card className="border shadow-sm">
              <CardContent className="p-12 text-center">
                <HistoryIcon className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="font-semibold text-lg">No exams yet</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                  Upload your first exam paper and mark scheme to get started
                  with AI-powered grading.
                </p>
                <Button
                  className="mt-6"
                  onClick={() => setLocation("/upload")}
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  Upload First Exam
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
