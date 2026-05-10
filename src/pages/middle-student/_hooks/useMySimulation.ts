import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
export interface SimulationQuestion {
  num: number;
  text: string;
  answered: boolean;
  answer_audio_url?: string | null;
  answer_transcript?: string | null;
  answer_duration_sec?: number;
}

// 학생이 답변한 데이터 (업로드 전)
export interface SimulationAnswerInput {
  num: number;
  text: string;
  audio_blob: Blob | null;
  duration_sec: number;
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
// 헬퍼: Blob → base64 (CSR Edge Function 입력용)
// ──────────────────────────────────────────
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // "data:audio/webm;base64,XXXX" → "XXXX"만 추출
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
// 질문별 음성 업로드 + STT (CSR 단문) + 시뮬레이션 저장
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
      answers: SimulationAnswerInput[];
      duration: string;
    }) => {
      // 1️⃣ 각 질문별 음성 업로드 + STT (CSR — 단문, 1분 이내)
      const processedQuestions: SimulationQuestion[] = [];
      const transcriptParts: string[] = [];

      for (let i = 0; i < input.answers.length; i++) {
        const ans = input.answers[i];
        let audioUrl: string | null = null;
        let transcript: string | null = null;

        if (ans.audio_blob && ans.audio_blob.size > 0) {
          // 1-1. STT 먼저 호출 (CSR — base64 직접 전송, 즉시 응답)
          //      Storage 업로드 안 기다려도 됨 → 빠름
          try {
            const audioBase64 = await blobToBase64(ans.audio_blob);

            const { data: sttData, error: sttError } =
              await supabase.functions.invoke("middle-stt-short", {
                body: { audioBase64 },
              });

            if (!sttError && sttData?.success && sttData?.text) {
              transcript = sttData.text;
              transcriptParts.push(`Q${ans.num}. ${transcript}`);
              console.log(`✅ Q${ans.num} STT:`, transcript?.slice(0, 50));
            } else if (sttError) {
              console.error(`Q${ans.num} STT 에러:`, sttError);
            }
          } catch (e) {
            console.error(`Q${ans.num} STT 오류:`, e);
          }

          // 1-2. Storage 업로드 (음성 파일 보관)
          const fileName = `${input.student_id}/${Date.now()}-q${ans.num}.webm`;
          const { error: uploadError } = await supabase.storage
            .from("simulation-audio")
            .upload(fileName, ans.audio_blob, {
              contentType: "audio/webm",
            });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("simulation-audio")
              .getPublicUrl(fileName);
            audioUrl = urlData.publicUrl;
          } else {
            console.error(`Q${ans.num} 업로드 실패:`, uploadError);
          }
        }

        processedQuestions.push({
          num: ans.num,
          text: ans.text,
          answered: !!ans.audio_blob,
          answer_audio_url: audioUrl,
          answer_transcript: transcript,
          answer_duration_sec: ans.duration_sec,
        });
      }

      // 2️⃣ 시뮬레이션 INSERT
      const fullTranscript = transcriptParts.join("\n\n");

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
          questions: processedQuestions,
          audio_url: null,
          duration: input.duration,
          transcript: fullTranscript || null,
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
      // 시뮬레이션 + 질문별 audio_url 다 가져오기
      const { data: sim } = await supabase
        .from("middle_simulations")
        .select("questions")
        .eq("id", simId)
        .single();

      // 각 질문별 음성 파일 삭제
      const filesToDelete: string[] = [];
      const questions = (sim?.questions ?? []) as SimulationQuestion[];
      for (const q of questions) {
        if (q.answer_audio_url) {
          const url = new URL(q.answer_audio_url);
          const pathParts = url.pathname.split("/simulation-audio/");
          if (pathParts.length > 1) {
            filesToDelete.push(pathParts[1]);
          }
        }
      }

      if (filesToDelete.length > 0) {
        await supabase.storage.from("simulation-audio").remove(filesToDelete);
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