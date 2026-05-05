import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
export interface StudentPassageProblem {
  id: string;
  school: string;
  year: number;
  problem_index: number;
  problem_title: string;
  subject: string;
  passage_text: string | null;
  passage_pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentPassageQuestion {
  id: string;
  problem_id: string;
  question_index: number;
  text: string;
  intent: string[];
  evaluation_criteria: any[];
  created_at: string;
  updated_at: string;
}

export interface StudentPassageAnswer {
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

export interface StudentPassageTailQuestion {
  text: string;
  answer?: string;
  answeredAt?: string;
}

export interface StudentPassageFeedback {
  id: string;
  answer_id: string;
  teacher_first_feedback: string | null;
  teacher_first_at: string | null;
  teacher_first_id: string | null;
  teacher_final_feedback: string | null;
  teacher_final_at: string | null;
  teacher_final_id: string | null;
  tail_questions: StudentPassageTailQuestion[];
  ai_analysis: any;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────
// 학생이 답변한 문제들만 조회 (어드민 사이드바용)
// ──────────────────────────────────────────
export function useStudentStartedProblems(studentId: string | undefined) {
  return useQuery({
    queryKey: ["student-started-passage-problems", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return [];

      // 1. 학생 답변들 가져오기
      const { data: answers, error } = await supabase
        .from("middle_passage_answers")
        .select("id, question_id")
        .eq("student_id", studentId);

      if (error) throw error;
      if (!answers || answers.length === 0) return [];

      // 2. 답변들의 question_id로 문제 가져오기
      const questionIds = answers.map((a: any) => a.question_id);
      const { data: questions, error: qErr } = await supabase
        .from("middle_passage_questions")
        .select("problem_id")
        .in("id", questionIds);

      if (qErr) throw qErr;
      if (!questions || questions.length === 0) return [];

      // 3. 중복 제거된 problem_id로 문제 정보 가져오기
      const problemIds = Array.from(
        new Set(questions.map((q: any) => q.problem_id)),
      );
      const { data: problems, error: pErr } = await supabase
        .from("middle_passage_problems")
        .select("*")
        .in("id", problemIds)
        .order("school", { ascending: true })
        .order("year", { ascending: false })
        .order("problem_index", { ascending: true });

      if (pErr) throw pErr;
      return (problems ?? []) as StudentPassageProblem[];
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// 문제의 질문들
// ──────────────────────────────────────────
export function useStudentProblemQuestions(problemId: string | undefined) {
  return useQuery({
    queryKey: ["student-passage-questions", problemId],
    enabled: !!problemId,
    queryFn: async () => {
      if (!problemId) return [];
      const { data, error } = await supabase
        .from("middle_passage_questions")
        .select("*")
        .eq("problem_id", problemId)
        .order("question_index", { ascending: true });

      if (error) throw error;
      return (data ?? []) as StudentPassageQuestion[];
    },
  });
}

// ──────────────────────────────────────────
// 학생 답변들 (특정 문제)
// ──────────────────────────────────────────
export function useStudentPassageAnswers(
  studentId: string | undefined,
  problemId: string | undefined,
) {
  return useQuery({
    queryKey: ["student-passage-answers", studentId, problemId],
    enabled: !!studentId && !!problemId,
    queryFn: async () => {
      if (!studentId || !problemId) return [];

      const { data: qs, error: qErr } = await supabase
        .from("middle_passage_questions")
        .select("id")
        .eq("problem_id", problemId);

      if (qErr) throw qErr;
      if (!qs || qs.length === 0) return [];

      const questionIds = qs.map((q: any) => q.id);

      const { data, error } = await supabase
        .from("middle_passage_answers")
        .select("*")
        .eq("student_id", studentId)
        .in("question_id", questionIds);

      if (error) throw error;
      return (data ?? []) as StudentPassageAnswer[];
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// 답변별 피드백
// ──────────────────────────────────────────
export function useStudentPassageFeedback(answerId: string | undefined) {
  return useQuery({
    queryKey: ["student-passage-feedback", answerId],
    enabled: !!answerId,
    queryFn: async () => {
      if (!answerId) return null;
      const { data, error } = await supabase
        .from("middle_passage_feedback")
        .select("*")
        .eq("answer_id", answerId)
        .maybeSingle();

      if (error) throw error;
      return data as StudentPassageFeedback | null;
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// Step 2: 1차 피드백
// ──────────────────────────────────────────
export function useSavePassageFirstFeedback() {
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
        .from("middle_passage_feedback")
        .select("id")
        .eq("answer_id", input.answer_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("middle_passage_feedback")
          .update({
            teacher_first_feedback: input.teacher_first_feedback,
            teacher_first_id: teacherId,
            teacher_first_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("middle_passage_feedback")
          .insert({
            answer_id: input.answer_id,
            teacher_first_feedback: input.teacher_first_feedback,
            teacher_first_id: teacherId,
            teacher_first_at: new Date().toISOString(),
          });
        if (error) throw error;
      }

      const { error: statusError } = await supabase
        .from("middle_passage_answers")
        .update({ status: "feedback1" })
        .eq("id", input.answer_id);

      if (statusError) throw statusError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-passage-feedback"] });
      qc.invalidateQueries({ queryKey: ["passage-feedback"] });
      qc.invalidateQueries({ queryKey: ["passage-feedbacks"] });
      qc.invalidateQueries({ queryKey: ["student-passage-answers"] });
      qc.invalidateQueries({ queryKey: ["my-passage-answers"] });
    },
  });
}

// ──────────────────────────────────────────
// Step 4: 최종 피드백
// ──────────────────────────────────────────
export function useSavePassageFinalFeedback() {
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
        .from("middle_passage_feedback")
        .select("id")
        .eq("answer_id", input.answer_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("middle_passage_feedback")
          .update({
            teacher_final_feedback: input.teacher_final_feedback,
            teacher_final_id: teacherId,
            teacher_final_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("middle_passage_feedback")
          .insert({
            answer_id: input.answer_id,
            teacher_final_feedback: input.teacher_final_feedback,
            teacher_final_id: teacherId,
            teacher_final_at: new Date().toISOString(),
          });
        if (error) throw error;
      }

      const { error: statusError } = await supabase
        .from("middle_passage_answers")
        .update({ status: "feedback2" })
        .eq("id", input.answer_id);

      if (statusError) throw statusError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-passage-feedback"] });
      qc.invalidateQueries({ queryKey: ["passage-feedback"] });
      qc.invalidateQueries({ queryKey: ["passage-feedbacks"] });
      qc.invalidateQueries({ queryKey: ["student-passage-answers"] });
      qc.invalidateQueries({ queryKey: ["my-passage-answers"] });
    },
  });
}

// ──────────────────────────────────────────
// 꼬리질문 추가/수정/삭제
// ──────────────────────────────────────────
export function useUpdatePassageTails() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      answer_id: string;
      tail_questions: StudentPassageTailQuestion[];
    }) => {
      const { data: existing } = await supabase
        .from("middle_passage_feedback")
        .select("id")
        .eq("answer_id", input.answer_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("middle_passage_feedback")
          .update({ tail_questions: input.tail_questions })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("middle_passage_feedback")
          .insert({
            answer_id: input.answer_id,
            tail_questions: input.tail_questions,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-passage-feedback"] });
      qc.invalidateQueries({ queryKey: ["passage-feedback"] });
      qc.invalidateQueries({ queryKey: ["passage-feedbacks"] });
    },
  });
}
