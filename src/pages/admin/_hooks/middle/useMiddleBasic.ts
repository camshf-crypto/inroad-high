// src/pages/admin/_hooks/useMiddleBasic.ts
// 어드민 중등 기본 인성질문 hook 모음
// (studentId props로 받아서 학생 답변 조회 + 피드백 작성)

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const BASIC_SCHOOL = "기본 인성";

// ─────────────────────────────────────────────
// 1. 기본 인성질문 30개 조회
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

      // 기본 인성 질문 ID들 먼저 조회
      const { data: questions } = await supabase
        .from("middle_past_questions")
        .select("id")
        .eq("school", BASIC_SCHOOL);

      const questionIds = (questions || []).map((q: any) => q.id);
      if (questionIds.length === 0) return [];

      // 그 질문들에 대한 학생 답변 조회
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
      // 기존 row 있는지 확인
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
      // 기존 tail_questions 배열 가져오기
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