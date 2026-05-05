import { useState, useEffect } from "react";
import {
  useStudentEssays,
  useStudentEssayFeedback,
  useStudentEssayAnswers,
  useAddSectionFeedback,
  useUpdateSectionFeedback,
  useDeleteSectionFeedback,
  useGenerateQuestions,
  useStudentQuestions,
  useStudentQuestionFeedback,
  useSaveFirstFeedback,
  useSaveFinalFeedback,
  useUpdateTailQuestions,
  useApproveDeleteEssay,
  useRejectDeleteRequest,
} from "@/pages/admin/_hooks/middle/useStudentExpect";

const THEME = {
  accent: "#059669",
  accentDark: "#065F46",
  accentBg: "#ECFDF5",
  accentBorder: "#6EE7B7",
  accentShadow: "rgba(16, 185, 129, 0.15)",
  gradient: "linear-gradient(135deg, #065F46, #10B981)",
};

const STEP_LABELS = [
  "첫 답변",
  "1차 피드백",
  "업그레이드",
  "최종 피드백",
  "꼬리질문",
];

const SECTIONS = [
  { key: "selfStudy", label: "📚 자기주도학습 과정" },
  { key: "reason", label: "🏫 지원동기 (건학이념 연계)" },
  { key: "activity", label: "🎯 꿈과 끼를 살리기 위한 활동계획" },
  { key: "career", label: "🚀 진로계획" },
  { key: "character", label: "🤝 인성" },
];

const AI_TAIL_SUGGESTIONS = [
  "그 경험에서 가장 어려웠던 점은 무엇이었나요?",
  "만약 다시 같은 상황이 온다면 어떻게 다르게 행동하시겠어요?",
  "이 활동이 본인의 진로 선택에 어떤 영향을 미쳤나요?",
];

// 자소서 섹션별 AI 선생님 말투 피드백 (mock)
// 선생님 말투로 자동 작성 (mock)
const AI_TEACHER_FEEDBACK: Record<string, string> = {
  selfStudy:
    "○○이의 자기주도학습 과정을 잘 읽었어요. 매일 꾸준히 학습 습관을 만들어온 점이 정말 인상 깊네요. 한 가지만 보완해보면 좋겠어요. 본인이 가장 어려워했던 과목이 있다면 그것을 어떻게 스스로 극복했는지 구체적인 사례를 하나 더 추가해보세요. 예를 들어 어떤 단원에서 막혔을 때 어떤 방법으로 해결했는지 적으면 자기주도학습 능력이 더 잘 드러날 거예요. 화이팅! 💪",
  reason:
    '지원동기가 진정성 있게 잘 작성됐어요. 학교에 대한 이해도도 잘 보이네요. 한 가지 보완할 점은 학교의 건학이념과 본인 가치관의 연결고리를 한 문장 더 추가해보는 거예요. "이 학교의 ○○ 정신이 제가 추구하는 ○○과 맞닿아 있다"처럼 본인의 경험과 연결해서 써보면 더 강력해져요. 학교 홈페이지 정보 인용보다 본인 이야기로 풀어내는 게 차별화 포인트입니다!',
  activity:
    "활동 계획이 구체적이어서 좋아요! 입학 후 무엇을 하고 싶은지 잘 보입니다. 한 가지 더 보완해보면 본인이 왜 그 활동을 하고 싶은지 동기를 추가해보세요. 또 1학년/2학년/3학년 시기별로 단계적 계획으로 나눠서 보여주면 훨씬 체계적으로 보여요. 활동을 통해 얻고 싶은 구체적인 역량까지 함께 적으면 완성도가 올라갈 거예요.",
  career:
    '진로 비전이 명확해서 좋아요! 꿈이 잘 드러납니다. 한 가지 보완할 점은 "왜 이 진로를 선택했는지" 본인의 경험이나 계기를 추가해보세요. 그리고 그 진로를 위해 지금부터 어떤 노력을 할 계획인지, 고등학교-대학-직업까지 단계별 중간 목표를 함께 보여주면 진정성이 훨씬 높아질 거예요. ○○이의 꿈을 응원합니다!',
  character:
    "인성 사례가 구체적이어서 좋아요. 리더십 경험이 잘 드러납니다. 한 가지만 더 보완해보면, 그 경험을 통해 본인이 어떻게 변화하고 성장했는지 추가해보세요. 그리고 결과만 언급하지 말고 과정에서의 갈등이나 어려움도 솔직하게 보여주면 더 인상 깊어요. 한 가지 구체적 일화를 깊게 풀어쓰는 게 여러 일화를 나열하는 것보다 효과적이에요!",
};

// AI 답변 분석 (mock)
const AI_ESSAY_ANALYSIS: Record<
  string,
  { strengths: string[]; improvements: string[]; recommendations: string[] }
> = {
  selfStudy: {
    strengths: [
      "구체적인 학습 방법(독서 30분, 복습 노트)이 명확하게 드러남",
      "꾸준함과 습관 형성에 대한 의지가 잘 보임",
      "자기주도성을 보여주는 구체적 행동이 포함됨",
    ],
    improvements: [
      "학습 결과(성적 향상, 깨달음)가 빠져있음",
      "어려움을 극복한 사례가 부족함",
      "왜 그런 학습 방법을 선택했는지 동기가 없음",
    ],
    recommendations: [
      "가장 어려웠던 과목 구체 사례 추가",
      "학습을 통해 얻은 성장이나 변화 명시",
      "자기주도학습이 진로와 어떻게 연결되는지 언급",
    ],
  },
  reason: {
    strengths: [
      "학교에 대한 관심과 이해도가 보임",
      "지원 의지가 진정성 있게 표현됨",
    ],
    improvements: [
      "학교 건학이념과의 연결이 약함",
      "본인의 경험과 학교의 연결점이 부족",
      "왜 다른 학교가 아닌 이 학교인지 차별화 포인트 부족",
    ],
    recommendations: [
      "건학이념과 본인 가치관 1:1 매칭",
      "본인 경험에서 학교를 알게 된 계기 추가",
      '"이 학교에서만 가능한 것"을 구체적으로 언급',
    ],
  },
  activity: {
    strengths: ["입학 후 계획이 구체적임", "활동에 대한 열정이 느껴짐"],
    improvements: [
      "왜 그 활동을 하고 싶은지 동기 부족",
      "시기별 단계적 계획 부재",
      "활동을 통한 성장 목표 불명확",
    ],
    recommendations: [
      "1/2/3학년 시기별 계획으로 구분",
      "활동 동기 + 기대 역량 추가",
      "진로와 활동의 연관성 강조",
    ],
  },
  career: {
    strengths: ["진로 목표가 명확함", "비전이 잘 드러남"],
    improvements: [
      "진로 선택 계기/경험 부족",
      "진로 실현 계획 구체성 부족",
      "단계별 중간 목표 부재",
    ],
    recommendations: [
      "진로 선택 계기가 된 경험 추가",
      "고등학교-대학-직업 단계별 로드맵",
      "진로를 위한 현재 노력 구체화",
    ],
  },
  character: {
    strengths: ["구체적인 인성 사례 포함", "리더십/배려 경험이 명확함"],
    improvements: [
      "경험을 통한 변화/성장 부족",
      "과정에서의 갈등/어려움 부재",
      "여러 사례 나열로 깊이 부족",
    ],
    recommendations: [
      "한 가지 일화를 깊이 있게 풀어쓰기",
      "그 경험으로 본인이 어떻게 변했는지 명시",
      "갈등 상황과 해결 과정 솔직하게 묘사",
    ],
  },
};

export default function MiddleExpectTab({ student }: { student: any }) {
  // ⭐ DB 훅
  const studentId = student?.id ? String(student.id) : undefined;
  const { data: essays = [], isLoading } = useStudentEssays(studentId);

  const [activeTab, setActiveTab] = useState<"essay" | "questions">("essay");

  // 자소서 선택
  const [selEssayId, setSelEssayId] = useState<string | null>(null);
  const selEssay = essays.find((e) => e.id === selEssayId) ?? null;

  // 첫 자소서 자동 선택
  useEffect(() => {
    if (!selEssayId && essays.length > 0) {
      setSelEssayId(essays[0].id);
    }
  }, [essays.length, selEssayId]);

  // 자소서 섹션 피드백
  const { data: sectionFeedbacks = [] } = useStudentEssayFeedback(
    selEssayId ?? undefined,
  );

  // ⭐ 답변 이력 조회
  const { data: essayAnswers = [] } = useStudentEssayAnswers(
    selEssayId ?? undefined,
  );

  // 섹션별 답변 이력 그룹핑
  const answersBySection = essayAnswers.reduce(
    (acc: Record<string, any[]>, a) => {
      if (!acc[a.section_key]) acc[a.section_key] = [];
      acc[a.section_key].push(a);
      return acc;
    },
    {},
  );

  // 섹션별 그룹핑
  const feedbackBySection = sectionFeedbacks.reduce(
    (acc: Record<string, any[]>, fb) => {
      if (!acc[fb.section_key]) acc[fb.section_key] = [];
      acc[fb.section_key].push(fb);
      return acc;
    },
    {},
  );

  // 새 피드백 입력
  const [newSectionFbs, setNewSectionFbs] = useState<Record<string, string>>(
    {},
  );
  const [editingSection, setEditingSection] = useState<{
    key: string;
    id: string;
  } | null>(null);
  const [editingText, setEditingText] = useState("");

  // 섹션 피드백 훅
  const addSectionFb = useAddSectionFeedback();
  const updateSectionFb = useUpdateSectionFeedback();
  const deleteSectionFb = useDeleteSectionFeedback();
  const generateQuestions = useGenerateQuestions();

  // 예상질문 탭
  const [selSchoolFilter, setSelSchoolFilter] = useState<string>("");
  const [selQId, setSelQId] = useState<string | null>(null);

  // 학교 필터에 해당하는 자소서 찾기
  const filterEssay = essays.find((e) => e.school === selSchoolFilter);
  const { data: questions = [] } = useStudentQuestions(filterEssay?.id);

  // 첫 학교 자동 선택
  useEffect(() => {
    if (!selSchoolFilter) {
      const generated = essays.find((e) => e.questions_generated);
      if (generated) {
        setSelSchoolFilter(generated.school);
      }
    }
  }, [essays, selSchoolFilter]);

  // 선택 질문
  const selQ = questions.find((q) => q.id === selQId) ?? null;
  const { data: selQFeedback } = useStudentQuestionFeedback(
    selQId ?? undefined,
  );

  // 피드백 텍스트 입력
  const [teacherFbText, setTeacherFbText] = useState("");
  const [finalFbText, setFinalFbText] = useState("");

  // 질문 바뀌면 텍스트 초기화
  useEffect(() => {
    setTeacherFbText(selQFeedback?.teacher_first_feedback || "");
    setFinalFbText(selQFeedback?.teacher_final_feedback || "");
  }, [
    selQId,
    selQFeedback?.teacher_first_feedback,
    selQFeedback?.teacher_final_feedback,
  ]);

  // 꼬리질문 입력
  const [showAiTailModal, setShowAiTailModal] = useState(false);
  const [aiTailLoading, setAiTailLoading] = useState(false);
  const [newTailText, setNewTailText] = useState("");

  // AI 선생님 말투 자동 작성 - 섹션별 로딩 상태
  const [aiWritingSection, setAiWritingSection] = useState<string | null>(null);

  // AI 분석 사이드 패널
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPanelSection, setAiPanelSection] = useState<string>("");

  // 질문 피드백 훅
  const saveFirstFb = useSaveFirstFeedback();
  const saveFinalFb = useSaveFinalFeedback();
  const updateTails = useUpdateTailQuestions();

  // 삭제 승인/거부 훅
  const approveDelete = useApproveDeleteEssay();
  const rejectDelete = useRejectDeleteRequest();

  // 삭제 승인
  const handleApproveDelete = async () => {
    if (!selEssay) return;
    if (
      !confirm(
        `'${selEssay.school}' 자소서를 영구 삭제할까요?\n\n자소서, 모든 답변, 피드백, 예상질문이 삭제됩니다.\n이 작업은 되돌릴 수 없어요.`,
      )
    )
      return;
    try {
      await approveDelete.mutateAsync(selEssay.id);
      setSelEssayId(null);
      alert("✅ 자소서가 삭제되었어요.");
    } catch (e: any) {
      alert(`삭제 실패: ${e.message}`);
    }
  };

  // 삭제 요청 거부
  const handleRejectDelete = async () => {
    if (!selEssay) return;
    if (!confirm("학생의 삭제 요청을 거부할까요?")) return;
    try {
      await rejectDelete.mutateAsync(selEssay.id);
      alert("✅ 삭제 요청을 거부했어요.");
    } catch (e: any) {
      alert(`거부 실패: ${e.message}`);
    }
  };

  const countChars = (content: any) =>
    Object.values(content || {})
      .join("")
      .replace(/\s/g, "").length;

  const getStep = (q: any, fb: any) => {
    if (!q?.answer) return 0;
    if (!fb?.teacher_first_feedback) return 1;
    if (!q.upgraded_answer) return 2;
    if (!fb?.teacher_final_feedback) return 3;
    return 4;
  };

  // 섹션 피드백 추가 (다회차)
  const handleAddSectionFb = async (key: string) => {
    const text = newSectionFbs[key] || "";
    if (!text.trim() || !selEssay) return;
    try {
      await addSectionFb.mutateAsync({
        essay_id: selEssay.id,
        section_key: key,
        text,
      });
      setNewSectionFbs((prev) => ({ ...prev, [key]: "" }));
    } catch (e: any) {
      alert(`피드백 저장 실패: ${e.message}`);
    }
  };

  // 섹션 피드백 수정
  const handleUpdateSectionFb = async () => {
    if (!editingText.trim() || !editingSection) return;
    try {
      await updateSectionFb.mutateAsync({
        feedback_id: editingSection.id,
        text: editingText,
      });
      setEditingSection(null);
      setEditingText("");
    } catch (e: any) {
      alert(`수정 실패: ${e.message}`);
    }
  };

  // 섹션 피드백 삭제
  const handleDeleteSectionFb = async (id: string) => {
    if (!confirm("이 피드백을 삭제할까요?")) return;
    try {
      await deleteSectionFb.mutateAsync(id);
    } catch (e: any) {
      alert(`삭제 실패: ${e.message}`);
    }
  };

  // 예상질문 생성
  const handleGenerateQuestions = async () => {
    if (!selEssay) return;
    try {
      await generateQuestions.mutateAsync({
        essay_id: selEssay.id,
        school: selEssay.school,
      });
      setSelSchoolFilter(selEssay.school);
      setActiveTab("questions");
      alert("✅ 예상질문 5개가 생성되었어요!");
    } catch (e: any) {
      alert(`질문 생성 실패: ${e.message}`);
    }
  };

  // 1차 피드백 전달
  const handleSendFirstFb = async () => {
    if (!teacherFbText.trim() || !selQ) return;
    try {
      await saveFirstFb.mutateAsync({
        question_id: selQ.id,
        teacher_first_feedback: teacherFbText,
      });
      alert("✅ 1차 피드백이 학생에게 전달되었어요!");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  // 최종 피드백 전달
  const handleSendFinalFb = async () => {
    if (!finalFbText.trim() || !selQ) return;
    try {
      await saveFinalFb.mutateAsync({
        question_id: selQ.id,
        teacher_final_feedback: finalFbText,
      });
      alert("✅ 최종 피드백이 학생에게 전달되었어요!");
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  // 꼬리질문 추가
  const handleAddTail = async (text: string) => {
    if (!text.trim() || !selQ) return;
    const currentTails = selQFeedback?.tail_questions || [];
    const newTails = [...currentTails, { text }];
    try {
      await updateTails.mutateAsync({
        question_id: selQ.id,
        tail_questions: newTails,
      });
      setNewTailText("");
    } catch (e: any) {
      alert(`추가 실패: ${e.message}`);
    }
  };

  // 꼬리질문 삭제
  const handleRemoveTail = async (idx: number) => {
    if (!selQ) return;
    const currentTails = selQFeedback?.tail_questions || [];
    const newTails = currentTails.filter((_: any, i: number) => i !== idx);
    try {
      await updateTails.mutateAsync({
        question_id: selQ.id,
        tail_questions: newTails,
      });
    } catch (e: any) {
      alert(`삭제 실패: ${e.message}`);
    }
  };

  // AI 꼬리질문 모달
  const openAiTailModal = () => {
    setShowAiTailModal(true);
    setAiTailLoading(true);
    setTimeout(() => setAiTailLoading(false), 1200);
  };

  // ✨ AI가 선생님 말투로 피드백 자동 작성 → textarea에 직접 입력
  const writeAiFeedback = (sectionKey: string) => {
    setAiWritingSection(sectionKey);
    setTimeout(() => {
      const aiText = AI_TEACHER_FEEDBACK[sectionKey] || "";
      setNewSectionFbs((prev) => ({ ...prev, [sectionKey]: aiText }));
      setAiWritingSection(null);
    }, 1000);
  };

  // ✨ AI 분석 패널 토글
  const toggleAiPanel = (sectionKey: string) => {
    if (showAiPanel && aiPanelSection === sectionKey) {
      setShowAiPanel(false);
      return;
    }
    setAiPanelSection(sectionKey);
    setShowAiPanel(true);
  };

  const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = THEME.accent;
    e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`;
  };
  const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = "#E5E7EB";
    e.target.style.boxShadow = "none";
  };

  const schoolsWithQuestions = essays
    .filter((e) => e.questions_generated)
    .map((e) => e.school);

  return (
    <div className="flex gap-4 h-full overflow-hidden">
      <div className="w-[340px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="flex border-b border-line flex-shrink-0">
          {[
            { key: "essay", label: "📄 자기소개서" },
            { key: "questions", label: "💬 예상질문" },
          ].map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className="flex-1 py-3 text-center text-[13px] font-bold transition-all border-b-2"
                style={{
                  color: isActive ? THEME.accentDark : "#9CA3AF",
                  borderColor: isActive ? THEME.accent : "transparent",
                  background: isActive ? THEME.accentBg : "transparent",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {activeTab === "essay" && (
          <>
            <div className="px-4 py-2.5 border-b border-line flex-shrink-0">
              <div className="text-[12px] font-medium text-ink-secondary">
                총{" "}
                <span
                  className="font-extrabold"
                  style={{ color: THEME.accent }}
                >
                  {essays.length}개
                </span>{" "}
                학교
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {isLoading ? (
                <div className="text-center py-10 text-ink-muted text-[12px]">
                  <div className="text-2xl mb-2">⏳</div>
                  <div className="font-medium">불러오는 중...</div>
                </div>
              ) : essays.length === 0 ? (
                <div className="text-center py-10 text-ink-muted">
                  <div className="text-3xl mb-2">📄</div>
                  <div className="text-[12px] font-medium mb-1">
                    아직 자소서가 없어요
                  </div>
                  <div className="text-[10px]">
                    학생이 자소서를 추가하면 표시돼요.
                  </div>
                </div>
              ) : (
                essays.map((e) => {
                  const isSelected = selEssayId === e.id;
                  const hasContent = !!e.content?.selfStudy;

                  return (
                    <button
                      key={e.id}
                      onClick={() => {
                        setSelEssayId(e.id);
                        setNewSectionFbs({});
                        setEditingSection(null);
                      }}
                      className="w-full rounded-xl px-3.5 py-3 mb-1.5 text-left transition-all"
                      style={{
                        border: `1px solid ${isSelected ? THEME.accent : "#E5E7EB"}`,
                        background: isSelected ? THEME.accentBg : "#fff",
                        boxShadow: isSelected
                          ? `0 2px 8px ${THEME.accentShadow}`
                          : "none",
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-base">🏫</span>
                        <div
                          className="text-[13.5px] font-extrabold tracking-tight flex-1"
                          style={{
                            color: isSelected ? THEME.accentDark : "#1a1a1a",
                          }}
                        >
                          {e.school}
                        </div>
                        {e.version > 1 && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{
                              color: THEME.accent,
                              background: THEME.accentBg,
                            }}
                          >
                            v{e.version}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-medium text-ink-muted mb-1.5">
                        📅 최근수정{" "}
                        {new Date(e.updated_at).toLocaleDateString("ko-KR")}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {hasContent ? (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              color: THEME.accentDark,
                              background: THEME.accentBg,
                              border: `1px solid ${THEME.accentBorder}60`,
                            }}
                          >
                            ✓ 작성 · {countChars(e.content)}자
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            ⏳ 미작성
                          </span>
                        )}
                        {e.questions_generated && (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                            ✨ 질문완료
                          </span>
                        )}
                        {e.delete_requested && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
                            ⚠️ 삭제 요청
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        {activeTab === "questions" && (
          <>
            <div className="px-3 py-2.5 border-b border-line flex-shrink-0">
              {schoolsWithQuestions.length === 0 ? (
                <div className="text-[11px] font-medium text-ink-muted">
                  아직 생성된 예상질문이 없어요.
                </div>
              ) : (
                <div className="flex gap-1.5 flex-wrap">
                  {schoolsWithQuestions.map((school) => {
                    const isActive = selSchoolFilter === school;
                    return (
                      <button
                        key={school}
                        onClick={() => {
                          setSelSchoolFilter(school);
                          setSelQId(null);
                        }}
                        className="px-3 py-1 rounded-full text-[11px] font-bold border transition-all"
                        style={{
                          borderColor: isActive ? THEME.accent : "#E5E7EB",
                          background: isActive ? THEME.accentBg : "#fff",
                          color: isActive ? THEME.accentDark : "#6B7280",
                          boxShadow: isActive
                            ? `0 2px 6px ${THEME.accentShadow}`
                            : "none",
                        }}
                      >
                        🏫 {school}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-4 py-2 border-b border-line flex-shrink-0">
              <div className="text-[12px] font-medium text-ink-secondary">
                총{" "}
                <span
                  className="font-extrabold"
                  style={{ color: THEME.accent }}
                >
                  {questions.length}개
                </span>{" "}
                · 답변{" "}
                <span
                  className="font-extrabold"
                  style={{ color: THEME.accent }}
                >
                  {questions.filter((q) => q.answer).length}개
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {questions.length === 0 ? (
                <div className="text-center py-10 text-ink-muted text-[12px]">
                  <div className="text-3xl mb-2">💬</div>
                  <div className="font-medium">예상질문이 없어요.</div>
                </div>
              ) : (
                questions.map((q, i) => {
                  const isSelected = selQId === q.id;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setSelQId(q.id)}
                      className="w-full rounded-xl px-3.5 py-3 mb-1.5 text-left transition-all"
                      style={{
                        border: `1px solid ${isSelected ? THEME.accent : "#E5E7EB"}`,
                        background: isSelected ? THEME.accentBg : "#fff",
                        boxShadow: isSelected
                          ? `0 2px 8px ${THEME.accentShadow}`
                          : "none",
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            color: THEME.accentDark,
                            background: THEME.accentBg,
                            border: `1px solid ${THEME.accentBorder}60`,
                          }}
                        >
                          Q{i + 1}
                        </span>
                        {q.tag && (
                          <span className="text-[10px] font-semibold text-ink-secondary bg-gray-100 px-1.5 py-0.5 rounded-full">
                            {q.tag}
                          </span>
                        )}
                      </div>
                      <div
                        className="text-[12.5px] font-semibold leading-[1.5] mb-1.5"
                        style={{
                          color: isSelected ? THEME.accentDark : "#1a1a1a",
                        }}
                      >
                        {q.text}
                      </div>
                      {q.answer ? (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            color: THEME.accent,
                            background: THEME.accentBg,
                            border: `1px solid ${THEME.accentBorder}60`,
                          }}
                        >
                          ✓ 답변완료
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          ⏳ 미답변
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] min-w-0">
        {activeTab === "essay" && (
          <>
            {!selEssay ? (
              <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
                <div className="text-4xl">📄</div>
                <div className="text-[14px] font-bold text-ink-secondary">
                  학교를 선택해주세요
                </div>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-line flex-shrink-0">
                  {/* 삭제 요청 알림 배너 */}
                  {selEssay.delete_requested && (
                    <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 mb-3 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚠️</span>
                        <div>
                          <div className="text-[12px] font-bold text-amber-800">
                            학생이 자소서 삭제를 요청했어요
                          </div>
                          <div className="text-[10px] text-amber-700 mt-0.5">
                            요청일:{" "}
                            {selEssay.delete_requested_at
                              ? new Date(
                                  selEssay.delete_requested_at,
                                ).toLocaleDateString("ko-KR")
                              : "-"}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleRejectDelete}
                          disabled={rejectDelete.isPending}
                          className="px-3 py-1.5 bg-white border border-line rounded-md text-[11px] font-bold text-ink-secondary hover:bg-gray-50 transition-all disabled:opacity-50"
                        >
                          {rejectDelete.isPending ? "처리 중..." : "❌ 거부"}
                        </button>
                        <button
                          onClick={handleApproveDelete}
                          disabled={approveDelete.isPending}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-[11px] font-bold transition-all hover:-translate-y-px disabled:opacity-50"
                        >
                          {approveDelete.isPending
                            ? "삭제 중..."
                            : "✅ 삭제 승인"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-[17px] font-extrabold text-ink tracking-tight">
                          🏫 {selEssay.school}
                        </div>
                        {selEssay.version > 1 && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              color: THEME.accentDark,
                              background: THEME.accentBg,
                              border: `1px solid ${THEME.accentBorder}60`,
                            }}
                          >
                            v{selEssay.version}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-medium text-ink-muted mt-0.5">
                        📅 작성{" "}
                        {new Date(selEssay.created_at).toLocaleDateString(
                          "ko-KR",
                        )}{" "}
                        · 최근수정{" "}
                        {new Date(selEssay.updated_at).toLocaleDateString(
                          "ko-KR",
                        )}{" "}
                        · 1,500자 이내
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {selEssay.content?.selfStudy &&
                        !selEssay.questions_generated && (
                          <button
                            onClick={handleGenerateQuestions}
                            disabled={generateQuestions.isPending}
                            className="px-3 py-2 text-white rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px disabled:opacity-50"
                            style={{
                              background: THEME.accent,
                              boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                            }}
                          >
                            {generateQuestions.isPending
                              ? "생성 중..."
                              : "✨ 예상질문 생성"}
                          </button>
                        )}
                      {selEssay.questions_generated && (
                        <span
                          className="px-3 py-2 rounded-lg text-[11px] font-bold"
                          style={{
                            color: THEME.accentDark,
                            background: THEME.accentBg,
                            border: `1px solid ${THEME.accentBorder}60`,
                          }}
                        >
                          ✓ 질문생성완료
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {!selEssay.content?.selfStudy && (
                    <div className="bg-gray-50 border border-line rounded-xl px-4 py-12 text-center">
                      <div className="text-4xl mb-3">📝</div>
                      <div className="text-[14px] font-bold text-ink-secondary">
                        학생이 아직 자소서를 작성하지 않았어요
                      </div>
                    </div>
                  )}

                  {selEssay.content?.selfStudy && (
                    <div>
                      <div className="text-right text-[11px] font-semibold text-ink-muted mb-3">
                        총 {countChars(selEssay.content)} / 1,500자
                      </div>

                      {SECTIONS.map((s) => {
                        const currentContent = (selEssay.content as any)[s.key];
                        const answers = answersBySection[s.key] || [];
                        const sectionFbs = feedbackBySection[s.key] || [];

                        if (!currentContent && answers.length === 0)
                          return null;

                        // 인터리브 — 가장 큰 round
                        const lastAnswerRound =
                          answers.length > 0
                            ? Math.max(...answers.map((a) => a.round))
                            : 0;
                        const lastFeedbackRound =
                          sectionFbs.length > 0
                            ? Math.max(...sectionFbs.map((f) => f.round))
                            : 0;
                        const maxRound = Math.max(
                          lastAnswerRound,
                          lastFeedbackRound,
                        );

                        // 새 피드백 작성 가능한지: 답변 N차 받음 & 피드백 N차 아직 없음
                        const canWriteNextFb =
                          lastAnswerRound > lastFeedbackRound;
                        const nextFbRound = lastAnswerRound;

                        return (
                          <div key={s.key} className="mb-6">
                            {/* 섹션 제목 */}
                            <div className="flex items-center justify-between mb-2">
                              <div
                                className="text-[12px] font-extrabold tracking-tight"
                                style={{ color: THEME.accentDark }}
                              >
                                {s.label}
                              </div>
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
                              const fb = sectionFbs.find(
                                (f) => f.round === round,
                              );

                              return (
                                <div key={round} className="mb-2">
                                  {/* N차 답변 */}
                                  {ans && (
                                    <div className="bg-gray-50 border border-line rounded-xl px-4 py-3 mb-1.5">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                          <span
                                            className="text-[10px] font-extrabold text-white px-1.5 py-0.5 rounded-full"
                                            style={{ background: THEME.accent }}
                                          >
                                            {round === 1
                                              ? "1차 자소서 작성"
                                              : `${round}차 자소서 수정`}
                                          </span>
                                          <span className="text-[9px] font-semibold text-ink-muted">
                                            {new Date(
                                              ans.created_at,
                                            ).toLocaleDateString("ko-KR")}
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-semibold text-ink-muted">
                                          {ans.content.length}자
                                        </span>
                                      </div>
                                      <div className="text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                                        {ans.content}
                                      </div>
                                    </div>
                                  )}

                                  {/* N차 피드백 */}
                                  {fb && (
                                    <div
                                      className="rounded-md px-3 py-2.5 ml-3 mb-1.5"
                                      style={{
                                        background: THEME.accentBg,
                                        border: `1px solid ${THEME.accentBorder}80`,
                                      }}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5">
                                          <span
                                            className="text-[9px] font-extrabold text-white px-1.5 py-0.5 rounded-full"
                                            style={{ background: THEME.accent }}
                                          >
                                            {fb.round}차 피드백
                                          </span>
                                          <span className="text-[9px] font-semibold text-ink-muted">
                                            {new Date(
                                              fb.created_at,
                                            ).toLocaleDateString("ko-KR")}
                                          </span>
                                        </div>
                                        {!(
                                          editingSection?.key === s.key &&
                                          editingSection?.id === fb.id
                                        ) && (
                                          <div className="flex gap-1">
                                            <button
                                              onClick={() => {
                                                setEditingSection({
                                                  key: s.key,
                                                  id: fb.id,
                                                });
                                                setEditingText(fb.text);
                                              }}
                                              className="text-[9px] text-ink-secondary hover:text-ink"
                                            >
                                              ✏️
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleDeleteSectionFb(fb.id)
                                              }
                                              className="text-[9px] text-red-500 hover:text-red-700"
                                            >
                                              🗑️
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                      {editingSection?.key === s.key &&
                                      editingSection?.id === fb.id ? (
                                        <>
                                          <textarea
                                            value={editingText}
                                            onChange={(e) =>
                                              setEditingText(e.target.value)
                                            }
                                            rows={2}
                                            className="w-full border border-line rounded px-2 py-1.5 text-[11.5px] font-medium outline-none resize-y leading-[1.6] transition-all bg-white"
                                            onFocus={handleTextareaFocus}
                                            onBlur={handleTextareaBlur}
                                          />
                                          <div className="flex gap-1 justify-end mt-1">
                                            <button
                                              onClick={() => {
                                                setEditingSection(null);
                                                setEditingText("");
                                              }}
                                              className="px-2 py-0.5 bg-white text-ink-secondary border border-line rounded text-[9px] font-bold"
                                            >
                                              취소
                                            </button>
                                            <button
                                              onClick={handleUpdateSectionFb}
                                              disabled={
                                                updateSectionFb.isPending
                                              }
                                              className="px-2 py-0.5 text-white rounded text-[9px] font-bold disabled:opacity-50"
                                              style={{
                                                background: THEME.accent,
                                              }}
                                            >
                                              {updateSectionFb.isPending
                                                ? "..."
                                                : "💾"}
                                            </button>
                                          </div>
                                        </>
                                      ) : (
                                        <div
                                          className="text-[11.5px] font-medium leading-[1.6]"
                                          style={{ color: THEME.accentDark }}
                                        >
                                          {fb.text}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* 새 피드백 작성 칸 (답변 받았는데 피드백 안 한 상태) */}
                            {canWriteNextFb && (
                              <div
                                className="bg-white rounded-md p-2 mt-2"
                                style={{ border: `1px dashed ${THEME.accent}` }}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div
                                    className="text-[9px] font-bold"
                                    style={{ color: THEME.accent }}
                                  >
                                    ➕ {nextFbRound}차 피드백 작성
                                  </div>
                                  <button
                                    onClick={() => toggleAiPanel(s.key)}
                                    className="text-[9px] font-bold px-2 py-0.5 rounded-full transition-all hover:-translate-y-px"
                                    style={{
                                      color:
                                        showAiPanel && aiPanelSection === s.key
                                          ? "#fff"
                                          : THEME.accent,
                                      background:
                                        showAiPanel && aiPanelSection === s.key
                                          ? THEME.accent
                                          : "#fff",
                                      border: `1px solid ${THEME.accent}`,
                                      boxShadow:
                                        showAiPanel && aiPanelSection === s.key
                                          ? `0 2px 6px ${THEME.accentShadow}`
                                          : "none",
                                    }}
                                  >
                                    {showAiPanel && aiPanelSection === s.key
                                      ? "✨ AI 분석 닫기"
                                      : "✨ AI 분석 보기"}
                                  </button>
                                </div>
                                <textarea
                                  value={newSectionFbs[s.key] || ""}
                                  onChange={(e) =>
                                    setNewSectionFbs((prev) => ({
                                      ...prev,
                                      [s.key]: e.target.value,
                                    }))
                                  }
                                  placeholder={`${nextFbRound}차 피드백을 작성해주세요...`}
                                  rows={3}
                                  className="w-full border border-line rounded px-2 py-1.5 text-[11.5px] font-medium outline-none resize-y leading-[1.6] transition-all placeholder:text-ink-muted"
                                  onFocus={handleTextareaFocus}
                                  onBlur={handleTextareaBlur}
                                />
                                <div className="flex justify-end mt-1">
                                  <button
                                    onClick={() => handleAddSectionFb(s.key)}
                                    disabled={
                                      !(newSectionFbs[s.key] || "").trim() ||
                                      addSectionFb.isPending
                                    }
                                    className="px-3 py-1 text-white rounded text-[10px] font-bold transition-all disabled:cursor-not-allowed"
                                    style={{
                                      background:
                                        (newSectionFbs[s.key] || "").trim() &&
                                        !addSectionFb.isPending
                                          ? THEME.accent
                                          : "#E5E7EB",
                                      color:
                                        (newSectionFbs[s.key] || "").trim() &&
                                        !addSectionFb.isPending
                                          ? "#fff"
                                          : "#9CA3AF",
                                    }}
                                  >
                                    {addSectionFb.isPending
                                      ? "전달 중..."
                                      : `📤 ${nextFbRound}차 피드백 전달`}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* 학생이 다음 답변 작성 대기 중 (피드백 보냈는데 학생이 아직 답변 안 한 상태) */}
                            {!canWriteNextFb &&
                              lastFeedbackRound >= lastAnswerRound &&
                              lastFeedbackRound > 0 && (
                                <div className="bg-gray-50 border border-line rounded-md px-3 py-2 mt-2 text-center">
                                  <div className="text-[10px] font-medium text-ink-muted">
                                    ⏳ 학생이 다음 답변 작성을 기다리고 있어요
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
                <div className="text-[14px] font-bold text-ink-secondary">
                  질문을 선택해주세요
                </div>
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-line flex-shrink-0">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-[13px] font-extrabold text-ink">
                        Q{questions.findIndex((q) => q.id === selQ.id) + 1}
                      </div>
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          color: THEME.accentDark,
                          background: THEME.accentBg,
                          border: `1px solid ${THEME.accentBorder}60`,
                        }}
                      >
                        🏫 {selSchoolFilter}
                      </span>
                      {selQ.tag && (
                        <span className="text-[11px] font-semibold text-ink-secondary bg-gray-100 px-2 py-0.5 rounded-full">
                          {selQ.tag}
                        </span>
                      )}
                    </div>
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full border"
                      style={{
                        background: selQ.answer ? THEME.accentBg : "#FEF3C7",
                        color: selQ.answer ? THEME.accentDark : "#92400E",
                        borderColor: `${selQ.answer ? THEME.accentBorder : "#FCD34D"}60`,
                      }}
                    >
                      {selQ.answer ? "✓ 답변완료" : "⏳ 미답변"}
                    </span>
                  </div>

                  <div className="flex">
                    {STEP_LABELS.map((label, i) => {
                      const step = getStep(selQ, selQFeedback);
                      const stepNum = i + 1;
                      const isDone = stepNum < step;
                      const isOn = stepNum === step;
                      const active = isDone || isOn;
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center gap-1 relative"
                        >
                          {i < 4 && (
                            <div
                              className="absolute top-[11px] left-[55%] w-[90%] h-px"
                              style={{
                                background: isDone ? THEME.accent : "#E5E7EB",
                              }}
                            />
                          )}
                          <div
                            className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-extrabold z-10 relative border"
                            style={{
                              background: active ? THEME.accent : "#F3F4F6",
                              color: active ? "#fff" : "#9CA3AF",
                              borderColor: active ? THEME.accent : "#E5E7EB",
                            }}
                          >
                            {isDone ? "✓" : stepNum}
                          </div>
                          <div
                            className="text-[10px] font-bold whitespace-nowrap"
                            style={{
                              color: active ? THEME.accentDark : "#9CA3AF",
                            }}
                          >
                            {label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                  <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                      📌 예상 질문
                    </div>
                    <div className="text-[14px] font-bold text-ink leading-[1.6]">
                      {selQ.text}
                    </div>
                  </div>

                  {selQ.purpose && selQ.purpose.length > 0 && (
                    <div
                      className="rounded-xl px-4 py-3"
                      style={{
                        background: THEME.accentBg,
                        border: `1px solid ${THEME.accentBorder}60`,
                      }}
                    >
                      <div
                        className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
                        style={{ color: THEME.accent }}
                      >
                        💡 질문 의도
                      </div>
                      <ul className="pl-4">
                        {selQ.purpose.map((p: string, i: number) => (
                          <li
                            key={i}
                            className="text-[12.5px] font-medium leading-[1.7] list-disc"
                            style={{ color: THEME.accentDark }}
                          >
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">
                        Step 1
                      </span>
                      <span className="text-[11px] font-bold text-ink-secondary">
                        👤 학생 첫 답변
                      </span>
                    </div>
                    {selQ.answer ? (
                      <div className="bg-gray-50 border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                        {selQ.answer}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-4 text-[12px] font-medium text-ink-muted text-center">
                        ⏳ 학생이 아직 답변하지 않았어요
                      </div>
                    )}
                  </div>

                  {selQ.answer && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span
                          className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                          style={{ background: THEME.accent }}
                        >
                          Step 2
                        </span>
                        <span className="text-[11px] font-bold text-ink-secondary">
                          💬 선생님 1차 피드백
                        </span>
                      </div>
                      <textarea
                        value={teacherFbText}
                        onChange={(e) => setTeacherFbText(e.target.value)}
                        placeholder="학생 답변에 대한 피드백을 작성해주세요..."
                        rows={3}
                        className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                        onFocus={handleTextareaFocus}
                        onBlur={handleTextareaBlur}
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={handleSendFirstFb}
                          disabled={
                            !teacherFbText.trim() || saveFirstFb.isPending
                          }
                          className="px-3 py-1.5 text-white rounded-md text-[11px] font-bold transition-all disabled:cursor-not-allowed"
                          style={{
                            background:
                              teacherFbText.trim() && !saveFirstFb.isPending
                                ? THEME.accent
                                : "#E5E7EB",
                            color:
                              teacherFbText.trim() && !saveFirstFb.isPending
                                ? "#fff"
                                : "#9CA3AF",
                          }}
                        >
                          {saveFirstFb.isPending
                            ? "저장 중..."
                            : selQFeedback?.teacher_first_feedback
                              ? "💾 업데이트"
                              : "📤 피드백 전달"}
                        </button>
                      </div>
                    </div>
                  )}

                  {selQFeedback?.teacher_first_feedback && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">
                          Step 3
                        </span>
                        <span className="text-[11px] font-bold text-ink-secondary">
                          👤 학생 업그레이드 답변
                        </span>
                      </div>
                      {selQ.upgraded_answer ? (
                        <div className="bg-gray-50 border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                          {selQ.upgraded_answer}
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-4 text-[12px] font-medium text-amber-700 text-center">
                          ⏳ 학생이 업그레이드 답변 작성중이에요
                        </div>
                      )}
                    </div>
                  )}

                  {selQ.upgraded_answer && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span
                          className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                          style={{ background: THEME.accent }}
                        >
                          Step 4
                        </span>
                        <span className="text-[11px] font-bold text-ink-secondary">
                          💬 선생님 최종 피드백
                        </span>
                      </div>
                      <textarea
                        value={finalFbText}
                        onChange={(e) => setFinalFbText(e.target.value)}
                        placeholder="최종 피드백을 작성해주세요..."
                        rows={3}
                        className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                        onFocus={handleTextareaFocus}
                        onBlur={handleTextareaBlur}
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={handleSendFinalFb}
                          disabled={
                            !finalFbText.trim() || saveFinalFb.isPending
                          }
                          className="px-3 py-1.5 text-white rounded-md text-[11px] font-bold transition-all disabled:cursor-not-allowed"
                          style={{
                            background:
                              finalFbText.trim() && !saveFinalFb.isPending
                                ? THEME.accent
                                : "#E5E7EB",
                            color:
                              finalFbText.trim() && !saveFinalFb.isPending
                                ? "#fff"
                                : "#9CA3AF",
                          }}
                        >
                          {saveFinalFb.isPending
                            ? "저장 중..."
                            : selQFeedback?.teacher_final_feedback
                              ? "💾 업데이트"
                              : "📤 최종 피드백 전달"}
                        </button>
                      </div>
                    </div>
                  )}

                  {selQFeedback?.teacher_final_feedback && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                        <span
                          className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                          style={{ background: THEME.accent }}
                        >
                          Step 5
                        </span>
                        <span className="text-[11px] font-bold text-ink-secondary">
                          🔗 꼬리질문
                        </span>
                        <span className="ml-auto text-[10px] font-bold text-ink-muted">
                          {selQFeedback.tail_questions?.length || 0}개
                        </span>
                      </div>

                      {selQFeedback.tail_questions &&
                        selQFeedback.tail_questions.length > 0 && (
                          <div className="mb-3">
                            {selQFeedback.tail_questions.map(
                              (t: any, i: number) => (
                                <div
                                  key={i}
                                  className="rounded-lg px-3 py-2.5 mb-1.5"
                                  style={{
                                    background: THEME.accentBg,
                                    border: `1px solid ${THEME.accentBorder}60`,
                                  }}
                                >
                                  <div className="flex items-start gap-2 mb-1.5">
                                    <span
                                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                      style={{
                                        color: "#fff",
                                        background: THEME.accent,
                                      }}
                                    >
                                      꼬리{i + 1}
                                    </span>
                                    <span
                                      className="text-[12.5px] font-medium flex-1 leading-[1.6]"
                                      style={{ color: THEME.accentDark }}
                                    >
                                      {t.text}
                                    </span>
                                    <button
                                      onClick={() => handleRemoveTail(i)}
                                      className="text-ink-muted hover:text-red-500 text-xs flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 transition-colors"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  {/* 학생 답변 */}
                                  {t.answer && (
                                    <div className="mt-2 pt-2 border-t border-line">
                                      <div className="text-[10px] font-bold text-ink-muted mb-1">
                                        👤 학생 답변
                                      </div>
                                      <div className="text-[12px] font-medium text-ink leading-[1.6] whitespace-pre-wrap bg-white rounded p-2">
                                        {t.answer}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ),
                            )}
                          </div>
                        )}

                      <div className="flex gap-2 mb-2">
                        <input
                          value={newTailText}
                          onChange={(e) => setNewTailText(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAddTail(newTailText)
                          }
                          placeholder="꼬리질문을 직접 추가..."
                          className="flex-1 h-9 border border-line rounded-lg px-3 text-[12px] font-medium outline-none transition-all placeholder:text-ink-muted"
                          onFocus={(e) => {
                            e.target.style.borderColor = THEME.accent;
                            e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`;
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = "#E5E7EB";
                            e.target.style.boxShadow = "none";
                          }}
                        />
                        <button
                          onClick={() => handleAddTail(newTailText)}
                          disabled={
                            !newTailText.trim() || updateTails.isPending
                          }
                          className="h-9 px-3 text-white rounded-lg text-[11px] font-bold transition-all disabled:cursor-not-allowed"
                          style={{
                            background:
                              newTailText.trim() && !updateTails.isPending
                                ? THEME.accent
                                : "#E5E7EB",
                            color:
                              newTailText.trim() && !updateTails.isPending
                                ? "#fff"
                                : "#9CA3AF",
                          }}
                        >
                          ➕ 추가
                        </button>
                      </div>

                      <button
                        onClick={openAiTailModal}
                        className="w-full h-9 bg-white border rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px"
                        style={{
                          color: THEME.accent,
                          borderColor: THEME.accent,
                        }}
                      >
                        ✨ AI 꼬리질문 제안 받기
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {showAiTailModal && (
        <div
          onClick={() => setShowAiTailModal(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[520px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <div className="text-[18px] font-extrabold text-ink mb-1">
              ✨ AI 꼬리질문 제안
            </div>
            <div className="text-[12px] font-medium text-ink-secondary mb-5">
              학생의 답변을 분석해서 추천하는 꼬리질문이에요.
            </div>

            {aiTailLoading ? (
              <div className="text-center py-10 text-ink-muted text-[13px] font-medium">
                <div className="text-3xl mb-3 animate-pulse">✨</div>
                AI가 꼬리질문을 생성 중이에요...
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-5">
                {AI_TAIL_SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      handleAddTail(s);
                      setShowAiTailModal(false);
                    }}
                    className="text-left px-4 py-3 rounded-xl bg-white transition-all"
                    style={{ border: "1px solid #E5E7EB" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = THEME.accent;
                      e.currentTarget.style.background = THEME.accentBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#E5E7EB";
                      e.currentTarget.style.background = "#fff";
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                        style={{
                          color: THEME.accentDark,
                          background: THEME.accentBg,
                          border: `1px solid ${THEME.accentBorder}60`,
                        }}
                      >
                        제안 {i + 1}
                      </span>
                      <span className="text-[13px] font-medium text-ink leading-[1.6]">
                        {s}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowAiTailModal(false)}
              className="w-full h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* ========== 우측 AI 분석 사이드 패널 (자소서 섹션별) ========== */}
      {showAiPanel && aiPanelSection && (
        <div className="fixed top-0 right-0 bottom-0 w-[440px] bg-white border-l border-line flex flex-col shadow-[-8px_0_24px_rgba(15,23,42,0.08)] z-50">
          <div className="px-4 py-4 border-b border-line flex-shrink-0 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-extrabold text-ink tracking-tight">
                ✨ AI 분석
              </div>
              <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                {SECTIONS.find((s) => s.key === aiPanelSection)?.label}
              </div>
            </div>
            <button
              onClick={() => setShowAiPanel(false)}
              className="text-ink-muted hover:text-ink text-base w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {/* 강점 분석 */}
            <div
              className="rounded-xl px-4 py-3.5"
              style={{
                background: THEME.accentBg,
                border: `1px solid ${THEME.accentBorder}60`,
              }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">✅</span>
                <div
                  className="text-[11px] font-extrabold uppercase tracking-wider"
                  style={{ color: THEME.accent }}
                >
                  강점
                </div>
              </div>
              <ul className="space-y-1">
                {(AI_ESSAY_ANALYSIS[aiPanelSection]?.strengths || []).map(
                  (item, i) => (
                    <li
                      key={i}
                      className="text-[12px] font-medium leading-[1.6] flex gap-1.5"
                      style={{ color: THEME.accentDark }}
                    >
                      <span>•</span>
                      <span>{item}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* 보완할 점 */}
            <div className="rounded-xl px-4 py-3.5 bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">⚠️</span>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
                  보완할 점
                </div>
              </div>
              <ul className="space-y-1">
                {(AI_ESSAY_ANALYSIS[aiPanelSection]?.improvements || []).map(
                  (item, i) => (
                    <li
                      key={i}
                      className="text-[12px] font-medium leading-[1.6] flex gap-1.5 text-amber-800"
                    >
                      <span>•</span>
                      <span>{item}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* 추천 방향 */}
            <div className="rounded-xl px-4 py-3.5 bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">💡</span>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
                  추천 방향
                </div>
              </div>
              <ul className="space-y-1">
                {(AI_ESSAY_ANALYSIS[aiPanelSection]?.recommendations || []).map(
                  (item, i) => (
                    <li
                      key={i}
                      className="text-[12px] font-medium leading-[1.6] flex gap-1.5 text-blue-900"
                    >
                      <span>•</span>
                      <span>{item}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* 선생님 말투로 작성 버튼 */}
            <div
              className="bg-white rounded-xl px-4 py-3.5 border-2"
              style={{ borderColor: THEME.accent }}
            >
              <div
                className="text-[11px] font-extrabold uppercase tracking-wider mb-1"
                style={{ color: THEME.accent }}
              >
                ✨ AI 자동 작성
              </div>
              <div className="text-[11px] text-ink-secondary mb-2.5 leading-[1.6]">
                위 분석을 바탕으로 선생님 말투의 피드백을 자동으로
                작성해드릴게요. 클릭하면 작성창에 자동 입력돼요.
              </div>
              <button
                onClick={() => {
                  writeAiFeedback(aiPanelSection);
                  setShowAiPanel(false);
                }}
                disabled={aiWritingSection === aiPanelSection}
                className="w-full h-10 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px disabled:cursor-not-allowed"
                style={{
                  background:
                    aiWritingSection === aiPanelSection
                      ? "#9CA3AF"
                      : THEME.accent,
                  boxShadow:
                    aiWritingSection === aiPanelSection
                      ? "none"
                      : `0 4px 12px ${THEME.accentShadow}`,
                }}
              >
                {aiWritingSection === aiPanelSection
                  ? "✨ 작성 중..."
                  : "✨ 선생님 말투로 자동 작성"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
