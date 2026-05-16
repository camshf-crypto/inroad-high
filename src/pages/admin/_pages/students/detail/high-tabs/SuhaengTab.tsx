// src/pages/admin/_pages/students/detail/high-tabs/HighSuhaengTab.tsx

import { useState, useEffect, useMemo } from 'react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import {
  useStudentHighSuhaengSubmissions,
  useHighSubmissionFeedback,
  useSaveHighAiAnalysis,
  useSaveHighFirstFeedback,
  useSaveHighFinalFeedback,
} from '@/pages/admin/_hooks/useStudentHighSuhaeng'

const THEME = {
  accent: '#2563EB', accentDark: '#1E3A8A', accentBg: '#EFF6FF',
  accentBorder: '#93C5FD', accentLight: '#DBEAFE', accentShadow: 'rgba(37,99,235,0.15)',
}

const STEP_LABELS = ['학생 답안', 'AI 분석', '1차 피드백', '재제출 → 최종']

const TYPE_ICON: Record<string, string> = {
  '탐구보고서': '🔬', '독서기록': '📚', '발표·토론': '🎤',
  '프로젝트·산출물': '🛠️', '실험·실습': '🧪', '글쓰기·논술': '✏️',
}

const EVAL_CRITERIA_DEFAULT: Record<string, { name: string; max: number; standard: number }[]> = {
  '글쓰기·논술': [
    { name: '논제 이해', max: 100, standard: 80 }, { name: '논리성', max: 100, standard: 85 },
    { name: '비판적사고', max: 100, standard: 75 }, { name: '표현력', max: 100, standard: 70 },
  ],
  '탐구보고서': [
    { name: '주제설정', max: 100, standard: 80 }, { name: '자료수집', max: 100, standard: 75 },
    { name: '분석깊이', max: 100, standard: 80 }, { name: '결론', max: 100, standard: 75 },
  ],
  '독서기록': [
    { name: '내용이해', max: 100, standard: 85 }, { name: '비판적독해', max: 100, standard: 80 },
    { name: '진로연계', max: 100, standard: 75 }, { name: '표현력', max: 100, standard: 70 },
  ],
  '발표·토론': [
    { name: '입장명확성', max: 100, standard: 85 }, { name: '근거품질', max: 100, standard: 80 },
    { name: '반론대응', max: 100, standard: 75 }, { name: '전달력', max: 100, standard: 70 },
  ],
  '프로젝트·산출물': [
    { name: '문제정의', max: 100, standard: 80 }, { name: '실행과정', max: 100, standard: 75 },
    { name: '창의성', max: 100, standard: 80 }, { name: '성찰', max: 100, standard: 70 },
  ],
  '실험·실습': [
    { name: '가설설정', max: 100, standard: 80 }, { name: '변인통제', max: 100, standard: 85 },
    { name: '데이터분석', max: 100, standard: 75 }, { name: '오차분석', max: 100, standard: 70 },
  ],
}

// 우리 학교 수행평가 목업 데이터 (question_key → 제목/유형 매핑용)
const MY_SCHOOL_SUHAENG_MAP: Record<string, { title: string; type: string; subject: string; content: string }> = {
  'school-h1-1': { title: '현대 사회에서 독서의 의미', type: '글쓰기·논술', subject: '국어', content: '디지털 시대에 독서의 중요성이 감소하고 있다는 주장에 대해 자신의 견해를 논술하시오.' },
  'school-h1-2': { title: '생태계 내 먹이 사슬 탐구', type: '탐구보고서', subject: '통합과학', content: '주변 생태계의 먹이 사슬을 조사하고, 특정 생물 개체수 변화가 생태계에 미치는 영향을 분석하는 탐구 보고서를 작성하시오.' },
  'school-h1-3': { title: '기후 위기 대응 방안 토론', type: '발표·토론', subject: '통합사회', content: '기후 위기 해결을 위한 개인적 실천과 국가적 정책 중 어느 것이 더 효과적인지 토론하시오.' },
  'school-h1-4': { title: '통계로 보는 우리 학교', type: '프로젝트·산출물', subject: '수학', content: '학교 생활과 관련된 주제를 선정하여 설문 조사를 실시하고, 통계 자료를 분석하여 결과물을 제작하시오.' },
  'school-h1-5': { title: '산과 염기 반응 실험', type: '실험·실습', subject: '통합과학', content: '다양한 산과 염기 용액을 이용하여 중화 반응 실험을 수행하고, 결과를 분석하여 보고서를 작성하시오.' },
  'school-h1-6': { title: 'English Novel Reading Report', type: '독서기록', subject: '영어', content: '제시된 영어 소설을 읽고 주요 내용 요약, 인상 깊은 구절, 나의 생각을 영어로 작성하시오.' },
  'school-h2-1': { title: '현대시 감상 및 비평문 쓰기', type: '글쓰기·논술', subject: '문학', content: '제시된 현대시 작품을 감상하고, 작품의 주제와 표현 기법을 분석하여 비평문을 작성하시오.' },
  'school-h2-2': { title: '효소의 작용과 환경 요인 탐구', type: '탐구보고서', subject: '생명과학Ⅰ', content: '온도와 pH가 효소 활성에 미치는 영향을 실험을 통해 탐구하고 보고서를 작성하시오.' },
  'school-h2-3': { title: '사회 불평등 해소 방안 발표', type: '발표·토론', subject: '사회문화', content: '우리 사회의 불평등 문제를 분석하고, 해소 방안을 제시하는 발표를 준비하시오.' },
  'school-h2-4': { title: '미분을 활용한 최적화 문제 탐구', type: '프로젝트·산출물', subject: '수학Ⅱ', content: '실생활에서 미분을 활용한 최적화 문제를 찾아 수학적으로 해결하는 과정을 보고서로 작성하시오.' },
  'school-h2-5': { title: '화학 반응 속도 측정 실험', type: '실험·실습', subject: '화학Ⅰ', content: '농도와 온도가 화학 반응 속도에 미치는 영향을 실험으로 확인하고 결과를 분석하시오.' },
  'school-h2-6': { title: '고전 산문 읽기와 독서 기록', type: '독서기록', subject: '독서', content: '제시된 고전 산문을 읽고 내용 요약, 핵심 주제, 현대적 의미를 중심으로 독서 기록을 작성하시오.' },
  'school-h3-1': { title: '대학 입시와 공정성 논술', type: '글쓰기·논술', subject: '화법과작문', content: '현행 대학 입시 제도의 공정성에 대해 자신의 입장을 정하고, 구체적 근거를 들어 논술하시오.' },
  'school-h3-2': { title: '유전자 발현 조절 메커니즘 탐구', type: '탐구보고서', subject: '생명과학Ⅱ', content: '원핵생물과 진핵생물의 유전자 발현 조절 방식을 비교·분석하는 탐구 보고서를 작성하시오.' },
  'school-h3-3': { title: '헌법 가치와 기본권 제한 토론', type: '발표·토론', subject: '정치와법', content: '공공의 이익을 위한 기본권 제한의 정당성에 대해 찬반 입장을 정해 토론하시오.' },
  'school-h3-4': { title: '국내외 경제 지표 분석 보고서', type: '프로젝트·산출물', subject: '경제', content: '최근 3년간의 주요 경제 지표를 분석하고 시사점을 도출하는 보고서를 작성하시오.' },
  'school-h3-5': { title: '전자기 유도 실험 및 분석', type: '실험·실습', subject: '물리학Ⅱ', content: '패러데이 법칙을 검증하는 실험을 설계·수행하고, 측정 데이터를 분석하여 보고서를 작성하시오.' },
  'school-h3-6': { title: '동서양 고전 비교 독서', type: '독서기록', subject: '고전읽기', content: '동양 고전과 서양 고전 각 1권씩 읽고, 두 작품의 인간관·세계관을 비교하는 독서 기록을 작성하시오.' },
}

function getHighFunctionName(type: string): string | null {
  switch (type) {
    case '글쓰기·논술': return 'ai-suhaeng-essay'
    case '탐구보고서': return 'ai-suhaeng-research'
    case '독서기록': return 'ai-suhaeng-reading'
    case '발표·토론': return 'ai-suhaeng-presentation'
    case '프로젝트·산출물': return 'ai-suhaeng-project'
    case '실험·실습': return 'ai-suhaeng-experiment'
    default: return null
  }
}

type CategoryTab = 'school' | 'academy'
type SubmissionStatus = 'pending' | 'analyzed' | 'first_done' | 'resubmitted' | 'completed'

interface ScoreSection { label: string; score: number; max: number; desc: string }
interface ComparisonAnalysis {
  isComparison: true
  improvedPoints: string[]
  remainingIssues: string[]
  comparisonSummary: string
  teacherDraft: string
}
interface AiAnalysis {
  evalCriteria: string
  studentScores: number[]
  scores: ScoreSection[]
  summary: string
  strengths: string[]
  improvements: string[]
  totalScore: number
  maxScore: number
  second: ComparisonAnalysis | null
  teacherDraft?: string
}

interface Submission {
  id: string
  questionId: string | null
  questionKey: string | null
  type: string
  subject: string
  title: string
  content: string
  grade: string
  minChars: number | null
  maxChars: number | null
  evalCriteria: { name: string; score: number }[] | null
  studentAnswer: string
  audioUrl: string | null
  videoUrl: string | null
  photoUrls: string[] | null
  submittedAt: string
  status: SubmissionStatus
  aiAnalysis: AiAnalysis | null
  teacherFirstFeedback: string
  studentResubmission: string
  teacherFinalFeedback: string
  isSchool: boolean
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

function dbToSubmission(db: any, fb: any | null): Submission {
  const q = db.high_suhaeng_questions

  // 우리 학교 수행평가는 question_key로 매핑
  const schoolInfo = db.question_key ? MY_SCHOOL_SUHAENG_MAP[db.question_key] : null

  let studentAnswer = ''
  if (db.answer_text) {
    studentAnswer = db.answer_text
  } else if (db.answer_sections) {
    studentAnswer = Object.entries(db.answer_sections as Record<string, string>)
      .map(([k, v]) => `[${SECTION_LABEL_MAP[k] || k}]\n${v}`)
      .join('\n\n')
  }

  return {
    id: db.id,
    questionId: db.question_id ?? null,
    questionKey: db.question_key ?? null,
    type: q?.type || schoolInfo?.type || '글쓰기·논술',
    subject: q?.subject || schoolInfo?.subject || '',
    title: q?.title || schoolInfo?.title || (db.question_key ? '우리 학교 수행평가' : ''),
    content: q?.content || schoolInfo?.content || (db.question_key ? '우리 학교 수행평가 답안입니다.' : ''),
    grade: q?.grade || '',
    minChars: q?.min_chars ?? null,
    maxChars: q?.max_chars ?? null,
    evalCriteria: q?.eval_criteria ?? null,
    studentAnswer,
    audioUrl: db.answer_audio_url ?? null,
    videoUrl: db.answer_video_url ?? null,
    photoUrls: db.answer_photo_urls ?? null,
    submittedAt: db.submitted_at
      ? new Date(db.submitted_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      : '',
    status: db.status || 'pending',
    aiAnalysis: fb?.ai_analysis ?? null,
    teacherFirstFeedback: fb?.teacher_first_feedback || '',
    studentResubmission: db.resubmitted_text || '',
    teacherFinalFeedback: fb?.teacher_final_feedback || '',
    isSchool: !!db.question_key,
  }
}

function getStatusInfo(status: SubmissionStatus) {
  if (status === 'pending' || status === 'analyzed') return { label: '⏳ 피드백 대기', bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' }
  if (status === 'first_done') return { label: '📩 1차 피드백', bg: THEME.accentBg, color: THEME.accentDark, border: THEME.accentBorder }
  if (status === 'resubmitted') return { label: '🔄 재제출됨', bg: '#FED7AA', color: '#9A3412', border: '#FB923C' }
  return { label: '✓ 완료', bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' }
}

function getStep(sub: Submission | null) {
  if (!sub) return 0
  if (sub.status === 'pending') return 1
  if (sub.status === 'analyzed') return 2
  if (sub.status === 'first_done') return 3
  if (sub.status === 'resubmitted' || sub.status === 'completed') return 4
  return 0
}

export default function HighSuhaengTab({ student }: { student: any }) {
  const studentId = student?.id ? String(student.id) : undefined
  const { data: dbSubmissions = [], isLoading } = useStudentHighSuhaengSubmissions(studentId)

  const [categoryTab, setCategoryTab] = useState<CategoryTab>('school')
  const [selSubId, setSelSubId] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [firstFbText, setFirstFbText] = useState('')
  const [finalFbText, setFinalFbText] = useState('')
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [aiTab, setAiTab] = useState<'first' | 'second'>('first')
  const [secondAiLoading, setSecondAiLoading] = useState(false)
  const [draftLoading, setDraftLoading] = useState(false)
  const [localAiAnalysis, setLocalAiAnalysis] = useState<Map<string, AiAnalysis>>(new Map())

  const { data: selFeedback } = useHighSubmissionFeedback(selSubId ?? undefined)
  const saveAi = useSaveHighAiAnalysis()
  const saveFirst = useSaveHighFirstFeedback()
  const saveFinal = useSaveHighFinalFeedback()

  const submissions: Submission[] = useMemo(() => {
    return dbSubmissions.map((db: any) => {
      const fb = db.id === selSubId ? selFeedback : null
      const sub = dbToSubmission(db, fb)
      const local = localAiAnalysis.get(db.id)
      if (local && !sub.aiAnalysis) sub.aiAnalysis = local
      if (local?.second && sub.aiAnalysis && !sub.aiAnalysis.second) {
        sub.aiAnalysis = { ...sub.aiAnalysis, second: local.second }
      }
      return sub
    })
  }, [dbSubmissions, selSubId, selFeedback, localAiAnalysis])

  const schoolSubs = useMemo(() => submissions.filter(s => s.isSchool), [submissions])
  const academySubs = useMemo(() => submissions.filter(s => !s.isSchool), [submissions])
  const filteredSubs = categoryTab === 'school' ? schoolSubs : academySubs

  useEffect(() => {
    if (filteredSubs.length > 0) {
      const first = filteredSubs[0]
      setSelSubId(first.id)
      setFirstFbText(first.teacherFirstFeedback || '')
      setFinalFbText(first.teacherFinalFeedback || '')
      setShowAiPanel(false)
    } else {
      setSelSubId(null)
    }
  }, [categoryTab])

  const selSub = submissions.find(s => s.id === selSubId) ?? null

  const handleSelect = (sub: Submission) => {
    setSelSubId(sub.id)
    setFirstFbText(sub.teacherFirstFeedback || '')
    setFinalFbText(sub.teacherFinalFeedback || '')
    setShowAiPanel(false)
    setAiTab('first')
  }

  const runAiAnalysis = async () => {
    if (!selSub) return
    const fnName = getHighFunctionName(selSub.type)
    if (!fnName) { alert(`${selSub.type} 유형의 AI 분석은 준비 중이에요.`); return }
    if (!selSub.studentAnswer || selSub.studentAnswer.length < 10) { alert('학생 답안이 너무 짧거나 없어요.'); return }
    setAnalyzing(true); setShowAiPanel(true); setAiTab('first')
    try {
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: {
          questionTitle: selSub.title,
          questionContent: selSub.content,
          questionSubject: selSub.subject,
          minChars: selSub.minChars,
          maxChars: selSub.maxChars,
          answerText: selSub.studentAnswer,
          grade: student?.grade,
          studentName: student?.name,
          evalCriteria: selSub.evalCriteria,
        },
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'AI 분석 실패')
      const analysis: AiAnalysis = data.analysis
      setLocalAiAnalysis(prev => { const next = new Map(prev); next.set(selSub.id, analysis); return next })
      try { await saveAi.mutateAsync({ submission_id: selSub.id, ai_analysis: analysis }) } catch (e) { console.error('AI 분석 저장 실패:', e) }
    } catch (e: any) {
      alert(`AI 분석 실패: ${e?.message || '알 수 없는 오류'}`)
    } finally { setAnalyzing(false) }
  }

  const runSecondAnalysis = async () => {
    if (!selSub) return
    if (!selSub.studentResubmission || selSub.studentResubmission.length < 10) { alert('학생 재제출 답안이 너무 짧거나 없어요.'); return }
    const fnName = getHighFunctionName(selSub.type)
    if (!fnName) return
    setSecondAiLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: {
          questionTitle: selSub.title,
          questionContent: selSub.content,
          questionSubject: selSub.subject,
          answerText: selSub.studentResubmission,
          grade: student?.grade,
          studentName: student?.name,
          evalCriteria: selSub.evalCriteria,
          previousAnswer: selSub.studentAnswer || '',
          previousFeedback: selSub.teacherFirstFeedback || '',
        },
      })
      if (error) throw error
      if (!data?.success) throw new Error(data?.error || '2차 분석 실패')
      const comparison: ComparisonAnalysis = data.analysis
      setLocalAiAnalysis(prev => {
        const next = new Map(prev)
        const existing = next.get(selSub.id) || selSub.aiAnalysis
        if (existing) next.set(selSub.id, { ...existing, second: comparison })
        return next
      })
    } catch (e: any) {
      alert(`2차 분석 실패: ${e?.message || '알 수 없는 오류'}`)
    } finally { setSecondAiLoading(false) }
  }

  const togglePanel = (tab: 'first' | 'second' = 'first') => {
    if (showAiPanel && aiTab === tab) { setShowAiPanel(false); return }
    setShowAiPanel(true); setAiTab(tab)
    if (tab === 'second' && selSub?.studentResubmission && selSub?.aiAnalysis && !selSub.aiAnalysis.second && !secondAiLoading) {
      runSecondAnalysis()
    }
  }

  const generateTeacherDraft = () => {
    if (!selSub?.aiAnalysis) return
    setDraftLoading(true)
    setTimeout(() => {
      if (aiTab === 'first') {
        const draft = selSub.aiAnalysis?.teacherDraft || ''
        if (!draft) { alert('AI 작성 피드백이 없어요. AI 분석을 먼저 다시 시도해주세요.'); setDraftLoading(false); return }
        setFirstFbText(draft)
        alert('✏️ AI가 1차 피드백을 작성했어요!\n\nStep 3에서 확인하고 수정 후 전달해주세요.')
      } else {
        const draft = selSub.aiAnalysis?.second?.teacherDraft || ''
        if (!draft) { alert('AI 작성 피드백이 없어요. 2차 AI 분석을 먼저 시도해주세요.'); setDraftLoading(false); return }
        setFinalFbText(draft)
        alert('✏️ AI가 최종 피드백을 작성했어요!\n\nStep 4에서 확인하고 수정 후 전달해주세요.')
      }
      setDraftLoading(false)
    }, 300)
  }

  const sendFirstFeedback = async () => {
    if (!firstFbText.trim() || !selSub) return
    try {
      await saveFirst.mutateAsync({ submission_id: selSub.id, teacher_first_feedback: firstFbText })
      alert('✅ 1차 피드백이 학생에게 전달되었어요!')
    } catch (e: any) { alert(`저장 실패: ${e.message}`) }
  }

  const sendFinalFeedback = async () => {
    if (!finalFbText.trim() || !selSub) return
    try {
      await saveFinal.mutateAsync({ submission_id: selSub.id, teacher_final_feedback: finalFbText })
      alert('✅ 최종 피드백이 학생에게 전달되었어요!')
    } catch (e: any) { alert(`저장 실패: ${e.message}`) }
  }

  const getRadarData = () => {
    if (!selSub) return []
    const criteria = selSub.evalCriteria && selSub.evalCriteria.length > 0
      ? selSub.evalCriteria.map(c => ({ name: c.name, max: 100, standard: 80 }))
      : (EVAL_CRITERIA_DEFAULT[selSub.type] || [])
    const scores = selSub.aiAnalysis?.studentScores || criteria.map(() => 0)
    return criteria.map((c, i) => ({ subject: c.name, standard: c.standard, student: scores[i] || 0, fullMark: 100 }))
  }

  const getBarData = () => {
    if (!selSub?.aiAnalysis) return []
    return selSub.aiAnalysis.scores.map(s => ({ name: s.label, score: s.score, max: s.max, pct: Math.round((s.score / s.max) * 100) }))
  }

  const rawSecond = selSub?.aiAnalysis?.second
  const secondData = rawSecond ? {
    improvedPoints: Array.isArray((rawSecond as any).improvedPoints) ? (rawSecond as any).improvedPoints : [],
    remainingIssues: Array.isArray((rawSecond as any).remainingIssues) ? (rawSecond as any).remainingIssues : [],
    comparisonSummary: (rawSecond as any).comparisonSummary || '',
    teacherDraft: (rawSecond as any).teacherDraft || '',
  } : null
  const secondIsValid = secondData && (secondData.improvedPoints.length > 0 || (secondData.remainingIssues?.length ?? 0) > 0 || secondData.comparisonSummary)
  const currentRoundHasAnalysis = aiTab === 'first' ? !!selSub?.aiAnalysis : !!selSub?.aiAnalysis?.second
  const currentRoundFeedbackDone = aiTab === 'first' ? !!selSub?.teacherFirstFeedback : !!selSub?.teacherFinalFeedback

  const submittedCount = submissions.length
  const pendingCount = submissions.filter(s => s.status === 'pending').length
  const completedCount = submissions.filter(s => s.status === 'completed').length

  const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }
  const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }

  return (
    <>
      <div className="flex gap-4 h-full overflow-hidden">
        {/* 좌측 사이드바 */}
        <div className="w-[300px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="px-4 py-3.5 border-b border-line flex-shrink-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[16px]">✏️</span>
              <div className="text-[15px] font-extrabold text-ink tracking-tight">수행평가</div>
            </div>
            <div className="text-[11px] font-medium text-ink-secondary">
              총 <span className="font-bold" style={{ color: THEME.accent }}>{submittedCount}건</span>
              <span className="mx-1.5 text-ink-muted">·</span>
              대기 <span className="font-bold text-amber-700">{pendingCount}건</span>
              <span className="mx-1.5 text-ink-muted">·</span>
              완료 <span className="font-bold" style={{ color: THEME.accentDark }}>{completedCount}건</span>
            </div>
          </div>

          <div className="flex border-b border-line flex-shrink-0">
            <button onClick={() => setCategoryTab('school')}
              className="flex-1 py-2.5 text-[12px] font-bold transition-all border-b-2 flex items-center justify-center"
              style={{ color: categoryTab === 'school' ? THEME.accentDark : '#9CA3AF', borderColor: categoryTab === 'school' ? THEME.accent : 'transparent', background: categoryTab === 'school' ? THEME.accentBg : 'transparent' }}>
              🏫 우리 학교
            </button>
            <button onClick={() => setCategoryTab('academy')}
              className="flex-1 py-2.5 text-[12px] font-bold transition-all border-b-2 flex items-center justify-center"
              style={{ color: categoryTab === 'academy' ? THEME.accentDark : '#9CA3AF', borderColor: categoryTab === 'academy' ? THEME.accent : 'transparent', background: categoryTab === 'academy' ? THEME.accentBg : 'transparent' }}>
              📋 학원
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {isLoading ? (
              <div className="text-center py-10 text-ink-muted text-[12px]"><div className="text-2xl mb-2">⏳</div>불러오는 중...</div>
            ) : filteredSubs.length === 0 ? (
              <div className="text-center py-10 text-ink-muted text-[12px]">
                <div className="text-3xl mb-2">📭</div>
                <div className="font-medium">{categoryTab === 'school' ? '학교 수행평가 제출이 없어요' : '학원 수행평가 제출이 없어요'}</div>
              </div>
            ) : (
              filteredSubs.map(sub => {
                const isSelected = selSubId === sub.id
                const statusInfo = getStatusInfo(sub.status)
                return (
                  <button key={sub.id} onClick={() => handleSelect(sub)}
                    className="w-full rounded-xl px-3 py-3 mb-1.5 text-left transition-all"
                    style={{ border: `1.5px solid ${isSelected ? THEME.accent : '#E5E7EB'}`, background: isSelected ? THEME.accentBg : '#fff', boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : 'none' }}>
                    <div className="flex items-start gap-2.5">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
                        style={{ background: isSelected ? '#fff' : '#F3F4F6', border: `1px solid ${isSelected ? THEME.accentBorder : '#E5E7EB'}` }}>
                        {TYPE_ICON[sub.type] || '📝'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-extrabold leading-[1.35] mb-0.5 truncate" style={{ color: isSelected ? THEME.accentDark : '#1a1a1a' }}>
                          {sub.title || sub.type}
                        </div>
                        <div className="text-[11px] font-medium text-ink-muted mb-1.5">{sub.subject} · {sub.type}</div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                            style={{ background: statusInfo.bg, color: statusInfo.color, borderColor: `${statusInfo.border}80` }}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* 메인 영역 */}
        <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] min-w-0">
          {!selSub ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
              <div className="text-4xl">✏️</div>
              <div className="text-[14px] font-bold text-ink-secondary">
                {categoryTab === 'school' ? '🏫 학교 수행평가 제출이 없어요' : '📋 학원 수행평가 제출이 없어요'}
              </div>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-line flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ color: THEME.accentDark, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>
                      {selSub.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { if (selSub.aiAnalysis) { togglePanel('first') } else { runAiAnalysis() } }}
                      disabled={analyzing}
                      className="px-4 py-2 rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px disabled:opacity-50"
                      style={{ background: showAiPanel ? THEME.accent : '#fff', color: showAiPanel ? '#fff' : THEME.accent, border: `1.5px solid ${THEME.accent}`, boxShadow: `0 2px 6px ${THEME.accentShadow}` }}>
                      {analyzing ? '분석 중...' : !selSub.aiAnalysis ? '✨ AI 분석 시작' : `✨ AI 분석 ${showAiPanel ? '닫기' : '보기'}`}
                    </button>
                    <span className="px-4 py-2 rounded-lg text-[13px] font-bold"
                      style={{ background: getStatusInfo(selSub.status).bg, color: getStatusInfo(selSub.status).color, border: `1.5px solid ${getStatusInfo(selSub.status).border}` }}>
                      {getStatusInfo(selSub.status).label}
                    </span>
                  </div>
                </div>

                <div className="flex px-8 mb-4">
                  {STEP_LABELS.map((label, i) => {
                    const step = getStep(selSub); const stepNum = i + 1
                    const isDone = stepNum < step; const isOn = stepNum === step; const active = isDone || isOn
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 relative">
                        {i < STEP_LABELS.length - 1 && (
                          <div className="absolute top-[13px] left-[55%] w-[90%] h-px" style={{ background: isDone ? THEME.accent : '#E5E7EB' }} />
                        )}
                        <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-extrabold z-10 relative border-2"
                          style={{ background: active ? THEME.accent : '#F3F4F6', color: active ? '#fff' : '#9CA3AF', borderColor: active ? THEME.accent : '#E5E7EB' }}>
                          {isDone ? '✓' : stepNum}
                        </div>
                        <div className="text-[11px] font-bold whitespace-nowrap" style={{ color: active ? THEME.accentDark : '#9CA3AF' }}>{label}</div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <div className="text-[15px] font-extrabold text-ink tracking-tight">{selSub.title}</div>
                  <div className="text-[11px] font-medium text-ink-muted mt-0.5 flex items-center gap-2">
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full">{selSub.subject}</span>
                    {selSub.grade && <span>{selSub.grade}</span>}
                    <span>· 📅 제출 {selSub.submittedAt}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
                {selSub.content && (
                  <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                    <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">📌 출제 문제</div>
                    <div className="text-[13px] font-medium text-ink leading-[1.7]">{selSub.content}</div>
                    {selSub.evalCriteria && selSub.evalCriteria.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-line flex flex-wrap gap-1">
                        {selSub.evalCriteria.map((e, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: THEME.accentBg, color: THEME.accentDark, border: `1px solid ${THEME.accentBorder}60` }}>
                            {e.name} {e.score}점
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white border border-line rounded-xl px-5 py-4">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-3">📜 답변 · 피드백 히스토리</div>
                  <div className="flex flex-col gap-3.5">
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">Step 1</span>
                        <span className="text-[11px] font-bold text-ink-secondary">👤 학생 제출 답안</span>
                        <span className="ml-auto text-[10px] text-ink-muted font-medium">{selSub.studentAnswer.length}자</span>
                      </div>
                      <div className="bg-gray-50 border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                        {selSub.studentAnswer || '(답변 없음)'}
                      </div>
                      {selSub.audioUrl && (
                        <div className="mt-2">
                          <div className="text-[11px] font-bold text-ink-secondary mb-1">🎙️ 음성 녹음</div>
                          <audio controls src={selSub.audioUrl} className="w-full h-9" />
                        </div>
                      )}
                      {selSub.photoUrls && selSub.photoUrls.length > 0 && (
                        <div className="mt-2">
                          <div className="text-[11px] font-bold text-ink-secondary mb-1">📷 첨부 사진 ({selSub.photoUrls.length}장)</div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {selSub.photoUrls.map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt={`사진 ${idx + 1}`} className="w-full aspect-square object-cover rounded-lg border border-line hover:opacity-90 transition-opacity" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <span className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full" style={{ background: THEME.accent }}>Step 3</span>
                        <span className="text-[11px] font-bold text-ink-secondary">👨‍🏫 선생님 1차 피드백</span>
                      </div>
                      {selSub.teacherFirstFeedback ? (
                        <div className="rounded-lg px-3.5 py-3 text-[13px] font-medium leading-[1.8] whitespace-pre-wrap"
                          style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60`, color: THEME.accentDark }}>
                          {selSub.teacherFirstFeedback}
                        </div>
                      ) : (
                        <>
                          <textarea value={firstFbText} onChange={e => setFirstFbText(e.target.value)}
                            placeholder={selSub.aiAnalysis ? "직접 피드백을 작성하거나, AI 분석 패널에서 '✏️ 선생님 답변 작성하기' 버튼을 활용하세요..." : "학생 답안에 대한 피드백을 작성해주세요."}
                            rows={5}
                            className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                            onFocus={handleTextareaFocus} onBlur={handleTextareaBlur} />
                          <div className="flex justify-end mt-2">
                            <button onClick={sendFirstFeedback} disabled={!firstFbText.trim()}
                              className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:opacity-50 hover:-translate-y-px"
                              style={{ background: firstFbText.trim() ? THEME.accent : '#E5E7EB', color: firstFbText.trim() ? '#fff' : '#9CA3AF', boxShadow: firstFbText.trim() ? `0 4px 12px ${THEME.accentShadow}` : 'none' }}>
                              📤 1차 피드백 전달
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {selSub.teacherFirstFeedback && (
                      <div>
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold text-white bg-gray-500 px-2 py-0.5 rounded-full">Step 4</span>
                            <span className="text-[11px] font-bold text-ink-secondary">👤 학생 재제출 답안</span>
                          </div>
                          {selSub.studentResubmission && (
                            <button onClick={() => togglePanel('second')}
                              className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all"
                              style={{ background: showAiPanel && aiTab === 'second' ? THEME.accent : '#fff', color: showAiPanel && aiTab === 'second' ? '#fff' : THEME.accent, border: `1px solid ${THEME.accent}` }}>
                              ✨ 2차 AI 분석 {showAiPanel && aiTab === 'second' ? '닫기' : '보기'}
                            </button>
                          )}
                        </div>
                        {selSub.studentResubmission ? (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3.5 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                            {selSub.studentResubmission}
                          </div>
                        ) : (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-4 text-[12px] font-medium text-amber-700 text-center">
                            ⏳ 학생이 1차 피드백을 보고 재제출 중이에요
                          </div>
                        )}
                      </div>
                    )}

                    {selSub.studentResubmission && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full" style={{ background: THEME.accent }}>최종</span>
                          <span className="text-[11px] font-bold text-ink-secondary">👨‍🏫 선생님 최종 피드백</span>
                        </div>
                        {selSub.teacherFinalFeedback ? (
                          <div className="rounded-lg px-3.5 py-3 text-[13px] font-medium leading-[1.8]"
                            style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60`, color: THEME.accentDark }}>
                            {selSub.teacherFinalFeedback}
                          </div>
                        ) : (
                          <>
                            <textarea value={finalFbText} onChange={e => setFinalFbText(e.target.value)}
                              placeholder="재제출된 답안에 대한 최종 피드백을 작성해주세요." rows={4}
                              className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                              onFocus={handleTextareaFocus} onBlur={handleTextareaBlur} />
                            <div className="flex justify-end mt-2">
                              <button onClick={sendFinalFeedback} disabled={!finalFbText.trim()}
                                className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:opacity-50 hover:-translate-y-px"
                                style={{ background: finalFbText.trim() ? THEME.accent : '#E5E7EB', color: finalFbText.trim() ? '#fff' : '#9CA3AF', boxShadow: finalFbText.trim() ? `0 4px 12px ${THEME.accentShadow}` : 'none' }}>
                                📤 최종 피드백 전달
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showAiPanel && selSub && selSub.aiAnalysis && (
        <div className="fixed top-0 right-0 bottom-0 w-[440px] bg-white border-l border-line flex flex-col shadow-[-8px_0_24px_rgba(15,23,42,0.08)] z-50">
          <div className="px-4 py-4 border-b border-line flex-shrink-0 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-extrabold text-ink tracking-tight">✨ AI 분석</div>
              <div className="text-[11px] font-medium text-ink-secondary mt-0.5">{selSub.title}</div>
            </div>
            <button onClick={() => setShowAiPanel(false)} className="text-ink-muted hover:text-ink text-base w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">✕</button>
          </div>

          <div className="flex border-b border-line flex-shrink-0">
            <button onClick={() => setAiTab('first')}
              className="flex-1 py-3 text-center text-[12px] font-bold transition-all border-b-2"
              style={{ color: aiTab === 'first' ? THEME.accentDark : '#9CA3AF', borderColor: aiTab === 'first' ? THEME.accent : 'transparent', background: aiTab === 'first' ? THEME.accentBg : 'transparent' }}>
              📊 1차 답변 분석
            </button>
            <button onClick={() => { if (selSub.studentResubmission) togglePanel('second') }}
              disabled={!selSub.studentResubmission}
              className="flex-1 py-3 text-center text-[12px] font-bold transition-all border-b-2 disabled:cursor-not-allowed"
              style={{ color: !selSub.studentResubmission ? '#D1D5DB' : aiTab === 'second' ? THEME.accentDark : '#9CA3AF', borderColor: aiTab === 'second' ? THEME.accent : 'transparent', background: aiTab === 'second' ? THEME.accentBg : 'transparent' }}>
              📈 2차 비교 분석
              {!selSub.studentResubmission && <div className="text-[9px]">재제출 필요</div>}
            </button>
          </div>

          {aiTab === 'first' && (
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              <div className="rounded-xl px-4 py-3.5" style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">✅</span>
                  <div className="text-[13px] font-extrabold" style={{ color: THEME.accentDark }}>답안 정합성 분석</div>
                </div>
                <div className="text-[11px] font-medium text-ink-secondary mb-3">답안을 {selSub.type} 평가 기준에 맞춰 분석한 결과입니다.</div>
                <div className="h-[260px] mb-2 bg-white rounded-lg p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={getRadarData()} margin={{ top: 24, right: 40, bottom: 24, left: 40 }}>
                      <PolarGrid stroke="#E5E7EB" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#374151', fontWeight: 600 }} tickLine={false} />
                      <Radar name="평가 기준" dataKey="standard" stroke="#F97316" fill="#F97316" fillOpacity={0.3} strokeWidth={2} />
                      <Radar name="학생 답안" dataKey="student" stroke={THEME.accent} fill={THEME.accent} fillOpacity={0.5} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                {getBarData().map((d, i) => (
                  <div key={i} className="mb-2.5 bg-white rounded-lg px-3 py-2">
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="font-semibold text-ink">{d.name}</span>
                      <span className="font-bold" style={{ color: THEME.accent }}>{d.score}/{d.max}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${d.pct}%`, background: d.pct >= 80 ? THEME.accent : d.pct >= 60 ? '#F97316' : '#EF4444' }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">📊</span>
                  <div className="text-[13px] font-extrabold text-ink">AI 종합 분석</div>
                </div>
                {selSub.aiAnalysis.evalCriteria && (
                  <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 mb-3 mt-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">📝 {selSub.type} 평가 기준</div>
                    <div className="text-[12px] font-medium text-ink leading-[1.7]">{selSub.aiAnalysis.evalCriteria}</div>
                  </div>
                )}
                {selSub.aiAnalysis.summary && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 mb-3">
                    <div className="text-[11px] font-bold text-orange-800 mb-1">📌 평가 요약</div>
                    <div className="text-[12px] font-medium text-orange-900 leading-[1.7]">{selSub.aiAnalysis.summary}</div>
                  </div>
                )}
                {selSub.aiAnalysis.strengths && selSub.aiAnalysis.strengths.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: THEME.accent }}>💪 강점 포인트</div>
                    {selSub.aiAnalysis.strengths.map((s, i) => (
                      <div key={i} className="text-[12px] font-medium leading-[1.6] px-3 py-2 rounded-lg mb-1.5"
                        style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}40`, color: THEME.accentDark }}>✓ {s}</div>
                    ))}
                  </div>
                )}
                {selSub.aiAnalysis.improvements && selSub.aiAnalysis.improvements.length > 0 && (
                  <div>
                    <div className="text-[11px] font-extrabold text-red-500 uppercase tracking-wider mb-2">⚡ 개선 포인트</div>
                    {selSub.aiAnalysis.improvements.map((s, i) => (
                      <div key={i} className="text-[12px] font-medium text-red-900 leading-[1.6] px-3 py-2 bg-red-50 border border-red-200 rounded-lg mb-1.5">△ {s}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {aiTab === 'second' && (
            secondAiLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-ink-muted">
                <div className="text-3xl animate-pulse">✨</div>
                <div className="text-[13px] font-medium">AI가 1차/2차 답안을 비교 중...</div>
              </div>
            ) : !secondIsValid ? (
              <div className="flex-1 flex items-center justify-center text-ink-muted text-[13px] font-medium px-4 text-center leading-[1.7]">
                재제출 답안이 있어야 2차 분석이 가능해요.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
                <div className="rounded-xl px-4 py-3.5" style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">🔄</span>
                    <div className="text-[13px] font-extrabold" style={{ color: THEME.accentDark }}>1차 → 2차 비교 요약</div>
                  </div>
                  <div className="text-[12px] font-medium text-ink leading-[1.7] bg-white rounded-lg px-3 py-2.5">{secondData?.comparisonSummary}</div>
                </div>
                <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className="text-sm">📈</span>
                    <div className="text-[13px] font-extrabold" style={{ color: THEME.accent }}>좋아진 점</div>
                  </div>
                  {secondData?.improvedPoints?.length === 0 ? (
                    <div className="text-[12px] font-medium text-ink-muted py-2">AI가 좋아진 점을 찾지 못했어요.</div>
                  ) : (
                    secondData?.improvedPoints?.map((p: string, i: number) => (
                      <div key={i} className="text-[12px] font-medium leading-[1.7] px-3 py-2 rounded-lg mb-1.5"
                        style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}40`, color: THEME.accentDark }}>▲ {p}</div>
                    ))
                  )}
                </div>
                {(secondData?.remainingIssues?.length ?? 0) > 0 && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3.5">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <span className="text-sm">⚠️</span>
                      <div className="text-[13px] font-extrabold text-amber-700">아직 보완할 점</div>
                    </div>
                    {secondData?.remainingIssues?.map((p: string, i: number) => (
                      <div key={i} className="text-[12px] font-medium leading-[1.7] px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg mb-1.5 text-amber-900">△ {p}</div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {currentRoundHasAnalysis && !currentRoundFeedbackDone && (
            <div className="px-4 py-3 border-t border-line flex-shrink-0" style={{ background: '#FAFBFC' }}>
              <button onClick={generateTeacherDraft} disabled={draftLoading}
                className="w-full py-3 text-white rounded-lg text-[13px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: draftLoading ? '#BFDBFE' : THEME.accent, boxShadow: !draftLoading ? `0 4px 12px ${THEME.accentShadow}` : 'none' }}>
                {draftLoading ? '✨ AI가 답변 작성 중...' : `✏️ 선생님 ${aiTab === 'first' ? '1차' : '최종'} 답변 작성하기`}
              </button>
              <div className="text-[10px] text-ink-muted mt-1.5 text-center leading-[1.5]">AI가 분석 결과를 토대로 세특 연계 피드백을 작성해요</div>
            </div>
          )}

          {currentRoundFeedbackDone && (
            <div className="px-4 py-3 border-t border-line flex-shrink-0" style={{ background: THEME.accentBg }}>
              <div className="text-[12px] text-center font-bold" style={{ color: THEME.accentDark }}>
                ✓ 이미 {aiTab === 'first' ? '1차' : '최종'} 피드백이 전달되었어요
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}