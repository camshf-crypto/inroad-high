import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
export interface EssayContent {
  selfStudy?: string;
  reason?: string;
  activity?: string;
  career?: string;
  character?: string;
}

export interface JasoEssay {
  id: string;
  student_id: string;
  academy_id: string;
  school: string;
  content: EssayContent;
  questions_generated: boolean;
  version: number;
  delete_requested: boolean;
  delete_requested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JasoEssayFeedback {
  id: string;
  essay_id: string;
  section_key: string;
  round: number;
  text: string;
  teacher_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface JasoQuestion {
  id: string;
  essay_id: string;
  question_index: number;
  text: string;
  tag: string | null;
  purpose: string[];
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

export interface JasoQuestionFeedback {
  id: string;
  question_id: string;
  teacher_first_feedback: string | null;
  teacher_first_at: string | null;
  teacher_first_id: string | null;
  teacher_final_feedback: string | null;
  teacher_final_at: string | null;
  teacher_final_id: string | null;
  tail_questions: TailQuestion[];
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────
// 학생 본인 자소서 목록 조회
// ──────────────────────────────────────────
export function useMyEssays(studentId: string | undefined) {
  return useQuery({
    queryKey: ["my-essays", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("jaso_essays")
        .select("*")
        .eq("student_id", studentId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as JasoEssay[];
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// 자소서 추가 (학교 추가)
// ──────────────────────────────────────────
export function useAddEssay() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      student_id: string;
      academy_id: string;
      school: string;
    }) => {
      const { data, error } = await supabase
        .from("jaso_essays")
        .insert({
          student_id: input.student_id,
          academy_id: input.academy_id,
          school: input.school,
          content: {},
        })
        .select()
        .single();

      if (error) throw error;
      return data as JasoEssay;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-essays"] });
    },
  });
}

// ──────────────────────────────────────────
// 자소서 본문 저장 (전체 또는 섹션) + 답변 이력 자동 저장
// ──────────────────────────────────────────
export function useUpdateEssay() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      essay_id: string;
      content: EssayContent;
      version?: number;
      previousContent?: EssayContent; // 이전 답변 (변경된 섹션 비교용)
    }) => {
      const updates: any = { content: input.content };
      if (input.version !== undefined) {
        updates.version = input.version;
      }

      // 1. essays 테이블 업데이트 (최신 content)
      const { data, error } = await supabase
        .from("jaso_essays")
        .update(updates)
        .eq("id", input.essay_id)
        .select()
        .single();

      if (error) throw error;

      // 2. 변경된 섹션마다 answers 테이블에 INSERT (이력)
      const sectionsToSave: { key: string; content: string }[] = [];
      const sections: (keyof EssayContent)[] = [
        "selfStudy",
        "reason",
        "activity",
        "career",
        "character",
      ];

      for (const sectionKey of sections) {
        const newVal = input.content[sectionKey] || "";
        const oldVal = input.previousContent?.[sectionKey] || "";
        if (newVal && newVal !== oldVal) {
          sectionsToSave.push({ key: sectionKey, content: newVal });
        }
      }

      // 각 섹션의 다음 round 계산 후 INSERT
      for (const section of sectionsToSave) {
        const { data: existing } = await supabase
          .from("jaso_essay_answers")
          .select("round")
          .eq("essay_id", input.essay_id)
          .eq("section_key", section.key)
          .order("round", { ascending: false })
          .limit(1);

        const nextRound =
          existing && existing.length > 0 ? existing[0].round + 1 : 1;

        await supabase.from("jaso_essay_answers").insert({
          essay_id: input.essay_id,
          section_key: section.key,
          round: nextRound,
          content: section.content,
        });
      }

      return data as JasoEssay;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-essays"] });
      qc.invalidateQueries({ queryKey: ["student-essays"] });
      qc.invalidateQueries({ queryKey: ["essay-answers"] });
      qc.invalidateQueries({ queryKey: ["student-essay-answers"] });
    },
  });
}

// ──────────────────────────────────────────
// 답변 이력 조회 (학생용)
// ──────────────────────────────────────────
export interface EssayAnswerHistory {
  id: string;
  essay_id: string;
  section_key: string;
  round: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export function useEssayAnswers(essayId: string | undefined) {
  return useQuery({
    queryKey: ["essay-answers", essayId],
    enabled: !!essayId,
    queryFn: async () => {
      if (!essayId) return [];
      const { data, error } = await supabase
        .from("jaso_essay_answers")
        .select("*")
        .eq("essay_id", essayId)
        .order("round", { ascending: true });

      if (error) throw error;
      return (data ?? []) as EssayAnswerHistory[];
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// 자소서 삭제 요청 (학생) — 승인 대기
// ──────────────────────────────────────────
export function useRequestDeleteEssay() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (essayId: string) => {
      const { error } = await supabase
        .from("jaso_essays")
        .update({
          delete_requested: true,
          delete_requested_at: new Date().toISOString(),
        })
        .eq("id", essayId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-essays"] });
      qc.invalidateQueries({ queryKey: ["student-essays"] });
    },
  });
}

// ──────────────────────────────────────────
// 자소서 삭제 요청 취소 (학생)
// ──────────────────────────────────────────
export function useCancelDeleteRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (essayId: string) => {
      const { error } = await supabase
        .from("jaso_essays")
        .update({
          delete_requested: false,
          delete_requested_at: null,
        })
        .eq("id", essayId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-essays"] });
      qc.invalidateQueries({ queryKey: ["student-essays"] });
    },
  });
}

// ──────────────────────────────────────────
// 자소서 섹션별 피드백 조회 (학생용)
// ──────────────────────────────────────────
export function useEssayFeedback(essayId: string | undefined) {
  return useQuery({
    queryKey: ["essay-feedback", essayId],
    enabled: !!essayId,
    queryFn: async () => {
      if (!essayId) return [];
      const { data, error } = await supabase
        .from("jaso_essay_feedback")
        .select("*")
        .eq("essay_id", essayId)
        .order("round", { ascending: true });

      if (error) throw error;
      return (data ?? []) as JasoEssayFeedback[];
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// 예상질문 조회 (자소서별)
// ──────────────────────────────────────────
export function useEssayQuestions(essayId: string | undefined) {
  return useQuery({
    queryKey: ["essay-questions", essayId],
    enabled: !!essayId,
    queryFn: async () => {
      if (!essayId) return [];
      const { data, error } = await supabase
        .from("jaso_questions")
        .select("*")
        .eq("essay_id", essayId)
        .order("question_index", { ascending: true });

      if (error) throw error;
      return (data ?? []) as JasoQuestion[];
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// 예상질문 피드백 조회
// ──────────────────────────────────────────
export function useQuestionFeedback(questionId: string | undefined) {
  return useQuery({
    queryKey: ["question-feedback", questionId],
    enabled: !!questionId,
    queryFn: async () => {
      if (!questionId) return null;
      const { data, error } = await supabase
        .from("jaso_question_feedback")
        .select("*")
        .eq("question_id", questionId)
        .maybeSingle();

      if (error) throw error;
      return data as JasoQuestionFeedback | null;
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// 학생 첫 답변 제출 (Step 1)
// ──────────────────────────────────────────
export function useSubmitAnswer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { question_id: string; answer: string }) => {
      const { error } = await supabase
        .from("jaso_questions")
        .update({
          answer: input.answer,
          status: "answered",
        })
        .eq("id", input.question_id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["essay-questions"] });
    },
  });
}

// ──────────────────────────────────────────
// 학생 업그레이드 답변 (Step 3)
// ──────────────────────────────────────────
export function useSubmitUpgrade() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      question_id: string;
      upgraded_answer: string;
    }) => {
      const { error } = await supabase
        .from("jaso_questions")
        .update({
          upgraded_answer: input.upgraded_answer,
          status: "upgraded",
        })
        .eq("id", input.question_id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["essay-questions"] });
    },
  });
}

// ──────────────────────────────────────────
// 꼬리질문 답변 (Step 5)
// ──────────────────────────────────────────
export function useSubmitTailAnswer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      question_id: string;
      tail_index: number;
      answer: string;
    }) => {
      // 기존 피드백 가져오기
      const { data: fb, error: fbError } = await supabase
        .from("jaso_question_feedback")
        .select("id, tail_questions")
        .eq("question_id", input.question_id)
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
        .from("jaso_question_feedback")
        .update({ tail_questions: tails })
        .eq("id", fb.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["question-feedback"] });
    },
  });
}
