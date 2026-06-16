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
import {
  useSchoolSuhaeng,
  useStudentSchool,
  updateStudentSchool,
  findOrCreateSchool,
  type SchoolSuhaeng,
} from "@/pages/middle-student/_hooks/useSchoolSuhaeng";

const NEIS_API_KEY = import.meta.env.VITE_NEIS_API_KEY

type Mode = "list" | "practice" | "feedback"

const SECTION_LABEL_MAP: Record<string, string> = {
  background: "1. 탐구 배경", method: "2. 조사 방법", content: "3. 조사 내용",
  analysis: "4. 분석 및 결론", reference: "5. 참고 자료", purpose: "실험 목적",
  hypothesis: "가설", materials: "준비물", procedure: "실험 과정",
  result: "결과 및 데이터", conclusion: "결론", topic: "발표 주제", script: "발표 원고",
  summary: "1. 활동 요약", process: "2. 활동 과정", learning: "3. 배운 점",
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

const DRAFT_KEY_PREFIX = "suhaeng-draft:"
const getDraftKey = (question: any) => `${DRAFT_KEY_PREFIX}${question._isAcademy ? `academy-${question.id}` : question._isSchool ? `school-${question.id}` : `practice-${question.id}`}`
const loadDraft = (question: any) => { try { const raw = localStorage.getItem(getDraftKey(question)); return raw ? JSON.parse(raw) : null } catch { return null } }
const saveDraft = (question: any, data: any) => { try { localStorage.setItem(getDraftKey(question), JSON.stringify({ ...data, savedAt: new Date().toISOString() })); return true } catch { return false } }
const clearDraft = (question: any) => { try { localStorage.removeItem(getDraftKey(question)) } catch { } }

function getDefaultSections(displayType: string) {
  if (displayType === "주제탐구" || displayType === "포트폴리오") return [
    { key: "background", label: "1. 탐구 배경", placeholder: "왜 이 주제를 탐구하게 되었는지 작성하세요.", minChars: 50 },
    { key: "method", label: "2. 조사 방법", placeholder: "어떤 자료를 어떻게 조사했는지 작성하세요.", minChars: 50 },
    { key: "content", label: "3. 조사 내용", placeholder: "조사한 내용을 구체적으로 정리하세요.", minChars: 100 },
    { key: "analysis", label: "4. 분석 및 결론", placeholder: "조사 결과를 분석하고 결론을 도출하세요.", minChars: 100 },
    { key: "reference", label: "5. 참고 자료", placeholder: "참고한 자료의 출처를 작성하세요.", minChars: 20 },
  ]
  if (displayType === "구술발표") return [
    { key: "topic", label: "발표 주제", placeholder: "발표 주제를 입력하세요.", minChars: 3 },
    { key: "script", label: "발표 원고", placeholder: "발표 원고를 작성하세요.", minChars: 200 },
  ]
  if (displayType === "탐구수행") return [
    { key: "purpose", label: "실험 목적", placeholder: "무엇을 알아보려는지 작성하세요.", minChars: 30 },
    { key: "hypothesis", label: "가설", placeholder: "예상 결과를 작성하세요.", minChars: 30 },
    { key: "materials", label: "준비물", placeholder: "사용한 준비물을 나열하세요.", minChars: 20 },
    { key: "procedure", label: "실험 과정", placeholder: "순서대로 작성하세요.", minChars: 80 },
    { key: "result", label: "결과 및 데이터", placeholder: "관찰 내용을 정리하세요.", minChars: 80 },
    { key: "conclusion", label: "결론", placeholder: "가설과 비교하며 정리하세요.", minChars: 50 },
  ]
  return undefined
}

function schoolSuhaengToUI(s: SchoolSuhaeng, schoolName: string): any {
  return {
    id: s.id, _isSchool: true, schoolName,
    schoolGrade: s.grade, semester: `${s.semester}학기`,
    subject: s.subject, type: s.display_type, evalType: s.eval_type,
    title: s.task_title, content: s.question_content || s.unit_topic || s.task_title,
    unitTopic: s.unit_topic, achievementStandard: s.achievement_standard,
    coreConcept: s.core_concept, ratio: s.score, scheduledAt: s.eval_period || '',
    minChars: s.min_chars, maxChars: s.max_chars, timeLimit: s.time_limit,
    presentTimeMin: s.present_time_min, presentTimeMax: s.present_time_max,
    sections: s.sections || getDefaultSections(s.display_type),
    hints: s.hints, checklist: s.checklist,
    keywords: s.keywords || [s.subject],
    scoringFactors: s.scoring_factors, gradeScale: s.grade_scale,
    scoringCriteriaOriginal: s.scoring_criteria_original,
    scoringCriteriaAi: s.scoring_criteria_ai,
  }
}

function gradeToDb(studentGrade?: string | null): string | undefined {
  if (!studentGrade) return undefined
  const m = studentGrade.match(/[123]/)
  return m ? m[0] : undefined
}

interface NeisSchool {
  SD_SCHUL_CODE: string
  SCHUL_NM: string
  SCHUL_KND_SC_NM: string
  LCTN_SC_NM: string
  ORG_RDNMA: string
}

// 학교 변경 모달 (NEIS 검색)
function SchoolChangeModal({ studentId, onClose, onChanged }: {
  studentId: string
  onClose: () => void
  onChanged: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NeisSchool[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const url = new URL('https://open.neis.go.kr/hub/schoolInfo')
        url.searchParams.set('KEY', NEIS_API_KEY)
        url.searchParams.set('Type', 'json')
        url.searchParams.set('pIndex', '1')
        url.searchParams.set('pSize', '20')
        url.searchParams.set('SCHUL_NM', query.trim())
        const res = await fetch(url.toString())
        const data = await res.json()
        if (data.schoolInfo && data.schoolInfo[1]?.row) {
          const filtered = data.schoolInfo[1].row.filter(
            (s: NeisSchool) => s.SCHUL_KND_SC_NM === '중학교'
          )
          setResults(filtered)
        } else {
          setResults([])
        }
      } catch (e) {
        console.error('[NEIS]', e)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = async (neisSchool: NeisSchool) => {
    if (!confirm(`"${neisSchool.SCHUL_NM}"으로 변경하시겠어요?\n\n⚠️ 변경 후에는 더 이상 학교를 바꿀 수 없어요.`)) return

    setSaving(true)
    try {
      const school = await findOrCreateSchool(neisSchool)
      await updateStudentSchool(studentId, school.id, school.name)
      onChanged()
      onClose()
    } catch (e: any) {
      alert(`학교 변경 실패: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[480px] max-h-[80vh] flex flex-col shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line flex-shrink-0">
          <div>
            <div className="text-[15px] font-extrabold text-ink tracking-tight">🏫 학교 변경</div>
            <div className="text-[11px] text-red-600 mt-0.5 font-bold">⚠️ 마지막 변경 기회입니다 (1회만 가능)</div>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl transition-colors">✕</button>
        </div>
        <div className="px-5 py-3 border-b border-line flex-shrink-0">
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="🔍 학교명 검색 (예: 남춘천여자중)" autoFocus
            className="w-full h-10 px-3 text-[13px] border border-line rounded-lg focus:outline-none focus:border-brand-middle" />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="text-center py-10 text-[12px] text-ink-muted">
              <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-brand-middle rounded-full animate-spin mb-2" />
              <div>검색 중...</div>
            </div>
          ) : query.length < 2 ? (
            <div className="text-center py-10 text-ink-muted">
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-[13px] font-medium mb-1">학교명을 2글자 이상 입력해주세요</div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-10 text-ink-muted">
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-[13px] font-medium mb-1">검색 결과가 없어요</div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {results.map(school => (
                <button key={school.SD_SCHUL_CODE} onClick={() => handleSelect(school)} disabled={saving}
                  className="w-full flex items-start gap-2.5 px-4 py-3 rounded-xl border border-line bg-white hover:border-brand-middle-light hover:bg-brand-middle-pale/30 hover:shadow-sm transition-all text-left disabled:opacity-50">
                  <span className="text-base flex-shrink-0">🏫</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-ink">{school.SCHUL_NM}</div>
                    <div className="text-[10.5px] text-ink-muted mt-0.5 truncate">{school.LCTN_SC_NM} · {school.ORG_RDNMA}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-line bg-red-50">
          <div className="text-[10.5px] text-red-700 text-center font-semibold">⚠️ 한 번 변경하면 더 이상 수정할 수 없어요</div>
        </div>
      </div>
    </div>
  )
}

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
        {q.keywords && q.keywords.length > 0 && (
          <div className="mt-3">
            <div className="text-[10px] font-bold text-ink-muted mb-1.5">추천 키워드</div>
            <div className="flex flex-wrap gap-1">
              {q.keywords.map((tag: string) => (
                <button key={tag} onClick={() => window.open(`https://search.naver.com/search.naver?query=${encodeURIComponent(tag)}`, "_blank")}
                  className="text-[10px] px-2 py-0.5 bg-brand-middle-pale text-brand-middle-dark rounded-full border border-brand-middle-light hover:bg-brand-middle hover:text-white transition-all">
                  #{tag}
                </button>
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

      {q.hints && q.hints.length > 0 && (
        <div className="bg-white border border-line rounded-xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="text-amber-500">💡</span>
            <span className="text-[12px] font-extrabold text-ink">작성 힌트</span>
          </div>
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

      {q.checklist && q.checklist.length > 0 && (
        <div className="bg-white border border-line rounded-xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="text-amber-500">✅</span>
            <span className="text-[12px] font-extrabold text-ink">체크리스트</span>
          </div>
          <div className="space-y-1.5">
            {q.checklist.map((item: string, i: number) => (
              <label key={i} className="flex items-start gap-2 text-[11px] text-ink-secondary leading-[1.5] cursor-pointer hover:text-ink transition-colors">
                <input type="checkbox" className="mt-0.5 accent-brand-middle flex-shrink-0" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function QuestionCard({ q }: { q: any }) {
  return (
    <div className="bg-white border border-line rounded-xl px-4 py-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
        <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded">문항</span>
        <span className="text-[10px] text-ink-muted font-semibold">
          {q._isAcademy ? `🏫 학원 수행평가` : q._isSchool ? `🏫 ${q.schoolName} · ${q.schoolGrade}학년 ${q.semester}` : `우리 학교`}
        </span>
        {q.ratio && <span className="text-[10px] text-ink-muted">· 배점 {q.ratio}%</span>}
        {q.scheduledAt && <span className="text-[10px] text-ink-muted">· {q.scheduledAt}</span>}
      </div>
      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
        {q.subject && <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-middle-pale text-brand-middle-dark rounded-full border border-brand-middle-light">{q.subject}</span>}
        {q.evalType && <span className="text-[10px] font-semibold text-ink-secondary">{q.evalType}</span>}
        {q.unitTopic && <span className="text-[10px] text-ink-muted">· {q.unitTopic}</span>}
      </div>

      {/* 문항 = 메인 (크게) */}
      <p className="text-[15px] font-bold text-ink leading-[1.7]">{q.content || q.title}</p>

      {/* 수행과제 = 참고용 (작게, 문항과 다를 때만) */}
      {q.title && q.title !== q.content && (
        <div className="mt-3 pt-3 border-t border-line-light">
          <div className="text-[10px] font-bold text-ink-muted mb-1">📋 수행과제 (참고)</div>
          <div className="text-[11.5px] text-ink-secondary leading-[1.7] whitespace-pre-wrap">{q.title}</div>
        </div>
      )}
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
          <div className="text-[12px] text-ink-secondary font-semibold">{q._isAcademy ? "학원 수행평가" : q.schoolName || "우리 학교"} · {q.subject} · {q.evalType || q.type} {q.ratio && `(배점 ${q.ratio}%)`}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {savedAt && <div className="text-[11px] font-bold text-brand-middle-dark bg-brand-middle-bg border border-brand-middle-light px-2.5 py-1 rounded-md animate-pulse">✓ 저장됨</div>}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${timeUrgent ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
          <span className="text-xs">🕐</span>
          <span className={`text-[13px] font-extrabold tabular-nums ${timeUrgent ? "text-red-600 animate-pulse" : "text-amber-700"}`}>{formatTime(secondsLeft)}</span>
        </div>
        <button onClick={handleSave} className="h-8 px-3 text-[11px] font-medium text-ink-secondary bg-white border border-line rounded-md hover:border-brand-middle-light hover:bg-brand-middle-pale transition-all">💾 임시저장</button>
        <button onClick={onSubmit} disabled={!canSubmit || submitting} className={`h-8 px-5 text-[12px] font-semibold rounded-md transition-all ${canSubmit && !submitting ? "bg-brand-middle hover:bg-brand-middle-hover text-white" : "bg-gray-100 text-ink-muted cursor-not-allowed"}`}>
          {submitting ? "제출 중..." : "제출"}
        </button>
      </div>
    </div>
  )
}

function EssayPractice({ q, onBack, onSubmit, submitting }: any) {
  const [answer, setAnswer] = useState(() => loadDraft(q)?.answer_text || "")
  const [secondsLeft, setSecondsLeft] = useState((q.timeLimit || 30) * 60)
  useEffect(() => { if (secondsLeft <= 0) return; const t = setInterval(() => setSecondsLeft((p) => p - 1), 1000); return () => clearInterval(t) }, [secondsLeft])
  const wordCount = answer.length
  const minChars = q.minChars || 400
  const maxChars = q.maxChars || 800
  const isValid = wordCount >= minChars && wordCount <= maxChars
  const handleSubmit = () => { if (!isValid) { alert(`${minChars}~${maxChars}자로 작성해주세요.`); return }; onSubmit({ answer_text: answer }); clearDraft(q) }
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
                <span className={`font-extrabold tabular-nums ${wordCount < minChars ? "text-ink-muted" : wordCount > maxChars ? "text-red-500" : "text-brand-middle-dark"}`}>{wordCount}자</span>
                <span className="text-ink-muted">/ {minChars}~{maxChars}자</span>
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
  const [secondsLeft, setSecondsLeft] = useState((q.timeLimit || 30) * 60)
  useEffect(() => { if (secondsLeft <= 0) return; const t = setInterval(() => setSecondsLeft((p) => p - 1), 1000); return () => clearInterval(t) }, [secondsLeft])
  const wordCount = answer.length
  const minChars = q.minChars || 200
  const maxChars = q.maxChars || 400
  const isValid = wordCount >= minChars && wordCount <= maxChars
  const handleSubmit = () => { if (!isValid) { alert(`${minChars}~${maxChars}자로 작성해주세요.`); return }; onSubmit({ answer_text: answer }); clearDraft(q) }
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
                <span className={`font-extrabold tabular-nums ${wordCount < minChars ? "text-ink-muted" : wordCount > maxChars ? "text-red-500" : "text-brand-middle-dark"}`}>{wordCount}자</span>
                <span className="text-ink-muted">/ {minChars}~{maxChars}자</span>
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
  const [sections, setSections] = useState<Record<string, string>>(() => { const draft = loadDraft(q); if (draft?.sections) return draft.sections; return (q.sections || []).reduce((acc: any, s: any) => ({ ...acc, [s.key]: "" }), {}) })
  const [secondsLeft, setSecondsLeft] = useState((q.timeLimit || 30) * 60)
  useEffect(() => { if (secondsLeft <= 0) return; const t = setInterval(() => setSecondsLeft((p) => p - 1), 1000); return () => clearInterval(t) }, [secondsLeft])
  const totalChars = Object.values(sections).join("").length
  const allValid = (q.sections || []).every((s: any) => (sections[s.key]?.length || 0) >= s.minChars)
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
              <div className="flex items-center gap-2"><span className="text-brand-middle-dark">🔬</span><span className="text-[12px] font-bold text-ink">상세 답안</span></div>
              <div className="text-[11px] text-ink-muted">총 <span className="font-extrabold text-brand-middle-dark">{totalChars}</span>자</div>
            </div>
            <div className="p-4 space-y-4">
              {(q.sections || []).map((s: any) => {
                const value = sections[s.key] || ""; const valid = value.length >= s.minChars
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[12px] font-bold text-ink">{s.label}</label>
                      <span className={`text-[10px] font-bold tabular-nums ${valid ? "text-brand-middle-dark" : "text-ink-muted"}`}>{value.length}자 {valid ? "✓" : `/ 최소 ${s.minChars}자`}</span>
                    </div>
                    <textarea value={value} onChange={(e) => setSections({ ...sections, [s.key]: e.target.value })} placeholder={s.placeholder} rows={4} className="w-full px-3 py-2.5 text-[12px] border border-line rounded-lg focus:outline-none focus:border-brand-middle resize-y leading-[1.7]" />
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

function FeedbackView({ submission, onBack }: any) {
  const { data: feedback } = useMyFeedback(submission.id)
  const resubmit = useResubmitAnswer()
  const [resubmitText, setResubmitText] = useState("")
  const status = submission.status
  const studentAnswerDisplay = submission.answer_text || (submission.answer_sections ? formatSectionsToText(submission.answer_sections) : "")
  const alreadyResubmitted = !!submission.resubmitted_text

  // 재제출 영역을 띄울지: 1차 피드백 왔고 최종 완료 전
  const showResubmit = !!feedback?.teacher_first_feedback && status !== "completed"
  // 검색 사이드바: 항상 고정 노출
  const showSidebar = true

  // 사이드바에 넘길 최소 객체 (검색창 + 과목 키워드)
  const sidebarQ = {
    keywords: submission.question_subject ? [submission.question_subject] : [],
  }

  const handleResubmit = async () => {
    if (!resubmitText.trim()) { alert("답안을 작성해주세요."); return }
    try {
      await resubmit.mutateAsync({ submission_id: submission.id, resubmitted_text: resubmitText })
      alert("✅ 재제출 완료! 선생님이 최종 확인할 거예요.")
      onBack()
    } catch (e: any) { alert(`재제출 실패: ${e.message}`) }
  }

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-[12px] font-semibold text-ink-secondary hover:text-ink">← 목록으로</button>
          <div className="w-px h-4 bg-line" />
          <div>
            <div className="text-[11px] text-ink-muted font-semibold">{submission.question_school_name || "우리 학교"} · {submission.question_subject} · {submission.question_type}</div>
            <div className="text-[14px] font-bold text-ink">{submission.question_title}</div>
          </div>
        </div>
        <span className="px-3 py-1.5 rounded-lg text-[12px] font-bold border bg-amber-50 text-amber-800 border-amber-200">
          {status === "pending" ? "⏳ 피드백 대기 중" : status === "completed" ? "✓ 최종 완료" : status === "resubmitted" ? "📩 재제출 완료" : "📩 처리 중"}
        </span>
      </div>

      {/* 좌우 2단: 왼쪽 본문 / 오른쪽 검색 사이드바(재제출 가능 시) */}
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 h-full overflow-y-auto pr-1 space-y-3">
          <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
            <div className="text-[10px] font-bold text-ink-muted mb-1.5">출제 문제</div>
            <div className="text-[13px] text-ink leading-[1.7]">{submission.question_content}</div>
          </div>

          <div className="bg-white border border-line rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-line">
              <span className="text-[12px] font-bold text-ink">내 답안</span>
            </div>
            <div className="p-4 text-[13px] text-ink leading-[1.8] whitespace-pre-wrap">{studentAnswerDisplay}</div>
          </div>

          {feedback?.teacher_first_feedback && (
            <div className="bg-white border border-line rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-amber-50 border-b border-line">
                <span className="text-[12px] font-bold text-ink">선생님 1차 피드백</span>
              </div>
              <div className="p-4 text-[13px] text-ink leading-[1.8] whitespace-pre-wrap">{feedback.teacher_first_feedback}</div>
            </div>
          )}

          {showResubmit && (
            <div className="bg-white border border-line rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-brand-middle-bg border-b border-line flex items-center justify-between">
                <span className="text-[12px] font-bold text-ink">✏️ 피드백 반영해서 다시 제출하기</span>
                {alreadyResubmitted && (
                  <span className="text-[10px] text-ink-muted">재제출 완료 · 선생님 최종 확인 대기 중</span>
                )}
              </div>
              <div className="p-4 space-y-3">
                {alreadyResubmitted ? (
                  <div className="text-[13px] text-ink leading-[1.8] whitespace-pre-wrap bg-gray-50 border border-line rounded-lg p-3">
                    {submission.resubmitted_text}
                  </div>
                ) : (
                  <>
                    <div className="text-[11px] text-ink-muted leading-relaxed">
                      선생님의 1차 피드백을 반영해서 답안을 수정한 뒤 다시 제출하세요. 한 번 재제출하면 수정할 수 없어요. (오른쪽 검색으로 자료를 찾을 수 있어요)
                    </div>
                    <textarea
                      value={resubmitText}
                      onChange={(e) => setResubmitText(e.target.value)}
                      placeholder="피드백을 반영해 수정한 답안을 작성하세요."
                      className="w-full h-[280px] p-3 text-[13px] leading-[1.8] text-ink border border-line rounded-lg resize-none focus:outline-none focus:border-brand-middle"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[11px] text-ink-muted tabular-nums mr-auto">{resubmitText.length}자</span>
                      <button
                        onClick={handleResubmit}
                        disabled={resubmit.isPending || !resubmitText.trim()}
                        className={`h-9 px-5 text-[12px] font-semibold rounded-md transition-all ${resubmit.isPending || !resubmitText.trim()
                          ? "bg-gray-100 text-ink-muted cursor-not-allowed"
                          : "bg-brand-middle hover:bg-brand-middle-hover text-white"
                          }`}
                      >
                        {resubmit.isPending ? "제출 중..." : "📤 재제출하기"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {feedback?.teacher_final_feedback && (
            <div className="bg-white border border-line rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-emerald-50 border-b border-line">
                <span className="text-[12px] font-bold text-ink">🎉 선생님 최종 피드백</span>
              </div>
              <div className="p-4 text-[13px] text-ink leading-[1.8] whitespace-pre-wrap">{feedback.teacher_final_feedback}</div>
            </div>
          )}
        </div>

        {showSidebar && <PracticeSidebar q={sidebarQ} />}
      </div>
    </div>
  )
}

export default function Suhaeng() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const [mode, setMode] = useState<Mode>("list")
  const [selectedSemester, setSelectedSemester] = useState<'1' | '2'>('1')
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null)
  const [showAllModal, setShowAllModal] = useState(false)
  const [showChangeModal, setShowChangeModal] = useState(false)
  const [feedbackSubmission, setFeedbackSubmission] = useState<any>(null)

  const studentId = student?.id ? String(student.id) : undefined
  const studentGrade = gradeToDb(student?.grade)

  const submitAnswer = useSubmitAnswer()
  const { data: mySubmissions } = useMySuhaengSubmissions(studentId) as { data: any[] | undefined }

  const { data: academyQuestions = [], isLoading: loadingAcademy } = useMyAcademyQuestions(
    studentId, academy?.academyId ? String(academy.academyId) : undefined, student?.grade ?? undefined,
  )

  const { data: studentSchool } = useStudentSchool(studentId)
  const { data: schoolSuhaengList = [], isLoading: loadingSchool } = useSchoolSuhaeng(
    studentSchool?.school_id, studentGrade, selectedSemester,
  )

  const mySchoolSuhaeng = schoolSuhaengList.map(s => schoolSuhaengToUI(s, studentSchool?.school_name || '우리 학교'))

  // ⭐ 학교 변경 가능 여부 (school_change_count < 2: 회원가입(1) + 1회 변경)
  const changeCount = studentSchool?.school_change_count || 0
  const canChangeSchool = changeCount < 2

  const startPractice = (question: any) => {
    const existingKey = question._isAcademy ? `academy-${question.id}` : question._isSchool ? `school-${question.id}` : `practice-${question.id}`
    const submitted = mySubmissions?.find((s) => s.question_key === existingKey)
    if (submitted) { setFeedbackSubmission(submitted); setMode("feedback"); return }
    setSelectedQuestion(question); setMode("practice")
  }

  const backToList = () => { setMode("list"); setSelectedQuestion(null); setFeedbackSubmission(null) }

  const handleSubmit = async (answerData: any) => {
    if (!student?.id || !academy?.academyId || !selectedQuestion) { alert("로그인 정보를 불러오지 못했어요."); return }
    const q = selectedQuestion
    const isAcademy = !!q._isAcademy
    const isSchool = !!q._isSchool
    const questionKey = isAcademy ? `academy-${q.id}` : isSchool ? `school-${q.id}` : `practice-${q.id}`
    try {
      await submitAnswer.mutateAsync({
        student_id: String(student.id), academy_id: String(academy.academyId),
        question_key: questionKey, question_type: q.type, question_title: q.title,
        question_content: q.content, question_category: isAcademy ? "academy" : isSchool ? "school" : "practice",
        question_school_name: isAcademy ? "학원 수행평가" : isSchool ? q.schoolName : "우리 학교",
        question_subject: q.subject, question_ratio: q.ratio || null,
        question_min_chars: q.minChars || null, question_max_chars: q.maxChars || null,
        ...answerData,
      })
      alert("✅ 제출 완료!")
      backToList()
    } catch (error: any) { alert(`제출 실패: ${error.message || "알 수 없는 오류"}`) }
  }

  const academyQuestionsForUI = academyQuestions.map((q: AcademySuhaengQuestion) => ({
    ...q, _isAcademy: true, timeLimit: 30, minChars: q.min_chars, maxChars: q.max_chars,
    sections: ["주제탐구", "구술발표", "탐구수행"].includes(q.type) ? getDefaultSections(q.type) : undefined,
  }))

  if (mode === "feedback" && feedbackSubmission) return <FeedbackView submission={feedbackSubmission} onBack={backToList} />

  if (mode === "practice" && selectedQuestion) {
    const q = selectedQuestion
    const submitting = submitAnswer.isPending
    if (q.type === "논술형") return <EssayPractice q={q} onBack={backToList} onSubmit={handleSubmit} submitting={submitting} />
    if (q.type === "서술형") return <ShortAnswerPractice q={q} onBack={backToList} onSubmit={handleSubmit} submitting={submitting} />
    if (q.type === "주제탐구" || q.type === "포트폴리오" || q.type === "탐구수행" || q.type === "구술발표") return <ResearchPractice q={q} onBack={backToList} onSubmit={handleSubmit} submitting={submitting} />
    return <EssayPractice q={q} onBack={backToList} onSubmit={handleSubmit} submitting={submitting} />
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
          <div className="bg-brand-middle-bg text-brand-middle-dark text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-brand-middle-light">우리 학교 수행평가 {mySchoolSuhaeng.length}건</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 min-h-0">
        <div className="bg-white border border-line rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex-shrink-0">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-[14px] font-extrabold text-ink tracking-tight">🏫 우리 학교 수행평가</div>
                <div className="text-[11px] text-ink-muted mt-0.5">
                  {studentSchool?.school_name ? (
                    <>{studentSchool.school_name} · {student?.grade} · 2026학년도 {selectedSemester}학기</>
                  ) : (
                    <>학교 정보가 없어요</>
                  )}
                </div>
              </div>
              {/* 학기 전환 버튼 (1학기 / 2학기) */}
              <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                {(['1', '2'] as const).map((sem) => (
                  <button key={sem} onClick={() => setSelectedSemester(sem)}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${selectedSemester === sem ? "bg-brand-middle text-white shadow-sm" : "text-ink-secondary hover:text-ink"}`}>
                    {sem}학기
                  </button>
                ))}
              </div>
              {/* ⭐ 1회 변경 가능 (school_change_count < 2) */}
              {studentId && canChangeSchool && (
                <button onClick={() => setShowChangeModal(true)}
                  className="text-[11px] font-bold text-brand-middle-dark bg-brand-middle-pale border border-brand-middle-light px-3 py-1.5 rounded-full hover:bg-brand-middle hover:text-white transition-all">
                  🏫 학교 변경 (1회 남음)
                </button>
              )}
            </div>
            {studentSchool?.school_id && mySchoolSuhaeng.length > 0 && (
              <button onClick={() => setShowAllModal(true)} className="text-[11px] font-semibold text-brand-middle-dark hover:text-brand-middle">전체 보기 ›</button>
            )}
          </div>

          {!studentSchool?.school_id ? (
            <div className="px-4 py-10 text-center text-ink-muted">
              <div className="text-3xl mb-2">🏫</div>
              <div className="text-[13px] font-bold text-ink mb-1">학교 정보가 없어요</div>
              <div className="text-[11px]">학원에 문의해주세요</div>
            </div>
          ) : loadingSchool ? (
            <div className="px-4 py-10 text-center text-ink-muted text-[12px]">
              <div className="text-2xl mb-2">⏳</div>불러오는 중...
            </div>
          ) : mySchoolSuhaeng.length === 0 ? (
            <div className="px-4 py-10 text-center text-ink-muted">
              <div className="text-3xl mb-2">📚</div>
              <div className="text-[12px] font-medium mb-1">{selectedSemester}학기에 등록된 수행평가가 없어요</div>
              <div className="text-[11px]">다른 학기를 선택하거나 학원에 문의해주세요</div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2.5 p-3">
              {mySchoolSuhaeng.map((t: any) => {
                const submitted = mySubmissions?.find((s) => s.question_key === `school-${t.id}`)
                return (
                  <div key={t.id} onClick={() => startPractice(t)} className={`relative rounded-lg border px-3 py-2.5 cursor-pointer transition-all hover:-translate-y-px ${submitted ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-line hover:border-brand-middle-light hover:shadow-sm"}`}>
                    {submitted && <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full">✓ 제출됨</div>}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] font-bold text-ink-secondary bg-white border border-line px-1.5 py-0.5 rounded">{t.subject}</span>
                      <span className="text-[10px] font-semibold text-brand-middle-dark">{t.evalType}</span>
                    </div>
                    <div className="text-[12px] font-bold text-ink leading-tight mb-2 line-clamp-2 min-h-[30px]">{t.content || t.title}</div>
                    {t.unitTopic && <div className="text-[10px] text-ink-muted line-clamp-1 mb-1">{t.unitTopic}</div>}
                    <div className="flex items-center justify-between text-[10px] pt-2 border-t border-line">
                      <span className="text-ink-muted">{t.scheduledAt}</span>
                      {t.ratio && <span className="text-ink-muted">{t.ratio}점</span>}
                    </div>
                    <div className="mt-1.5 text-[10px] font-bold text-brand-middle-dark">{submitted ? "제출 완료 ✓" : "바로 시작 →"}</div>
                  </div>
                )
              })}
            </div>
          )}
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
            </div>
          ) : (
            <div className="p-3 grid grid-cols-4 gap-2.5">
              {academyQuestionsForUI.map((q: any) => {
                const submitted = mySubmissions?.find((s) => s.question_key === `academy-${q.id}`)
                return (
                  <div key={q.id} onClick={() => startPractice(q)} className={`relative rounded-xl border px-4 py-3 cursor-pointer transition-all hover:-translate-y-px ${submitted ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-line hover:border-brand-middle-light hover:shadow-sm"}`}>
                    {submitted && <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full">✓ 제출됨</div>}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-ink-secondary bg-white border border-line px-1.5 py-0.5 rounded">{q.subject}</span>
                      <span className="text-[10px] font-semibold text-brand-middle-dark">{q.type}</span>
                    </div>
                    <div className="text-[12px] font-bold text-ink leading-tight mb-2 line-clamp-2">{q.title}</div>
                    <div className="text-[10px] text-ink-muted line-clamp-2 leading-relaxed mb-2">{q.content}</div>
                    <div className="text-[10px] font-bold text-brand-middle-dark">{submitted ? "제출 완료 ✓" : "시작하기 →"}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showAllModal && studentSchool?.school_id && (
        <div onClick={() => setShowAllModal(false)} className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-[720px] max-h-[80vh] flex flex-col shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <div>
                <div className="text-[16px] font-extrabold text-ink tracking-tight">🏫 {studentSchool?.school_name} 수행평가 전체</div>
                <div className="text-[11px] text-ink-muted mt-0.5">{student?.grade} · 2026학년도 {selectedSemester}학기 ({mySchoolSuhaeng.length}건)</div>
              </div>
              <button onClick={() => setShowAllModal(false)} className="text-ink-muted hover:text-ink text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-2">
                {mySchoolSuhaeng.map((s: any) => (
                  <div key={s.id} onClick={() => { setShowAllModal(false); startPractice(s) }} className="border border-line rounded-lg p-3 hover:border-brand-middle-light hover:bg-brand-middle-pale/20 cursor-pointer transition-all">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-ink-secondary bg-white border border-line px-1.5 py-0.5 rounded">{s.subject}</span>
                      <span className="text-[10px] font-semibold text-brand-middle-dark">{s.evalType}</span>
                      {s.ratio && <span className="text-[10px] text-ink-muted">· 배점 {s.ratio}%</span>}
                      <span className="ml-auto text-[10px] text-ink-muted">{s.scheduledAt}</span>
                    </div>
                    <div className="text-[13px] font-bold text-ink">{s.content || s.title}</div>
                    {s.unitTopic && <div className="text-[10.5px] text-ink-muted mt-0.5">{s.unitTopic}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showChangeModal && studentId && (
        <SchoolChangeModal
          studentId={studentId}
          onClose={() => setShowChangeModal(false)}
          onChanged={() => window.location.reload()}
        />
      )}
    </div>
  )
}