import { useState, useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { studentState, academyState } from "@/lib/auth/atoms";
import { supabase } from "@/lib/supabase";
import {
  useAllSchools,
  useSchoolQuestions,
  useMyPastAnswers,
  usePastFeedback,
  useSubmitPastAnswer,
  useSubmitPastUpgrade,
  useSubmitPastTailAnswer,
  useMyTargetSchools,
  useAddTargetSchool,
  useHideTargetSchool,
} from "@/pages/middle-student/_hooks/useMyPast";
import { useDraftAutoSave, type DraftStatus } from "@/pages/middle-student/_hooks/useDraftAutoSave";

const MAX_TARGETS = 6;

const TYPE_COLOR: Record<string, string> = {
  지원동기: "bg-[#EEF2FF] text-[#3B5BDB] border-[#BAC8FF]",
  자기주도: "bg-brand-middle-bg text-brand-middle-dark border-brand-middle-light",
  활동계획: "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
  인성: "bg-amber-50 text-amber-700 border-amber-200",
  진로: "bg-brand-middle-pale text-brand-middle-dark border-brand-middle-light",
  전공: "bg-brand-middle-bg text-brand-middle-dark border-brand-middle-light",
  활동: "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
  자기소개: "bg-orange-50 text-orange-700 border-orange-200",
};

const STEP_LABELS = ["첫 답변", "1차 피드백", "업그레이드", "최종 피드백", "꼬리질문"];

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
// ⭐ STT 마이크 버튼 (재사용) - CSR 단문 STT 사용
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
      className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 text-base transition-all ${
        recording
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

const SubmitBtn = ({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-[108px] h-9 rounded-lg text-[12px] font-semibold flex-shrink-0 transition-all ${
      !disabled
        ? "bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle"
        : "bg-gray-100 text-ink-muted cursor-not-allowed"
    }`}
  >
    {label}
  </button>
);

// ─────────────────────────────────────────────
// ⭐ Step 1 답변 박스 (자동저장 + STT)
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
    `past:answer:${questionId}`,
    initialValue,
    disabled,
  );

  return (
    <>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="답변을 작성하거나 마이크로 녹음해주세요."
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
// ⭐ Step 3 업그레이드 박스 (자동저장 + STT)
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
    `past:upgraded:${questionId}`,
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
// ⭐ Step 5 꼬리질문 박스 (자동저장 + STT)
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
    `past:tail:${questionId}:${tailIndex}`,
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
            className={`w-[102px] h-[34px] rounded-md text-[12px] font-semibold transition-all ${
              text.trim() && !isPending
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
export default function MiddlePast() {
  const student = useAtomValue(studentState);
  const academy = useAtomValue(academyState);
  const studentId = student?.id ? String(student.id) : undefined;

  const { data: allSchools = [] } = useAllSchools();
  const { data: myTargetSchools = [] } = useMyTargetSchools(studentId);
  const addTargetSchool = useAddTargetSchool();
  const hideTargetSchool = useHideTargetSchool();

  const [selSchool, setSelSchool] = useState("");

  // 🎯 진로 컨셉
  const [concept, setConcept] = useState<any>(null);
  const [conceptOpen, setConceptOpen] = useState(false);

  useEffect(() => {
    if (!selSchool && myTargetSchools.length > 0) {
      setSelSchool(myTargetSchools[0].school);
    }
  }, [myTargetSchools, selSchool]);

  // 진로 컨셉 조회
  useEffect(() => {
    if (!studentId) return;
    supabase
      .from("middle_student_concept")
      .select("type_code, type_name, major, career, keywords, custom_goal")
      .eq("student_id", studentId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setConcept(data));
  }, [studentId]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolDropOpen, setSchoolDropOpen] = useState(false);

  const { data: questions = [] } = useSchoolQuestions(selSchool || undefined);
  const { data: answers = [] } = useMyPastAnswers(studentId, selSchool || undefined);

  const answerByQuestionId = answers.reduce((acc: Record<string, any>, a) => {
    acc[a.question_id] = a;
    return acc;
  }, {});

  const [selQId, setSelQId] = useState<string | null>(null);
  const selQ = questions.find((q) => q.id === selQId) ?? null;
  const selAnswer = selQ ? answerByQuestionId[selQ.id] : null;

  const { data: selFeedback } = usePastFeedback(selAnswer?.id);

  const [editingStep1, setEditingStep1] = useState(false);
  const [editingStep3, setEditingStep3] = useState(false);

  useEffect(() => {
    setEditingStep1(false);
    setEditingStep3(false);
  }, [selQId]);

  const submitAnswer = useSubmitPastAnswer();
  const submitUpgrade = useSubmitPastUpgrade();
  const submitTailAnswer = useSubmitPastTailAnswer();

  const myTargetSchoolNames = myTargetSchools.map((t) => t.school);
  const filteredSchools = allSchools.filter(
    (s) => s.includes(schoolSearch) && !myTargetSchoolNames.includes(s),
  );

  const getStep = (answer: any, fb: any) => {
    if (!answer?.answer) return 0;
    if (!fb?.teacher_first_feedback) return 1;
    if (!answer.upgraded_answer) return 2;
    if (!fb?.teacher_final_feedback) return 3;
    return 4;
  };

  const answeredCount = questions.filter((q) => answerByQuestionId[q.id]?.answer).length;

  const handleAddSchool = async (school: string) => {
    if (!student?.id || !academy?.academyId) {
      alert("로그인 정보를 불러오지 못했어요.");
      return;
    }
    if (myTargetSchools.length >= MAX_TARGETS) {
      alert(`지원 학교는 최대 ${MAX_TARGETS}개까지 등록 가능해요.`);
      return;
    }
    try {
      await addTargetSchool.mutateAsync({
        student_id: String(student.id),
        academy_id: String(academy.academyId),
        school,
      });
      setSelSchool(school);
      setSelQId(null);
      setShowAddForm(false);
      setSchoolSearch("");
      setSchoolDropOpen(false);
    } catch (e: any) {
      alert(`추가 실패: ${e.message}`);
    }
  };

  const handleHideSchool = async (school: string) => {
    if (!student?.id) return;
    if (!confirm(`"${school}"을(를) 목록에서 숨길까요?\n\n⚠️ 답변/피드백 데이터는 모두 유지돼요.\n원장님이 언제든 다시 복구할 수 있어요.`)) return;
    try {
      await hideTargetSchool.mutateAsync({
        student_id: String(student.id),
        school,
      });
      if (selSchool === school) {
        const remaining = myTargetSchools.filter((t) => t.school !== school);
        if (remaining.length > 0) {
          setSelSchool(remaining[0].school);
        } else {
          setSelSchool("");
        }
        setSelQId(null);
      }
    } catch (e: any) {
      alert(`숨김 처리 실패: ${e.message}`);
    }
  };

  // ⭐ 답변 제출 + 임시저장 삭제
  const handleSubmitAnswer = async (text: string, clearDraft: () => Promise<void>) => {
    if (!text.trim() || !selQ) return;
    if (!student?.id || !academy?.academyId) {
      alert("로그인 정보를 불러오지 못했어요.");
      return;
    }
    try {
      await submitAnswer.mutateAsync({
        question_id: selQ.id,
        student_id: String(student.id),
        academy_id: String(academy.academyId),
        answer: text,
      });
      await clearDraft();
      setEditingStep1(false);
    } catch (e: any) {
      alert(`제출 실패: ${e.message}`);
    }
  };

  const handleSubmitUpgrade = async (text: string, clearDraft: () => Promise<void>) => {
    if (!text.trim() || !selAnswer) return;
    try {
      await submitUpgrade.mutateAsync({
        answer_id: selAnswer.id,
        upgraded_answer: text,
      });
      await clearDraft();
      setEditingStep3(false);
    } catch (e: any) {
      alert(`제출 실패: ${e.message}`);
    }
  };

  const handleSubmitTailAnswer = async (idx: number, text: string, clearDraft: () => Promise<void>) => {
    if (!text.trim() || !selAnswer) return;
    try {
      await submitTailAnswer.mutateAsync({
        answer_id: selAnswer.id,
        tail_index: idx,
        answer: text,
      });
      await clearDraft();
    } catch (e: any) {
      alert(`제출 실패: ${e.message}`);
    }
  };

  const canAddMore = myTargetSchools.length < MAX_TARGETS;

  return (
    <div className="flex flex-col gap-3 px-6 py-5 font-sans text-ink h-full overflow-y-auto">

      {/* 🎯 진로 컨셉 카드 (접기/펼치기) */}
      {concept && (
        conceptOpen ? (
          <div className="bg-gradient-to-r from-brand-middle-pale via-purple-50 to-pink-50 border border-brand-middle-light rounded-xl px-4 py-2.5 flex-shrink-0 shadow-[0_2px_8px_rgba(16,185,129,0.06)]">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-brand-middle-dark uppercase tracking-wider mb-1">내 진로 컨셉</div>
                <div className="flex items-center gap-2 flex-wrap text-[12px]">
                  <span className="font-bold text-ink bg-white px-2 py-0.5 rounded-full border border-brand-middle-light">
                    {concept.type_name}
                    {concept.type_code && <span className="text-ink-muted ml-1">({concept.type_code}형)</span>}
                  </span>
                  <span className="text-ink-muted">·</span>
                  <span className="font-semibold text-ink">📚 {concept.major}</span>
                  <span className="text-ink-muted">→</span>
                  <span className="text-ink-secondary">💼 {concept.career}</span>
                  {Array.isArray(concept.keywords) && concept.keywords.length > 0 && (
                    <>
                      <span className="text-ink-muted">·</span>
                      <span className="text-brand-middle font-semibold">
                        {concept.keywords.map((k: string) => `#${k}`).join(" ")}
                      </span>
                    </>
                  )}
                </div>
                {concept.custom_goal && (
                  <div className="text-[11px] text-ink-secondary mt-1 italic">📝 {concept.custom_goal}</div>
                )}
              </div>
              <button onClick={() => setConceptOpen(false)}
                className="text-[11px] font-semibold text-brand-middle-dark bg-white border border-brand-middle-light rounded-full px-2.5 py-1 hover:bg-brand-middle-bg flex-shrink-0 transition-all self-start">
                접기 ▲
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConceptOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-middle-pale to-purple-50 border border-brand-middle-light rounded-full px-3.5 py-1.5 flex-shrink-0 self-start hover:shadow-sm transition-all">
            <span className="text-base">🎯</span>
            <span className="text-[11px] font-bold text-brand-middle-dark">내 진로 컨셉</span>
            <span className="text-[11px] text-ink-secondary">{concept.type_name}{concept.major ? ` · ${concept.major}` : ""}</span>
            <span className="text-[11px] text-brand-middle-dark font-semibold">펼치기 ▼</span>
          </button>
        )
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[18px] font-extrabold text-ink tracking-tight">기출문제</div>
          <div className="text-[12px] text-ink-muted mt-0.5">
            {student?.name} · {academy?.academyName}
          </div>
        </div>
        {selSchool && (
          <div className="bg-brand-middle-bg text-brand-middle-dark text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-brand-middle-light">
            {answeredCount}/{questions.length} 답변완료
          </div>
        )}
      </div>

      {/* 지원 학교 칩 */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        <div className="flex gap-1.5 items-center flex-wrap">
          <span className="text-[11px] text-ink-muted font-semibold mr-1">
            내 지원 학교 ({myTargetSchools.length}/{MAX_TARGETS}):
          </span>

          {myTargetSchools.map((t) => {
            const isSelected = selSchool === t.school;
            return (
              <div
                key={t.id}
                className={`inline-flex items-center gap-1 rounded-full border transition-all ${
                  isSelected ? "bg-brand-middle border-brand-middle" : "bg-white border-line hover:border-brand-middle-light"
                }`}
              >
                <button
                  onClick={() => { setSelSchool(t.school); setSelQId(null); }}
                  className={`px-3 py-1.5 text-[11px] ${
                    isSelected ? "text-white font-bold" : "text-brand-middle-dark font-semibold hover:text-brand-middle"
                  }`}
                >
                  🏫 {t.school}
                </button>
                <button
                  onClick={() => handleHideSchool(t.school)}
                  className={`pr-2.5 text-[11px] leading-none ${
                    isSelected ? "text-white/70 hover:text-white" : "text-red-400 hover:text-red-600"
                  }`}
                  title="목록에서 숨김"
                >
                  ✕
                </button>
              </div>
            );
          })}

          {canAddMore && !showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-brand-middle-pale text-brand-middle-dark border border-brand-middle-light hover:bg-brand-middle-bg transition-all"
            >
              + 학교 추가
            </button>
          )}

          {!canAddMore && (
            <div className="text-[10px] text-amber-600 font-medium px-2">
              ⚠️ 최대 {MAX_TARGETS}개까지 등록 가능
            </div>
          )}
        </div>

        {showAddForm && (
          <div className="flex gap-2 items-center flex-wrap bg-brand-middle-pale border border-brand-middle-light rounded-xl px-3 py-2.5">
            <span className="text-[11px] font-bold text-brand-middle-dark">지원 학교:</span>
            <div className="relative w-[260px]">
              <div
                onClick={() => setSchoolDropOpen(true)}
                className={`flex items-center gap-2 border rounded-lg px-3 bg-white cursor-text h-9 transition-all ${
                  schoolDropOpen ? "border-brand-middle ring-2 ring-brand-middle/10" : "border-line"
                }`}
              >
                <span className="text-[14px] flex-shrink-0">🏫</span>
                <input
                  value={schoolSearch}
                  onChange={(e) => { setSchoolSearch(e.target.value); setSchoolDropOpen(true); }}
                  onFocus={() => setSchoolDropOpen(true)}
                  placeholder="고등 학교 검색"
                  className="flex-1 border-none outline-none text-[12px] bg-transparent text-ink min-w-0 placeholder:text-ink-muted"
                  autoFocus
                />
                <span className="text-[10px] text-ink-muted">▼</span>
              </div>

              {schoolDropOpen && (
                <>
                  <div onClick={() => setSchoolDropOpen(false)} className="fixed inset-0 z-10" />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-line rounded-lg z-20 max-h-[240px] overflow-y-auto shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                    {filteredSchools.length === 0 ? (
                      <div className="px-3 py-2.5 text-[12px] text-ink-muted text-center">
                        {schoolSearch ? "검색 결과 없음" : "추가할 학교가 없어요"}
                      </div>
                    ) : (
                      filteredSchools.map((s, i) => (
                        <div
                          key={i}
                          onClick={() => handleAddSchool(s)}
                          className={`px-3 py-2 text-[13px] text-ink cursor-pointer transition-colors hover:bg-brand-middle-pale/50 ${
                            i < filteredSchools.length - 1 ? "border-b border-line-light" : ""
                          }`}
                        >
                          {s}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => { setShowAddForm(false); setSchoolSearch(""); setSchoolDropOpen(false); }}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white text-ink-secondary border border-line hover:bg-gray-50 transition-all"
            >
              취소
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 items-start">
        {/* 왼쪽: 질문 목록 */}
        <div className="w-[360px] flex-shrink-0 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="px-3.5 py-3 border-b border-line flex-shrink-0">
            {selSchool ? (
              <>
                <div className="text-[14px] font-bold text-ink tracking-tight">{selSchool}</div>
                <div className="text-[11px] text-ink-secondary mt-1">
                  총 <span className="text-brand-middle-dark font-bold">{questions.length}개</span> · 답변완료{" "}
                  <span className="text-brand-middle-dark font-bold">{answeredCount}개</span>
                </div>
              </>
            ) : (
              <div className="text-[12px] text-ink-muted">학교를 선택해주세요</div>
            )}
          </div>

          <div className="px-3 py-2.5">
            {!selSchool ? (
              <div className="text-center py-10 text-ink-muted text-[12px]">
                <div className="text-3xl mb-2">🏫</div>
                {myTargetSchools.length === 0 ? "+ 학교 추가 버튼을 눌러주세요" : "위에서 학교를 선택해주세요"}
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-10 text-ink-muted text-[12px]">
                <div className="text-3xl mb-2">📝</div>
                기출문제가 없어요.
              </div>
            ) : (
              questions.map((q, i) => {
                const typeClass = TYPE_COLOR[q.type] || TYPE_COLOR["지원동기"];
                const ans = answerByQuestionId[q.id];
                const answered = !!ans?.answer;
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelQId(q.id)}
                    className={`border rounded-xl px-3.5 py-3 mb-1.5 cursor-pointer transition-all ${
                      selQId === q.id
                        ? "border-brand-middle bg-brand-middle-pale shadow-[0_4px_16px_rgba(16,185,129,0.12)]"
                        : "border-line bg-white hover:border-brand-middle-light hover:shadow-sm"
                    }`}
                  >
                    <div className="flex gap-1 mb-1.5">
                      <span className="text-[10px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full">
                        Q{i + 1}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeClass}`}>
                        {q.type}
                      </span>
                    </div>
                    <div className="text-[12px] text-ink leading-relaxed font-semibold mb-1.5">{q.text}</div>
                    {answered ? (
                      <span className="text-[10px] font-semibold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full border border-brand-middle-light">
                        답변완료
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        미답변
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 오른쪽: 상세 */}
        <div className="flex-1 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)] sticky top-0" style={{ height: "calc(100vh - 160px)" }}>
          {!selQ ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
              <div className="text-4xl">🎓</div>
              <div className="text-[14px] font-semibold text-ink-secondary">질문을 선택해주세요</div>
              <div className="text-[12px]">왼쪽에서 기출문제를 클릭하면 답변을 작성할 수 있어요</div>
            </div>
          ) : (
            <>
              {/* 질문 헤더 */}
              <div className="px-4 py-3.5 border-b border-line flex-shrink-0">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-semibold text-ink">
                      Q{questions.findIndex((q) => q.id === selQ.id) + 1}
                    </div>
                    <span className="text-[11px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full">
                      {selSchool}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLOR[selQ.type] || TYPE_COLOR["지원동기"]}`}>
                      {selQ.type}
                    </span>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                    selAnswer?.answer ? "bg-brand-middle-bg text-brand-middle-dark border-brand-middle-light" : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {selAnswer?.answer ? "답변완료" : "미답변"}
                  </span>
                </div>

                <div className="flex">
                  {STEP_LABELS.map((label, i) => {
                    const step = getStep(selAnswer, selFeedback);
                    const stepNum = i + 1;
                    const isDone = stepNum < step;
                    const isOn = stepNum === step;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                        {i < 4 && <div className={`absolute top-[11px] left-[55%] w-[90%] h-px ${isDone ? "bg-brand-middle" : "bg-line"}`} />}
                        <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-semibold z-10 relative ${
                          isDone || isOn ? "bg-brand-middle text-white border border-brand-middle" : "bg-gray-100 text-ink-muted border border-line"
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
                {/* 질문 */}
                <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                  <div className="text-[10px] font-semibold text-ink-muted mb-1">기출 질문</div>
                  <div className="text-[14px] font-semibold text-ink leading-[1.6]">{selQ.text}</div>
                </div>

                {/* Step 1 */}
                <div className="bg-white border border-line rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-bold text-white bg-ink-muted px-2 py-0.5 rounded-full">Step 1</span>
                    <span className="text-[11px] text-ink-secondary font-medium">내 첫 답변</span>
                  </div>
                  {selAnswer?.answer && !editingStep1 ? (
                    <div>
                      <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] mb-2 whitespace-pre-wrap">
                        {selAnswer.answer}
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
                      existingAnswer={selAnswer?.answer ?? null}
                      editingMode={editingStep1}
                      onSubmit={handleSubmitAnswer}
                      onCancel={() => setEditingStep1(false)}
                      isPending={submitAnswer.isPending}
                    />
                  )}
                </div>

                {/* Step 2 */}
                {selAnswer?.answer && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">Step 2</span>
                      <span className="text-[11px] text-ink-secondary font-medium">선생님 1차 피드백</span>
                    </div>
                    {selFeedback?.teacher_first_feedback ? (
                      <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 text-[13px] text-[#065F46] leading-[1.8] whitespace-pre-wrap">
                        {selFeedback.teacher_first_feedback}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">
                        선생님 피드백을 기다리는 중이에요.
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3 */}
                {selFeedback?.teacher_first_feedback && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-ink-muted px-2 py-0.5 rounded-full">Step 3</span>
                      <span className="text-[11px] text-ink-secondary font-medium">업그레이드 답변</span>
                    </div>
                    {selAnswer?.upgraded_answer && !editingStep3 ? (
                      <div>
                        <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] mb-2 whitespace-pre-wrap">
                          {selAnswer.upgraded_answer}
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
                        existingUpgrade={selAnswer?.upgraded_answer ?? null}
                        editingMode={editingStep3}
                        onSubmit={handleSubmitUpgrade}
                        onCancel={() => setEditingStep3(false)}
                        isPending={submitUpgrade.isPending}
                      />
                    )}
                  </div>
                )}

                {/* Step 4 */}
                {selAnswer?.upgraded_answer && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">Step 4</span>
                      <span className="text-[11px] text-ink-secondary font-medium">선생님 최종 피드백</span>
                    </div>
                    {selFeedback?.teacher_final_feedback ? (
                      <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 text-[13px] text-[#065F46] leading-[1.8] whitespace-pre-wrap">
                        {selFeedback.teacher_final_feedback}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">
                        선생님 최종 피드백을 기다리는 중이에요.
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5 꼬리질문 */}
                {selFeedback?.tail_questions && selFeedback.tail_questions.length > 0 && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">Step 5</span>
                      <span className="text-[11px] text-ink-secondary font-medium">꼬리질문</span>
                    </div>
                    {selFeedback.tail_questions.map((t: any, i: number) => (
                      <div key={i} className="mb-3">
                        <div className="flex items-start gap-1.5 px-2.5 py-2 bg-gray-50 rounded-md mb-2 text-[12px] text-ink leading-[1.5]">
                          <span className="text-[10px] font-bold text-brand-middle-dark bg-brand-middle-bg px-1.5 py-0.5 rounded-full flex-shrink-0 mt-[1px]">
                            꼬리 {i + 1}
                          </span>
                          {t.text}
                        </div>
                        {t.answer ? (
                          <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2 text-[12.5px] text-[#065F46] leading-[1.7] whitespace-pre-wrap">
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
        </div>
      </div>
    </div>
  );
}