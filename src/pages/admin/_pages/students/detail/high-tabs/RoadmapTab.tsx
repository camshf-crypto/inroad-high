import { useState } from 'react'

// 파랑 테마
const THEME = {
  accent: '#2563EB',
  accentDark: '#1E3A8A',
  accentBg: '#EFF6FF',
  accentBorder: '#93C5FD',
  accentShadow: 'rgba(37, 99, 235, 0.15)',
  gradient: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
}

const ROADMAP: Record<string, any[]> = {
  '고1': [
    {
      m: '1월', theme: '겨울방학 집중 - 방향 설정', freq: '주 2회 (2주)', missions: [
        { t: '학과 적합도 정밀진단 (200문항)', ok: false, type: 'inAnswer' },
        { t: '진로진학 AI로 관심 계열 및 학과 탐색', ok: false, type: 'inAnswer' },
        { t: '관심 학과 방향 결정', ok: false, type: 'teacher' },
        { t: '고1 1년 로드맵 학부모 공유', ok: false, type: 'teacher' },
      ]
    },
    {
      m: '2월', theme: '겨울방학 집중 - 탐구 설계', freq: '주 1회 (4주)', missions: [
        { t: '세특라이트로 1학기 탐구주제 미리 설계', ok: false, type: 'tab', tab: 'topic' },
        { t: '전공특화문제 기초 전공 지식 첫 점검', ok: false, type: 'tab', tab: 'major' },
        { t: '동아리 계열 연결 계획 수립', ok: false, type: 'teacher' },
        { t: '진로진학 AI 독서 리스트 추천', ok: false, type: 'tab', tab: 'book' },
      ]
    },
    {
      m: '3월', theme: '방향 확정 + 탐구 실행 시작', freq: '주 2회 (2주)', missions: [
        { t: '겨울방학에 설계한 탐구주제 실행 시작', ok: false, type: 'tab', tab: 'topic' },
        { t: '동아리 선택 - 계열 및 학과 연결', ok: false, type: 'teacher' },
        { t: '수행평가 주제 입시 연결 전략', ok: false, type: 'teacher' },
        { t: '예상 생기부 문구 확인', ok: false, type: 'tab', tab: 'expect' },
      ]
    },
    {
      m: '5월', theme: '수행평가 + 탐구 병행', freq: '주 2회 (2주)', missions: [
        { t: '수행평가 주제 입시 연결 점검', ok: false, type: 'teacher' },
        { t: '세특라이트 탐구활동 중간 점검', ok: false, type: 'tab', tab: 'topic' },
        { t: '1학기 탐구 마무리 방향 설정', ok: false, type: 'teacher' },
        { t: '2학기 탐구주제 미리 구상', ok: false, type: 'tab', tab: 'topic' },
      ]
    },
    {
      m: '7월', theme: '여름방학 집중 ① - 전공 + 스피치', freq: '주 2회 (2주)', missions: [
        { t: '전공특화문제 완성', ok: false, type: 'tab', tab: 'major' },
        { t: '2학기 탐구주제 확정', ok: false, type: 'tab', tab: 'topic' },
        { t: '스피치 훈련 시작 - 말하는 습관 교정', ok: false, type: 'tab', tab: 'simulation' },
        { t: '자기소개 / 지원동기 답변 초안 작성', ok: false, type: 'tab', tab: 'expect' },
      ]
    },
    {
      m: '8월', theme: '여름방학 집중 ② - 면접 기초', freq: '주 1회 (4주)', missions: [
        { t: '장단점 / 학과 선택 이유 답변 작성', ok: false, type: 'tab', tab: 'expect' },
        { t: '실전 면접 시뮬레이션 1회 체험', ok: false, type: 'tab', tab: 'simulation' },
        { t: '시뮬레이션 영상 분석 + 약점 파악', ok: false, type: 'teacher' },
        { t: '9월 2학기 탐구주제 실행 준비', ok: false, type: 'tab', tab: 'topic' },
      ]
    },
    {
      m: '10월', theme: '기출 경험 + 꼬리질문', freq: '주 1회 (4주)', missions: [
        { t: '지원 희망 대학 기출문제 처음 접하기', ok: false, type: 'tab', tab: 'past' },
        { t: '학과별 기출 내 학과 집중 풀기', ok: false, type: 'tab', tab: 'past' },
        { t: '꼬리질문 어떤 게 나오는지 파악', ok: false, type: 'tab', tab: 'expect' },
        { t: '스피치 훈련 심화', ok: false, type: 'tab', tab: 'simulation' },
      ]
    },
    {
      m: '12월', theme: '1년 마무리 + 고2 준비', freq: '주 1회 (4주)', missions: [
        { t: '1년 탐구활동 정리 / 생기부 업로드 예상질문', ok: false, type: 'tab', tab: 'expect' },
        { t: '꼬리질문 대비 연습', ok: false, type: 'tab', tab: 'expect' },
        { t: '실전 면접 시뮬레이션 1회', ok: false, type: 'tab', tab: 'simulation' },
        { t: '고2 겨울방학 커리큘럼 설계', ok: false, type: 'teacher' },
      ]
    },
  ],
  '고2': [
    {
      m: '1월', theme: '고1 연결 점검 + 고2 전략 수립 ①', freq: '주 2회 (2주)', missions: [
        { t: '고1 생기부 업로드 → 현재 스토리 점검 및 갭 분석', ok: false, type: 'tab', tab: 'expect' },
        { t: '학과 확정 후 고2 탐구 방향 재설계', ok: false, type: 'teacher' },
        { t: '고1 활동과 연결고리 만들기', ok: false, type: 'teacher' },
        { t: '고1-고2 연결 스토리 설계', ok: false, type: 'teacher' },
      ]
    },
    {
      m: '2월', theme: '고1 연결 점검 + 고2 전략 수립 ②', freq: '주 1회 (4주)', missions: [
        { t: '세특라이트로 학과 맞춤 심화 탐구주제 선택', ok: false, type: 'tab', tab: 'topic' },
        { t: '전공특화문제 심화 — 고1 부족 부분 집중 보완', ok: false, type: 'tab', tab: 'major' },
        { t: '생기부 예상문제로 현재 질문 확인', ok: false, type: 'tab', tab: 'expect' },
        { t: '진로진학 AI로 독서 리스트 심화 추천', ok: false, type: 'tab', tab: 'book' },
      ]
    },
    {
      m: '3월', theme: '심화 탐구 실행 시작', freq: '주 1회 (4주)', missions: [
        { t: '겨울방학에 설계한 심화 탐구주제 실행 시작', ok: false, type: 'tab', tab: 'topic' },
        { t: '고1-고2 탐구 연결성 점검하며 진행', ok: false, type: 'teacher' },
        { t: '생기부 예상문제로 현재 생기부 질문 미리 확인', ok: false, type: 'tab', tab: 'expect' },
        { t: '진로진학 AI로 학과별 독서 리스트 심화 추천', ok: false, type: 'tab', tab: 'book' },
      ]
    },
    {
      m: '5월', theme: '수행평가 심화 + 면접 답변 동시 준비', freq: '주 1회 (4주)', missions: [
        { t: '수행평가 주제를 학과 스토리와 연결 — 고1보다 심화', ok: false, type: 'teacher' },
        { t: '전공특화문제로 수행평가 관련 전공 지식 보완', ok: false, type: 'tab', tab: 'major' },
        { t: '수행평가 하면서 면접 답변 초안 동시 작성', ok: false, type: 'tab', tab: 'expect' },
        { t: '꼬리질문 어떤 게 나올지 미리 파악 + 생기부 중간 점검', ok: false, type: 'tab', tab: 'expect' },
      ]
    },
    {
      m: '7월', theme: '면접 실전 본격화 ① — 생기부 + 기출 시작', freq: '주 2회 (2주)', missions: [
        { t: '1학기 생기부 업로드 → 예상 면접질문 전체 뽑기', ok: false, type: 'tab', tab: 'expect' },
        { t: '지원 희망 대학 기출문제 집중 분석 시작', ok: false, type: 'tab', tab: 'past' },
        { t: '생기부-기출 갭 파악 → 2학기 전략 수립', ok: false, type: 'teacher' },
        { t: '지원 대학 범위 1차 확정', ok: false, type: 'teacher' },
      ]
    },
    {
      m: '8월', theme: '면접 실전 본격화 ② — 시뮬레이션 + 제시문', freq: '주 2회 (2주)', missions: [
        { t: '생기부 예상질문 전체 답변 작성 + 대학별 분석', ok: false, type: 'tab', tab: 'expect' },
        { t: '실전 면접 시뮬레이션 2~3회 반복 (영상 + 음성 분석)', ok: false, type: 'tab', tab: 'simulation' },
        { t: 'SKY·교대 지원자 → 제시문 면접 준비 시작', ok: false, type: 'tab', tab: 'presentation' },
        { t: '꼬리질문 집중 대비 — 학과 맞춤 심화', ok: false, type: 'tab', tab: 'expect' },
      ]
    },
    {
      m: '10월', theme: '기출 완성 + 제시문 심화 + 2학기 탐구', freq: '주 1~2회', missions: [
        { t: '2학기 탐구활동 실행 — 고1-고2 연결성 완성', ok: false, type: 'tab', tab: 'topic' },
        { t: '지원 대학 기출 2~3회차 반복 → 패턴 완전히 파악', ok: false, type: 'tab', tab: 'past' },
        { t: 'SKY·교대 지원자 → 제시문 심화 답변 완성도 높이기', ok: false, type: 'tab', tab: 'presentation' },
        { t: '꼬리질문 실전 연습 심화 + 스피치 업그레이드', ok: false, type: 'tab', tab: 'simulation' },
      ]
    },
    {
      m: '12월', theme: '면접 90% 완성 + 고3 준비', freq: '주 2회 (2주)', missions: [
        { t: '고1~고2 전체 생기부 예상질문 총정리', ok: false, type: 'tab', tab: 'expect' },
        { t: '실전 면접 시뮬레이션 3회 이상 — 약점 최종 보완', ok: false, type: 'tab', tab: 'simulation' },
        { t: '부족한 전공 지식 마지막 점검', ok: false, type: 'tab', tab: 'major' },
        { t: '고3 로드맵 설계 — 지원 대학 최종 확정', ok: false, type: 'teacher' },
      ]
    },
  ],
  '고3': [
    {
      m: '1월', theme: '생기부 마지막 탐구주제 설계 ①', freq: '주 2회 (2주)', missions: [
        { t: '세특라이트로 고3 마지막 탐구주제 선택', ok: false, type: 'tab', tab: 'topic' },
        { t: '진로진학 AI로 독서 리스트 + 탐구 방향 최종 점검', ok: false, type: 'tab', tab: 'book' },
        { t: '학과 스토리 완성에 필요한 활동 설계', ok: false, type: 'teacher' },
        { t: '지원 대학 범위 사전 점검', ok: false, type: 'teacher' },
      ]
    },
    {
      m: '2월', theme: '생기부 마지막 탐구주제 설계 ②', freq: '주 1회 (4주)', missions: [
        { t: '전공특화문제로 기초 전공 지식 점검 — 면접 답변 재료 확보', ok: false, type: 'tab', tab: 'major' },
        { t: '지금까지 생기부 업로드 → 예상질문 뽑아서 부족한 부분 파악', ok: false, type: 'tab', tab: 'expect' },
        { t: '고1·고2 연결 스토리 최종 점검', ok: false, type: 'teacher' },
        { t: '면접 답변 방향 설계', ok: false, type: 'teacher' },
      ]
    },
    {
      m: '3월', theme: '탐구 실행 + 수행평가 마무리', freq: '주 1회 (4주)', missions: [
        { t: '겨울방학 설계 탐구주제 실행 — 고1·고2 연결 스토리 완성', ok: false, type: 'tab', tab: 'topic' },
        { t: '수행평가 주제 학과와 연결 — 마지막 학기 전략적 활용', ok: false, type: 'teacher' },
        { t: '세특라이트로 탐구 방향 점검 + 예상 생기부 문구 확인', ok: false, type: 'tab', tab: 'expect' },
        { t: '전공특화문제로 수행평가 관련 전공 지식 동시에 보완', ok: false, type: 'tab', tab: 'major' },
      ]
    },
    {
      m: '5월', theme: '생기부 완성 + 대학 제출 전 최종 점검', freq: '주 1~2회', missions: [
        { t: '생기부 완성본 업로드 → 예상 면접질문 전체 뽑기', ok: false, type: 'tab', tab: 'expect' },
        { t: '지원 대학 확정 + 5개년 기출문제 분석 시작', ok: false, type: 'tab', tab: 'past' },
        { t: '스피치 훈련 시작 — 말투·속도·태도 교정', ok: false, type: 'tab', tab: 'simulation' },
        { t: '생기부-기출 갭 분석 → 여름방학 집중 계획 수립', ok: false, type: 'teacher' },
      ]
    },
    {
      m: '7월', theme: '수시 직전 최종 완성 ①', freq: '주 2~3회', missions: [
        { t: '생기부 예상질문 전체 답변 완성 + 대학별 맞춤 분석', ok: false, type: 'tab', tab: 'expect' },
        { t: '기출문제 집중 완성 — 지원 대학 패턴 완전히 내 것으로', ok: false, type: 'tab', tab: 'past' },
        { t: 'SKY·교대 지원자 → 꼬리질문 집중 대비', ok: false, type: 'tab', tab: 'expect' },
        { t: '지원 대학 최종 확정', ok: false, type: 'teacher' },
      ]
    },
    {
      m: '8월', theme: '수시 직전 최종 완성 ②', freq: '주 2~3회', missions: [
        { t: '실전 면접 시뮬레이션 3~5회 집중 반복', ok: false, type: 'tab', tab: 'simulation' },
        { t: '영상·음성 분석 후 약점 최종 보완', ok: false, type: 'teacher' },
        { t: 'SKY·교대 지원자 → 제시문 최종 완성 + 꼬리질문', ok: false, type: 'tab', tab: 'presentation' },
        { t: '면접 전날 루틴 완성', ok: false, type: 'teacher' },
      ]
    },
    {
      m: '10월', theme: '수시 면접 완주', freq: '면접일 맞춤', missions: [
        { t: '면접 일정 확인 후 대학별 맞춤 최종 점검', ok: false, type: 'teacher' },
        { t: '면접 전날 시뮬레이션 1회 — 긴장감 조절 + 컨디션 체크', ok: false, type: 'tab', tab: 'simulation' },
        { t: '앞선 면접 피드백 반영 → 다음 면접 바로 보완', ok: false, type: 'teacher' },
        { t: 'SKY·교대 제시문 면접 최종 점검', ok: false, type: 'tab', tab: 'presentation' },
      ]
    },
    {
      m: '12월', theme: '수시 결과 확인 + 마무리', freq: '필요시', missions: [
        { t: '수시 합격 → 마무리 및 대학 생활 준비', ok: false, type: 'teacher' },
        { t: '정시 대비 필요 시 → 추가 전략 수립', ok: false, type: 'teacher' },
        { t: '합격 후기 공유', ok: false, type: 'teacher' },
        { t: '고등학교 생활 마무리', ok: false, type: 'teacher' },
      ]
    },
  ],
}

export default function RoadmapTab({ student }: { student: any }) {
  const [selMonth, setSelMonth] = useState<number | null>(null)

  const grade = student?.grade || '고1'
  const roadmap = ROADMAP[grade] || ROADMAP['고1']
  const curMonth = new Date().getMonth() + 1 + '월'

  const totalMissions = roadmap.reduce((a: number, m: any) => a + m.missions.length, 0)
  const doneMissions = roadmap.reduce((a: number, m: any) => a + m.missions.filter((x: any) => x.ok).length, 0)
  const overallPct = totalMissions > 0 ? Math.round(doneMissions / totalMissions * 100) : 0
  const selected = selMonth !== null ? roadmap[selMonth] : null

  const scColor = (type: string) => {
    if (type === 'inAnswer') return { bg: '#EDE9FE', c: '#6D28D9', label: '✨ 인로드' }
    if (type === 'tab') return { bg: THEME.accentBg, c: THEME.accent, label: '🔗 바로가기' }
    return { bg: '#F0FDF4', c: '#15803D', label: '👨‍🏫 선생님' }
  }

  return (
    <div className="h-full overflow-y-auto">

      {/* ==================== 스탯 ==================== */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {/* 전체 진행률 - 그라데이션 */}
        <div
          className="rounded-xl px-4 py-2.5 text-white"
          style={{
            background: THEME.gradient,
            boxShadow: `0 4px 12px ${THEME.accentShadow}`,
          }}
        >
          <div className="text-[10px] font-semibold opacity-80 mb-0.5">전체 진행률</div>
          <div className="text-[18px] font-extrabold tracking-tight">{overallPct}%</div>
        </div>

        {/* 나머지 스탯 */}
        {[
          { label: '완료 미션', val: `${doneMissions}/${totalMissions}`, icon: '✅' },
          { label: '현재 월', val: curMonth, icon: '📅' },
          { label: '학년', val: grade, icon: '🎓' },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white border border-line rounded-xl px-4 py-2.5"
          >
            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">
              {s.icon} {s.label}
            </div>
            <div className="text-[16px] font-extrabold text-ink tracking-tight">{s.val}</div>
          </div>
        ))}
      </div>

      {/* ==================== 월 그리드 + 미션 패널 ==================== */}
      <div
        className="grid gap-4 items-start"
        style={{ gridTemplateColumns: selected ? '1fr 320px' : '1fr' }}
      >

        {/* ==================== 왼쪽: 월 그리드 ==================== */}
        <div className="bg-white border border-line rounded-2xl p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-[15px] font-extrabold text-ink mb-1 tracking-tight">
            🗺️ 연간 로드맵 진행 현황
          </div>
          <div className="text-[11px] font-medium text-ink-secondary mb-4">
            월을 클릭하면 상세 미션을 확인할 수 있어요.
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {roadmap.map((m: any, i: number) => {
              const done = m.missions.filter((x: any) => x.ok).length
              const pct = Math.round(done / m.missions.length * 100)
              const isCur = m.m === curMonth
              const isSel = selMonth === i
              const isDone = pct === 100

              return (
                <button
                  key={i}
                  onClick={() => setSelMonth(selMonth === i ? null : i)}
                  className="rounded-xl p-3 text-left transition-all hover:-translate-y-px"
                  style={{
                    border: `1px solid ${isSel ? THEME.accent : isCur ? THEME.accentBorder : '#E5E7EB'}`,
                    background: isSel ? THEME.accentBg : isCur ? '#F8FAFF' : '#fff',
                    boxShadow: isSel ? `0 4px 12px ${THEME.accentShadow}` : 'none',
                  }}
                >
                  {/* 월 번호 */}
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-extrabold mb-2"
                    style={{
                      background: isSel ? THEME.accent : isCur ? THEME.accentBorder : isDone ? '#ECFDF5' : '#F3F4F6',
                      color: isSel ? '#fff' : isCur ? '#fff' : isDone ? '#059669' : '#6B7280',
                    }}
                  >
                    {isDone ? '✓' : m.m.replace('월', '')}
                  </div>

                  {/* 월 이름 */}
                  <div className="flex items-center gap-1 mb-1">
                    <div className="text-[13px] font-extrabold text-ink tracking-tight">{m.m}</div>
                    {isCur && (
                      <span
                        className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ color: THEME.accent, background: THEME.accentBg }}
                      >
                        NOW
                      </span>
                    )}
                  </div>

                  {/* 테마 */}
                  <div className="text-[10px] font-medium text-ink-secondary mb-2 leading-[1.4] min-h-[28px]">
                    {m.theme}
                  </div>

                  {/* 진행률 바 */}
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: isDone ? '#059669' : THEME.accent,
                      }}
                    />
                  </div>
                  <div className="text-[10px] font-semibold text-ink-secondary">
                    {done}/{m.missions.length} 완료
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ==================== 오른쪽: 미션 패널 ==================== */}
        {selected && selMonth !== null && (
          <div
            className="bg-white rounded-2xl p-5 sticky top-0"
            style={{
              border: `2px solid ${THEME.accent}`,
              boxShadow: `0 8px 24px ${THEME.accentShadow}`,
            }}
          >
            {/* 헤더 */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[16px] font-extrabold text-ink tracking-tight">📅 {selected.m}</div>
                <div className="text-[11.5px] font-semibold text-ink-secondary mt-1">{selected.theme}</div>
                <div
                  className="text-[10px] font-bold mt-1.5 inline-block px-2 py-0.5 rounded-full"
                  style={{ color: THEME.accent, background: THEME.accentBg, border: `1px solid ${THEME.accentBorder}60` }}
                >
                  ⏰ {selected.freq}
                </div>
              </div>
              <button
                onClick={() => setSelMonth(null)}
                className="cursor-pointer text-ink-secondary text-base hover:text-ink w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">
              📋 미션 목록
            </div>

            {selected.missions.map((ms: any, mi: number) => {
              const tc = scColor(ms.type)
              return (
                <div
                  key={mi}
                  className="rounded-lg px-3 py-2.5 mb-1.5 transition-all"
                  style={{
                    background: ms.ok ? '#ECFDF5' : '#F8FAFC',
                    border: `1px solid ${ms.ok ? '#6EE7B7' : '#E5E7EB'}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                      style={{ background: ms.ok ? '#059669' : '#D1D5DB' }}
                    >
                      {ms.ok ? '✓' : ''}
                    </div>
                    <span
                      className="text-[12px] flex-1 leading-[1.5]"
                      style={{
                        color: ms.ok ? '#059669' : '#1a1a1a',
                        fontWeight: ms.ok ? 700 : 600,
                      }}
                    >
                      {ms.t}
                    </span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: tc.bg, color: tc.c }}
                    >
                      {tc.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}