import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export interface MockExam {
  id: string
  student_id: string
  grade: string                 // 고1 / 고2 / 고3
  period: string                // 2월말 / 8월말 / 10월말
  exam_type: string | null
  major_level: string | null
  ai_generated: boolean
  status: string                // pending / open / in_progress / submitted / analyzed
  time_limit_min: number
  target_university: string | null
  target_department: string | null
  opened_at: string | null
  started_at: string | null
  submitted_at: string | null
  total_score: number | null
  teacher_comment: string | null
  created_at: string
  updated_at: string
}

export interface MockExamQuestion {
  id: string
  exam_id: string
  student_id: string
  order: number
  level: string                 // main / tail
  parent_id: string | null
  tail_index: number | null
  type: string | null
  question_text: string
  ai_generated: boolean
  student_answer: string | null
  answered_at: string | null
  time_spent_sec: number | null
  teacher_feedback: string | null
  created_at: string
}

export interface MockExamMajor {
  id: string
  exam_id: string
  student_id: string
  order: number
  question_text: string
  correct_answer: string
  student_answer: string | null
  answered_at: string | null
  score: number | null         // 0 / 50 / 100
  scored_at: string | null
  created_at: string
}

export interface MockExamReport {
  id: string
  exam_id: string
  student_id: string
  scores: any
  strengths: string[] | null
  weaknesses: string[] | null
  comparison_prev: any
  summary_for_parents: string | null
  university_fit: any
  teacher_comment: string | null
  season_guide: any
  saenggibu_direction: any
  next_period_plan: string | null
  published_at: string | null
  created_at: string
}

export interface MockExamYearlyReport {
  id: string
  student_id: string
  grade: string
  year: number
  total_summary: string | null
  growth_trajectory: any
  parent_message: string | null
  saenggibu_direction: any
  next_year_plan: string | null
  university_recommendations: any
  teacher_comment: string | null
  published_at: string | null
  created_at: string
}

const POLL = 2000

// ─────────────────────────────────────────────
// 1. 학생 모든 회차 조회 (grade별)
// ─────────────────────────────────────────────

export function useStudentMockExams(studentId: string, grade?: string) {
  return useQuery({
    queryKey: ['admin-mock-exams', studentId, grade],
    queryFn: async (): Promise<MockExam[]> => {
      let query = supabase
        .from('high_mock_exam')
        .select('*')
        .eq('student_id', studentId)
      if (grade) query = query.eq('grade', grade)

      const { data, error } = await query
        .order('grade', { ascending: true })
        .order('period', { ascending: true })
      if (error) throw error
      return (data ?? []) as MockExam[]
    },
    enabled: !!studentId,
    refetchInterval: POLL,
  })
}

// ─────────────────────────────────────────────
// 2. 회차 생성 (원장이 학생에게 회차 할당)
// ─────────────────────────────────────────────

export function useCreateMockExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      studentId,
      grade,
      period,
      examType,
      majorLevel,
      aiGenerated = false,
      targetUniversity,
      targetDepartment,
      timeLimitMin = 15,
    }: {
      studentId: string
      grade: string
      period: string
      examType?: string
      majorLevel?: string
      aiGenerated?: boolean
      targetUniversity?: string | null
      targetDepartment?: string | null
      timeLimitMin?: number
    }) => {
      // 이미 존재?
      const { data: existing } = await supabase
        .from('high_mock_exam')
        .select('id')
        .eq('student_id', studentId)
        .eq('grade', grade)
        .eq('period', period)
        .maybeSingle()
      if (existing) throw new Error(`${grade} ${period} 회차가 이미 존재합니다.`)

      const { data, error } = await supabase
        .from('high_mock_exam')
        .insert({
          student_id: studentId,
          grade,
          period,
          exam_type: examType ?? null,
          major_level: majorLevel ?? null,
          ai_generated: aiGenerated,
          status: 'pending',
          time_limit_min: timeLimitMin,
          target_university: targetUniversity ?? null,
          target_department: targetDepartment ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data as MockExam
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin-mock-exams', v.studentId] })
    },
  })
}

// ─────────────────────────────────────────────
// 3. 본 질문 + 꼬리질문 일괄 생성 (MOCK - AI 또는 기본 세트)
// ─────────────────────────────────────────────

interface QuestionSeed {
  order: number
  type: string
  question: string
  tails: string[]
  aiGenerated?: boolean
}

export function useGenerateQuestions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ examId, studentId, questions }: {
      examId: string
      studentId: string
      questions: QuestionSeed[]
    }) => {
      // 본 질문 insert
      const { data: mains, error: mErr } = await supabase
        .from('high_mock_exam_questions')
        .insert(
          questions.map(q => ({
            exam_id: examId,
            student_id: studentId,
            order: q.order,
            level: 'main',
            type: q.type,
            question_text: q.question,
            ai_generated: q.aiGenerated ?? false,
          }))
        )
        .select()
      if (mErr) throw mErr

      // 본 질문 id 매핑
      const mainIdByOrder: Record<number, string> = {}
      for (const m of mains || []) mainIdByOrder[m.order] = m.id

      // 꼬리질문 insert
      const tailRows: any[] = []
      for (const q of questions) {
        q.tails.forEach((tail, idx) => {
          tailRows.push({
            exam_id: examId,
            student_id: studentId,
            order: q.order,
            level: 'tail',
            parent_id: mainIdByOrder[q.order],
            tail_index: idx,
            type: q.type,
            question_text: tail,
            ai_generated: q.aiGenerated ?? false,
          })
        })
      }
      if (tailRows.length > 0) {
        const { error: tErr } = await supabase
          .from('high_mock_exam_questions')
          .insert(tailRows)
        if (tErr) throw tErr
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin-mock-exam-questions', v.examId] })
    },
  })
}

// ─────────────────────────────────────────────
// 4. 전공특화 문제 일괄 생성
// ─────────────────────────────────────────────

interface MajorSeed {
  order: number
  question: string
  correct: string
  questionType?: string
  timeLimitSec?: number
  options?: string[] | null
  correctIndex?: number | null
}

export function useGenerateMajorQuestions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ examId, studentId, questions }: {
      examId: string
      studentId: string
      questions: MajorSeed[]
    }) => {
      const { error } = await supabase
        .from('high_mock_exam_major')
        .insert(
          questions.map(q => ({
            exam_id: examId,
            student_id: studentId,
            order: q.order,
            question_text: q.question,
            correct_answer: q.correct,
            question_type: q.questionType || 'subjective',
            time_limit_sec: q.timeLimitSec || 120,
            options: q.options || null,
            correct_index: q.correctIndex !== undefined ? q.correctIndex : null,
          }))
        )
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin-mock-exam-major', v.examId] })
    },
  })
}

// ─────────────────────────────────────────────
// 5. 회차 오픈 (학생 시작 가능)
// ─────────────────────────────────────────────

export function useOpenMockExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (examId: string) => {
      const { error } = await supabase
        .from('high_mock_exam')
        .update({
          status: 'open',
          opened_at: new Date().toISOString(),
        })
        .eq('id', examId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-mock-exams'] })
    },
  })
}

// ─────────────────────────────────────────────
// 6. 회차 질문 조회 (main + tail 모두)
// ─────────────────────────────────────────────

export function useMockExamQuestions(examId: string | undefined) {
  return useQuery({
    queryKey: ['admin-mock-exam-questions', examId],
    queryFn: async (): Promise<MockExamQuestion[]> => {
      if (!examId) return []
      const { data, error } = await supabase
        .from('high_mock_exam_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order', { ascending: true })
        .order('level', { ascending: false })   // main 먼저
        .order('tail_index', { ascending: true })
      if (error) throw error
      return (data ?? []) as MockExamQuestion[]
    },
    enabled: !!examId,
    refetchInterval: POLL,
  })
}

// ─────────────────────────────────────────────
// 7. 전공특화 문제 조회
// ─────────────────────────────────────────────

export function useMockExamMajor(examId: string | undefined) {
  return useQuery({
    queryKey: ['admin-mock-exam-major', examId],
    queryFn: async (): Promise<MockExamMajor[]> => {
      if (!examId) return []
      const { data, error } = await supabase
        .from('high_mock_exam_major')
        .select('*')
        .eq('exam_id', examId)
        .order('order', { ascending: true })
      if (error) throw error
      return (data ?? []) as MockExamMajor[]
    },
    enabled: !!examId,
    refetchInterval: POLL,
  })
}

// ─────────────────────────────────────────────
// 8. 면접질문 피드백 업데이트 (본/꼬리 공통)
// ─────────────────────────────────────────────

export function useUpdateQuestionFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ questionId, feedback }: {
      questionId: string
      feedback: string
    }) => {
      const { error } = await supabase
        .from('high_mock_exam_questions')
        .update({ teacher_feedback: feedback })
        .eq('id', questionId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-mock-exam-questions'] })
    },
  })
}

// ─────────────────────────────────────────────
// 9. 전공특화 채점 (0 / 50 / 100)
// ─────────────────────────────────────────────

export function useScoreMajorQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ questionId, score }: {
      questionId: string
      score: number
    }) => {
      const { error } = await supabase
        .from('high_mock_exam_major')
        .update({
          score,
          scored_at: new Date().toISOString(),
        })
        .eq('id', questionId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-mock-exam-major'] })
    },
  })
}

// ─────────────────────────────────────────────
// 10. 시험 완료 처리 (원장 종합 코멘트 + 상태)
// ─────────────────────────────────────────────

export function useCompleteMockExam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ examId, teacherComment }: {
      examId: string
      teacherComment: string
    }) => {
      // 1. 객관식 자동 채점
      // 아직 채점 안 된 객관식만 조회
      const { data: objMajors } = await supabase
        .from('high_mock_exam_major')
        .select('*')
        .eq('exam_id', examId)
        .eq('question_type', 'objective')
        .is('score', null)

      if (objMajors && objMajors.length > 0) {
        for (const m of objMajors) {
          // 학생 답변이 "2" 같은 숫자 문자열
          const studentIdx = parseInt(m.student_answer || '', 10)
          let autoScore = 0
          if (!isNaN(studentIdx) && m.correct_index !== null) {
            autoScore = studentIdx === m.correct_index ? 100 : 0
          }
          await supabase
            .from('high_mock_exam_major')
            .update({
              score: autoScore,
              scored_at: new Date().toISOString(),
            })
            .eq('id', m.id)
        }
      }

      // 2. 평균 점수 계산 (자동 + 수동 채점 포함)
      const { data: majors } = await supabase
        .from('high_mock_exam_major')
        .select('score')
        .eq('exam_id', examId)
        .not('score', 'is', null)

      const scores = (majors || []).map(m => m.score as number)
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null

      const { error } = await supabase
        .from('high_mock_exam')
        .update({
          status: 'analyzed',
          total_score: avgScore,
          teacher_comment: teacherComment,
        })
        .eq('id', examId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-mock-exams'] })
      qc.invalidateQueries({ queryKey: ['admin-mock-exam-major'] })
    },
  })
}

// ─────────────────────────────────────────────
// 11. 회차 리포트 조회
// ─────────────────────────────────────────────

export function useMockExamReport(examId: string | undefined) {
  return useQuery({
    queryKey: ['admin-mock-exam-report', examId],
    queryFn: async (): Promise<MockExamReport | null> => {
      if (!examId) return null
      const { data, error } = await supabase
        .from('high_mock_exam_report')
        .select('*')
        .eq('exam_id', examId)
        .maybeSingle()
      if (error) throw error
      return data as MockExamReport | null
    },
    enabled: !!examId,
    refetchInterval: POLL,
  })
}

// ─────────────────────────────────────────────
// 12. AI 리포트 생성 (MOCK)
// ─────────────────────────────────────────────

export function useGenerateReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ examId, studentId }: {
      examId: string
      studentId: string
    }) => {
      // exam + questions + majors 조회
      const { data: exam } = await supabase
        .from('high_mock_exam')
        .select('*')
        .eq('id', examId)
        .maybeSingle()
      if (!exam) throw new Error('시험을 찾을 수 없어요.')

      const { data: questions } = await supabase
        .from('high_mock_exam_questions')
        .select('*')
        .eq('exam_id', examId)

      const { data: majors } = await supabase
        .from('high_mock_exam_major')
        .select('*')
        .eq('exam_id', examId)

      // MOCK 점수 계산 (실제는 AI 연동)
      await new Promise(r => setTimeout(r, 1500))

      const mainCount = (questions || []).filter(q => q.level === 'main' && q.student_answer).length
      const answerRate = Math.min(100, (mainCount / 4) * 100)
      const majorScores = (majors || []).filter(m => m.score !== null).map(m => m.score as number)
      const majorAvg = majorScores.length > 0 
        ? majorScores.reduce((a, b) => a + b, 0) / majorScores.length 
        : 0

      // 카테고리별 점수 (MOCK)
      const scores = {
        인성: Math.round(60 + Math.random() * 30),
        전공적합성: Math.round(majorAvg * 0.8 + Math.random() * 10),
        발전가능성: Math.round(60 + answerRate * 0.3 + Math.random() * 10),
        total: 0,
      }
      scores.total = Math.round((scores['인성'] + scores['전공적합성'] + scores['발전가능성']) / 3)

      // 이전 회차와 비교
      let comparison_prev = null
      const periodOrder = ['2월말', '8월말', '10월말']
      const currentIdx = periodOrder.indexOf(exam.period)
      if (currentIdx > 0) {
        const prevPeriod = periodOrder[currentIdx - 1]
        const { data: prevExam } = await supabase
          .from('high_mock_exam')
          .select('id, total_score')
          .eq('student_id', studentId)
          .eq('grade', exam.grade)
          .eq('period', prevPeriod)
          .maybeSingle()
        if (prevExam) {
          const { data: prevReport } = await supabase
            .from('high_mock_exam_report')
            .select('scores')
            .eq('exam_id', prevExam.id)
            .maybeSingle()
          if (prevReport?.scores?.total) {
            comparison_prev = {
              prev_period: prevPeriod,
              prev_total: prevReport.scores.total,
              current_total: scores.total,
              diff: scores.total - prevReport.scores.total,
            }
          }
        }
      }

      // 시기별 가이드 (grade + period)
      const season_guide = getSeasonGuide(exam.grade, exam.period)

      // 생기부 방향성
      const saenggibu_direction = getSaenggibuDirection(exam.grade, exam.period, exam.target_department || '')

      // 다음 회차 계획
      const next_period_plan = getNextPeriodPlan(exam.grade, exam.period)

      const reportData = {
        exam_id: examId,
        student_id: studentId,
        scores,
        strengths: [
          '구체적인 경험을 바탕으로 답변을 전개했어요.',
          '전공과의 연결성이 명확해지고 있어요.',
          '논리적 흐름이 이전보다 자연스러워졌어요.',
        ],
        weaknesses: [
          '도입부에서 핵심 메시지를 먼저 제시하면 더 좋아요.',
          '구체적인 수치나 사례를 추가하면 설득력이 높아져요.',
        ],
        comparison_prev,
        summary_for_parents: comparison_prev
          ? `이번 ${exam.period} 모의면접에서 총점 ${scores.total}점을 획득했어요 (이전 회차 대비 ${comparison_prev.diff >= 0 ? '+' : ''}${comparison_prev.diff}점). ${exam.target_university || '목표 대학'}에 대한 이해도가 점차 깊어지고 있으며, 꾸준한 노력을 지속한다면 좋은 결과를 기대할 수 있습니다.`
          : `이번 ${exam.period} 모의면접에서 총점 ${scores.total}점을 획득했어요. 방향성을 설정하는 시작점으로, 앞으로의 회차에서 구체적인 성장이 기대됩니다.`,
        university_fit: exam.target_university ? {
          university: exam.target_university,
          department: exam.target_department,
          fit_score: Math.min(95, scores.total + 5),
          reason: '전공에 대한 이해와 열정이 드러나며, 지속적인 성장이 관찰됩니다.',
        } : null,
        season_guide,
        saenggibu_direction,
        next_period_plan,
        published_at: new Date().toISOString(),
      }

      const { data: existing } = await supabase
        .from('high_mock_exam_report')
        .select('id')
        .eq('exam_id', examId)
        .maybeSingle()

      if (existing) {
        await supabase.from('high_mock_exam_report').update(reportData).eq('id', existing.id)
      } else {
        await supabase.from('high_mock_exam_report').insert(reportData)
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['admin-mock-exam-report', v.examId] })
    },
  })
}

// ─────────────────────────────────────────────
// 13. 연말 리포트 조회 / 생성
// ─────────────────────────────────────────────

export function useYearlyReport(studentId: string, grade: string, year: number) {
  return useQuery({
    queryKey: ['admin-yearly-report', studentId, grade, year],
    queryFn: async (): Promise<MockExamYearlyReport | null> => {
      const { data, error } = await supabase
        .from('high_mock_exam_yearly_report')
        .select('*')
        .eq('student_id', studentId)
        .eq('grade', grade)
        .eq('year', year)
        .maybeSingle()
      if (error) throw error
      return data as MockExamYearlyReport | null
    },
    enabled: !!studentId && !!grade,
    refetchInterval: POLL,
  })
}

// ─────────────────────────────────────────────
// 시기별 컨텐츠 헬퍼
// ─────────────────────────────────────────────

function getSeasonGuide(grade: string, period: string) {
  const map: Record<string, any> = {
    '고1_2월말': {
      title: '🌱 방향 설정의 시기',
      subtitle: '고1 1차는 앞으로 3년의 입시 로드맵을 그리는 출발점이에요.',
      content: [
        '관심 전공 탐색 - 관련 세부 영역 찾기',
        '진로 독서 시작 - 전공 관련 도서 2~3권 완독',
        '동아리/활동 선택 - 전공과 연결되는 교내 활동',
        '기본 역량 강화 - 글쓰기, 발표, 토론 경험',
      ],
    },
    '고1_8월말': {
      title: '☀️ 생기부 시작의 여름',
      subtitle: '여름방학에 쌓는 활동이 생기부의 기반이 됩니다.',
      content: [
        '교내 탐구 프로젝트 1건 완성',
        '관련 도서 3권 완독 + 독서록 작성',
        '봉사활동 및 진로체험',
        '면접 답변 구조화 훈련',
      ],
    },
    '고1_10월말': {
      title: '🍂 고1 마무리 + 고2 준비',
      subtitle: '고1 성과를 점검하고 고2 방향을 설정합니다.',
      content: [
        '고1 학년 종합 분석 및 피드백',
        '고2 집중 심화 주제 확정',
        '생기부 핵심 활동 정리',
        '고2 로드맵 설계',
      ],
    },
    '고2_2월말': {
      title: '🌸 심화의 시작',
      subtitle: '본격적인 전공 심화와 차별화가 시작되는 학년입니다.',
      content: [
        '전공 심화 주제 결정',
        '탐구 프로젝트 설계',
        '학업 성취도 관리 집중',
        '리더십 활동 강화',
      ],
    },
    '고2_8월말': {
      title: '☀️ 생기부 풍성화',
      subtitle: '여름방학이 생기부의 질을 결정짓는 시기예요.',
      content: [
        '심화 탐구 프로젝트 완성',
        '전공 관련 독서 4권 이상',
        '교내 대회 참여',
        '세특 기록 점검',
      ],
    },
    '고2_10월말': {
      title: '🍂 고3 입시 대비',
      subtitle: '고2 마무리와 함께 입시 본격 준비에 들어갑니다.',
      content: [
        '생기부 3년 통합 점검',
        '자기소개서 방향 설정',
        '면접 기본기 다지기',
        '목표 대학 구체화',
      ],
    },
    '고3_2월말': {
      title: '🎯 입시 원년',
      subtitle: '수시와 정시 전략을 확정하는 중요한 시기입니다.',
      content: [
        '자기소개서 초안 작성',
        '수시 전형 선택',
        '기출문제 본격 연습',
        '면접 실전 훈련',
      ],
    },
    '고3_8월말': {
      title: '☀️ 수시 면접 실전',
      subtitle: '지원 대학별 면접 특성에 맞춰 집중 훈련합니다.',
      content: [
        '지원 대학 기출 분석',
        '생기부 기반 예상질문 훈련',
        '모의면접 실전',
        '긴장 대응 연습',
      ],
    },
    '고3_10월말': {
      title: '🎓 최종 마무리',
      subtitle: '입시 면접을 앞둔 마지막 점검 단계입니다.',
      content: [
        '면접 실전 리허설',
        '약점 보완 집중',
        '자신감 회복',
        '컨디션 관리',
      ],
    },
  }
  return map[`${grade}_${period}`] || map['고1_2월말']
}

function getSaenggibuDirection(grade: string, period: string, department: string) {
  const key = `${grade}_${period}`
  const baseDirection = {
    자율활동: [
      '학급 임원 또는 리더 역할 (인성 평가 자료)',
      '학교 행사 기획·진행 참여',
      '교내 프로젝트 발표',
    ],
    동아리: [
      `${department || '전공'} 관련 동아리 선택`,
      '적극적 참여 → 담당 선생님께 구체 활동 기록 요청',
      '탐구·제작 결과물을 구체적으로 남기기',
    ],
    진로독서: [
      '전공 관련 도서 읽고 감상문 작성',
      '진로 탐색 보고서 제출',
      '관련 강연·컨퍼런스 시청',
    ],
    세특: [
      '국어: 비판적 글쓰기, 언론 비평',
      '사회: 전공 관련 사회 현상 분석',
      '영어: 전공 분야 원서 독해',
    ],
  }
  return baseDirection
}

function getNextPeriodPlan(grade: string, period: string) {
  const nextMap: Record<string, string> = {
    '고1_2월말': '여름방학 동안 전공 관련 독서와 교내 탐구 활동을 2~3개 완료해주세요. 8월말 2차 모의면접에서 한층 단단해진 모습을 보여주길 기대할게요.',
    '고1_8월말': '2학기 동안 생기부 활동을 마무리하고 10월말 3차 모의면접에서 고1 전체 성과를 종합적으로 평가합니다.',
    '고1_10월말': '고2로 올라가면 전공 심화가 본격적으로 시작됩니다. 겨울방학 동안 고2 심화 주제를 미리 탐색해보세요.',
    '고2_2월말': '1학기 동안 심화 탐구 프로젝트를 진행하고 여름방학에 심화 독서를 이어가세요.',
    '고2_8월말': '2학기는 생기부의 질을 결정하는 시기입니다. 교과 세특과 동아리 활동에 집중해주세요.',
    '고2_10월말': '겨울방학부터 자기소개서 초안을 작성하고, 지원 대학별 전형을 구체화하세요.',
    '고3_2월말': '여름방학 전까지 자기소개서를 완성하고, 수시 지원 전략을 수립하세요.',
    '고3_8월말': '10월까지 지원 대학별 기출 분석과 예상 질문을 완벽히 준비하세요.',
    '고3_10월말': '남은 기간 컨디션 관리와 자신감 회복에 집중하세요. 끝까지 최선을 다해요!',
  }
  return nextMap[`${grade}_${period}`] || '꾸준히 성장을 이어가주세요.'
}