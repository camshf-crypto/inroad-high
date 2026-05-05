import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
export interface PassageProblem {
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

export interface PassageQuestion {
  id: string;
  problem_id: string;
  question_index: number;
  text: string;
  intent: string[];
  evaluation_criteria: { name: string; max: number; standard: number }[];
  created_at: string;
  updated_at: string;
}

export interface PassageAnswer {
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

export interface PassageTailQuestion {
  text: string;
  answer?: string;
  answeredAt?: string;
}

export interface PassageFeedback {
  id: string;
  answer_id: string;
  teacher_first_feedback: string | null;
  teacher_first_at: string | null;
  teacher_first_id: string | null;
  teacher_final_feedback: string | null;
  teacher_final_at: string | null;
  teacher_final_id: string | null;
  tail_questions: PassageTailQuestion[];
  ai_analysis: any;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────
// 모든 학교 목록 (제시문 있는 학교만)
// ──────────────────────────────────────────
export function useAllPassageSchools() {
  return useQuery({
    queryKey: ["passage-schools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("middle_passage_problems")
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
// 학교의 모든 연도 (제시문 있는 연도만)
// ──────────────────────────────────────────
export function usePassageYears(school: string | undefined) {
  return useQuery({
    queryKey: ["passage-years", school],
    enabled: !!school,
    queryFn: async () => {
      if (!school) return [];
      const { data, error } = await supabase
        .from("middle_passage_problems")
        .select("year")
        .eq("school", school);

      if (error) throw error;
      const years = Array.from(new Set((data ?? []).map((d: any) => d.year)));
      return (years as number[]).sort((a, b) => b - a);
    },
  });
}

// ──────────────────────────────────────────
// 학교 + 연도의 문제 목록
// ──────────────────────────────────────────
export function useSchoolYearProblems(
  school: string | undefined,
  year: number | undefined,
) {
  return useQuery({
    queryKey: ["passage-problems", school, year],
    enabled: !!school && !!year,
    queryFn: async () => {
      if (!school || !year) return [];
      const { data, error } = await supabase
        .from("middle_passage_problems")
        .select("*")
        .eq("school", school)
        .eq("year", year)
        .order("problem_index", { ascending: true });

      if (error) throw error;
      return (data ?? []) as PassageProblem[];
    },
  });
}

// ──────────────────────────────────────────
// 문제의 질문들
// ──────────────────────────────────────────
export function useProblemQuestions(problemId: string | undefined) {
  return useQuery({
    queryKey: ["passage-questions", problemId],
    enabled: !!problemId,
    queryFn: async () => {
      if (!problemId) return [];
      const { data, error } = await supabase
        .from("middle_passage_questions")
        .select("*")
        .eq("problem_id", problemId)
        .order("question_index", { ascending: true });

      if (error) throw error;
      return (data ?? []) as PassageQuestion[];
    },
  });
}

// ──────────────────────────────────────────
// 학생의 답변들 (문제별)
// ──────────────────────────────────────────
export function useMyPassageAnswers(
  studentId: string | undefined,
  problemId: string | undefined,
) {
  return useQuery({
    queryKey: ["my-passage-answers", studentId, problemId],
    enabled: !!studentId && !!problemId,
    queryFn: async () => {
      if (!studentId || !problemId) return [];
      // 1. 문제의 모든 질문 id 가져오기
      const { data: qs, error: qErr } = await supabase
        .from("middle_passage_questions")
        .select("id")
        .eq("problem_id", problemId);

      if (qErr) throw qErr;
      if (!qs || qs.length === 0) return [];

      const questionIds = qs.map((q: any) => q.id);

      // 2. 그 질문들에 대한 학생 답변
      const { data, error } = await supabase
        .from("middle_passage_answers")
        .select("*")
        .eq("student_id", studentId)
        .in("question_id", questionIds);

      if (error) throw error;
      return (data ?? []) as PassageAnswer[];
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// 답변별 피드백
// ──────────────────────────────────────────
export function usePassageFeedback(answerId: string | undefined) {
  return useQuery({
    queryKey: ["passage-feedback", answerId],
    enabled: !!answerId,
    queryFn: async () => {
      if (!answerId) return null;
      const { data, error } = await supabase
        .from("middle_passage_feedback")
        .select("*")
        .eq("answer_id", answerId)
        .maybeSingle();

      if (error) throw error;
      return data as PassageFeedback | null;
    },
    refetchInterval: 5000,
  });
}

// 여러 답변의 피드백 한번에 (문제별)
export function usePassageFeedbacks(answerIds: string[]) {
  return useQuery({
    queryKey: ["passage-feedbacks", answerIds.sort().join(",")],
    enabled: answerIds.length > 0,
    queryFn: async () => {
      if (answerIds.length === 0) return [];
      const { data, error } = await supabase
        .from("middle_passage_feedback")
        .select("*")
        .in("answer_id", answerIds);

      if (error) throw error;
      return (data ?? []) as PassageFeedback[];
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// Step 1: 첫 답변 제출
// ──────────────────────────────────────────
export function useSubmitPassageAnswer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      question_id: string;
      student_id: string;
      academy_id: string;
      answer: string;
    }) => {
      const { data: existing } = await supabase
        .from("middle_passage_answers")
        .select("id")
        .eq("question_id", input.question_id)
        .eq("student_id", input.student_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("middle_passage_answers")
          .update({ answer: input.answer, status: "answered" })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data as PassageAnswer;
      } else {
        const { data, error } = await supabase
          .from("middle_passage_answers")
          .insert({
            question_id: input.question_id,
            student_id: input.student_id,
            academy_id: input.academy_id,
            answer: input.answer,
            status: "answered",
          })
          .select()
          .single();
        if (error) throw error;
        return data as PassageAnswer;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-passage-answers"] });
      qc.invalidateQueries({ queryKey: ["student-passage-answers"] });
    },
  });
}

// ──────────────────────────────────────────
// Step 3: 업그레이드 답변
// ──────────────────────────────────────────
export function useSubmitPassageUpgrade() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      answer_id: string;
      upgraded_answer: string;
    }) => {
      const { error } = await supabase
        .from("middle_passage_answers")
        .update({ upgraded_answer: input.upgraded_answer, status: "upgraded" })
        .eq("id", input.answer_id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-passage-answers"] });
      qc.invalidateQueries({ queryKey: ["student-passage-answers"] });
    },
  });
}

// ──────────────────────────────────────────
// Step 5: 꼬리질문 답변
// ──────────────────────────────────────────
export function useSubmitPassageTailAnswer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      answer_id: string;
      tail_index: number;
      answer: string;
    }) => {
      const { data: fb, error: fbError } = await supabase
        .from("middle_passage_feedback")
        .select("id, tail_questions")
        .eq("answer_id", input.answer_id)
        .maybeSingle();

      if (fbError) throw fbError;
      if (!fb) throw new Error("피드백을 찾을 수 없어요");

      const tails = (fb.tail_questions as PassageTailQuestion[]) || [];
      tails[input.tail_index] = {
        ...tails[input.tail_index],
        answer: input.answer,
        answeredAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("middle_passage_feedback")
        .update({ tail_questions: tails })
        .eq("id", fb.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["passage-feedback"] });
      qc.invalidateQueries({ queryKey: ["passage-feedbacks"] });
      qc.invalidateQueries({ queryKey: ["student-passage-feedback"] });
    },
  });
}
