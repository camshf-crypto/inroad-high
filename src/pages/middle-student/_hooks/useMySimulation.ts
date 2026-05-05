import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
export interface SimulationQuestion {
  num: number;
  text: string;
  answered: boolean;
}

export interface MySimulation {
  id: string;
  student_id: string;
  academy_id: string;
  question_type: "past" | "essay" | "record";
  question_type_label: string;
  school: string;
  tail_question: boolean;
  question_mode: "text" | "voice" | "both";
  questions: SimulationQuestion[];
  audio_url: string | null;
  duration: string | null;
  transcript: string | null;
  ai_analysis: any;
  teacher_feedback: string | null;
  teacher_feedback_at: string | null;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────
// 본인 시뮬레이션 목록
// ──────────────────────────────────────────
export function useMySimulations(studentId: string | undefined) {
  return useQuery({
    queryKey: ["my-simulations", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("middle_simulations")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as MySimulation[];
    },
    refetchInterval: 5000,
  });
}

// ──────────────────────────────────────────
// 음성 파일 업로드 + 시뮬레이션 저장
// ──────────────────────────────────────────
export function useCreateSimulation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      student_id: string;
      academy_id: string;
      question_type: "past" | "essay" | "record";
      question_type_label: string;
      school: string;
      tail_question: boolean;
      question_mode: "text" | "voice" | "both";
      questions: SimulationQuestion[];
      audio_blob: Blob | null;
      duration: string;
    }) => {
      let audioUrl: string | null = null;

      // 음성 파일 업로드
      if (input.audio_blob) {
        const fileName = `${input.student_id}/${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage
          .from("simulation-audio")
          .upload(fileName, input.audio_blob, {
            contentType: "audio/webm",
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("simulation-audio")
          .getPublicUrl(fileName);

        audioUrl = urlData.publicUrl;
      }

      // 시뮬레이션 INSERT
      const { data, error } = await supabase
        .from("middle_simulations")
        .insert({
          student_id: input.student_id,
          academy_id: input.academy_id,
          question_type: input.question_type,
          question_type_label: input.question_type_label,
          school: input.school,
          tail_question: input.tail_question,
          question_mode: input.question_mode,
          questions: input.questions,
          audio_url: audioUrl,
          duration: input.duration,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MySimulation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-simulations"] });
      qc.invalidateQueries({ queryKey: ["student-simulations"] });
    },
  });
}

// ──────────────────────────────────────────
// 시뮬레이션 삭제
// ──────────────────────────────────────────
export function useDeleteSimulation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (simId: string) => {
      // 음성 파일 먼저 가져와서 Storage에서 삭제
      const { data: sim } = await supabase
        .from("middle_simulations")
        .select("audio_url, student_id")
        .eq("id", simId)
        .single();

      if (sim?.audio_url) {
        // URL에서 파일 경로 추출
        const url = new URL(sim.audio_url);
        const pathParts = url.pathname.split("/simulation-audio/");
        if (pathParts.length > 1) {
          await supabase.storage
            .from("simulation-audio")
            .remove([pathParts[1]]);
        }
      }

      // DB 삭제
      const { error } = await supabase
        .from("middle_simulations")
        .delete()
        .eq("id", simId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-simulations"] });
      qc.invalidateQueries({ queryKey: ["student-simulations"] });
    },
  });
}
