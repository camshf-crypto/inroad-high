import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
export interface BookRecord {
  summary?: string;
  quote?: string;
  feeling?: string;
  careerLink?: string;
}

export interface Booklist {
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

  record: BookRecord;

  added_at: string;
  created_at: string;
  updated_at: string;
}

export interface BooklistFeedback {
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
// 학생 본인 책 목록 조회
// ──────────────────────────────────────────
export function useMyBooks(studentId: string | undefined) {
  return useQuery({
    queryKey: ["my-books", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("booklist")
        .select("*")
        .eq("student_id", studentId)
        .order("added_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Booklist[];
    },
    refetchInterval: 5000, // 5초마다 갱신 (피드백 받았는지)
  });
}

// ──────────────────────────────────────────
// 책 추가
// ──────────────────────────────────────────
export interface AddBookInput {
  student_id: string;
  academy_id: string;
  isbn?: string;
  title: string;
  author?: string;
  publisher?: string;
  year?: string;
  thumbnail?: string;
  contents?: string;
  category: string;
}

export function useAddBook() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddBookInput) => {
      const { data, error } = await supabase
        .from("booklist")
        .insert({
          student_id: input.student_id,
          academy_id: input.academy_id,
          isbn: input.isbn ?? null,
          title: input.title,
          author: input.author ?? null,
          publisher: input.publisher ?? null,
          year: input.year ?? null,
          thumbnail: input.thumbnail ?? null,
          contents: input.contents ?? null,
          category: input.category,
          record: {},
        })
        .select()
        .single();

      if (error) throw error;
      return data as Booklist;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-books"] });
    },
  });
}

// ──────────────────────────────────────────
// 독서 기록 작성/수정
// ──────────────────────────────────────────
export function useUpdateBookRecord() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { booklist_id: string; record: BookRecord }) => {
      const { data, error } = await supabase
        .from("booklist")
        .update({
          record: input.record,
        })
        .eq("id", input.booklist_id)
        .select()
        .single();

      if (error) throw error;
      return data as Booklist;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-books"] });
    },
  });
}

// ──────────────────────────────────────────
// 책 삭제
// ──────────────────────────────────────────
export function useDeleteBook() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (booklistId: string) => {
      const { error } = await supabase
        .from("booklist")
        .delete()
        .eq("id", booklistId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-books"] });
    },
  });
}

// ──────────────────────────────────────────
// 본인 책의 피드백 조회 (자동 갱신)
// ──────────────────────────────────────────
export function useBookFeedback(booklistId: string | undefined) {
  return useQuery({
    queryKey: ["book-feedback", booklistId],
    enabled: !!booklistId,
    queryFn: async () => {
      if (!booklistId) return null;
      const { data, error } = await supabase
        .from("booklist_feedback")
        .select("*")
        .eq("booklist_id", booklistId)
        .maybeSingle();

      if (error) throw error;
      return data as BooklistFeedback | null;
    },
    refetchInterval: 5000, // 피드백 받으면 자동으로 보임
  });
}
