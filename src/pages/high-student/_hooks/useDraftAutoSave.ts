// src/pages/high-student/_hooks/useDraftAutoSave.ts

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const SAVE_DEBOUNCE_MS = 1000;

export type DraftStatus = "idle" | "saving" | "saved" | "error";

interface UseDraftAutoSaveResult {
  text: string;
  setText: (text: string) => void;
  status: DraftStatus;
  lastSavedAt: Date | null;
  clearDraft: () => Promise<void>;
  isLoading: boolean;
}

export function useDraftAutoSave(
  studentId: string | undefined,
  draftKey: string,
  initialValue: string = "",
  disabled: boolean = false,
): UseDraftAutoSaveResult {
  const [text, setTextState] = useState(initialValue);
  const [status, setStatus] = useState<DraftStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const lastSavedTextRef = useRef(initialValue);

  useEffect(() => {
    if (!studentId || disabled) {
      setIsLoading(false);
      initializedRef.current = true;
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("student_drafts")
          .select("content")
          .eq("student_id", studentId)
          .eq("draft_key", draftKey)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("[draft] 로드 실패:", error);
          setIsLoading(false);
          initializedRef.current = true;
          return;
        }

        if (data?.content) {
          setTextState(data.content);
          lastSavedTextRef.current = data.content;
          setStatus("saved");
          setLastSavedAt(new Date());
        }

        setIsLoading(false);
        initializedRef.current = true;
      } catch (e) {
        console.error("[draft] 로드 오류:", e);
        if (!cancelled) {
          setIsLoading(false);
          initializedRef.current = true;
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, draftKey, disabled]);

  const setText = useCallback(
    (newText: string) => {
      setTextState(newText);

      if (!studentId || disabled || !initializedRef.current) return;
      if (newText === lastSavedTextRef.current) return;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(async () => {
        setStatus("saving");
        try {
          const { error } = await supabase.from("student_drafts").upsert(
            {
              student_id: studentId,
              draft_key: draftKey,
              content: newText,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "student_id,draft_key" },
          );

          if (error) {
            console.error("[draft] 저장 실패:", error);
            setStatus("error");
            return;
          }

          lastSavedTextRef.current = newText;
          setStatus("saved");
          setLastSavedAt(new Date());
        } catch (e) {
          console.error("[draft] 저장 오류:", e);
          setStatus("error");
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [studentId, draftKey, disabled],
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const clearDraft = useCallback(async () => {
    if (!studentId) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    try {
      await supabase
        .from("student_drafts")
        .delete()
        .eq("student_id", studentId)
        .eq("draft_key", draftKey);

      setTextState("");
      lastSavedTextRef.current = "";
      setStatus("idle");
      setLastSavedAt(null);
    } catch (e) {
      console.error("[draft] 삭제 오류:", e);
    }
  }, [studentId, draftKey]);

  return { text, setText, status, lastSavedAt, clearDraft, isLoading };
}