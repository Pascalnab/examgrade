import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  CAMBRIDGE_SUBJECTS,
  EXAM_SESSIONS,
  getYearOptions,
  buildPaperCode,
  type CambridgeSubject,
  type CambridgeComponent,
} from "@shared/types";
import {
  FileUp,
  Upload as UploadIcon,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Upload() {
  const [, setLocation] = useLocation();

  // Subject & component selection
  const [selectedSubjectValue, setSelectedSubjectValue] = useState("");
  const [selectedComponent, setSelectedComponent] = useState("");
  const [session, setSession] = useState("");
  const [year, setYear] = useState("");

  // Files
  const [examFiles, setExamFiles] = useState<File[]>([]);
  const [markSchemeFile, setMarkSchemeFile] = useState<File | null>(null);

  // Flow state
  const [step, setStep] = useState<"upload" | "grading" | "done" | "error">(
    "upload"
  );
  const [gradingMessage, setGradingMessage] = useState("");

  const createExam = trpc.exam.create.useMutation();
  const gradeExam = trpc.exam.grade.useMutation();

  const yearOptions = useMemo(() => getYearOptions(), []);

  // Derived data
  const selectedSubject: CambridgeSubject | undefined = CAMBRIDGE_SUBJECTS.find(
    (s) => s.value === selectedSubjectValue
  );

  const selectedComponentInfo: CambridgeComponent | undefined =
    selectedSubject?.components.find((c) => c.component === selectedComponent);

  const paperCode =
    selectedSubject && selectedComponent
      ? buildPaperCode(selectedSubject.syllabusCode, selectedComponent)
      : "";

  const handleSubjectChange = (val: string) => {
    setSelectedSubjectValue(val);
    setSelectedComponent("");
  };

  const handleExamFileDrop = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      setExamFiles((prev) => [...prev, ...files]);
    },
    []
  );

  const handleMarkSchemeDrop = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setMarkSchemeFile(file);
    },
    []
  );

  const removeExamFile = (index: number) => {
    setExamFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const canSubmit =
    selectedSubjectValue &&
    selectedComponent &&
    examFiles.length > 0 &&
    markSchemeFile &&
    step === "upload";

  const handleSubmit = async () => {
    if (!canSubmit || !markSchemeFile || !selectedComponentInfo || !selectedSubject) return;

    try {
      setStep("grading");
      setGradingMessage("Uploading your exam files...");

      const examFileData = await Promise.all(
        examFiles.map(async (file) => ({
          name: file.name,
          data: await fileToBase64(file),
          type: file.type,
        }))
      );

      const markSchemeData = {
        name: markSchemeFile.name,
        data: await fileToBase64(markSchemeFile),
        type: markSchemeFile.type,
      };

      setGradingMessage("Creating exam record...");

      const sessionLabel = session && year ? `${session} ${year}` : session || (year ? String(year) : undefined);

      const { examId } = await createExam.mutateAsync({
        subject: selectedSubjectValue,
        paperType: selectedComponentInfo.paperType,
        paperCode: paperCode || undefined,
        sessionLabel: sessionLabel || undefined,
        year: year ? parseInt(year) : undefined,
        examFiles: examFileData,
        markSchemeFile: markSchemeData,
      });

      setGradingMessage(
        "AI is grading your exam... This may take a minute."
      );

      await gradeExam.mutateAsync({ examId });

      setStep("done");
      toast.success("Exam graded successfully!");

      setTimeout(() => {
        setLocation(`/result/${examId}`);
      }, 1500);
    } catch (error) {
      setStep("error");
      setGradingMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
      toast.error("Grading failed. Please try again.");
    }
  };

  if (step === "grading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md border shadow-sm">
          <CardContent className="p-8 text-center space-y-6">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              <div className="relative h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary animate-pulse" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI Grading in Progress</h2>
              <p className="text-sm text-muted-foreground mt-2">
                {gradingMessage}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Please wait, this usually takes 30-60 seconds
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md border shadow-sm">
          <CardContent className="p-8 text-center space-y-6">
            <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Grading Complete!</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Redirecting to your results...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md border shadow-sm">
          <CardContent className="p-8 text-center space-y-6">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Grading Failed</h2>
              <p className="text-sm text-muted-foreground mt-2">
                {gradingMessage}
              </p>
            </div>
            <Button onClick={() => setStep("upload")} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Upload & Grade Exam
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload your scanned exam paper and mark scheme for AI-powered grading.
        </p>
      </div>

      {/* Subject & Component Selection */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Exam Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Subject */}
          <div className="space-y-2">
            <Label>Subject</Label>
            <Select
              value={selectedSubjectValue}
              onValueChange={handleSubjectChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {CAMBRIDGE_SUBJECTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}{" "}
                    <span className="text-muted-foreground">
                      ({s.syllabusCode})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Component (paper) */}
          <div className="space-y-2">
            <Label>Paper / Component</Label>
            <Select
              value={selectedComponent}
              onValueChange={setSelectedComponent}
              disabled={!selectedSubject}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    selectedSubject
                      ? "Select paper component"
                      : "Select subject first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {selectedSubject?.components.map((c) => (
                  <SelectItem key={c.component} value={c.component}>
                    <span className="font-mono text-xs mr-2">
                      {selectedSubject.syllabusCode}/{c.component}
                    </span>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paper code display */}
          {paperCode && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <span className="text-xs text-muted-foreground">Paper Code:</span>
              <span className="font-mono font-bold text-primary">
                {paperCode}
              </span>
              {selectedComponentInfo && (
                <span className="text-xs text-muted-foreground">
                  — {selectedComponentInfo.label}
                </span>
              )}
            </div>
          )}

          {/* Row 3: Session & Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Exam Session{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Select value={session} onValueChange={setSession}>
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_SESSIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Year{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exam Paper Upload */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Your Exam Paper
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload scanned images or PDF of your completed exam paper. You can
            upload multiple pages.
          </p>
          <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
            <UploadIcon className="h-8 w-8 text-muted-foreground mb-3" />
            <span className="text-sm font-medium">
              Click to upload exam pages
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              PNG, JPG, or PDF — multiple files allowed
            </span>
            <input
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              multiple
              onChange={handleExamFileDrop}
            />
          </label>

          {examFiles.length > 0 && (
            <div className="space-y-2">
              {examFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                >
                  {file.type.startsWith("image/") ? (
                    <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <span className="text-sm truncate flex-1">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <button
                    onClick={() => removeExamFile(idx)}
                    className="h-6 w-6 rounded-full hover:bg-destructive/10 flex items-center justify-center"
                  >
                    <X className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mark Scheme Upload */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Mark Scheme
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload the official Cambridge mark scheme PDF for this paper.
          </p>
          {markSchemeFile ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <FileText className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-sm truncate flex-1">
                {markSchemeFile.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {(markSchemeFile.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button
                onClick={() => setMarkSchemeFile(null)}
                className="h-6 w-6 rounded-full hover:bg-destructive/10 flex items-center justify-center"
              >
                <X className="h-3 w-3 text-destructive" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
              <FileUp className="h-8 w-8 text-muted-foreground mb-3" />
              <span className="text-sm font-medium">
                Click to upload mark scheme
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                PDF format
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={handleMarkSchemeDrop}
              />
            </label>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        size="lg"
        className="w-full h-12 text-base shadow-lg"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Grade My Exam with AI
      </Button>
    </div>
  );
}
