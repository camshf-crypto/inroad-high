import { useState } from 'react'

const ROADMAP: Record<string, any[]> = {
  '중1': [
    { m: '1월', theme: '스피치 기초 - 자기소개', freq: '주 1회', missions: [
      { t: '자기소개 스피치 초안 작성', ok: false, type: 'tab', tab: 'lesson' },
      { t: '발음·속도·시선 첫 점검', ok: false, type: 'tab', tab: 'simulation' },
      { t: '진로 탐색 첫 단계 - 관심 분야 파악', ok: false, type: 'teacher' },
      { t: '1년 로드맵 학부모 공유', ok: false, type: 'teacher' },
    ]},
    { m: '2월', theme: '스피치 기초 - 말하기 습관 교정', freq: '주 1회', missions: [
      { t: '말하기 습관 교정 (빠른 말속도, 시선 처리)', ok: false, type: 'tab', tab: 'lesson' },
      { t: '짧은 주제 발표 연습', ok: false, type: 'tab', tab: 'simulation' },
      { t: '진로 관련 독서 시작', ok: false, type: 'tab', tab: 'book' },
      { t: '관심 분야 탐색 정리', ok: false, type: 'teacher' },
    ]},
    { m: '3월', theme: '진로 탐색 본격화', freq: '주 1회', missions: [
      { t: '진로 탐색 - 관심 직업 3가지 조사', ok: false, type: 'tab', tab: 'lesson' },
      { t: '조사 내용 스피치로 발표', ok: false, type: 'tab', tab: 'simulation' },
      { t: '진로 관련 독서 1권 완독', ok: false, type: 'tab', tab: 'book' },
      { t: '숙제 - 관심 직업 인터뷰 글쓰기', ok: false, type: 'tab', tab: 'homework' },
    ]},
    { m: '4월', theme: '표현력 향상 + 면접 맛보기', freq: '주 1회', missions: [
      { t: '표현력 향상 - 감정 전달 스피치', ok: false, type: 'tab', tab: 'lesson' },
      { t: '면접이란? - 기초 개념 이해', ok: false, type: 'tab', tab: 'lesson' },
      { t: '1분 자기소개 완성', ok: false, type: 'tab', tab: 'simulation' },
      { t: '독서 감상문 작성', ok: false, type: 'tab', tab: 'book' },
    ]},
    { m: '6월', theme: '면접 맛보기 + 독서 심화', freq: '주 1회', missions: [
      { t: '모의 면접 첫 경험', ok: false, type: 'tab', tab: 'simulation' },
      { t: '면접 태도 기초 (눈 맞춤, 자세)', ok: false, type: 'tab', tab: 'lesson' },
      { t: '독서 2권 완독', ok: false, type: 'tab', tab: 'book' },
      { t: '숙제 - 면접 소감 글쓰기', ok: false, type: 'tab', tab: 'homework' },
    ]},
    { m: '8월', theme: '여름방학 집중 - 스피치 완성', freq: '주 1회', missions: [
      { t: '스피치 종합 점검 - 1학기 약점 보완', ok: false, type: 'tab', tab: 'simulation' },
      { t: '다양한 주제 발표 연습', ok: false, type: 'tab', tab: 'lesson' },
      { t: '독서 리스트 추가 선정', ok: false, type: 'tab', tab: 'book' },
      { t: '2학기 목표 설정', ok: false, type: 'teacher' },
    ]},
    { m: '9월', theme: '면접 기초 완성', freq: '주 1회', missions: [
      { t: '면접 기초 답변 연습 (지원동기)', ok: false, type: 'tab', tab: 'lesson' },
      { t: '면접 시뮬레이션 2회', ok: false, type: 'tab', tab: 'simulation' },
      { t: '숙제 - 나의 장단점 글쓰기', ok: false, type: 'tab', tab: 'homework' },
      { t: '독서 감상 발표', ok: false, type: 'tab', tab: 'book' },
    ]},
    { m: '11월', theme: '1년 마무리 + 중2 준비', freq: '주 1회', missions: [
      { t: '1년 스피치 성장 돌아보기', ok: false, type: 'teacher' },
      { t: '면접 시뮬레이션 마무리 1회', ok: false, type: 'tab', tab: 'simulation' },
      { t: '독서 1년 정리', ok: false, type: 'tab', tab: 'book' },
      { t: '중2 로드맵 미리 보기', ok: false, type: 'teacher' },
    ]},
  ],
  '중2': [
    { m: '1월', theme: '중1 연결 + 심화 준비', freq: '주 1회', missions: [
      { t: '중1 스피치 돌아보기 + 약점 파악', ok: false, type: 'teacher' },
      { t: '목표 고교 탐색 시작', ok: false, type: 'teacher' },
      { t: '자소서 기초 개념 이해', ok: false, type: 'tab', tab: 'expect' },
      { t: '독서 리스트 심화 선정', ok: false, type: 'tab', tab: 'book' },
    ]},
    { m: '2월', theme: '자소서 기초 + 스피치 심화', freq: '주 1회', missions: [
      { t: '자소서 지원동기 초안 작성', ok: false, type: 'tab', tab: 'expect' },
      { t: '스피치 심화 - 논리적 말하기', ok: false, type: 'tab', tab: 'lesson' },
      { t: '목표 고교 기출문제 첫 접하기', ok: false, type: 'tab', tab: 'past' },
      { t: '독서 1권 완독', ok: false, type: 'tab', tab: 'book' },
    ]},
    { m: '3월', theme: '자소서 심화 + 기출 연습', freq: '주 1회', missions: [
      { t: '자소서 전 항목 초안 완성', ok: false, type: 'tab', tab: 'expect' },
      { t: '기출문제 답변 연습 시작', ok: false, type: 'tab', tab: 'past' },
      { t: '면접 답변 구조 익히기', ok: false, type: 'tab', tab: 'lesson' },
      { t: '숙제 - 자소서 1항목 완성', ok: false, type: 'tab', tab: 'homework' },
    ]},
    { m: '4월', theme: '자소서 완성 + 면접 연습', freq: '주 1회', missions: [
      { t: '자소서 전 항목 선생님 피드백', ok: false, type: 'tab', tab: 'expect' },
      { t: '자소서 기반 예상질문 연습', ok: false, type: 'tab', tab: 'expect' },
      { t: '면접 시뮬레이션 1회', ok: false, type: 'tab', tab: 'simulation' },
      { t: '독서 2권 완독', ok: false, type: 'tab', tab: 'book' },
    ]},
    { m: '6월', theme: '면접 시뮬레이션 집중', freq: '주 1회', missions: [
      { t: '면접 시뮬레이션 2회 반복', ok: false, type: 'tab', tab: 'simulation' },
      { t: '기출문제 집중 연습', ok: false, type: 'tab', tab: 'past' },
      { t: '자소서 수정 + 예상질문 추가', ok: false, type: 'tab', tab: 'expect' },
      { t: '숙제 - 면접 답변 녹음 제출', ok: false, type: 'tab', tab: 'homework' },
    ]},
    { m: '8월', theme: '여름방학 집중 - 면접 완성', freq: '주 2회', missions: [
      { t: '면접 시뮬레이션 3회 집중', ok: false, type: 'tab', tab: 'simulation' },
      { t: '기출문제 전 항목 완성', ok: false, type: 'tab', tab: 'past' },
      { t: '제시문 면접 기초 체험', ok: false, type: 'tab', tab: 'presentation' },
      { t: '독서 감상 발표', ok: false, type: 'tab', tab: 'book' },
    ]},
    { m: '9월', theme: '중3 준비 + 마무리', freq: '주 1회', missions: [
      { t: '자소서 최종 완성', ok: false, type: 'tab', tab: 'expect' },
      { t: '면접 시뮬레이션 마무리', ok: false, type: 'tab', tab: 'simulation' },
      { t: '독서 2학기 리스트 선정', ok: false, type: 'tab', tab: 'book' },
      { t: '중3 로드맵 미리 보기', ok: false, type: 'teacher' },
    ]},
    { m: '11월', theme: '2년 마무리 + 중3 전략', freq: '주 1회', missions: [
      { t: '2년 성장 돌아보기', ok: false, type: 'teacher' },
      { t: '목표 고교 최종 확정', ok: false, type: 'teacher' },
      { t: '중3 면접 전략 수립', ok: false, type: 'teacher' },
      { t: '독서 1년 정리', ok: false, type: 'tab', tab: 'book' },
    ]},
  ],
  '중3': [
    { m: '1월', theme: '중3 시작 - 실전 집중 준비', freq: '주 2회', missions: [
      { t: '목표 고교 최종 확정 + 입시 전략 수립', ok: false, type: 'teacher' },
      { t: '자소서 전면 점검 + 보완', ok: false, type: 'tab', tab: 'expect' },
      { t: '기출문제 전략적 분석', ok: false, type: 'tab', tab: 'past' },
      { t: '독서 마지막 리스트 선정', ok: false, type: 'tab', tab: 'book' },
    ]},
    { m: '2월', theme: '자소서 완성 + 기출 심화', freq: '주 2회', missions: [
      { t: '자소서 최종 완성 + 선생님 피드백', ok: false, type: 'tab', tab: 'expect' },
      { t: '자소서 기반 예상질문 전체 완성', ok: false, type: 'tab', tab: 'expect' },
      { t: '기출문제 심화 연습', ok: false, type: 'tab', tab: 'past' },
      { t: '숙제 - 자소서 최종본 제출', ok: false, type: 'tab', tab: 'homework' },
    ]},
    { m: '3월', theme: '면접 실전 집중 ①', freq: '주 2회', missions: [
      { t: '면접 시뮬레이션 3회 집중 반복', ok: false, type: 'tab', tab: 'simulation' },
      { t: '기출문제 패턴 완전 파악', ok: false, type: 'tab', tab: 'past' },
      { t: '제시문 면접 기초 완성', ok: false, type: 'tab', tab: 'presentation' },
      { t: '꼬리질문 집중 대비', ok: false, type: 'tab', tab: 'expect' },
    ]},
    { m: '4월', theme: '면접 실전 집중 ②', freq: '주 2회', missions: [
      { t: '면접 시뮬레이션 영상 분석 + 약점 보완', ok: false, type: 'tab', tab: 'simulation' },
      { t: '자소서 예상질문 전체 답변 완성', ok: false, type: 'tab', tab: 'expect' },
      { t: '기출 꼬리질문 집중 연습', ok: false, type: 'tab', tab: 'past' },
      { t: '독서 감상 최종 발표', ok: false, type: 'tab', tab: 'book' },
    ]},
    { m: '6월', theme: 'D-90 카운트다운', freq: '주 2회', missions: [
      { t: '면접 전체 점검 - 약점 최종 파악', ok: false, type: 'teacher' },
      { t: '시뮬레이션 집중 반복', ok: false, type: 'tab', tab: 'simulation' },
      { t: '제시문 면접 심화', ok: false, type: 'tab', tab: 'presentation' },
      { t: '숙제 - 면접 답변 최종 정리', ok: false, type: 'tab', tab: 'homework' },
    ]},
    { m: '8월', theme: 'D-30 카운트다운', freq: '주 2~3회', missions: [
      { t: '면접 시뮬레이션 5회 집중', ok: false, type: 'tab', tab: 'simulation' },
      { t: '기출문제 최종 완성', ok: false, type: 'tab', tab: 'past' },
      { t: '자소서 + 예상질문 최종 점검', ok: false, type: 'tab', tab: 'expect' },
      { t: '면접 전날 루틴 설계', ok: false, type: 'teacher' },
    ]},
    { m: '9월', theme: 'D-10/1 카운트다운 + 면접 완주', freq: '면접일 맞춤', missions: [
      { t: 'D-10 전체 최종 점검', ok: false, type: 'teacher' },
      { t: 'D-1 시뮬레이션 1회 - 컨디션 체크', ok: false, type: 'tab', tab: 'simulation' },
      { t: '앞선 면접 피드백 반영 → 다음 면접 보완', ok: false, type: 'teacher' },
      { t: '제시문 면접 최종 점검', ok: false, type: 'tab', tab: 'presentation' },
    ]},
    { m: '11월', theme: '합격 후 마무리', freq: '필요시', missions: [
      { t: '합격 확인 + 마무리', ok: false, type: 'teacher' },
      { t: '고등학교 입학 준비 안내', ok: false, type: 'teacher' },
      { t: '합격 후기 공유', ok: false, type: 'teacher' },
      { t: '중학교 생활 마무리', ok: false, type: 'teacher' },
    ]},
  ],
}

const SEC: React.CSSProperties = {
  border: '0.5px solid #E5E7EB', borderRadius: 12, background: '#fff', padding: 20, marginBottom: 14,
}

export default function RoadmapTab({ student }: { student: any }) {
  const [selMonth, setSelMonth] = useState<number | null>(null)

  const grade = student?.grade || '중1'
  const roadmap = ROADMAP[grade] || ROADMAP['중1']
  const curMonth = new Date().getMonth() + 1 + '월'

  const totalMissions = roadmap.reduce((a: number, m: any) => a + m.missions.length, 0)
  const doneMissions = roadmap.reduce((a: number, m: any) => a + m.missions.filter((x: any) => x.ok).length, 0)
  const overallPct = totalMissions > 0 ? Math.round(doneMissions / totalMissions * 100) : 0
  const selected = selMonth !== null ? roadmap[selMonth] : null

  const scColor = (type: string) => {
    if (type === 'tab') return { bg: '#ECFDF5', c: '#059669', label: '바로가기' }
    return { bg: '#F0FDF4', c: '#15803D', label: '선생님' }
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>

      {/* 스탯 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{ background: '#059669', borderRadius: 8, padding: '6px 14px' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.8)', marginBottom: 1 }}>전체 진행률</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{overallPct}%</div>
        </div>
        {[
          { label: '완료 미션', val: `${doneMissions}/${totalMissions}` },
          { label: '현재 월', val: curMonth },
          { label: '학년', val: grade },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '6px 14px' }}>
            <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 1 }}>{s.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* 월 그리드 + 미션 패널 */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 300px' : '1fr', gap: 16, alignItems: 'start' }}>

        {/* 왼쪽: 월 그리드 */}
        <div style={SEC}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>연간 로드맵 진행 현황</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 14 }}>월을 클릭하면 상세 미션을 확인할 수 있어요.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
            {roadmap.map((m: any, i: number) => {
              const done = m.missions.filter((x: any) => x.ok).length
              const pct = Math.round(done / m.missions.length * 100)
              const isCur = m.m === curMonth
              const isSel = selMonth === i
              return (
                <div key={i} onClick={() => setSelMonth(selMonth === i ? null : i)}
                  style={{ border: `0.5px solid ${isSel ? '#059669' : isCur ? '#6EE7B7' : '#E5E7EB'}`, borderRadius: 10, padding: 12, cursor: 'pointer', background: isSel ? '#ECFDF5' : isCur ? '#F0FDF4' : '#fff' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: isSel ? '#059669' : isCur ? '#6EE7B7' : pct === 100 ? '#ECFDF5' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: isSel ? '#fff' : isCur ? '#fff' : pct === 100 ? '#059669' : '#6B7280', marginBottom: 7 }}>
                    {pct === 100 ? '✓' : m.m.replace('월', '')}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{m.m}</div>
                  <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 7, lineHeight: 1.4 }}>{m.theme}</div>
                  <div style={{ height: 3, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#059669', borderRadius: 99 }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#6B7280' }}>{done}/{m.missions.length} 완료</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 오른쪽: 미션 패널 */}
        {selected && selMonth !== null && (
          <div style={{ ...SEC, borderColor: '#059669', position: 'sticky', top: 0, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{selected.m}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{selected.theme}</div>
                <div style={{ fontSize: 10, color: '#059669', marginTop: 2 }}>{selected.freq}</div>
              </div>
              <div onClick={() => setSelMonth(null)} style={{ cursor: 'pointer', fontSize: 16, color: '#9CA3AF' }}>✕</div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginBottom: 8 }}>미션 목록</div>
            {selected.missions.map((ms: any, mi: number) => {
              const tc = scColor(ms.type)
              return (
                <div key={mi} style={{ padding: '9px 10px', borderRadius: 7, marginBottom: 5, background: ms.ok ? '#ECFDF5' : '#F8F7F5', border: `0.5px solid ${ms.ok ? '#6EE7B7' : '#E5E7EB'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: ms.ok ? '#059669' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', flexShrink: 0 }}>
                      {ms.ok ? '✓' : ''}
                    </div>
                    <span style={{ fontSize: 12, color: ms.ok ? '#059669' : '#6B7280', flex: 1, fontWeight: ms.ok ? 500 : 400 }}>{ms.t}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, background: tc.bg, color: tc.c, padding: '1px 6px', borderRadius: 99, flexShrink: 0 }}>{tc.label}</span>
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