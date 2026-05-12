import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
export interface PastQuestion {
  id: string;
  school: string;
  question_index: number;
  text: string;
  type: string;
  evaluation_criteria: { name: string; max: number; standard: number }[];
  created_at: string;
  updated_at: string;
}

export interface PastAnswer {
  id: string;
  question_id: string;
  student_id: string;
  academy_id: string;
  answer: string | null;
  upgraded_answer: string | null;
  status:
    | "pending"
    | "answered"
    | "feedback1"
    | "upgraded"
    | "feedback2"
    | "done";
  created_at: string;
  updated_at: string;
}

export interface TailQuestion {
  text: string;
  answer?: string;
  answeredAt?: string;
}

export interface PastFeedback {
  id: string;
  answer_id: string;
  teacher_first_feedback: string | null;
  teacher_first_at: string | null;
  teacher_first_id: string | null;
  teacher_final_feedback: string | null;
  teacher_final_at: string | null;
  teacher_final_id: string | null;
  tail_questions: TailQuestion[];
  ai_analysis: any;
  created_at: string;
  updated_at: string;
}

// ⭐ 지원 학교 타입
export interface TargetSchool {
  id: string;
  student_id: string;
  academy_id: string | null;
  school: string;
  hidden: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────
// 모든 학교 목록 조회
// ──────────────────────────────────────────
export function useAllSchools() {
  return useQuery({
    queryKey: ["past-schools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("middle_past_questions")
        .select("school")
        .order("school", { ascending: true })
        .limit(100000);  

      if (error) throw error;
      // 중복 제거
      const schools = Array.from(
        new Set((data ?? []).map((d: any) => d.school)),
      );
      return schools as string[];
    },
  });
}

// ──────────────────────────────────────────
// 특정 학교의 기출 질문 목록
// ──────────────────────────────────────────
export function useSchoolQuestions(school: string | undefined) {
  return useQuery({
    queryKey: ["past-questions", school],
    enabled: !!school,
    queryFn: async () => {
      if (!school) return [];
      const { data, error } = await supabase
        .from("middle_past_questions")
        .select("*")
        .eq("school", school)
        .order("question_index", { ascending: true });

      if (error) throw error;
      return (data ?? []) as PastQuestion[];
    },
  });
}

// ──────────────────────────────────────────
// 학생의 답변들 조회 (학교별)
// ──────────────────────────────────────────
export function useMyPastAnswers(
  studentId: string | undefined,
  school: string | undefined,
) {
  return useQuery({
    queryKey: ["my-past-answers", studentId, school],
    enabled: !!studentId && !!school,
    queryFn: async () => {
      if (!studentId || !school) return [];
      // 1. 학교의 모든 question_id 가져오기
      const { data: qs, error: qErr } = await supabase
        .from("middle_past_questions")
        .select("id")
        .eq("school", school);

      if (qErr) throw qErr;
      if (!qs || qs.length === 0) return [];

      const questionIds = qs.map((q: any) => q.id);

      // 2. 그 질문들에 대한 학생 답변
      const { data, error } = await supabase
        .from("middle_past_answers")
        .select("*")
        .eq("student_id", studentId)
        .in("question_id", questionIds);

      if (error) throw error;
      return (data ?? []) as PastAnswer[];
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// 특정 답변에 대한 피드백
// ──────────────────────────────────────────
export function usePastFeedback(answerId: string | undefined) {
  return useQuery({
    queryKey: ["past-feedback", answerId],
    enabled: !!answerId,
    queryFn: async () => {
      if (!answerId) return null;
      const { data, error } = await supabase
        .from("middle_past_feedback")
        .select("*")
        .eq("answer_id", answerId)
        .maybeSingle();

      if (error) throw error;
      return data as PastFeedback | null;
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// Step 1: 첫 답변 제출
// ──────────────────────────────────────────
export function useSubmitPastAnswer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      question_id: string;
      student_id: string;
      academy_id: string;
      answer: string;
    }) => {
      // 기존 답변 있는지 확인
      const { data: existing } = await supabase
        .from("middle_past_answers")
        .select("id")
        .eq("question_id", input.question_id)
        .eq("student_id", input.student_id)
        .maybeSingle();

      if (existing) {
        // UPDATE
        const { data, error } = await supabase
          .from("middle_past_answers")
          .update({
            answer: input.answer,
            status: "answered",
          })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data as PastAnswer;
      } else {
        // INSERT
        const { data, error } = await supabase
          .from("middle_past_answers")
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
        return data as PastAnswer;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-past-answers"] });
      qc.invalidateQueries({ queryKey: ["student-past-answers"] });
    },
  });
}

// ──────────────────────────────────────────
// Step 3: 업그레이드 답변
// ──────────────────────────────────────────
export function useSubmitPastUpgrade() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      answer_id: string;
      upgraded_answer: string;
    }) => {
      const { error } = await supabase
        .from("middle_past_answers")
        .update({
          upgraded_answer: input.upgraded_answer,
          status: "upgraded",
        })
        .eq("id", input.answer_id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-past-answers"] });
      qc.invalidateQueries({ queryKey: ["student-past-answers"] });
    },
  });
}

// ──────────────────────────────────────────
// Step 5: 꼬리질문 답변
// ──────────────────────────────────────────
export function useSubmitPastTailAnswer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      answer_id: string;
      tail_index: number;
      answer: string;
    }) => {
      const { data: fb, error: fbError } = await supabase
        .from("middle_past_feedback")
        .select("id, tail_questions")
        .eq("answer_id", input.answer_id)
        .maybeSingle();

      if (fbError) throw fbError;
      if (!fb) throw new Error("피드백을 찾을 수 없어요");

      const tails = (fb.tail_questions as TailQuestion[]) || [];
      tails[input.tail_index] = {
        ...tails[input.tail_index],
        answer: input.answer,
        answeredAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("middle_past_feedback")
        .update({ tail_questions: tails })
        .eq("id", fb.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["past-feedback"] });
      qc.invalidateQueries({ queryKey: ["student-past-feedback"] });
    },
  });
}

// ============================================================
// ⭐⭐⭐ 학생의 지원 학교 관리 ⭐⭐⭐
// ============================================================

// ──────────────────────────────────────────
// 내 지원 학교 목록 (숨김 제외)
// ──────────────────────────────────────────
export function useMyTargetSchools(studentId: string | undefined) {
  return useQuery({
    queryKey: ["my-target-schools", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("middle_student_target_schools")
        .select("*")
        .eq("student_id", studentId)
        .eq("hidden", false)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as TargetSchool[];
    },
  });
}

// ──────────────────────────────────────────
// 내 지원 학교 (숨김 포함 — 복구용)
// ──────────────────────────────────────────
export function useMyTargetSchoolsAll(studentId: string | undefined) {
  return useQuery({
    queryKey: ["my-target-schools-all", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("middle_student_target_schools")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as TargetSchool[];
    },
  });
}

// ──────────────────────────────────────────
// 지원 학교 추가
// ──────────────────────────────────────────
export function useAddTargetSchool() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      student_id: string;
      academy_id: string;
      school: string;
    }) => {
      // 이미 있는지 확인 (숨김 포함)
      const { data: existing } = await supabase
        .from("middle_student_target_schools")
        .select("id, hidden")
        .eq("student_id", input.student_id)
        .eq("school", input.school)
        .maybeSingle();

      if (existing) {
        // 숨김된 거면 복구
        if (existing.hidden) {
          const { data, error } = await supabase
            .from("middle_student_target_schools")
            .update({ hidden: false, updated_at: new Date().toISOString() })
            .eq("id", existing.id)
            .select()
            .single();
          if (error) throw error;
          return data as TargetSchool;
        }
        throw new Error("이미 등록된 학교예요!");
      }

      // 새로 추가
      const { data, error } = await supabase
        .from("middle_student_target_schools")
        .insert({
          student_id: input.student_id,
          academy_id: input.academy_id,
          school: input.school,
          hidden: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TargetSchool;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-target-schools"] });
      qc.invalidateQueries({ queryKey: ["my-target-schools-all"] });
    },
  });
}

// ──────────────────────────────────────────
// 지원 학교 숨김 처리 (답변/피드백 데이터는 유지)
// ──────────────────────────────────────────
export function useHideTargetSchool() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      student_id: string;
      school: string;
    }) => {
      const { error } = await supabase
        .from("middle_student_target_schools")
        .update({ hidden: true, updated_at: new Date().toISOString() })
        .eq("student_id", input.student_id)
        .eq("school", input.school);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-target-schools"] });
      qc.invalidateQueries({ queryKey: ["my-target-schools-all"] });
    },
  });
}