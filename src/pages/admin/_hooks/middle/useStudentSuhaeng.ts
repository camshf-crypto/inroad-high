import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface StudentSubmission {
  id: string;
  student_id: string;
  academy_id: string;
  question_key: string;
  question_type: string;
  question_title: string;
  question_content: string | null;
  question_category: string;
  question_school_name: string | null;
  question_subject: string | null;
  question_ratio: number | null;
  question_min_chars: number | null;
  question_max_chars: number | null;
  answer_text: string | null;
  answer_sections: any | null;
  answer_audio_url: string | null;
  answer_video_url: string | null;
  answer_photo_urls: string[] | null;
  status: "pending" | "analyzed" | "first_done" | "resubmitted" | "completed";
  submitted_at: string;
  resubmitted_text: string | null;
  resubmitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentFeedback {
  id: string;
  submission_id: string;
  ai_analysis: any | null;
  ai_analyzed_at: string | null;
  ai_second_analysis: any | null;
  ai_second_analyzed_at: string | null;
  teacher_first_feedback: string | null;
  teacher_first_id: string | null;
  teacher_first_at: string | null;
  teacher_final_feedback: string | null;
  teacher_final_id: string | null;
  teacher_final_at: string | null;
  created_at: string;
  updated_at: string;
}

// 특정 학생의 모든 답안 조회
export function useStudentSuhaengSubmissions(studentId: string | undefined) {
  return useQuery({
    queryKey: ["student-suhaeng-submissions", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("suhaeng_submissions")
        .select("*")
        .eq("student_id", studentId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as StudentSubmission[];
    },
    refetchInterval: 5000,
  });
}

// 특정 답안의 피드백 조회
export function useSubmissionFeedback(submissionId: string | undefined) {
  return useQuery({
    queryKey: ["submission-feedback", submissionId],
    enabled: !!submissionId,
    queryFn: async () => {
      if (!submissionId) return null;
      const { data, error } = await supabase
        .from("suhaeng_feedback")
        .select("*")
        .eq("submission_id", submissionId)
        .maybeSingle();

      if (error) throw error;
      return data as StudentFeedback | null;
    },
  });
}

// AI 분석 결과 저장
export function useSaveAiAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { submission_id: string; ai_analysis: any }) => {
      const { data: existing } = await supabase
        .from("suhaeng_feedback")
        .select("id")
        .eq("submission_id", input.submission_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("suhaeng_feedback")
          .update({
            ai_analysis: input.ai_analysis,
            ai_analyzed_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suhaeng_feedback").insert({
          submission_id: input.submission_id,
          ai_analysis: input.ai_analysis,
          ai_analyzed_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      const { error: statusError } = await supabase
        .from("suhaeng_submissions")
        .update({ status: "analyzed" })
        .eq("id", input.submission_id);

      if (statusError) throw statusError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submission-feedback"] });
      qc.invalidateQueries({ queryKey: ["student-suhaeng-submissions"] });
    },
  });
}

// 1차 피드백 - Supabase auth에서 자동으로 teacher_id 가져옴
export function useSaveFirstFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      submission_id: string;
      teacher_first_feedback: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const teacherId = user?.id ?? null;

      const { data: existing } = await supabase
        .from("suhaeng_feedback")
        .select("id")
        .eq("submission_id", input.submission_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("suhaeng_feedback")
          .update({
            teacher_first_feedback: input.teacher_first_feedback,
            teacher_first_id: teacherId,
            teacher_first_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suhaeng_feedback").insert({
          submission_id: input.submission_id,
          teacher_first_feedback: input.teacher_first_feedback,
          teacher_first_id: teacherId,
          teacher_first_at: new Date().toISOString(),
        });
        if (error) throw error;
      }

      const { error: statusError } = await supabase
        .from("suhaeng_submissions")
        .update({ status: "first_done" })
        .eq("id", input.submission_id);

      if (statusError) throw statusError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submission-feedback"] });
      qc.invalidateQueries({ queryKey: ["student-suhaeng-submissions"] });
    },
  });
}

// 최종 피드백
export function useSaveFinalFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      submission_id: string;
      teacher_final_feedback: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const teacherId = user?.id ?? null;

      const { error } = await supabase
        .from("suhaeng_feedback")
        .update({
          teacher_final_feedback: input.teacher_final_feedback,
          teacher_final_id: teacherId,
          teacher_final_at: new Date().toISOString(),
        })
        .eq("submission_id", input.submission_id);

      if (error) throw error;

      const { error: statusError } = await supabase
        .from("suhaeng_submissions")
        .update({ status: "completed" })
        .eq("id", input.submission_id);

      if (statusError) throw statusError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["submission-feedback"] });
      qc.invalidateQueries({ queryKey: ["student-suhaeng-submissions"] });
    },
  });
}
