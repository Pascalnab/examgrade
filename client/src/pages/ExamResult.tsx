import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  getSubjectLabel,
  getPaperTypeLabel,
  getSubjectColor,
  formatPaperCodeLabel,
} from "@shared/types";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flag,
  Lightbulb,
  Loader2,
  RefreshCw,
  Target,
  TrendingUp,
  XCircle,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

function GradeDisplay({
  grade,
  percentage,
}: {
  grade: string;
  percentage: number;
}) {
  const getGradeColor = (g: string) => {
    if (g === "A*" || g === "A")
      return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (g === "B") return "text-blue-600 bg-blue-50 border-blue-200";
    if (g === "C") return "text-amber-600 bg-amber-50 border-amber-200";
    if (g === "D") return "text-orange-600 bg-orange-50 border-orange-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <div className="flex items-center gap-6">
      <div
        className={`h-20 w-20 rounded-2xl border-2 flex items-center justify-center ${getGradeColor(grade)}`}
      >
        <span className="text-3xl font-bold">{grade}</span>
      </div>
      <div>
        <p className="text-4xl font-bold">{percentage}%</p>
        <p className="text-sm text-muted-foreground mt-1">Overall Score</p>
      </div>
    </div>
  );
}

function QuestionRow({
  q,
  examId,
  onDisputeSuccess,
}: {
  q: {
    id: number;
    questionNumber: string;
    topic: string | null;
    score: number | null;
    maxScore: number | null;
    isCorrect: number | null;
    feedback: string | null;
    studentAnswer: string | null;
    correctAnswer: string | null;
  };
  examId: number;
  onDisputeSuccess: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const isFullMarks = q.score === q.maxScore;
  const isZero = q.score === 0;

  const disputeMutation = trpc.result.dispute.useMutation({
    onSuccess: (data) => {
      setShowDispute(false);
      setDisputeReason("");
      if (data.accepted) {
        toast.success(
          `Dispute accepted! Score updated: ${data.previousScore} → ${data.newScore}/${data.maxScore}`
        );
      } else {
        toast.info("Dispute reviewed — original score maintained.");
      }
      onDisputeSuccess();
    },
    onError: (err) => {
      toast.error(err.message || "Dispute failed. Please try again.");
    },
  });

  const handleDispute = () => {
    if (!disputeReason.trim()) return;
    disputeMutation.mutate({
      examId,
      questionResultId: q.id,
      reason: disputeReason.trim(),
    });
  };

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <button
          className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="shrink-0">
            {isFullMarks ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : isZero ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">
                Q{q.questionNumber}
              </span>
              {q.topic && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {q.topic}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-bold">
              {q.score}/{q.maxScore}
            </span>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>
        {expanded && (
          <div className="px-4 pb-4 pt-1 space-y-3 border-t bg-muted/10">
            {q.feedback && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Feedback
                </p>
                <p className="text-sm">{q.feedback}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {q.studentAnswer && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Your Answer
                  </p>
                  <p className="text-sm">{q.studentAnswer}</p>
                </div>
              )}
              {q.correctAnswer && (
                <div className="p-3 rounded-lg bg-emerald-50">
                  <p className="text-xs font-medium text-emerald-700 mb-1">
                    Correct Answer
                  </p>
                  <p className="text-sm text-emerald-900">
                    {q.correctAnswer}
                  </p>
                </div>
              )}
            </div>
            {/* Dispute button */}
            {!isFullMarks && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-amber-700 border-amber-200 hover:bg-amber-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDispute(true);
                }}
              >
                <Flag className="h-3.5 w-3.5" />
                Dispute This Mark
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Dispute dialog */}
      <Dialog open={showDispute} onOpenChange={setShowDispute}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-amber-600" />
              Dispute Q{q.questionNumber}
            </DialogTitle>
            <DialogDescription>
              Explain why you think this question was marked incorrectly. The AI
              will re-examine your answer against the mark scheme.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/30 text-sm">
              <span className="font-medium">Current score:</span>{" "}
              {q.score}/{q.maxScore}
            </div>
            <Textarea
              placeholder="e.g., I used an alternative valid method — I applied the chain rule differently but arrived at the same answer..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={4}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">
              {disputeReason.length}/2000 characters
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDispute(false)}
              disabled={disputeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDispute}
              disabled={
                !disputeReason.trim() || disputeMutation.isPending
              }
              className="gap-2"
            >
              {disputeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reviewing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Submit Dispute
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ExamResult() {
  const params = useParams<{ examId: string }>();
  const [, setLocation] = useLocation();
  const examId = parseInt(params.examId || "0");
  const [isRegrading, setIsRegrading] = useState(false);

  const utils = trpc.useUtils();

  const { data: exam, isLoading: examLoading } = trpc.exam.get.useQuery(
    { examId },
    { enabled: examId > 0 }
  );
  const { data: result, isLoading: resultLoading } =
    trpc.result.get.useQuery({ examId }, { enabled: examId > 0 });

  const regradeMutation = trpc.result.regrade.useMutation({
    onSuccess: () => {
      toast.info("Old result cleared. Re-grading now...");
      // Trigger the grade procedure
      gradeMutation.mutate({ examId });
    },
    onError: (err) => {
      setIsRegrading(false);
      toast.error(err.message || "Regrade failed.");
    },
  });

  const gradeMutation = trpc.exam.grade.useMutation({
    onSuccess: () => {
      setIsRegrading(false);
      toast.success("Regrade complete!");
      utils.result.get.invalidate({ examId });
      utils.exam.get.invalidate({ examId });
      utils.progress.summary.invalidate();
    },
    onError: (err) => {
      setIsRegrading(false);
      toast.error(err.message || "Regrading failed.");
    },
  });

  const handleRegrade = () => {
    setIsRegrading(true);
    regradeMutation.mutate({ examId });
  };

  const handleDisputeSuccess = () => {
    utils.result.get.invalidate({ examId });
    utils.progress.summary.invalidate();
  };

  const isLoading = examLoading || resultLoading;

  if (isRegrading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md border shadow-sm">
          <CardContent className="p-8 text-center space-y-6">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              <div className="relative h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Regrading in Progress</h2>
              <p className="text-sm text-muted-foreground mt-2">
                The AI is re-grading your entire exam from scratch. This may
                take 30-60 seconds.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Please wait...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!exam || !result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground">Result not found.</p>
        <Button variant="outline" onClick={() => setLocation("/history")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to History
        </Button>
      </div>
    );
  }

  const subjectColor = getSubjectColor(exam.subject);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/history")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">
                {getSubjectLabel(exam.subject)} —{" "}
                {getPaperTypeLabel(exam.paperType)}
              </h1>
              {String((exam as Record<string, unknown>).paperCode || "") && (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  {String((exam as Record<string, unknown>).paperCode)}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {(exam as Record<string, unknown>).paperCode
                ? formatPaperCodeLabel((exam as Record<string, unknown>).paperCode as string)
                : null}
              {exam.sessionLabel && (
                <>{(exam as Record<string, unknown>).paperCode ? " · " : ""}{exam.sessionLabel}</>
              )}
              {!exam.sessionLabel && !(exam as Record<string, unknown>).paperCode &&
                new Date(exam.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
            </p>
          </div>
        </div>
        {/* Regrade button */}
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleRegrade}
          disabled={isRegrading}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regrade
        </Button>
      </div>

      {/* Score overview */}
      <Card className="border shadow-sm overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: subjectColor }} />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <GradeDisplay
              grade={result.grade || "?"}
              percentage={result.percentage || 0}
            />
            <div className="text-right">
              <p className="text-2xl font-bold">
                {result.totalScore}/{result.maxScore}
              </p>
              <p className="text-sm text-muted-foreground">Total Marks</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="analysis" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          {result.overallFeedback && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Overall Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <Streamdown>{result.overallFeedback}</Streamdown>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.strengths && result.strengths.length > 0 && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.strengths.map((s: string, i: number) => (
                      <li
                        key={i}
                        className="text-sm flex items-start gap-2"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {result.weaknesses && result.weaknesses.length > 0 && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {result.weaknesses.map((w: string, i: number) => (
                      <li
                        key={i}
                        className="text-sm flex items-start gap-2"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-2">
          {result.questions && result.questions.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                Expand a question and click "Dispute This Mark" if you think it was graded incorrectly.
              </p>
              {result.questions.map((q, idx) => (
                <QuestionRow
                  key={idx}
                  q={q}
                  examId={examId}
                  onDisputeSuccess={handleDisputeSuccess}
                />
              ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No question-level data available.
            </p>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {result.focusAreas && result.focusAreas.length > 0 && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  Focus Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.focusAreas.map((area: string, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg bg-blue-50"
                    >
                      <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-blue-900">{area}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.drillTopics && result.drillTopics.length > 0 && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  Topics to Drill
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.drillTopics.map((topic: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-sm font-medium"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(!result.focusAreas || result.focusAreas.length === 0) &&
            (!result.drillTopics || result.drillTopics.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recommendations available.
              </p>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
