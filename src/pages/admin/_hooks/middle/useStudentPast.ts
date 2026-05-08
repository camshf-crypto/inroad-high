import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
export interface StudentPastQuestion {
  id: string;
  school: string;
  question_index: number;
  text: string;
  type: string;
  evaluation_criteria: { name: string; max: number; standard: number }[];
  created_at: string;
  updated_at: string;
}

export interface StudentPastAnswer {
  id: string;
  question_id: string;
  student_id: string;
  academy_id: string;
  answer: string | null;
  upgraded_answer: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface StudentTailQuestion {
  text: string;
  answer?: string;
  answeredAt?: string;
}

export interface StudentPastFeedback {
  id: string;
  answer_id: string;
  teacher_first_feedback: string | null;
  teacher_first_at: string | null;
  teacher_first_id: string | null;
  teacher_final_feedback: string | null;
  teacher_final_at: string | null;
  teacher_final_id: string | null;
  tail_questions: StudentTailQuestion[];
  ai_analysis: any;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────
// 모든 학교 목록 (학생용 — 모든 학교)
// ──────────────────────────────────────────
export function useAllPastSchools() {
  return useQuery({
    queryKey: ["past-schools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("middle_past_questions")
        .select("school");

      if (error) throw error;
      const schools = Array.from(
        new Set((data ?? []).map((d: any) => d.school)),
      );
      return schools as string[];
    },
  });
}

// ──────────────────────────────────────────
// ⭐ 학생이 답변한 학교 목록 (어드민용)
// ──────────────────────────────────────────
export function useStudentAnsweredSchools(studentId: string | undefined) {
  return useQuery({
    queryKey: ["student-answered-schools", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return [];

      // 1. 학생 답변 가져오기
      const { data: answers, error: aErr } = await supabase
        .from("middle_past_answers")
        .select("question_id")
        .eq("student_id", studentId);

      if (aErr) throw aErr;
      if (!answers || answers.length === 0) return [];

      const questionIds = Array.from(
        new Set(answers.map((a: any) => a.question_id)),
      );

      // 2. question_id로 학교 추출
      const { data: questions, error: qErr } = await supabase
        .from("middle_past_questions")
        .select("school")
        .in("id", questionIds);

      if (qErr) throw qErr;

      const schools = Array.from(
        new Set((questions ?? []).map((q: any) => q.school)),
      );
      return schools as string[];
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// 학교별 질문 목록 (어드민)
// ──────────────────────────────────────────
export function useStudentSchoolQuestions(school: string | undefined) {
  return useQuery({
    queryKey: ["student-past-questions", school],
    enabled: !!school,
    queryFn: async () => {
      if (!school) return [];
      const { data, error } = await supabase
        .from("middle_past_questions")
        .select("*")
        .eq("school", school)
        .order("question_index", { ascending: true });

      if (error) throw error;
      return (data ?? []) as StudentPastQuestion[];
    },
  });
}

// ──────────────────────────────────────────
// 학생의 답변들 (어드민) — 학교별
// ──────────────────────────────────────────
export function useStudentPastAnswers(
  studentId: string | undefined,
  school: string | undefined,
) {
  return useQuery({
    queryKey: ["student-past-answers", studentId, school],
    enabled: !!studentId && !!school,
    queryFn: async () => {
      if (!studentId || !school) return [];
      // 1. 학교 질문 ids
      const { data: qs, error: qErr } = await supabase
        .from("middle_past_questions")
        .select("id")
        .eq("school", school);

      if (qErr) throw qErr;
      if (!qs || qs.length === 0) return [];

      const questionIds = qs.map((q: any) => q.id);

      // 2. 학생 답변
      const { data, error } = await supabase
        .from("middle_past_answers")
        .select("*")
        .eq("student_id", studentId)
        .in("question_id", questionIds);

      if (error) throw error;
      return (data ?? []) as StudentPastAnswer[];
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// 학생 답변별 피드백 (어드민)
// ──────────────────────────────────────────
export function useStudentPastFeedback(answerId: string | undefined) {
  return useQuery({
    queryKey: ["student-past-feedback", answerId],
    enabled: !!answerId,
    queryFn: async () => {
      if (!answerId) return null;
      const { data, error } = await supabase
        .from("middle_past_feedback")
        .select("*")
        .eq("answer_id", answerId)
        .maybeSingle();

      if (error) throw error;
      return data as StudentPastFeedback | null;
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// Step 2: 1차 피드백 저장 (어드민)
// ──────────────────────────────────────────
export function useSavePastFirstFeedback() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      answer_id: string;
      teacher_first_feedback: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const teacherId = user?.id ?? null;

      const { data: existing } = await supabase
        .from("middle_past_feedback")
        .select("id")
        .eq("answer_id", input.answer_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("middle_past_feedback")
          .update({
            teacher_first_feedback: input.teacher_first_feedback,
            teacher_first_id: teacherId,
            teacher_first_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("middle_past_feedback").insert({
          answer_id: input.answer_id,
          teacher_first_feedback: input.teacher_first_feedback,
          teacher_first_id: teacherId,
          teacher_first_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      // status 업데이트
      const { error: statusError } = await supabase
        .from("middle_past_answers")
        .update({ status: "feedback1" })
        .eq("id", input.answer_id);

      if (statusError) throw statusError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-past-feedback"] });
      qc.invalidateQueries({ queryKey: ["past-feedback"] });
      qc.invalidateQueries({ queryKey: ["student-past-answers"] });
      qc.invalidateQueries({ queryKey: ["my-past-answers"] });
    },
  });
}

// ──────────────────────────────────────────
// Step 4: 최종 피드백 저장
// ──────────────────────────────────────────
export function useSavePastFinalFeedback() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      answer_id: string;
      teacher_final_feedback: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const teacherId = user?.id ?? null;

      const { data: existing } = await supabase
        .from("middle_past_feedback")
        .select("id")
        .eq("answer_id", input.answer_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("middle_past_feedback")
          .update({
            teacher_final_feedback: input.teacher_final_feedback,
            teacher_final_id: teacherId,
            teacher_final_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("middle_past_feedback").insert({
          answer_id: input.answer_id,
          teacher_final_feedback: input.teacher_final_feedback,
          teacher_final_id: teacherId,
          teacher_final_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      // status 업데이트
      const { error: statusError } = await supabase
        .from("middle_past_answers")
        .update({ status: "feedback2" })
        .eq("id", input.answer_id);

      if (statusError) throw statusError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-past-feedback"] });
      qc.invalidateQueries({ queryKey: ["past-feedback"] });
      qc.invalidateQueries({ queryKey: ["student-past-answers"] });
      qc.invalidateQueries({ queryKey: ["my-past-answers"] });
    },
  });
}

// ──────────────────────────────────────────
// 꼬리질문 추가/수정/삭제 (어드민)
// ──────────────────────────────────────────
export function useUpdatePastTails() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      answer_id: string;
      tail_questions: StudentTailQuestion[];
    }) => {
      const { data: existing } = await supabase
        .from("middle_past_feedback")
        .select("id")
        .eq("answer_id", input.answer_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("middle_past_feedback")
          .update({ tail_questions: input.tail_questions })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("middle_past_feedback").insert({
          answer_id: input.answer_id,
          tail_questions: input.tail_questions,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-past-feedback"] });
      qc.invalidateQueries({ queryKey: ["past-feedback"] });
    },
  });
}