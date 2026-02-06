import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  getSubjectLabel,
  getPaperTypeLabel,
  getSubjectColor,
} from "@shared/types";
import {
  BarChart3,
  BookOpen,
  FileUp,
  Target,
  TrendingUp,
  Award,
  ArrowRight,
  Clock,
} from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: progressData, isLoading: progressLoading } =
    trpc.progress.summary.useQuery();
  const { data: recentResults, isLoading: resultsLoading } =
    trpc.result.list.useQuery({});
  const { data: trendData } = trpc.progress.trend.useQuery({});

  const totalExams = progressData?.reduce(
    (sum, p) => sum + Number(p.totalExams),
    0
  ) ?? 0;
  const avgScore = progressData && progressData.length > 0
    ? Math.round(
        progressData.reduce((sum, p) => sum + Number(p.avgPercentage), 0) /
          progressData.length
      )
    : 0;

  const latestResult = recentResults?.[0];
  const latestGrade = latestResult?.examResult?.grade ?? "-";

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground">
          Track your Cambridge AS & A Level exam progress and improve your
          scores.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Exams Graded
                </p>
                {progressLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold mt-1">{totalExams}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Average Score
                </p>
                {progressLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold mt-1">{avgScore}%</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Latest Grade
                </p>
                {resultsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold mt-1">{latestGrade}</p>
                )}
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Subjects
                </p>
                {progressLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold mt-1">
                    {new Set(progressData?.map((p) => p.subject)).size}
                  </p>
                )}
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full justify-start gap-3 h-12"
              onClick={() => setLocation("/upload")}
            >
              <FileUp className="h-4 w-4" />
              Upload & Grade New Exam
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => setLocation("/history")}
            >
              <Clock className="h-4 w-4" />
              View Exam History
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => setLocation("/progress")}
            >
              <TrendingUp className="h-4 w-4" />
              View Progress Charts
            </Button>
          </CardContent>
        </Card>

        {/* Subject performance */}
        <Card className="border shadow-sm lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Subject Performance
            </CardTitle>
            {progressData && progressData.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setLocation("/progress")}
              >
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {progressLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : progressData && progressData.length > 0 ? (
              <div className="space-y-3">
                {progressData.map((item, idx) => {
                  const pct = Math.round(Number(item.avgPercentage));
                  const color = getSubjectColor(item.subject);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
                    >
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {getSubjectLabel(item.subject)
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">
                            {getSubjectLabel(item.subject)} —{" "}
                            {getPaperTypeLabel(item.paperType)}
                          </span>
                          <span className="text-sm font-bold ml-2">{pct}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No exams graded yet.</p>
                <p className="text-xs mt-1">
                  Upload your first exam to see performance data.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent results */}
      {recentResults && recentResults.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Recent Results
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setLocation("/history")}
            >
              View all <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentResults.slice(0, 5).map((r) => (
                <div
                  key={r.examResult.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/result/${r.exam.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{
                        backgroundColor: getSubjectColor(r.exam.subject),
                      }}
                    >
                      {getSubjectLabel(r.exam.subject)
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {getSubjectLabel(r.exam.subject)} —{" "}
                        {getPaperTypeLabel(r.exam.paperType)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.exam.sessionLabel ||
                          new Date(r.examResult.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">
                      {r.examResult.percentage}%
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {r.examResult.grade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
