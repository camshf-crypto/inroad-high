import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
export interface StudentEssay {
  id: string;
  student_id: string;
  academy_id: string;
  school: string;
  content: {
    selfStudy?: string;
    reason?: string;
    activity?: string;
    career?: string;
    character?: string;
  };
  questions_generated: boolean;
  version: number;
  delete_requested: boolean;
  delete_requested_at: string | null;
  essay_completed: boolean;          // ⭐ 추가
  completed_at: string | null;       // ⭐ 추가
  created_at: string;
  updated_at: string;
}

export interface StudentEssayFeedback {
  id: string;
  essay_id: string;
  section_key: string;
  round: number;
  text: string;
  teacher_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentQuestion {
  id: string;
  essay_id: string;
  question_index: number;
  text: string;
  tag: string | null;
  purpose: string[];
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

export interface StudentQuestionFeedback {
  id: string;
  question_id: string;
  teacher_first_feedback: string | null;
  teacher_first_at: string | null;
  teacher_first_id: string | null;
  teacher_final_feedback: string | null;
  teacher_final_at: string | null;
  teacher_final_id: string | null;
  tail_questions: StudentTailQuestion[];
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────
// 특정 학생의 모든 자소서 (어드민)
// ──────────────────────────────────────────
export function useStudentEssays(studentId: string | undefined) {
  return useQuery({
    queryKey: ["student-essays", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("jaso_essays")
        .select("*")
        .eq("student_id", studentId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as StudentEssay[];
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// 자소서 섹션별 피드백 조회 (어드민)
// ──────────────────────────────────────────
export function useStudentEssayFeedback(essayId: string | undefined) {
  return useQuery({
    queryKey: ["student-essay-feedback", essayId],
    enabled: !!essayId,
    queryFn: async () => {
      if (!essayId) return [];
      const { data, error } = await supabase
        .from("jaso_essay_feedback")
        .select("*")
        .eq("essay_id", essayId)
        .order("round", { ascending: true });

      if (error) throw error;
      return (data ?? []) as StudentEssayFeedback[];
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// 학생 답변 이력 조회 (어드민)
// ──────────────────────────────────────────
export interface StudentEssayAnswerHistory {
  id: string;
  essay_id: string;
  section_key: string;
  round: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export function useStudentEssayAnswers(essayId: string | undefined) {
  return useQuery({
    queryKey: ["student-essay-answers", essayId],
    enabled: !!essayId,
    queryFn: async () => {
      if (!essayId) return [];
      const { data, error } = await supabase
        .from("jaso_essay_answers")
        .select("*")
        .eq("essay_id", essayId)
        .order("round", { ascending: true });

      if (error) throw error;
      return (data ?? []) as StudentEssayAnswerHistory[];
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// 자소서 삭제 승인 (어드민) — 영구 삭제 (cascade)
// ──────────────────────────────────────────
export function useApproveDeleteEssay() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (essayId: string) => {
      const { error } = await supabase
        .from("jaso_essays")
        .delete()
        .eq("id", essayId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-essays"] });
      qc.invalidateQueries({ queryKey: ["my-essays"] });
    },
  });
}

// ──────────────────────────────────────────
// 자소서 삭제 요청 거부 (어드민)
// ──────────────────────────────────────────
export function useRejectDeleteRequest() {
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
      qc.invalidateQueries({ queryKey: ["student-essays"] });
      qc.invalidateQueries({ queryKey: ["my-essays"] });
    },
  });
}

// ──────────────────────────────────────────
// 자소서 섹션별 피드백 추가 (어드민)
// ──────────────────────────────────────────
export function useAddSectionFeedback() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      essay_id: string;
      section_key: string;
      text: string;
    }) => {
      const { data: existing } = await supabase
        .from("jaso_essay_feedback")
        .select("round")
        .eq("essay_id", input.essay_id)
        .eq("section_key", input.section_key)
        .order("round", { ascending: false })
        .limit(1);

      const nextRound =
        existing && existing.length > 0 ? existing[0].round + 1 : 1;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const teacherId = user?.id ?? null;

      const { error } = await supabase.from("jaso_essay_feedback").insert({
        essay_id: input.essay_id,
        section_key: input.section_key,
        round: nextRound,
        text: input.text,
        teacher_id: teacherId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-essay-feedback"] });
      qc.invalidateQueries({ queryKey: ["essay-feedback"] });
    },
  });
}

// ──────────────────────────────────────────
// 자소서 섹션 피드백 수정
// ──────────────────────────────────────────
export function useUpdateSectionFeedback() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { feedback_id: string; text: string }) => {
      const { error } = await supabase
        .from("jaso_essay_feedback")
        .update({ text: input.text })
        .eq("id", input.feedback_id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-essay-feedback"] });
      qc.invalidateQueries({ queryKey: ["essay-feedback"] });
    },
  });
}

// ──────────────────────────────────────────
// 자소서 섹션 피드백 삭제
// ──────────────────────────────────────────
export function useDeleteSectionFeedback() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (feedbackId: string) => {
      const { error } = await supabase
        .from("jaso_essay_feedback")
        .delete()
        .eq("id", feedbackId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-essay-feedback"] });
      qc.invalidateQueries({ queryKey: ["essay-feedback"] });
    },
  });
}

// ──────────────────────────────────────────
// 예상질문 생성 (어드민) - mock 5개 한 번에 INSERT
// ──────────────────────────────────────────
export function useGenerateQuestions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { essay_id: string; school: string }) => {
      const mockQuestions = [
        {
          essay_id: input.essay_id,
          question_index: 1,
          text: `${input.school}에 지원한 구체적인 이유가 무엇인가요?`,
          tag: "지원동기",
          purpose: ["지원 동기의 진정성 확인", "학교에 대한 이해도 파악"],
        },
        {
          essay_id: input.essay_id,
          question_index: 2,
          text: "스스로 학습계획을 세우고 실천한 경험을 말해보세요.",
          tag: "자기주도학습",
          purpose: ["자기주도학습 능력 확인"],
        },
        {
          essay_id: input.essay_id,
          question_index: 3,
          text: "고등학교 입학 후 가장 하고 싶은 활동은 무엇인가요?",
          tag: "활동계획",
          purpose: ["입학 후 계획의 구체성 확인"],
        },
        {
          essay_id: input.essay_id,
          question_index: 4,
          text: "졸업 후 어떤 진로를 꿈꾸고 있나요?",
          tag: "진로계획",
          purpose: ["진로에 대한 구체적인 고민 확인"],
        },
        {
          essay_id: input.essay_id,
          question_index: 5,
          text: "배려나 나눔을 실천한 경험을 구체적으로 말해보세요.",
          tag: "인성",
          purpose: ["인성 역량 확인"],
        },
      ];

      const { error: qError } = await supabase
        .from("jaso_questions")
        .insert(mockQuestions);

      if (qError) throw qError;

      const { error: eError } = await supabase
        .from("jaso_essays")
        .update({ questions_generated: true })
        .eq("id", input.essay_id);

      if (eError) throw eError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-essays"] });
      qc.invalidateQueries({ queryKey: ["my-essays"] });
      qc.invalidateQueries({ queryKey: ["essay-questions"] });
    },
  });
}

// ──────────────────────────────────────────
// 특정 자소서의 예상질문들 조회 (어드민)
// ──────────────────────────────────────────
export function useStudentQuestions(essayId: string | undefined) {
  return useQuery({
    queryKey: ["student-questions", essayId],
    enabled: !!essayId,
    queryFn: async () => {
      if (!essayId) return [];
      const { data, error } = await supabase
        .from("jaso_questions")
        .select("*")
        .eq("essay_id", essayId)
        .order("question_index", { ascending: true });

      if (error) throw error;
      return (data ?? []) as StudentQuestion[];
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// 특정 질문의 피드백 조회 (어드민)
// ──────────────────────────────────────────
export function useStudentQuestionFeedback(questionId: string | undefined) {
  return useQuery({
    queryKey: ["student-question-feedback", questionId],
    enabled: !!questionId,
    queryFn: async () => {
      if (!questionId) return null;
      const { data, error } = await supabase
        .from("jaso_question_feedback")
        .select("*")
        .eq("question_id", questionId)
        .maybeSingle();

      if (error) throw error;
      return data as StudentQuestionFeedback | null;
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// 1차 피드백 (Step 2) 저장
// ──────────────────────────────────────────
export function useSaveFirstFeedback() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      question_id: string;
      teacher_first_feedback: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const teacherId = user?.id ?? null;

      const { data: existing } = await supabase
        .from("jaso_question_feedback")
        .select("id")
        .eq("question_id", input.question_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("jaso_question_feedback")
          .update({
            teacher_first_feedback: input.teacher_first_feedback,
            teacher_first_id: teacherId,
            teacher_first_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("jaso_question_feedback").insert({
          question_id: input.question_id,
          teacher_first_feedback: input.teacher_first_feedback,
          teacher_first_id: teacherId,
          teacher_first_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      const { error: statusError } = await supabase
        .from("jaso_questions")
        .update({ status: "feedback1" })
        .eq("id", input.question_id);

      if (statusError) throw statusError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-question-feedback"] });
      qc.invalidateQueries({ queryKey: ["question-feedback"] });
      qc.invalidateQueries({ queryKey: ["student-questions"] });
      qc.invalidateQueries({ queryKey: ["essay-questions"] });
    },
  });
}

// ──────────────────────────────────────────
// 최종 피드백 (Step 4) 저장
// ──────────────────────────────────────────
export function useSaveFinalFeedback() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      question_id: string;
      teacher_final_feedback: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const teacherId = user?.id ?? null;

      const { data: existing } = await supabase
        .from("jaso_question_feedback")
        .select("id")
        .eq("question_id", input.question_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("jaso_question_feedback")
          .update({
            teacher_final_feedback: input.teacher_final_feedback,
            teacher_final_id: teacherId,
            teacher_final_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("jaso_question_feedback").insert({
          question_id: input.question_id,
          teacher_final_feedback: input.teacher_final_feedback,
          teacher_final_id: teacherId,
          teacher_final_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      const { error: statusError } = await supabase
        .from("jaso_questions")
        .update({ status: "feedback2" })
        .eq("id", input.question_id);

      if (statusError) throw statusError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-question-feedback"] });
      qc.invalidateQueries({ queryKey: ["question-feedback"] });
      qc.invalidateQueries({ queryKey: ["student-questions"] });
      qc.invalidateQueries({ queryKey: ["essay-questions"] });
    },
  });
}

// ──────────────────────────────────────────
// 꼬리질문 추가/수정/삭제 (어드민)
// ──────────────────────────────────────────
export function useUpdateTailQuestions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      question_id: string;
      tail_questions: StudentTailQuestion[];
    }) => {
      const { data: existing } = await supabase
        .from("jaso_question_feedback")
        .select("id")
        .eq("question_id", input.question_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("jaso_question_feedback")
          .update({ tail_questions: input.tail_questions })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("jaso_question_feedback").insert({
          question_id: input.question_id,
          tail_questions: input.tail_questions,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-question-feedback"] });
      qc.invalidateQueries({ queryKey: ["question-feedback"] });
    },
  });
}