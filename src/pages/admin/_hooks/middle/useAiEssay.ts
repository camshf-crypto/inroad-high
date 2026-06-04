// src/pages/admin/_hooks/middle/useAiEssay.ts
// 자소서 AI 분석 + 예상질문 생성 — Edge Function 호출
// ★ 변경점: 학교 특색(profile) + 문항·배점(rubric)을 함께 Edge Function으로 전달
//   → AI가 "이 학교 기준"으로 분석 + 학생용 피드백 / 선생님용 코칭을 분리 생성

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getSchoolEssayData, getSection } from "@/constants/schoolEssayData";

// ============================================================
// 결과 타입
// ============================================================

// 학생 초안에서 따온 문장 단위 진단
export interface QuoteFeedback {
  text: string;                         // 학생 원문 인용 (그대로)
  type: "strength" | "weak" | "missing"; // 잘함 / 아쉬움 / 빠짐
  comment: string;                      // 왜 그런지 (수정문장 아님)
}

// 항목별 충족도 (그래프용)
export interface CriterionScore {
  label: string;   // 목표·계획 / 실행 과정 / 결과 평가 / 학교 연계 ...
  level: "high" | "mid" | "low";  // 충분 / 보통 / 부족
  ratio: number;   // 0~100 (막대 길이)
  desc: string;
}

// 학생용 피드백 블록
export interface StudentFeedback {
  completeness: number;     // 현재 완성도 % (0~100)
  passLine: number;         // 합격선 % (보통 80)
  statusLabel: string;      // "합격선 진입 직전" 등
  summary: string;          // 2문장 총평
  criteria: CriterionScore[]; // 항목별 충족도 (그래프)
  quotes: QuoteFeedback[];    // 문장별 진단
}

// 선생님 코칭 단계
export interface CoachingStep {
  order: number;
  priority: "urgent" | "normal";
  title: string;        // "결과 평가 채우기"
  why: string;          // 왜 중요한가 (입시 맥락 한 줄)
  askText: string;      // 학생에게 던질 실제 질문 (대사)
  followUp: string;     // 학생이 답하면 어떻게 이어갈지
}

// 선생님용 코칭 블록
export interface TeacherCoaching {
  steps: CoachingStep[];
  expectedFrom: number; // 채우기 전 % (= completeness)
  expectedTo: number;   // 채운 후 예상 %
  caution: string;      // "문장 대신 쓰지 마세요" 등
}

export interface SectionAnalysisResult {
  evalCriteria: string;
  scoringMode: "official" | "platform";
  maxScore: number;
  totalScore: number;
  // 신규: 학생용 / 선생님용 분리
  feedback: StudentFeedback;
  coaching: TeacherCoaching;
  // 하위호환(기존 화면이 참조하던 필드 — 점진적 마이그레이션용)
  scores: { label: string; score: number; max: number; desc: string }[];
  studentScores: number[];
  summary: string;
  strengths: string[];
  improvements: string[];
  reflectiveQuestions?: string[];
  keywordReflection: string;
  teacherDraft: string;
}

// ============================================================
// 1. 자소서 항목별 AI 분석 (학교 데이터 주입)
// ============================================================
export interface AnalyzeSectionInput {
  schoolName: string;
  sectionKey: string;      // 자유 문자열 (학교마다 영역이 다르므로 고정 union 제거)
  sectionLabel: string;
  answerText: string;
  keywords?: string[];
  studentName?: string;
  previousAnswer?: string;
  previousFeedback?: string;
}

export function useAnalyzeSection() {
  return useMutation({
    mutationFn: async (input: AnalyzeSectionInput): Promise<SectionAnalysisResult> => {
      // ★ 클라이언트에서 학교 데이터(특색+문항·배점)를 찾아 함께 전달
      const schoolData = getSchoolEssayData(input.schoolName);
      const section = getSection(input.schoolName, input.sectionKey) ??
        getSection(input.schoolName, input.sectionLabel);

      const { data, error } = await supabase.functions.invoke("middle-essay-analyze", {
        body: {
          ...input,
          // 학교 데이터 페이로드 (없으면 null → Edge Function이 문항 없이 분석)
          schoolProfile: schoolData?.profile ?? null,
          scoringMode: schoolData?.scoringMode ?? "official",
          rubricSection: section
            ? {
                label: section.label,
                max: section.max ?? null,
                charLimit: section.charLimit ?? null,
                question: section.question,
              }
            : null,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "AI 분석 실패");

      return data.analysis as SectionAnalysisResult;
    },
  });
}

// ============================================================
// 2. 자소서 → 예상질문 AI 생성 (학교 데이터 주입)
// ============================================================
export interface GeneratedQuestion {
  text: string;
  tag: string;
  purpose: string[];
  targetSection: string;
}

export interface GenerateQuestionsInput {
  schoolName: string;
  studentName?: string;
  sections: Record<string, string>;
  keywords?: string[];
  count?: number;
}

export function useGenerateQuestionsAi() {
  return useMutation({
    mutationFn: async (input: GenerateQuestionsInput): Promise<GeneratedQuestion[]> => {
      const schoolData = getSchoolEssayData(input.schoolName);

      const { data, error } = await supabase.functions.invoke("middle-essay-questions", {
        body: {
          count: 8,
          ...input,
          schoolProfile: schoolData?.profile ?? null,
          rubricSections: schoolData?.sections ?? null,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "예상질문 생성 실패");

      return data.questions as GeneratedQuestion[];
    },
  });
}

// ============================================================
// 3. 학생 답변 분석 (예상질문 답변) — 학교명만 사용 (기존 유지)
// ============================================================
export interface AnalyzeAnswerInput {
  schoolName: string;
  questionText: string;
  studentAnswer: string;
  questionPurpose?: string[];
  studentName?: string;
  isUpgrade?: boolean;
  previousFeedback?: string;
}

export function useAnalyzeAnswer() {
  return useMutation({
    mutationFn: async (input: AnalyzeAnswerInput): Promise<SectionAnalysisResult> => {
      const { data, error } = await supabase.functions.invoke("middle-essay-analyze-answer", {
        body: { ...input },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "답변 분석 실패");
      return data.analysis as SectionAnalysisResult;
    },
  });
}