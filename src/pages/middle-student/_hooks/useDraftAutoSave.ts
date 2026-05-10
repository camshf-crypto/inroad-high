// src/pages/middle-student/_hooks/useDraftAutoSave.ts
// ──────────────────────────────────────────────────────────────
// 자동 임시저장 훅
//
// 사용법:
//   const [text, setText, status] = useDraftAutoSave(
//     studentId,
//     'expect:answer:abc-123',
//     ''  // 초기값 (보통 빈 문자열 또는 DB의 기존 답변)
//   )
//
//   // textarea
//   <textarea value={text} onChange={(e) => setText(e.target.value)} />
//
//   // 저장 상태 표시
//   <DraftStatus status={status} />
//
//   // 답변 제출 후 임시저장 삭제
//   await clearDraft()
//
// 동작:
//   1. 컴포넌트 마운트 시 DB에서 임시저장 로드
//   2. 학생이 타이핑하면 5초 debounce 후 자동 저장
//   3. 저장 상태 (idle / saving / saved / error)를 status로 반환
//   4. clearDraft() 호출하면 DB에서 row 삭제 (제출 완료 시)
// ──────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const SAVE_DEBOUNCE_MS = 5000; // 5초

export type DraftStatus = "idle" | "saving" | "saved" | "error";

interface UseDraftAutoSaveResult {
  text: string;
  setText: (text: string) => void;
  status: DraftStatus;
  lastSavedAt: Date | null;
  clearDraft: () => Promise<void>;  // 제출 후 호출
  isLoading: boolean;                // 초기 로드 중
}

/**
 * 자동 임시저장 훅
 * @param studentId 학생 ID (없으면 자동저장 비활성화)
 * @param draftKey 임시저장 키 (예: "expect:answer:question-id")
 * @param initialValue 초기값 (DB에 임시저장 없으면 이 값 사용)
 * @param disabled 비활성화 여부 (예: 이미 답변 제출 완료 시 true)
 */
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

  // ── 초기 로드 (DB에서 임시저장 가져오기) ──────────────────
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
          // DB에 임시저장 있으면 그걸로 시작
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

    return () => {
      cancelled = true;
    };
    // draftKey가 바뀌면 다시 로드
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, draftKey, disabled]);

  // ── 자동 저장 (5초 debounce) ──────────────────────────────
  const setText = useCallback(
    (newText: string) => {
      setTextState(newText);

      if (!studentId || disabled || !initializedRef.current) {
        return;
      }

      // 변경 안 됐으면 skip
      if (newText === lastSavedTextRef.current) {
        return;
      }

      // 기존 타이머 취소
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // 새 타이머 시작
      saveTimerRef.current = setTimeout(async () => {
        setStatus("saving");
        try {
          // UPSERT (있으면 업데이트, 없으면 INSERT)
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

  // ── 컴포넌트 언마운트 시 타이머 정리 ──────────────────────
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // ── 제출 완료 후 임시저장 삭제 ────────────────────────────
  const clearDraft = useCallback(async () => {
    if (!studentId) return;

    // 진행 중인 자동저장 취소
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

  return {
    text,
    setText,
    status,
    lastSavedAt,
    clearDraft,
    isLoading,
  };
}