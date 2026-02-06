import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  SUBJECTS,
  getSubjectLabel,
  getPaperTypeLabel,
  getSubjectColor,
} from "@shared/types";
import {
  BarChart3,
  TrendingUp,
  Target,
  BookOpen,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

export default function Progress() {
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  const { data: summary, isLoading: summaryLoading } =
    trpc.progress.summary.useQuery();
  const { data: trend, isLoading: trendLoading } =
    trpc.progress.trend.useQuery(
      subjectFilter !== "all" ? { subject: subjectFilter } : {}
    );
  const { data: topics, isLoading: topicsLoading } =
    trpc.progress.topics.useQuery(
      subjectFilter !== "all" ? { subject: subjectFilter } : {}
    );

  const trendChartData = useMemo(() => {
    if (!trend) return [];
    return trend.map((t, idx) => ({
      name: t.sessionLabel || `Exam ${idx + 1}`,
      percentage: t.percentage,
      subject: getSubjectLabel(t.subject),
      grade: t.grade,
    }));
  }, [trend]);

  const topicChartData = useMemo(() => {
    if (!topics) return [];
    return topics
      .filter((t) => t.topic)
      .map((t) => ({
        topic: t.topic,
        score: Math.round(Number(t.avgScore)),
        questions: Number(t.totalQuestions),
      }))
      .sort((a, b) => a.score - b.score);
  }, [topics]);

  const radarData = useMemo(() => {
    if (!summary || summary.length === 0) return [];
    const subjectMap = new Map<string, number[]>();
    summary.forEach((s) => {
      const key = s.subject;
      if (!subjectMap.has(key)) subjectMap.set(key, []);
      subjectMap.get(key)!.push(Number(s.avgPercentage));
    });
    return Array.from(subjectMap.entries()).map(([subject, scores]) => ({
      subject: getSubjectLabel(subject),
      score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      fullMark: 100,
    }));
  }, [summary]);

  const totalExams =
    summary?.reduce((sum, p) => sum + Number(p.totalExams), 0) ?? 0;
  const avgScore =
    summary && summary.length > 0
      ? Math.round(
          summary.reduce((sum, p) => sum + Number(p.avgPercentage), 0) /
            summary.length
        )
      : 0;
  const bestSubject =
    summary && summary.length > 0
      ? summary.reduce((best, curr) =>
          Number(curr.avgPercentage) > Number(best.avgPercentage) ? curr : best
        )
      : null;

  const hasData = totalExams > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Progress Tracker
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your improvement across subjects and identify areas to focus
            on.
          </p>
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {SUBJECTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Exams</p>
                {summaryLoading ? (
                  <Skeleton className="h-7 w-12 mt-0.5" />
                ) : (
                  <p className="text-xl font-bold">{totalExams}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                {summaryLoading ? (
                  <Skeleton className="h-7 w-12 mt-0.5" />
                ) : (
                  <p className="text-xl font-bold">{avgScore}%</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Best Subject</p>
                {summaryLoading ? (
                  <Skeleton className="h-7 w-24 mt-0.5" />
                ) : (
                  <p className="text-xl font-bold">
                    {bestSubject
                      ? getSubjectLabel(bestSubject.subject)
                      : "-"}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!hasData && !summaryLoading ? (
        <Card className="border shadow-sm">
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-lg">No progress data yet</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Upload and grade some exams to see your progress charts and
              analytics here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Score trend chart */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Score Trend Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trendLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : trendChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "13px",
                      }}
                      formatter={(value: number, name: string) => [
                        `${value}%`,
                        "Score",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="percentage"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={{
                        fill: "hsl(var(--primary))",
                        strokeWidth: 2,
                        r: 5,
                      }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">
                  Not enough data to show a trend yet.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject radar chart */}
            {radarData.length >= 2 && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    Subject Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fontSize: 12 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Topic performance bar chart */}
            {topicChartData.length > 0 && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-emerald-500" />
                    Topic Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={topicChartData}
                      layout="vertical"
                      margin={{ left: 20 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fontSize: 11 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis
                        type="category"
                        dataKey="topic"
                        width={120}
                        tick={{ fontSize: 11 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "13px",
                        }}
                        formatter={(value: number) => [`${value}%`, "Avg Score"]}
                      />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                        {topicChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.score >= 70
                                ? "#10b981"
                                : entry.score >= 50
                                  ? "#f59e0b"
                                  : "#ef4444"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Subject breakdown table */}
          {summary && summary.length > 0 && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  Subject Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                          Subject
                        </th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                          Paper
                        </th>
                        <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                          Exams
                        </th>
                        <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                          Avg Score
                        </th>
                        <th className="text-center py-3 px-2 font-medium text-muted-foreground">
                          Latest
                        </th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                          Trend
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.map((item, idx) => {
                        const avg = Math.round(Number(item.avgPercentage));
                        const latest = Number(item.latestPercentage);
                        const improving = latest > avg;
                        return (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{
                                    backgroundColor: getSubjectColor(
                                      item.subject
                                    ),
                                  }}
                                />
                                <span className="font-medium">
                                  {getSubjectLabel(item.subject)}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              {getPaperTypeLabel(item.paperType)}
                            </td>
                            <td className="py-3 px-2 text-center">
                              {Number(item.totalExams)}
                            </td>
                            <td className="py-3 px-2 text-center font-medium">
                              {avg}%
                            </td>
                            <td className="py-3 px-2 text-center font-medium">
                              {latest}%
                            </td>
                            <td className="py-3 px-2 text-right">
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  improving
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {improving ? "Improving" : "Needs work"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
