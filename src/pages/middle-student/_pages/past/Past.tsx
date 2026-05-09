import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { studentState, academyState } from "@/lib/auth/atoms";
import {
  useAllSchools,
  useSchoolQuestions,
  useMyPastAnswers,
  usePastFeedback,
  useSubmitPastAnswer,
  useSubmitPastUpgrade,
  useSubmitPastTailAnswer,
  // ⭐ 지원 학교 hooks
  useMyTargetSchools,
  useAddTargetSchool,
  useHideTargetSchool,
} from "@/pages/middle-student/_hooks/useMyPast";

const MAX_TARGETS = 6; // 최대 지원 학교 수

const TYPE_COLOR: Record<string, string> = {
  지원동기: "bg-[#EEF2FF] text-[#3B5BDB] border-[#BAC8FF]",
  자기주도:
    "bg-brand-middle-bg text-brand-middle-dark border-brand-middle-light",
  활동계획: "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
  인성: "bg-amber-50 text-amber-700 border-amber-200",
  진로: "bg-brand-middle-pale text-brand-middle-dark border-brand-middle-light",
  전공: "bg-brand-middle-bg text-brand-middle-dark border-brand-middle-light",
  활동: "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
  자기소개: "bg-orange-50 text-orange-700 border-orange-200",
};

const STEP_LABELS = [
  "첫 답변",
  "1차 피드백",
  "업그레이드",
  "최종 피드백",
  "꼬리질문",
];

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

export default function MiddlePast() {
  const student = useAtomValue(studentState);
  const academy = useAtomValue(academyState);
  const studentId = student?.id ? String(student.id) : undefined;

  // ⭐ DB 훅
  const { data: allSchools = [] } = useAllSchools();
  const { data: myTargetSchools = [] } = useMyTargetSchools(studentId);
  const addTargetSchool = useAddTargetSchool();
  const hideTargetSchool = useHideTargetSchool();

  // 학교 선택 상태
  const [selSchool, setSelSchool] = useState("");

  // ⭐ 첫 진입시 자동으로 첫 학교 선택
  useEffect(() => {
    if (!selSchool && myTargetSchools.length > 0) {
      setSelSchool(myTargetSchools[0].school);
    }
  }, [myTargetSchools, selSchool]);

  // 학교 추가 폼
  const [showAddForm, setShowAddForm] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolDropOpen, setSchoolDropOpen] = useState(false);

  // 선택한 학교의 질문/답변
  const { data: questions = [] } = useSchoolQuestions(selSchool || undefined);
  const { data: answers = [] } = useMyPastAnswers(
    studentId,
    selSchool || undefined,
  );

  // 답변 매핑: question_id → answer
  const answerByQuestionId = answers.reduce((acc: Record<string, any>, a) => {
    acc[a.question_id] = a;
    return acc;
  }, {});

  // 선택한 질문
  const [selQId, setSelQId] = useState<string | null>(null);
  const selQ = questions.find((q) => q.id === selQId) ?? null;
  const selAnswer = selQ ? answerByQuestionId[selQ.id] : null;

  // 선택한 답변의 피드백
  const { data: selFeedback } = usePastFeedback(selAnswer?.id);

  // 입력 state
  const [myAnswer, setMyAnswer] = useState("");
  const [upgradedAnswer, setUpgradedAnswer] = useState("");
  const [isRecording1, setIsRecording1] = useState(false);
  const [isRecording3, setIsRecording3] = useState(false);
  const [tailRecordings, setTailRecordings] = useState<Record<number, boolean>>(
    {},
  );
  const [tailAnswers, setTailAnswers] = useState<Record<number, string>>({});
  const [editingStep1, setEditingStep1] = useState(false);
  const [editingStep3, setEditingStep3] = useState(false);

  // 질문 바뀌면 초기화
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
  const submitAnswer = useSubmitPastAnswer();
  const submitUpgrade = useSubmitPastUpgrade();
  const submitTailAnswer = useSubmitPastTailAnswer();

  // 등록되지 않은 학교만 검색에 노출 (이미 추가한 거 빼기)
  const myTargetSchoolNames = myTargetSchools.map((t) => t.school);
  const filteredSchools = allSchools.filter(
    (s) =>
      s.includes(schoolSearch) && !myTargetSchoolNames.includes(s),
  );

  const getStep = (answer: any, fb: any) => {
    if (!answer?.answer) return 0;
    if (!fb?.teacher_first_feedback) return 1;
    if (!answer.upgraded_answer) return 2;
    if (!fb?.teacher_final_feedback) return 3;
    return 4;
  };

  // 답변 횟수 계산
  const answeredCount = questions.filter(
    (q) => answerByQuestionId[q.id]?.answer,
  ).length;

  // ⭐ 학교 추가
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

  // ⭐ 학교 숨김 처리
  const handleHideSchool = async (school: string) => {
    if (!student?.id) return;
    if (
      !confirm(
        `"${school}"을(를) 목록에서 숨길까요?\n\n⚠️ 답변/피드백 데이터는 모두 유지돼요.\n원장님이 언제든 다시 복구할 수 있어요.`,
      )
    )
      return;
    try {
      await hideTargetSchool.mutateAsync({
        student_id: String(student.id),
        school,
      });
      // 현재 보고있는 학교를 숨겼으면 다른 학교로
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

  // Step 1 제출
  const handleSubmitAnswer = async () => {
    if (!myAnswer.trim() || !selQ) return;
    if (!student?.id || !academy?.academyId) {
      alert("로그인 정보를 불러오지 못했어요.");
      return;
    }
    try {
      await submitAnswer.mutateAsync({
        question_id: selQ.id,
        student_id: String(student.id),
        academy_id: String(academy.academyId),
        answer: myAnswer,
      });
      setMyAnswer("");
      setIsRecording1(false);
      setEditingStep1(false);
    } catch (e: any) {
      alert(`제출 실패: ${e.message}`);
    }
  };

  // Step 3 업그레이드 제출
  const handleSubmitUpgrade = async () => {
    if (!upgradedAnswer.trim() || !selAnswer) return;
    try {
      await submitUpgrade.mutateAsync({
        answer_id: selAnswer.id,
        upgraded_answer: upgradedAnswer,
      });
      setUpgradedAnswer("");
      setIsRecording3(false);
      setEditingStep3(false);
    } catch (e: any) {
      alert(`제출 실패: ${e.message}`);
    }
  };

  // Step 5 꼬리답변 제출
  const handleSubmitTailAnswer = async (idx: number) => {
    const text = tailAnswers[idx] || "";
    if (!text.trim() || !selAnswer) return;
    try {
      await submitTailAnswer.mutateAsync({
        answer_id: selAnswer.id,
        tail_index: idx,
        answer: text,
      });
      setTailAnswers((prev) => ({ ...prev, [idx]: "" }));
    } catch (e: any) {
      alert(`제출 실패: ${e.message}`);
    }
  };

  const canAddMore = myTargetSchools.length < MAX_TARGETS;

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-50px)] overflow-hidden px-6 py-5 font-sans text-ink">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[18px] font-extrabold text-ink tracking-tight">
            기출문제
          </div>
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

      {/* ⭐ 지원 학교 칩들 + 추가 버튼 */}
      <div className="flex flex-col gap-2 flex-shrink-0">
        <div className="flex gap-1.5 items-center flex-wrap">
          <span className="text-[11px] text-ink-muted font-semibold mr-1">
            내 지원 학교 ({myTargetSchools.length}/{MAX_TARGETS}):
          </span>

          {/* 학교 칩들 */}
          {myTargetSchools.map((t) => {
            const isSelected = selSchool === t.school;
            return (
              <div
                key={t.id}
                className={`inline-flex items-center gap-1 rounded-full border transition-all ${
                  isSelected
                    ? "bg-brand-middle border-brand-middle"
                    : "bg-white border-line hover:border-brand-middle-light"
                }`}
              >
                <button
                  onClick={() => {
                    setSelSchool(t.school);
                    setSelQId(null);
                  }}
                  className={`px-3 py-1.5 text-[11px] ${
                    isSelected
                      ? "text-white font-bold"
                      : "text-brand-middle-dark font-semibold hover:text-brand-middle"
                  }`}
                >
                  🏫 {t.school}
                </button>
                <button
                  onClick={() => handleHideSchool(t.school)}
                  className={`pr-2.5 text-[11px] leading-none ${
                    isSelected
                      ? "text-white/70 hover:text-white"
                      : "text-red-400 hover:text-red-600"
                  }`}
                  title="목록에서 숨김"
                >
                  ✕
                </button>
              </div>
            );
          })}

          {/* + 학교 추가 버튼 */}
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

        {/* 학교 추가 폼 */}
        {showAddForm && (
          <div className="flex gap-2 items-center flex-wrap bg-brand-middle-pale border border-brand-middle-light rounded-xl px-3 py-2.5">
            <span className="text-[11px] font-bold text-brand-middle-dark">
              새 지원 학교:
            </span>

            <div className="relative w-[260px]">
              <div
                onClick={() => setSchoolDropOpen(true)}
                className={`flex items-center gap-2 border rounded-lg px-3 bg-white cursor-text h-9 transition-all ${
                  schoolDropOpen
                    ? "border-brand-middle ring-2 ring-brand-middle/10"
                    : "border-line"
                }`}
              >
                <span className="text-[14px] flex-shrink-0">🏫</span>
                <input
                  value={schoolSearch}
                  onChange={(e) => {
                    setSchoolSearch(e.target.value);
                    setSchoolDropOpen(true);
                  }}
                  onFocus={() => setSchoolDropOpen(true)}
                  placeholder="학교 검색 (예: 인천하늘고, 민사고...)"
                  className="flex-1 border-none outline-none text-[12px] bg-transparent text-ink min-w-0 placeholder:text-ink-muted"
                  autoFocus
                />
                <span className="text-[10px] text-ink-muted">▼</span>
              </div>

              {schoolDropOpen && (
                <>
                  <div
                    onClick={() => setSchoolDropOpen(false)}
                    className="fixed inset-0 z-10"
                  />
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
                            i < filteredSchools.length - 1
                              ? "border-b border-line-light"
                              : ""
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
              onClick={() => {
                setShowAddForm(false);
                setSchoolSearch("");
                setSchoolDropOpen(false);
              }}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white text-ink-secondary border border-line hover:bg-gray-50 transition-all"
            >
              취소
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">
        {/* 왼쪽: 질문 목록 */}
        <div className="w-[360px] flex-shrink-0 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="px-3.5 py-3 border-b border-line flex-shrink-0">
            {selSchool ? (
              <>
                <div className="text-[14px] font-bold text-ink tracking-tight">
                  {selSchool}
                </div>
                <div className="text-[11px] text-ink-secondary mt-1">
                  총{" "}
                  <span className="text-brand-middle-dark font-bold">
                    {questions.length}개
                  </span>{" "}
                  · 답변완료{" "}
                  <span className="text-brand-middle-dark font-bold">
                    {answeredCount}개
                  </span>
                </div>
              </>
            ) : (
              <div className="text-[12px] text-ink-muted">
                학교를 선택해주세요
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2.5">
            {!selSchool ? (
              <div className="text-center py-10 text-ink-muted text-[12px]">
                <div className="text-3xl mb-2">🏫</div>
                {myTargetSchools.length === 0
                  ? "+ 학교 추가 버튼을 눌러주세요"
                  : "위에서 학교를 선택해주세요"}
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
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeClass}`}
                      >
                        {q.type}
                      </span>
                    </div>
                    <div className="text-[12px] text-ink leading-relaxed font-semibold mb-1.5">
                      {q.text}
                    </div>
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
        <div className="flex-1 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          {!selQ ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
              <div className="text-4xl">🎓</div>
              <div className="text-[14px] font-semibold text-ink-secondary">
                질문을 선택해주세요
              </div>
              <div className="text-[12px]">
                왼쪽에서 기출문제를 클릭하면 답변을 작성할 수 있어요
              </div>
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
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLOR[selQ.type] || TYPE_COLOR["지원동기"]}`}
                    >
                      {selQ.type}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                      selAnswer?.answer
                        ? "bg-brand-middle-bg text-brand-middle-dark border-brand-middle-light"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {selAnswer?.answer ? "답변완료" : "미답변"}
                  </span>
                </div>

                {/* 5단계 */}
                <div className="flex">
                  {STEP_LABELS.map((label, i) => {
                    const step = getStep(selAnswer, selFeedback);
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
                {/* 질문 */}
                <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                  <div className="text-[10px] font-semibold text-ink-muted mb-1">
                    기출 질문
                  </div>
                  <div className="text-[14px] font-semibold text-ink leading-[1.6]">
                    {selQ.text}
                  </div>
                </div>

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
                  {selAnswer?.answer && !editingStep1 ? (
                    <div>
                      <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] mb-2 whitespace-pre-wrap">
                        {selAnswer.answer}
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setEditingStep1(true);
                            setMyAnswer(selAnswer.answer || "");
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
                          disabled={!myAnswer.trim() || submitAnswer.isPending}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Step 2 */}
                {selAnswer?.answer && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">
                        Step 2
                      </span>
                      <span className="text-[11px] text-ink-secondary font-medium">
                        선생님 1차 피드백
                      </span>
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
                      <span className="text-[10px] font-bold text-white bg-ink-muted px-2 py-0.5 rounded-full">
                        Step 3
                      </span>
                      <span className="text-[11px] text-ink-secondary font-medium">
                        업그레이드 답변
                      </span>
                    </div>
                    {selAnswer?.upgraded_answer && !editingStep3 ? (
                      <div>
                        <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] mb-2 whitespace-pre-wrap">
                          {selAnswer.upgraded_answer}
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              setEditingStep3(true);
                              setUpgradedAnswer(
                                selAnswer.upgraded_answer || "",
                              );
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
                          💡 선생님 피드백을 반영해서 답변을 업그레이드해보세요!
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
                          onChange={(e) => setUpgradedAnswer(e.target.value)}
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
                              !upgradedAnswer.trim() || submitUpgrade.isPending
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Step 4 */}
                {selAnswer?.upgraded_answer && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">
                        Step 4
                      </span>
                      <span className="text-[11px] text-ink-secondary font-medium">
                        선생님 최종 피드백
                      </span>
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
                {selFeedback?.tail_questions &&
                  selFeedback.tail_questions.length > 0 && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">
                          Step 5
                        </span>
                        <span className="text-[11px] text-ink-secondary font-medium">
                          꼬리질문
                        </span>
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
                                    onClick={() => handleSubmitTailAnswer(i)}
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