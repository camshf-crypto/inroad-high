import { useState, useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { studentState, academyState } from "@/lib/auth/atoms";
import { supabase } from "@/lib/supabase";
import {
  useMyEssays,
  useAddEssay,
  useUpdateEssay,
  useEssayFeedback,
  useEssayAnswers,
  useEssayQuestions,
  useQuestionFeedback,
  useSubmitAnswer,
  useSubmitUpgrade,
  useSubmitTailAnswer,
  useRequestDeleteEssay,
  useCancelDeleteRequest,
  useCompleteEssay,
} from "@/pages/middle-student/_hooks/useExpect";
import { useDraftAutoSave, type DraftStatus } from "@/pages/middle-student/_hooks/useDraftAutoSave";
import EssayWizard from "./EssayWizard";

const STEP_LABELS = ["첫 답변", "1차 피드백", "업그레이드", "최종 피드백", "꼬리질문"];

const SCHOOLS = [
  "인천하늘고", "한국과학영재학교", "경기과학고", "서울과학고",
  "대원외고", "민족사관고", "하나고", "외대부고",
  "휘문고(자사고)", "중동고(자사고)", "직접입력",
];

const SECTIONS = [
  { key: "selfStudy", label: "📚 자기주도학습 과정", placeholder: "스스로 학습계획을 세우고 학습해 온 과정과 그 과정에서 느꼈던 점을 구체적으로 작성해보세요." },
  { key: "reason", label: "🏫 지원동기 (건학이념 연계)", placeholder: "학교 건학이념과 연계하여 이 학교에 관심을 갖게 된 동기를 구체적으로 작성해보세요." },
  { key: "activity", label: "🎯 꿈과 끼를 살리기 위한 활동계획", placeholder: "고등학교 입학 후 자기주도적으로 꿈과 끼를 살리기 위한 활동계획을 작성해보세요." },
  { key: "career", label: "🚀 진로계획", placeholder: "고등학교 졸업 후 진로계획에 대해 구체적으로 작성해보세요." },
  { key: "character", label: "🤝 인성 (배려·나눔·협력·타인존중·규칙준수)", placeholder: "본인의 인성을 나타낼 수 있는 개인적 경험과 이를 통해 배우고 느낀 점을 구체적으로 작성해보세요." },
];

const EMPTY_ESSAY = { selfStudy: "", reason: "", activity: "", career: "", character: "" };

const MIN_CHARS = 100; // ⭐ 각 항목 최소 100자

// ─────────────────────────────────────────────
// 헬퍼: Blob → base64 (CSR Edge Function 입력용)
// ─────────────────────────────────────────────
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ⭐ 항목별 글자수 (공백 제외)
function getCharCount(text: string | undefined): number {
  return (text || "").replace(/\s/g, "").length;
}

// ⭐ 5개 항목 다 100자+ 인지 체크
function checkAllCompleted(content: any): boolean {
  return SECTIONS.every((s) => getCharCount(content?.[s.key]) >= MIN_CHARS);
}

// ─────────────────────────────────────────────
// ⭐ 자동저장 상태 표시 (✓ 저장됨)
// ─────────────────────────────────────────────
function DraftStatusIndicator({ status, lastSavedAt }: { status: DraftStatus; lastSavedAt: Date | null }) {
  if (status === "idle") return null;

  if (status === "saving") {
    return (
      <span className="text-[10px] text-ink-muted flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        저장 중...
      </span>
    );
  }

  if (status === "error") {
    return (
      <span className="text-[10px] text-red-500 flex items-center gap-1">
        <span>⚠️</span>
        저장 실패
      </span>
    );
  }

  return (
    <span className="text-[10px] text-emerald-600 flex items-center gap-1">
      <span>✓</span>
      자동 저장됨
      {lastSavedAt && (
        <span className="text-ink-muted">
          ({lastSavedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })})
        </span>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────
// ⭐ STT 마이크 버튼 (재사용)
// ─────────────────────────────────────────────
interface MicSTTBtnProps {
  studentId: string | undefined;
  onTranscript: (text: string) => void;
}

function MicSTTBtn({ studentId, onTranscript }: MicSTTBtnProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err: any) {
      alert("🎙️ 마이크 권한이 필요해요. 브라우저 설정에서 허용해주세요.");
      console.error(err);
    }
  };

  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    setRecording(false);
    setProcessing(true);

    const blobPromise = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
        }
        resolve(blob);
      };
      recorder.stop();
    });

    try {
      const blob = await blobPromise;

      if (!studentId) {
        alert("로그인 정보가 없어요");
        setProcessing(false);
        return;
      }

      const audioBase64 = await blobToBase64(blob);

      const { data: sttData, error: sttError } =
        await supabase.functions.invoke("middle-stt-short", {
          body: { audioBase64 },
        });

      if (sttError || !sttData?.success) {
        alert("음성 변환 실패: " + (sttError?.message || sttData?.error || "unknown"));
        setProcessing(false);
        return;
      }

      const transcript = sttData?.text || "";
      if (transcript) {
        onTranscript(transcript);
      } else {
        alert("음성을 인식하지 못했어요. 다시 시도해주세요!");
      }
    } catch (e: any) {
      alert("STT 처리 중 오류: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleClick = () => {
    if (processing) return;
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={processing}
      title={recording ? "녹음 종료 (1분 이내)" : processing ? "변환 중..." : "음성으로 답변 (1분 이내)"}
      className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 text-base transition-all ${recording
          ? "bg-red-50 border-red-200 text-red-500 hover:bg-red-100 animate-pulse"
          : processing
            ? "bg-amber-50 border-amber-200 text-amber-600 cursor-wait"
            : "bg-brand-middle-pale border-brand-middle-light text-brand-middle-dark hover:bg-brand-middle-bg"
        }`}
    >
      {recording ? "⏹" : processing ? "⏳" : "🎙️"}
    </button>
  );
}

const SubmitBtn = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-[108px] h-9 rounded-lg text-[12px] font-semibold flex-shrink-0 transition-all ${!disabled
        ? "bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle"
        : "bg-gray-100 text-ink-muted cursor-not-allowed"
      }`}
  >
    {label}
  </button>
);

// ─────────────────────────────────────────────
// ⭐ Step 1 답변
// ─────────────────────────────────────────────
function Step1AnswerBox({
  studentId,
  questionId,
  existingAnswer,
  editingMode,
  onSubmit,
  onCancel,
  isPending,
}: {
  studentId: string | undefined;
  questionId: string;
  existingAnswer: string | null;
  editingMode: boolean;
  onSubmit: (text: string, clearDraft: () => Promise<void>) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
}) {
  const disabled = !!existingAnswer && !editingMode;
  const initialValue = editingMode && existingAnswer ? existingAnswer : "";

  const { text, setText, status, lastSavedAt, clearDraft } = useDraftAutoSave(
    studentId,
    `expect:answer:${questionId}`,
    initialValue,
    disabled,
  );

  return (
    <>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="답변을 작성하거나 마이크로 녹음해주세요... (음성은 1분 이내, 5초마다 자동 저장)"
        rows={4}
        className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
      />
      <div className="flex items-center mt-2">
        <DraftStatusIndicator status={status} lastSavedAt={lastSavedAt} />
        <div className="flex gap-2 ml-auto">
          {editingMode && (
            <button
              onClick={onCancel}
              className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-medium hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          )}
          <MicSTTBtn
            studentId={studentId}
            onTranscript={(t) => setText(text ? text + " " + t : t)}
          />
          <SubmitBtn
            label={isPending ? "제출 중..." : editingMode ? "수정 완료" : "답변 제출"}
            onClick={() => onSubmit(text, clearDraft)}
            disabled={!text.trim() || isPending}
          />
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// ⭐ Step 3 업그레이드 답변
// ─────────────────────────────────────────────
function Step3UpgradeBox({
  studentId,
  questionId,
  existingUpgrade,
  editingMode,
  onSubmit,
  onCancel,
  isPending,
}: {
  studentId: string | undefined;
  questionId: string;
  existingUpgrade: string | null;
  editingMode: boolean;
  onSubmit: (text: string, clearDraft: () => Promise<void>) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
}) {
  const disabled = !!existingUpgrade && !editingMode;
  const initialValue = editingMode && existingUpgrade ? existingUpgrade : "";

  const { text, setText, status, lastSavedAt, clearDraft } = useDraftAutoSave(
    studentId,
    `expect:upgraded:${questionId}`,
    initialValue,
    disabled,
  );

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[12px] text-amber-700 font-medium mb-2">
        💡 선생님 피드백을 반영해서 답변을 업그레이드해보세요!
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="피드백을 반영한 업그레이드 답변을 작성해주세요... (음성은 1분 이내, 5초마다 자동 저장)"
        rows={4}
        className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
      />
      <div className="flex items-center mt-2">
        <DraftStatusIndicator status={status} lastSavedAt={lastSavedAt} />
        <div className="flex gap-2 ml-auto">
          {editingMode && (
            <button
              onClick={onCancel}
              className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-medium hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          )}
          <MicSTTBtn
            studentId={studentId}
            onTranscript={(t) => setText(text ? text + " " + t : t)}
          />
          <SubmitBtn
            label={isPending ? "제출 중..." : editingMode ? "수정 완료" : "업그레이드 제출"}
            onClick={() => onSubmit(text, clearDraft)}
            disabled={!text.trim() || isPending}
          />
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// ⭐ Step 5 꼬리질문 답변
// ─────────────────────────────────────────────
function Step5TailBox({
  studentId,
  questionId,
  tailIndex,
  onSubmit,
  isPending,
}: {
  studentId: string | undefined;
  questionId: string;
  tailIndex: number;
  onSubmit: (text: string, clearDraft: () => Promise<void>) => Promise<void>;
  isPending: boolean;
}) {
  const { text, setText, status, lastSavedAt, clearDraft } = useDraftAutoSave(
    studentId,
    `expect:tail:${questionId}:${tailIndex}`,
    "",
  );

  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2.5">
      <div className="text-[10px] text-ink-muted mb-1.5">꼬리질문 답변</div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="꼬리질문에 대한 답변을 작성해주세요... (음성은 1분 이내, 5초마다 자동 저장)"
        rows={2}
        className="w-full border border-line rounded-md px-2.5 py-2 text-[12px] leading-[1.6] resize-none bg-white focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
      />
      <div className="flex items-center mt-2">
        <DraftStatusIndicator status={status} lastSavedAt={lastSavedAt} />
        <div className="flex gap-2 ml-auto">
          <MicSTTBtn
            studentId={studentId}
            onTranscript={(t) => setText(text ? text + " " + t : t)}
          />
          <button
            onClick={() => onSubmit(text, clearDraft)}
            disabled={!text.trim() || isPending}
            className={`w-[102px] h-[34px] rounded-md text-[12px] font-semibold transition-all ${text.trim() && !isPending
                ? "bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle"
                : "bg-gray-100 text-ink-muted cursor-not-allowed"
              }`}
          >
            {isPending ? "제출 중..." : "제출"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 메인 페이지
// ─────────────────────────────────────────────
export default function MiddleExpect() {
  const student = useAtomValue(studentState);
  const academy = useAtomValue(academyState);

  const studentId = student?.id ? String(student.id) : undefined;
  const { data: essays = [], isLoading } = useMyEssays(studentId);
  const addEssay = useAddEssay();
  const updateEssay = useUpdateEssay();
  const completeEssay = useCompleteEssay(); // ⭐ 추가

  const [activeTab, setActiveTab] = useState<"essay" | "questions">("essay");

  const [selEssayId, setSelEssayId] = useState<string | null>(null);
  const selEssay = essays.find((e) => e.id === selEssayId) ?? null;

  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    if (!selEssayId && essays.length > 0) {
      setSelEssayId(essays[0].id);
    }
  }, [essays.length, selEssayId]);

  const { data: essayFeedbacks = [] } = useEssayFeedback(selEssayId ?? undefined);
  const { data: essayAnswers = [] } = useEssayAnswers(selEssayId ?? undefined);

  const answersBySection = essayAnswers.reduce((acc: Record<string, any[]>, a) => {
    if (!acc[a.section_key]) acc[a.section_key] = [];
    acc[a.section_key].push(a);
    return acc;
  }, {});

  const [showAddEssay, setShowAddEssay] = useState(false);
  const [newSchool, setNewSchool] = useState("");
  const [customSchool, setCustomSchool] = useState("");

  const [editingEssay, setEditingEssay] = useState(false);
  const [tempContent, setTempContent] = useState({ ...EMPTY_ESSAY });
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [tempSection, setTempSection] = useState("");

  const [selSchoolFilter, setSelSchoolFilter] = useState<string>("");
  const [selQId, setSelQId] = useState<string | null>(null);

  const filterEssay =
    essays.find((e) => e.school === selSchoolFilter && e.questions_generated) ||
    essays.find((e) => e.school === selSchoolFilter);
  const { data: questions = [] } = useEssayQuestions(filterEssay?.id);

  const selQ = questions.find((q) => q.id === selQId) ?? null;
  const { data: selQFeedback } = useQuestionFeedback(selQId ?? undefined);

  useEffect(() => {
    if (!selSchoolFilter) {
      const generated = essays.find((e) => e.questions_generated);
      if (generated) {
        setSelSchoolFilter(generated.school);
      }
    }
  }, [essays, selSchoolFilter]);

  const [editingStep1, setEditingStep1] = useState(false);
  const [editingStep3, setEditingStep3] = useState(false);

  const [purposeOpen, setPurposeOpen] = useState(false);

  useEffect(() => {
    setEditingStep1(false);
    setEditingStep3(false);
    setPurposeOpen(false);
  }, [selQId]);

  const submitAnswer = useSubmitAnswer();
  const submitUpgrade = useSubmitUpgrade();
  const submitTailAnswer = useSubmitTailAnswer();

  const requestDelete = useRequestDeleteEssay();
  const cancelDelete = useCancelDeleteRequest();

  const handleRequestDelete = async () => {
    if (!selEssay) return;
    if (!confirm(`'${selEssay.school}' 자소서 삭제를 선생님께 요청할까요?\n\n선생님이 승인하면 자소서와 모든 답변, 피드백이 삭제됩니다.`)) return;
    try {
      await requestDelete.mutateAsync(selEssay.id);
      alert("✅ 삭제 요청이 선생님께 전달되었어요!");
    } catch (e: any) {
      alert(`요청 실패: ${e.message}`);
    }
  };

  const handleCancelDelete = async () => {
    if (!selEssay) return;
    if (!confirm("삭제 요청을 취소할까요?")) return;
    try {
      await cancelDelete.mutateAsync(selEssay.id);
      alert("✅ 삭제 요청을 취소했어요.");
    } catch (e: any) {
      alert(`취소 실패: ${e.message}`);
    }
  };

  // ⭐ 자소서 완료 토글
  const handleToggleComplete = async () => {
    if (!selEssay) return;

    if (selEssay.essay_completed) {
      // 완료 → 미완료
      if (!confirm("자소서 완료를 취소할까요?\n\n수정 후 다시 완료 버튼을 눌러야 해요.")) return;
      try {
        await completeEssay.mutateAsync({ essay_id: selEssay.id, complete: false });
      } catch (e: any) {
        alert(`완료 취소 실패: ${e.message}`);
      }
    } else {
      // 미완료 → 완료
      if (!checkAllCompleted(selEssay.content)) {
        alert(`아직 모든 항목이 ${MIN_CHARS}자 이상 작성되지 않았어요!\n\n각 항목을 충분히 작성하고 다시 시도해주세요.`);
        return;
      }
      if (!confirm("자소서를 완료하시겠어요?\n\n선생님이 예상질문을 생성하기 전까지는 다시 수정할 수 있어요.")) return;
      try {
        await completeEssay.mutateAsync({ essay_id: selEssay.id, complete: true });
        alert("✅ 자소서 완료!\n선생님이 예상질문을 만들어줄 거예요.");
      } catch (e: any) {
        alert(`완료 처리 실패: ${e.message}`);
      }
    }
  };

  const countChars = (content: any) =>
    Object.values(content || {}).join("").replace(/\s/g, "").length;

  const charCount = countChars(tempContent);

  const getStep = (q: any, fb: any) => {
    if (!q.answer) return 0;
    if (!fb?.teacher_first_feedback) return 1;
    if (!q.upgraded_answer) return 2;
    if (!fb?.teacher_final_feedback) return 3;
    return 4;
  };

  const handleAddSchool = async () => {
    const school = newSchool === "직접입력" ? customSchool : newSchool;
    if (!school) return;
    if (!student?.id || !academy?.academyId) {
      alert("로그인 정보를 불러오지 못했어요.");
      return;
    }

    try {
      const newE = await addEssay.mutateAsync({
        student_id: String(student.id),
        academy_id: String(academy.academyId),
        school,
      });
      setSelEssayId(newE.id);
      setTempContent({ ...EMPTY_ESSAY });
      setShowWizard(true);
      setShowAddEssay(false);
      setNewSchool("");
      setCustomSchool("");
    } catch (e: any) {
      alert(`추가 실패: ${e.message}`);
    }
  };

  const saveEssay = async () => {
    if (!selEssay) return;
    try {
      await updateEssay.mutateAsync({
        essay_id: selEssay.id,
        content: tempContent,
        version: selEssay.version + 1,
        previousContent: selEssay.content,
      });
      setEditingEssay(false);
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  const handleWizardComplete = async (finalContent: typeof EMPTY_ESSAY) => {
    if (!selEssay) return;
    try {
      await updateEssay.mutateAsync({
        essay_id: selEssay.id,
        content: finalContent,
        version: selEssay.version + 1,
        previousContent: selEssay.content,
      });
      setShowWizard(false);
      alert("✅ 자소서가 저장되었어요!\n5개 항목 모두 100자 이상이면 '자소서 완료' 버튼을 눌러주세요!");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  const saveSectionEdit = async (key: string) => {
    if (!selEssay) return;
    try {
      const newContent = { ...selEssay.content, [key]: tempSection };
      await updateEssay.mutateAsync({
        essay_id: selEssay.id,
        content: newContent,
        version: selEssay.version + 1,
        previousContent: selEssay.content,
      });
      setEditingSection(null);
      setTempSection("");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  const handleSubmitAnswer = async (text: string, clearDraft: () => Promise<void>) => {
    if (!text.trim() || !selQ) return;
    try {
      await submitAnswer.mutateAsync({ question_id: selQ.id, answer: text });
      await clearDraft();
      setEditingStep1(false);
    } catch (e: any) {
      alert(`제출 실패: ${e.message}`);
    }
  };

  const handleSubmitUpgrade = async (text: string, clearDraft: () => Promise<void>) => {
    if (!text.trim() || !selQ) return;
    try {
      await submitUpgrade.mutateAsync({ question_id: selQ.id, upgraded_answer: text });
      await clearDraft();
      setEditingStep3(false);
    } catch (e: any) {
      alert(`제출 실패: ${e.message}`);
    }
  };

  const handleSubmitTailAnswer = async (idx: number, text: string, clearDraft: () => Promise<void>) => {
    if (!text.trim() || !selQ) return;
    try {
      await submitTailAnswer.mutateAsync({ question_id: selQ.id, tail_index: idx, answer: text });
      await clearDraft();
    } catch (e: any) {
      alert(`제출 실패: ${e.message}`);
    }
  };

  const schoolsWithQuestions = essays
    .filter((e) => e.questions_generated)
    .map((e) => e.school);

  const feedbackBySection = essayFeedbacks.reduce((acc: Record<string, any[]>, fb) => {
    if (!acc[fb.section_key]) acc[fb.section_key] = [];
    acc[fb.section_key].push(fb);
    return acc;
  }, {});

  // ⭐ 선택된 자소서의 완료 상태 체크
  const isAllCompleted = selEssay ? checkAllCompleted(selEssay.content) : false;
  const sectionsBelow100 = selEssay
    ? SECTIONS.filter((s) => getCharCount((selEssay.content as any)[s.key]) < MIN_CHARS).map((s) => s.label)
    : [];
  const isLocked = selEssay?.questions_generated === true; // 선생님이 잠금

  if (showWizard && selEssay) {
    return (
      <EssayWizard
        schoolName={selEssay.school}
        essayId={selEssay.id}
        studentId={String(student?.id || "")}
        academyId={academy?.academyId ? String(academy.academyId) : null}
        onComplete={handleWizardComplete}
        onCancel={() => setShowWizard(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden px-6 py-5 font-sans text-ink">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[18px] font-extrabold text-ink tracking-tight">자소서 · 예상질문</div>
          <div className="text-[12px] text-ink-muted mt-0.5">{student?.name} · {academy?.academyName}</div>
        </div>
        <div className="flex gap-2">
          <div className="bg-brand-middle-bg text-brand-middle-dark text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-brand-middle-light">
            자소서 {essays.length}개
          </div>
          <div className="bg-brand-middle-pale text-brand-middle-dark text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-brand-middle-light">
            예상질문 학교 {schoolsWithQuestions.length}개
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">
        <div className="w-[360px] flex-shrink-0 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="flex border-b border-line flex-shrink-0">
            {[
              { key: "essay", label: "📝 자기소개서" },
              { key: "questions", label: "💬 예상질문" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`flex-1 py-3 text-center text-[13px] transition-all ${activeTab === t.key
                    ? "text-brand-middle-dark font-bold border-b-2 border-brand-middle"
                    : "text-ink-muted font-medium border-b-2 border-transparent hover:text-ink"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "essay" && (
            <>
              <div className="px-3.5 py-2.5 border-b border-line flex-shrink-0 flex items-center justify-between">
                <div className="text-[12px] text-ink-secondary">
                  총 <span className="text-brand-middle-dark font-bold">{essays.length}개</span>
                </div>
                <button
                  onClick={() => setShowAddEssay(true)}
                  className="h-7 px-3 bg-brand-middle hover:bg-brand-middle-hover text-white text-[11px] font-semibold rounded-md transition-all hover:-translate-y-px hover:shadow-btn-middle"
                >
                  + 학교 추가
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2.5">
                {isLoading ? (
                  <div className="text-center py-10 text-ink-muted text-[12px]">
                    <div className="text-2xl mb-2">⏳</div>
                    <div className="font-medium">불러오는 중...</div>
                  </div>
                ) : essays.length === 0 ? (
                  <div className="text-center py-10 text-ink-muted text-[12px]">
                    <div className="text-3xl mb-2">📝</div>아직 자소서가 없어요.
                    <div className="text-[10px] mt-1">+ 학교 추가 버튼을 눌러주세요</div>
                  </div>
                ) : (
                  essays.map((e) => {
                    const isSel = selEssayId === e.id;
                    return (
                      <div
                        key={e.id}
                        onClick={() => { setSelEssayId(e.id); setEditingEssay(false); setEditingSection(null); }}
                        className={`border rounded-xl px-3.5 py-3 mb-1.5 cursor-pointer transition-all ${isSel
                            ? "border-brand-middle bg-brand-middle-pale shadow-[0_4px_16px_rgba(16,185,129,0.12)]"
                            : "border-line bg-white hover:border-brand-middle-light hover:shadow-sm"
                          }`}
                      >
                        <div className={`text-[13px] font-bold mb-1.5 ${isSel ? "text-brand-middle-dark" : "text-ink"}`}>
                          {e.school}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {e.content.selfStudy ? (
                            <span className="text-[10px] font-semibold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full border border-brand-middle-light">
                              작성 · {countChars(e.content)}자
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              미작성
                            </span>
                          )}
                          {e.essay_completed && !e.questions_generated && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              ✓ 완료
                            </span>
                          )}
                          {e.version > 1 && (
                            <span className="text-[10px] font-semibold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full">
                              v{e.version}
                            </span>
                          )}
                          {e.questions_generated && (
                            <span className="text-[10px] font-semibold text-[#7C3AED] bg-[#F5F3FF] px-2 py-0.5 rounded-full">
                              🔒 질문생성됨
                            </span>
                          )}
                          {e.delete_requested && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
                              🟡 삭제 요청 중
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ⭐ 자소서 완료 버튼 (사이드바 하단) */}
              {selEssay && !isLocked && selEssay.content.selfStudy && (
                <div className="px-3 py-3 border-t border-line flex-shrink-0 bg-gray-50">
                  <button
                    onClick={handleToggleComplete}
                    disabled={(!isAllCompleted && !selEssay.essay_completed) || completeEssay.isPending}
                    className={`w-full h-11 rounded-lg text-[13px] font-bold transition-all ${
                      selEssay.essay_completed
                        ? "bg-emerald-50 border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                        : isAllCompleted
                          ? "bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle"
                          : "bg-gray-200 text-ink-muted cursor-not-allowed"
                    }`}
                  >
                    {completeEssay.isPending
                      ? "처리 중..."
                      : selEssay.essay_completed
                        ? "✓ 완료됨 (눌러서 수정 모드로)"
                        : isAllCompleted
                          ? "🎯 자소서 완료하기"
                          : `📝 ${SECTIONS.length - sectionsBelow100.length}/${SECTIONS.length} 항목 완성`}
                  </button>
                  {!isAllCompleted && !selEssay.essay_completed && sectionsBelow100.length > 0 && (
                    <div className="text-[10px] text-ink-muted mt-2 leading-relaxed">
                      각 항목 <strong className="text-amber-700">{MIN_CHARS}자 이상</strong> 필요해요:
                      <div className="mt-1 space-y-0.5">
                        {sectionsBelow100.map((label) => (
                          <div key={label} className="text-amber-700">• {label}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selEssay.essay_completed && (
                    <div className="text-[10px] text-emerald-700 mt-2 leading-relaxed">
                      💡 선생님이 예상질문을 생성하면 더 이상 수정할 수 없어요.
                    </div>
                  )}
                </div>
              )}

              {/* 잠금 상태 표시 */}
              {selEssay && isLocked && (
                <div className="px-3 py-3 border-t border-line flex-shrink-0 bg-purple-50">
                  <div className="text-[12px] font-bold text-purple-700 mb-1 flex items-center gap-1">
                    🔒 자소서 잠김
                  </div>
                  <div className="text-[10px] text-purple-600 leading-relaxed">
                    선생님이 예상질문을 생성했어요.<br />
                    이제 수정할 수 없어요.
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "questions" && (
            <>
              <div className="px-3 py-2.5 border-b border-line flex-shrink-0">
                {schoolsWithQuestions.length === 0 ? (
                  <div className="text-[11px] text-ink-muted">아직 생성된 예상질문이 없어요.</div>
                ) : (
                  <div className="flex gap-1.5 flex-wrap">
                    {schoolsWithQuestions.map((school) => (
                      <button
                        key={school}
                        onClick={() => { setSelSchoolFilter(school); setSelQId(null); }}
                        className={`px-3 py-1 rounded-full text-[11px] border-[1.5px] transition-all ${selSchoolFilter === school
                            ? "border-brand-middle bg-brand-middle-pale text-brand-middle-dark font-bold"
                            : "border-line bg-white text-ink-secondary font-medium hover:border-brand-middle-light"
                          }`}
                      >
                        {school}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-3.5 py-2 border-b border-line flex-shrink-0">
                <div className="text-[12px] text-ink-secondary">
                  총 <span className="text-brand-middle-dark font-bold">{questions.length}개</span> · 답변완료{" "}
                  <span className="text-brand-middle-dark font-bold">{questions.filter((q) => q.answer).length}개</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-2.5">
                {questions.length === 0 ? (
                  <div className="text-center py-10 text-ink-muted text-[12px]">
                    <div className="text-3xl mb-2">💬</div>
                    <div>아직 예상질문이 없어요.</div>
                    <div className="mt-1.5">자소서를 완료하면<br />선생님이 예상질문을 만들어드려요!</div>
                  </div>
                ) : (
                  questions.map((q, i) => (
                    <div
                      key={q.id}
                      onClick={() => setSelQId(q.id)}
                      className={`border rounded-xl px-3.5 py-3 mb-1.5 cursor-pointer transition-all ${selQId === q.id
                          ? "border-brand-middle bg-brand-middle-pale shadow-[0_4px_16px_rgba(16,185,129,0.12)]"
                          : "border-line bg-white hover:border-brand-middle-light hover:shadow-sm"
                        }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[10px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full">질문 {i + 1}</span>
                        {q.tag && (
                          <span className="text-[10px] text-ink-secondary bg-gray-100 px-1.5 py-0.5 rounded-full">{q.tag}</span>
                        )}
                      </div>
                      <div className="text-[12px] text-ink leading-relaxed font-semibold mb-1.5">{q.text}</div>
                      <div className="flex gap-1">
                        {q.answer ? (
                          <span className="text-[10px] font-semibold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full border border-brand-middle-light">
                            답변완료
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            미답변
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex-1 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          {activeTab === "essay" && (
            <>
              {!selEssay ? (
                <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
                  <div className="text-4xl">📝</div>
                  <div className="text-[14px] font-semibold text-ink-secondary">학교를 선택해주세요</div>
                  <div className="text-[12px]">왼쪽에서 학교를 클릭하거나 추가해보세요</div>
                </div>
              ) : (
                <>
                  <div className="px-4 py-3.5 border-b border-line flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-[16px] font-extrabold text-ink tracking-tight">{selEssay.school}</div>
                          {selEssay.delete_requested && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-300 rounded-full px-2 py-0.5">
                              🟡 삭제 요청 중
                            </span>
                          )}
                          {selEssay.essay_completed && !isLocked && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-full px-2 py-0.5">
                              ✓ 완료
                            </span>
                          )}
                          {isLocked && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-300 rounded-full px-2 py-0.5">
                              🔒 잠김
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-ink-muted mt-0.5">
                          {new Date(selEssay.created_at).toLocaleDateString("ko-KR")} 생성
                          {selEssay.version > 1 && ` · v${selEssay.version}`}· 1,500자 이내 (띄어쓰기 제외)
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!editingEssay && !editingSection && !selEssay.delete_requested && !isLocked && (
                          <>
                            <button
                              onClick={() => setShowWizard(true)}
                              className="text-[11px] font-bold text-white bg-brand-middle hover:bg-brand-middle-hover rounded-md px-3 py-1.5 transition-all hover:-translate-y-px hover:shadow-btn-middle"
                            >
                              {selEssay.content.selfStudy ? "5단계로 다시 작성" : "5단계로 작성하기"}
                            </button>
                            {selEssay.content.selfStudy && (
                              <button
                                onClick={() => { setEditingEssay(true); setTempContent({ ...EMPTY_ESSAY, ...selEssay.content }); }}
                                className="text-[11px] font-semibold text-brand-middle-dark bg-brand-middle-bg border border-brand-middle-light rounded-md px-3 py-1.5 hover:bg-brand-middle hover:text-white transition-all"
                              >
                                전체 수정
                              </button>
                            )}
                            <button
                              onClick={handleRequestDelete}
                              disabled={requestDelete.isPending}
                              className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-1.5 hover:bg-red-100 transition-all disabled:opacity-50"
                            >
                              {requestDelete.isPending ? "요청 중..." : "삭제 요청"}
                            </button>
                          </>
                        )}
                        {selEssay.delete_requested && (
                          <button
                            onClick={handleCancelDelete}
                            disabled={cancelDelete.isPending}
                            className="text-[11px] font-semibold text-ink-secondary bg-white border border-line rounded-md px-3 py-1.5 hover:bg-gray-50 transition-all disabled:opacity-50"
                          >
                            {cancelDelete.isPending ? "취소 중..." : "↩️ 삭제 요청 취소"}
                          </button>
                        )}
                        {isLocked && !editingEssay && !editingSection && !selEssay.delete_requested && (
                          <span className="text-[11px] font-semibold text-[#7C3AED] bg-[#F5F3FF] border border-[#DDD6FE] rounded-md px-3 py-1.5">
                            🔒 잠김 (수정 불가)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {editingEssay && !isLocked && (
                      <div>
                        {SECTIONS.map((s) => {
                          const sectionChars = getCharCount((tempContent as any)[s.key]);
                          const isOK = sectionChars >= MIN_CHARS;
                          return (
                            <div key={s.key} className="mb-3.5">
                              <label className="text-[12px] font-bold text-ink-secondary block mb-1.5 flex items-center justify-between">
                                <span>{s.label}</span>
                                <span className={`text-[11px] font-semibold ${isOK ? 'text-emerald-600' : 'text-amber-700'}`}>
                                  {sectionChars} / {MIN_CHARS}자 {isOK && '✓'}
                                </span>
                              </label>

                              {feedbackBySection[s.key] && feedbackBySection[s.key].length > 0 && (
                                <div className="bg-brand-middle-pale border-2 border-brand-middle-light rounded-lg px-3 py-2 mb-2">
                                  <div className="text-[10px] font-bold text-brand-middle-dark mb-1.5 flex items-center gap-1">
                                    💬 선생님 피드백 ({feedbackBySection[s.key].length}차까지)
                                  </div>
                                  <div className="space-y-1">
                                    {feedbackBySection[s.key].map((fb) => (
                                      <div key={fb.id} className="bg-white rounded-md px-2.5 py-1.5">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                          <span className="text-[9px] font-extrabold text-white bg-brand-middle px-1.5 py-0.5 rounded-full">
                                            {fb.round}차
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-brand-middle-dark leading-[1.5] whitespace-pre-wrap">{fb.text}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <textarea
                                value={(tempContent as any)[s.key]}
                                onChange={(e) => setTempContent((p) => ({ ...p, [s.key]: e.target.value }))}
                                placeholder={s.placeholder}
                                rows={4}
                                className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                              />
                            </div>
                          );
                        })}
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="text-[11px] text-ink-muted">* 항목별 100자 이상 / 전체 1,500자 이내</div>
                          <div className={`text-[13px] font-bold ${charCount > 1500 ? "text-red-500" : charCount > 1200 ? "text-amber-500" : "text-brand-middle-dark"}`}>
                            {charCount} / 1,500자 {charCount > 1500 && <span className="text-[11px]">⚠️ 초과!</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingEssay(false)}
                            disabled={updateEssay.isPending}
                            className="flex-1 h-10 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                          >
                            취소
                          </button>
                          <button
                            onClick={saveEssay}
                            disabled={charCount > 1500 || updateEssay.isPending}
                            className={`flex-[2] h-10 rounded-lg text-[13px] font-semibold transition-all ${charCount > 1500 || updateEssay.isPending
                                ? "bg-gray-100 text-ink-muted cursor-not-allowed"
                                : "bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle"
                              }`}
                          >
                            {updateEssay.isPending ? "저장 중..." : charCount > 1500 ? `${charCount - 1500}자 초과` : "저장"}
                          </button>
                        </div>
                      </div>
                    )}

                    {!editingEssay && !selEssay.content.selfStudy && (
                      <div className="text-center py-16">
                        <div className="text-5xl mb-4">📝</div>
                        <div className="text-[16px] font-bold text-ink mb-2">아직 작성된 자소서가 없어요!</div>
                        <div className="text-[13px] text-ink-secondary mb-5 leading-[1.7]">
                          중학생도 자소서를 어떻게 써야 할지 어렵죠?<br />
                          <strong className="text-brand-middle-dark">5단계 마법사</strong>를 따라 키워드부터 차근차근 만들어봐요!
                        </div>
                        <button
                          onClick={() => setShowWizard(true)}
                          className="px-6 py-3 bg-brand-middle hover:bg-brand-middle-hover text-white rounded-lg text-[14px] font-bold transition-all hover:-translate-y-px hover:shadow-btn-middle"
                        >
                          🎯 5단계로 자소서 작성 시작하기
                        </button>
                        <div className="text-[11px] text-ink-muted mt-4">
                          1) 키워드 잡기 → 2) 경험 꺼내기 → 3) 항목 매칭 → 4) 항목별 작성 → 5) 최종 점검
                        </div>
                      </div>
                    )}

                    {!editingEssay && selEssay.content.selfStudy && (
                      <div>
                        <div className="text-right text-[11px] text-ink-muted mb-3">
                          총 {countChars(selEssay.content)} / 1,500자
                        </div>

                        {SECTIONS.map((s) => {
                          const currentContent = (selEssay.content as any)[s.key];
                          if (!currentContent && !answersBySection[s.key]) return null;

                          const sectionChars = getCharCount(currentContent);
                          const isOK = sectionChars >= MIN_CHARS;

                          const answers = answersBySection[s.key] || [];
                          const feedbacks = feedbackBySection[s.key] || [];

                          const maxRound = Math.max(
                            answers.length > 0 ? Math.max(...answers.map((a) => a.round)) : 0,
                            feedbacks.length > 0 ? Math.max(...feedbacks.map((f) => f.round)) : 0,
                          );

                          const lastAnswerRound = answers.length > 0 ? Math.max(...answers.map((a) => a.round)) : 0;
                          const lastFeedbackRound = feedbacks.length > 0 ? Math.max(...feedbacks.map((f) => f.round)) : 0;

                          const canWriteNextAnswer = lastFeedbackRound >= lastAnswerRound && lastAnswerRound > 0 && !isLocked;
                          const nextRound = lastAnswerRound + 1;

                          return (
                            <div key={s.key} className="mb-6">
                              <div className="text-[12px] font-bold text-brand-middle-dark mb-2 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                  {s.label}
                                  <span className={`text-[10px] font-semibold ${isOK ? 'text-emerald-600' : 'text-amber-700'}`}>
                                    ({sectionChars}자 {isOK ? '✓' : `· ${MIN_CHARS - sectionChars}자 부족`})
                                  </span>
                                </span>
                                {answers.length > 1 && (
                                  <span className="text-[10px] font-semibold text-ink-muted">총 {answers.length}차</span>
                                )}
                              </div>

                              {Array.from({ length: maxRound }, (_, i) => i + 1).map((round) => {
                                const ans = answers.find((a) => a.round === round);
                                const fb = feedbacks.find((f) => f.round === round);

                                return (
                                  <div key={round} className="mb-2">
                                    {ans && (
                                      <div className="bg-gray-50 border border-line rounded-xl px-4 py-3 mb-1.5">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                          <span className="text-[10px] font-extrabold text-white bg-brand-middle px-1.5 py-0.5 rounded-full">
                                            {round === 1 ? "1차 자소서 작성" : `${round}차 자소서 수정`}
                                          </span>
                                          <span className="text-[9px] text-ink-muted">
                                            {new Date(ans.created_at).toLocaleDateString("ko-KR")}
                                          </span>
                                        </div>
                                        <div className="text-[13px] text-ink leading-[1.8] whitespace-pre-wrap">{ans.content}</div>
                                      </div>
                                    )}

                                    {fb && (
                                      <div className="bg-brand-middle-pale border border-brand-middle-light rounded-md px-4 py-2.5 flex gap-2 ml-3">
                                        <span className="text-sm flex-shrink-0">💬</span>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-[9px] font-extrabold text-white bg-brand-middle px-1.5 py-0.5 rounded-full">
                                              {round}차 피드백
                                            </span>
                                            <span className="text-[9px] text-ink-muted ml-auto">
                                              {new Date(fb.created_at).toLocaleDateString("ko-KR")}
                                            </span>
                                          </div>
                                          <div className="text-[12px] text-brand-middle-dark leading-[1.7] whitespace-pre-wrap">{fb.text}</div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {canWriteNextAnswer && (
                                <div className="bg-white border-2 border-dashed border-brand-middle rounded-xl px-4 py-3 mt-2">
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <span className="text-[10px] font-extrabold text-white bg-brand-middle px-1.5 py-0.5 rounded-full">
                                      {nextRound}차 답변
                                    </span>
                                    <span className="text-[10px] text-brand-middle-dark font-semibold">
                                      ✏️ 피드백을 반영해서 새 답변 작성
                                    </span>
                                  </div>

                                  {editingSection === s.key ? (
                                    <div>
                                      <textarea
                                        value={tempSection}
                                        onChange={(e) => setTempSection(e.target.value)}
                                        rows={6}
                                        placeholder={nextRound === 1 ? "1차 자소서를 작성해주세요..." : `${nextRound}차로 자소서를 수정해주세요...`}
                                        className="w-full border border-brand-middle rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:ring-2 focus:ring-brand-middle/10 transition-all mb-2 placeholder:text-ink-muted"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => { setEditingSection(null); setTempSection(""); }}
                                          disabled={updateEssay.isPending}
                                          className="flex-1 h-[34px] bg-white text-ink-secondary border border-line rounded-md text-[12px] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                                        >
                                          취소
                                        </button>
                                        <button
                                          onClick={() => saveSectionEdit(s.key)}
                                          disabled={updateEssay.isPending || !tempSection.trim()}
                                          className="flex-[2] h-[34px] bg-brand-middle hover:bg-brand-middle-hover text-white rounded-md text-[12px] font-semibold transition-all hover:-translate-y-px hover:shadow-btn-middle disabled:opacity-50"
                                        >
                                          {updateEssay.isPending ? "저장 중..." : nextRound === 1 ? "1차 저장" : `${nextRound}차 저장`}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => { setEditingSection(s.key); setTempSection(""); }}
                                      className="w-full h-10 bg-brand-middle-pale hover:bg-brand-middle-bg border border-brand-middle-light rounded-md text-[12px] font-semibold text-brand-middle-dark transition-all"
                                    >
                                      ✏️ {nextRound === 1 ? "1차 자소서 작성하기" : `${nextRound}차 자소서 수정하기`}
                                    </button>
                                  )}
                                </div>
                              )}

                              {!canWriteNextAnswer && lastAnswerRound > lastFeedbackRound && (
                                <div className="bg-gray-50 border border-line rounded-md px-4 py-2.5 mt-2">
                                  <div className="text-[11px] text-ink-muted text-center">💬 선생님 피드백을 기다리는 중이에요...</div>
                                </div>
                              )}

                              {!canWriteNextAnswer && answers.length === 0 && lastFeedbackRound === 0 && (
                                <div className="bg-gray-50 border border-line rounded-md px-4 py-2.5 mt-2">
                                  <div className="text-[11px] text-ink-muted text-center">
                                    {currentContent ? "답변 작성됨 (이전 버전)" : "답변 없음"}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === "questions" && (
            <>
              {!selQ ? (
                <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
                  <div className="text-4xl">💬</div>
                  <div className="text-[14px] font-semibold text-ink-secondary">질문을 선택해주세요</div>
                  <div className="text-[12px]">왼쪽에서 질문을 클릭하면 답변을 작성할 수 있어요</div>
                </div>
              ) : (
                <>
                  <div className="px-4 py-3.5 border-b border-line flex-shrink-0">
                    <div className="flex items-center justify-between mb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-[13px] font-semibold text-ink">
                            질문 {questions.findIndex((q) => q.id === selQ.id) + 1}
                          </div>
                          <span className="text-[11px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full">
                            {selSchoolFilter}
                          </span>
                        </div>
                        {selQ.tag && (<div className="text-[11px] text-ink-muted mt-0.5">{selQ.tag}</div>)}
                      </div>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${selQ.answer
                          ? "bg-brand-middle-bg text-brand-middle-dark border-brand-middle-light"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                        {selQ.answer ? "답변완료" : "미답변"}
                      </span>
                    </div>

                    <div className="flex">
                      {STEP_LABELS.map((label, i) => {
                        const step = getStep(selQ, selQFeedback);
                        const stepNum = i + 1;
                        const isDone = stepNum < step;
                        const isOn = stepNum === step;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                            {i < 4 && <div className={`absolute top-[11px] left-[55%] w-[90%] h-px ${isDone ? "bg-brand-middle" : "bg-line"}`} />}
                            <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-semibold z-10 relative ${isDone || isOn ? "bg-brand-middle text-white border border-brand-middle" : "bg-gray-100 text-ink-muted border border-line"
                              }`}>
                              {isDone ? "✓" : stepNum}
                            </div>
                            <div className={`text-[10px] whitespace-nowrap ${isDone || isOn ? "text-brand-middle-dark font-semibold" : "text-ink-muted font-medium"}`}>
                              {label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-3.5 flex flex-col gap-3">
                    <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                      <div className="text-[10px] font-semibold text-ink-muted mb-1">예상 질문</div>
                      <div className="text-[14px] font-semibold text-ink leading-[1.6]">{selQ.text}</div>
                    </div>

                    {selQ.purpose && selQ.purpose.length > 0 && (
                      <div>
                        <button
                          onClick={() => setPurposeOpen(!purposeOpen)}
                          className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all ${
                            purposeOpen ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-line hover:bg-amber-50/50"
                          }`}
                        >
                          <span className={`text-[11px] font-semibold ${purposeOpen ? "text-amber-700" : "text-ink-secondary"}`}>
                            💡 질문 의도 파악
                          </span>
                          <span className="ml-auto text-[10px] text-ink-muted">{purposeOpen ? "▲" : "▼"}</span>
                        </button>
                        {purposeOpen && (
                          <div className="bg-amber-50/50 border border-amber-200 border-t-0 rounded-b-lg px-3 py-2.5">
                            <ul className="pl-4 space-y-1">
                              {selQ.purpose.map((p: string, i: number) => (
                                <li key={i} className="text-[12px] text-amber-700 leading-[1.7] list-disc">{p}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-bold text-white bg-ink-muted px-2 py-0.5 rounded-full">Step 1</span>
                        <span className="text-[11px] text-ink-secondary font-medium">내 첫 답변</span>
                      </div>
                      {selQ.answer && !editingStep1 ? (
                        <div>
                          <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] mb-2 whitespace-pre-wrap">
                            {selQ.answer}
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => setEditingStep1(true)}
                              className="text-[11px] font-medium text-ink-secondary bg-white border border-line rounded-md px-2.5 py-1 hover:border-brand-middle-light hover:text-brand-middle-dark transition-all"
                            >
                              ✏️ 수정
                            </button>
                          </div>
                        </div>
                      ) : (
                        <Step1AnswerBox
                          studentId={studentId}
                          questionId={selQ.id}
                          existingAnswer={selQ.answer}
                          editingMode={editingStep1}
                          onSubmit={handleSubmitAnswer}
                          onCancel={() => setEditingStep1(false)}
                          isPending={submitAnswer.isPending}
                        />
                      )}
                    </div>

                    {selQ.answer && (
                      <div className="bg-white border border-line rounded-xl px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">Step 2</span>
                          <span className="text-[11px] text-ink-secondary font-medium">선생님 1차 피드백</span>
                        </div>
                        {selQFeedback?.teacher_first_feedback ? (
                          <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 text-[13px] text-brand-middle-dark leading-[1.8] whitespace-pre-wrap">
                            {selQFeedback.teacher_first_feedback}
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">
                            선생님 피드백을 기다리는 중이에요.
                          </div>
                        )}
                      </div>
                    )}

                    {selQFeedback?.teacher_first_feedback && (
                      <div className="bg-white border border-line rounded-xl px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-bold text-white bg-ink-muted px-2 py-0.5 rounded-full">Step 3</span>
                          <span className="text-[11px] text-ink-secondary font-medium">업그레이드 답변</span>
                        </div>
                        {selQ.upgraded_answer && !editingStep3 ? (
                          <div>
                            <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] mb-2 whitespace-pre-wrap">
                              {selQ.upgraded_answer}
                            </div>
                            <div className="flex justify-end">
                              <button
                                onClick={() => setEditingStep3(true)}
                                className="text-[11px] font-medium text-ink-secondary bg-white border border-line rounded-md px-2.5 py-1 hover:border-brand-middle-light hover:text-brand-middle-dark transition-all"
                              >
                                ✏️ 수정
                              </button>
                            </div>
                          </div>
                        ) : (
                          <Step3UpgradeBox
                            studentId={studentId}
                            questionId={selQ.id}
                            existingUpgrade={selQ.upgraded_answer}
                            editingMode={editingStep3}
                            onSubmit={handleSubmitUpgrade}
                            onCancel={() => setEditingStep3(false)}
                            isPending={submitUpgrade.isPending}
                          />
                        )}
                      </div>
                    )}

                    {selQ.upgraded_answer && (
                      <div className="bg-white border border-line rounded-xl px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">Step 4</span>
                          <span className="text-[11px] text-ink-secondary font-medium">선생님 최종 피드백</span>
                        </div>
                        {selQFeedback?.teacher_final_feedback ? (
                          <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 text-[13px] text-brand-middle-dark leading-[1.8] whitespace-pre-wrap">
                            {selQFeedback.teacher_final_feedback}
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">
                            선생님 최종 피드백을 기다리는 중이에요.
                          </div>
                        )}
                      </div>
                    )}

                    {selQFeedback?.tail_questions && selQFeedback.tail_questions.length > 0 && (
                      <div className="bg-white border border-line rounded-xl px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">Step 5</span>
                          <span className="text-[11px] text-ink-secondary font-medium">꼬리질문</span>
                        </div>
                        {selQFeedback.tail_questions.map((t: any, i: number) => (
                          <div key={i} className="mb-3">
                            <div className="flex items-start gap-1.5 px-2.5 py-2 bg-gray-50 rounded-md mb-2 text-[12px] text-ink leading-[1.5]">
                              <span className="text-[10px] font-bold text-brand-middle-dark bg-brand-middle-bg px-1.5 py-0.5 rounded-full flex-shrink-0 mt-[1px]">
                                꼬리 {i + 1}
                              </span>
                              {t.text}
                            </div>
                            {t.answer ? (
                              <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2 text-[12.5px] text-brand-middle-dark leading-[1.7] whitespace-pre-wrap">
                                {t.answer}
                              </div>
                            ) : (
                              <Step5TailBox
                                studentId={studentId}
                                questionId={selQ.id}
                                tailIndex={i}
                                onSubmit={(text, clearDraft) => handleSubmitTailAnswer(i, text, clearDraft)}
                                isPending={submitTailAnswer.isPending}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* 학교 추가 모달 */}
      {showAddEssay && (
        <div
          onClick={() => { setShowAddEssay(false); setNewSchool(""); setCustomSchool(""); }}
          className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[460px] shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="text-[18px] font-bold text-ink tracking-tight">지원 학교 추가</div>
              <button
                onClick={() => { setShowAddEssay(false); setNewSchool(""); setCustomSchool(""); }}
                className="text-ink-muted hover:text-ink text-xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="text-[12px] font-bold text-ink-secondary mb-2">
              학교 선택 <span className="text-red-500">*</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {SCHOOLS.map((s) => (
                <button
                  key={s}
                  onClick={() => setNewSchool(s)}
                  className={`px-3 py-1 rounded-full text-[12px] border-[1.5px] transition-all ${newSchool === s
                      ? "border-brand-middle bg-brand-middle-pale text-brand-middle-dark font-bold"
                      : "border-line bg-white text-ink-secondary font-medium hover:border-brand-middle-light"
                    }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {newSchool === "직접입력" && (
              <div className="mb-4">
                <input
                  value={customSchool}
                  onChange={(e) => setCustomSchool(e.target.value)}
                  placeholder="학교 이름을 직접 입력해주세요"
                  autoFocus
                  className="w-full h-11 px-3.5 border border-line rounded-lg text-[14px] focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                />
              </div>
            )}

            <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 mb-4 flex gap-2">
              <span className="text-base">💡</span>
              <div className="text-[11px] text-brand-middle-dark leading-[1.6]">
                학교를 추가하면 <strong>5단계 자소서 작성 마법사</strong>가 자동으로 시작돼요!
              </div>
            </div>

            <button
              onClick={handleAddSchool}
              disabled={!newSchool || (newSchool === "직접입력" && !customSchool) || addEssay.isPending}
              className={`w-full h-11 rounded-lg text-[14px] font-semibold transition-all ${newSchool && (newSchool !== "직접입력" || customSchool) && !addEssay.isPending
                  ? "bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle"
                  : "bg-gray-100 text-ink-muted cursor-not-allowed"
                }`}
            >
              {addEssay.isPending ? "추가 중..." : "추가하고 자소서 작성 시작 🎯"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}