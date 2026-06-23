// src/pages/high-student/_pages/suhaeng/HighSuhaeng.tsx

import React, { useState, useEffect, useRef } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '@/lib/auth/atoms'
import {
  useMyHighAcademyQuestions,
  useMyHighSubmissions,
  useSubmitHighAnswer,
  useResubmitHighAnswer,
  useMyHighFeedback,
  type HighAcademySuhaengQuestion,
  type HighSuhaengSubmission,
} from '@/pages/high-student/_hooks/useHighSuhaengSubmission'
import { supabase } from '@/lib/supabase'
import { useHighSchoolSuhaeng, useHighSchool, useHighStudentSchool } from '@/pages/admin/_hooks/useHighSchoolSuhaeng'

const TYPE_ICON: Record<string, string> = {
  '탐구보고서': '🔬', '독서기록': '📚', '발표·토론': '🎤',
  '프로젝트·산출물': '🛠️', '실험·실습': '🧪', '글쓰기·논술': '✏️',
}

const SECTION_LABEL_MAP: Record<string, string> = {
  topic: '탐구 주제', background: '탐구 배경', method: '탐구 방법',
  content: '탐구 내용', conclusion: '결론 및 느낀 점', reference: '참고 자료',
  book: '도서 정보', summary: '주요 내용 요약', impression: '인상 깊은 구절',
  opinion: '나의 생각', apply: '삶에의 적용',
  position: '나의 입장', reason: '근거', counter: '반론 대응', script: '발표 원고',
  goal: '프로젝트 목표', plan: '계획', process: '수행 과정', result: '결과물 설명', reflection: '성찰',
  purpose: '실험 목적', hypothesis: '가설', materials: '준비물', procedure: '실험 과정',
  answer_text: '답안',
}

function getDefaultSections(type: string) {
  if (type === '탐구보고서') return [
    { key: 'topic', label: '1. 탐구 주제', placeholder: '탐구할 주제를 작성하세요.', minChars: 20 },
    { key: 'background', label: '2. 탐구 배경', placeholder: '왜 이 주제를 탐구하게 되었는지 작성하세요.', minChars: 50 },
    { key: 'method', label: '3. 탐구 방법', placeholder: '어떤 방법으로 탐구했는지 작성하세요.', minChars: 50 },
    { key: 'content', label: '4. 탐구 내용', placeholder: '탐구한 내용을 구체적으로 정리하세요.', minChars: 150 },
    { key: 'conclusion', label: '5. 결론 및 느낀 점', placeholder: '탐구 결과와 느낀 점을 작성하세요.', minChars: 80 },
    { key: 'reference', label: '6. 참고 자료', placeholder: '참고한 자료의 출처를 작성하세요.', minChars: 20 },
  ]
  if (type === '독서기록') return [
    { key: 'book', label: '1. 도서 정보', placeholder: '책 제목, 저자, 출판사를 작성하세요.', minChars: 10 },
    { key: 'summary', label: '2. 주요 내용 요약', placeholder: '책의 주요 내용을 요약하세요.', minChars: 100 },
    { key: 'impression', label: '3. 인상 깊은 구절', placeholder: '가장 인상 깊었던 부분과 이유를 작성하세요.', minChars: 50 },
    { key: 'opinion', label: '4. 나의 생각', placeholder: '책을 읽고 든 생각이나 비판적 의견을 작성하세요.', minChars: 80 },
    { key: 'apply', label: '5. 삶에의 적용', placeholder: '책에서 배운 점을 자신의 삶에 어떻게 적용할지 작성하세요.', minChars: 50 },
  ]
  if (type === '발표·토론') return [
    { key: 'topic', label: '1. 발표/토론 주제', placeholder: '주제를 입력하세요.', minChars: 10 },
    { key: 'position', label: '2. 나의 입장', placeholder: '주제에 대한 나의 입장을 작성하세요.', minChars: 50 },
    { key: 'reason', label: '3. 근거', placeholder: '입장을 뒷받침하는 근거를 2~3가지 작성하세요.', minChars: 100 },
    { key: 'counter', label: '4. 반론 대응', placeholder: '예상되는 반론과 이에 대한 대응을 작성하세요.', minChars: 50 },
    { key: 'script', label: '5. 발표 원고', placeholder: '발표 원고를 작성하세요.', minChars: 150 },
  ]
  if (type === '프로젝트·산출물') return [
    { key: 'goal', label: '1. 프로젝트 목표', placeholder: '프로젝트의 목표와 의도를 작성하세요.', minChars: 50 },
    { key: 'plan', label: '2. 계획', placeholder: '어떻게 진행할 것인지 단계별로 작성하세요.', minChars: 80 },
    { key: 'process', label: '3. 수행 과정', placeholder: '프로젝트를 진행하면서 한 일을 작성하세요.', minChars: 100 },
    { key: 'result', label: '4. 결과물 설명', placeholder: '완성된 결과물을 설명하세요.', minChars: 80 },
    { key: 'reflection', label: '5. 성찰', placeholder: '어려웠던 점, 배운 점, 개선할 점을 작성하세요.', minChars: 50 },
  ]
  if (type === '실험·실습') return [
    { key: 'purpose', label: '1. 실험 목적', placeholder: '무엇을 알아보려는지 작성하세요.', minChars: 30 },
    { key: 'hypothesis', label: '2. 가설', placeholder: '"만약 ~라면, ~할 것이다" 형식으로 작성하세요.', minChars: 30 },
    { key: 'materials', label: '3. 준비물', placeholder: '사용한 준비물을 나열하세요.', minChars: 20 },
    { key: 'procedure', label: '4. 실험 과정', placeholder: '①, ②, ③... 순서대로 작성하세요.', minChars: 80 },
    { key: 'result', label: '5. 결과 및 데이터', placeholder: '관찰 내용과 데이터를 정리하세요.', minChars: 80 },
    { key: 'conclusion', label: '6. 결론', placeholder: '실험 결과와 가설을 비교하며 정리하세요.', minChars: 50 },
  ]
  if (type === '글쓰기·논술') return null
  return null
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

const uploadFile = async (file: File | Blob, studentId: string, questionId: string, fileType: string, fileName?: string): Promise<string | null> => {
  try {
    const ext = fileName?.split('.').pop() || (fileType === 'audio' ? 'webm' : fileType === 'video' ? 'mp4' : 'jpg')
    const filePath = `${studentId}/${questionId}/${fileType}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('suhaeng-files').upload(filePath, file, { cacheControl: '3600', upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from('suhaeng-files').getPublicUrl(filePath)
    return data.publicUrl
  } catch (e) { console.error('파일 업로드 실패:', e); return null }
}

function MicSTTBtn({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => { if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop()) }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch { alert('마이크 권한이 필요해요.') }
  }

  const stopRecording = async () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    setRecording(false); setProcessing(true)
    const blobPromise = new Promise<Blob>(resolve => {
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (audioStreamRef.current) { audioStreamRef.current.getTracks().forEach(t => t.stop()); audioStreamRef.current = null }
        resolve(blob)
      }
      recorder.stop()
    })
    try {
      const blob = await blobPromise
      const audioBase64 = await blobToBase64(blob)
      const { data, error } = await supabase.functions.invoke('middle-stt-short', { body: { audioBase64 } })
      if (error || !data?.success) { alert('음성 변환 실패: ' + (error?.message || data?.error || 'unknown')); return }
      const transcript = data?.text || ''
      if (transcript) onTranscript(transcript)
      else alert('음성을 인식하지 못했어요. 다시 시도해주세요!')
    } catch (e: any) { alert('STT 처리 중 오류: ' + e.message) }
    finally { setProcessing(false) }
  }

  return (
    <button onClick={recording ? stopRecording : startRecording} disabled={processing}
      title={recording ? '녹음 종료' : processing ? '변환 중...' : '음성으로 입력 (1분 이내)'}
      className={`w-9 h-9 rounded-lg border flex items-center justify-center text-base transition-all ${
        recording ? 'bg-red-50 border-red-200 text-red-500 animate-pulse'
          : processing ? 'bg-amber-50 border-amber-200 text-amber-600 cursor-wait'
          : 'bg-brand-high-pale border-brand-high-light text-brand-high-dark hover:bg-brand-high-pale'
      }`}>
      {recording ? '⏹' : processing ? '⏳' : '🎙️'}
    </button>
  )
}

function SearchBox({ keywords }: { keywords?: string[] }) {
  const [query, setQuery] = useState('')
  const [engine, setEngine] = useState<'naver' | 'google'>('naver')
  const handleSearch = () => {
    if (!query.trim()) return
    window.open(engine === 'naver' ? `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}` : `https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank')
    setQuery('')
  }
  return (
    <div className="bg-white border border-line rounded-xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-brand-high-dark">🔍</span>
        <span className="text-[12px] font-extrabold text-ink">자료 검색</span>
      </div>
      <div className="flex gap-1 mb-2">
        <button onClick={() => setEngine('naver')} className={`flex-1 text-[10px] font-bold py-1 rounded-md transition-all ${engine === 'naver' ? 'bg-green-500 text-white' : 'bg-gray-100 text-ink-secondary hover:bg-gray-200'}`}>N 네이버</button>
        <button onClick={() => setEngine('google')} className={`flex-1 text-[10px] font-bold py-1 rounded-md transition-all ${engine === 'google' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-ink-secondary hover:bg-gray-200'}`}>구글</button>
      </div>
      <div className="relative">
        <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="검색어를 입력하세요..." className="w-full h-9 px-3 pr-9 text-[11px] border border-line rounded-md focus:outline-none focus:border-brand-high focus:ring-2 focus:ring-brand-high/10 transition-all placeholder:text-ink-muted" />
        <button onClick={handleSearch} className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-brand-high text-white rounded-md hover:bg-brand-high-dark transition-all text-xs flex items-center justify-center">🔍</button>
      </div>
      <div className="mt-3 pt-3 border-t border-line">
        <div className="text-[10px] font-bold text-ink-muted mb-1.5">빠른 링크</div>
        <div className="space-y-1">
          {[
            { icon: '📚', label: '네이버 지식백과', url: 'https://terms.naver.com' },
            { icon: '📖', label: '위키백과', url: 'https://ko.wikipedia.org' },
            { icon: '📊', label: '통계청 KOSIS', url: 'https://kosis.kr' },
            { icon: '🔬', label: 'RISS 논문검색', url: 'https://www.riss.kr' },
            { icon: '📑', label: '국회도서관', url: 'https://www.nanet.go.kr' },
          ].map((link, i) => (
            <button key={i} onClick={() => window.open(link.url, '_blank')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-brand-high-pale transition-colors group">
              <span className="text-sm">{link.icon}</span>
              <span className="text-[11px] font-medium text-ink-secondary group-hover:text-brand-high-dark transition-colors">{link.label}</span>
              <span className="ml-auto text-[10px] text-ink-muted">↗</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function PracticeHeader({ q, onBack, onSubmit, onSaveDraft, canSubmit, submitting, secondsLeft }: any) {
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const timeUrgent = secondsLeft < 300
  const formatTime = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
  const handleSave = () => {
    if (onSaveDraft) {
      const ok = onSaveDraft()
      if (ok) { setSavedAt(new Date()); setTimeout(() => setSavedAt(null), 3000) }
    }
  }
  return (
    <div className="flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-[12px] font-semibold text-ink-secondary hover:text-ink transition-colors">← 목록으로</button>
        <div className="w-px h-4 bg-line" />
        <div>
          <div className="text-[12px] text-ink-secondary font-semibold">{q._isSchool ? '우리 학교' : '학원 수행평가'} · {q.subject} · {q.type}{q.ratio ? ` (배점 ${q.ratio}%)` : ''}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {savedAt && <div className="text-[11px] font-bold text-brand-high-dark bg-brand-high-pale border border-brand-high-light px-2.5 py-1 rounded-md animate-pulse">✓ 저장됨</div>}
        {secondsLeft !== undefined && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${timeUrgent ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
            <span className="text-xs">🕐</span>
            <span className={`text-[13px] font-extrabold tabular-nums ${timeUrgent ? 'text-red-600 animate-pulse' : 'text-amber-700'}`}>{formatTime(secondsLeft)}</span>
          </div>
        )}
        <button onClick={handleSave} className="h-8 px-3 text-[11px] font-medium text-ink-secondary bg-white border border-line rounded-md hover:border-brand-high-light hover:bg-brand-high-pale transition-all">💾 임시저장</button>
        <button onClick={onSubmit} disabled={!canSubmit || submitting}
          className={`h-8 px-5 text-[12px] font-semibold rounded-md transition-all ${canSubmit && !submitting ? 'bg-brand-high hover:bg-brand-high-dark text-white hover:-translate-y-px shadow-[0_2px_8px_rgba(37,99,235,0.2)]' : 'bg-gray-100 text-ink-muted cursor-not-allowed'}`}>
          {submitting ? '제출 중...' : '제출'}
        </button>
      </div>
    </div>
  )
}

function QuestionCard({ q }: { q: any }) {
  const isSchool = !!q._isSchool
  return (
    <div className="bg-white border border-line rounded-xl px-4 py-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
        <span className="text-[10px] font-bold text-white bg-brand-high px-2 py-0.5 rounded">문항</span>
        <span className="text-[10px] text-ink-muted font-semibold">
          {isSchool ? `🏫 우리 학교${q.grade ? ` · ${q.grade}` : ''}${q.semester ? ` ${q.semester}` : ''}` : `학원 수행평가 · ${q.subject} · ${q.grade}`}
        </span>
        {q.ratio ? <span className="text-[10px] text-ink-muted">· 배점 {q.ratio}%</span> : null}
        {q.scheduledAt ? <span className="text-[10px] text-ink-muted">· {q.scheduledAt}</span> : null}
      </div>
      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
        {q.subject && <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-high-pale text-brand-high-dark rounded-full border border-brand-high-light">{q.subject}</span>}
        {q.type && <span className="text-[10px] font-semibold text-ink-secondary">{q.type}</span>}
        {q.coreConcept && <span className="text-[10px] text-ink-muted">· {q.coreConcept}</span>}
        {!q.coreConcept && q.unitTopic && <span className="text-[10px] text-ink-muted">· {q.unitTopic}</span>}
      </div>

      {/* 문항 = 메인 (크게) */}
      <p className="text-[15px] font-bold text-ink leading-[1.7]">{q.content || q.title}</p>

      {/* 수행과제 = 참고용 (작게, 문항과 다를 때만) */}
      {q.title && q.title !== q.content && (
        <div className="mt-3 pt-3 border-t border-line">
          <div className="text-[10px] font-bold text-ink-muted mb-1">📋 수행과제 (참고)</div>
          <div className="text-[11.5px] text-ink-secondary leading-[1.7] whitespace-pre-wrap">{q.title}</div>
        </div>
      )}

      {/* 학원 문제일 때만: 평가 요소 */}
      {!isSchool && q.eval_criteria && q.eval_criteria.length > 0 && (
        <div className="mt-3 pt-3 border-t border-line">
          <div className="text-[10px] font-bold text-ink-muted mb-1.5">평가 요소</div>
          <div className="flex flex-wrap gap-1.5">
            {q.eval_criteria.map((e: any, i: number) => (
              <span key={i} className="text-[10px] px-2 py-0.5 bg-brand-high-pale text-brand-high-dark rounded-full border border-brand-high-light font-semibold">{e.name} {e.score}점</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EssayPractice({ q, onBack, onSubmit, submitting }: any) {
  const [answer, setAnswer] = useState(() => {
    try { const d = localStorage.getItem(`high-suhaeng-draft:${q.id}`); return d ? JSON.parse(d).answer_text || '' : '' } catch { return '' }
  })
  const [secondsLeft, setSecondsLeft] = useState(30 * 60)
  useEffect(() => {
    if (secondsLeft <= 0) return
    const t = setInterval(() => setSecondsLeft(p => p - 1), 1000)
    return () => clearInterval(t)
  }, [secondsLeft])
  const minChars = q.min_chars || 300
  const maxChars = q.max_chars || 1000
  const isValid = answer.length >= minChars && answer.length <= maxChars
  const handleSaveDraft = () => {
    if (!answer.trim()) { alert('답안을 작성하고 저장해주세요.'); return false }
    try { localStorage.setItem(`high-suhaeng-draft:${q.id}`, JSON.stringify({ answer_text: answer, savedAt: new Date().toISOString() })); return true } catch { return false }
  }
  const handleSubmit = () => {
    if (!isValid) { alert(`${minChars}~${maxChars}자로 작성해주세요.`); return }
    localStorage.removeItem(`high-suhaeng-draft:${q.id}`)
    onSubmit({ answer_text: answer })
  }
  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <PracticeHeader q={q} onBack={onBack} onSubmit={handleSubmit} onSaveDraft={handleSaveDraft} canSubmit={isValid} submitting={submitting} secondsLeft={secondsLeft} />
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 h-full overflow-y-auto pr-1 space-y-3">
          <QuestionCard q={q} />
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2"><span>✏️</span><span className="text-[12px] font-bold text-ink">내 답안</span></div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className={`font-extrabold tabular-nums ${answer.length < minChars ? 'text-ink-muted' : answer.length > maxChars ? 'text-red-500' : 'text-brand-high-dark'}`}>{answer.length}자</span>
                <span className="text-ink-muted">/ {minChars}~{maxChars}자</span>
              </div>
            </div>
            <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="이곳에 답안을 작성하세요." className="w-full h-[500px] p-4 text-[13px] leading-[1.8] text-ink resize-none focus:outline-none placeholder:text-ink-muted" />
          </div>
        </div>
        <div className="w-[280px] flex-shrink-0"><SearchBox /></div>
      </div>
    </div>
  )
}

function SectionPractice({ q, onBack, onSubmit, submitting, icon, label }: any) {
  const sections = getDefaultSections(q.type) || []
  const [values, setValues] = useState<Record<string, string>>(() => {
    try { const d = localStorage.getItem(`high-suhaeng-draft:${q.id}`); return d ? JSON.parse(d).sections || sections.reduce((acc: any, s: any) => ({ ...acc, [s.key]: '' }), {}) : sections.reduce((acc: any, s: any) => ({ ...acc, [s.key]: '' }), {}) } catch { return sections.reduce((acc: any, s: any) => ({ ...acc, [s.key]: '' }), {}) }
  })
  const [secondsLeft, setSecondsLeft] = useState(30 * 60)
  useEffect(() => {
    if (secondsLeft <= 0) return
    const t = setInterval(() => setSecondsLeft(p => p - 1), 1000)
    return () => clearInterval(t)
  }, [secondsLeft])
  const allValid = sections.every((s: any) => (values[s.key]?.length || 0) >= s.minChars)
  const totalChars = Object.values(values).join('').length
  const handleSaveDraft = () => {
    if (!Object.values(values).some(v => v.trim())) { alert('답안을 작성하고 저장해주세요.'); return false }
    try { localStorage.setItem(`high-suhaeng-draft:${q.id}`, JSON.stringify({ sections: values, savedAt: new Date().toISOString() })); return true } catch { return false }
  }
  const handleSubmit = () => {
    if (!allValid) { alert('모든 항목을 최소 글자수만큼 작성해주세요.'); return }
    localStorage.removeItem(`high-suhaeng-draft:${q.id}`)
    onSubmit({ answer_sections: values })
  }
  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <PracticeHeader q={q} onBack={onBack} onSubmit={handleSubmit} onSaveDraft={handleSaveDraft} canSubmit={allValid} submitting={submitting} secondsLeft={secondsLeft} />
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 h-full overflow-y-auto pr-1 space-y-3">
          <QuestionCard q={q} />
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2"><span>{icon}</span><span className="text-[12px] font-bold text-ink">{label}</span></div>
              <div className="text-[11px] text-ink-muted">총 <span className="font-extrabold text-brand-high-dark">{totalChars}</span>자</div>
            </div>
            <div className="p-4 space-y-4">
              {sections.map((s: any) => {
                const value = values[s.key] || ''
                const valid = value.length >= s.minChars
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[12px] font-bold text-ink">{s.label}</label>
                      <span className={`text-[10px] font-bold tabular-nums ${valid ? 'text-brand-high-dark' : 'text-ink-muted'}`}>{value.length}자 {valid ? '✓' : `/ 최소 ${s.minChars}자`}</span>
                    </div>
                    <textarea value={value} onChange={e => setValues({ ...values, [s.key]: e.target.value })}
                      placeholder={s.placeholder} rows={4}
                      className="w-full px-3 py-2.5 text-[12px] border border-line rounded-lg focus:outline-none focus:border-brand-high focus:ring-2 focus:ring-brand-high/10 transition-all placeholder:text-ink-muted resize-y leading-[1.7]" />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="w-[280px] flex-shrink-0"><SearchBox /></div>
      </div>
    </div>
  )
}

function ExperimentPractice({ q, onBack, onSubmit, submitting, studentId }: any) {
  const sections = getDefaultSections('실험·실습') || []
  const [values, setValues] = useState<Record<string, string>>(sections.reduce((acc: any, s: any) => ({ ...acc, [s.key]: '' }), {}))
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const allValid = sections.every((s: any) => (values[s.key]?.length || 0) >= s.minChars)
  const totalChars = Object.values(values).join('').length
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newPhotos = [...photos, ...files].slice(0, 5)
    setPhotos(newPhotos); setPhotoPreviews(newPhotos.map(f => URL.createObjectURL(f)))
  }
  const handleSubmit = async () => {
    if (!allValid) { alert('모든 항목을 최소 글자수만큼 작성해주세요.'); return }
    setUploading(true)
    try {
      const photoUrls: string[] = []
      for (const file of photos) { const url = await uploadFile(file, studentId, q.id, 'photo', file.name); if (url) photoUrls.push(url) }
      onSubmit({ answer_sections: values, answer_photo_urls: photoUrls.length > 0 ? photoUrls : undefined })
    } catch (e: any) { alert('업로드 실패: ' + e.message) }
    finally { setUploading(false) }
  }
  const [secondsLeftExp, setSecondsLeftExp] = useState(30 * 60)
  useEffect(() => {
    if (secondsLeftExp <= 0) return
    const t = setInterval(() => setSecondsLeftExp(p => p - 1), 1000)
    return () => clearInterval(t)
  }, [secondsLeftExp])
  const handleSaveDraftExp = () => {
    try { localStorage.setItem(`high-suhaeng-draft:${q.id}`, JSON.stringify({ sections, savedAt: new Date().toISOString() })); return true } catch { return false }
  }
  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <PracticeHeader q={q} onBack={onBack} onSubmit={handleSubmit} onSaveDraft={handleSaveDraftExp} canSubmit={allValid} submitting={submitting || uploading} secondsLeft={secondsLeftExp} />
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 h-full overflow-y-auto pr-1 space-y-3">
          <QuestionCard q={q} />
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2"><span>🧪</span><span className="text-[12px] font-bold text-ink">실험 보고서</span></div>
              <div className="text-[11px] text-ink-muted">총 <span className="font-extrabold text-brand-high-dark">{totalChars}</span>자</div>
            </div>
            <div className="p-4 space-y-4">
              {sections.map((s: any) => {
                const value = values[s.key] || ''
                const valid = value.length >= s.minChars
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[12px] font-bold text-ink">{s.label}</label>
                      <span className={`text-[10px] font-bold ${valid ? 'text-brand-high-dark' : 'text-ink-muted'}`}>{value.length}자 {valid ? '✓' : `/ 최소 ${s.minChars}자`}</span>
                    </div>
                    <textarea value={value} onChange={e => setValues({ ...values, [s.key]: e.target.value })}
                      placeholder={s.placeholder} rows={4}
                      className="w-full px-3 py-2.5 text-[12px] border border-line rounded-lg focus:outline-none focus:border-brand-high focus:ring-2 focus:ring-brand-high/10 transition-all placeholder:text-ink-muted resize-y leading-[1.7]" />
                  </div>
                )
              })}
            </div>
          </div>
          <div className="bg-white border border-line rounded-xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-1.5 mb-3">
              <span>📷</span><span className="text-[12px] font-extrabold text-ink">실험 사진 첨부</span>
              <span className="text-[10px] text-ink-muted ml-auto">선택사항 · 최대 5장 ({photos.length}/5)</span>
            </div>
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photoPreviews.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt={`사진 ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border border-line" />
                    <button onClick={() => { const p = photos.filter((_, j) => j !== i); setPhotos(p); setPhotoPreviews(p.map(f => URL.createObjectURL(f))) }}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                  </div>
                ))}
              </div>
            )}
            {photos.length < 5 && (
              <label className="w-full h-20 rounded-lg font-bold text-brand-high-dark bg-brand-high-pale border-2 border-dashed border-brand-high-light hover:bg-brand-high-bg transition-all flex flex-col items-center justify-center gap-1 cursor-pointer">
                <span className="text-2xl">📷</span>
                <span className="text-[11px]">실험 사진 업로드</span>
                <input type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />
              </label>
            )}
          </div>
        </div>
        <div className="w-[280px] flex-shrink-0"><SearchBox /></div>
      </div>
    </div>
  )
}

function PresentationPractice({ q, onBack, onSubmit, submitting, studentId }: any) {
  const sections = getDefaultSections('발표·토론') || []
  const [values, setValues] = useState<Record<string, string>>(sections.reduce((acc: any, s: any) => ({ ...acc, [s.key]: '' }), {}))
  const [isRecording, setIsRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioStreamRef = useRef<MediaStream | null>(null)
  const allValid = sections.every((s: any) => (values[s.key]?.length || 0) >= s.minChars)

  useEffect(() => {
    return () => { if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop()) }
  }, [])

  useEffect(() => {
    if (!isRecording) return
    const t = setInterval(() => setRecordTime(p => p + 1), 1000)
    return () => clearInterval(t)
  }, [isRecording])

  const formatRecTime = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioStreamRef.current = stream
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setRecordTime(0)
    } catch { alert('마이크 권한을 허용해주세요.') }
  }

  const stopRecording = (): Promise<Blob | null> => {
    return new Promise(resolve => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') { resolve(null); return }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (audioStreamRef.current) { audioStreamRef.current.getTracks().forEach(t => t.stop()); audioStreamRef.current = null }
        resolve(blob)
      }
      recorder.stop()
    })
  }

  const handleStopRecording = async () => {
    setIsRecording(false)
    const blob = await stopRecording()
    if (blob && blob.size > 0) {
      setAudioBlob(blob)
      setAudioUrl(URL.createObjectURL(blob))
    } else {
      alert('녹음된 내용이 없어요. 다시 시도해주세요.')
    }
  }

  const handleSubmit = async () => {
    if (!allValid) { alert('모든 항목을 최소 글자수만큼 작성해주세요.'); return }
    setUploading(true)
    try {
      let audioUploadedUrl: string | undefined
      if (audioBlob) { const url = await uploadFile(audioBlob, studentId, q.id, 'audio'); if (url) audioUploadedUrl = url }
      onSubmit({ answer_sections: values, answer_audio_url: audioUploadedUrl })
    } catch (e: any) { alert('업로드 실패: ' + e.message) }
    finally { setUploading(false) }
  }

  const [secondsLeftPres, setSecondsLeftPres] = useState(30 * 60)
  useEffect(() => {
    if (secondsLeftPres <= 0) return
    const t = setInterval(() => setSecondsLeftPres(p => p - 1), 1000)
    return () => clearInterval(t)
  }, [secondsLeftPres])
  const handleSaveDraftPres = () => {
    if (!Object.values(values).some((v: any) => v.trim())) { alert('답안을 작성하고 저장해주세요.'); return false }
    try { localStorage.setItem(`high-suhaeng-draft:${q.id}`, JSON.stringify({ sections: values, savedAt: new Date().toISOString() })); return true } catch { return false }
  }

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <PracticeHeader q={q} onBack={onBack} onSubmit={handleSubmit} onSaveDraft={handleSaveDraftPres} canSubmit={allValid} submitting={submitting || uploading} secondsLeft={secondsLeftPres} />
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 h-full overflow-y-auto pr-1 space-y-3">
          <QuestionCard q={q} />
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-line flex items-center gap-2">
              <span>🎤</span><span className="text-[12px] font-bold text-ink">발표·토론 준비</span>
              <span className="ml-auto text-[10px] text-ink-muted">🎙️ 버튼으로 음성 입력 가능</span>
            </div>
            <div className="p-4 space-y-4">
              {sections.map((s: any) => {
                const value = values[s.key] || ''
                const valid = value.length >= s.minChars
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[12px] font-bold text-ink">{s.label}</label>
                      <span className={`text-[10px] font-bold ${valid ? 'text-brand-high-dark' : 'text-ink-muted'}`}>{value.length}자 {valid ? '✓' : `/ 최소 ${s.minChars}자`}</span>
                    </div>
                    <textarea value={value} onChange={e => setValues({ ...values, [s.key]: e.target.value })}
                      placeholder={s.placeholder} rows={s.key === 'script' ? 8 : 4}
                      className="w-full px-3 py-2.5 text-[12px] border border-line rounded-lg focus:outline-none focus:border-brand-high focus:ring-2 focus:ring-brand-high/10 transition-all placeholder:text-ink-muted resize-y leading-[1.7]" />
                    <div className="flex justify-end mt-1">
                      <MicSTTBtn onTranscript={t => setValues(prev => ({ ...prev, [s.key]: prev[s.key] ? prev[s.key] + ' ' + t : t }))} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="bg-white border border-line rounded-xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5"><span>🎙️</span><span className="text-[12px] font-extrabold text-ink">발표 녹음 제출</span></div>
              {audioUrl && <span className="text-[10px] font-bold text-brand-high-dark bg-brand-high-pale border border-brand-high-light px-1.5 py-0.5 rounded-full">✓ 녹음됨</span>}
            </div>
            <div className="flex gap-2">
              {!isRecording ? (
                <button onClick={startRecording} className="flex-1 h-14 rounded-lg font-bold text-white bg-brand-high hover:bg-brand-high-dark transition-all flex items-center justify-center gap-2">
                  <span>🎙️</span>
                  <span className="text-[12px]">{audioUrl ? '다시 녹음' : '녹음 시작'}</span>
                </button>
              ) : (
                <button onClick={handleStopRecording} className="flex-1 h-14 rounded-lg font-bold text-white bg-red-500 hover:bg-red-600 animate-pulse transition-all flex items-center justify-center gap-2">
                  <span>⏹</span>
                  <span className="text-[12px]">녹음 중 {formatRecTime(recordTime)} · 클릭하면 종료</span>
                </button>
              )}
            </div>
            {audioUrl && (
              <div className="mt-2">
                <audio controls src={audioUrl} className="w-full h-8" />
                <button onClick={() => { setAudioBlob(null); setAudioUrl(null) }} className="text-[10px] text-red-500 hover:text-red-700 mt-1">삭제</button>
              </div>
            )}
          </div>
        </div>
        <div className="w-[280px] flex-shrink-0"><SearchBox /></div>
      </div>
    </div>
  )
}

function FeedbackView({ submission, question, onBack }: { submission: HighSuhaengSubmission; question: HighAcademySuhaengQuestion; onBack: () => void }) {
  const { data: feedback, isLoading } = useMyHighFeedback(submission.id)
  const resubmit = useResubmitHighAnswer()
  const [isResubmitting, setIsResubmitting] = useState(false)
  const [resubmitText, setResubmitText] = useState('')

  const isSchool = !!(question as any)._isSchool
  const ratio = (question as any).ratio

  const studentAnswerDisplay = submission.answer_text ||
    (submission.answer_sections ? Object.entries(submission.answer_sections).map(([k, v]) => `[${SECTION_LABEL_MAP[k] || k}]\n${v}`).join('\n\n') : '')

  const handleResubmit = async () => {
    if (!resubmitText.trim()) { alert('답안을 작성해주세요.'); return }
    try {
      await resubmit.mutateAsync({ submission_id: submission.id, resubmitted_text: resubmitText })
      alert('✅ 재제출 완료!\n선생님 최종 피드백을 기다려주세요.')
      setIsResubmitting(false); setResubmitText('')
    } catch (e: any) { alert(`재제출 실패: ${e.message}`) }
  }

  const status = submission.status

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-[12px] font-semibold text-ink-secondary hover:text-ink transition-colors">← 목록으로</button>
          <div className="w-px h-4 bg-line" />
          <div>
            <div className="text-[12px] text-ink-secondary font-semibold">{isSchool ? '우리 학교' : '학원 수행평가'} · {question.subject} · {question.type}{ratio ? ` (배점 ${ratio}%)` : ''}</div>
          </div>
        </div>
        <span className="px-3 py-1.5 rounded-lg text-[12px] font-bold border"
          style={{
            background: status === 'pending' || status === 'analyzed' ? '#FEF3C7' : status === 'first_done' ? '#ECFDF5' : status === 'completed' ? '#D1FAE5' : '#FED7AA',
            color: status === 'pending' || status === 'analyzed' ? '#92400E' : '#065F46',
            borderColor: status === 'pending' || status === 'analyzed' ? '#FCD34D' : '#6EE7B7'
          }}>
          {status === 'pending' ? '⏳ 피드백 대기 중' : status === 'analyzed' ? '⏳ 선생님이 검토 중' : status === 'first_done' ? '📩 1차 피드백 받음' : status === 'resubmitted' ? '🔄 재제출 완료' : '✓ 최종 완료'}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
          <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">출제 문제</div>
          <div className="text-[13px] font-medium text-ink leading-[1.7]">{question.content}</div>
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
              {feedback.teacher_first_at && <span className="ml-auto text-[10px] text-ink-muted">{new Date(feedback.teacher_first_at).toLocaleDateString('ko-KR')}</span>}
            </div>
            <div className="p-4 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap bg-amber-50/50">{feedback.teacher_first_feedback}</div>
            {!submission.resubmitted_text && (
              <div className="p-4 border-t border-line bg-white">
                {!isResubmitting ? (
                  <button onClick={() => { setIsResubmitting(true); setResubmitText(submission.answer_text || studentAnswerDisplay || '') }}
                    className="w-full h-10 bg-brand-high hover:bg-brand-high-dark text-white text-[13px] font-bold rounded-lg transition-all hover:-translate-y-px">
                    🔄 피드백 반영해서 2차 제출하기
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] font-bold text-ink">📝 수정한 답안</label>
                      <span className="text-[10px] text-ink-muted">{resubmitText.length}자</span>
                    </div>
                    <textarea value={resubmitText} onChange={e => setResubmitText(e.target.value)} rows={10}
                      placeholder="선생님 피드백을 반영해서 답안을 다시 작성해주세요"
                      className="w-full px-3 py-2.5 text-[13px] border border-line rounded-lg focus:outline-none focus:border-brand-high focus:ring-2 focus:ring-brand-high/10 transition-all leading-[1.7] resize-y" />
                    <div className="flex gap-2">
                      <button onClick={() => { setIsResubmitting(false); setResubmitText('') }} className="flex-1 h-10 bg-white border border-line text-[12px] font-semibold text-ink-secondary rounded-lg hover:bg-gray-50 transition-all">취소</button>
                      <button onClick={handleResubmit} disabled={!resubmitText.trim() || resubmit.isPending}
                        className="flex-1 h-10 bg-brand-high hover:bg-brand-high-dark text-white text-[12px] font-semibold rounded-lg transition-all disabled:opacity-50">
                        {resubmit.isPending ? '제출 중...' : '2차 제출'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="bg-white border border-line rounded-xl px-4 py-8 text-center text-ink-muted text-[12px]"><div className="text-2xl mb-2">⏳</div>불러오는 중...</div>
        ) : (
          <div className="bg-brand-high-pale border border-brand-high-light rounded-xl px-4 py-6 text-center">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-[13px] font-bold text-brand-high-dark mb-1">선생님 피드백을 기다리는 중이에요</div>
            <div className="text-[11px] text-ink-secondary">선생님이 답안을 검토하고 피드백을 전달해드릴 거예요.</div>
          </div>
        )}

        {submission.resubmitted_text && (
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-orange-50 border-b border-line flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-white bg-orange-500 px-2 py-0.5 rounded-full">Step 3</span>
              <span className="text-[12px] font-bold text-ink">📝 내 재제출 답안</span>
              {submission.resubmitted_at && <span className="ml-auto text-[10px] text-ink-muted">{new Date(submission.resubmitted_at).toLocaleDateString('ko-KR')}</span>}
            </div>
            <div className="p-4 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
              {submission.resubmitted_text?.split('\n').map(line => {
                const match = line.match(/^\[(\w+)\]$/)
                if (match) return `[${SECTION_LABEL_MAP[match[1]] || match[1]}]`
                return line
              }).join('\n')}
            </div>
          </div>
        )}

        {feedback?.teacher_final_feedback && (
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-gradient-to-r from-brand-high-pale to-blue-50 border-b border-line flex items-center gap-2">
              <span className="text-[10px] font-extrabold text-white bg-brand-high px-2 py-0.5 rounded-full">최종</span>
              <span className="text-[12px] font-bold text-ink">🎉 선생님 최종 피드백</span>
              {feedback.teacher_final_at && <span className="ml-auto text-[10px] text-ink-muted">{new Date(feedback.teacher_final_at).toLocaleDateString('ko-KR')}</span>}
            </div>
            <div className="p-4 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap bg-brand-high-pale/50">{feedback.teacher_final_feedback}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function HighSuhaeng() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const studentId = student?.id ? String(student.id) : undefined
  const academyId = academy?.academyId ? String(academy.academyId) : undefined
  const grade = (student as any)?.grade ?? undefined

  const [mode, setMode] = useState<'list' | 'practice' | 'feedback'>('list')
  const [selectedSemester, setSelectedSemester] = useState<'1' | '2'>('1')
  const [selectedQuestion, setSelectedQuestion] = useState<HighAcademySuhaengQuestion | null>(null)
  const [feedbackData, setFeedbackData] = useState<{ submission: HighSuhaengSubmission; question: HighAcademySuhaengQuestion } | null>(null)
  const [showAllModal, setShowAllModal] = useState(false)
  const [modalGrade, setModalGrade] = useState(grade || '고1')

  const submitAnswer = useSubmitHighAnswer()
  const { data: mySubmissions = [] } = useMyHighSubmissions(studentId)
  const { data: questions = [], isLoading } = useMyHighAcademyQuestions(studentId, academyId, grade)

  // ===== 우리 학교 수행평가 (school_suhaeng DB 연결) =====
  const { data: studentSchool } = useHighStudentSchool(studentId)
  const schoolId = studentSchool?.school_id ?? undefined
  const gradeNum = grade ? String(grade).replace(/[^0-9]/g, '') : undefined
  const { data: schoolSuhaengRows = [] } = useHighSchoolSuhaeng(schoolId, gradeNum, selectedSemester)
  const { data: mySchool } = useHighSchool(schoolId)
  const myGradeSuhaeng = schoolSuhaengRows.map((r: any) => ({
    id: r.id,
    grade: grade,
    semester: r.semester ? `${r.semester}학기` : '',
    subject: r.subject,
    type: r.eval_type || '수행평가',
    title: r.task_title,
    content: r.question_content || r.core_concept || r.task_title || '',
    coreConcept: r.core_concept || '',
    unitTopic: r.unit_topic || '',
    ratio: r.score ?? 0,
    dueIn: 0,
    urgent: false,
    scheduledAt: r.eval_period || '',
    minChars: r.min_chars || null,
    maxChars: r.max_chars || null,
  }))
  // =====================================================

  const getSubmission = (questionId: string) => mySubmissions.find(s => s.question_id === questionId)

  const startPractice = (q: any) => {
    const isSchool = !!q._isSchool
    const submitted = isSchool
      ? mySubmissions.find(s => (s as any).question_key === `school-${q.id}`)
      : mySubmissions.find(s => s.question_id === q.id)
    if (submitted) { setFeedbackData({ submission: submitted, question: q }); setMode('feedback'); return }
    setSelectedQuestion(q); setMode('practice')
  }

  const backToList = () => { setMode('list'); setSelectedQuestion(null); setFeedbackData(null) }

  const handleSubmit = async (answerData: any) => {
    if (!studentId || !academyId || !selectedQuestion) { alert('로그인 정보를 불러오지 못했어요.'); return }
    try {
      const isSchool = !!(selectedQuestion as any)._isSchool
      await submitAnswer.mutateAsync({
        ...(isSchool ? { question_key: `school-${selectedQuestion.id}` } : { question_id: selectedQuestion.id }),
        student_id: studentId, academy_id: academyId, ...answerData,
      })
      alert('✅ 제출 완료!\n선생님 피드백을 기다려주세요.')
      backToList()
    } catch (error: any) { alert(`제출 실패: ${error.message || '알 수 없는 오류'}`) }
  }

  if (mode === 'feedback' && feedbackData) {
    return <FeedbackView submission={feedbackData.submission} question={feedbackData.question} onBack={backToList} />
  }

  if (mode === 'practice' && selectedQuestion) {
    const q = selectedQuestion
    const submitting = submitAnswer.isPending
    if (q.type === '글쓰기·논술') return <EssayPractice q={q} onBack={backToList} onSubmit={handleSubmit} submitting={submitting} />
    if (q.type === '탐구보고서') return <SectionPractice q={q} onBack={backToList} onSubmit={handleSubmit} submitting={submitting} icon="🔬" label="탐구 보고서" />
    if (q.type === '독서기록') return <SectionPractice q={q} onBack={backToList} onSubmit={handleSubmit} submitting={submitting} icon="📚" label="독서 기록" />
    if (q.type === '발표·토론') return <PresentationPractice q={q} onBack={backToList} onSubmit={handleSubmit} submitting={submitting} studentId={studentId} />
    if (q.type === '프로젝트·산출물') return <SectionPractice q={q} onBack={backToList} onSubmit={handleSubmit} submitting={submitting} icon="🛠️" label="프로젝트 산출물" />
    if (q.type === '실험·실습') return <ExperimentPractice q={q} onBack={backToList} onSubmit={handleSubmit} submitting={submitting} studentId={studentId} />
    // 그 외 eval_type(서술·논술, 프로젝트, 포트폴리오 등)은 기본 논술형으로 처리
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
          {mySubmissions.length > 0 && (
            <div className="bg-blue-50 text-blue-700 text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-blue-200">📤 제출한 답안 {mySubmissions.length}건</div>
          )}
          <div className="bg-brand-high-pale text-brand-high-dark text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-brand-high-light">다가오는 수행평가 {myGradeSuhaeng.length}건</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 min-h-0">
        <div className="bg-amber-50 border border-amber-200 rounded-xl shadow-[0_4px_16px_rgba(245,158,11,0.08)] flex-shrink-0">
          <div className="px-4 py-3 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-[14px] font-extrabold text-amber-900 tracking-tight">🏫 우리 학교 수행평가</div>
                <div className="text-[11px] text-amber-700 mt-0.5">{mySchool?.name || '우리 학교'} · {grade} · 2026학년도 {selectedSemester}학기 평가 계획</div>
              </div>
              {/* 학기 전환 버튼 (1학기 / 2학기) */}
              <div className="flex gap-0.5 bg-amber-100 rounded-lg p-0.5">
                {(['1', '2'] as const).map((sem) => (
                  <button key={sem} onClick={() => setSelectedSemester(sem)}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${selectedSemester === sem ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700 hover:text-amber-900'}`}>
                    {sem}학기
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setShowAllModal(true)} className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 transition-colors">전체 보기 ›</button>
          </div>
          {myGradeSuhaeng.length === 0 ? (
            <div className="px-4 py-10 text-center text-amber-700 text-[12px]">
              <div className="text-3xl mb-2">📅</div>
              <div className="font-medium">{selectedSemester}학기에 등록된 우리 학교 수행평가가 없어요</div>
            </div>
          ) : (
          <div className="grid grid-cols-3 gap-2.5 p-3">
            {myGradeSuhaeng.map((t: any) => {
              const schoolSubmitted = mySubmissions.find(s => (s as any).question_key === `school-${t.id}`)
              return (
                <div key={t.id}
                  onClick={() => { setSelectedQuestion({ ...t, _isSchool: true, id: t.id, academy_id: '', teacher_id: null, is_active: true, is_draft: false, eval_criteria: null, min_chars: t.minChars || null, max_chars: t.maxChars || null, created_at: '', updated_at: '' }); setMode('practice') }}
                  className={`relative rounded-lg border px-3 py-2.5 cursor-pointer transition-all hover:-translate-y-px ${
                    schoolSubmitted ? 'bg-blue-50 border-blue-200 hover:shadow-sm' :
                    t.urgent ? 'bg-red-50 border-red-200 hover:shadow-[0_4px_16px_rgba(239,68,68,0.15)]' :
                    'bg-white border-amber-200 hover:border-amber-400 hover:shadow-sm'
                  }`}>
                  {schoolSubmitted && <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full">✓ 제출됨</div>}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">{t.subject}</span>
                    <span className="text-[10px] font-semibold text-amber-700">{t.type}</span>
                  </div>
                  <div className="text-[12px] font-bold text-amber-900 leading-tight mb-2 line-clamp-2 min-h-[30px]">{t.title}</div>
                  <div className="flex items-center justify-between text-[10px] pt-2 border-t border-amber-200">
                    <span className="text-amber-600">배점 {t.ratio}점</span>
                    <span className="font-bold text-amber-700">{schoolSubmitted ? '제출 완료 ✓' : '바로 시작 →'}</span>
                  </div>
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
          {isLoading ? (
            <div className="px-4 py-10 text-center text-ink-muted text-[12px]"><div className="text-2xl mb-2">⏳</div>불러오는 중...</div>
          ) : questions.length === 0 ? (
            <div className="px-4 py-10 text-center text-ink-muted text-[12px]">
              <div className="text-3xl mb-2">📋</div>
              <div className="font-medium">아직 출제된 문제가 없어요</div>
              <div className="mt-1 text-[11px]">선생님이 문제를 만들면 여기서 확인할 수 있어요</div>
            </div>
          ) : (
            <div className="p-3 grid grid-cols-3 gap-2.5">
              {questions.map(q => {
                const submitted = getSubmission(q.id)
                return (
                  <div key={q.id} onClick={() => startPractice(q)}
                    className={`relative rounded-xl border px-4 py-3.5 cursor-pointer transition-all hover:-translate-y-px ${submitted ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-line hover:border-brand-high-light hover:shadow-sm'}`}>
                    {submitted && <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full">✓ 제출됨</div>}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xl">{TYPE_ICON[q.type] || '📝'}</span>
                      <div>
                        <span className="text-[10px] font-bold text-ink-secondary bg-white border border-line px-1.5 py-0.5 rounded mr-1">{q.subject}</span>
                        <span className="text-[10px] font-semibold text-brand-high-dark">{q.type}</span>
                      </div>
                    </div>
                    <div className="text-[13px] font-bold text-ink leading-tight mb-2 line-clamp-2">{q.title}</div>
                    <div className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed mb-2">{q.content}</div>
                    <div className="flex items-center justify-between text-[10px] pt-2 border-t border-line">
                      <span className="text-ink-muted">{q.grade}{(q as any).semester ? ` · ${(q as any).semester}` : ''}</span>
                      <span className="font-bold text-brand-high-dark">{submitted ? '제출 완료 ✓' : '시작하기 →'}</span>
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
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[720px] max-h-[80vh] flex flex-col shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <div>
                <div className="text-[16px] font-extrabold text-ink tracking-tight">🏫 우리 학교 수행평가 전체</div>
                <div className="text-[11px] text-ink-muted mt-0.5">{mySchool?.name || '우리 학교'} · {grade} · 2026학년도 {selectedSemester}학기 ({myGradeSuhaeng.length}건)</div>
              </div>
              <button onClick={() => setShowAllModal(false)} className="text-ink-muted hover:text-ink text-xl transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {myGradeSuhaeng.length === 0 ? (
                <div className="text-center py-10 text-ink-muted text-[12px]"><div className="text-3xl mb-2">📅</div>수행평가 정보가 없어요</div>
              ) : (
                <div className="space-y-2">
                  {myGradeSuhaeng.map((s: any) => (
                    <div key={s.id} className="border border-line rounded-lg p-3 hover:border-brand-high-light hover:bg-brand-high-pale/20 cursor-pointer transition-all"
                      onClick={() => { setShowAllModal(false); setSelectedQuestion({ ...s, _isSchool: true, id: s.id, academy_id: '', teacher_id: null, is_active: true, is_draft: false, eval_criteria: null, min_chars: s.minChars || null, max_chars: s.maxChars || null, created_at: '', updated_at: '' }); setMode('practice') }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-ink-secondary bg-white border border-line px-1.5 py-0.5 rounded">{s.subject}</span>
                        <span className="text-[10px] font-semibold text-brand-high-dark">{s.type}</span>
                        <span className="text-[10px] text-ink-muted">· 배점 {s.ratio}점</span>
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