import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
export interface StudentSimulation {
  id: string;
  student_id: string;
  academy_id: string;
  question_type: string;
  question_type_label: string;
  school: string;
  tail_question: boolean;
  question_mode: string;
  questions: { num: number; text: string; answered: boolean }[];
  audio_url: string | null;
  duration: string | null;
  transcript: string | null;
  ai_analysis: any;
  teacher_feedback: string | null;
  teacher_feedback_at: string | null;
  teacher_feedback_id: string | null;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────
// 학생의 시뮬레이션 목록 (어드민)
// ──────────────────────────────────────────
export function useStudentSimulations(studentId: string | undefined) {
  return useQuery({
    queryKey: ["student-simulations", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("middle_simulations")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as StudentSimulation[];
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// 어드민 피드백 저장
// ──────────────────────────────────────────
export function useSaveSimulationFeedback() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { sim_id: string; teacher_feedback: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const teacherId = user?.id ?? null;

      const { error } = await supabase
        .from("middle_simulations")
        .update({
          teacher_feedback: input.teacher_feedback,
          teacher_feedback_at: new Date().toISOString(),
          teacher_feedback_id: teacherId,
        })
        .eq("id", input.sim_id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-simulations"] });
      qc.invalidateQueries({ queryKey: ["my-simulations"] });
    },
  });
}

// ──────────────────────────────────────────
// 어드민이 시뮬레이션 삭제
// ──────────────────────────────────────────
export function useDeleteStudentSimulation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (simId: string) => {
      const { data: sim } = await supabase
        .from("middle_simulations")
        .select("audio_url")
        .eq("id", simId)
        .single();

      if (sim?.audio_url) {
        const url = new URL(sim.audio_url);
        const pathParts = url.pathname.split("/simulation-audio/");
        if (pathParts.length > 1) {
          await supabase.storage
            .from("simulation-audio")
            .remove([pathParts[1]]);
        }
      }

      const { error } = await supabase
        .from("middle_simulations")
        .delete()
        .eq("id", simId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["student-simulations"] });
      qc.invalidateQueries({ queryKey: ["my-simulations"] });
    },
  });
}
