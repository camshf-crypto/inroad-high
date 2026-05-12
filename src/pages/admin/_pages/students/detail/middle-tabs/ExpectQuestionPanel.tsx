import { useState, useEffect } from "react";
import {
    useStudentQuestions,
    useStudentQuestionFeedback,
    useSaveFirstFeedback,
    useSaveFinalFeedback,
    useUpdateTailQuestions,
} from "@/pages/admin/_hooks/middle/useStudentExpect";
import {
    useAnalyzeAnswer,
    type SectionAnalysisResult,
} from "@/pages/admin/_hooks/middle/useAiEssay";
import { supabase } from "@/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const THEME = {
    accent: "#059669",
    accentDark: "#065F46",
    accentBg: "#ECFDF5",
    accentBorder: "#6EE7B7",
    accentShadow: "rgba(16, 185, 129, 0.15)",
};

const STEP_LABELS = ["첫 답변", "1차 피드백", "업그레이드", "최종 피드백", "꼬리질문"];

const AI_TAIL_SUGGESTIONS = [
    "그 경험에서 가장 어려웠던 점은 무엇이었나요?",
    "만약 다시 같은 상황이 온다면 어떻게 다르게 행동하시겠어요?",
    "이 활동이 본인의 진로 선택에 어떤 영향을 미쳤나요?",
];

const MAX_QUESTION_AI_COUNT = 1;

function useQuestionAiCount(questionId: string | undefined) {
    return useQuery({
        queryKey: ["question-ai-count", questionId],
        enabled: !!questionId,
        queryFn: async () => {
            if (!questionId) return [];
            const { data, error } = await supabase
                .from("jaso_question_ai_count")
                .select("*")
                .eq("question_id", questionId);
            if (error) throw error;
            return data || [];
        },
    });
}

async function incrementQuestionAiCount(questionId: string, analysisType: "first" | "upgrade", result: any) {
    const { data: existing } = await supabase
        .from("jaso_question_ai_count")
        .select("id, count")
        .eq("question_id", questionId)
        .eq("analysis_type", analysisType)
        .maybeSingle();

    if (existing) {
        const { error } = await supabase
            .from("jaso_question_ai_count")
            .update({
                count: existing.count + 1,
                last_analyzed_at: new Date().toISOString(),
                result,
            })
            .eq("id", existing.id);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from("jaso_question_ai_count")
            .insert({
                question_id: questionId,
                analysis_type: analysisType,
                count: 1,
                last_analyzed_at: new Date().toISOString(),
                result,
            });
        if (error) throw error;
    }
}

export default function MiddleExpectQuestionPanel({
    student,
    essays,
    selSchoolFilter,
    selQId,
    setSelQId,
}: {
    student: any;
    essays: any[];
    selSchoolFilter: string;
    selQId: string | null;
    setSelQId: (id: string | null) => void;
}) {
    const qc = useQueryClient();
    const filterEssay = essays.find((e) => e.school === selSchoolFilter);
    const { data: questions = [] } = useStudentQuestions(filterEssay?.id);
    const selQ = questions.find((q) => q.id === selQId) ?? null;
    const { data: selQFeedback } = useStudentQuestionFeedback(selQId ?? undefined);
    const { data: questionAiCounts = [] } = useQuestionAiCount(selQId ?? undefined);

    const analyzeAnswer = useAnalyzeAnswer();
    const saveFirstFb = useSaveFirstFeedback();
    const saveFinalFb = useSaveFinalFeedback();
    const updateTails = useUpdateTailQuestions();

    const [qaiResults, setQaiResults] = useState<Record<string, SectionAnalysisResult>>({});
    const [teacherFbText, setTeacherFbText] = useState("");
    const [finalFbText, setFinalFbText] = useState("");
    const [newTailText, setNewTailText] = useState("");
    const [showAiTailModal, setShowAiTailModal] = useState(false);
    const [aiTailLoading, setAiTailLoading] = useState(false);

    const [showQAiPanel, setShowQAiPanel] = useState(false);
    const [qAiTab, setQAiTab] = useState<"first" | "upgrade">("first");

    // 🎯 탭 활성화 조건 (해당 답변이 실제로 존재해야 함)
    const canUseFirstTab = !!(selQ?.answer && selQ.answer.trim().length > 0);
    const canUseUpgradeTab = !!(selQ?.upgraded_answer && selQ.upgraded_answer.trim().length > 0);

    useEffect(() => {
        setTeacherFbText(selQFeedback?.teacher_first_feedback || "");
        setFinalFbText(selQFeedback?.teacher_final_feedback || "");
    }, [selQId, selQFeedback?.teacher_first_feedback, selQFeedback?.teacher_final_feedback]);

    // DB 저장된 결과 자동 로드 (1차/2차 둘 다)
    useEffect(() => {
        if (!selQ || questionAiCounts.length === 0) return;
        questionAiCounts.forEach((row: any) => {
            if (row.result) {
                const cacheKey = `${selQ.id}_${row.analysis_type}`;
                setQaiResults((prev) => ({ ...prev, [cacheKey]: row.result }));
            }
        });
    }, [selQ?.id, questionAiCounts]);

    // 현재 탭이 비활성이면 활성 탭으로 자동 전환
    useEffect(() => {
        if (qAiTab === "upgrade" && !canUseUpgradeTab) {
            setQAiTab("first");
        }
    }, [selQId, canUseUpgradeTab, qAiTab]);

    const getStep = (q: any, fb: any) => {
        if (!q?.answer) return 0;
        if (!fb?.teacher_first_feedback) return 1;
        if (!q.upgraded_answer) return 2;
        if (!fb?.teacher_final_feedback) return 3;
        return 4;
    };

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

    // 🎯 1차 분석: 학생 첫 답변에 대해 단 한 번만. 이미 있으면 무조건 캐시/DB꺼 사용
    const fetchFirstAnalysis = async () => {
        if (!selQ || !canUseFirstTab) return;
        const cacheKey = `${selQ.id}_first`;

        // 1. state 캐시에 있으면 그거 사용
        if (qaiResults[cacheKey]) return;

        // 2. DB에 있으면 그거 사용 (AI 재호출 X)
        const { data: countRow } = await supabase
            .from("jaso_question_ai_count")
            .select("count, result")
            .eq("question_id", selQ.id)
            .eq("analysis_type", "first")
            .maybeSingle();

        if (countRow?.result) {
            setQaiResults((prev) => ({ ...prev, [cacheKey]: countRow.result }));
            return;
        }

        // 3. MAX 도달했는데 result가 없으면 (비정상) 아무것도 안 함
        if ((countRow?.count || 0) >= MAX_QUESTION_AI_COUNT) {
            return;
        }

        // 4. 진짜 첫 분석. AI 호출
        try {
            const result = await analyzeAnswer.mutateAsync({
                schoolName: selSchoolFilter,
                questionText: selQ.text,
                studentAnswer: selQ.answer || "",
                questionPurpose: selQ.purpose,
                studentName: student?.name,
            });
            setQaiResults((prev) => ({ ...prev, [cacheKey]: result }));
            await incrementQuestionAiCount(selQ.id, "first", result);
            qc.invalidateQueries({ queryKey: ["question-ai-count", selQ.id] });
        } catch (e: any) {
            alert(`AI 분석 실패: ${e.message}`);
        }
    };

    // 🎯 2차 분석: 학생 업그레이드 답변에 대해 단 한 번만
    const fetchUpgradeAnalysis = async () => {
        if (!selQ || !canUseUpgradeTab) return;
        const cacheKey = `${selQ.id}_upgrade`;

        if (qaiResults[cacheKey]) return;

        const { data: countRow } = await supabase
            .from("jaso_question_ai_count")
            .select("count, result")
            .eq("question_id", selQ.id)
            .eq("analysis_type", "upgrade")
            .maybeSingle();

        if (countRow?.result) {
            setQaiResults((prev) => ({ ...prev, [cacheKey]: countRow.result }));
            return;
        }

        if ((countRow?.count || 0) >= MAX_QUESTION_AI_COUNT) {
            return;
        }

        try {
            const result = await analyzeAnswer.mutateAsync({
                schoolName: selSchoolFilter,
                questionText: selQ.text,
                studentAnswer: selQ.upgraded_answer || "",
                questionPurpose: selQ.purpose,
                studentName: student?.name,
                isUpgrade: true,
                previousFeedback: selQFeedback?.teacher_first_feedback || undefined,
            });
            setQaiResults((prev) => ({ ...prev, [cacheKey]: result }));
            await incrementQuestionAiCount(selQ.id, "upgrade", result);
            qc.invalidateQueries({ queryKey: ["question-ai-count", selQ.id] });
        } catch (e: any) {
            alert(`AI 분석 실패: ${e.message}`);
        }
    };

    const handleOpenFirstTab = async () => {
        if (!selQ) return;
        if (showQAiPanel && qAiTab === "first") {
            setShowQAiPanel(false);
            return;
        }
        setQAiTab("first");
        setShowQAiPanel(true);
        await fetchFirstAnalysis();
    };

    const handleSwitchTab = async (tab: "first" | "upgrade") => {
        // 🎯 비활성 탭은 클릭해도 무시
        if (tab === "first" && !canUseFirstTab) return;
        if (tab === "upgrade" && !canUseUpgradeTab) return;

        setQAiTab(tab);
        if (tab === "first") {
            await fetchFirstAnalysis();
        } else {
            await fetchUpgradeAnalysis();
        }
    };

    const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        e.target.style.borderColor = THEME.accent;
        e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`;
    };
    const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        e.target.style.borderColor = "#E5E7EB";
        e.target.style.boxShadow = "none";
    };

    const openAiTailModal = () => {
        setShowAiTailModal(true);
        setAiTailLoading(true);
        setTimeout(() => setAiTailLoading(false), 1200);
    };

    if (!selQ) {
        return (
            <>
                <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
                    <div className="text-4xl">💬</div>
                    <div className="text-[14px] font-bold text-ink-secondary">
                        질문을 선택해주세요
                    </div>
                </div>
            </>
        );
    }

    const currentResult = qaiResults[`${selQ.id}_${qAiTab}`];

    return (
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
                    <div className="flex gap-2 items-center flex-wrap">
                        {selQ.answer && (
                            <button
                                onClick={handleOpenFirstTab}
                                disabled={analyzeAnswer.isPending}
                                className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px disabled:opacity-50"
                                style={{
                                    background: showQAiPanel ? THEME.accent : "#fff",
                                    color: showQAiPanel ? "#fff" : THEME.accent,
                                    border: `1px solid ${THEME.accent}`,
                                    boxShadow: showQAiPanel ? `0 4px 12px ${THEME.accentShadow}` : "none",
                                }}
                            >
                                {analyzeAnswer.isPending ? "분석 중..." : showQAiPanel ? "✨ AI 분석 닫기" : "✨ AI 분석 보기"}
                            </button>
                        )}
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
                </div>

                {/* Step 진행도 */}
                <div className="flex">
                    {STEP_LABELS.map((label, i) => {
                        const step = getStep(selQ, selQFeedback);
                        const stepNum = i + 1;
                        const isDone = stepNum < step;
                        const isOn = stepNum === step;
                        const active = isDone || isOn;
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                                {i < 4 && (
                                    <div
                                        className="absolute top-[11px] left-[55%] w-[90%] h-px"
                                        style={{ background: isDone ? THEME.accent : "#E5E7EB" }}
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
                                    style={{ color: active ? THEME.accentDark : "#9CA3AF" }}
                                >
                                    {label}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                {/* 예상 질문 */}
                <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                        📌 예상 질문
                    </div>
                    <div className="text-[14px] font-bold text-ink leading-[1.6]">
                        {selQ.text}
                    </div>
                </div>

                {/* 질문 의도 */}
                {selQ.purpose && selQ.purpose.length > 0 && (
                    <div
                        className="rounded-xl px-4 py-3"
                        style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                    >
                        <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: THEME.accent }}>
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

                {/* Step 1: 학생 첫 답변 */}
                <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">
                            Step 1
                        </span>
                        <span className="text-[11px] font-bold text-ink-secondary">👤 학생 첫 답변</span>
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

                {/* Step 2: 선생님 1차 피드백 */}
                {selQ.answer && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full" style={{ background: THEME.accent }}>
                                Step 2
                            </span>
                            <span className="text-[11px] font-bold text-ink-secondary">💬 선생님 1차 피드백</span>
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
                                disabled={!teacherFbText.trim() || saveFirstFb.isPending}
                                className="px-3 py-1.5 text-white rounded-md text-[11px] font-bold transition-all disabled:cursor-not-allowed"
                                style={{
                                    background: teacherFbText.trim() && !saveFirstFb.isPending ? THEME.accent : "#E5E7EB",
                                    color: teacherFbText.trim() && !saveFirstFb.isPending ? "#fff" : "#9CA3AF",
                                }}
                            >
                                {saveFirstFb.isPending ? "저장 중..." : selQFeedback?.teacher_first_feedback ? "💾 업데이트" : "📤 피드백 전달"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: 학생 업그레이드 답변 */}
                {selQFeedback?.teacher_first_feedback && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">
                                Step 3
                            </span>
                            <span className="text-[11px] font-bold text-ink-secondary">👤 학생 업그레이드 답변</span>
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

                {/* Step 4: 선생님 최종 피드백 */}
                {selQ.upgraded_answer && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full" style={{ background: THEME.accent }}>
                                Step 4
                            </span>
                            <span className="text-[11px] font-bold text-ink-secondary">💬 선생님 최종 피드백</span>
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
                                disabled={!finalFbText.trim() || saveFinalFb.isPending}
                                className="px-3 py-1.5 text-white rounded-md text-[11px] font-bold transition-all disabled:cursor-not-allowed"
                                style={{
                                    background: finalFbText.trim() && !saveFinalFb.isPending ? THEME.accent : "#E5E7EB",
                                    color: finalFbText.trim() && !saveFinalFb.isPending ? "#fff" : "#9CA3AF",
                                }}
                            >
                                {saveFinalFb.isPending ? "저장 중..." : selQFeedback?.teacher_final_feedback ? "💾 업데이트" : "📤 최종 피드백 전달"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 5: 꼬리질문 */}
                {selQFeedback?.teacher_final_feedback && (
                    <div className="bg-white border border-line rounded-xl px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                            <span className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full" style={{ background: THEME.accent }}>
                                Step 5
                            </span>
                            <span className="text-[11px] font-bold text-ink-secondary">🔗 꼬리질문</span>
                            <span className="ml-auto text-[10px] font-bold text-ink-muted">
                                {selQFeedback.tail_questions?.length || 0}개
                            </span>
                        </div>

                        {selQFeedback.tail_questions && selQFeedback.tail_questions.length > 0 && (
                            <div className="mb-3">
                                {selQFeedback.tail_questions.map((t: any, i: number) => (
                                    <div
                                        key={i}
                                        className="rounded-lg px-3 py-2.5 mb-1.5"
                                        style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                                    >
                                        <div className="flex items-start gap-2 mb-1.5">
                                            <span
                                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                                style={{ color: "#fff", background: THEME.accent }}
                                            >
                                                꼬리{i + 1}
                                            </span>
                                            <span className="text-[12.5px] font-medium flex-1 leading-[1.6]" style={{ color: THEME.accentDark }}>
                                                {t.text}
                                            </span>
                                            <button
                                                onClick={() => handleRemoveTail(i)}
                                                className="text-ink-muted hover:text-red-500 text-xs flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 transition-colors"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2 mb-2">
                            <input
                                value={newTailText}
                                onChange={(e) => setNewTailText(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddTail(newTailText)}
                                placeholder="꼬리질문을 직접 추가..."
                                className="flex-1 h-9 border border-line rounded-lg px-3 text-[12px] font-medium outline-none placeholder:text-ink-muted"
                            />
                            <button
                                onClick={() => handleAddTail(newTailText)}
                                disabled={!newTailText.trim() || updateTails.isPending}
                                className="h-9 px-3 text-white rounded-lg text-[11px] font-bold transition-all disabled:cursor-not-allowed"
                                style={{
                                    background: newTailText.trim() && !updateTails.isPending ? THEME.accent : "#E5E7EB",
                                    color: newTailText.trim() && !updateTails.isPending ? "#fff" : "#9CA3AF",
                                }}
                            >
                                ➕ 추가
                            </button>
                        </div>

                        <button
                            onClick={openAiTailModal}
                            className="w-full h-9 bg-white border rounded-lg text-[11px] font-bold transition-all hover:-translate-y-px"
                            style={{ color: THEME.accent, borderColor: THEME.accent }}
                        >
                            ✨ AI 꼬리질문 제안 받기
                        </button>
                    </div>
                )}
            </div>

            {/* AI 꼬리질문 모달 */}
            {showAiTailModal && (
                <div
                    onClick={() => setShowAiTailModal(false)}
                    className="fixed inset-0 z-[200] flex items-center justify-center"
                    style={{ background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(4px)" }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl p-7 w-[520px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
                    >
                        <div className="text-[18px] font-extrabold text-ink mb-1">✨ AI 꼬리질문 제안</div>
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
                                    >
                                        <span className="text-[13px] font-medium text-ink leading-[1.6]">{s}</span>
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

            {/* AI 분석 사이드 패널 */}
            {showQAiPanel && (
                <div className="fixed top-0 right-0 bottom-0 w-[440px] bg-white border-l border-line flex flex-col shadow-[-8px_0_24px_rgba(15,23,42,0.08)] z-50">
                    <div className="px-4 py-4 border-b border-line flex-shrink-0 flex items-center justify-between">
                        <div>
                            <div className="text-[14px] font-extrabold text-ink tracking-tight">✨ AI 분석</div>
                            <div className="text-[11px] font-medium text-ink-secondary mt-0.5">
                                🏫 {selSchoolFilter} · Q{questions.findIndex((q) => q.id === selQ.id) + 1}
                            </div>
                        </div>
                        <button
                            onClick={() => setShowQAiPanel(false)}
                            className="text-ink-muted hover:text-ink text-base w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* 🎯 1차/2차 탭 - 각 답변 존재 여부에 따라 활성/비활성 */}
                    <div className="flex border-b border-line flex-shrink-0">
                        <button
                            onClick={() => handleSwitchTab("first")}
                            disabled={!canUseFirstTab}
                            className="flex-1 py-2.5 text-center text-[12px] font-bold transition-all border-b-2 disabled:cursor-not-allowed"
                            style={{
                                color: !canUseFirstTab
                                    ? "#D1D5DB"
                                    : qAiTab === "first"
                                        ? THEME.accentDark
                                        : "#9CA3AF",
                                borderColor: qAiTab === "first" ? THEME.accent : "transparent",
                                background: qAiTab === "first" ? THEME.accentBg : "transparent",
                            }}
                        >
                            📊 1차 답변 분석
                            {!canUseFirstTab && <div className="text-[9px]">첫 답변 필요</div>}
                        </button>
                        <button
                            onClick={() => handleSwitchTab("upgrade")}
                            disabled={!canUseUpgradeTab}
                            className="flex-1 py-2.5 text-center text-[12px] font-bold transition-all border-b-2 disabled:cursor-not-allowed"
                            style={{
                                color: !canUseUpgradeTab
                                    ? "#D1D5DB"
                                    : qAiTab === "upgrade"
                                        ? THEME.accentDark
                                        : "#9CA3AF",
                                borderColor: qAiTab === "upgrade" ? THEME.accent : "transparent",
                                background: qAiTab === "upgrade" ? THEME.accentBg : "transparent",
                            }}
                        >
                            📈 2차 답변 분석
                            {!canUseUpgradeTab && <div className="text-[9px]">업그레이드 필요</div>}
                        </button>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-3">
                        {analyzeAnswer.isPending && !currentResult && (
                            <div className="text-center py-10">
                                <div className="text-3xl mb-3 animate-pulse">🤖</div>
                                <div className="text-[13px] font-bold text-ink-secondary">분석 중...</div>
                            </div>
                        )}

                        {!analyzeAnswer.isPending && !currentResult && (
                            <div className="flex-1 flex items-center justify-center text-ink-muted text-[13px] font-medium py-10">
                                {qAiTab === "upgrade" && !canUseUpgradeTab
                                    ? "2차 답변이 아직 없어요."
                                    : qAiTab === "first" && !canUseFirstTab
                                        ? "1차 답변이 아직 없어요."
                                        : "분석 데이터가 없어요."}
                            </div>
                        )}

                        {currentResult && (
                            <>
                                {/* 종합 점수 */}
                                <div
                                    className="rounded-xl px-4 py-3.5"
                                    style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: THEME.accent }}>
                                            📊 종합 점수
                                        </div>
                                        <div className="text-[24px] font-extrabold" style={{ color: THEME.accentDark }}>
                                            {currentResult.totalScore}
                                            <span className="text-[12px] text-ink-muted">/100</span>
                                        </div>
                                    </div>
                                    {currentResult.summary && (
                                        <div className="text-[11.5px] leading-[1.6] mt-1" style={{ color: THEME.accentDark }}>
                                            {currentResult.summary}
                                        </div>
                                    )}
                                </div>

                                {/* 평가 3축 */}
                                {currentResult.scores && currentResult.scores.length > 0 && (
                                    <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-ink mb-2">
                                            📐 평가 3축
                                        </div>
                                        <div className="space-y-2">
                                            {currentResult.scores.map((s, i) => (
                                                <div key={i}>
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-[11px] font-bold text-ink-secondary">{s.label}</span>
                                                        <span className="text-[11px] font-extrabold" style={{ color: THEME.accent }}>
                                                            {s.score}/{s.max}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-0.5">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{ width: `${(s.score / s.max) * 100}%`, background: THEME.accent }}
                                                        />
                                                    </div>
                                                    <div className="text-[10px] text-ink-muted leading-[1.4]">{s.desc}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 강점 */}
                                {currentResult.strengths && currentResult.strengths.length > 0 && (
                                    <div
                                        className="rounded-xl px-4 py-3.5"
                                        style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                                    >
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <span className="text-sm">✅</span>
                                            <div className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: THEME.accent }}>
                                                강점
                                            </div>
                                        </div>
                                        <ul className="space-y-1">
                                            {currentResult.strengths.map((item, i) => (
                                                <li
                                                    key={i}
                                                    className="text-[12px] font-medium leading-[1.6] flex gap-1.5"
                                                    style={{ color: THEME.accentDark }}
                                                >
                                                    <span>•</span>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* 보완할 점 */}
                                {currentResult.improvements && currentResult.improvements.length > 0 && (
                                    <div className="rounded-xl px-4 py-3.5 bg-amber-50 border border-amber-200">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <span className="text-sm">⚠️</span>
                                            <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
                                                보완할 점
                                            </div>
                                        </div>
                                        <ul className="space-y-1">
                                            {currentResult.improvements.map((item, i) => (
                                                <li
                                                    key={i}
                                                    className="text-[12px] font-medium leading-[1.6] flex gap-1.5 text-amber-800"
                                                >
                                                    <span>•</span>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* 🤔 사유하는 질문 */}
                                {currentResult.reflectiveQuestions && currentResult.reflectiveQuestions.length > 0 && (
                                    <div className="rounded-xl px-4 py-3.5 bg-blue-50 border border-blue-200">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <span className="text-sm">🤔</span>
                                            <div className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
                                                사유하는 질문
                                            </div>
                                        </div>
                                        <ul className="space-y-1.5">
                                            {currentResult.reflectiveQuestions.map((q, i) => (
                                                <li
                                                    key={i}
                                                    className="text-[12px] font-medium leading-[1.6] flex gap-1.5 text-blue-900"
                                                >
                                                    <span className="font-bold flex-shrink-0">Q{i + 1}.</span>
                                                    <span>{q}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* ✨ AI 자동 작성 (항상 펼쳐짐 - 기출문제 스타일) */}
                                {currentResult.teacherDraft && (
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
                                            위 분석을 바탕으로 선생님 말투의 {qAiTab === "upgrade" ? "최종" : "1차"} 피드백을 자동으로 작성해드릴게요. 클릭하면 작성창에 자동 입력돼요.
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3 text-[12px] leading-[1.7] text-ink whitespace-pre-wrap mb-3">
                                            {currentResult.teacherDraft}
                                        </div>
                                        <button
                                            onClick={() => {
                                                const draft = currentResult.teacherDraft;
                                                if (qAiTab === "upgrade") {
                                                    setFinalFbText(draft);
                                                } else {
                                                    setTeacherFbText(draft);
                                                }
                                                setShowQAiPanel(false);
                                            }}
                                            className="w-full h-10 text-white rounded-lg text-[12px] font-bold transition-all hover:-translate-y-px"
                                            style={{
                                                background: THEME.accent,
                                                boxShadow: `0 4px 12px ${THEME.accentShadow}`,
                                            }}
                                        >
                                            ✏️ 선생님 {qAiTab === "upgrade" ? "최종" : "1차"} 답변 작성하기
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}