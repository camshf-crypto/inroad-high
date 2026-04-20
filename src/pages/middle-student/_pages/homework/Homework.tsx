import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '../../_store/auth'

const HOMEWORK: Record<string, any[]> = {
  '중1': [
    { m: '1월', list: [
      { w: 1, title: '말하는 나를 발견하다', task: '자기PR 1분 스피치 원고를 작성하고 거울 앞에서 3번 연습해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 2, title: '생각을 기획하는 힘', task: '내가 만들고 싶은 동아리를 정하고 동아리 소개 원고를 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 3, title: '진로 키워드 탐색', task: '관심 직업 3가지를 조사하고 각각 2문장으로 소개하는 원고를 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 4, title: '직업탐색 스피치', task: '내가 되고 싶은 직업을 주제로 1분 30초 스피치를 녹화해서 제출해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
    ]},
    { m: '2월', list: [
      { w: 1, title: '책 속의 나를 말하다', task: '최근 읽은 책 한 권을 골라 독서기록장을 작성하고 핵심 내용 3줄 요약을 적어보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 2, title: '자기주도적 학습 스피치', task: '나만의 학습 방법을 정리하고 "나는 이렇게 공부한다" 원고를 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 3, title: '학습법/목표관리 스피치', task: '과목별 학습 계획표를 만들고 가장 어려운 과목 극복 방법을 스피치로 녹화해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
      { w: 4, title: '진로 발표회', task: '나의 진로 주제로 3분 발표 원고를 완성하고 실제로 발표 연습을 5번 해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
    ]},
    { m: '3월', list: [
      { w: 1, title: '나의 강점을 말하다', task: 'VIA 강점 검사 결과를 바탕으로 내 강점 3가지를 실제 사례와 함께 원고로 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 2, title: '한줄의 근거로 설득하기', task: '"나는 ○○을 해야 한다고 생각한다. 왜냐하면 ○○이기 때문이다." 형식으로 5가지 주장을 써보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 3, title: '셀프리더십 스피치', task: '학교에서 내가 리더십을 발휘한 경험을 찾아 2분 스피치로 녹화해서 제출해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
      { w: 4, title: '진로 뉴스 발표', task: '진로와 관련된 뉴스 기사 하나를 찾아 요약하고 나의 의견을 덧붙인 원고를 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
    ]},
    { m: '4월', list: [
      { w: 1, title: '실전 발표 마스터', task: '수행평가 주제로 실제 발표 연습을 하고 1분 30초 발표 영상을 찍어서 제출해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
      { w: 2, title: '토론 스피치', task: '"학교에서 스마트폰을 허용해야 한다" 주제로 찬성 입장 원고와 반대 입장 원고를 각각 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 3, title: '문해력 스피치 1', task: '교과서에서 지문 하나를 골라 핵심 문장 1개로 요약하는 연습을 10번 반복해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 4, title: '동아리 면접 연습', task: '"왜 이 동아리에 지원했나요?" 질문에 대한 답변을 준비하고 1분 스피치로 녹화해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
    ]},
    { m: '6월', list: [
      { w: 1, title: '나만의 스토리텔링', task: '내가 겪은 인상 깊은 경험 하나를 골라 기승전결 구조로 스토리를 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 2, title: '문해력 스피치 2', task: '최근 읽은 책이나 작품에서 가장 인상 깊은 장면을 2문장으로 핵심 요약해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 3, title: '논리적/비판적 스피치', task: '최근 사회 이슈 하나를 골라 문제점과 해결책을 논리적으로 서술한 글을 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 4, title: '모의 발표/피드백', task: '지금까지 배운 스피치 기술을 활용해 자유 주제로 2분 발표를 녹화해서 제출해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
    ]},
    { m: '8월', list: [
      { w: 1, title: '자기소개서 작성 스피치 1', task: '고입 자기소개서 항목 중 "지원 동기"를 200자 이내로 초안 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 2, title: '탐구 보고서 스피치', task: '관심 있는 주제로 탐구 보고서 목차와 서론 부분을 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 3, title: '인성/가치관 스피치', task: '내 인생에서 가장 중요하게 생각하는 가치 3가지와 그 이유를 원고로 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 4, title: '디자인씽킹 스피치', task: '학교에서 개선하고 싶은 문제 하나를 찾아 공감 → 문제정의 → 해결책 순으로 발표 원고를 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
    ]},
    { m: '9월', list: [
      { w: 1, title: '리더는 말로 이끈다', task: '리더십 관련 영상을 보고 인상 깊은 리더십 사례를 1분 30초 스피치로 녹화해서 제출해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
      { w: 2, title: '스토리텔링 스피치', task: '내 이야기를 레고처럼 쌓아가는 방식으로 자기소개 스토리를 완성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 3, title: '생활기록부 스피치', task: '생활기록부 항목 중 "자율활동" 부분을 스피치로 표현하는 원고를 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 4, title: '면접 스피치 1', task: '"자사고/특목고에 지원한 이유는 무엇인가요?" 질문에 대한 1분 답변을 준비하고 녹화해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
    ]},
    { m: '11월', list: [
      { w: 1, title: '면접 스피치 2', task: '우아한 대화법 5원칙을 활용해 면접 상황을 가정한 1분 대화 스피치를 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 2, title: '면접 스피치 3', task: '고입 면접 예상 질문 3가지에 대한 답변을 준비하고 실제 면접처럼 녹화해서 제출해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
      { w: 3, title: '모의 발표/피드백', task: '파트너와 함께한 발표를 혼자 다시 연습하고 개선된 버전의 발표를 녹화해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
      { w: 4, title: '진로 발표회', task: '1년간 탐색한 진로 주제로 최종 3분 발표 원고를 완성하고 발표 영상을 찍어서 제출해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
    ]},
  ],
  '중2': [
    { m: '1월', list: [
      { w: 1, title: '실전 발표 마스터 심화', task: '수행평가 주제로 2분 발표를 준비하고 실제 수행평가처럼 녹화해서 제출해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
      { w: 2, title: '자기소개서 작성 스피치 2', task: '자기소개서 세부 항목 중 하나를 골라 300자 분량의 초안을 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 3, title: '토론 스피치 심화', task: '관심 있는 시사 주제를 골라 찬성/반대/중립 3가지 입장의 핵심 논거를 각각 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 4, title: '진로 키워드 심화', task: '지망하는 학과와 연결된 자기소개서 초안을 500자 분량으로 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
    ]},
    { m: '4월', list: [
      { w: 1, title: '생활기록부 스피치 심화', task: '생활기록부 세특 항목을 면접 답변으로 변환하는 연습을 하고 2분 스피치로 녹화해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
      { w: 2, title: '면접 스피치 1 심화', task: '자사고/특목고 기출 면접 문제 3개를 골라 각각 답변을 작성하고 실제로 말해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 3, title: '리더는 말로 이끈다 심화', task: '내가 존경하는 리더를 소개하는 2분 30초 스피치를 녹화해서 제출해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
      { w: 4, title: '인성/가치관 심화', task: '나의 비전, 사명, 핵심가치를 각각 한 문장으로 정리하고 그 이유를 설명하는 원고를 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
    ]},
    { m: '9월', list: [
      { w: 1, title: '면접 기출 집중', task: '자사고/특목고 최근 5개년 기출 중 3문제를 골라 실제 면접처럼 답변을 녹화해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
      { w: 2, title: '생활기록부 완성 스피치', task: '생활기록부 전체 항목을 면접 답변으로 정리한 원고를 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 3, title: '문해력 프로젝트 2 심화', task: '신문 사설 하나를 읽고 핵심 논지와 나의 반박 의견을 논리적으로 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 4, title: '나의 강점 심화', task: 'VIA 강점을 면접 답변에 활용하는 연습을 하고 2분 강점 발표를 녹화해서 제출해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
    ]},
    { m: '11월', list: [
      { w: 1, title: '면접 시뮬레이션', task: '모의면접 1회차에서 받은 피드백을 반영해 답변을 수정하고 다시 녹화해서 제출해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
      { w: 2, title: '면접 시뮬레이션', task: '모의면접 2회차 준비로 예상 꼬리질문 5개와 답변을 미리 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 3, title: '자기소개서 최종 점검', task: '자기소개서 제출본을 소리 내어 읽으며 어색한 부분을 수정하고 최종본을 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 4, title: '진로 발표회', task: '2년간 성장 스토리를 담은 3분 최종 발표를 녹화해서 제출해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
    ]},
  ],
  '중3': [
    { m: '1월', list: [
      { w: 1, title: '자사고/특목고 면접 기출 분석', task: '지원하고자 하는 학교의 최근 3개년 면접 기출을 분석하고 경향을 정리해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 2, title: '면접 시뮬레이션 실전 1', task: '면접관 피드백을 반영해 답변을 개선하고 다시 1분 30초 면접 답변을 녹화해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
      { w: 3, title: '자기소개서 최종 완성', task: '지원 학교별 자기소개서를 각각 작성하고 차이점을 비교 정리해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 4, title: '실전 스피치 마스터', task: '면접 답변 전체를 스피치로 정리하고 2분 면접 시뮬레이션을 녹화해서 제출해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
    ]},
    { m: '9월', list: [
      { w: 1, title: '면접 D-30', task: '내 약점 면접 질문 3개를 찾아 집중 연습하고 답변 영상을 녹화해서 제출해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
      { w: 2, title: '면접 D-20', task: '전체 면접 답변을 처음부터 끝까지 시뮬레이션하고 녹화해서 제출해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
      { w: 3, title: '면접 D-10', task: '멘탈 관리 방법을 정리하고 면접 당일 루틴을 작성해보세요.', type: 'text', submitted: false, feedback: '', answer: '' },
      { w: 4, title: '면접 D-1', task: '내일 면접을 위한 최종 답변 정리본을 작성하고 마지막으로 전체 답변을 녹화해보세요.', type: 'video', submitted: false, feedback: '', answer: '' },
    ]},
  ],
}

export default function MiddleHomework() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)

  const grade = student?.grade || '중1'
  const homeworkData = HOMEWORK[grade] || HOMEWORK['중1']

  const allHW = homeworkData.flatMap((m: any) => m.list.map((l: any) => ({ ...l, month: m.m })))
  const curHW = allHW.find((h: any) => !h.submitted) || allHW[0]

  const [selHW, setSelHW] = useState<any>(curHW)
  const [data, setData] = useState(JSON.parse(JSON.stringify(homeworkData)))
  const [inputText, setInputText] = useState('')

  const submitHomework = () => {
    if (!inputText.trim()) return
    const mi = data.findIndex((m: any) => m.m === selHW.month)
    const li = data[mi]?.list.findIndex((l: any) => l.w === selHW.w)
    if (mi < 0 || li < 0) return
    const next = JSON.parse(JSON.stringify(data))
    next[mi].list[li].submitted = true
    next[mi].list[li].answer = inputText
    setData(next)
    setSelHW({ ...next[mi].list[li], month: next[mi].m })
    setInputText('')
  }

  const submittedCount = data.flatMap((m: any) => m.list).filter((h: any) => h.submitted).length
  const totalCount = data.flatMap((m: any) => m.list).length

  return (
    <div className="flex h-full overflow-hidden font-sans text-ink">

      {/* 왼쪽: 숙제 상세 */}
      <div className="flex-1 overflow-y-auto px-7 py-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[20px] font-extrabold text-ink tracking-tight">숙제</div>
            <div className="text-[13px] text-ink-muted mt-0.5">{student?.name} · {academy?.academyName}</div>
          </div>
          <div className="bg-brand-middle-bg text-brand-middle-dark text-[13px] font-bold px-4 py-1.5 rounded-full border border-brand-middle-light">
            {submittedCount}/{totalCount} 제출완료
          </div>
        </div>

        {selHW && (
          <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">

            {/* 주차 배지 */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-[11px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2.5 py-0.5 rounded-full border border-brand-middle-light">
                {selHW.month}
              </span>
              <span className="text-[11px] text-ink-secondary font-medium">{selHW.w}주차</span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                selHW.type === 'video'
                  ? 'bg-[#F5F3FF] text-[#7C3AED]'
                  : 'bg-[#EEF2FF] text-[#3B5BDB]'
              }`}>
                {selHW.type === 'video' ? '🎥 영상 제출' : '📝 텍스트 제출'}
              </span>
            </div>

            {/* 제목 */}
            <div className="text-[18px] font-extrabold text-ink tracking-tight mb-4">{selHW.title}</div>

            {/* 숙제 내용 */}
            <div className="bg-[#EEF2FF] border border-[#BAC8FF] rounded-xl px-4 py-3.5 mb-5">
              <div className="text-[11px] font-bold text-[#3B5BDB] mb-1.5">📋 이번 주 숙제</div>
              <div className="text-[13px] text-[#1E3A8A] leading-[1.7]">{selHW.task}</div>
            </div>

            {/* 제출 영역 */}
            {!selHW.submitted ? (
              <>
                {selHW.type === 'text' ? (
                  <>
                    <div className="text-[12px] font-bold text-ink-secondary mb-2">✏️ 원고 작성</div>
                    <textarea
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      placeholder="여기에 원고를 작성해주세요..."
                      rows={6}
                      className="w-full border border-line rounded-lg px-3.5 py-3 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                    />
                  </>
                ) : (
                  <>
                    <div className="text-[12px] font-bold text-ink-secondary mb-2">🎥 영상 업로드</div>

                    <div className="border-[1.5px] border-dashed border-line rounded-xl p-8 text-center mb-3 bg-gray-50 hover:border-brand-middle-light hover:bg-brand-middle-pale/50 transition-all">
                      <div className="text-4xl mb-2">📹</div>
                      <div className="text-[13px] text-ink-secondary font-medium mb-1">영상 파일을 업로드해주세요</div>
                      <div className="text-[11px] text-ink-muted mb-3.5">MP4, MOV 파일 지원 · 최대 500MB</div>
                      <button className="h-9 px-5 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-medium hover:border-brand-middle-light hover:text-brand-middle-dark transition-all">
                        파일 선택
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-px bg-line" />
                      <span className="text-[11px] text-ink-muted">또는</span>
                      <div className="flex-1 h-px bg-line" />
                    </div>

                    <input
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      placeholder="YouTube 링크를 입력해도 돼요 (예: https://youtu.be/...)"
                      className="w-full h-11 px-3.5 border border-line rounded-lg text-[13px] focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                    />
                  </>
                )}

                <button
                  onClick={submitHomework}
                  disabled={!inputText.trim()}
                  className={`w-full h-11 rounded-lg text-[14px] font-semibold mt-3 transition-all ${
                    inputText.trim()
                      ? 'bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle'
                      : 'bg-gray-100 text-ink-muted cursor-not-allowed'
                  }`}
                >
                  제출하기
                </button>
              </>
            ) : (
              <>
                {/* 제출 완료 */}
                <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-4 py-3 mb-3">
                  <div className="text-[11px] font-bold text-brand-middle-dark mb-1.5 flex items-center gap-1">
                    ✅ 제출 완료
                  </div>
                  <div className="text-[13px] text-[#065F46] leading-[1.7]">{selHW.answer}</div>
                </div>

                {/* 선생님 피드백 */}
                <div className={`rounded-xl px-4 py-3 border ${
                  selHW.feedback
                    ? 'bg-[#EEF2FF] border-[#BAC8FF]'
                    : 'bg-gray-50 border-line'
                }`}>
                  <div className={`text-[11px] font-bold ${
                    selHW.feedback ? 'text-[#3B5BDB]' : 'text-ink-muted'
                  } ${selHW.feedback ? 'mb-1.5' : ''}`}>
                    {selHW.feedback ? '💬 선생님 피드백' : '💬 선생님 피드백을 기다리는 중이에요...'}
                  </div>
                  {selHW.feedback && (
                    <div className="text-[13px] text-[#1E3A8A] leading-[1.7]">{selHW.feedback}</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 구분선 */}
      <div className="w-px bg-line flex-shrink-0" />

      {/* 오른쪽: 숙제 목록 */}
      <div className="w-[300px] flex-shrink-0 overflow-y-auto px-4 py-6 bg-[#F8FAFC]">
        <div className="text-[13px] font-bold text-ink mb-3 px-1">전체 숙제 목록</div>

        {data.map((m: any, mi: number) => (
          <div key={mi}>
            <div className={`text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 px-1 ${mi > 0 ? 'mt-4' : ''}`}>
              {m.m}
            </div>
            {m.list.map((h: any, li: number) => {
              const isSelected = selHW?.month === m.m && selHW?.w === h.w
              return (
                <div
                  key={li}
                  onClick={() => { setSelHW({ ...h, month: m.m }); setInputText('') }}
                  className={`p-3 rounded-xl mb-1.5 cursor-pointer border transition-all ${
                    isSelected
                      ? 'border-brand-middle bg-white shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
                      : h.submitted
                        ? 'border-brand-middle-light bg-brand-middle-pale/60 hover:shadow-sm'
                        : 'border-line bg-white hover:border-brand-middle-light hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      h.submitted || isSelected
                        ? 'bg-brand-middle text-white'
                        : 'bg-gray-100 text-ink-muted'
                    }`}>
                      {h.submitted ? '✓' : h.w}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[12.5px] truncate ${
                        isSelected
                          ? 'font-semibold text-brand-middle-dark'
                          : 'font-medium text-ink'
                      }`}>
                        {h.title}
                      </div>
                      <div className="text-[10px] text-ink-muted mt-0.5">
                        {h.type === 'video' ? '🎥 영상' : '📝 텍스트'} · {h.submitted ? (h.feedback ? '피드백 완료' : '피드백 대기중') : '미제출'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}