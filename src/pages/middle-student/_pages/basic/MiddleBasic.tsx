// src/pages/middle-student/_pages/basic/MiddleBasic.tsx
// 중등 기본 인성질문 학생용 - MiddlePast.tsx 구조 + 학교 자동 고정
// 진로 컨셉 카드 접기/펼치기 토글

import { useState, useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { studentState, academyState } from "@/lib/auth/atoms";
import { supabase } from "@/lib/supabase";
import {
    useSchoolQuestions,
    useMyPastAnswers,
    usePastFeedback,
    useSubmitPastAnswer,
    useSubmitPastUpgrade,
    useSubmitPastTailAnswer,
} from "@/pages/middle-student/_hooks/useMyPast";
import { useDraftAutoSave, type DraftStatus } from "@/pages/middle-student/_hooks/useDraftAutoSave";

// 🔥 기본 인성질문 고정 학교
const BASIC_SCHOOL = "기본 인성";

const TYPE_COLOR: Record<string, string> = {
    자기이해: "bg-brand-middle-bg text-brand-middle-dark border-brand-middle-light",
    지원동기: "bg-[#EEF2FF] text-[#3B5BDB] border-[#BAC8FF]",
    학교생활: "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
    진로: "bg-amber-50 text-amber-700 border-amber-200",
    사회시사: "bg-orange-50 text-orange-700 border-orange-200",
    // 백업
    지원동기2: "bg-[#EEF2FF] text-[#3B5BDB] border-[#BAC8FF]",
    자기주도: "bg-brand-middle-bg text-brand-middle-dark border-brand-middle-light",
    활동계획: "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
    인성: "bg-amber-50 text-amber-700 border-amber-200",
};

const STEP_LABELS = ["첫 답변", "1차 피드백", "업그레이드", "최종 피드백", "꼬리질문"];

async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function DraftStatusIndicator({ status, lastSavedAt }: { status: DraftStatus; lastSavedAt: Date | null }) {
    if (status === "idle") return null;
    if (status === "saving")
        return (
            <span className="text-[10px] text-ink-muted flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                저장 중...
            </span>
        );
    if (status === "error")
        return (
            <span className="text-[10px] text-red-500 flex items-center gap-1">
                <span>⚠️</span>저장 실패
            </span>
        );
    return (
        <span className="text-[10px] text-emerald-600 flex items-center gap-1">
            <span>✓</span>자동 저장됨
            {lastSavedAt && (
                <span className="text-ink-muted">
                    ({lastSavedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })})
                </span>
            )}
        </span>
    );
}

function MicSTTBtn({ studentId, onTranscript }: { studentId: string | undefined; onTranscript: (text: string) => void }) {
    const [recording, setRecording] = useState(false);
    const [processing, setProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioStreamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        return () => {
            if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach((t) => t.stop());
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;
            const recorder = new MediaRecorder(stream);
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            recorder.start();
            mediaRecorderRef.current = recorder;
            setRecording(true);
        } catch {
            alert("🎙️ 마이크 권한이 필요해요.");
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
                if (audioStreamRef.current) { audioStreamRef.current.getTracks().forEach((t) => t.stop()); audioStreamRef.current = null; }
                resolve(blob);
            };
            recorder.stop();
        });
        try {
            const blob = await blobPromise;
            if (!studentId) { alert("로그인 정보가 없어요"); setProcessing(false); return; }
            const audioBase64 = await blobToBase64(blob);
            const { data, error } = await supabase.functions.invoke("middle-stt-short", { body: { audioBase64 } });
            if (error || !data?.success) { alert("음성 변환 실패"); setProcessing(false); return; }
            const transcript = data?.text || "";
            if (transcript) onTranscript(transcript);
            else alert("음성을 인식하지 못했어요.");
        } catch (e: any) {
            alert("STT 처리 오류: " + e.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <button onClick={recording ? stopRecording : startRecording} disabled={processing}
            title={recording ? "녹음 종료" : processing ? "변환 중..." : "음성으로 답변"}
            className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 text-base transition-all ${recording ? "bg-red-50 border-red-200 text-red-500 hover:bg-red-100 animate-pulse" : processing ? "bg-amber-50 border-amber-200 text-amber-600 cursor-wait" : "bg-brand-middle-pale border-brand-middle-light text-brand-middle-dark hover:bg-brand-middle-bg"}`}>
            {recording ? "⏹" : processing ? "⏳" : "🎙️"}
        </button>
    );
}

const SubmitBtn = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) => (
    <button onClick={onClick} disabled={disabled}
        className={`w-[108px] h-9 rounded-lg text-[12px] font-semibold flex-shrink-0 transition-all ${!disabled ? "bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle" : "bg-gray-100 text-ink-muted cursor-not-allowed"}`}>
        {label}
    </button>
);

function Step1AnswerBox({ studentId, questionId, existingAnswer, editingMode, onSubmit, onCancel, isPending }: any) {
    const disabled = !!existingAnswer && !editingMode;
    const initialValue = editingMode && existingAnswer ? existingAnswer : "";
    const { text, setText, status, lastSavedAt, clearDraft } = useDraftAutoSave(studentId, `basic:answer:${questionId}`, initialValue, disabled);
    return (
        <>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="답변을 작성하거나 마이크로 녹음해주세요." rows={4}
                className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted" />
            <div className="flex items-center mt-2">
                <DraftStatusIndicator status={status} lastSavedAt={lastSavedAt} />
                <div className="flex gap-2 ml-auto">
                    {editingMode && <button onClick={onCancel} className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-medium hover:bg-gray-50">취소</button>}
                    <MicSTTBtn studentId={studentId} onTranscript={(t) => setText(text ? text + " " + t : t)} />
                    <SubmitBtn label={isPending ? "제출 중..." : editingMode ? "수정 완료" : "답변 제출"} onClick={() => onSubmit(text, clearDraft)} disabled={!text.trim() || isPending} />
                </div>
            </div>
        </>
    );
}

function Step3UpgradeBox({ studentId, questionId, existingUpgrade, editingMode, onSubmit, onCancel, isPending }: any) {
    const disabled = !!existingUpgrade && !editingMode;
    const initialValue = editingMode && existingUpgrade ? existingUpgrade : "";
    const { text, setText, status, lastSavedAt, clearDraft } = useDraftAutoSave(studentId, `basic:upgraded:${questionId}`, initialValue, disabled);
    return (
        <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[12px] text-amber-700 font-medium mb-2">
                💡 선생님 피드백을 반영해서 답변을 업그레이드해보세요!
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="피드백을 반영한 업그레이드 답변을 작성해주세요..." rows={4}
                className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted" />
            <div className="flex items-center mt-2">
                <DraftStatusIndicator status={status} lastSavedAt={lastSavedAt} />
                <div className="flex gap-2 ml-auto">
                    {editingMode && <button onClick={onCancel} className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-medium hover:bg-gray-50">취소</button>}
                    <MicSTTBtn studentId={studentId} onTranscript={(t) => setText(text ? text + " " + t : t)} />
                    <SubmitBtn label={isPending ? "제출 중..." : editingMode ? "수정 완료" : "업그레이드 제출"} onClick={() => onSubmit(text, clearDraft)} disabled={!text.trim() || isPending} />
                </div>
            </div>
        </>
    );
}

function Step5TailBox({ studentId, questionId, tailIndex, onSubmit, isPending }: any) {
    const { text, setText, status, lastSavedAt, clearDraft } = useDraftAutoSave(studentId, `basic:tail:${questionId}:${tailIndex}`, "");
    return (
        <div className="bg-gray-50 rounded-lg px-3 py-2.5">
            <div className="text-[10px] text-ink-muted mb-1.5">꼬리질문 답변</div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="꼬리질문에 대한 답변을 작성해주세요..." rows={2}
                className="w-full border border-line rounded-md px-2.5 py-2 text-[12px] leading-[1.6] resize-none bg-white focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted" />
            <div className="flex items-center mt-2">
                <DraftStatusIndicator status={status} lastSavedAt={lastSavedAt} />
                <div className="flex gap-2 ml-auto">
                    <MicSTTBtn studentId={studentId} onTranscript={(t) => setText(text ? text + " " + t : t)} />
                    <button onClick={() => onSubmit(text, clearDraft)} disabled={!text.trim() || isPending}
                        className={`w-[102px] h-[34px] rounded-md text-[12px] font-semibold transition-all ${text.trim() && !isPending ? "bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle" : "bg-gray-100 text-ink-muted cursor-not-allowed"}`}>
                        {isPending ? "제출 중..." : "제출"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────
export default function MiddleBasic() {
    const student = useAtomValue(studentState);
    const academy = useAtomValue(academyState);
    const studentId = student?.id ? String(student.id) : undefined;

    // 🔥 학교 고정 - useSchoolQuestions('기본 인성')
    const { data: questions = [] } = useSchoolQuestions(BASIC_SCHOOL);
    const { data: answers = [] } = useMyPastAnswers(studentId, BASIC_SCHOOL);

    const [concept, setConcept] = useState<any>(null);
    const [conceptOpen, setConceptOpen] = useState(false); // 진로 컨셉 접기/펼치기

    // 🔥 진로 컨셉 조회 (middle_student_concept)
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

    const getStep = (answer: any, fb: any) => {
        if (!answer?.answer) return 0;
        if (!fb?.teacher_first_feedback) return 1;
        if (!answer.upgraded_answer) return 2;
        if (!fb?.teacher_final_feedback) return 3;
        return 4;
    };

    const answeredCount = questions.filter((q) => answerByQuestionId[q.id]?.answer).length;

    const handleSubmitAnswer = async (text: string, clearDraft: () => Promise<void>) => {
        if (!text.trim() || !selQ) return;
        if (!student?.id || !academy?.academyId) { alert("로그인 정보를 불러오지 못했어요."); return; }
        try {
            await submitAnswer.mutateAsync({
                question_id: selQ.id,
                student_id: String(student.id),
                academy_id: String(academy.academyId),
                answer: text,
            });
            await clearDraft();
            setEditingStep1(false);
        } catch (e: any) { alert(`제출 실패: ${e.message}`); }
    };

    const handleSubmitUpgrade = async (text: string, clearDraft: () => Promise<void>) => {
        if (!text.trim() || !selAnswer) return;
        try {
            await submitUpgrade.mutateAsync({ answer_id: selAnswer.id, upgraded_answer: text });
            await clearDraft();
            setEditingStep3(false);
        } catch (e: any) { alert(`제출 실패: ${e.message}`); }
    };

    const handleSubmitTailAnswer = async (idx: number, text: string, clearDraft: () => Promise<void>) => {
        if (!text.trim() || !selAnswer) return;
        try {
            await submitTailAnswer.mutateAsync({ answer_id: selAnswer.id, tail_index: idx, answer: text });
            await clearDraft();
        } catch (e: any) { alert(`제출 실패: ${e.message}`); }
    };

    // 🔥 인쇄 - 최종 답변(업그레이드 있으면 업그레이드, 없으면 첫 답변) + 꼬리질문
    const printAnswers = async () => {
        const answeredQs = questions.filter((q) => answerByQuestionId[q.id]?.answer);
        if (answeredQs.length === 0) { alert("답변한 질문이 없어요!"); return; }

        const answerIds = answeredQs.map((q) => answerByQuestionId[q.id].id);

        // 한 번에 feedback 다 조회
        const { data: allFeedback } = await supabase
            .from("middle_past_feedback")
            .select("answer_id, tail_questions")
            .in("answer_id", answerIds);

        const feedbackMap = new Map((allFeedback || []).map((f: any) => [f.answer_id, f]));

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>기본 인성질문 최종 답변집</title>
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
<h1>중등 기본 인성질문 최종 답변집</h1>
<div class="sub">기본 인성질문 · 30개 · ${student?.name || ""}</div>
${answeredQs.map((q, i) => {
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
        <div className="flex flex-col gap-3 px-6 py-5 font-sans text-ink h-full overflow-y-auto">

            {/* 🔥 진로 컨셉 카드 (접기/펼치기) */}
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
                    <div className="text-[18px] font-extrabold text-ink tracking-tight">💎 기본 인성질문</div>
                    <div className="text-[12px] text-ink-muted mt-0.5">
                        {student?.name} · {academy?.academyName}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-brand-middle-bg text-brand-middle-dark text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-brand-middle-light">
                        {answeredCount}/{questions.length} 답변완료
                    </div>
                    <button onClick={printAnswers}
                        className="px-4 py-1.5 bg-white text-brand-middle-dark border border-brand-middle-light rounded-full text-[12px] font-semibold hover:bg-brand-middle-pale flex items-center gap-1.5 transition-all">
                        🖨️ 최종 답변집 인쇄
                    </button>
                </div>
            </div>

            {/* 학교 탭 자리 - 작은 알약 */}
            <div className="flex gap-1.5 flex-shrink-0 items-center">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-brand-middle">
                    💎 기본 인성질문 · {questions.length}개
                </span>
                <span className="text-[10px] text-gray-400 font-medium">모든 학교 공통</span>
            </div>

            <div className="flex gap-4 items-start">
                {/* 왼쪽: 질문 목록 */}
                <div className="w-[360px] flex-shrink-0 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                    <div className="px-3.5 py-3 border-b border-line flex-shrink-0">
                        <div className="text-[14px] font-bold text-ink tracking-tight">💎 기본 인성질문</div>
                        <div className="text-[11px] text-ink-secondary mt-1">
                            총 <span className="text-brand-middle-dark font-bold">{questions.length}개</span> · 답변완료{" "}
                            <span className="text-brand-middle-dark font-bold">{answeredCount}개</span>
                        </div>
                    </div>

                    <div className="px-3 py-2.5">
                        {questions.length === 0 ? (
                            <div className="text-center py-10 text-ink-muted text-[12px]">
                                <div className="text-3xl mb-2">📝</div>기본 인성질문이 없어요.
                            </div>
                        ) : (
                            questions.map((q, i) => {
                                const typeClass = TYPE_COLOR[q.type] || TYPE_COLOR["자기이해"];
                                const ans = answerByQuestionId[q.id];
                                const answered = !!ans?.answer;
                                return (
                                    <div key={q.id} onClick={() => setSelQId(q.id)}
                                        className={`border rounded-xl px-3.5 py-3 mb-1.5 cursor-pointer transition-all ${selQId === q.id ? "border-brand-middle bg-brand-middle-pale shadow-[0_4px_16px_rgba(16,185,129,0.12)]" : "border-line bg-white hover:border-brand-middle-light hover:shadow-sm"}`}>
                                        <div className="flex gap-1 mb-1.5">
                                            <span className="text-[10px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full">Q{i + 1}</span>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeClass}`}>{q.type}</span>
                                        </div>
                                        <div className="text-[12px] text-ink leading-relaxed font-semibold mb-1.5">{q.text}</div>
                                        {answered ? (
                                            <span className="text-[10px] font-semibold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full border border-brand-middle-light">답변완료</span>
                                        ) : (
                                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">미답변</span>
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
                            <div className="text-4xl">💎</div>
                            <div className="text-[14px] font-semibold text-ink-secondary">질문을 선택해주세요</div>
                            <div className="text-[12px]">왼쪽에서 기본 인성질문을 클릭하면 답변을 작성할 수 있어요</div>
                        </div>
                    ) : (
                        <>
                            <div className="px-4 py-3.5 border-b border-line flex-shrink-0">
                                <div className="flex items-center justify-between mb-2.5">
                                    <div className="flex items-center gap-2">
                                        <div className="text-[13px] font-semibold text-ink">Q{questions.findIndex((q) => q.id === selQ.id) + 1}</div>
                                        <span className="text-[11px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full">기본 인성</span>
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLOR[selQ.type] || TYPE_COLOR["자기이해"]}`}>{selQ.type}</span>
                                    </div>
                                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${selAnswer?.answer ? "bg-brand-middle-bg text-brand-middle-dark border-brand-middle-light" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
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
                                                <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-semibold z-10 relative ${isDone || isOn ? "bg-brand-middle text-white border border-brand-middle" : "bg-gray-100 text-ink-muted border border-line"}`}>
                                                    {isDone ? "✓" : stepNum}
                                                </div>
                                                <div className={`text-[10px] whitespace-nowrap ${isDone || isOn ? "text-brand-middle-dark font-semibold" : "text-ink-muted font-medium"}`}>{label}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 py-3.5 flex flex-col gap-3">
                                <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                                    <div className="text-[10px] font-semibold text-ink-muted mb-1">기본 인성 질문</div>
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
                                            <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] mb-2 whitespace-pre-wrap">{selAnswer.answer}</div>
                                            <div className="flex justify-end">
                                                <button onClick={() => setEditingStep1(true)} className="text-[11px] font-medium text-ink-secondary bg-white border border-line rounded-md px-2.5 py-1 hover:border-brand-middle-light hover:text-brand-middle-dark transition-all">✏️ 수정</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Step1AnswerBox studentId={studentId} questionId={selQ.id} existingAnswer={selAnswer?.answer ?? null} editingMode={editingStep1} onSubmit={handleSubmitAnswer} onCancel={() => setEditingStep1(false)} isPending={submitAnswer.isPending} />
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
                                            <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 text-[13px] text-[#065F46] leading-[1.8] whitespace-pre-wrap">{selFeedback.teacher_first_feedback}</div>
                                        ) : (
                                            <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">선생님 피드백을 기다리는 중이에요.</div>
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
                                                <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] mb-2 whitespace-pre-wrap">{selAnswer.upgraded_answer}</div>
                                                <div className="flex justify-end">
                                                    <button onClick={() => setEditingStep3(true)} className="text-[11px] font-medium text-ink-secondary bg-white border border-line rounded-md px-2.5 py-1 hover:border-brand-middle-light hover:text-brand-middle-dark transition-all">✏️ 수정</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Step3UpgradeBox studentId={studentId} questionId={selQ.id} existingUpgrade={selAnswer?.upgraded_answer ?? null} editingMode={editingStep3} onSubmit={handleSubmitUpgrade} onCancel={() => setEditingStep3(false)} isPending={submitUpgrade.isPending} />
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
                                            <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 text-[13px] text-[#065F46] leading-[1.8] whitespace-pre-wrap">{selFeedback.teacher_final_feedback}</div>
                                        ) : (
                                            <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">선생님 최종 피드백을 기다리는 중이에요.</div>
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
                                                    <span className="text-[10px] font-bold text-brand-middle-dark bg-brand-middle-bg px-1.5 py-0.5 rounded-full flex-shrink-0 mt-[1px]">꼬리 {i + 1}</span>
                                                    {t.text}
                                                </div>
                                                {t.answer ? (
                                                    <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2 text-[12.5px] text-[#065F46] leading-[1.7] whitespace-pre-wrap">{t.answer}</div>
                                                ) : (
                                                    <Step5TailBox studentId={studentId} questionId={selQ.id} tailIndex={i} onSubmit={(text: any, clearDraft: any) => handleSubmitTailAnswer(i, text, clearDraft)} isPending={submitTailAnswer.isPending} />
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