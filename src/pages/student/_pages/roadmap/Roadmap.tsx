import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '../../_store/auth'

const ROADMAP: Record<string, any[]> = {
  '고1': [
    { m: '1월', theme: '겨울방학 집중 - 방향 설정', freq: '주 2회 (2주)', missions: [
      { t: '학과 적합도 정밀진단 (200문항)', ok: false, type: 'inAnswer', url: 'https://in-answer.com' },
      { t: '진로진학 AI로 관심 계열 및 학과 탐색', ok: false, type: 'inAnswer', url: 'https://in-answer.com' },
      { t: '관심 학과 방향 결정', ok: false, type: 'teacher' },
      { t: '고1 1년 로드맵 학부모 공유', ok: false, type: 'teacher' },
    ]},
    { m: '2월', theme: '겨울방학 집중 - 탐구 설계', freq: '주 1회 (4주)', missions: [
      { t: '세특라이트로 1학기 탐구주제 미리 설계', ok: false, type: 'tab', tab: 'topic' },
      { t: '전공특화문제 기초 전공 지식 첫 점검', ok: false, type: 'tab', tab: 'major' },
      { t: '동아리 계열 연결 계획 수립', ok: false, type: 'teacher' },
      { t: '진로진학 AI 독서 리스트 추천', ok: false, type: 'tab', tab: 'book' },
    ]},
    { m: '3월', theme: '방향 확정 + 탐구 실행 시작', freq: '주 2회 (2주)', missions: [
      { t: '겨울방학에 설계한 탐구주제 실행 시작', ok: false, type: 'tab', tab: 'topic' },
      { t: '동아리 선택 - 계열 및 학과 연결', ok: false, type: 'teacher' },
      { t: '수행평가 주제 입시 연결 전략', ok: false, type: 'teacher' },
      { t: '예상 생기부 문구 확인', ok: false, type: 'tab', tab: 'expect' },
    ]},
    { m: '5월', theme: '수행평가 + 탐구 병행', freq: '주 2회 (2주)', missions: [
      { t: '수행평가 주제 입시 연결 점검', ok: false, type: 'teacher' },
      { t: '세특라이트 탐구활동 중간 점검', ok: false, type: 'tab', tab: 'topic' },
      { t: '1학기 탐구 마무리 방향 설정', ok: false, type: 'teacher' },
      { t: '2학기 탐구주제 미리 구상', ok: false, type: 'tab', tab: 'topic' },
    ]},
    { m: '7월', theme: '여름방학 집중 ① - 전공 + 스피치', freq: '주 2회 (2주)', missions: [
      { t: '전공특화문제 완성', ok: false, type: 'tab', tab: 'major' },
      { t: '2학기 탐구주제 확정', ok: false, type: 'tab', tab: 'topic' },
      { t: '스피치 훈련 시작 - 말하는 습관 교정', ok: false, type: 'tab', tab: 'simulation' },
      { t: '자기소개 / 지원동기 답변 초안 작성', ok: false, type: 'tab', tab: 'expect' },
    ]},
    { m: '8월', theme: '여름방학 집중 ② - 면접 기초', freq: '주 1회 (4주)', missions: [
      { t: '장단점 / 학과 선택 이유 답변 작성', ok: false, type: 'tab', tab: 'expect' },
      { t: '실전 면접 시뮬레이션 1회 체험', ok: false, type: 'tab', tab: 'simulation' },
      { t: '시뮬레이션 영상 분석 + 약점 파악', ok: false, type: 'teacher' },
      { t: '9월 2학기 탐구주제 실행 준비', ok: false, type: 'tab', tab: 'topic' },
    ]},
    { m: '10월', theme: '기출 경험 + 꼬리질문', freq: '주 1회 (4주)', missions: [
      { t: '지원 희망 대학 기출문제 처음 접하기', ok: false, type: 'tab', tab: 'past' },
      { t: '학과별 기출 내 학과 집중 풀기', ok: false, type: 'tab', tab: 'past' },
      { t: '꼬리질문 어떤 게 나오는지 파악', ok: false, type: 'tab', tab: 'expect' },
      { t: '스피치 훈련 심화', ok: false, type: 'tab', tab: 'simulation' },
    ]},
    { m: '12월', theme: '1년 마무리 + 고2 준비', freq: '주 1회 (4주)', missions: [
      { t: '1년 탐구활동 정리 / 생기부 업로드 예상질문', ok: false, type: 'tab', tab: 'expect' },
      { t: '꼬리질문 대비 연습', ok: false, type: 'tab', tab: 'expect' },
      { t: '실전 면접 시뮬레이션 1회', ok: false, type: 'tab', tab: 'simulation' },
      { t: '고2 겨울방학 커리큘럼 설계', ok: false, type: 'teacher' },
    ]},
  ],
  '고2': [
    { m: '1월', theme: '고1 연결 점검 + 고2 전략 수립 ①', freq: '주 2회 (2주)', missions: [
      { t: '고1 생기부 업로드 → 현재 스토리 점검 및 갭 분석', ok: false, type: 'tab', tab: 'expect' },
      { t: '학과 확정 후 고2 탐구 방향 재설계', ok: false, type: 'teacher' },
      { t: '고1 활동과 연결고리 만들기', ok: false, type: 'teacher' },
      { t: '고1-고2 연결 스토리 설계', ok: false, type: 'teacher' },
    ]},
    { m: '2월', theme: '고1 연결 점검 + 고2 전략 수립 ②', freq: '주 1회 (4주)', missions: [
      { t: '세특라이트로 학과 맞춤 심화 탐구주제 선택', ok: false, type: 'tab', tab: 'topic' },
      { t: '전공특화문제 심화 — 고1 부족 부분 집중 보완', ok: false, type: 'tab', tab: 'major' },
      { t: '생기부 예상문제로 현재 질문 확인', ok: false, type: 'tab', tab: 'expect' },
      { t: '진로진학 AI로 독서 리스트 심화 추천', ok: false, type: 'tab', tab: 'book' },
    ]},
    { m: '3월', theme: '심화 탐구 실행 시작', freq: '주 1회 (4주)', missions: [
      { t: '겨울방학에 설계한 심화 탐구주제 실행 시작', ok: false, type: 'tab', tab: 'topic' },
      { t: '고1-고2 탐구 연결성 점검하며 진행', ok: false, type: 'teacher' },
      { t: '생기부 예상문제로 현재 생기부 질문 미리 확인', ok: false, type: 'tab', tab: 'expect' },
      { t: '진로진학 AI로 학과별 독서 리스트 심화 추천', ok: false, type: 'tab', tab: 'book' },
    ]},
    { m: '5월', theme: '수행평가 심화 + 면접 답변 동시 준비', freq: '주 1회 (4주)', missions: [
      { t: '수행평가 주제를 학과 스토리와 연결 — 고1보다 심화', ok: false, type: 'teacher' },
      { t: '전공특화문제로 수행평가 관련 전공 지식 보완', ok: false, type: 'tab', tab: 'major' },
      { t: '수행평가 하면서 면접 답변 초안 동시 작성', ok: false, type: 'tab', tab: 'expect' },
      { t: '꼬리질문 어떤 게 나올지 미리 파악 + 생기부 중간 점검', ok: false, type: 'tab', tab: 'expect' },
    ]},
    { m: '7월', theme: '면접 실전 본격화 ① — 생기부 + 기출 시작', freq: '주 2회 (2주)', missions: [
      { t: '1학기 생기부 업로드 → 예상 면접질문 전체 뽑기', ok: false, type: 'tab', tab: 'expect' },
      { t: '지원 희망 대학 기출문제 집중 분석 시작', ok: false, type: 'tab', tab: 'past' },
      { t: '생기부-기출 갭 파악 → 2학기 전략 수립', ok: false, type: 'teacher' },
      { t: '지원 대학 범위 1차 확정', ok: false, type: 'teacher' },
    ]},
    { m: '8월', theme: '면접 실전 본격화 ② — 시뮬레이션 + 제시문', freq: '주 2회 (2주)', missions: [
      { t: '생기부 예상질문 전체 답변 작성 + 대학별 분석', ok: false, type: 'tab', tab: 'expect' },
      { t: '실전 면접 시뮬레이션 2~3회 반복 (영상 + 음성 분석)', ok: false, type: 'tab', tab: 'simulation' },
      { t: 'SKY·교대 지원자 → 제시문 면접 준비 시작', ok: false, type: 'tab', tab: 'presentation' },
      { t: '꼬리질문 집중 대비 — 학과 맞춤 심화', ok: false, type: 'tab', tab: 'expect' },
    ]},
    { m: '10월', theme: '기출 완성 + 제시문 심화 + 2학기 탐구', freq: '주 1~2회', missions: [
      { t: '2학기 탐구활동 실행 — 고1-고2 연결성 완성', ok: false, type: 'tab', tab: 'topic' },
      { t: '지원 대학 기출 2~3회차 반복 → 패턴 완전히 파악', ok: false, type: 'tab', tab: 'past' },
      { t: 'SKY·교대 지원자 → 제시문 심화 답변 완성도 높이기', ok: false, type: 'tab', tab: 'presentation' },
      { t: '꼬리질문 실전 연습 심화 + 스피치 업그레이드', ok: false, type: 'tab', tab: 'simulation' },
    ]},
    { m: '12월', theme: '면접 90% 완성 + 고3 준비', freq: '주 2회 (2주)', missions: [
      { t: '고1~고2 전체 생기부 예상질문 총정리', ok: false, type: 'tab', tab: 'expect' },
      { t: '실전 면접 시뮬레이션 3회 이상 — 약점 최종 보완', ok: false, type: 'tab', tab: 'simulation' },
      { t: '부족한 전공 지식 마지막 점검', ok: false, type: 'tab', tab: 'major' },
      { t: '고3 로드맵 설계 — 지원 대학 최종 확정', ok: false, type: 'teacher' },
    ]},
  ],
  '고3': [
    { m: '1월', theme: '생기부 마지막 탐구주제 설계 ①', freq: '주 2회 (2주)', missions: [
      { t: '세특라이트로 고3 마지막 탐구주제 선택', ok: false, type: 'tab', tab: 'topic' },
      { t: '진로진학 AI로 독서 리스트 + 탐구 방향 최종 점검', ok: false, type: 'tab', tab: 'book' },
      { t: '학과 스토리 완성에 필요한 활동 설계', ok: false, type: 'teacher' },
      { t: '지원 대학 범위 사전 점검', ok: false, type: 'teacher' },
    ]},
    { m: '2월', theme: '생기부 마지막 탐구주제 설계 ②', freq: '주 1회 (4주)', missions: [
      { t: '전공특화문제로 기초 전공 지식 점검 — 면접 답변 재료 확보', ok: false, type: 'tab', tab: 'major' },
      { t: '지금까지 생기부 업로드 → 예상질문 뽑아서 부족한 부분 파악', ok: false, type: 'tab', tab: 'expect' },
      { t: '고1·고2 연결 스토리 최종 점검', ok: false, type: 'teacher' },
      { t: '면접 답변 방향 설계', ok: false, type: 'teacher' },
    ]},
    { m: '3월', theme: '탐구 실행 + 수행평가 마무리', freq: '주 1회 (4주)', missions: [
      { t: '겨울방학 설계 탐구주제 실행 — 고1·고2 연결 스토리 완성', ok: false, type: 'tab', tab: 'topic' },
      { t: '수행평가 주제 학과와 연결 — 마지막 학기 전략적 활용', ok: false, type: 'teacher' },
      { t: '세특라이트로 탐구 방향 점검 + 예상 생기부 문구 확인', ok: false, type: 'tab', tab: 'expect' },
      { t: '전공특화문제로 수행평가 관련 전공 지식 동시에 보완', ok: false, type: 'tab', tab: 'major' },
    ]},
    { m: '5월', theme: '생기부 완성 + 대학 제출 전 최종 점검', freq: '주 1~2회', missions: [
      { t: '생기부 완성본 업로드 → 예상 면접질문 전체 뽑기', ok: false, type: 'tab', tab: 'expect' },
      { t: '지원 대학 확정 + 5개년 기출문제 분석 시작', ok: false, type: 'tab', tab: 'past' },
      { t: '스피치 훈련 시작 — 말투·속도·태도 교정', ok: false, type: 'tab', tab: 'simulation' },
      { t: '생기부-기출 갭 분석 → 여름방학 집중 계획 수립', ok: false, type: 'teacher' },
    ]},
    { m: '7월', theme: '수시 직전 최종 완성 ①', freq: '주 2~3회', missions: [
      { t: '생기부 예상질문 전체 답변 완성 + 대학별 맞춤 분석', ok: false, type: 'tab', tab: 'expect' },
      { t: '기출문제 집중 완성 — 지원 대학 패턴 완전히 내 것으로', ok: false, type: 'tab', tab: 'past' },
      { t: 'SKY·교대 지원자 → 꼬리질문 집중 대비', ok: false, type: 'tab', tab: 'expect' },
      { t: '지원 대학 최종 확정', ok: false, type: 'teacher' },
    ]},
    { m: '8월', theme: '수시 직전 최종 완성 ②', freq: '주 2~3회', missions: [
      { t: '실전 면접 시뮬레이션 3~5회 집중 반복', ok: false, type: 'tab', tab: 'simulation' },
      { t: '영상·음성 분석 후 약점 최종 보완', ok: false, type: 'teacher' },
      { t: 'SKY·교대 지원자 → 제시문 최종 완성 + 꼬리질문', ok: false, type: 'tab', tab: 'presentation' },
      { t: '면접 전날 루틴 완성', ok: false, type: 'teacher' },
    ]},
    { m: '10월', theme: '수시 면접 완주', freq: '면접일 맞춤', missions: [
      { t: '면접 일정 확인 후 대학별 맞춤 최종 점검', ok: false, type: 'teacher' },
      { t: '면접 전날 시뮬레이션 1회 — 긴장감 조절 + 컨디션 체크', ok: false, type: 'tab', tab: 'simulation' },
      { t: '앞선 면접 피드백 반영 → 다음 면접 바로 보완', ok: false, type: 'teacher' },
      { t: 'SKY·교대 제시문 면접 최종 점검', ok: false, type: 'tab', tab: 'presentation' },
    ]},
    { m: '12월', theme: '수시 결과 확인 + 마무리', freq: '필요시', missions: [
      { t: '수시 합격 → 마무리 및 대학 생활 준비', ok: false, type: 'teacher' },
      { t: '정시 대비 필요 시 → 추가 전략 수립', ok: false, type: 'teacher' },
      { t: '합격 후기 공유', ok: false, type: 'teacher' },
      { t: '고등학교 생활 마무리', ok: false, type: 'teacher' },
    ]},
  ],
}

const SEC: React.CSSProperties = { border: '0.5px solid #E5E7EB', borderRadius: 12, background: '#fff', padding: 20, marginBottom: 14 }

export default function Roadmap() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const [selMonth, setSelMonth] = useState<number | null>(null)
  const navigate = useNavigate()

  const grade = student?.grade || '고1'
  const roadmap = ROADMAP[grade] || ROADMAP['고1']
  const curMonth = new Date().getMonth() + 1 + '월'

  const totalMissions = roadmap.reduce((a: number, m: any) => a + m.missions.length, 0)
  const doneMissions = roadmap.reduce((a: number, m: any) => a + m.missions.filter((x: any) => x.ok).length, 0)
  const overallPct = totalMissions > 0 ? Math.round(doneMissions / totalMissions * 100) : 0
  const selected = selMonth !== null ? roadmap[selMonth] : null

  const scColor = (type: string) => {
    if (type === 'inAnswer') return { bg: '#EDE9FE', c: '#6D28D9', label: '인로드' }
    if (type === 'tab') return { bg: '#EEF2FF', c: '#3B5BDB', label: '바로가기' }
    return { bg: '#F0FDF4', c: '#15803D', label: '선생님' }
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* 학생 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EEF2FF', color: '#3B5BDB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600 }}>
          {student?.name?.[0]}
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{student?.name}</div>
          <div style={{ fontSize: 12, color: '#6B7280' }}>{grade} · {academy.academyName || '학원 미연결'}</div>
        </div>
      </div>

      {/* 스탯 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: '전체 진행률', val: `${overallPct}%`, accent: true },
          { label: '완료 미션', val: `${doneMissions}/${totalMissions}`, accent: false },
          { label: '현재 월', val: curMonth, accent: false },
          { label: '소속 학원', val: academy.academyName || '미소속', accent: false },
        ].map((s, i) => (
          <div key={i} style={{ background: s.accent ? '#3B5BDB' : '#fff', border: `0.5px solid ${s.accent ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: s.accent ? 'rgba(255,255,255,.8)' : '#6B7280', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.accent ? '#fff' : '#1a1a1a' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* 월 그리드 + 미션 패널 */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 300px' : '1fr', gap: 16 }}>
        <div>
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
                    style={{ border: `0.5px solid ${isSel ? '#3B5BDB' : isCur ? '#BAC8FF' : '#E5E7EB'}`, borderRadius: 10, padding: 12, cursor: 'pointer', background: isSel ? '#EEF2FF' : isCur ? '#F5F8FF' : '#fff' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: isSel ? '#3B5BDB' : isCur ? '#BAC8FF' : pct === 100 ? '#ECFDF5' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: isSel ? '#fff' : isCur ? '#fff' : pct === 100 ? '#059669' : '#6B7280', marginBottom: 7 }}>
                      {pct === 100 ? '✓' : m.m.replace('월', '')}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{m.m}</div>
                    <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 7, lineHeight: 1.4 }}>{m.theme}</div>
                    <div style={{ height: 3, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#059669' : '#3B5BDB', borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#6B7280' }}>{done}/{m.missions.length} 완료</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 미션 패널 */}
        {selected && selMonth !== null && (
          <div style={{ ...SEC, borderColor: '#3B5BDB', height: 'fit-content', position: 'sticky', top: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{selected.m}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{selected.theme}</div>
                <div style={{ fontSize: 10, color: '#3B5BDB', marginTop: 2 }}>{selected.freq}</div>
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
                  {ms.type === 'tab' && (
                    <div style={{ paddingLeft: 23, marginTop: 5 }}>
                      <button onClick={() => navigate(`/student/${ms.tab}`)}
                        style={{ fontSize: 10, fontWeight: 700, color: '#3B5BDB', background: '#EEF2FF', border: '0.5px solid #BAC8FF', padding: '3px 9px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
                        바로가기 →
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            <div style={{ marginTop: 10, padding: '8px 10px', background: '#F8F7F5', borderRadius: 8, fontSize: 11, color: '#9CA3AF' }}>
              미션을 완료하면 선생님이 확인 후 초록불을 켜드려요.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}