// src/pages/admin/_pages/students/detail/middle-tabs/MiddleBasicTab.tsx
// 어드민 중등 기본 인성질문 탭 - AI 분석(스피치구조 + 진로 컨셉) 추가
// useMiddleBasic.ts hook 사용

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  useMiddleBasicQuestions,
  useStudentBasicAnswers,
  useBasicFeedback,
  useSubmitFirstFeedback,
  useSubmitFinalFeedback,
  useAddTailQuestion,
  useEditTailQuestion,
  useDeleteTailQuestion,
  useMiddleBasicAIAnalyze,
  useMiddleBasicAICompare,
  useMiddleBasicSuggestFeedback,
  MIDDLE_BASIC_AI_LIMIT,
  type MiddleBasicAnalysisData,
  type MiddleBasicSecondData,
} from "@/pages/admin/_hooks/middle/useMiddleBasic";

const TYPE_COLOR: Record<string, string> = {
  자기이해: "bg-emerald-50 text-emerald-700 border-emerald-200",
  지원동기: "bg-indigo-50 text-indigo-700 border-indigo-200",
  학교생활: "bg-purple-50 text-purple-700 border-purple-200",
  진로: "bg-amber-50 text-amber-700 border-amber-200",
  사회시사: "bg-orange-50 text-orange-700 border-orange-200",
};

const STEP_LABELS = ["첫 답변", "1차 피드백", "업그레이드", "최종 피드백", "꼬리질문"];
const AI_PANEL_WIDTH = 440;

const matchColor = (level?: string) =>
  level === "높음"
    ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
    : level === "보통"
    ? "bg-amber-100 text-amber-700 border border-amber-300"
    : "bg-red-100 text-red-700 border border-red-300";

interface Props {
  student: { id: string; name: string; grade?: string; [k: string]: any };
}

export default function MiddleBasicTab({ student }: Props) {
  const studentId = String(student.id);

  const { data: questions = [] } = useMiddleBasicQuestions();
  const { data: answers = [] } = useStudentBasicAnswers(studentId);

  const [concept, setConcept] = useState<any>(null);

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

  const answerByQuestionId = answers.reduce((acc: Record<string, any>, a: any) => {
    acc[a.question_id] = a;
    return acc;
  }, {});

  const [selQId, setSelQId] = useState<string | null>(null);
  const selQ = questions.find((q: any) => q.id === selQId) ?? null;
  const selAnswer = selQ ? answerByQuestionId[selQ.id] : null;

  const { data: selFeedback } = useBasicFeedback(selAnswer?.id);

  const [firstFbText, setFirstFbText] = useState("");
  const [finalFbText, setFinalFbText] = useState("");
  const [newTailText, setNewTailText] = useState("");
  const [editingTailIdx, setEditingTailIdx] = useState<number | null>(null);
  const [editingTailText, setEditingTailText] = useState("");

  // AI 패널 상태
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTab, setAiTab] = useState<"first" | "second">("first");
  const [aiData, setAiData] = useState<MiddleBasicAnalysisData | null>(null);
  const [secondData, setSecondData] = useState<MiddleBasicSecondData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [secondAiLoading, setSecondAiLoading] = useState(false);
  const [aiSuggestLoading, setAiSuggestLoading] = useState<"first" | "final" | null>(null);
  const [selectedTails, setSelectedTails] = useState<number[]>([]);
  const [showTailModal, setShowTailModal] = useState(false);
  const [tailCandidates, setTailCandidates] = useState<string[]>([]);
  const [tailGenLoading, setTailGenLoading] = useState(false);

  useEffect(() => {
    setFirstFbText(selFeedback?.teacher_first_feedback || "");
    setFinalFbText(selFeedback?.teacher_final_feedback || "");
    setNewTailText("");
    setEditingTailIdx(null);
  }, [selQId, selFeedback]);

  useEffect(() => {
    setShowAiPanel(false);
    setAiData(null);
    setSecondData(null);
    setAiTab("first");
    setSelectedTails([]);
    setShowTailModal(false);
    setTailCandidates([]);
  }, [selQId]);

  const submitFirst = useSubmitFirstFeedback();
  const submitFinal = useSubmitFinalFeedback();
  const addTail = useAddTailQuestion();
  const editTail = useEditTailQuestion();
  const deleteTail = useDeleteTailQuestion();

  const aiAnalyze = useMiddleBasicAIAnalyze();
  const aiCompare = useMiddleBasicAICompare();
  const aiSuggest = useMiddleBasicSuggestFeedback();

  const getStep = (answer: any, fb: any) => {
    if (!answer?.answer) return 0;
    if (!fb?.teacher_first_feedback) return 1;
    if (!answer.upgraded_answer) return 2;
    if (!fb?.teacher_final_feedback) return 3;
    return 4;
  };

  const answeredCount = questions.filter((q: any) => answerByQuestionId[q.id]?.answer).length;

  // 저장된 AI 분석 불러오기 (ai_analysis jsonb)
  const savedAi = (selFeedback?.ai_analysis || {}) as any;

  const openAiAnalysis = async (tab: "first" | "second" = "first") => {
    if (!selQ || !selAnswer) return;
    setShowAiPanel(true);
    setAiTab(tab);

    if (tab === "first") {
      if (!selAnswer.answer) { alert("학생이 먼저 답변을 제출해야 합니다."); return; }
      if (savedAi.first?.structureCheck) { setAiData(savedAi.first); return; }
      setAiLoading(true);
      try {
        const result = await aiAnalyze.mutateAsync({
          questionId: selQ.id,
          question: selQ.text,
          studentAnswer: selAnswer.answer,
          answerId: selAnswer.id,
          studentId,
        });
        setAiData(result);
      } catch (e: any) {
        alert("AI 분석 실패:\n" + (e?.message || "알 수 없는 오류"));
      } finally {
        setAiLoading(false);
      }
    } else {
      if (!selAnswer.upgraded_answer) { alert("학생이 2차(업그레이드) 답변을 먼저 제출해야 합니다."); return; }
      if (savedAi.second?.beforeDistribution) { setSecondData(savedAi.second); return; }
      setSecondAiLoading(true);
      try {
        const result = await aiCompare.mutateAsync({
          questionId: selQ.id,
          question: selQ.text,
          firstAnswer: selAnswer.answer,
          secondAnswer: selAnswer.upgraded_answer,
          firstAnalysisJson: savedAi.first || aiData,
          studentId,
          answerId: selAnswer.id,
        });
        setSecondData(result);
      } catch (e: any) {
        alert("AI 비교 분석 실패:\n" + (e?.message || "알 수 없는 오류"));
      } finally {
        setSecondAiLoading(false);
      }
    }
  };

  const generateAIFeedback = async () => {
    if (!selQ || !selAnswer?.answer) return;
    const type = aiTab === "first" ? "first" : "final";
    const analysisForSuggest = aiTab === "first" ? (aiData || savedAi.first) : (secondData || savedAi.second);
    if (!analysisForSuggest) { alert("AI 분석을 먼저 실행해주세요."); return; }

    setAiSuggestLoading(type);
    try {
      const draft = await aiSuggest.mutateAsync({
        questionId: selQ.id,
        question: selQ.text,
        studentAnswer: selAnswer.answer,
        secondAnswer: type === "final" ? selAnswer.upgraded_answer || "" : undefined,
        aiAnalysis: analysisForSuggest,
        feedbackType: type,
        studentId,
      });
      if (type === "first") setFirstFbText(draft);
      else setFinalFbText(draft);
      alert(`✏️ AI가 ${type === "first" ? "1차" : "최종"} 피드백 초안을 작성했어요!\n${type === "first" ? "Step 2" : "Step 4"}에서 확인 후 수정하고 저장해주세요.`);
    } catch (e: any) {
      alert("AI 답변 작성 실패:\n" + (e?.message || "알 수 없는 오류"));
    } finally {
      setAiSuggestLoading(null);
    }
  };

  const handleSubmitFirstFb = async () => {
    if (!firstFbText.trim() || !selAnswer) return;
    try { await submitFirst.mutateAsync({ answer_id: selAnswer.id, feedback: firstFbText }); alert("✓ 1차 피드백 저장 완료"); }
    catch (e: any) { alert("저장 실패: " + e.message); }
  };
  const handleSubmitFinalFb = async () => {
    if (!finalFbText.trim() || !selAnswer) return;
    try { await submitFinal.mutateAsync({ answer_id: selAnswer.id, feedback: finalFbText }); alert("✓ 최종 피드백 저장 완료"); }
    catch (e: any) { alert("저장 실패: " + e.message); }
  };
  const handleAddTail = async () => {
    if (!newTailText.trim() || !selAnswer) return;
    try { await addTail.mutateAsync({ answer_id: selAnswer.id, tail_text: newTailText }); setNewTailText(""); }
    catch (e: any) { alert("추가 실패: " + e.message); }
  };
  const handleEditTail = async (idx: number) => {
    if (!editingTailText.trim() || !selAnswer) return;
    try { await editTail.mutateAsync({ answer_id: selAnswer.id, tail_index: idx, new_text: editingTailText }); setEditingTailIdx(null); }
    catch (e: any) { alert("수정 실패: " + e.message); }
  };
  const handleDeleteTail = async (idx: number) => {
    if (!selAnswer) return;
    if (!confirm("이 꼬리질문을 삭제할까요?")) return;
    try { await deleteTail.mutateAsync({ answer_id: selAnswer.id, tail_index: idx }); }
    catch (e: any) { alert("삭제 실패: " + e.message); }
  };

  // 🔥 Step5 "AI 꼬리질문 생성" 버튼 - 최종답변 기준 꼬리질문 생성 (2차 분석과 별개, 자체 1회 제한)
  const openTailGenModal = async () => {
    if (!selQ || !selAnswer) return;
    if (!selAnswer.upgraded_answer) {
      alert("학생이 최종(업그레이드) 답변을 먼저 제출해야 꼬리질문을 만들 수 있어요.");
      return;
    }
    setShowTailModal(true);
    setSelectedTails([]);

    // 이미 2차 분석/꼬리질문 생성에서 만든 꼬리질문이 있으면 재사용 (토큰 0)
    const existing = savedAi.tailQuestions || savedAi.second?.tailSuggestions || secondData?.tailSuggestions;
    if (Array.isArray(existing) && existing.length > 0) {
      setTailCandidates(existing);
      return;
    }

    // 꼬리질문 전용 1회 제한 (2차 분석 카운트와 별개)
    if (savedAi.tailGenerated) {
      alert("이미 AI 꼬리질문을 생성했어요. 추가로 필요하면 아래에서 직접 작성해주세요.");
      setShowTailModal(false);
      return;
    }

    setTailGenLoading(true);
    try {
      const result = await aiCompare.mutateAsync({
        questionId: selQ.id,
        question: selQ.text,
        firstAnswer: selAnswer.answer,
        secondAnswer: selAnswer.upgraded_answer,
        firstAnalysisJson: savedAi.first || aiData,
        studentId,
        answerId: selAnswer.id,
        skipCount: true, // 2차 분석 카운트 증가 안 함 (꼬리질문 전용 호출)
      } as any);
      setSecondData(result);
      const tails = result.tailSuggestions || [];
      setTailCandidates(tails);

      // 꼬리질문 결과를 ai_analysis에 별도 저장 + 생성 플래그
      const { data: row } = await supabase
        .from("middle_past_feedback")
        .select("id, ai_analysis")
        .eq("answer_id", selAnswer.id)
        .maybeSingle();
      const mergedAi = { ...(row?.ai_analysis || {}), tailQuestions: tails, tailGenerated: true };
      if (row?.id) {
        await supabase.from("middle_past_feedback").update({ ai_analysis: mergedAi }).eq("id", row.id);
      } else {
        await supabase.from("middle_past_feedback").insert({ answer_id: selAnswer.id, ai_analysis: mergedAi });
      }
    } catch (e: any) {
      alert("꼬리질문 생성 실패:\n" + (e?.message || "알 수 없는 오류"));
      setShowTailModal(false);
    } finally {
      setTailGenLoading(false);
    }
  };

  // 모달에서 선택한 꼬리질문 Step5에 일괄 추가
  const addSelectedTails = async () => {
    if (!selAnswer || selectedTails.length === 0) return;
    try {
      for (const idx of selectedTails) {
        const text = tailCandidates[idx];
        if (text) await addTail.mutateAsync({ answer_id: selAnswer.id, tail_text: text });
      }
      setSelectedTails([]);
      setShowTailModal(false);
      alert("✓ 선택한 꼬리질문을 추가했어요!");
    } catch (e: any) {
      alert("추가 실패: " + e.message);
    }
  };

  const printAnswers = async () => {
    const answeredQs = questions.filter((q: any) => answerByQuestionId[q.id]?.answer);
    if (answeredQs.length === 0) { alert("답변한 질문이 없어요!"); return; }
    const answerIds = answeredQs.map((q: any) => answerByQuestionId[q.id].id);
    const { data: allFeedback } = await supabase
      .from("middle_past_feedback")
      .select("answer_id, tail_questions")
      .in("answer_id", answerIds);
    const feedbackMap = new Map((allFeedback || []).map((f: any) => [f.answer_id, f]));

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${student.name} - 기본 인성 답변집</title>
<style>
body{font-family:'Malgun Gothic',sans-serif;padding:16px 24px;color:#1a1a1a;max-width:800px;margin:0 auto;font-size:11px;}
h1{font-size:15px;font-weight:700;margin-bottom:2px;}
.sub{font-size:11px;color:#6B7280;margin-bottom:10px;padding-bottom:8px;border-bottom:1.5px solid #1a1a1a;}
.block{margin-bottom:14px;padding-bottom:10px;border-bottom:0.5px solid #E5E7EB;}
.q-text{font-size:12px;font-weight:700;margin-bottom:6px;line-height:1.4;color:#065F46;}
.label{font-size:10px;font-weight:600;color:#6B7280;margin-bottom:3px;margin-top:6px;}
.label-final{font-size:10px;font-weight:700;color:#059669;margin-bottom:3px;margin-top:6px;}
.answer-box{background:#F8F9FA;border-radius:4px;padding:6px 9px;font-size:11px;line-height:1.6;white-space:pre-wrap;}
.answer-box-final{background:#ECFDF5;border:1px solid #6EE7B7;border-radius:4px;padding:6px 9px;font-size:11px;line-height:1.6;white-space:pre-wrap;}
.tail-section{margin-top:8px;padding-top:6px;border-top:0.5px dashed #D1D5DB;}
.tail-label{font-size:10px;font-weight:700;color:#7C3AED;margin-bottom:4px;}
.tail-block{margin-bottom:6px;padding-left:8px;border-left:2px solid #DDD6FE;}
.tail-q{font-size:11px;font-weight:600;color:#1a1a1a;margin-bottom:2px;line-height:1.4;}
.tail-a{background:#F5F3FF;border-radius:3px;padding:4px 7px;font-size:10.5px;line-height:1.5;white-space:pre-wrap;color:#1a1a1a;}
.tail-empty{font-size:10px;color:#9CA3AF;font-style:italic;padding:2px 4px;}
.footer{text-align:center;font-size:10px;color:#9CA3AF;margin-top:12px;padding-top:8px;border-top:0.5px solid #E5E7EB;}
@media print{body{padding:10px 16px;}.block{page-break-inside:avoid;}}
</style></head><body>
<h1>${student.name} - 기본 인성질문 최종 답변집</h1>
<div class="sub">중등 · 기본 인성질문 · ${student.grade || ""}</div>
${answeredQs.map((q: any, i: number) => {
  const ans = answerByQuestionId[q.id];
  const isUpgraded = !!ans.upgraded_answer;
  const finalAnswer = ans.upgraded_answer || ans.answer;
  const fb: any = feedbackMap.get(ans.id);
  const tails = (fb?.tail_questions || []) as any[];
  return `<div class="block">
    <div class="q-text">Q${i + 1}. ${q.text}</div>
    <div class="${isUpgraded ? "label-final" : "label"}">${isUpgraded ? "✓ 최종 답변 (업그레이드 완료)" : "내 답변 (1차)"}</div>
    <div class="${isUpgraded ? "answer-box-final" : "answer-box"}">${finalAnswer}</div>
    ${tails.length > 0 ? `<div class="tail-section"><div class="tail-label">🎯 꼬리질문</div>
      ${tails.map((t: any, ti: number) => `<div class="tail-block"><div class="tail-q">꼬리 ${ti + 1}. ${t.text}</div>
        ${t.answer ? `<div class="tail-a">${t.answer}</div>` : `<div class="tail-empty">⏳ 미답변</div>`}</div>`).join("")}
      </div>` : ""}
  </div>`;
}).join("")}
<div class="footer">비커스 · 중등 기본 인성질문 답변집</div>
<script>window.onload=()=>{window.print()}</script></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  const step = getStep(selAnswer, selFeedback);
  const firstCount = savedAi.firstCount || 0;
  const secondCount = savedAi.secondCount || 0;

  return (
    <div className="flex flex-col gap-3 font-sans text-ink"
      style={{ paddingRight: showAiPanel ? AI_PANEL_WIDTH + 16 : 0, transition: "padding-right 0.2s ease" }}>

      {/* 진로 컨셉 카드 */}
      {concept && concept.type_name && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 via-purple-50 to-pink-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex-shrink-0">
          <span className="text-2xl">🎯</span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">학생 진로 컨셉</div>
            <div className="flex items-center gap-2 flex-wrap text-[12px]">
              <span className="font-bold text-ink bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                {concept.type_name}{concept.type_code && <span className="text-ink-muted ml-1">({concept.type_code}형)</span>}
              </span>
              <span className="text-ink-muted">·</span>
              <span className="font-semibold text-ink">📚 {concept.major || "미정"}</span>
              <span className="text-ink-muted">→</span>
              <span className="text-ink-secondary">💼 {concept.career || "미정"}</span>
              {Array.isArray(concept.keywords) && concept.keywords.length > 0 && (
                <><span className="text-ink-muted">·</span>
                <span className="text-emerald-600 font-semibold">{concept.keywords.map((k: string) => `#${k}`).join(" ")}</span></>
              )}
            </div>
            {concept.custom_goal && <div className="text-[11px] text-ink-secondary mt-1 italic">📝 {concept.custom_goal}</div>}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex gap-2 flex-shrink-0 items-center">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-emerald-600">
          💎 기본 인성질문 · {questions.length}개
        </span>
        <span className="text-[10px] text-gray-400 font-medium">모든 학교 공통</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {answeredCount}/{questions.length} 답변완료
          </span>
          <button onClick={printAnswers}
            className="px-3 py-1 text-[11px] font-semibold text-emerald-700 bg-white border border-emerald-300 rounded-full hover:bg-emerald-50 transition-all">
            🖨️ PDF 다운로드
          </button>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* 좌측 질문 목록 */}
        <div className="w-[340px] flex-shrink-0 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-gray-100 flex-shrink-0">
            <div className="text-[13px] font-bold text-ink">💎 기본 인성질문</div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              총 <span className="text-emerald-700 font-bold">{questions.length}개</span> · 답변완료 <span className="text-emerald-700 font-bold">{answeredCount}개</span>
            </div>
          </div>
          <div className="px-2.5 py-2">
            {questions.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-[12px]"><div className="text-2xl mb-2">📝</div>질문이 없어요.</div>
            ) : questions.map((q: any, i: number) => {
              const typeClass = TYPE_COLOR[q.type] || TYPE_COLOR["자기이해"];
              const ans = answerByQuestionId[q.id];
              const answered = !!ans?.answer;
              return (
                <div key={q.id} onClick={() => setSelQId(q.id)}
                  className={`border rounded-lg px-3 py-2.5 mb-1.5 cursor-pointer transition-all ${selQId === q.id ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-white hover:border-emerald-200"}`}>
                  <div className="flex gap-1 mb-1.5">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">Q{i + 1}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${typeClass}`}>{q.type}</span>
                  </div>
                  <div className="text-[12px] text-ink leading-relaxed font-semibold mb-1.5">{q.text}</div>
                  {answered
                    ? <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">답변완료</span>
                    : <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">미답변</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* 우측 상세 */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden min-w-0 sticky top-3" style={{ height: "calc(100vh - 120px)" }}>
          {!selQ ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
              <div className="text-3xl">💎</div>
              <div className="text-[13px] font-semibold">질문을 선택해주세요</div>
              <div className="text-[11px]">왼쪽에서 질문을 클릭하면 답변과 피드백을 볼 수 있어요</div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-between mb-2.5 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-semibold text-ink">Q{questions.findIndex((q: any) => q.id === selQ.id) + 1}</div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">기본 인성</span>
                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full border ${TYPE_COLOR[selQ.type] || TYPE_COLOR["자기이해"]}`}>{selQ.type}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    {selAnswer?.answer && (
                      <button onClick={() => { if (showAiPanel) { setShowAiPanel(false); } else openAiAnalysis("first"); }}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border"
                        style={{ background: showAiPanel ? "#059669" : "#ECFDF5", color: showAiPanel ? "#fff" : "#059669", borderColor: "#059669" }}>
                        ✨ AI 분석 {showAiPanel ? "닫기" : "보기"}
                      </button>
                    )}
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${selAnswer?.answer ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {selAnswer?.answer ? "답변완료" : "미답변"}
                    </span>
                  </div>
                </div>

                <div className="flex">
                  {STEP_LABELS.map((label, i) => {
                    const stepNum = i + 1;
                    const isDone = stepNum < step;
                    const isOn = stepNum === step;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                        {i < 4 && <div className={`absolute top-[11px] left-[55%] w-[90%] h-px ${isDone ? "bg-emerald-500" : "bg-gray-200"}`} />}
                        <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-semibold z-10 relative ${isDone || isOn ? "bg-emerald-500 text-white border border-emerald-500" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>
                          {isDone ? "✓" : stepNum}
                        </div>
                        <div className={`text-[10px] whitespace-nowrap ${isDone || isOn ? "text-emerald-700 font-semibold" : "text-gray-400 font-medium"}`}>{label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 bg-gray-50">
                {/* 질문 */}
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                  <div className="text-[10px] font-semibold text-gray-500 mb-1">기본 인성 질문</div>
                  <div className="text-[14px] font-semibold text-ink leading-[1.6]">{selQ.text}</div>
                </div>

                {/* Step 1 */}
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-bold text-white bg-gray-500 px-2 py-0.5 rounded-full">Step 1</span>
                    <span className="text-[11px] text-gray-500 font-medium">학생 첫 답변</span>
                  </div>
                  {selAnswer?.answer ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] whitespace-pre-wrap">{selAnswer.answer}</div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-gray-400 text-center">학생이 아직 답변하지 않았어요.</div>
                  )}
                </div>

                {/* Step 2 */}
                {selAnswer?.answer && (
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full">Step 2</span>
                      <span className="text-[11px] text-gray-500 font-medium">1차 피드백 작성</span>
                    </div>
                    <textarea value={firstFbText} onChange={(e) => setFirstFbText(e.target.value)}
                      placeholder="1차 피드백을 작성하거나, 우측 'AI 분석' 후 'AI 답변 작성하기' 버튼을 활용하세요..."
                      rows={5}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all" />
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={handleSubmitFirstFb} disabled={!firstFbText.trim() || submitFirst.isPending}
                        className={`px-4 h-9 rounded-lg text-[12px] font-bold transition-all ${firstFbText.trim() && !submitFirst.isPending ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                        {submitFirst.isPending ? "저장중..." : selFeedback?.teacher_first_feedback ? "수정 완료" : "1차 피드백 저장"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3 */}
                {selFeedback?.teacher_first_feedback && (
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-gray-500 px-2 py-0.5 rounded-full">Step 3</span>
                      <span className="text-[11px] text-gray-500 font-medium">학생 업그레이드 답변</span>
                      {selAnswer?.upgraded_answer && (
                        <button onClick={() => { if (showAiPanel && aiTab === "second") setShowAiPanel(false); else openAiAnalysis("second"); }}
                          className="ml-auto px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border"
                          style={{ background: showAiPanel && aiTab === "second" ? "#059669" : "#ECFDF5", color: showAiPanel && aiTab === "second" ? "#fff" : "#059669", borderColor: "#059669" }}>
                          ✨ 2차 AI 분석 {showAiPanel && aiTab === "second" ? "닫기" : "보기"}
                        </button>
                      )}
                    </div>
                    {selAnswer?.upgraded_answer ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] whitespace-pre-wrap">{selAnswer.upgraded_answer}</div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-gray-400 text-center">학생이 아직 업그레이드 답변을 작성하지 않았어요.</div>
                    )}
                  </div>
                )}

                {/* Step 4 */}
                {selAnswer?.upgraded_answer && (
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full">Step 4</span>
                      <span className="text-[11px] text-gray-500 font-medium">최종 피드백 작성</span>
                    </div>
                    <textarea value={finalFbText} onChange={(e) => setFinalFbText(e.target.value)}
                      placeholder="최종 피드백을 작성하거나, 우측 '2차 AI 분석' 후 'AI 답변 작성하기' 버튼을 활용하세요..."
                      rows={5}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all" />
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={handleSubmitFinalFb} disabled={!finalFbText.trim() || submitFinal.isPending}
                        className={`px-4 h-9 rounded-lg text-[12px] font-bold transition-all ${finalFbText.trim() && !submitFinal.isPending ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                        {submitFinal.isPending ? "저장중..." : selFeedback?.teacher_final_feedback ? "수정 완료" : "최종 피드백 저장"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 5 꼬리질문 */}
                {selFeedback?.teacher_final_feedback && (
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full">Step 5</span>
                      <span className="text-[11px] text-gray-500 font-medium">꼬리질문</span>
                      <button onClick={openTailGenModal} disabled={!selAnswer?.upgraded_answer}
                        className={`ml-auto px-3 py-1 rounded-md text-[11px] font-bold transition-all border ${selAnswer?.upgraded_answer ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100" : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"}`}>
                        ✨ AI 꼬리질문 생성
                      </button>
                    </div>
                    {Array.isArray(selFeedback?.tail_questions) && selFeedback.tail_questions.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {selFeedback.tail_questions.map((t: any, i: number) => (
                          <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                            <div className="flex items-start gap-2 mb-1.5">
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full flex-shrink-0">꼬리 {i + 1}</span>
                              {editingTailIdx === i ? (
                                <div className="flex-1">
                                  <textarea value={editingTailText} onChange={(e) => setEditingTailText(e.target.value)} rows={2}
                                    className="w-full border border-emerald-300 rounded px-2 py-1 text-[12px] outline-none focus:border-emerald-500 resize-none" />
                                  <div className="flex gap-1 mt-1 justify-end">
                                    <button onClick={() => setEditingTailIdx(null)} className="text-[10px] px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-500">취소</button>
                                    <button onClick={() => handleEditTail(i)} className="text-[10px] px-2 py-0.5 bg-emerald-600 text-white rounded">저장</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex-1 text-[12px] text-ink leading-[1.5]">{t.text}</div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button onClick={() => { setEditingTailIdx(i); setEditingTailText(t.text); }} className="text-[10px] text-gray-500 hover:text-emerald-600">✏️</button>
                                    <button onClick={() => handleDeleteTail(i)} className="text-[10px] text-gray-500 hover:text-red-600">🗑️</button>
                                  </div>
                                </>
                              )}
                            </div>
                            {t.answer ? (
                              <div className="bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1.5 text-[12px] text-emerald-900 leading-[1.6] whitespace-pre-wrap mt-1">
                                <div className="text-[9px] font-bold text-emerald-700 mb-0.5">✓ 학생 답변</div>{t.answer}
                              </div>
                            ) : (
                              <div className="text-[10px] text-gray-400 italic mt-1">⏳ 학생 답변 대기 중</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                      <div className="text-[10px] font-bold text-emerald-700 mb-1.5">+ 꼬리질문 추가</div>
                      <textarea value={newTailText} onChange={(e) => setNewTailText(e.target.value)}
                        placeholder="추가할 꼬리질문을 작성해주세요..." rows={2}
                        className="w-full border border-emerald-300 rounded px-2.5 py-1.5 text-[12px] outline-none focus:border-emerald-500 resize-none" />
                      <div className="flex justify-end mt-1.5">
                        <button onClick={handleAddTail} disabled={!newTailText.trim() || addTail.isPending}
                          className={`px-3 h-7 rounded text-[11px] font-bold transition-all ${newTailText.trim() && !addTail.isPending ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                          {addTail.isPending ? "추가중..." : "+ 추가"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 우측 AI 분석 패널 */}
      {showAiPanel && selQ && (
        <div className="bg-white border-l border-gray-200 flex flex-col"
          style={{ position: "fixed", top: 50, right: 0, bottom: 0, width: AI_PANEL_WIDTH, boxShadow: "-4px 0 16px rgba(0,0,0,0.05)", zIndex: 90 }}>
          <div className="px-5 py-3.5 border-b border-gray-200 flex-shrink-0 flex items-center justify-between bg-emerald-50">
            <div>
              <div className="text-[14px] font-extrabold tracking-tight text-emerald-700">✨ AI 분석</div>
              <div className="text-[11px] font-medium text-gray-500 mt-0.5">{student.name} · Q{questions.findIndex((q: any) => q.id === selQ.id) + 1} (기본 인성)</div>
            </div>
            <button onClick={() => setShowAiPanel(false)} className="text-gray-500 text-lg w-7 h-7 flex items-center justify-center rounded-md bg-white hover:bg-gray-50">✕</button>
          </div>

          <div className="flex border-b border-gray-200 flex-shrink-0">
            <button onClick={() => { setAiTab("first"); openAiAnalysis("first"); }}
              className="flex-1 py-3 text-center text-[12px] transition-all"
              style={{ fontWeight: aiTab === "first" ? 700 : 500, color: aiTab === "first" ? "#059669" : "#6B7280", borderBottom: `2px solid ${aiTab === "first" ? "#059669" : "transparent"}` }}>
              <div>🎤 1차 답변 분석</div>
              <div className="text-[9px] text-gray-400 mt-0.5 font-medium">{firstCount}/{MIDDLE_BASIC_AI_LIMIT}회 사용</div>
            </button>
            <button onClick={() => { if (selAnswer?.upgraded_answer) { setAiTab("second"); openAiAnalysis("second"); } }} disabled={!selAnswer?.upgraded_answer}
              className="flex-1 py-3 text-center text-[12px] transition-all disabled:cursor-not-allowed"
              style={{ fontWeight: aiTab === "second" ? 700 : 500, color: !selAnswer?.upgraded_answer ? "#D1D5DB" : aiTab === "second" ? "#059669" : "#6B7280", borderBottom: `2px solid ${aiTab === "second" ? "#059669" : "transparent"}` }}>
              <div>📈 2차 답변 분석</div>
              <div className="text-[9px] text-gray-400 mt-0.5 font-medium">{!selAnswer?.upgraded_answer ? "업그레이드 필요" : `${secondCount}/${MIDDLE_BASIC_AI_LIMIT}회 사용`}</div>
            </button>
          </div>

          {/* 1차 분석 */}
          {aiTab === "first" && (
            aiLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
                <div className="text-4xl animate-pulse">✨</div><div className="text-[13px]">AI가 분석 중이에요...</div>
              </div>
            ) : !aiData ? (
              <div className="flex-1 flex items-center justify-center text-[13px] text-gray-400 px-5 text-center leading-[1.7]">
                AI 분석을 시작하려면<br />위쪽 "✨ AI 분석 보기" 버튼을 눌러주세요
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                {/* 스피치 구조 */}
                {aiData.structureCheck && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="text-[13px] font-extrabold mb-1 flex items-center gap-1.5 text-emerald-700">🎤 스피치 구조 분석</div>
                    <div className="text-[11px] text-gray-500 mb-3"><span className="font-bold text-emerald-600">{aiData.structureCheck.speechType}</span> 유형 기준으로 분석했어요</div>
                    <div className="flex items-center gap-2 mb-3.5">
                      <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${matchColor(aiData.structureCheck.matchLevel)}`}>
                        구조 충실도: {aiData.structureCheck.matchLevel} ({aiData.structureCheck.score}점)
                      </span>
                    </div>
                    <div className="mb-3">
                      <div className="text-[11px] font-bold text-emerald-700 mb-1.5">✓ 잘 들어간 구조 요소</div>
                      <div className="flex flex-col gap-1">{aiData.structureCheck.covered.map((c, i) => (
                        <div key={i} className="text-[12px] text-gray-900 leading-[1.6] px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-md">{c}</div>))}</div>
                    </div>
                    <div className="mb-3">
                      <div className="text-[11px] font-bold text-gray-700 mb-1.5">📋 구조 종합 피드백</div>
                      <div className="text-[12px] text-gray-900 leading-[1.7] px-3 py-2.5 bg-white border border-gray-200 rounded-md">{aiData.structureCheck.structureFeedback}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold mb-1.5 text-emerald-600">💡 구조에 맞게 보완하는 법</div>
                      <div className="text-[12px] text-gray-900 leading-[1.7] px-3 py-2.5 rounded-md bg-emerald-50 border border-emerald-200">{aiData.structureCheck.improvement}</div>
                    </div>
                  </div>
                )}

                {/* 진로 컨셉 */}
                {aiData.conceptCheck && (
                  <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4">
                    <div className="text-[13px] font-extrabold text-violet-700 mb-1 flex items-center gap-1.5">🎯 진로 · 직업 일치 검증</div>
                    <div className="text-[11px] text-gray-500 mb-3">학생의 진로/직업과 답변의 정합성을 분석했어요</div>
                    <div className="flex items-center gap-2 mb-3.5">
                      <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${matchColor(aiData.conceptCheck.matchLevel)}`}>
                        {aiData.conceptCheck.isAligned ? "✓" : "✗"} 일치도: {aiData.conceptCheck.matchLevel}
                      </span>
                    </div>
                    <div className="mb-3">
                      <div className="text-[11px] font-bold text-emerald-700 mb-1.5">💚 진로/직업과 일치하는 부분</div>
                      <div className="text-[12px] text-gray-900 leading-[1.7] px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-md">{aiData.conceptCheck.alignmentReason}</div>
                    </div>
                    <div className="mb-3">
                      <div className="text-[11px] font-bold text-red-600 mb-1.5">⚠️ 어긋나거나 부족한 부분</div>
                      <div className="text-[12px] text-gray-900 leading-[1.7] px-3 py-2.5 bg-red-50 border border-red-200 rounded-md">{aiData.conceptCheck.misalignment}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-violet-700 mb-1.5">💡 진로/직업에 맞게 보완하는 법</div>
                      <div className="text-[12px] text-gray-900 leading-[1.7] px-3 py-2.5 bg-violet-50 border border-violet-200 rounded-md">{aiData.conceptCheck.improvement}</div>
                    </div>
                  </div>
                )}

                {/* 종합 분석 */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="text-[13px] font-extrabold text-gray-900 mb-1">📊 AI 종합 분석</div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mt-2 mb-3.5">
                    <div className="text-[11px] font-bold text-amber-800 mb-1">■ 평가 요약</div>
                    <div className="text-[12px] text-amber-800 leading-[1.7]">{aiData.summary}</div>
                  </div>
                  <div className="mb-3.5">
                    <div className="text-[12px] font-extrabold text-green-600 mb-2">💪 강점 포인트</div>
                    {aiData.strengths.map((s, i) => (<div key={i} className="text-[12px] text-gray-900 leading-[1.6] px-3 py-1.5 bg-green-50 border border-green-200 rounded-md mb-1.5">{s}</div>))}
                  </div>
                  <div>
                    <div className="text-[12px] font-extrabold text-red-500 mb-2">⚡ 개선 포인트</div>
                    {aiData.improvements.map((s, i) => (<div key={i} className="text-[12px] text-gray-900 leading-[1.6] px-3 py-1.5 bg-red-50 border border-red-200 rounded-md mb-1.5">{s}</div>))}
                  </div>
                </div>
              </div>
            )
          )}

          {/* 2차 분석 */}
          {aiTab === "second" && (
            secondAiLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
                <div className="text-4xl animate-pulse">✨</div><div className="text-[13px]">AI가 2차 답변을 분석 중이에요...</div>
              </div>
            ) : !secondData ? (
              <div className="flex-1 flex items-center justify-center text-[13px] text-gray-400 px-5 text-center leading-[1.7]">
                2차 분석을 시작하려면<br />Step 3의 "✨ 2차 AI 분석 보기" 버튼을 눌러주세요
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="text-[13px] font-extrabold text-emerald-800 mb-1">✅ 1차 vs 2차 구조 충족도 비교</div>
                  <div className="text-[11px] text-gray-500 mb-3.5">스피치 구조 요소별로 1차 → 2차 답변의 충족도 변화예요.</div>
                  {secondData.beforeDistribution.map((b, i) => {
                    const after = secondData.afterDistribution.find(a => a.factorCode === b.factorCode);
                    const diff = (after?.distribution || 0) - b.distribution;
                    return (
                      <div key={i} className="mb-3 bg-white rounded-lg p-3 border border-emerald-200">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[12px] font-bold text-gray-900">{b.factorName}</span>
                          <span className="text-[11px] font-extrabold" style={{ color: diff > 0 ? "#059669" : diff < 0 ? "#EF4444" : "#6B7280" }}>
                            {diff > 0 ? `▲ +${diff}%` : diff < 0 ? `▼ ${diff}%` : "변동없음"}
                          </span>
                        </div>
                        <div className="mb-1.5">
                          <div className="text-[10px] text-gray-400 mb-0.5">1차 · {b.distribution}%</div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${b.distribution}%` }} /></div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400 mb-0.5">2차 · {after?.distribution || 0}%</div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${after?.distribution || 0}%` }} /></div>
                        </div>
                        {after?.evidence && <div className="text-[11px] text-gray-500 mt-2 leading-[1.5]">→ {after.evidence}</div>}
                      </div>
                    );
                  })}
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="text-[13px] font-extrabold text-gray-900 mb-1">✅ 구조 코멘트</div>
                  <div className="rounded-lg px-3 py-3 text-[13px] leading-[1.8] mt-2 bg-emerald-50 text-emerald-800 border border-emerald-200">{secondData.structureComment}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="text-[13px] font-extrabold text-gray-900 mb-1">✅ 모범 연습 답변</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-[13px] text-gray-900 leading-[1.9] italic mt-2">"{secondData.practiceAnswer}"</div>
                </div>
              </div>
            )
          )}

          {/* 하단: AI 피드백 초안 버튼 */}
          {((aiTab === "first" && (aiData || savedAi.first)) || (aiTab === "second" && (secondData || savedAi.second))) && (
            <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0 bg-gray-50">
              <button onClick={generateAIFeedback} disabled={aiSuggestLoading !== null}
                className="w-full py-3 text-white rounded-lg text-[13px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                {aiSuggestLoading !== null ? "✨ AI가 답변 작성 중..." : `✏️ 선생님 ${aiTab === "first" ? "1차" : "최종"} 답변 작성하기`}
              </button>
              <div className="text-[10px] text-gray-400 mt-1.5 text-center leading-[1.5]">분석 결과를 토대로 친근한 코치 말투 피드백을 {aiTab === "first" ? "Step 2" : "Step 4"}에 채워줘요</div>
            </div>
          )}
        </div>
      )}

      {/* AI 꼬리질문 선택 모달 */}
      {showTailModal && (
        <div onClick={() => setShowTailModal(false)} className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "rgba(15, 23, 42, 0.55)" }}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-7 w-[520px] max-h-[80vh] overflow-y-auto">
            <div className="text-[18px] font-extrabold text-gray-900 mb-1">✨ AI 꼬리질문 생성</div>
            <div className="text-[12px] text-gray-500 mb-5">최종 답변을 바탕으로 만든 꼬리질문이에요. 학생에게 줄 질문을 선택해주세요.</div>
            {tailGenLoading ? (
              <div className="text-center py-10 text-gray-400 text-[13px]"><div className="text-3xl mb-3 animate-pulse">✨</div>AI가 최종 답변을 분석해 꼬리질문을 만드는 중이에요...</div>
            ) : tailCandidates.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-[13px]">생성된 꼬리질문이 없어요.</div>
            ) : (
              <div className="flex flex-col gap-2 mb-5">
                {tailCandidates.map((t, i) => (
                  <button key={i} onClick={() => setSelectedTails(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                    className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-left transition-all border"
                    style={{ borderColor: selectedTails.includes(i) ? "#059669" : "#E5E7EB", background: selectedTails.includes(i) ? "#ECFDF5" : "#fff" }}>
                    <div className="w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ border: `2px solid ${selectedTails.includes(i) ? "#059669" : "#D1D5DB"}`, background: selectedTails.includes(i) ? "#059669" : "#fff" }}>
                      {selectedTails.includes(i) && <span className="text-[10px] text-white font-bold">✓</span>}
                    </div>
                    <span className="text-[13px] text-gray-900 leading-[1.6]">{t}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowTailModal(false)} className="flex-1 h-11 bg-white text-gray-500 border border-gray-200 rounded-lg text-[13px] font-semibold hover:bg-gray-50">취소</button>
              <button onClick={addSelectedTails} disabled={selectedTails.length === 0 || addTail.isPending || tailGenLoading}
                className={`flex-1 h-11 rounded-lg text-[13px] font-bold transition-all ${selectedTails.length > 0 && !addTail.isPending ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                {addTail.isPending ? "추가중..." : `선택한 ${selectedTails.length}개 추가`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}