// src/lib/useSpeechRecognition.ts
// 브라우저 Web Speech API 음성 인식 훅 (한국어)
// 토론 중 학생 발언 인식에 사용

import { useState, useRef, useCallback, useEffect } from "react";

// 브라우저 타입 보강
interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

function getRecognition(): ISpeechRecognition | null {
  const w = window as any;
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SR) return null;
  return new SR();
}

export function useSpeechRecognition() {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);

  const recogRef = useRef<ISpeechRecognition | null>(null);
  const shouldListenRef = useRef(false);
  const finalRef = useRef("");

  // 초기화
  useEffect(() => {
    const recog = getRecognition();
    if (!recog) {
      setSupported(false);
      return;
    }
    recog.lang = "ko-KR";
    recog.continuous = true;
    recog.interimResults = true;

    recog.onresult = (event: any) => {
      let interim = "";
      let final = finalRef.current;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          final += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }
      finalRef.current = final;
      setTranscript((final + interim).trim());
    };

    recog.onerror = (event: any) => {
      // no-speech, aborted 등은 조용히 무시
      if (event.error === "no-speech" || event.error === "aborted") return;
      console.warn("STT error:", event.error);
    };

    recog.onend = () => {
      // 계속 들어야 하는 상태면 자동 재시작 (continuous가 끊길 때 대비)
      if (shouldListenRef.current) {
        try {
          recog.start();
        } catch {
          // 이미 시작된 경우 무시
        }
      } else {
        setIsListening(false);
      }
    };

    recogRef.current = recog;

    return () => {
      shouldListenRef.current = false;
      try {
        recog.abort();
      } catch {
        // 무시
      }
      recogRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    const recog = recogRef.current;
    if (!recog) return;
    shouldListenRef.current = true;
    try {
      recog.start();
      setIsListening(true);
    } catch {
      // 이미 시작된 경우 무시
    }
  }, []);

  const stop = useCallback(() => {
    const recog = recogRef.current;
    shouldListenRef.current = false;
    if (!recog) return;
    try {
      recog.stop();
    } catch {
      // 무시
    }
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    finalRef.current = "";
    setTranscript("");
  }, []);

  return { transcript, isListening, supported, start, stop, reset };
}