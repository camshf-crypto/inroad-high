import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { studentState, academyState } from "@/lib/auth/atoms";
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
} from "@/pages/middle-student/_hooks/useExpect";

const STEP_LABELS = [
  "첫 답변",
  "1차 피드백",
  "업그레이드",
  "최종 피드백",
  "꼬리질문",
];

const SCHOOLS = [
  "인천하늘고",
  "한국과학영재학교",
  "경기과학고",
  "서울과학고",
  "대원외고",
  "민족사관고",
  "하나고",
  "외대부고",
  "휘문고(자사고)",
  "중동고(자사고)",
  "직접입력",
];

const SECTIONS = [
  {
    key: "selfStudy",
    label: "📚 자기주도학습 과정",
    placeholder:
      "스스로 학습계획을 세우고 학습해 온 과정과 그 과정에서 느꼈던 점을 구체적으로 작성해보세요.",
  },
  {
    key: "reason",
    label: "🏫 지원동기 (건학이념 연계)",
    placeholder:
      "학교 건학이념과 연계하여 이 학교에 관심을 갖게 된 동기를 구체적으로 작성해보세요.",
  },
  {
    key: "activity",
    label: "🎯 꿈과 끼를 살리기 위한 활동계획",
    placeholder:
      "고등학교 입학 후 자기주도적으로 꿈과 끼를 살리기 위한 활동계획을 작성해보세요.",
  },
  {
    key: "career",
    label: "🚀 진로계획",
    placeholder: "고등학교 졸업 후 진로계획에 대해 구체적으로 작성해보세요.",
  },
  {
    key: "character",
    label: "🤝 인성 (배려·나눔·협력·타인존중·규칙준수)",
    placeholder:
      "본인의 인성을 나타낼 수 있는 개인적 경험과 이를 통해 배우고 느낀 점을 구체적으로 작성해보세요.",
  },
];

const EMPTY_ESSAY = {
  selfStudy: "",
  reason: "",
  activity: "",
  career: "",
  character: "",
};

const MicBtn = ({
  recording,
  onClick,
}: {
  recording: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 text-base transition-all ${
      recording
        ? "bg-red-50 border-red-200 text-red-500 hover:bg-red-100"
        : "bg-brand-middle-pale border-brand-middle-light text-brand-middle-dark hover:bg-brand-middle-bg"
    }`}
  >
    {recording ? "⏹" : "🎙️"}
  </button>
);

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

export default function MiddleExpect() {
  const student = useAtomValue(studentState);
  const academy = useAtomValue(academyState);

  // ⭐ DB 훅
  const studentId = student?.id ? String(student.id) : undefined;
  const { data: essays = [], isLoading } = useMyEssays(studentId);
  const addEssay = useAddEssay();
  const updateEssay = useUpdateEssay();

  const [activeTab, setActiveTab] = useState<"essay" | "questions">("essay");

  // 자소서 선택
  const [selEssayId, setSelEssayId] = useState<string | null>(null);
  const selEssay = essays.find((e) => e.id === selEssayId) ?? null;

  // 자소서 첫 항목 자동 선택
  useEffect(() => {
    if (!selEssayId && essays.length > 0) {
      setSelEssayId(essays[0].id);
    }
  }, [essays.length, selEssayId]);

  // 선택한 자소서 피드백
  const { data: essayFeedbacks = [] } = useEssayFeedback(
    selEssayId ?? undefined,
  );

  // ⭐ 답변 이력 조회
  const { data: essayAnswers = [] } = useEssayAnswers(selEssayId ?? undefined);

  // 섹션별 답변 이력 그룹핑
  const answersBySection = essayAnswers.reduce(
    (acc: Record<string, any[]>, a) => {
      if (!acc[a.section_key]) acc[a.section_key] = [];
      acc[a.section_key].push(a);
      return acc;
    },
    {},
  );

  // 학교 추가
  const [showAddEssay, setShowAddEssay] = useState(false);
  const [newSchool, setNewSchool] = useState("");
  const [customSchool, setCustomSchool] = useState("");

  // 자소서 작성/수정
  const [editingEssay, setEditingEssay] = useState(false);
  const [tempContent, setTempContent] = useState({ ...EMPTY_ESSAY });
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [tempSection, setTempSection] = useState("");

  // 예상질문
  const [selSchoolFilter, setSelSchoolFilter] = useState<string>("");
  const [selQId, setSelQId] = useState<string | null>(null);

  // 학교 필터에 해당하는 자소서 찾기
  const filterEssay = essays.find((e) => e.school === selSchoolFilter);
  const { data: questions = [] } = useEssayQuestions(filterEssay?.id);

  // 선택한 질문
  const selQ = questions.find((q) => q.id === selQId) ?? null;
  const { data: selQFeedback } = useQuestionFeedback(selQId ?? undefined);

  // 질문생성된 자소서 첫 학교 자동 선택
  useEffect(() => {
    if (!selSchoolFilter) {
      const generated = essays.find((e) => e.questions_generated);
      if (generated) {
        setSelSchoolFilter(generated.school);
      }
    }
  }, [essays, selSchoolFilter]);

  // 답변/업그레이드 입력
  const [myAnswer, setMyAnswer] = useState("");
  const [upgradedAnswer, setUpgradedAnswer] = useState("");
  const [isRecording1, setIsRecording1] = useState(false);
  const [isRecording3, setIsRecording3] = useState(false);
  const [editingStep1, setEditingStep1] = useState(false);
  const [editingStep3, setEditingStep3] = useState(false);
  const [tailRecordings, setTailRecordings] = useState<Record<number, boolean>>(
    {},
  );
  const [tailAnswers, setTailAnswers] = useState<Record<number, string>>({});

  // 질문 바뀌면 입력 초기화
  useEffect(() => {
    setMyAnswer("");
    setUpgradedAnswer("");
    setIsRecording1(false);
    setIsRecording3(false);
    setEditingStep1(false);
    setEditingStep3(false);
    setTailAnswers({});
  }, [selQId]);

  // 제출 훅
  const submitAnswer = useSubmitAnswer();
  const submitUpgrade = useSubmitUpgrade();
  const submitTailAnswer = useSubmitTailAnswer();

  // 삭제 요청 훅
  const requestDelete = useRequestDeleteEssay();
  const cancelDelete = useCancelDeleteRequest();

  // 자소서 삭제 요청
  const handleRequestDelete = async () => {
    if (!selEssay) return;
    if (
      !confirm(
        `'${selEssay.school}' 자소서 삭제를 선생님께 요청할까요?\n\n선생님이 승인하면 자소서와 모든 답변, 피드백이 삭제됩니다.`,
      )
    )
      return;
    try {
      await requestDelete.mutateAsync(selEssay.id);
      alert("✅ 삭제 요청이 선생님께 전달되었어요!");
    } catch (e: any) {
      alert(`요청 실패: ${e.message}`);
    }
  };

  // 자소서 삭제 요청 취소
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

  // 모든 자소서 가져온 questions 카운트 (UI용)
  const allQuestionsCount = essays.reduce((sum) => sum, 0); // 일단 0, 정확한 카운트는 나중

  const countChars = (content: any) =>
    Object.values(content || {})
      .join("")
      .replace(/\s/g, "").length;

  const charCount = countChars(tempContent);

  const getStep = (q: any, fb: any) => {
    if (!q.answer) return 0;
    if (!fb?.teacher_first_feedback) return 1;
    if (!q.upgraded_answer) return 2;
    if (!fb?.teacher_final_feedback) return 3;
    return 4;
  };

  // 학교 추가 → DB INSERT
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
      setEditingEssay(true);
      setShowAddEssay(false);
      setNewSchool("");
      setCustomSchool("");
    } catch (e: any) {
      alert(`추가 실패: ${e.message}`);
    }
  };

  // 자소서 전체 저장
  const saveEssay = async () => {
    if (!selEssay) return;
    try {
      await updateEssay.mutateAsync({
        essay_id: selEssay.id,
        content: tempContent,
        version: selEssay.version + 1,
        previousContent: selEssay.content, // ⭐ 이전 답변 (변경된 섹션만 history INSERT)
      });
      setEditingEssay(false);
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  // 섹션별 수정 저장
  const saveSectionEdit = async (key: string) => {
    if (!selEssay) return;
    try {
      const newContent = { ...selEssay.content, [key]: tempSection };
      await updateEssay.mutateAsync({
        essay_id: selEssay.id,
        content: newContent,
        version: selEssay.version + 1,
        previousContent: selEssay.content, // ⭐ 이전 답변
      });
      setEditingSection(null);
      setTempSection("");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  // 답변 제출
  const handleSubmitAnswer = async () => {
    if (!myAnswer.trim() || !selQ) return;
    try {
      await submitAnswer.mutateAsync({
        question_id: selQ.id,
        answer: myAnswer,
      });
      setMyAnswer("");
      setIsRecording1(false);
      setEditingStep1(false);
    } catch (e: any) {
      alert(`제출 실패: ${e.message}`);
    }
  };

  // 업그레이드 답변 제출
  const handleSubmitUpgrade = async () => {
    if (!upgradedAnswer.trim() || !selQ) return;
    try {
      await submitUpgrade.mutateAsync({
        question_id: selQ.id,
        upgraded_answer: upgradedAnswer,
      });
      setUpgradedAnswer("");
      setIsRecording3(false);
      setEditingStep3(false);
    } catch (e: any) {
      alert(`제출 실패: ${e.message}`);
    }
  };

  // 꼬리질문 답변 제출
  const handleSubmitTailAnswer = async (idx: number) => {
    const text = tailAnswers[idx] || "";
    if (!text.trim() || !selQ) return;
    try {
      await submitTailAnswer.mutateAsync({
        question_id: selQ.id,
        tail_index: idx,
        answer: text,
      });
      setTailAnswers((prev) => ({ ...prev, [idx]: "" }));
    } catch (e: any) {
      alert(`제출 실패: ${e.message}`);
    }
  };

  // 학교별 그룹핑된 자소서들 (예상질문 탭용)
  const schoolsWithQuestions = essays
    .filter((e) => e.questions_generated)
    .map((e) => e.school);

  // 섹션별 피드백 그룹핑
  const feedbackBySection = essayFeedbacks.reduce(
    (acc: Record<string, any[]>, fb) => {
      if (!acc[fb.section_key]) acc[fb.section_key] = [];
      acc[fb.section_key].push(fb);
      return acc;
    },
    {},
  );

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[18px] font-extrabold text-ink tracking-tight">
            자소서 · 예상질문
          </div>
          <div className="text-[12px] text-ink-muted mt-0.5">
            {student?.name} · {academy?.academyName}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="bg-brand-middle-bg text-brand-middle-dark text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-brand-middle-light">
            자소서 {essays.length}개
          </div>
          <div className="bg-[#EEF2FF] text-[#3B5BDB] text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-[#BAC8FF]">
            예상질문 학교 {schoolsWithQuestions.length}개
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* 왼쪽 패널 */}
        <div className="w-[360px] flex-shrink-0 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          {/* 탭 */}
          <div className="flex border-b border-line flex-shrink-0">
            {[
              { key: "essay", label: "📝 자기소개서" },
              { key: "questions", label: "💬 예상질문" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`flex-1 py-3 text-center text-[13px] transition-all ${
                  activeTab === t.key
                    ? "text-brand-middle-dark font-bold border-b-2 border-brand-middle"
                    : "text-ink-muted font-medium border-b-2 border-transparent hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 자소서 탭 왼쪽 */}
          {activeTab === "essay" && (
            <>
              <div className="px-3.5 py-2.5 border-b border-line flex-shrink-0 flex items-center justify-between">
                <div className="text-[12px] text-ink-secondary">
                  총{" "}
                  <span className="text-brand-middle-dark font-bold">
                    {essays.length}개
                  </span>
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
                    <div className="text-[10px] mt-1">
                      + 학교 추가 버튼을 눌러주세요
                    </div>
                  </div>
                ) : (
                  essays.map((e) => {
                    const isSel = selEssayId === e.id;
                    return (
                      <div
                        key={e.id}
                        onClick={() => {
                          setSelEssayId(e.id);
                          setEditingEssay(false);
                          setEditingSection(null);
                        }}
                        className={`border rounded-xl px-3.5 py-3 mb-1.5 cursor-pointer transition-all ${
                          isSel
                            ? "border-brand-middle bg-brand-middle-pale shadow-[0_4px_16px_rgba(16,185,129,0.12)]"
                            : "border-line bg-white hover:border-brand-middle-light hover:shadow-sm"
                        }`}
                      >
                        <div
                          className={`text-[13px] font-bold mb-1.5 ${isSel ? "text-brand-middle-dark" : "text-ink"}`}
                        >
                          {e.school}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {e.content.selfStudy ? (
                            <span className="text-[10px] font-semibold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full border border-brand-middle-light">
                              작성완료 · {countChars(e.content)}자
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              미작성
                            </span>
                          )}
                          {e.version > 1 && (
                            <span className="text-[10px] font-semibold text-[#3B5BDB] bg-[#EEF2FF] px-2 py-0.5 rounded-full">
                              v{e.version}
                            </span>
                          )}
                          {e.questions_generated && (
                            <span className="text-[10px] font-semibold text-[#7C3AED] bg-[#F5F3FF] px-2 py-0.5 rounded-full">
                              질문생성완료
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
            </>
          )}

          {/* 예상질문 탭 왼쪽 */}
          {activeTab === "questions" && (
            <>
              {/* 학교 필터 */}
              <div className="px-3 py-2.5 border-b border-line flex-shrink-0">
                {schoolsWithQuestions.length === 0 ? (
                  <div className="text-[11px] text-ink-muted">
                    아직 생성된 예상질문이 없어요.
                  </div>
                ) : (
                  <div className="flex gap-1.5 flex-wrap">
                    {schoolsWithQuestions.map((school) => (
                      <button
                        key={school}
                        onClick={() => {
                          setSelSchoolFilter(school);
                          setSelQId(null);
                        }}
                        className={`px-3 py-1 rounded-full text-[11px] border-[1.5px] transition-all ${
                          selSchoolFilter === school
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
                  총{" "}
                  <span className="text-brand-middle-dark font-bold">
                    {questions.length}개
                  </span>{" "}
                  · 답변완료{" "}
                  <span className="text-brand-middle-dark font-bold">
                    {questions.filter((q) => q.answer).length}개
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-2.5">
                {questions.length === 0 ? (
                  <div className="text-center py-10 text-ink-muted text-[12px]">
                    <div className="text-3xl mb-2">💬</div>
                    <div>아직 예상질문이 없어요.</div>
                    <div className="mt-1.5">
                      자소서를 작성하고 저장하면
                      <br />
                      선생님이 예상질문을 만들어드려요!
                    </div>
                  </div>
                ) : (
                  questions.map((q, i) => (
                    <div
                      key={q.id}
                      onClick={() => setSelQId(q.id)}
                      className={`border rounded-xl px-3.5 py-3 mb-1.5 cursor-pointer transition-all ${
                        selQId === q.id
                          ? "border-brand-middle bg-brand-middle-pale shadow-[0_4px_16px_rgba(16,185,129,0.12)]"
                          : "border-line bg-white hover:border-brand-middle-light hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[10px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full">
                          질문 {i + 1}
                        </span>
                        {q.tag && (
                          <span className="text-[10px] text-ink-secondary bg-gray-100 px-1.5 py-0.5 rounded-full">
                            {q.tag}
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-ink leading-relaxed font-semibold mb-1.5">
                        {q.text}
                      </div>
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

        {/* 오른쪽 패널 */}
        <div className="flex-1 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          {/* 자소서 탭 오른쪽 */}
          {activeTab === "essay" && (
            <>
              {!selEssay ? (
                <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
                  <div className="text-4xl">📝</div>
                  <div className="text-[14px] font-semibold text-ink-secondary">
                    학교를 선택해주세요
                  </div>
                  <div className="text-[12px]">
                    왼쪽에서 학교를 클릭하거나 추가해보세요
                  </div>
                </div>
              ) : (
                <>
                  {/* 자소서 헤더 */}
                  <div className="px-4 py-3.5 border-b border-line flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-[16px] font-extrabold text-ink tracking-tight">
                            {selEssay.school}
                          </div>
                          {selEssay.delete_requested && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-300 rounded-full px-2 py-0.5">
                              🟡 삭제 요청 중
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-ink-muted mt-0.5">
                          {new Date(selEssay.created_at).toLocaleDateString(
                            "ko-KR",
                          )}{" "}
                          생성
                          {selEssay.version > 1 && ` · v${selEssay.version}`}·
                          1,500자 이내 (띄어쓰기 제외)
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!editingEssay &&
                          !editingSection &&
                          !selEssay.delete_requested && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingEssay(true);
                                  setTempContent({
                                    ...EMPTY_ESSAY,
                                    ...selEssay.content,
                                  });
                                }}
                                className="text-[11px] font-semibold text-brand-middle-dark bg-brand-middle-bg border border-brand-middle-light rounded-md px-3 py-1.5 hover:bg-brand-middle hover:text-white transition-all"
                              >
                                ✏️{" "}
                                {selEssay.content.selfStudy
                                  ? "전체 수정"
                                  : "작성하기"}
                              </button>
                              <button
                                onClick={handleRequestDelete}
                                disabled={requestDelete.isPending}
                                className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-1.5 hover:bg-red-100 transition-all disabled:opacity-50"
                              >
                                {requestDelete.isPending
                                  ? "요청 중..."
                                  : "🗑️ 삭제 요청"}
                              </button>
                            </>
                          )}
                        {selEssay.delete_requested && (
                          <button
                            onClick={handleCancelDelete}
                            disabled={cancelDelete.isPending}
                            className="text-[11px] font-semibold text-ink-secondary bg-white border border-line rounded-md px-3 py-1.5 hover:bg-gray-50 transition-all disabled:opacity-50"
                          >
                            {cancelDelete.isPending
                              ? "취소 중..."
                              : "↩️ 삭제 요청 취소"}
                          </button>
                        )}
                        {selEssay.questions_generated &&
                          !editingEssay &&
                          !editingSection &&
                          !selEssay.delete_requested && (
                            <span className="text-[11px] font-semibold text-[#7C3AED] bg-[#F5F3FF] border border-[#DDD6FE] rounded-md px-3 py-1.5">
                              ✓ 질문생성완료
                            </span>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {/* 전체 작성 모드 */}
                    {editingEssay && (
                      <div>
                        {SECTIONS.map((s) => (
                          <div key={s.key} className="mb-3.5">
                            <label className="text-[12px] font-bold text-ink-secondary block mb-1.5">
                              {s.label}
                            </label>

                            {/* ⭐ 전체 수정 모드 - 섹션별 선생님 피드백 표시 (참고용) */}
                            {feedbackBySection[s.key] &&
                              feedbackBySection[s.key].length > 0 && (
                                <div className="bg-[#EEF2FF] border-2 border-[#BAC8FF] rounded-lg px-3 py-2 mb-2">
                                  <div className="text-[10px] font-bold text-[#3B5BDB] mb-1.5 flex items-center gap-1">
                                    💬 선생님 피드백 (
                                    {feedbackBySection[s.key].length}차까지)
                                  </div>
                                  <div className="space-y-1">
                                    {feedbackBySection[s.key].map((fb) => (
                                      <div
                                        key={fb.id}
                                        className="bg-white rounded-md px-2.5 py-1.5"
                                      >
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                          <span className="text-[9px] font-extrabold text-white bg-[#3B5BDB] px-1.5 py-0.5 rounded-full">
                                            {fb.round}차
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-[#1E3A8A] leading-[1.5] whitespace-pre-wrap">
                                          {fb.text}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            <textarea
                              value={(tempContent as any)[s.key]}
                              onChange={(e) =>
                                setTempContent((p) => ({
                                  ...p,
                                  [s.key]: e.target.value,
                                }))
                              }
                              placeholder={s.placeholder}
                              rows={4}
                              className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                            />
                          </div>
                        ))}
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="text-[11px] text-ink-muted">
                            * 띄어쓰기 제외 1,500자 이내
                          </div>
                          <div
                            className={`text-[13px] font-bold ${
                              charCount > 1500
                                ? "text-red-500"
                                : charCount > 1200
                                  ? "text-amber-500"
                                  : "text-brand-middle-dark"
                            }`}
                          >
                            {charCount} / 1,500자{" "}
                            {charCount > 1500 && (
                              <span className="text-[11px]">⚠️ 초과!</span>
                            )}
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
                            className={`flex-[2] h-10 rounded-lg text-[13px] font-semibold transition-all ${
                              charCount > 1500 || updateEssay.isPending
                                ? "bg-gray-100 text-ink-muted cursor-not-allowed"
                                : "bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle"
                            }`}
                          >
                            {updateEssay.isPending
                              ? "저장 중..."
                              : charCount > 1500
                                ? `${charCount - 1500}자 초과`
                                : "저장"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 읽기 모드 - 비어있음 */}
                    {!editingEssay && !selEssay.content.selfStudy && (
                      <div className="text-center py-16 text-ink-muted">
                        <div className="text-4xl mb-2.5">📝</div>
                        <div className="text-[13px] font-medium">
                          아직 작성된 내용이 없어요.
                        </div>
                        <div className="text-[11px] mt-1">
                          작성하기 버튼을 눌러 자소서를 작성해보세요!
                        </div>
                      </div>
                    )}

                    {!editingEssay && selEssay.content.selfStudy && (
                      <div>
                        {/* 글자수 */}
                        <div className="text-right text-[11px] text-ink-muted mb-3">
                          총 {countChars(selEssay.content)} / 1,500자
                        </div>

                        {/* 항목별 — 다회차 답변/피드백 인터리브 */}
                        {SECTIONS.map((s) => {
                          const currentContent = (selEssay.content as any)[
                            s.key
                          ];
                          if (!currentContent && !answersBySection[s.key])
                            return null;

                          // 답변 이력
                          const answers = answersBySection[s.key] || [];
                          // 피드백 이력
                          const feedbacks = feedbackBySection[s.key] || [];

                          // 인터리브: 1차 답변 → 1차 피드백 → 2차 답변 → 2차 피드백 ...
                          const maxRound = Math.max(
                            answers.length > 0
                              ? Math.max(...answers.map((a) => a.round))
                              : 0,
                            feedbacks.length > 0
                              ? Math.max(...feedbacks.map((f) => f.round))
                              : 0,
                          );

                          // 마지막 답변 round 계산 (다음 round 표시용)
                          const lastAnswerRound =
                            answers.length > 0
                              ? Math.max(...answers.map((a) => a.round))
                              : 0;
                          const lastFeedbackRound =
                            feedbacks.length > 0
                              ? Math.max(...feedbacks.map((f) => f.round))
                              : 0;

                          // 새 답변 작성 가능한지: 마지막 피드백 round >= 마지막 답변 round
                          // (1차 답변 + 1차 피드백 받음 → 2차 답변 작성 가능)
                          const canWriteNextAnswer =
                            lastFeedbackRound >= lastAnswerRound &&
                            lastAnswerRound > 0;
                          const nextRound = lastAnswerRound + 1;

                          return (
                            <div key={s.key} className="mb-6">
                              {/* 섹션 제목 */}
                              <div className="text-[12px] font-bold text-brand-middle-dark mb-2 flex items-center justify-between">
                                <span>{s.label}</span>
                                {answers.length > 1 && (
                                  <span className="text-[10px] font-semibold text-ink-muted">
                                    총 {answers.length}차
                                  </span>
                                )}
                              </div>

                              {/* 회차별 답변 + 피드백 */}
                              {Array.from(
                                { length: maxRound },
                                (_, i) => i + 1,
                              ).map((round) => {
                                const ans = answers.find(
                                  (a) => a.round === round,
                                );
                                const fb = feedbacks.find(
                                  (f) => f.round === round,
                                );

                                return (
                                  <div key={round} className="mb-2">
                                    {/* N차 답변 */}
                                    {ans && (
                                      <div className="bg-gray-50 border border-line rounded-xl px-4 py-3 mb-1.5">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                          <span className="text-[10px] font-extrabold text-white bg-brand-middle px-1.5 py-0.5 rounded-full">
                                            {round === 1
                                              ? "1차 자소서 작성"
                                              : `${round}차 자소서 수정`}
                                          </span>
                                          <span className="text-[9px] text-ink-muted">
                                            {new Date(
                                              ans.created_at,
                                            ).toLocaleDateString("ko-KR")}
                                          </span>
                                        </div>
                                        <div className="text-[13px] text-ink leading-[1.8] whitespace-pre-wrap">
                                          {ans.content}
                                        </div>
                                      </div>
                                    )}

                                    {/* N차 피드백 */}
                                    {fb && (
                                      <div className="bg-[#EEF2FF] border border-[#BAC8FF] rounded-md px-4 py-2.5 flex gap-2 ml-3">
                                        <span className="text-sm flex-shrink-0">
                                          💬
                                        </span>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-[9px] font-extrabold text-white bg-[#3B5BDB] px-1.5 py-0.5 rounded-full">
                                              {round}차 피드백
                                            </span>
                                            <span className="text-[9px] text-ink-muted ml-auto">
                                              {new Date(
                                                fb.created_at,
                                              ).toLocaleDateString("ko-KR")}
                                            </span>
                                          </div>
                                          <div className="text-[12px] text-[#1E3A8A] leading-[1.7] whitespace-pre-wrap">
                                            {fb.text}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* 새 답변 작성 칸 (피드백 받고 답변 안 한 상태일 때만) */}
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
                                        onChange={(e) =>
                                          setTempSection(e.target.value)
                                        }
                                        rows={6}
                                        placeholder={
                                          nextRound === 1
                                            ? "1차 자소서를 작성해주세요..."
                                            : `${nextRound}차로 자소서를 수정해주세요...`
                                        }
                                        className="w-full border border-brand-middle rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:ring-2 focus:ring-brand-middle/10 transition-all mb-2 placeholder:text-ink-muted"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => {
                                            setEditingSection(null);
                                            setTempSection("");
                                          }}
                                          disabled={updateEssay.isPending}
                                          className="flex-1 h-[34px] bg-white text-ink-secondary border border-line rounded-md text-[12px] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                                        >
                                          취소
                                        </button>
                                        <button
                                          onClick={() => saveSectionEdit(s.key)}
                                          disabled={
                                            updateEssay.isPending ||
                                            !tempSection.trim()
                                          }
                                          className="flex-[2] h-[34px] bg-brand-middle hover:bg-brand-middle-hover text-white rounded-md text-[12px] font-semibold transition-all hover:-translate-y-px hover:shadow-btn-middle disabled:opacity-50"
                                        >
                                          {updateEssay.isPending
                                            ? "저장 중..."
                                            : nextRound === 1
                                              ? "1차 저장"
                                              : `${nextRound}차 저장`}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setEditingSection(s.key);
                                        setTempSection("");
                                      }}
                                      className="w-full h-10 bg-brand-middle-pale hover:bg-brand-middle-bg border border-brand-middle-light rounded-md text-[12px] font-semibold text-brand-middle-dark transition-all"
                                    >
                                      ✏️{" "}
                                      {nextRound === 1
                                        ? "1차 자소서 작성하기"
                                        : `${nextRound}차 자소서 수정하기`}
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* 피드백 대기 중 */}
                              {!canWriteNextAnswer &&
                                lastAnswerRound > lastFeedbackRound && (
                                  <div className="bg-gray-50 border border-line rounded-md px-4 py-2.5 mt-2">
                                    <div className="text-[11px] text-ink-muted text-center">
                                      💬 선생님 피드백을 기다리는 중이에요...
                                    </div>
                                  </div>
                                )}

                              {/* 답변 없음 */}
                              {!canWriteNextAnswer &&
                                answers.length === 0 &&
                                lastFeedbackRound === 0 && (
                                  <div className="bg-gray-50 border border-line rounded-md px-4 py-2.5 mt-2">
                                    <div className="text-[11px] text-ink-muted text-center">
                                      {currentContent
                                        ? "답변 작성됨 (이전 버전)"
                                        : "답변 없음"}
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

          {/* 예상질문 탭 오른쪽 */}
          {activeTab === "questions" && (
            <>
              {!selQ ? (
                <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
                  <div className="text-4xl">💬</div>
                  <div className="text-[14px] font-semibold text-ink-secondary">
                    질문을 선택해주세요
                  </div>
                  <div className="text-[12px]">
                    왼쪽에서 질문을 클릭하면 답변을 작성할 수 있어요
                  </div>
                </div>
              ) : (
                <>
                  <div className="px-4 py-3.5 border-b border-line flex-shrink-0">
                    <div className="flex items-center justify-between mb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-[13px] font-semibold text-ink">
                            질문{" "}
                            {questions.findIndex((q) => q.id === selQ.id) + 1}
                          </div>
                          <span className="text-[11px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full">
                            {selSchoolFilter}
                          </span>
                        </div>
                        {selQ.tag && (
                          <div className="text-[11px] text-ink-muted mt-0.5">
                            {selQ.tag}
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                          selQ.answer
                            ? "bg-brand-middle-bg text-brand-middle-dark border-brand-middle-light"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {selQ.answer ? "답변완료" : "미답변"}
                      </span>
                    </div>

                    {/* 5단계 */}
                    <div className="flex">
                      {STEP_LABELS.map((label, i) => {
                        const step = getStep(selQ, selQFeedback);
                        const stepNum = i + 1;
                        const isDone = stepNum < step;
                        const isOn = stepNum === step;
                        return (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-1 relative"
                          >
                            {i < 4 && (
                              <div
                                className={`absolute top-[11px] left-[55%] w-[90%] h-px ${isDone ? "bg-brand-middle" : "bg-line"}`}
                              />
                            )}
                            <div
                              className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-semibold z-10 relative ${
                                isDone || isOn
                                  ? "bg-brand-middle text-white border border-brand-middle"
                                  : "bg-gray-100 text-ink-muted border border-line"
                              }`}
                            >
                              {isDone ? "✓" : stepNum}
                            </div>
                            <div
                              className={`text-[10px] whitespace-nowrap ${
                                isDone || isOn
                                  ? "text-brand-middle-dark font-semibold"
                                  : "text-ink-muted font-medium"
                              }`}
                            >
                              {label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-3.5 flex flex-col gap-3">
                    <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                      <div className="text-[10px] font-semibold text-ink-muted mb-1">
                        예상 질문
                      </div>
                      <div className="text-[14px] font-semibold text-ink leading-[1.6]">
                        {selQ.text}
                      </div>
                    </div>

                    {selQ.purpose && selQ.purpose.length > 0 && (
                      <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-4 py-3">
                        <div className="text-[11px] font-bold text-brand-middle-dark mb-1.5">
                          💡 질문 의도
                        </div>
                        <ul className="pl-4">
                          {selQ.purpose.map((p: string, i: number) => (
                            <li
                              key={i}
                              className="text-[12px] text-[#065F46] leading-[1.7] list-disc"
                            >
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Step 1 */}
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-bold text-white bg-ink-muted px-2 py-0.5 rounded-full">
                          Step 1
                        </span>
                        <span className="text-[11px] text-ink-secondary font-medium">
                          내 첫 답변
                        </span>
                      </div>
                      {selQ.answer && !editingStep1 ? (
                        <div>
                          <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] mb-2 whitespace-pre-wrap">
                            {selQ.answer}
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => {
                                setEditingStep1(true);
                                setMyAnswer(selQ.answer || "");
                              }}
                              className="text-[11px] font-medium text-ink-secondary bg-white border border-line rounded-md px-2.5 py-1 hover:border-brand-middle-light hover:text-brand-middle-dark transition-all"
                            >
                              ✏️ 수정
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {isRecording1 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                              <span className="text-[12px] text-red-600 font-semibold">
                                녹음 중...
                              </span>
                            </div>
                          )}
                          <textarea
                            value={myAnswer}
                            onChange={(e) => setMyAnswer(e.target.value)}
                            placeholder="답변을 작성하거나 마이크로 녹음해주세요..."
                            rows={4}
                            className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                          />
                          <div className="flex gap-2 mt-2 justify-end">
                            {editingStep1 && (
                              <button
                                onClick={() => {
                                  setEditingStep1(false);
                                  setMyAnswer("");
                                }}
                                className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-medium hover:bg-gray-50 transition-colors"
                              >
                                취소
                              </button>
                            )}
                            <MicBtn
                              recording={isRecording1}
                              onClick={() => setIsRecording1(!isRecording1)}
                            />
                            <SubmitBtn
                              label={
                                submitAnswer.isPending
                                  ? "제출 중..."
                                  : editingStep1
                                    ? "수정 완료"
                                    : "답변 제출"
                              }
                              onClick={handleSubmitAnswer}
                              disabled={
                                !myAnswer.trim() || submitAnswer.isPending
                              }
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Step 2 */}
                    {selQ.answer && (
                      <div className="bg-white border border-line rounded-xl px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">
                            Step 2
                          </span>
                          <span className="text-[11px] text-ink-secondary font-medium">
                            선생님 1차 피드백
                          </span>
                        </div>
                        {selQFeedback?.teacher_first_feedback ? (
                          <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 text-[13px] text-[#065F46] leading-[1.8] whitespace-pre-wrap">
                            {selQFeedback.teacher_first_feedback}
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">
                            선생님 피드백을 기다리는 중이에요.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 3 */}
                    {selQFeedback?.teacher_first_feedback && (
                      <div className="bg-white border border-line rounded-xl px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-bold text-white bg-ink-muted px-2 py-0.5 rounded-full">
                            Step 3
                          </span>
                          <span className="text-[11px] text-ink-secondary font-medium">
                            업그레이드 답변
                          </span>
                        </div>
                        {selQ.upgraded_answer && !editingStep3 ? (
                          <div>
                            <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] mb-2 whitespace-pre-wrap">
                              {selQ.upgraded_answer}
                            </div>
                            <div className="flex justify-end">
                              <button
                                onClick={() => {
                                  setEditingStep3(true);
                                  setUpgradedAnswer(selQ.upgraded_answer || "");
                                }}
                                className="text-[11px] font-medium text-ink-secondary bg-white border border-line rounded-md px-2.5 py-1 hover:border-brand-middle-light hover:text-brand-middle-dark transition-all"
                              >
                                ✏️ 수정
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[12px] text-amber-700 font-medium mb-2">
                              💡 선생님 피드백을 반영해서 답변을
                              업그레이드해보세요!
                            </div>
                            {isRecording3 && (
                              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[12px] text-red-600 font-semibold">
                                  녹음 중...
                                </span>
                              </div>
                            )}
                            <textarea
                              value={upgradedAnswer}
                              onChange={(e) =>
                                setUpgradedAnswer(e.target.value)
                              }
                              placeholder="피드백을 반영한 업그레이드 답변을 작성해주세요..."
                              rows={4}
                              className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                            />
                            <div className="flex gap-2 mt-2 justify-end">
                              {editingStep3 && (
                                <button
                                  onClick={() => {
                                    setEditingStep3(false);
                                    setUpgradedAnswer("");
                                  }}
                                  className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-medium hover:bg-gray-50 transition-colors"
                                >
                                  취소
                                </button>
                              )}
                              <MicBtn
                                recording={isRecording3}
                                onClick={() => setIsRecording3(!isRecording3)}
                              />
                              <SubmitBtn
                                label={
                                  submitUpgrade.isPending
                                    ? "제출 중..."
                                    : editingStep3
                                      ? "수정 완료"
                                      : "업그레이드 제출"
                                }
                                onClick={handleSubmitUpgrade}
                                disabled={
                                  !upgradedAnswer.trim() ||
                                  submitUpgrade.isPending
                                }
                              />
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Step 4 */}
                    {selQ.upgraded_answer && (
                      <div className="bg-white border border-line rounded-xl px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">
                            Step 4
                          </span>
                          <span className="text-[11px] text-ink-secondary font-medium">
                            선생님 최종 피드백
                          </span>
                        </div>
                        {selQFeedback?.teacher_final_feedback ? (
                          <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 text-[13px] text-[#065F46] leading-[1.8] whitespace-pre-wrap">
                            {selQFeedback.teacher_final_feedback}
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">
                            선생님 최종 피드백을 기다리는 중이에요.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 5 꼬리질문 */}
                    {selQFeedback?.tail_questions &&
                      selQFeedback.tail_questions.length > 0 && (
                        <div className="bg-white border border-line rounded-xl px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">
                              Step 5
                            </span>
                            <span className="text-[11px] text-ink-secondary font-medium">
                              꼬리질문
                            </span>
                          </div>
                          {selQFeedback.tail_questions.map(
                            (t: any, i: number) => (
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
                                  <>
                                    {tailRecordings[i] && (
                                      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-1.5 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        <span className="text-[12px] text-red-600 font-semibold">
                                          녹음 중...
                                        </span>
                                      </div>
                                    )}
                                    <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                                      <div className="text-[10px] text-ink-muted mb-1.5">
                                        꼬리질문 답변
                                      </div>
                                      <textarea
                                        value={tailAnswers[i] || ""}
                                        onChange={(e) =>
                                          setTailAnswers((prev) => ({
                                            ...prev,
                                            [i]: e.target.value,
                                          }))
                                        }
                                        placeholder="꼬리질문에 대한 답변을 작성해주세요..."
                                        rows={2}
                                        className="w-full border border-line rounded-md px-2.5 py-2 text-[12px] leading-[1.6] resize-none bg-white focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                                      />
                                      <div className="flex gap-2 mt-2 justify-end">
                                        <MicBtn
                                          recording={tailRecordings[i]}
                                          onClick={() =>
                                            setTailRecordings((prev) => ({
                                              ...prev,
                                              [i]: !prev[i],
                                            }))
                                          }
                                        />
                                        <button
                                          onClick={() =>
                                            handleSubmitTailAnswer(i)
                                          }
                                          disabled={
                                            !(tailAnswers[i] || "").trim() ||
                                            submitTailAnswer.isPending
                                          }
                                          className={`w-[102px] h-[34px] rounded-md text-[12px] font-semibold transition-all ${
                                            (tailAnswers[i] || "").trim() &&
                                            !submitTailAnswer.isPending
                                              ? "bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle"
                                              : "bg-gray-100 text-ink-muted cursor-not-allowed"
                                          }`}
                                        >
                                          {submitTailAnswer.isPending
                                            ? "제출 중..."
                                            : "제출"}
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            ),
                          )}
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
          onClick={() => {
            setShowAddEssay(false);
            setNewSchool("");
            setCustomSchool("");
          }}
          className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[460px] shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="text-[18px] font-bold text-ink tracking-tight">
                지원 학교 추가
              </div>
              <button
                onClick={() => {
                  setShowAddEssay(false);
                  setNewSchool("");
                  setCustomSchool("");
                }}
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
                  className={`px-3 py-1 rounded-full text-[12px] border-[1.5px] transition-all ${
                    newSchool === s
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

            <button
              onClick={handleAddSchool}
              disabled={
                !newSchool ||
                (newSchool === "직접입력" && !customSchool) ||
                addEssay.isPending
              }
              className={`w-full h-11 rounded-lg text-[14px] font-semibold transition-all ${
                newSchool &&
                (newSchool !== "직접입력" || customSchool) &&
                !addEssay.isPending
                  ? "bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle"
                  : "bg-gray-100 text-ink-muted cursor-not-allowed"
              }`}
            >
              {addEssay.isPending ? "추가 중..." : "추가하기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
