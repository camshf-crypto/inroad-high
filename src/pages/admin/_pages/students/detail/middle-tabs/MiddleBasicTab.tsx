// src/pages/admin/_pages/students/detail/middle-tabs/MiddleBasicTab.tsx
// 어드민 중등 기본 인성질문 탭
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
} from "@/pages/admin/_hooks/middle/useMiddleBasic";

const TYPE_COLOR: Record<string, string> = {
  자기이해: "bg-emerald-50 text-emerald-700 border-emerald-200",
  지원동기: "bg-indigo-50 text-indigo-700 border-indigo-200",
  학교생활: "bg-purple-50 text-purple-700 border-purple-200",
  진로: "bg-amber-50 text-amber-700 border-amber-200",
  사회시사: "bg-orange-50 text-orange-700 border-orange-200",
};

const STEP_LABELS = ["첫 답변", "1차 피드백", "업그레이드", "최종 피드백", "꼬리질문"];

interface Props {
  student: {
    id: string;
    name: string;
    grade?: string;
    [k: string]: any;
  };
}

export default function MiddleBasicTab({ student }: Props) {
  const studentId = String(student.id);

  const { data: questions = [] } = useMiddleBasicQuestions();
  const { data: answers = [] } = useStudentBasicAnswers(studentId);

  const [concept, setConcept] = useState<any>(null);

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

  const answerByQuestionId = answers.reduce((acc: Record<string, any>, a: any) => {
    acc[a.question_id] = a;
    return acc;
  }, {});

  const [selQId, setSelQId] = useState<string | null>(null);
  const selQ = questions.find((q: any) => q.id === selQId) ?? null;
  const selAnswer = selQ ? answerByQuestionId[selQ.id] : null;

  const { data: selFeedback } = useBasicFeedback(selAnswer?.id);

  // 피드백 입력 상태
  const [firstFbText, setFirstFbText] = useState("");
  const [finalFbText, setFinalFbText] = useState("");
  const [newTailText, setNewTailText] = useState("");
  const [editingTailIdx, setEditingTailIdx] = useState<number | null>(null);
  const [editingTailText, setEditingTailText] = useState("");

  // 선택된 질문 바뀌면 피드백 입력 상태 동기화
  useEffect(() => {
    setFirstFbText(selFeedback?.teacher_first_feedback || "");
    setFinalFbText(selFeedback?.teacher_final_feedback || "");
    setNewTailText("");
    setEditingTailIdx(null);
  }, [selQId, selFeedback]);

  const submitFirst = useSubmitFirstFeedback();
  const submitFinal = useSubmitFinalFeedback();
  const addTail = useAddTailQuestion();
  const editTail = useEditTailQuestion();
  const deleteTail = useDeleteTailQuestion();

  const getStep = (answer: any, fb: any) => {
    if (!answer?.answer) return 0;
    if (!fb?.teacher_first_feedback) return 1;
    if (!answer.upgraded_answer) return 2;
    if (!fb?.teacher_final_feedback) return 3;
    return 4;
  };

  const answeredCount = questions.filter((q: any) => answerByQuestionId[q.id]?.answer).length;

  const handleSubmitFirstFb = async () => {
    if (!firstFbText.trim() || !selAnswer) return;
    try {
      await submitFirst.mutateAsync({ answer_id: selAnswer.id, feedback: firstFbText });
      alert("✓ 1차 피드백 저장 완료");
    } catch (e: any) {
      alert("저장 실패: " + e.message);
    }
  };

  const handleSubmitFinalFb = async () => {
    if (!finalFbText.trim() || !selAnswer) return;
    try {
      await submitFinal.mutateAsync({ answer_id: selAnswer.id, feedback: finalFbText });
      alert("✓ 최종 피드백 저장 완료");
    } catch (e: any) {
      alert("저장 실패: " + e.message);
    }
  };

  const handleAddTail = async () => {
    if (!newTailText.trim() || !selAnswer) return;
    try {
      await addTail.mutateAsync({ answer_id: selAnswer.id, tail_text: newTailText });
      setNewTailText("");
    } catch (e: any) {
      alert("추가 실패: " + e.message);
    }
  };

  const handleEditTail = async (idx: number) => {
    if (!editingTailText.trim() || !selAnswer) return;
    try {
      await editTail.mutateAsync({
        answer_id: selAnswer.id,
        tail_index: idx,
        new_text: editingTailText,
      });
      setEditingTailIdx(null);
    } catch (e: any) {
      alert("수정 실패: " + e.message);
    }
  };

  const handleDeleteTail = async (idx: number) => {
    if (!selAnswer) return;
    if (!confirm("이 꼬리질문을 삭제할까요?")) return;
    try {
      await deleteTail.mutateAsync({ answer_id: selAnswer.id, tail_index: idx });
    } catch (e: any) {
      alert("삭제 실패: " + e.message);
    }
  };

  // 🔥 PDF 인쇄 - 최종 답변 + 꼬리질문
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
<div class="sub">중등 · 기본 인성질문 30개 · ${student.grade || ""}</div>
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
    ${tails.length > 0 ? `
      <div class="tail-section">
        <div class="tail-label">🎯 꼬리질문</div>
        ${tails.map((t: any, ti: number) => `
          <div class="tail-block">
            <div class="tail-q">꼬리 ${ti + 1}. ${t.text}</div>
            ${t.answer ? `<div class="tail-a">${t.answer}</div>` : `<div class="tail-empty">⏳ 미답변</div>`}
          </div>
        `).join("")}
      </div>
    ` : ""}
  </div>`;
}).join("")}
<div class="footer">비커스 · 중등 기본 인성질문 답변집</div>
<script>window.onload=()=>{window.print()}</script></body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden font-sans text-ink">

      {/* 진로 컨셉 카드 */}
      {concept && concept.type_name && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 via-purple-50 to-pink-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex-shrink-0">
          <span className="text-2xl">🎯</span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">학생 진로 컨셉</div>
            <div className="flex items-center gap-2 flex-wrap text-[12px]">
              <span className="font-bold text-ink bg-white px-2 py-0.5 rounded-full border border-emerald-200">
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
                  <span className="text-emerald-600 font-semibold">
                    {concept.keywords.map((k: string) => `#${k}`).join(" ")}
                  </span>
                </>
              )}
            </div>
            {concept.custom_goal && (
              <div className="text-[11px] text-ink-secondary mt-1 italic">📝 {concept.custom_goal}</div>
            )}
          </div>
        </div>
      )}

      {/* 헤더 - 작은 알약 + 답변완료 카운트 + 인쇄 */}
      <div className="flex gap-2 flex-shrink-0 items-center">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-emerald-600">
          💎 기본 인성질문 · 30개
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

      <div className="flex gap-4 flex-1 overflow-hidden">

        {/* 좌측 질문 목록 */}
        <div className="w-[340px] flex-shrink-0 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-gray-100 flex-shrink-0">
            <div className="text-[13px] font-bold text-ink">💎 기본 인성질문</div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              총 <span className="text-emerald-700 font-bold">{questions.length}개</span> · 답변완료{" "}
              <span className="text-emerald-700 font-bold">{answeredCount}개</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2.5 py-2">
            {questions.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-[12px]">
                <div className="text-2xl mb-2">📝</div>질문이 없어요.
              </div>
            ) : (
              questions.map((q: any, i: number) => {
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
                    {answered ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">답변완료</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">미답변</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 우측 상세 */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl flex flex-col overflow-hidden">
          {!selQ ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
              <div className="text-3xl">💎</div>
              <div className="text-[13px] font-semibold">질문을 선택해주세요</div>
              <div className="text-[11px]">왼쪽에서 질문을 클릭하면 답변과 피드백을 볼 수 있어요</div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-semibold text-ink">Q{questions.findIndex((q: any) => q.id === selQ.id) + 1}</div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">기본 인성</span>
                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full border ${TYPE_COLOR[selQ.type] || TYPE_COLOR["자기이해"]}`}>{selQ.type}</span>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${selAnswer?.answer ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
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

                {/* Step 1: 학생 첫 답변 (읽기 전용) */}
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

                {/* Step 2: 1차 피드백 (입력) */}
                {selAnswer?.answer && (
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full">Step 2</span>
                      <span className="text-[11px] text-gray-500 font-medium">1차 피드백 작성</span>
                    </div>
                    <textarea value={firstFbText} onChange={(e) => setFirstFbText(e.target.value)}
                      placeholder="1차 피드백을 작성해주세요..."
                      rows={4}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all" />
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={handleSubmitFirstFb} disabled={!firstFbText.trim() || submitFirst.isPending}
                        className={`px-4 h-9 rounded-lg text-[12px] font-bold transition-all ${firstFbText.trim() && !submitFirst.isPending ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                        {submitFirst.isPending ? "저장중..." : selFeedback?.teacher_first_feedback ? "수정 완료" : "1차 피드백 저장"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: 학생 업그레이드 답변 (읽기 전용) */}
                {selFeedback?.teacher_first_feedback && (
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-gray-500 px-2 py-0.5 rounded-full">Step 3</span>
                      <span className="text-[11px] text-gray-500 font-medium">학생 업그레이드 답변</span>
                    </div>
                    {selAnswer?.upgraded_answer ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] whitespace-pre-wrap">{selAnswer.upgraded_answer}</div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-gray-400 text-center">학생이 아직 업그레이드 답변을 작성하지 않았어요.</div>
                    )}
                  </div>
                )}

                {/* Step 4: 최종 피드백 (입력) */}
                {selAnswer?.upgraded_answer && (
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full">Step 4</span>
                      <span className="text-[11px] text-gray-500 font-medium">최종 피드백 작성</span>
                    </div>
                    <textarea value={finalFbText} onChange={(e) => setFinalFbText(e.target.value)}
                      placeholder="최종 피드백을 작성해주세요..."
                      rows={4}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all" />
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={handleSubmitFinalFb} disabled={!finalFbText.trim() || submitFinal.isPending}
                        className={`px-4 h-9 rounded-lg text-[12px] font-bold transition-all ${finalFbText.trim() && !submitFinal.isPending ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                        {submitFinal.isPending ? "저장중..." : selFeedback?.teacher_final_feedback ? "수정 완료" : "최종 피드백 저장"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 5: 꼬리질문 추가/수정 */}
                {selFeedback?.teacher_final_feedback && (
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full">Step 5</span>
                      <span className="text-[11px] text-gray-500 font-medium">꼬리질문</span>
                    </div>

                    {/* 기존 꼬리질문 목록 */}
                    {Array.isArray(selFeedback?.tail_questions) && selFeedback.tail_questions.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {selFeedback.tail_questions.map((t: any, i: number) => (
                          <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                            <div className="flex items-start gap-2 mb-1.5">
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full flex-shrink-0">꼬리 {i + 1}</span>
                              {editingTailIdx === i ? (
                                <div className="flex-1">
                                  <textarea value={editingTailText} onChange={(e) => setEditingTailText(e.target.value)}
                                    rows={2}
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
                                <div className="text-[9px] font-bold text-emerald-700 mb-0.5">✓ 학생 답변</div>
                                {t.answer}
                              </div>
                            ) : (
                              <div className="text-[10px] text-gray-400 italic mt-1">⏳ 학생 답변 대기 중</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 새 꼬리질문 추가 */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                      <div className="text-[10px] font-bold text-emerald-700 mb-1.5">+ 꼬리질문 추가</div>
                      <textarea value={newTailText} onChange={(e) => setNewTailText(e.target.value)}
                        placeholder="추가할 꼬리질문을 작성해주세요..."
                        rows={2}
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
    </div>
  );
}