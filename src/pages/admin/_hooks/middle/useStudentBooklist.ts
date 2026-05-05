import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
export interface StudentBook {
  id: string;
  student_id: string;
  academy_id: string;
  isbn: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  year: string | null;
  thumbnail: string | null;
  contents: string | null;
  category: string;
  record: {
    summary?: string;
    quote?: string;
    feeling?: string;
    careerLink?: string;
  };
  added_at: string;
  created_at: string;
  updated_at: string;
}

export interface StudentBookFeedback {
  id: string;
  booklist_id: string;
  ai_analysis: any | null;
  ai_analyzed_at: string | null;
  teacher_feedback: string | null;
  teacher_id: string | null;
  teacher_at: string | null;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────
// 특정 학생의 모든 책 조회 (어드민용)
// ──────────────────────────────────────────
export function useStudentBooks(studentId: string | undefined) {
  return useQuery({
    queryKey: ["student-books", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("booklist")
        .select("*")
        .eq("student_id", studentId)
        .order("added_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as StudentBook[];
    },
    refetchInterval: 5000, // 학생이 새 책 추가하면 자동 표시
  });
}

// ──────────────────────────────────────────
// 특정 책의 피드백 조회
// ──────────────────────────────────────────
export function useBookFeedbackForAdmin(booklistId: string | undefined) {
  return useQuery({
    queryKey: ["book-feedback-admin", booklistId],
    enabled: !!booklistId,
    queryFn: async () => {
      if (!booklistId) return null;
      const { data, error } = await supabase
        .from("booklist_feedback")
        .select("*")
        .eq("booklist_id", booklistId)
        .maybeSingle();

      if (error) throw error;
      return data as StudentBookFeedback | null;
    },
  });
}

// ──────────────────────────────────────────
// AI 피드백 시안 저장
// ──────────────────────────────────────────
export function useSaveBookAiAnalysis() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { booklist_id: string; ai_analysis: any }) => {
      const { data: existing } = await supabase
        .from("booklist_feedback")
        .select("id")
        .eq("booklist_id", input.booklist_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("booklist_feedback")
          .update({
            ai_analysis: input.ai_analysis,
            ai_analyzed_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("booklist_feedback").insert({
          booklist_id: input.booklist_id,
          ai_analysis: input.ai_analysis,
          ai_analyzed_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["book-feedback-admin"] });
    },
  });
}

// ──────────────────────────────────────────
// 선생님 피드백 저장
// ──────────────────────────────────────────
export function useSaveBookFeedback() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      booklist_id: string;
      teacher_feedback: string;
    }) => {
      // Supabase auth에서 자동으로 user.id 가져오기
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const teacherId = user?.id ?? null;

      const { data: existing } = await supabase
        .from("booklist_feedback")
        .select("id")
        .eq("booklist_id", input.booklist_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("booklist_feedback")
          .update({
            teacher_feedback: input.teacher_feedback,
            teacher_id: teacherId,
            teacher_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("booklist_feedback").insert({
          booklist_id: input.booklist_id,
          teacher_feedback: input.teacher_feedback,
          teacher_id: teacherId,
          teacher_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["book-feedback-admin"] });
      qc.invalidateQueries({ queryKey: ["student-books"] });
    },
  });
}

// ──────────────────────────────────────────
// 피드백 삭제 (수정하기용)
// ──────────────────────────────────────────
export function useClearBookFeedback() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (booklistId: string) => {
      const { error } = await supabase
        .from("booklist_feedback")
        .update({
          teacher_feedback: null,
          teacher_at: null,
        })
        .eq("booklist_id", booklistId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["book-feedback-admin"] });
      qc.invalidateQueries({ queryKey: ["student-books"] });
    },
  });
}
