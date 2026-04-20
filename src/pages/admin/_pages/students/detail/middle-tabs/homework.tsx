import { useState } from 'react'

// 🌱 중등 초록 테마
const THEME = {
  accent: '#059669',
  accentDark: '#065F46',
  accentBg: '#ECFDF5',
  accentBorder: '#6EE7B7',
  accentShadow: 'rgba(16, 185, 129, 0.15)',
  gradient: 'linear-gradient(135deg, #065F46, #10B981)',
}

const HOMEWORK: Record<string, any[]> = {
  '중1': [
    {
      m: '1월', list: [
        { w: 1, title: '말하는 나를 발견하다', task: '자기PR 1분 스피치 원고를 작성하고 거울 앞에서 3번 연습해보세요.', type: 'text', submitted: true, feedback: '좋은 시작이에요! 자기소개에 본인의 강점 3가지를 구체적으로 녹여내면 훨씬 설득력 있어요.', answer: '안녕하세요, 저는 호기심이 많고 새로운 것을 배우는 것을 좋아하는 김서아입니다. 책을 읽고 생각을 정리하는 것을 즐기며, 친구들과 의견을 나누는 토론 동아리에서 활동하고 있어요.' },
        { w: 2, title: '생각을 기획하는 힘', task: '내가 만들고 싶은 동아리를 정하고 동아리 소개 원고를 작성해보세요.', type: 'text', submitted: true, feedback: '', answer: '저는 "책으로 세상 읽기" 독서 동아리를 만들고 싶습니다. 매주 한 권씩 다양한 분야의 책을 읽고 토론하며 생각의 폭을 넓히는 것이 목표입니다.' },
        { w: 3, title: '진로 키워드 탐색', task: '관심 직업 3가지를 조사하고 각각 2문장으로 소개하는 원고를 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
        { w: 4, title: '직업탐색 스피치', task: '내가 되고 싶은 직업을 주제로 1분 30초 스피치를 녹화해서 제출해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
      ]
    },
    {
      m: '2월', list: [
        { w: 1, title: '책 속의 나를 말하다', task: '최근 읽은 책 한 권을 골라 독서기록장을 작성하고 핵심 내용 3줄 요약을 적어보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
        { w: 2, title: '자기주도적 학습 스피치', task: '나만의 학습 방법을 정리하고 "나는 이렇게 공부한다" 원고를 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
        { w: 3, title: '학습법/목표관리 스피치', task: '과목별 학습 계획표를 만들고 가장 어려운 과목 극복 방법을 스피치로 녹화해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
        { w: 4, title: '진로 발표회', task: '나의 진로 주제로 3분 발표 원고를 완성하고 실제로 발표 연습을 5번 해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      ]
    },
    {
      m: '3월', list: [
        { w: 1, title: '나의 강점을 말하다', task: 'VIA 강점 검사 결과를 바탕으로 내 강점 3가지를 실제 사례와 함께 원고로 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
        { w: 2, title: '한줄의 근거로 설득하기', task: '"나는 ○○을 해야 한다고 생각한다. 왜냐하면 ○○이기 때문이다." 형식으로 5가지 주장을 써보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
        { w: 3, title: '셀프리더십 스피치', task: '학교에서 내가 리더십을 발휘한 경험을 찾아 2분 스피치로 녹화해서 제출해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
        { w: 4, title: '진로 뉴스 발표', task: '진로와 관련된 뉴스 기사 하나를 찾아 요약하고 나의 의견을 덧붙인 원고를 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      ]
    },
  ],
  '중2': [
    {
      m: '1월', list: [
        { w: 1, title: '실전 발표 마스터 심화', task: '수행평가 주제로 2분 발표를 준비하고 실제 수행평가처럼 녹화해서 제출해보세요.', type: 'video', submitted: true, feedback: '', answer: '영상 제출됨 (youtu.be/example)' },
        { w: 2, title: '자기소개서 작성 스피치 2', task: '자기소개서 세부 항목 중 하나를 골라 300자 분량의 초안을 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
        { w: 3, title: '토론 스피치 심화', task: '관심 있는 시사 주제를 골라 찬성/반대/중립 3가지 입장의 핵심 논거를 각각 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
        { w: 4, title: '진로 키워드 심화', task: '지망하는 학과와 연결된 자기소개서 초안을 500자 분량으로 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      ]
    },
  ],
  '중3': [
    {
      m: '1월', list: [
        { w: 1, title: '자사고/특목고 면접 기출 분석', task: '지원하고자 하는 학교의 최근 3개년 면접 기출을 분석하고 경향을 정리해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
        { w: 2, title: '면접 시뮬레이션 실전 1', task: '면접관 피드백을 반영해 답변을 개선하고 다시 1분 30초 면접 답변을 녹화해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
      ]
    },
  ],
}

// AI 피드백 제안 mock
const AI_FEEDBACK_SUGGESTIONS = [
  '답변이 구체적이고 좋아요! 실제 경험이 잘 드러나 있어요. 다음에는 그 경험에서 배운 점을 한 문장 추가하면 완성도가 높아질 거예요.',
  '학생 본인의 생각이 잘 드러나지만 조금 더 논리적인 구조로 정리하면 좋겠어요. "주장 → 근거 → 사례" 순서로 써보세요.',
  '좋은 시도예요! 다만 내용이 다소 일반적이니 본인만의 경험이나 사례를 1-2개 추가해서 차별화하면 좋겠어요.',
]

export default function MiddleHomeworkTab({ student }: { student: any }) {
  const grade = student?.grade || '중1'
  const homeworkData = HOMEWORK[grade] || HOMEWORK['중1']

  const allHW = homeworkData.flatMap((m: any) => m.list.map((l: any) => ({ ...l, month: m.m })))

  const [data, setData] = useState(JSON.parse(JSON.stringify(homeworkData)))
  const [selHW, setSelHW] = useState<any>(allHW[0])
  const [feedback, setFeedback] = useState('')
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])

  const submittedCount = data.flatMap((m: any) => m.list).filter((h: any) => h.submitted).length
  const totalCount = data.flatMap((m: any) => m.list).length
  const feedbackDoneCount = data.flatMap((m: any) => m.list).filter((h: any) => h.submitted && h.feedback).length

  const selectHW = (h: any, month: string) => {
    setSelHW({ ...h, month })
    setFeedback(h.feedback || '')
  }

  const sendFeedback = () => {
    if (!feedback.trim() || !selHW) return
    const next = JSON.parse(JSON.stringify(data))
    const mi = next.findIndex((m: any) => m.m === selHW.month)
    const li = next[mi]?.list.findIndex((l: any) => l.w === selHW.w)
    if (mi < 0 || li < 0) return
    next[mi].list[li].feedback = feedback
    setData(next)
    setSelHW({ ...next[mi].list[li], month: next[mi].m })
  }

  const openAiModal = () => {
    setShowAiModal(true)
    setAiLoading(true)
    setAiSuggestions([])
    setTimeout(() => {
      setAiSuggestions(AI_FEEDBACK_SUGGESTIONS)
      setAiLoading(false)
    }, 1200)
  }

  const applyAiSuggestion = (s: string) => {
    setFeedback(s)
    setShowAiModal(false)
  }

  const handleTextareaFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = THEME.accent
    e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}`
  }
  const handleTextareaBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#E5E7EB'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div className="flex gap-4 h-full overflow-hidden">

      {/* ==================== 왼쪽 패널 ==================== */}
      <div className="w-[320px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)]">

        {/* 헤더 */}
        <div className="px-4 py-3 border-b border-line flex-shrink-0">
          <div className="text-[14px] font-extrabold text-ink tracking-tight">✏️ 숙제 목록</div>
          <div className="text-[11px] font-medium text-ink-secondary mt-1 flex gap-3">
            <span>제출 <span className="font-bold" style={{ color: THEME.accent }}>{submittedCount}/{totalCount}</span></span>
            <span>·</span>
            <span>피드백 <span className="font-bold" style={{ color: THEME.accent }}>{feedbackDoneCount}/{submittedCount}</span></span>
          </div>
        </div>

        {/* 숙제 리스트 */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {data.map((m: any, mi: number) => (
            <div key={mi}>
              <div className={`text-[10px] font-bold text-ink-muted uppercase tracking-wider px-1 mb-1.5 ${mi > 0 ? 'mt-4' : ''}`}>
                📅 {m.m}
              </div>
              {m.list.map((h: any, li: number) => {
                const isSelected = selHW?.month === m.m && selHW?.w === h.w
                const hasFeedback = h.submitted && h.feedback
                const submittedPending = h.submitted && !h.feedback

                return (
                  <button
                    key={li}
                    onClick={() => selectHW(h, m.m)}
                    className="w-full rounded-xl px-3 py-2.5 mb-1.5 text-left transition-all"
                    style={{
                      border: `1px solid ${isSelected ? THEME.accent : '#E5E7EB'}`,
                      background: isSelected ? THEME.accentBg : '#fff',
                      boxShadow: isSelected ? `0 2px 8px ${THEME.accentShadow}` : 'none',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0"
                        style={{
                          background: h.submitted ? THEME.accent : '#F3F4F6',
                          color: h.submitted ? '#fff' : '#9CA3AF',
                        }}
                      >
                        {h.submitted ? '✓' : h.w}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-[12.5px] truncate"
                          style={{
                            fontWeight: isSelected ? 700 : 600,
                            color: isSelected ? THEME.accentDark : '#1a1a1a',
                          }}
                        >
                          {h.title}
                        </div>
                        <div className="text-[10px] font-medium text-ink-muted mt-0.5 flex items-center gap-1 flex-wrap">
                          <span>{h.type === 'video' ? '🎥 영상' : '📝 텍스트'}</span>
                          <span>·</span>
                          {h.submitted ? (
                            hasFeedback ? (
                              <span className="font-bold text-green-600">✓ 피드백완료</span>
                            ) : (
                              <span className="font-bold text-amber-600">⏳ 피드백대기</span>
                            )
                          ) : (
                            <span className="font-bold text-ink-muted">○ 미제출</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ==================== 오른쪽 상세 ==================== */}
      <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] min-w-0">
        {!selHW ? (
          <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
            <div className="text-4xl">✏️</div>
            <div className="text-[14px] font-bold text-ink-secondary">숙제를 선택해주세요</div>
          </div>
        ) : (
          <>
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-line flex-shrink-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{
                    color: THEME.accentDark,
                    background: THEME.accentBg,
                    border: `1px solid ${THEME.accentBorder}60`,
                  }}
                >
                  📅 {selHW.month}
                </span>
                <span className="text-[11px] font-semibold text-ink-secondary bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {selHW.w}주차
                </span>
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{
                    background: selHW.type === 'video' ? '#F5F3FF' : '#EFF6FF',
                    color: selHW.type === 'video' ? '#7C3AED' : '#2563EB',
                    border: `1px solid ${selHW.type === 'video' ? '#DDD6FE' : '#93C5FD'}60`,
                  }}
                >
                  {selHW.type === 'video' ? '🎥 영상 제출' : '📝 텍스트 제출'}
                </span>
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full ml-auto"
                  style={{
                    background: selHW.submitted ? (selHW.feedback ? '#ECFDF5' : '#FFF7ED') : '#F3F4F6',
                    color: selHW.submitted ? (selHW.feedback ? '#059669' : '#D97706') : '#6B7280',
                    border: `1px solid ${selHW.submitted ? (selHW.feedback ? '#6EE7B7' : '#FDBA74') : '#E5E7EB'}60`,
                  }}
                >
                  {selHW.submitted ? (selHW.feedback ? '✓ 피드백완료' : '⏳ 피드백대기') : '○ 미제출'}
                </span>
              </div>
              <div className="text-[17px] font-extrabold text-ink tracking-tight">{selHW.title}</div>
            </div>

            {/* 바디 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">

              {/* 숙제 내용 */}
              <div
                className="rounded-xl px-4 py-3.5"
                style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
              >
                <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: THEME.accent }}>
                  📋 이번 주 숙제
                </div>
                <div className="text-[13px] font-bold leading-[1.7]" style={{ color: THEME.accentDark }}>
                  {selHW.task}
                </div>
              </div>

              {/* 학생 제출물 */}
              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                    👤 학생 제출물
                  </div>
                  {selHW.submitted && selHW.answer && (
                    <span className="text-[10px] font-semibold text-ink-muted">
                      {selHW.type === 'video' ? '🎥 영상' : '📝 텍스트'}
                    </span>
                  )}
                </div>

                {selHW.submitted ? (
                  selHW.type === 'video' ? (
                    /* 🎥 영상 제출물 - 세로 영상 지원 */
                    <div>
                      {/* 영상 플레이어 - 세로 9:16 비율 */}
                      <div className="flex justify-center mb-3">
                        <div
                          className="relative bg-black rounded-xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.15)]"
                          style={{
                            width: '280px',
                            aspectRatio: '9/16',
                            maxHeight: '500px',
                          }}
                        >
                          {/* 실제 영상 영역 (지금은 placeholder) */}
                          <div
                            className="w-full h-full flex items-center justify-center flex-col gap-3 cursor-pointer group"
                            style={{
                              background: 'linear-gradient(135deg, #1f2937, #111827)',
                            }}
                          >
                            {/* 재생 버튼 */}
                            <div
                              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl text-white transition-all group-hover:scale-110"
                              style={{
                                background: THEME.accent,
                                boxShadow: `0 8px 24px ${THEME.accentShadow}`,
                              }}
                            >
                              ▶
                            </div>
                            <div className="text-white text-[13px] font-bold">영상 재생</div>
                            <div className="text-white/60 text-[11px] font-medium">클릭해서 재생하세요</div>
                          </div>

                          {/* 세로 영상 표시 뱃지 */}
                          <div
                            className="absolute top-3 right-3 text-[9px] font-bold text-white px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}
                          >
                            📱 세로 영상
                          </div>

                          {/* 컨트롤 바 */}
                          <div
                            className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center gap-2"
                            style={{
                              background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                            }}
                          >
                            <div className="text-white text-[10px] font-bold">00:00</div>
                            <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                              <div className="h-full w-0 bg-white rounded-full" />
                            </div>
                            <div className="text-white text-[10px] font-medium">01:30</div>
                          </div>
                        </div>
                      </div>

                      {/* 영상 정보 */}
                      <div className="bg-gray-50 border border-line rounded-lg px-4 py-3 flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                          style={{ background: THEME.accentBg }}
                        >
                          🎥
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-bold text-ink mb-0.5">제출된 영상</div>
                          <div className="text-[11px] font-medium text-ink-secondary truncate">
                            {selHW.answer}
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            className="px-2.5 py-1.5 bg-white text-ink-secondary border border-line rounded-md text-[11px] font-bold hover:bg-gray-100 transition-colors"
                            title="다운로드"
                          >
                            ⬇️
                          </button>
                          <button
                            className="px-3 py-1.5 text-white rounded-md text-[11px] font-bold transition-all"
                            style={{ background: THEME.accent, boxShadow: `0 2px 6px ${THEME.accentShadow}` }}
                          >
                            🔗 새 창에서 열기
                          </button>
                        </div>
                      </div>

                      {/* AI 음성 인식 (옵션 영역) */}
                      <div
                        className="mt-3 rounded-lg px-4 py-3"
                        style={{ background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">🎙️</span>
                          <div className="flex-1">
                            <div
                              className="text-[11px] font-bold mb-0.5"
                              style={{ color: THEME.accentDark }}
                            >
                              AI 음성 → 텍스트 변환
                            </div>
                            <div className="text-[11px] font-medium" style={{ color: THEME.accent }}>
                              영상에서 학생 목소리를 자동으로 추출해드려요
                            </div>
                          </div>
                          <button
                            className="px-3 py-1.5 text-white rounded-md text-[11px] font-bold transition-all"
                            style={{ background: THEME.accent, boxShadow: `0 2px 6px ${THEME.accentShadow}` }}
                          >
                            ✨ 변환 시작
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 📝 텍스트 제출물 */
                    <div className="bg-gray-50 border border-line rounded-lg px-4 py-3 text-[13px] font-medium text-ink leading-[1.8] whitespace-pre-wrap">
                      {selHW.answer}
                    </div>
                  )
                ) : (
                  /* 미제출 */
                  <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <div className="text-3xl mb-2">⏳</div>
                    <div className="text-[13px] font-bold text-ink-secondary">아직 제출되지 않았어요.</div>
                    <div className="text-[11px] font-medium text-ink-muted mt-1">학생이 숙제를 제출하면 여기에 표시돼요.</div>
                  </div>
                )}
              </div>

              {/* 선생님 피드백 */}
              <div className="bg-white border border-line rounded-xl px-5 py-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                    💬 선생님 피드백
                  </div>
                  {selHW.submitted && (
                    <button
                      onClick={openAiModal}
                      className="px-2.5 py-1 text-white rounded-md text-[11px] font-bold transition-all"
                      style={{ background: THEME.accent, boxShadow: `0 2px 6px ${THEME.accentShadow}` }}
                    >
                      ✨ AI 피드백 제안
                    </button>
                  )}
                </div>

                {!selHW.submitted ? (
                  <div className="bg-gray-50 border border-line rounded-lg px-4 py-5 text-center">
                    <div className="text-[12px] font-medium text-ink-muted">
                      📝 학생이 숙제를 제출하면 피드백을 작성할 수 있어요.
                    </div>
                  </div>
                ) : selHW.feedback ? (
                  <>
                    <div
                      className="rounded-lg px-3.5 py-3 text-[13px] font-medium leading-[1.8] mb-2"
                      style={{
                        background: THEME.accentBg,
                        border: `1px solid ${THEME.accentBorder}60`,
                        color: THEME.accentDark,
                      }}
                    >
                      {selHW.feedback}
                    </div>
                    <button
                      onClick={() => {
                        const next = JSON.parse(JSON.stringify(data))
                        const mi = next.findIndex((m: any) => m.m === selHW.month)
                        const li = next[mi]?.list.findIndex((l: any) => l.w === selHW.w)
                        if (mi >= 0 && li >= 0) {
                          next[mi].list[li].feedback = ''
                          setData(next)
                          setSelHW({ ...next[mi].list[li], month: next[mi].m })
                          setFeedback('')
                        }
                      }}
                      className="px-3 py-1.5 bg-white text-ink-secondary border border-line rounded-md text-[11px] font-bold hover:bg-gray-50 transition-colors"
                    >
                      ✏️ 수정하기
                    </button>
                  </>
                ) : (
                  <>
                    <textarea
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      placeholder="학생의 숙제에 대한 피드백을 작성해주세요..."
                      rows={5}
                      className="w-full border border-line rounded-lg px-3.5 py-3 text-[13px] font-medium outline-none resize-y leading-[1.7] transition-all placeholder:text-ink-muted"
                      onFocus={handleTextareaFocus}
                      onBlur={handleTextareaBlur}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={sendFeedback}
                        disabled={!feedback.trim()}
                        className="px-4 py-2 text-white rounded-lg text-[12px] font-bold transition-all disabled:cursor-not-allowed hover:-translate-y-px"
                        style={{
                          background: feedback.trim() ? THEME.accent : '#E5E7EB',
                          color: feedback.trim() ? '#fff' : '#9CA3AF',
                          boxShadow: feedback.trim() ? `0 4px 12px ${THEME.accentShadow}` : 'none',
                        }}
                      >
                        📤 피드백 전달
                      </button>
                    </div>
                  </>
                )}
              </div>

            </div>
          </>
        )}
      </div>

      {/* ==================== AI 피드백 제안 모달 ==================== */}
      {showAiModal && (
        <div
          onClick={() => setShowAiModal(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl p-7 w-[500px] shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <div className="text-[18px] font-extrabold text-ink mb-1">✨ AI 피드백 제안</div>
            <div className="text-[12px] font-medium text-ink-secondary mb-5">
              학생의 답변을 분석해서 AI가 3가지 피드백 시안을 만들었어요. 마음에 드는 것을 선택하세요.
            </div>

            {aiLoading ? (
              <div className="text-center py-10 text-ink-muted text-[13px] font-medium">
                <div className="text-3xl mb-3 animate-pulse">✨</div>
                AI가 피드백을 생성 중이에요...
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-5">
                {aiSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => applyAiSuggestion(s)}
                    className="text-left px-4 py-3 rounded-xl border border-line bg-white hover:bg-gray-50 transition-all"
                    style={{
                      borderColor: '#E5E7EB',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = THEME.accent
                      e.currentTarget.style.background = THEME.accentBg
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#E5E7EB'
                      e.currentTarget.style.background = '#fff'
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                        style={{ color: THEME.accentDark, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                      >
                        시안 {i + 1}
                      </span>
                      <span className="text-[13px] font-medium text-ink leading-[1.6]">{s}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowAiModal(false)}
              className="w-full h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

    </div>
  )
}