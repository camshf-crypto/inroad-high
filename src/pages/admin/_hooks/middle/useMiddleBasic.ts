// src/pages/admin/_hooks/useMiddleBasic.ts
// 어드민 중등 기본 인성질문 hook 모음
// (studentId props로 받아서 학생 답변 조회 + 피드백 작성 + AI 분석)

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const BASIC_SCHOOL = "기본 인성";

// ─────────────────────────────────────────────
// 1. 기본 인성질문 조회
// ─────────────────────────────────────────────
export function useMiddleBasicQuestions() {
  return useQuery({
    queryKey: ["middle_past_questions", BASIC_SCHOOL],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("middle_past_questions")
        .select("*")
        .eq("school", BASIC_SCHOOL)
        .order("question_index", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

// ─────────────────────────────────────────────
// 2. 특정 학생의 기본 인성 답변 조회 (어드민용)
// ─────────────────────────────────────────────
export function useStudentBasicAnswers(studentId: string | undefined) {
  return useQuery({
    queryKey: ["middle_past_answers_admin", studentId, BASIC_SCHOOL],
    queryFn: async () => {
      if (!studentId) return [];

      const { data: questions } = await supabase
        .from("middle_past_questions")
        .select("id")
        .eq("school", BASIC_SCHOOL);

      const questionIds = (questions || []).map((q: any) => q.id);
      if (questionIds.length === 0) return [];

      const { data, error } = await supabase
        .from("middle_past_answers")
        .select("*")
        .eq("student_id", studentId)
        .in("question_id", questionIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!studentId,
  });
}

// ─────────────────────────────────────────────
// 3. 특정 답변의 피드백 조회
// ─────────────────────────────────────────────
export function useBasicFeedback(answerId: string | undefined) {
  return useQuery({
    queryKey: ["middle_past_feedback", answerId],
    queryFn: async () => {
      if (!answerId) return null;
      const { data, error } = await supabase
        .from("middle_past_feedback")
        .select("*")
        .eq("answer_id", answerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!answerId,
  });
}

// ─────────────────────────────────────────────
// 4. 1차 피드백 작성/수정
// ─────────────────────────────────────────────
export function useSubmitFirstFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      answer_id,
      feedback,
      teacher_id,
    }: {
      answer_id: string;
      feedback: string;
      teacher_id?: string;
    }) => {
      const { data: existing } = await supabase
        .from("middle_past_feedback")
        .select("id")
        .eq("answer_id", answer_id)
        .maybeSingle();

      const payload: any = {
        answer_id,
        teacher_first_feedback: feedback,
        teacher_first_at: new Date().toISOString(),
      };
      if (teacher_id) payload.teacher_first_id = teacher_id;

      if (existing) {
        const { error } = await supabase
          .from("middle_past_feedback")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("middle_past_feedback").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["middle_past_feedback", vars.answer_id] });
    },
  });
}

// ─────────────────────────────────────────────
// 5. 최종 피드백 작성/수정
// ─────────────────────────────────────────────
export function useSubmitFinalFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      answer_id,
      feedback,
      teacher_id,
    }: {
      answer_id: string;
      feedback: string;
      teacher_id?: string;
    }) => {
      const { data: existing } = await supabase
        .from("middle_past_feedback")
        .select("id")
        .eq("answer_id", answer_id)
        .maybeSingle();

      const payload: any = {
        answer_id,
        teacher_final_feedback: feedback,
        teacher_final_at: new Date().toISOString(),
      };
      if (teacher_id) payload.teacher_final_id = teacher_id;

      if (existing) {
        const { error } = await supabase
          .from("middle_past_feedback")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("middle_past_feedback").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["middle_past_feedback", vars.answer_id] });
    },
  });
}

// ─────────────────────────────────────────────
// 6. 꼬리질문 추가
// ─────────────────────────────────────────────
export function useAddTailQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      answer_id,
      tail_text,
    }: {
      answer_id: string;
      tail_text: string;
    }) => {
      const { data: existing } = await supabase
        .from("middle_past_feedback")
        .select("id, tail_questions")
        .eq("answer_id", answer_id)
        .maybeSingle();

      const currentTails = (existing?.tail_questions || []) as any[];
      const newTails = [...currentTails, { text: tail_text, answer: null }];

      if (existing) {
        const { error } = await supabase
          .from("middle_past_feedback")
          .update({ tail_questions: newTails })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("middle_past_feedback").insert({
          answer_id,
          tail_questions: newTails,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["middle_past_feedback", vars.answer_id] });
    },
  });
}

// ─────────────────────────────────────────────
// 7. 꼬리질문 수정
// ─────────────────────────────────────────────
export function useEditTailQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      answer_id,
      tail_index,
      new_text,
    }: {
      answer_id: string;
      tail_index: number;
      new_text: string;
    }) => {
      const { data: existing } = await supabase
        .from("middle_past_feedback")
        .select("id, tail_questions")
        .eq("answer_id", answer_id)
        .maybeSingle();

      if (!existing) throw new Error("피드백 row가 없어요");

      const currentTails = (existing.tail_questions || []) as any[];
      currentTails[tail_index] = {
        ...currentTails[tail_index],
        text: new_text,
      };

      const { error } = await supabase
        .from("middle_past_feedback")
        .update({ tail_questions: currentTails })
        .eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["middle_past_feedback", vars.answer_id] });
    },
  });
}

// ─────────────────────────────────────────────
// 8. 꼬리질문 삭제
// ─────────────────────────────────────────────
export function useDeleteTailQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      answer_id,
      tail_index,
    }: {
      answer_id: string;
      tail_index: number;
    }) => {
      const { data: existing } = await supabase
        .from("middle_past_feedback")
        .select("id, tail_questions")
        .eq("answer_id", answer_id)
        .maybeSingle();

      if (!existing) throw new Error("피드백 row가 없어요");

      const currentTails = (existing.tail_questions || []) as any[];
      const newTails = currentTails.filter((_, i) => i !== tail_index);

      const { error } = await supabase
        .from("middle_past_feedback")
        .update({ tail_questions: newTails })
        .eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["middle_past_feedback", vars.answer_id] });
    },
  });
}

// ═════════════════════════════════════════════
// 🔥 AI 분석 (스피치 구조 + 진로 컨셉)
// ═════════════════════════════════════════════

export interface MiddleStructureCheck {
  speechType: string;
  score: number;
  matchLevel: "높음" | "보통" | "낮음";
  covered: string[];
  missing?: string[];
  structureFeedback: string;
  improvement: string;
}

export interface MiddleConceptCheck {
  isAligned: boolean;
  matchLevel: "높음" | "보통" | "낮음";
  alignmentReason: string;
  misalignment: string;
  improvement: string;
}

export interface MiddleBasicAnalysisData {
  structureCheck: MiddleStructureCheck;
  summary: string;
  strengths: string[];
  improvements: string[];
  conceptCheck?: MiddleConceptCheck | null;
}

export interface MiddleBasicSecondData {
  beforeDistribution: Array<{ factorCode: string; factorName: string; distribution: number; evidence: string }>;
  afterDistribution: Array<{ factorCode: string; factorName: string; distribution: number; evidence: string }>;
  structureComment: string;
  practiceAnswer: string;
  tailSuggestions?: string[];
}

export const MIDDLE_BASIC_AI_LIMIT = 1;

// ai_analysis(jsonb)에 { first, firstCount, second, secondCount } 형태로 저장
async function getMiddleAiAnalysis(answerId: string) {
  const { data } = await supabase
    .from("middle_past_feedback")
    .select("id, ai_analysis")
    .eq("answer_id", answerId)
    .maybeSingle();
  return { rowId: data?.id as string | undefined, ai: (data?.ai_analysis || {}) as any };
}

async function saveMiddleAiAnalysis(answerId: string, patch: any) {
  const { rowId, ai } = await getMiddleAiAnalysis(answerId);
  const merged = { ...ai, ...patch };
  if (rowId) {
    await supabase.from("middle_past_feedback").update({ ai_analysis: merged }).eq("id", rowId);
  } else {
    await supabase.from("middle_past_feedback").insert({ answer_id: answerId, ai_analysis: merged });
  }
  return merged;
}

// ─────────────────────────────────────────────
// 9. 1차 AI 분석 (스피치구조 + 진로)
// ─────────────────────────────────────────────
export function useMiddleBasicAIAnalyze() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      questionId,
      question,
      studentAnswer,
      answerId,
      studentId,
    }: {
      questionId: string;
      question: string;
      studentAnswer: string;
      answerId?: string;
      studentId?: string;
    }): Promise<MiddleBasicAnalysisData> => {
      if (answerId) {
        const { ai } = await getMiddleAiAnalysis(answerId);
        if ((ai.firstCount || 0) >= MIDDLE_BASIC_AI_LIMIT) {
          throw new Error(`AI 분석은 최대 ${MIDDLE_BASIC_AI_LIMIT}회까지만 가능합니다.`);
        }
      }

      const { data, error } = await supabase.functions.invoke("middle-basic-analyze", {
        body: { questionId, question, studentAnswer, studentId },
      });

      if (error) throw new Error("AI 분석 호출 실패: " + error.message);
      if (!data?.success || !data?.analysis) {
        throw new Error("AI 응답이 없습니다: " + JSON.stringify(data).substring(0, 200));
      }

      const analysis = data.analysis as MiddleBasicAnalysisData;

      if (answerId) {
        const { ai } = await getMiddleAiAnalysis(answerId);
        await saveMiddleAiAnalysis(answerId, { first: analysis, firstCount: (ai.firstCount || 0) + 1 });
      }
      return analysis;
    },
    onSuccess: (_d, v) => {
      if (v.answerId) qc.invalidateQueries({ queryKey: ["middle_past_feedback", v.answerId] });
    },
  });
}

// ─────────────────────────────────────────────
// 10. 2차 비교 분석
// ─────────────────────────────────────────────
export function useMiddleBasicAICompare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      questionId,
      question,
      firstAnswer,
      secondAnswer,
      firstAnalysisJson,
      studentId,
      answerId,
      skipCount,
    }: {
      questionId: string;
      question: string;
      firstAnswer: string;
      secondAnswer: string;
      firstAnalysisJson?: any;
      studentId?: string;
      answerId?: string;
      skipCount?: boolean;
    }): Promise<MiddleBasicSecondData> => {
      if (answerId && !skipCount) {
        const { ai } = await getMiddleAiAnalysis(answerId);
        if ((ai.secondCount || 0) >= MIDDLE_BASIC_AI_LIMIT) {
          throw new Error(`2차 AI 분석은 최대 ${MIDDLE_BASIC_AI_LIMIT}회까지만 가능합니다.`);
        }
      }

      const { data, error } = await supabase.functions.invoke("middle-basic-feedback", {
        body: { questionId, question, firstAnswer, secondAnswer, firstAnalysisJson, studentId },
      });

      if (error) throw new Error("AI 비교 분석 호출 실패: " + error.message);
      if (!data?.success || !data?.feedback) {
        throw new Error("AI 응답이 없습니다: " + JSON.stringify(data).substring(0, 200));
      }

      const feedback = data.feedback as MiddleBasicSecondData;

      // 꼬리질문 전용 호출(skipCount)이면 2차 분석 결과/카운트 저장 안 함
      if (answerId && !skipCount) {
        const { ai } = await getMiddleAiAnalysis(answerId);
        await saveMiddleAiAnalysis(answerId, { second: feedback, secondCount: (ai.secondCount || 0) + 1 });
      }
      return feedback;
    },
    onSuccess: (_d, v) => {
      if (v.answerId) qc.invalidateQueries({ queryKey: ["middle_past_feedback", v.answerId] });
    },
  });
}

// ─────────────────────────────────────────────
// 11. 선생님 피드백 초안 (스피치구조+진로 기반)
// ─────────────────────────────────────────────
export function useMiddleBasicSuggestFeedback() {
  return useMutation({
    mutationFn: async ({
      questionId,
      question,
      studentAnswer,
      secondAnswer,
      aiAnalysis,
      feedbackType,
      studentId,
    }: {
      questionId: string;
      question: string;
      studentAnswer: string;
      secondAnswer?: string;
      aiAnalysis?: any;
      feedbackType: "first" | "final";
      studentId?: string;
    }): Promise<string> => {
      const { data, error } = await supabase.functions.invoke("middle-basic-suggest-feedback", {
        body: { questionId, question, studentAnswer, secondAnswer, aiAnalysis, feedbackType, studentId },
      });

      if (error) throw new Error("AI 피드백 초안 호출 실패: " + error.message);
      if (!data?.success || !data?.feedback) {
        throw new Error("AI 응답이 없습니다: " + JSON.stringify(data).substring(0, 200));
      }
      return data.feedback as string;
    },
  });
}