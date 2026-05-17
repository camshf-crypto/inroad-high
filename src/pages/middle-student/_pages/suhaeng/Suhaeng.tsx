import React, { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { studentState, academyState } from "@/lib/auth/atoms";
import {
  useSubmitAnswer,
  useMySuhaengSubmissions,
  useMyFeedback,
  useResubmitAnswer,
  useMyAcademyQuestions,
  type AcademySuhaengQuestion,
} from "@/pages/middle-student/_hooks/useSuhaengSubmission";
import { supabase } from "@/lib/supabase";

const MY_SCHOOL_SUHAENG = [
  {
    id: "m1", grade: "중2", subject: "국어", type: "논술형",
    title: "주장하는 글쓰기 (사회 이슈)",
    content: "최근 청소년들의 SNS 사용이 증가하면서 이에 대한 사회적 논의가 많습니다. 청소년의 SNS 사용에 대한 자신의 입장을 정하고, 구체적인 근거를 들어 400자 이상 800자 이내로 논술하시오.",
    ratio: 40, dueIn: 5, urgent: true, practiced: 2, scheduledAt: "2026.05.12",
    minChars: 400, maxChars: 800, timeLimit: 30,
    hints: [
      { title: "입장 선택", desc: "SNS 사용의 장점 또는 단점 중 명확한 입장 선택." },
      { title: "근거 2~3개", desc: "실제 사례, 통계, 경험을 들어 설명." },
      { title: "반박 대응", desc: "반대 입장에 대한 대응도 포함하면 좋아요." },
      { title: "결론", desc: "주장을 다시 확인하며 마무리." },
    ],
    keywords: ["SNS", "청소년", "디지털", "소셜미디어", "중독"],
  },
  {
    id: "m2", grade: "중2", subject: "역사", type: "주제탐구",
    title: "조선 후기 사회 변화 보고서",
    content: "조선 후기(17~19세기) 사회·경제·문화의 변화를 조사하고, 이 변화가 오늘날 우리 사회에 어떤 영향을 미쳤는지 분석하는 탐구 보고서를 작성하시오.",
    ratio: 20, dueIn: 12, urgent: false, practiced: 0, scheduledAt: "2026.05.19",
    timeLimit: 60,
    sections: [
      { key: "background", label: "1. 탐구 배경", placeholder: "왜 조선 후기를 탐구하게 되었는지 작성하세요.", minChars: 50 },
      { key: "method", label: "2. 조사 방법", placeholder: "어떤 자료를 어떻게 조사했는지 작성하세요.", minChars: 50 },
      { key: "content", label: "3. 조사 내용", placeholder: "조선 후기의 사회·경제·문화 변화를 정리하세요.", minChars: 150 },
      { key: "analysis", label: "4. 분석 및 결론", placeholder: "오늘날에 미친 영향을 분석하세요.", minChars: 100 },
      { key: "reference", label: "5. 참고 자료", placeholder: "참고한 자료의 출처를 작성하세요.", minChars: 20 },
    ],
    keywords: ["조선후기", "실학", "서민문화", "상품경제", "신분제"],
  },
  {
    id: "m3", grade: "중2", subject: "과학", type: "탐구수행",
    title: "물질의 상태 변화 실험 보고서",
    content: "얼음이 녹아서 물이 되고, 물이 끓어서 수증기가 되는 과정을 관찰하고, 각 상태 변화의 조건과 특징을 실험을 통해 확인하시오.",
    ratio: 20, dueIn: 18, urgent: false, practiced: 1, scheduledAt: "2026.05.25",
    timeLimit: 45,
    sections: [
      { key: "purpose", label: "실험 목적", placeholder: "무엇을 알아보려는지 작성하세요.", minChars: 30 },
      { key: "hypothesis", label: "가설", placeholder: '예상되는 결과를 "만약 ~라면, ~할 것이다" 형식으로.', minChars: 30 },
      { key: "materials", label: "준비물", placeholder: "사용한 준비물을 나열하세요.", minChars: 20 },
      { key: "procedure", label: "실험 과정", placeholder: "①, ②, ③... 순서대로 작성하세요.", minChars: 80 },
      { key: "result", label: "결과 및 데이터", placeholder: "관찰 내용과 데이터를 정리하세요.", minChars: 80 },
      { key: "conclusion", label: "결론", placeholder: "실험 결과와 가설을 비교하며 정리.", minChars: 50 },
    ],
    keywords: ["상태변화", "융해", "기화", "응고", "액화"],
  },
  {
    id: "m4", grade: "중2", subject: "진로", type: "구술발표",
    title: "나의 관심 직업 3분 발표",
    content: "본인이 관심 있는 직업 하나를 선택하여, 그 직업의 하는 일, 필요한 역량, 본인이 준비해야 할 점을 3~5분 이내로 발표하시오.",
    ratio: 50, dueIn: 24, urgent: false, practiced: 3, scheduledAt: "2026.05.31",
    timeLimit: 30, presentTimeMin: 3, presentTimeMax: 5,
    sections: [
      { key: "topic", label: "발표 주제 (직업명)", placeholder: "예: 데이터 분석가", minChars: 3 },
      { key: "script", label: "발표 원고", placeholder: "인사 → 직업 소개 → 하는 일 → 필요 역량 → 준비 계획 → 마무리", minChars: 200 },
    ],
    checklist: ["큰 목소리로 또렷하게 말한다", "중요한 부분은 천천히 강조한다", "청중과 눈을 맞춘다", "시간 (3~5분) 을 지킨다", "손짓·표정을 적절히 사용한다"],
    keywords: ["직업탐색", "진로", "커리어", "역량", "미래직업"],
  },
]

type Mode = "list" | "practice" | "feedback"

const SECTION_LABEL_MAP: Record<string, string> = {
  background: "1. 탐구 배경", method: "2. 조사 방법", content: "3. 조사 내용",
  analysis: "4. 분석 및 결론", reference: "5. 참고 자료", purpose: "실험 목적",
  hypothesis: "가설", materials: "준비물", procedure: "실험 과정",
  result: "결과 및 데이터", conclusion: "결론", topic: "발표 주제", script: "발표 원고",
}
const SECTION_ORDER = Object.keys(SECTION_LABEL_MAP)

const formatSectionsToText = (sections: Record<string, string>): string => {
  return Object.entries(sections)
    .sort(([a], [b]) => {
      const ai = SECTION_ORDER.indexOf(a), bi = SECTION_ORDER.indexOf(b)
      if (ai === -1) return 1; if (bi === -1) return -1; return ai - bi
    })
    .map(([k, v]) => `[${SECTION_LABEL_MAP[k] || k}]\n${v}`)
    .join("\n\n")
}

const uploadFileToStorage = async (file: File | Blob, studentId: string, questionKey: string, fileType: "audio" | "video" | "photo", fileName?: string): Promise<string | null> => {
  try {
    const ext = fileName?.split(".").pop() || (fileType === "audio" ? "webm" : fileType === "video" ? "mp4" : "jpg")
    const filePath = `${studentId}/${questionKey}/${fileType}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from("suhaeng-files").upload(filePath, file, { cacheControl: "3600", upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from("suhaeng-files").getPublicUrl(filePath)
    return data.publicUrl
  } catch (e) { console.error("파일 업로드 실패:", e); return null }
}

const DRAFT_KEY_PREFIX = "suhaeng-draft:"
const getDraftKey = (question: any) => `${DRAFT_KEY_PREFIX}${question.school ? `practice-${question.id}` : question._isAcademy ? `academy-${question.id}` : `school-${question.id}`}`
const loadDraft = (question: any) => { try { const raw = localStorage.getItem(getDraftKey(question)); return raw ? JSON.parse(raw) : null } catch { return null } }
const saveDraft = (question: any, data: any) => { try { localStorage.setItem(getDraftKey(question), JSON.stringify({ ...data, savedAt: new Date().toISOString() })); return true } catch { return false } }
const clearDraft = (question: any) => { try { localStorage.removeItem(getDraftKey(question)) } catch { } }

function SearchBox() {
  const [query, setQuery] = useState("")
  const [engine, setEngine] = useState<"naver" | "google">("naver")
  const handleSearch = () => {
    if (!query.trim()) return
    window.open(engine === "naver" ? `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}` : `https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank")
    setQuery("")
  }
  return (
    <div>
      <div className="flex gap-1 mb-2">
        <button onClick={() => setEngine("naver")} className={`flex-1 text-[10px] font-bold py-1 rounded-md transition-all ${engine === "naver" ? "bg-green-500 text-white" : "bg-gray-100 text-ink-secondary hover:bg-gray-200"}`}>N 네이버</button>
        <button onClick={() => setEngine("google")} className={`flex-1 text-[10px] font-bold py-1 rounded-md transition-all ${engine === "google" ? "bg-blue-500 text-white" : "bg-gray-100 text-ink-secondary hover:bg-gray-200"}`}>구글</button>
      </div>
      <div className="relative">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="검색어를 입력하세요..." className="w-full h-9 px-3 pr-9 text-[11px] border border-line rounded-md focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted" />
        <button onClick={handleSearch} className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-brand-middle text-white rounded-md hover:bg-brand-middle-hover transition-all text-xs flex items-center justify-center">🔍</button>
      </div>
    </div>
  )
}

function PracticeSidebar({ q }: { q: any }) {
  return (
    <div className="w-[300px] flex-shrink-0 h-full overflow-y-auto pr-1 space-y-3">
      <div className="bg-white border border-line rounded-xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-brand-middle-dark">🔍</span>
          <span className="text-[12px] font-extrabold text-ink">자료 검색</span>
        </div>
        <SearchBox />
        {q.keywords && (
          <div className="mt-3">
            <div className="text-[10px] font-bold text-ink-muted mb-1.5">추천 키워드</div>
            <div className="flex flex-wrap gap-1">
              {q.keywords.map((tag: string) => (
                <button key={tag} onClick={() => window.open(`https://search.naver.com/search.naver?query=${encodeURIComponent(tag)}`, "_blank")} className="text-[10px] px-2 py-0.5 bg-brand-middle-pale text-brand-middle-dark rounded-full border border-brand-middle-light hover:bg-brand-middle hover:text-white transition-all">#{tag}</button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-line">
          <div className="text-[10px] font-bold text-ink-muted mb-1.5">빠른 링크</div>
          <div className="space-y-1">
            {[
              { icon: "📚", label: "네이버 지식백과", url: "https://terms.naver.com" },
              { icon: "📖", label: "위키백과", url: "https://ko.wikipedia.org" },
              { icon: "📊", label: "통계청 KOSIS", url: "https://kosis.kr" },
              { icon: "📰", label: "네이버 뉴스", url: "https://news.naver.com" },
              { icon: "🔬", label: "RISS 논문검색", url: "https://www.riss.kr" },
              { icon: "📑", label: "국회도서관", url: "https://www.nanet.go.kr" },
            ].map((link, i) => (
              <button key={i} onClick={() => window.open(link.url, "_blank")}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-brand-middle-pale transition-colors group">
                <span className="text-sm">{link.icon}</span>
                <span className="text-[11px] font-medium text-ink-secondary group-hover:text-brand-middle-dark transition-colors">{link.label}</span>
                <span className="ml-auto text-[10px] text-ink-muted">↗</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      {q.hints && (
        <div className="bg-white border border-line rounded-xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-1.5 mb-2.5"><span className="text-amber-500">💡</span><span className="text-[12px] font-extrabold text-ink">작성 힌트</span></div>
          <div className="space-y-2">
            {q.hints.map((h: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-md p-2 border border-line">
                <div className="text-[11px] font-bold text-brand-middle-dark mb-0.5">{i + 1}. {h.title}</div>
                <div className="text-[11px] text-ink-secondary leading-[1.5]">{h.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {q.checklist && (
        <div className="bg-white border border-line rounded-xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-1.5 mb-2.5"><span className="text-amber-500">✅</span><span className="text-[12px] font-extrabold text-ink">발표 체크리스트</span></div>
          <div className="space-y-1.5">
            {q.checklist.map((item: string, i: number) => (
              <label key={i} className="flex items-start gap-2 text-[11px] text-ink-secondary leading-[1.5] cursor-pointer hover:text-ink transition-colors">
                <input type="checkbox" className="mt-0.5 accent-brand-middle flex-shrink-0" /><span>{item}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ★ 학기/주제 표시 추가됨
function QuestionCard({ q }: { q: any }) {
  return (
    <div className="bg-white border border-line rounded-xl px-4 py-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
        <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded">문제</span>
        <span className="text-[10px] text-ink-muted font-semibold">
          {q._isAcademy ? `🏫 학원 수행평가` : q.school ? `2026 ${q.school} 수행평가` : `우리 학교 · ${q.scheduledAt || ""}`}
        </span>
        {q.ratio && <span className="text-[10px] text-ink-muted">· 배점 {q.ratio}%</span>}
      </div>
      {/* ★ 학기/주제 뱃지 */}
      {(q.semester || q.topic) && (
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {q.semester && <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-middle-pale text-brand-middle-dark rounded-full border border-brand-middle-light">{q.semester}</span>}
          {q.topic && <span className="text-[10px] font-semibold text-ink-secondary">#{q.topic}</span>}
        </div>
      )}
      <p className="text-[13px] text-ink leading-[1.8]">{q.content}</p>
    </div>
  )
}

function PracticeHeader({ q, secondsLeft, onBack, onSubmit, onSaveDraft, canSubmit, submitting }: any) {
  const timeUrgent = secondsLeft < 300
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const formatTime = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`
  const handleSave = () => { if (onSaveDraft) { const ok = onSaveDraft(); if (ok) { setSavedAt(new Date()); setTimeout(() => setSavedAt(null), 3000) } } }
  return (
    <div className="flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-[12px] font-semibold text-ink-secondary hover:text-ink transition-colors">← 목록으로</button>
        <div className="w-px h-4 bg-line" />
        <div>
          <div className="text-[11px] text-ink-muted font-semibold">{q._isAcademy ? "학원 수행평가" : q.school || "우리 학교"} · {q.subject} {q.type} {q.ratio && `(배점 ${q.ratio}%)`}</div>
          <div className="text-[14px] font-bold text-ink">{q.title}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {savedAt && <div className="text-[11px] font-bold text-brand-middle-dark bg-brand-middle-bg border border-brand-middle-light px-2.5 py-1 rounded-md animate-pulse">✓ 저장됨</div>}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${timeUrgent ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
          <span className="text-xs">🕐</span>
          <span className={`text-[13px] font-extrabold tabular-nums ${timeUrgent ? "text-red-600 animate-pulse" : "text-amber-700"}`}>{formatTime(secondsLeft)}</span>
        </div>
        <button onClick={handleSave} className="h-8 px-3 text-[11px] font-medium text-ink-secondary bg-white border border-line rounded-md hover:border-brand-middle-light hover:bg-brand-middle-pale transition-all">💾 임시저장</button>
        <button onClick={onSubmit} disabled={!canSubmit || submitting} className={`h-8 px-5 text-[12px] font-semibold rounded-md transition-all ${canSubmit && !submitting ? "bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle" : "bg-gray-100 text-ink-muted cursor-not-allowed"}`}>
          {submitting ? "제출 중..." : "제출"}
        </button>
      </div>
    </div>
  )
}

function EssayPractice({ q, onBack, onSubmit, submitting }: any) {
  const [answer, setAnswer] = useState(() => loadDraft(q)?.answer_text || "")
  const [secondsLeft, setSecondsLeft] = useState(q.timeLimit * 60)
  useEffect(() => { if (secondsLeft <= 0) return; const t = setInterval(() => setSecondsLeft((p) => p - 1), 1000); return () => clearInterval(t) }, [secondsLeft])
  const wordCount = answer.length
  const isValid = wordCount >= q.minChars && wordCount <= q.maxChars
  const handleSubmit = () => { if (!isValid) { alert(`${q.minChars}~${q.maxChars}자로 작성해주세요.`); return }; onSubmit({ answer_text: answer }); clearDraft(q) }
  const handleSaveDraft = () => { if (!answer.trim()) { alert("답안을 작성하고 저장해주세요."); return false }; return saveDraft(q, { answer_text: answer }) }
  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <PracticeHeader q={q} secondsLeft={secondsLeft} onBack={onBack} onSubmit={handleSubmit} onSaveDraft={handleSaveDraft} canSubmit={isValid} submitting={submitting} />
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 h-full overflow-y-auto pr-1 space-y-3">
          <QuestionCard q={q} />
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="text-brand-middle-dark">✏️</span><span className="text-[12px] font-bold text-ink">내 답안</span></div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className={`font-extrabold tabular-nums ${wordCount < q.minChars ? "text-ink-muted" : wordCount > q.maxChars ? "text-red-500" : "text-brand-middle-dark"}`}>{wordCount}자</span>
                <span className="text-ink-muted">/ {q.minChars}~{q.maxChars}자</span>
              </div>
            </div>
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="이곳에 답안을 작성하세요." className="w-full h-[500px] p-4 text-[13px] leading-[1.8] text-ink resize-none focus:outline-none placeholder:text-ink-muted" />
          </div>
        </div>
        <PracticeSidebar q={q} />
      </div>
    </div>
  )
}

function ShortAnswerPractice({ q, onBack, onSubmit, submitting }: any) {
  const [answer, setAnswer] = useState(() => loadDraft(q)?.answer_text || "")
  const [secondsLeft, setSecondsLeft] = useState(q.timeLimit * 60)
  useEffect(() => { if (secondsLeft <= 0) return; const t = setInterval(() => setSecondsLeft((p) => p - 1), 1000); return () => clearInterval(t) }, [secondsLeft])
  const wordCount = answer.length
  const isValid = wordCount >= q.minChars && wordCount <= q.maxChars
  const handleSubmit = () => { if (!isValid) { alert(`${q.minChars}~${q.maxChars}자로 작성해주세요.`); return }; onSubmit({ answer_text: answer }); clearDraft(q) }
  const handleSaveDraft = () => { if (!answer.trim()) { alert("답안을 작성하고 저장해주세요."); return false }; return saveDraft(q, { answer_text: answer }) }
  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <PracticeHeader q={q} secondsLeft={secondsLeft} onBack={onBack} onSubmit={handleSubmit} onSaveDraft={handleSaveDraft} canSubmit={isValid} submitting={submitting} />
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 h-full overflow-y-auto pr-1 space-y-3">
          <QuestionCard q={q} />
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="text-brand-middle-dark">📝</span><span className="text-[12px] font-bold text-ink">서술형 답안</span></div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className={`font-extrabold tabular-nums ${wordCount < q.minChars ? "text-ink-muted" : wordCount > q.maxChars ? "text-red-500" : "text-brand-middle-dark"}`}>{wordCount}자</span>
                <span className="text-ink-muted">/ {q.minChars}~{q.maxChars}자</span>
              </div>
            </div>
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="핵심 개념을 중심으로 간결하게 답안을 작성하세요." className="w-full h-[300px] p-4 text-[13px] leading-[1.8] text-ink resize-none focus:outline-none placeholder:text-ink-muted" />
          </div>
        </div>
        <PracticeSidebar q={q} />
      </div>
    </div>
  )
}

function ResearchPractice({ q, onBack, onSubmit, submitting }: any) {
  const [sections, setSections] = useState<Record<string, string>>(() => { const draft = loadDraft(q); if (draft?.sections) return draft.sections; return q.sections.reduce((acc: any, s: any) => ({ ...acc, [s.key]: "" }), {}) })
  const [secondsLeft, setSecondsLeft] = useState(q.timeLimit * 60)
  useEffect(() => { if (secondsLeft <= 0) return; const t = setInterval(() => setSecondsLeft((p) => p - 1), 1000); return () => clearInterval(t) }, [secondsLeft])
  const totalChars = Object.values(sections).join("").length
  const allValid = q.sections.every((s: any) => (sections[s.key]?.length || 0) >= s.minChars)
  const handleSubmit = () => { if (!allValid) { alert("모든 섹션을 최소 글자수만큼 작성해주세요."); return }; onSubmit({ answer_sections: sections }); clearDraft(q) }
  const handleSaveDraft = () => { if (!Object.values(sections).some((v) => v.trim())) { alert("답안을 작성하고 저장해주세요."); return false }; return saveDraft(q, { sections }) }
  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <PracticeHeader q={q} secondsLeft={secondsLeft} onBack={onBack} onSubmit={handleSubmit} onSaveDraft={handleSaveDraft} canSubmit={allValid} submitting={submitting} />
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 h-full overflow-y-auto pr-1 space-y-3">
          <QuestionCard q={q} />
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="text-brand-middle-dark">🔬</span><span className="text-[12px] font-bold text-ink">탐구 보고서</span></div>
              <div className="text-[11px] text-ink-muted">총 <span className="font-extrabold text-brand-middle-dark">{totalChars}</span>자</div>
            </div>
            <div className="p-4 space-y-4">
              {q.sections.map((s: any) => {
                const value = sections[s.key] || ""; const valid = value.length >= s.minChars
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[12px] font-bold text-ink">{s.label}</label>
                      <span className={`text-[10px] font-bold tabular-nums ${valid ? "text-brand-middle-dark" : "text-ink-muted"}`}>{value.length}자 {valid ? "✓" : `/ 최소 ${s.minChars}자`}</span>
                    </div>
                    <textarea value={value} onChange={(e) => setSections({ ...sections, [s.key]: e.target.value })} placeholder={s.placeholder} rows={4} className="w-full px-3 py-2.5 text-[12px] border border-line rounded-lg focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted resize-y leading-[1.7]" />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <PracticeSidebar q={q} />
      </div>
    </div>
  )
}

function PresentationPractice({ q, onBack, onSubmit, submitting, studentId }: any) {
  const [sections, setSections] = useState<Record<string, string>>(() => { const draft = loadDraft(q); if (draft?.sections) return draft.sections; return q.sections.reduce((acc: any, s: any) => ({ ...acc, [s.key]: "" }), {}) })
  const [secondsLeft, setSecondsLeft] = useState(q.timeLimit * 60)
  const [isRecording, setIsRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null)
  const audioChunksRef = React.useRef<Blob[]>([])
  useEffect(() => { if (secondsLeft <= 0) return; const t = setInterval(() => setSecondsLeft((p) => p - 1), 1000); return () => clearInterval(t) }, [secondsLeft])
  useEffect(() => { if (!isRecording) return; const t = setInterval(() => setRecordTime((p) => p + 1), 1000); return () => clearInterval(t) }, [isRecording])
  const allValid = q.sections.every((s: any) => (sections[s.key]?.length || 0) >= s.minChars)
  const toggleRecording = async () => {
    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.onstop = () => { const blob = new Blob(audioChunksRef.current, { type: "audio/webm" }); setAudioBlob(blob); setAudioUrl(URL.createObjectURL(blob)); stream.getTracks().forEach((t) => t.stop()) }
      mediaRecorderRef.current = recorder; recorder.start(); setIsRecording(true); setRecordTime(0)
    } catch (e) { alert("마이크 권한을 허용해주세요.") }
  }
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 100 * 1024 * 1024) { alert("영상은 100MB 이하만 가능해요."); return }; setVideoFile(file); setVideoUrl(URL.createObjectURL(file)) }
  const handleSubmit = async () => {
    if (!allValid) { alert("발표 주제와 원고를 모두 작성해주세요."); return }
    if (!studentId) { alert("로그인 정보를 불러올 수 없어요."); return }
    setUploading(true)
    try {
      const questionKey = q._isAcademy ? `academy-${q.id}` : q.school ? `practice-${q.id}` : `school-${q.id}`
      let audioUploadedUrl: string | undefined, videoUploadedUrl: string | undefined
      if (audioBlob) { const url = await uploadFileToStorage(audioBlob, studentId, questionKey, "audio"); if (url) audioUploadedUrl = url; else { alert("음성 파일 업로드 실패"); setUploading(false); return } }
      if (videoFile) { const url = await uploadFileToStorage(videoFile, studentId, questionKey, "video", videoFile.name); if (url) videoUploadedUrl = url; else { alert("영상 파일 업로드 실패"); setUploading(false); return } }
      onSubmit({ answer_sections: sections, answer_audio_url: audioUploadedUrl, answer_video_url: videoUploadedUrl }); clearDraft(q)
    } catch (e: any) { alert(`업로드 실패: ${e.message}`) } finally { setUploading(false) }
  }
  const handleSaveDraft = () => { if (!Object.values(sections).some((v) => v.trim())) { alert("답안을 작성하고 저장해주세요."); return false }; return saveDraft(q, { sections }) }
  const formatRecTime = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`
  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <PracticeHeader q={q} secondsLeft={secondsLeft} onBack={onBack} onSubmit={handleSubmit} onSaveDraft={handleSaveDraft} canSubmit={allValid} submitting={submitting || uploading} />
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 h-full overflow-y-auto pr-1 space-y-3">
          <QuestionCard q={q} />
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="text-brand-middle-dark">🎤</span><span className="text-[12px] font-bold text-ink">발표 준비</span></div>
              <div className="text-[11px] text-ink-muted">발표 시간: {q.presentTimeMin}~{q.presentTimeMax}분</div>
            </div>
            <div className="p-4 space-y-3">
              {q.sections.map((s: any) => {
                const value = sections[s.key] || ""; const valid = value.length >= s.minChars
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[12px] font-bold text-ink">{s.label}</label>
                      <span className={`text-[10px] font-bold tabular-nums ${valid ? "text-brand-middle-dark" : "text-ink-muted"}`}>{value.length}자 {valid ? "✓" : `/ 최소 ${s.minChars}자`}</span>
                    </div>
                    {s.key === "topic" ? <input type="text" value={value} onChange={(e) => setSections({ ...sections, [s.key]: e.target.value })} placeholder={s.placeholder} className="w-full h-10 px-3 text-[13px] border border-line rounded-lg focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted" /> : <textarea value={value} onChange={(e) => setSections({ ...sections, [s.key]: e.target.value })} placeholder={s.placeholder} rows={8} className="w-full px-3 py-2.5 text-[12px] border border-line rounded-lg focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted resize-y leading-[1.7]" />}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-line rounded-xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5"><span>🎙️</span><span className="text-[12px] font-extrabold text-ink">음성 녹음</span></div>
                {audioUrl && <span className="text-[10px] font-bold text-brand-middle-dark bg-brand-middle-bg border border-brand-middle-light px-1.5 py-0.5 rounded-full">✓ 녹음됨</span>}
              </div>
              <button onClick={toggleRecording} className={`w-full h-16 rounded-lg font-bold text-white transition-all flex flex-col items-center justify-center gap-1 ${isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-brand-middle hover:bg-brand-middle-hover"}`}>
                <span className="text-xl">{isRecording ? "⏹" : ""}</span>
                <span className="text-[11px]">{isRecording ? `녹음 중 ${formatRecTime(recordTime)}` : audioUrl ? "다시 녹음" : "녹음 시작"}</span>
              </button>
              {audioUrl && <div className="mt-2"><audio controls src={audioUrl} className="w-full h-8" /><button onClick={() => { setAudioBlob(null); setAudioUrl(null) }} className="text-[10px] text-red-500 hover:text-red-700 mt-1">삭제</button></div>}
              {!audioUrl && <div className="text-[10px] text-ink-muted mt-2 text-center">원고를 보면서 녹음해보세요</div>}
            </div>
            <div className="bg-white border border-line rounded-xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5"><span>📹</span><span className="text-[12px] font-extrabold text-ink">영상 업로드</span></div>
                {videoUrl && <span className="text-[10px] font-bold text-brand-middle-dark bg-brand-middle-bg border border-brand-middle-light px-1.5 py-0.5 rounded-full">✓ 선택됨</span>}
              </div>
              <label className="w-full h-16 rounded-lg font-bold text-white bg-brand-middle hover:bg-brand-middle-hover transition-all flex flex-col items-center justify-center gap-1 cursor-pointer">
                <span className="text-[11px]">{videoFile ? videoFile.name.slice(0, 15) + "..." : "영상 선택"}</span>
                <input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={handleVideoSelect} className="hidden" />
              </label>
              {videoUrl && <div className="mt-2"><video controls src={videoUrl} className="w-full max-h-32 rounded" /><button onClick={() => { setVideoFile(null); setVideoUrl(null) }} className="text-[10px] text-red-500 hover:text-red-700 mt-1">삭제</button></div>}
              {!videoUrl && <div className="text-[10px] text-ink-muted mt-2 text-center">MP4 / MOV · 최대 100MB</div>}
            </div>
          </div>
        </div>
        <PracticeSidebar q={q} />
      </div>
      {uploading && <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center backdrop-blur-sm"><div className="bg-white rounded-2xl px-8 py-6 flex flex-col items-center gap-3 shadow-2xl"><div className="text-3xl animate-spin">⏳</div><div className="text-[14px] font-bold text-ink">파일 업로드 중...</div></div></div>}
    </div>
  )
}

function ExperimentPractice({ q, onBack, onSubmit, submitting, studentId }: any) {
  const [sections, setSections] = useState<Record<string, string>>(() => { const draft = loadDraft(q); if (draft?.sections) return draft.sections; return q.sections.reduce((acc: any, s: any) => ({ ...acc, [s.key]: "" }), {}) })
  const [secondsLeft, setSecondsLeft] = useState(q.timeLimit * 60)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  useEffect(() => { if (secondsLeft <= 0) return; const t = setInterval(() => setSecondsLeft((p) => p - 1), 1000); return () => clearInterval(t) }, [secondsLeft])
  const allValid = q.sections.every((s: any) => (sections[s.key]?.length || 0) >= s.minChars)
  const totalChars = Object.values(sections).join("").length
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const files = Array.from(e.target.files || []); if (!files.length) return; const newPhotos = [...photos, ...files].slice(0, 5); setPhotos(newPhotos); setPhotoPreviews(newPhotos.map((f) => URL.createObjectURL(f))) }
  const removePhoto = (idx: number) => { const newPhotos = photos.filter((_, i) => i !== idx); setPhotos(newPhotos); setPhotoPreviews(newPhotos.map((f) => URL.createObjectURL(f))) }
  const handleSubmit = async () => {
    if (!allValid) { alert("모든 항목을 최소 글자수만큼 작성해주세요."); return }
    if (!studentId) { alert("로그인 정보를 불러올 수 없어요."); return }
    setUploading(true)
    try {
      const questionKey = q._isAcademy ? `academy-${q.id}` : q.school ? `practice-${q.id}` : `school-${q.id}`
      const photoUrls: string[] = []
      for (const file of photos) { const url = await uploadFileToStorage(file, studentId, questionKey, "photo", file.name); if (url) photoUrls.push(url); else { alert("사진 업로드 실패"); setUploading(false); return } }
      onSubmit({ answer_sections: sections, answer_photo_urls: photoUrls.length > 0 ? photoUrls : undefined }); clearDraft(q)
    } catch (e: any) { alert(`업로드 실패: ${e.message}`) } finally { setUploading(false) }
  }
  const handleSaveDraft = () => { if (!Object.values(sections).some((v) => v.trim())) { alert("답안을 작성하고 저장해주세요."); return false }; return saveDraft(q, { sections }) }
  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <PracticeHeader q={q} secondsLeft={secondsLeft} onBack={onBack} onSubmit={handleSubmit} onSaveDraft={handleSaveDraft} canSubmit={allValid} submitting={submitting || uploading} />
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 h-full overflow-y-auto pr-1 space-y-3">
          <QuestionCard q={q} />
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="text-brand-middle-dark">🧪</span><span className="text-[12px] font-bold text-ink">실험 보고서</span></div>
              <div className="text-[11px] text-ink-muted">총 <span className="font-extrabold text-brand-middle-dark">{totalChars}</span>자</div>
            </div>
            <div className="p-4 space-y-4">
              {q.sections.map((s: any) => {
                const value = sections[s.key] || ""; const valid = value.length >= s.minChars
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1.5"><label className="text-[12px] font-bold text-ink">{s.label}</label><span className={`text-[10px] font-bold tabular-nums ${valid ? "text-brand-middle-dark" : "text-ink-muted"}`}>{value.length}자 {valid ? "✓" : `/ 최소 ${s.minChars}자`}</span></div>
                    <textarea value={value} onChange={(e) => setSections({ ...sections, [s.key]: e.target.value })} placeholder={s.placeholder} rows={s.key === "procedure" || s.key === "result" ? 5 : 3} className="w-full px-3 py-2.5 text-[12px] border border-line rounded-lg focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted resize-y leading-[1.7]" />
                  </div>
                )
              })}
            </div>
          </div>
          <div className="bg-white border border-line rounded-xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-1.5 mb-3"><span>📷</span><span className="text-[12px] font-extrabold text-ink">실험 사진 첨부</span><span className="text-[10px] text-ink-muted ml-auto">선택사항 · 최대 5장 ({photos.length}/5)</span></div>
            {photoPreviews.length > 0 && <div className="grid grid-cols-3 gap-2 mb-3">{photoPreviews.map((url, i) => (<div key={i} className="relative group"><img src={url} alt={`사진 ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border border-line" /><button onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">×</button></div>))}</div>}
            {photos.length < 5 && <label className="w-full h-20 rounded-lg font-bold text-brand-middle-dark bg-brand-middle-pale border-2 border-dashed border-brand-middle-light hover:bg-brand-middle-bg transition-all flex flex-col items-center justify-center gap-1 cursor-pointer"><span className="text-2xl">📷</span><span className="text-[11px]">실험 과정 사진 업로드</span><input type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" /></label>}
          </div>
        </div>
        <PracticeSidebar q={q} />
      </div>
      {uploading && <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center backdrop-blur-sm"><div className="bg-white rounded-2xl px-8 py-6 flex flex-col items-center gap-3 shadow-2xl"><div className="text-3xl animate-spin">⏳</div><div className="text-[14px] font-bold text-ink">사진 업로드 중...</div></div></div>}
    </div>
  )
}

function FeedbackView({ submission, onBack }: any) {
  const { data: feedback, isLoading } = useMyFeedback(submission.id)
  const resubmit = useResubmitAnswer()
  const [isResubmitting, setIsResubmitting] = useState(false)
  const [resubmitText, setResubmitText] = useState("")
  const status = submission.status
  const studentAnswerDisplay = submission.answer_text || (submission.answer_sections ? formatSectionsToText(submission.answer_sections) : "")

  const handleResubmit = async () => {
    if (!resubmitText.trim()) { alert("답안을 작성해주세요."); return }
    try {
      await resubmit.mutateAsync({ submission_id: submission.id, resubmitted_text: resubmitText })
      alert("✅ 재제출 완료!\n선생님 최종 피드백을 기다려주세요.")
      setIsResubmitting(false); setResubmitText("")
    } catch (e: any) { alert(`재제출 실패: ${e.message}`) }
  }

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-[12px] font-semibold text-ink-secondary hover:text-ink transition-colors">← 목록으로</button>
          <div className="w-px h-4 bg-line" />
          <div>
            <div className="text-[11px] text-ink-muted font-semibold">{submission.question_school_name || "우리 학교"} · {submission.question_subject} · {submission.question_type}</div>
            <div className="text-[14px] font-bold text-ink">{submission.question_title}</div>
          </div>
        </div>
        <span className="px-3 py-1.5 rounded-lg text-[12px] font-bold border" style={{ background: status === "pending" || status === "analyzed" ? "#FEF3C7" : status === "first_done" ? "#ECFDF5" : status === "completed" ? "#D1FAE5" : "#FED7AA", color: status === "pending" || status === "analyzed" ? "#92400E" : "#065F46", borderColor: status === "pending" || status === "analyzed" ? "#FCD34D" : "#6EE7B7" }}>
          {status === "pending" ? "⏳ 피드백 대기 중" : status === "analyzed" ? "⏳ 선생님이 검토 중" : status === "first_done" ? "📩 1차 피드백 받음" : status === "resubmitted" ? "🔄 재제출 완료" : "✓ 최종 완료"}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
          <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">출제 문제</div>
          <div className="text-[13px] font-medium text-ink leading-[1.7]">{submission.question_content}</div>
        </div>
        <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-line flex items-center gap-2">
            <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">Step 1</span>
            <span className="text-[12px] font-bold text-ink">내 답안</span>
            <span className="ml-auto text-[10px] text-ink-muted">{studentAnswerDisplay.length}자</span>
          </div>
          <div className="p-4 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">{studentAnswerDisplay}</div>
        </div>
        {feedback?.teacher_first_feedback ? (
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-line flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-white bg-amber-600 px-2 py-0.5 rounded-full">Step 2</span>
              <span className="text-[12px] font-bold text-ink">선생님 1차 피드백</span>
              {feedback.teacher_first_at && <span className="ml-auto text-[10px] text-ink-muted">{new Date(feedback.teacher_first_at).toLocaleDateString("ko-KR")}</span>}
            </div>
            <div className="p-4 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap bg-amber-50/50">{feedback.teacher_first_feedback}</div>
            {!submission.resubmitted_text && (
              <div className="p-4 border-t border-line bg-white">
                {!isResubmitting ? (
                  <button onClick={() => { setIsResubmitting(true); setResubmitText(submission.answer_text || studentAnswerDisplay || "") }} className="w-full h-10 bg-brand-middle hover:bg-brand-middle-hover text-white text-[13px] font-bold rounded-lg transition-all hover:-translate-y-px">🔄 피드백 반영해서 2차 제출하기</button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><label className="text-[12px] font-bold text-ink">📝 수정한 답안</label><span className="text-[10px] text-ink-muted">{resubmitText.length}자</span></div>
                    <textarea value={resubmitText} onChange={(e) => setResubmitText(e.target.value)} rows={10} placeholder="선생님 피드백을 반영해서 답안을 다시 작성해주세요" className="w-full px-3 py-2.5 text-[13px] border border-line rounded-lg focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all leading-[1.7] resize-y" />
                    <div className="flex gap-2">
                      <button onClick={() => { setIsResubmitting(false); setResubmitText("") }} className="flex-1 h-10 bg-white border border-line text-[12px] font-semibold text-ink-secondary rounded-lg hover:bg-gray-50 transition-all">취소</button>
                      <button onClick={handleResubmit} disabled={!resubmitText.trim() || resubmit.isPending} className="flex-1 h-10 bg-brand-middle hover:bg-brand-middle-hover text-white text-[12px] font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">{resubmit.isPending ? "제출 중..." : "2차 제출"}</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="bg-white border border-line rounded-xl px-4 py-8 text-center text-ink-muted text-[12px]"><div className="text-2xl mb-2">⏳</div><div className="font-medium">불러오는 중...</div></div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-6 text-center"><div className="text-3xl mb-2">⏳</div><div className="text-[13px] font-bold text-amber-800 mb-1">선생님 피드백을 기다리는 중이에요</div><div className="text-[11px] text-amber-700">선생님이 답안을 검토하고 피드백을 전달해드릴 거예요.</div></div>
        )}
        {submission.resubmitted_text && (
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-orange-50 border-b border-line flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-white bg-orange-500 px-2 py-0.5 rounded-full">Step 3</span>
              <span className="text-[12px] font-bold text-ink">📝 내 재제출 답안</span>
              {submission.resubmitted_at && <span className="ml-auto text-[10px] text-ink-muted">{new Date(submission.resubmitted_at).toLocaleDateString("ko-KR")}</span>}
            </div>
            <div className="p-4 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">{submission.resubmitted_text}</div>
          </div>
        )}
        {feedback?.teacher_final_feedback ? (
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-line flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-white bg-emerald-600 px-2 py-0.5 rounded-full">최종</span>
              <span className="text-[12px] font-bold text-ink">🎉 선생님 최종 피드백</span>
              {feedback.teacher_final_at && <span className="ml-auto text-[10px] text-ink-muted">{new Date(feedback.teacher_final_at).toLocaleDateString("ko-KR")}</span>}
            </div>
            <div className="p-4 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap bg-emerald-50/50">{feedback.teacher_final_feedback}</div>
          </div>
        ) : submission.resubmitted_text ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-6 text-center"><div className="text-3xl mb-2">⏳</div><div className="text-[13px] font-bold text-amber-800 mb-1">최종 피드백을 기다리는 중이에요</div></div>
        ) : null}
      </div>
    </div>
  )
}

export default function MiddleSuhaeng() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const [mode, setMode] = useState<Mode>("list")
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null)
  const [showAllModal, setShowAllModal] = useState(false)
  const [modalGrade, setModalGrade] = useState("중2")
  const [feedbackSubmission, setFeedbackSubmission] = useState<any>(null)

  const submitAnswer = useSubmitAnswer()
  const { data: mySubmissions } = useMySuhaengSubmissions(student?.id ? String(student.id) : undefined) as { data: any[] | undefined }

  const { data: academyQuestions = [], isLoading: loadingAcademy } = useMyAcademyQuestions(
    student?.id ? String(student.id) : undefined,
    academy?.academyId ? String(academy.academyId) : undefined,
    student?.grade ?? undefined,
  )

  const myGradeSuhaeng = MY_SCHOOL_SUHAENG.filter((s) => s.grade === "중2")

  const startPractice = (question: any) => {
    const existingKey = question._isAcademy ? `academy-${question.id}` : question.school ? `practice-${question.id}` : `school-${question.id}`
    const submitted = mySubmissions?.find((s) => s.question_key === existingKey)
    if (submitted) { setFeedbackSubmission(submitted); setMode("feedback"); return }
    setSelectedQuestion(question); setMode("practice")
  }

  const backToList = () => { setMode("list"); setSelectedQuestion(null); setFeedbackSubmission(null) }

  const handleSubmit = async (answerData: any) => {
    if (!student?.id || !academy?.academyId || !selectedQuestion) { alert("로그인 정보를 불러오지 못했어요."); return }
    const q = selectedQuestion
    const isAcademy = !!q._isAcademy
    const isSchool = !q.school && !isAcademy
    const questionKey = isAcademy ? `academy-${q.id}` : isSchool ? `school-${q.id}` : `practice-${q.id}`
    try {
      await submitAnswer.mutateAsync({
        student_id: String(student.id),
        academy_id: String(academy.academyId),
        question_key: questionKey,
        question_type: q.type,
        question_title: q.title,
        question_content: q.content,
        question_category: isAcademy ? "academy" : isSchool ? "school" : "practice",
        question_school_name: isAcademy ? "학원 수행평가" : isSchool ? "우리 학교" : q.school,
        question_subject: q.subject,
        question_ratio: q.ratio || q.score || null,
        question_min_chars: q.min_chars || q.minChars || null,
        question_max_chars: q.max_chars || q.maxChars || null,
        ...answerData,
      })
      alert("✅ 제출 완료!\n선생님 피드백을 기다려주세요.")
      backToList()
    } catch (error: any) { alert(`제출 실패: ${error.message || "알 수 없는 오류"}`) }
  }

  // ★ semester, topic 추가됨
  const academyQuestionsForUI = academyQuestions.map((q: AcademySuhaengQuestion) => ({
    ...q,
    _isAcademy: true,
    timeLimit: 30,
    minChars: q.min_chars,
    maxChars: q.max_chars,
    semester: (q as any).semester || null,
    topic: (q as any).topic || null,
    sections: ["주제탐구", "구술발표", "탐구수행"].includes(q.type) ? getDefaultSections(q.type) : undefined,
    presentTimeMin: q.type === "구술발표" ? 3 : undefined,
    presentTimeMax: q.type === "구술발표" ? 5 : undefined,
  }))

  if (mode === "feedback" && feedbackSubmission) return <FeedbackView submission={feedbackSubmission} onBack={backToList} />

  if (mode === "practice" && selectedQuestion) {
    const q = selectedQuestion
    const submitting = submitAnswer.isPending
    if (q.type === "논술형") return <EssayPractice q={q} onBack={backToList} onSubmit={handleSubmit} submitting={submitting} />
    if (q.type === "서술형") return <ShortAnswerPractice q={q} onBack={backToList} onSubmit={handleSubmit} submitting={submitting} />
    if (q.type === "주제탐구") return <ResearchPractice q={q} onBack={backToList} onSubmit={handleSubmit} submitting={submitting} />
    if (q.type === "구술발표") return <PresentationPractice q={q} onBack={backToList} onSubmit={handleSubmit} submitting={submitting} studentId={student?.id ? String(student.id) : undefined} />
    if (q.type === "탐구수행") return <ExperimentPractice q={q} onBack={backToList} onSubmit={handleSubmit} submitting={submitting} studentId={student?.id ? String(student.id) : undefined} />
  }

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[18px] font-extrabold text-ink tracking-tight">수행평가</div>
          <div className="text-[12px] text-ink-muted mt-0.5">{student?.name} · {academy?.academyName}</div>
        </div>
        <div className="flex gap-2">
          {mySubmissions && mySubmissions.length > 0 && (
            <div className="bg-blue-50 text-blue-700 text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-blue-200">📤 제출한 답안 {mySubmissions.length}건</div>
          )}
          <div className="bg-brand-middle-bg text-brand-middle-dark text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-brand-middle-light">다가오는 수행평가 {myGradeSuhaeng.length}건</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 min-h-0">
        <div className="bg-white border border-line rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex-shrink-0">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <div>
              <div className="text-[14px] font-extrabold text-ink tracking-tight">🏫 우리 학교 수행평가</div>
              <div className="text-[11px] text-ink-muted mt-0.5">인천 신정중학교 중2 · 2026학년도 1학기 평가 계획</div>
            </div>
            <button onClick={() => setShowAllModal(true)} className="text-[11px] font-semibold text-brand-middle-dark hover:text-brand-middle transition-colors">전체 보기 ›</button>
          </div>
          <div className="grid grid-cols-4 gap-2.5 p-3">
            {myGradeSuhaeng.map((t) => {
              const submitted = mySubmissions?.find((s) => s.question_key === `school-${t.id}`)
              return (
                <div key={t.id} onClick={() => startPractice(t)} className={`relative rounded-lg border px-3 py-2.5 cursor-pointer transition-all hover:-translate-y-px ${submitted ? "bg-blue-50 border-blue-200" : t.urgent ? "bg-amber-50/50 border-amber-200 hover:shadow-[0_4px_16px_rgba(245,158,11,0.15)]" : "bg-gray-50 border-line hover:border-brand-middle-light hover:shadow-sm"}`}>
                  {submitted ? <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full">✓ 제출됨</div> : t.urgent && <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full">D-{t.dueIn}</div>}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-bold text-ink-secondary bg-white border border-line px-1.5 py-0.5 rounded">{t.subject}</span>
                    <span className="text-[10px] font-semibold text-brand-middle-dark">{t.type}</span>
                  </div>
                  <div className="text-[12px] font-bold text-ink leading-tight mb-2 line-clamp-2 min-h-[30px]">{t.title}</div>
                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-line">
                    <span className="text-ink-muted">D-{t.dueIn} · {t.ratio}%</span>
                  </div>
                  <div className="mt-1.5 text-[10px] font-bold text-brand-middle-dark">{submitted ? "제출 완료 ✓" : "바로 시작 →"}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white border border-line rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex-shrink-0">
          <div className="px-4 py-3 border-b border-line">
            <div className="text-[14px] font-extrabold text-ink tracking-tight">📋 학원 수행평가</div>
            <div className="text-[11px] text-ink-muted mt-0.5">선생님이 출제한 문제 · AI 피드백 제공</div>
          </div>
          {loadingAcademy ? (
            <div className="px-4 py-10 text-center text-ink-muted text-[12px]"><div className="text-2xl mb-2">⏳</div>불러오는 중...</div>
          ) : academyQuestionsForUI.length === 0 ? (
            <div className="px-4 py-10 text-center text-ink-muted text-[12px]">
              <div className="text-3xl mb-2">📋</div>
              <div className="font-medium">아직 출제된 문제가 없어요</div>
              <div className="mt-1 text-[11px]">선생님이 문제를 만들면 여기서 확인할 수 있어요</div>
            </div>
          ) : (
            <div className="p-3 grid grid-cols-4 gap-2.5">
              {academyQuestionsForUI.map((q: any) => {
                const submitted = mySubmissions?.find((s) => s.question_key === `academy-${q.id}`)
                const typeIconMap: Record<string, string> = { 논술형: "✏️", 서술형: "📝", 주제탐구: "🔬", 구술발표: "🎤", 탐구수행: "🧪" }
                return (
                  <div key={q.id} onClick={() => startPractice(q)} className={`relative rounded-xl border px-4 py-3 cursor-pointer transition-all hover:-translate-y-px ${submitted ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-line hover:border-brand-middle-light hover:shadow-sm"}`}>
                    {submitted && <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full">✓ 제출됨</div>}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-lg">{typeIconMap[q.type] || "📝"}</span>
                      <div>
                        <span className="text-[10px] font-bold text-ink-secondary bg-white border border-line px-1.5 py-0.5 rounded mr-1">{q.subject}</span>
                        <span className="text-[10px] font-semibold text-brand-middle-dark">{q.type}</span>
                      </div>
                    </div>
                    <div className="text-[12px] font-bold text-ink leading-tight mb-2 line-clamp-2">{q.title}</div>
                    {/* ★ 주제 표시 */}
                    {q.topic && <div className="text-[10px] text-ink-muted mb-1">#{q.topic}</div>}
                    <div className="text-[10px] text-ink-muted line-clamp-2 leading-relaxed mb-2">{q.content}</div>
                    {/* ★ 학년 + 학기 표시 */}
                    <div className="flex items-center justify-between text-[10px] pt-2 border-t border-line">
                      <span className="text-ink-muted">{q.grade}{q.semester ? ` · ${q.semester}` : ''}</span>
                      <span className="font-bold text-brand-middle-dark">{submitted ? "제출 완료 ✓" : "시작하기 →"}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showAllModal && (
        <div onClick={() => setShowAllModal(false)} className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-[720px] max-h-[80vh] flex flex-col shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <div><div className="text-[16px] font-extrabold text-ink tracking-tight">🏫 우리 학교 수행평가 전체</div><div className="text-[11px] text-ink-muted mt-0.5">학년별 전체 수행평가 일정</div></div>
              <button onClick={() => setShowAllModal(false)} className="text-ink-muted hover:text-ink text-xl transition-colors">✕</button>
            </div>
            <div className="flex gap-1 px-5 py-3 border-b border-line">
              {["중1", "중2", "중3"].map((g) => (
                <button key={g} onClick={() => setModalGrade(g)} className={`px-4 py-1.5 rounded-full text-[12px] font-bold border transition-all ${modalGrade === g ? "bg-brand-middle text-white border-brand-middle" : "bg-white text-ink-secondary border-line hover:border-brand-middle-light"}`}>
                  {g} {g === "중2" && <span className="ml-1 text-[10px] text-amber-400">(내 학년)</span>}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {MY_SCHOOL_SUHAENG.filter((s) => s.grade === modalGrade).length === 0 ? (
                <div className="text-center py-10 text-ink-muted text-[12px]"><div className="text-3xl mb-2">📅</div>{modalGrade} 수행평가 정보가 없어요</div>
              ) : (
                <div className="space-y-2">
                  {MY_SCHOOL_SUHAENG.filter((s) => s.grade === modalGrade).map((s) => (
                    <div key={s.id} onClick={() => { setShowAllModal(false); startPractice(s) }} className="border border-line rounded-lg p-3 hover:border-brand-middle-light hover:bg-brand-middle-pale/20 cursor-pointer transition-all">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-ink-secondary bg-white border border-line px-1.5 py-0.5 rounded">{s.subject}</span>
                        <span className="text-[10px] font-semibold text-brand-middle-dark">{s.type}</span>
                        <span className="text-[10px] text-ink-muted">· 배점 {s.ratio}%</span>
                        {s.urgent && <span className="text-[9px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded">D-{s.dueIn}</span>}
                        <span className="ml-auto text-[10px] text-ink-muted">{s.scheduledAt}</span>
                      </div>
                      <div className="text-[13px] font-bold text-ink">{s.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getDefaultSections(type: string) {
  if (type === "주제탐구") return [
    { key: "background", label: "1. 탐구 배경", placeholder: "왜 이 주제를 탐구하게 되었는지 작성하세요.", minChars: 50 },
    { key: "method", label: "2. 조사 방법", placeholder: "어떤 자료를 어떻게 조사했는지 작성하세요.", minChars: 50 },
    { key: "content", label: "3. 조사 내용", placeholder: "조사한 내용을 구체적으로 정리하세요.", minChars: 100 },
    { key: "analysis", label: "4. 분석 및 결론", placeholder: "조사 결과를 분석하고 결론을 도출하세요.", minChars: 100 },
    { key: "reference", label: "5. 참고 자료", placeholder: "참고한 자료의 출처를 작성하세요.", minChars: 20 },
  ]
  if (type === "구술발표") return [
    { key: "topic", label: "발표 주제", placeholder: "발표 주제를 입력하세요.", minChars: 3 },
    { key: "script", label: "발표 원고", placeholder: "발표 원고를 작성하세요.", minChars: 200 },
  ]
  if (type === "탐구수행") return [
    { key: "purpose", label: "실험 목적", placeholder: "무엇을 알아보려는지 작성하세요.", minChars: 30 },
    { key: "hypothesis", label: "가설", placeholder: "예상 결과를 작성하세요.", minChars: 30 },
    { key: "materials", label: "준비물", placeholder: "사용한 준비물을 나열하세요.", minChars: 20 },
    { key: "procedure", label: "실험 과정", placeholder: "순서대로 작성하세요.", minChars: 80 },
    { key: "result", label: "결과 및 데이터", placeholder: "관찰 내용을 정리하세요.", minChars: 80 },
    { key: "conclusion", label: "결론", placeholder: "가설과 비교하며 정리하세요.", minChars: 50 },
  ]
  return undefined
}