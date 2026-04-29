import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '@/lib/auth/atoms'

const TYPE_COLOR: Record<string, { cls: string; label: string; icon: string }> = {
    S:  { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: '수행평가', icon: '📝' },
    P:  { cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: '스피치', icon: '🎤' },
    I:  { cls: 'bg-pink-50 text-pink-700 border-pink-200', label: '면접', icon: '🎯' },
    J:  { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: '자소서', icon: '📋' },
    R:  { cls: 'bg-blue-50 text-blue-700 border-blue-200', label: '주제탐구', icon: '🔬' },
    C:  { cls: 'bg-lime-50 text-lime-700 border-lime-200', label: '진로', icon: '🏫' },
}

const RATIO: Record<string, { label: string; pct: number; weeks: number; type: string }[]> = {
    '중1': [
        { label: '수행평가', pct: 40, weeks: 13, type: 'S' },
        { label: '스피치',   pct: 20, weeks: 6,  type: 'P' },
        { label: '자소서',   pct: 10, weeks: 3,  type: 'J' },
        { label: '주제탐구', pct: 10, weeks: 3,  type: 'R' },
        { label: '면접',     pct: 10, weeks: 3,  type: 'I' },
        { label: '진로',     pct: 10, weeks: 4,  type: 'C' },
    ],
    '중2': [
        { label: '수행평가', pct: 35, weeks: 11, type: 'S' },
        { label: '스피치',   pct: 20, weeks: 6,  type: 'P' },
        { label: '면접',     pct: 15, weeks: 5,  type: 'I' },
        { label: '자소서',   pct: 15, weeks: 5,  type: 'J' },
        { label: '주제탐구', pct: 10, weeks: 3,  type: 'R' },
        { label: '진로',     pct: 5,  weeks: 2,  type: 'C' },
    ],
    '중3': [
        { label: '면접',     pct: 50, weeks: 16, type: 'I' },
        { label: '자소서',   pct: 15, weeks: 5,  type: 'J' },
        { label: '스피치',   pct: 10, weeks: 3,  type: 'P' },
        { label: '수행평가', pct: 10, weeks: 3,  type: 'S' },
        { label: '진로',     pct: 10, weeks: 3,  type: 'C' },
        { label: '주제탐구', pct: 5,  weeks: 2,  type: 'R' },
    ],
}

const CURRICULUM: Record<string, any[]> = {
    '중1': [
        {
            m: '1M', theme: '시작하기 (OT + 기초)',
            weeks: [
                { w: '1주', t: 'OT · 수행평가 이해', d: '1년 로드맵, 수행평가 구조', type: 'S', ok: false },
                { w: '2주', t: '자기소개 스피치', d: '30초 자기PR 녹화', type: 'P', ok: false },
                { w: '3주', t: '흥미·강점 진단', d: '홀랜드 검사', type: 'C', ok: false },
                { w: '4주', t: '직업 탐색', d: '6대 직업군 조사', type: 'C', ok: false },
            ]
        },
        {
            m: '2M', theme: '논술·서술 기초',
            weeks: [
                { w: '1주', t: '답안 구조 이해', d: '두괄식 구조 학습', type: 'S', ok: false },
                { w: '2주', t: '문단 쓰기', d: '200→400자 훈련', type: 'S', ok: false },
                { w: '3주', t: '주장 글쓰기', d: '근거 제시법', type: 'S', ok: false },
                { w: '4주', t: '실전 논술 1차', d: '첨삭·피드백', type: 'S', ok: false },
            ]
        },
        {
            m: '3M', theme: '주제탐구 + 스피치',
            weeks: [
                { w: '1주', t: '주제 발굴', d: '질문 만들기', type: 'R', ok: false },
                { w: '2주', t: '자료 조사법', d: '출처 표기', type: 'R', ok: false },
                { w: '3주', t: '발성·호흡', d: '복식 호흡', type: 'P', ok: false },
                { w: '4주', t: '자세·제스처', d: '눈 맞춤 훈련', type: 'P', ok: false },
            ]
        },
        {
            m: '4M', theme: '수행평가 유형별 ①',
            weeks: [
                { w: '1주', t: '국어 수행평가 실전', d: '실제 기출 연습', type: 'S', ok: false },
                { w: '2주', t: '사회 수행평가 실전', d: '실제 기출 연습', type: 'S', ok: false },
                { w: '3주', t: '1분 스피치', d: '즉흥 발표', type: 'P', ok: false },
                { w: '4주', t: '발표 실전', d: '과목별 시뮬', type: 'P', ok: false },
            ]
        },
        {
            m: '5M', theme: '고교 탐색 시작',
            weeks: [
                { w: '1주', t: '고교 중요성', d: '합격 사례 분석', type: 'C', ok: false },
                { w: '2주', t: '자사고·특목고 이해', d: '유형 비교', type: 'C', ok: false },
                { w: '3주', t: '면접 맛보기', d: '면접이란?', type: 'I', ok: false },
                { w: '4주', t: '인성 면접 기초', d: '기본 질문 대응', type: 'I', ok: false },
            ]
        },
        {
            m: '6M', theme: '수행평가 유형별 ②',
            weeks: [
                { w: '1주', t: '과학 수행평가', d: '실험 보고서 기초', type: 'S', ok: false },
                { w: '2주', t: '역사 수행평가', d: '주제탐구 연결', type: 'S', ok: false },
                { w: '3주', t: '탐구 보고서 작성', d: '보고서 구조', type: 'R', ok: false },
                { w: '4주', t: '생기부 항목 이해', d: '세특·활동', type: 'J', ok: false },
            ]
        },
        {
            m: '7M', theme: '종합 실전',
            weeks: [
                { w: '1주', t: '실전 논술 2차', d: '심화 첨삭', type: 'S', ok: false },
                { w: '2주', t: '스토리텔링 스피치', d: '경험 발표', type: 'P', ok: false },
                { w: '3주', t: '생기부 작성법', d: '항목별 글쓰기', type: 'J', ok: false },
                { w: '4주', t: '모의 면접 1차', d: '1:1 면접', type: 'I', ok: false },
            ]
        },
        {
            m: '8M', theme: '마무리 + 포트폴리오',
            weeks: [
                { w: '1주', t: '실전 논술 3차', d: '최종 완성본', type: 'S', ok: false },
                { w: '2주', t: '자기소개서 기초', d: '첫 초안 작성', type: 'J', ok: false },
                { w: '3주', t: '스피치 완성', d: '녹화·피드백', type: 'P', ok: false },
                { w: '4주', t: '학부모 발표회', d: '1년 포트폴리오 발표', type: 'P', ok: false },
            ]
        },
    ],
    '중2': [
        {
            m: '1M', theme: '중2 전략 재설정',
            weeks: [
                { w: '1주', t: '중2 OT · 내신 전략', d: '수행평가 50% 재설정', type: 'S', ok: false },
                { w: '2주', t: '중1 리뷰 + 목표 TOP3', d: '지망 고교 3개 선정', type: 'C', ok: false },
                { w: '3주', t: '국어 논술 심화', d: '기출 분석', type: 'S', ok: false },
                { w: '4주', t: '사회 논술 심화', d: '이슈 기반 글쓰기', type: 'S', ok: false },
            ]
        },
        {
            m: '2M', theme: '논술·서술 심화',
            weeks: [
                { w: '1주', t: '역사 논술', d: '연대·인과 구조', type: 'S', ok: false },
                { w: '2주', t: '수학 서술', d: '풀이 서술법', type: 'S', ok: false },
                { w: '3주', t: '통합 논술 실전', d: '3과목 통합', type: 'S', ok: false },
                { w: '4주', t: '설득 스피치', d: '설득 구조 훈련', type: 'P', ok: false },
            ]
        },
        {
            m: '3M', theme: '주제탐구 심화',
            weeks: [
                { w: '1주', t: '역사 탐구', d: '주제 2개 선정', type: 'R', ok: false },
                { w: '2주', t: '과학 탐구', d: '실험·분석·결론', type: 'R', ok: false },
                { w: '3주', t: '기가 보고서', d: '탐구 활동 실무', type: 'R', ok: false },
                { w: '4주', t: '토론 스피치', d: '찬반 토론 기초', type: 'P', ok: false },
            ]
        },
        {
            m: '4M', theme: '고입 전형 이해 + 내신 전략',
            weeks: [
                { w: '1주', t: '고입 전형 구조', d: '1·2단계 이해', type: 'I', ok: false },
                { w: '2주', t: '내신 반영 분석', d: '학교별 비율', type: 'J', ok: false },
                { w: '3주', t: '합격 내신 갭 분석', d: '필요 등급', type: 'J', ok: false },
                { w: '4주', t: '목표 전략서 작성', d: '등급·계획', type: 'J', ok: false },
            ]
        },
        {
            m: '5M', theme: '자기주도학습계획서 기초',
            weeks: [
                { w: '1주', t: '자소서 항목 이해', d: '요구 포인트', type: 'J', ok: false },
                { w: '2주', t: 'STAR 경험 정리', d: '구조화', type: 'J', ok: false },
                { w: '3주', t: '초안 작성', d: '항목별 초안', type: 'J', ok: false },
                { w: '4주', t: '발표 스피치 심화', d: '자세 완성', type: 'P', ok: false },
            ]
        },
        {
            m: '6M', theme: '면접 기초 시작',
            weeks: [
                { w: '1주', t: '인성 면접 유형', d: '공동체·리더십', type: 'I', ok: false },
                { w: '2주', t: '두괄식 답변 구조', d: '답변 훈련', type: 'I', ok: false },
                { w: '3주', t: '답변집 20개 제작', d: '녹화·피드백', type: 'I', ok: false },
                { w: '4주', t: '스피치 실전', d: '과목별 발표', type: 'P', ok: false },
            ]
        },
        {
            m: '7M', theme: '면접 심화 + 학교별 기출',
            weeks: [
                { w: '1주', t: '지원동기 답변', d: '학교+진로 연결', type: 'I', ok: false },
                { w: '2주', t: '기출 분석', d: '지망별 3년 기출', type: 'S', ok: false },
                { w: '3주', t: '수행평가 종합 1', d: '국·사·역 통합', type: 'S', ok: false },
                { w: '4주', t: '수행평가 종합 2', d: '과·기가 통합', type: 'S', ok: false },
            ]
        },
        {
            m: '8M', theme: '중간 점검 + 중3 준비',
            weeks: [
                { w: '1주', t: '성과 점검 발표회', d: '1년 발표', type: 'P', ok: false },
                { w: '2주', t: '취약점 진단', d: '우선순위 재설정', type: 'S', ok: false },
                { w: '3주', t: '중3 대비 계획', d: '방학 플랜', type: 'C', ok: false },
                { w: '4주', t: '중3 로드맵 발표', d: '중간 리포트', type: 'P', ok: false },
            ]
        },
    ],
    '중3': [
        {
            m: '1M', theme: '전형 완전 정복 + 개인 전략',
            weeks: [
                { w: '1주', t: 'OT · 개인 진단', d: '개인 강점 분석', type: 'I', ok: false },
                { w: '2주', t: '고입 전형 완전 이해', d: '자사고·특목·영재', type: 'I', ok: false },
                { w: '3주', t: '3지망 확정', d: '1·2·3지망 분석', type: 'C', ok: false },
                { w: '4주', t: '맞춤 합격 전략', d: '합격 포지셔닝', type: 'C', ok: false },
            ]
        },
        {
            m: '2M', theme: '자기주도학습계획서 완성',
            weeks: [
                { w: '1주', t: '항목 분석', d: '평가 기준 파악', type: 'J', ok: false },
                { w: '2주', t: '3년 경험 정리', d: 'STAR 구조', type: 'J', ok: false },
                { w: '3주', t: '항목별 초안', d: '4개 문항', type: 'J', ok: false },
                { w: '4주', t: '완성본 제출', d: '학교별 맞춤', type: 'J', ok: false },
            ]
        },
        {
            m: '3M', theme: '독서 면접 대비',
            weeks: [
                { w: '1주', t: '독서 면접 유형', d: '자사고 유형', type: 'I', ok: false },
                { w: '2주', t: '전공별 독서 3권', d: '계열별 선정', type: 'R', ok: false },
                { w: '3주', t: '책 기반 질문 대비', d: '답변 구조', type: 'I', ok: false },
                { w: '4주', t: '심층 토론 연습', d: '꼬리질문 대응', type: 'I', ok: false },
            ]
        },
        {
            m: '4M', theme: '인성 면접 훈련',
            weeks: [
                { w: '1주', t: '인성 평가 요소', d: '학교별 중시도', type: 'I', ok: false },
                { w: '2주', t: '리더십 답변 (STAR)', d: '구조화', type: 'I', ok: false },
                { w: '3주', t: '배려·성실성 답변', d: '갈등 해결 사례', type: 'I', ok: false },
                { w: '4주', t: '답변집 30개 제작', d: '녹화 피드백', type: 'I', ok: false },
            ]
        },
        {
            m: '5M', theme: '전공·학업 면접',
            weeks: [
                { w: '1주', t: '지원동기 완성', d: '학교+진로 연결', type: 'I', ok: false },
                { w: '2주', t: '학업 계획 답변', d: '입학 후 설계', type: 'I', ok: false },
                { w: '3주', t: '전공 지식 대응', d: '모르는 질문 대처', type: 'I', ok: false },
                { w: '4주', t: '답변집 30개 완성', d: '전공·학업', type: 'I', ok: false },
            ]
        },
        {
            m: '6M', theme: '학교별 기출 & 맞춤',
            weeks: [
                { w: '1주', t: '1지망 기출 5년', d: '심층 분석', type: 'S', ok: false },
                { w: '2주', t: '1지망 답변집 40개', d: '학교 맞춤', type: 'I', ok: false },
                { w: '3주', t: '2지망 답변집 30개', d: '차별화', type: 'I', ok: false },
                { w: '4주', t: '3지망 답변집 30개', d: '안정성', type: 'I', ok: false },
            ]
        },
        {
            m: '7M', theme: 'AI 압박면접 & 실전',
            weeks: [
                { w: '1주', t: 'AI 모의면접 1차', d: '전체 녹화·분석', type: 'I', ok: false },
                { w: '2주', t: '꼬리질문 대응', d: '압박 대응', type: 'I', ok: false },
                { w: '3주', t: 'AI 모의면접 2차', d: '난이도 상승', type: 'I', ok: false },
                { w: '4주', t: '대면 모의 면접', d: '실제 면접관 투입', type: 'I', ok: false },
            ]
        },
        {
            m: '8M', theme: '최종 리허설 & 파이널',
            weeks: [
                { w: '1주', t: '최종 점검', d: '약점 보완', type: 'S', ok: false },
                { w: '2주', t: '리허설 1차 (1·2지망)', d: '완전 실전', type: 'P', ok: false },
                { w: '3주', t: '리허설 2차 (3지망)', d: '최종 피드백', type: 'P', ok: false },
                { w: '4주', t: '파이널 · 1:1 면접', d: 'D-day 직전', type: 'I', ok: false },
            ]
        },
    ],
}

export default function MiddleRoadmap() {
    const student = useAtomValue(studentState)
    const academy = useAtomValue(academyState)
    const [selMonth, setSelMonth] = useState<number | null>(null)
    const [selGrade, setSelGrade] = useState<string>(student?.grade || '중1')

    const roadmap = CURRICULUM[selGrade] || CURRICULUM['중1']
    const ratio = RATIO[selGrade] || RATIO['중1']

    const totalWeeks = roadmap.reduce((a: number, m: any) => a + m.weeks.length, 0)
    const doneWeeks = roadmap.reduce((a: number, m: any) => a + m.weeks.filter((x: any) => x.ok).length, 0)
    const overallPct = totalWeeks > 0 ? Math.round(doneWeeks / totalWeeks * 100) : 0
    const selected = selMonth !== null ? roadmap[selMonth] : null

    return (
        <div className="h-full overflow-y-auto px-8 py-7 box-border font-sans text-ink">

            {/* 헤더 */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-brand-middle text-white flex items-center justify-center text-[13px] font-bold">
                        {student?.name?.[0]}
                    </div>
                    <div>
                        <div className="text-[15px] font-bold text-ink">{student?.name}</div>
                        <div className="text-[11px] text-ink-secondary font-medium">{selGrade} · {academy?.academyName || '학원 미연결'}</div>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                    {['중1', '중2', '중3'].map(g => (
                        <button
                            key={g}
                            onClick={() => { setSelGrade(g); setSelMonth(null) }}
                            className={`px-4 py-1.5 rounded-md text-[12px] font-bold transition-all ${
                                selGrade === g
                                    ? 'bg-white text-brand-middle-dark shadow-sm'
                                    : 'text-ink-secondary hover:text-ink'
                            }`}
                        >
                            {g} {g === student?.grade && <span className="text-[9px] text-amber-500 ml-0.5">내</span>}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-brand-middle-dark to-brand-middle rounded-xl px-4 py-2 shadow-[0_4px_12px_rgba(16,185,129,0.2)]">
                        <div className="text-[10px] text-white/80 mb-0.5 font-medium">진행률</div>
                        <div className="text-[15px] font-extrabold text-white">{overallPct}%</div>
                    </div>
                    <div className="bg-white border border-line rounded-xl px-4 py-2">
                        <div className="text-[10px] text-ink-secondary mb-0.5 font-medium">완료</div>
                        <div className="text-[15px] font-extrabold text-ink">{doneWeeks}/{totalWeeks}주</div>
                    </div>
                </div>
            </div>

            {/* 비율 요약 바 */}
            <div className="bg-white border border-line rounded-xl p-4 mb-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-[13px] font-extrabold text-ink">{selGrade} 커리큘럼 구성 (32주)</div>
                    <div className="text-[11px] text-ink-secondary">총 {totalWeeks}주</div>
                </div>
                <div className="flex w-full h-2 rounded-full overflow-hidden mb-2">
                    {ratio.map((r, i) => {
                        const color = TYPE_COLOR[r.type]
                        const bgCls = color.cls.split(' ')[0].replace('bg-', 'bg-').replace('-50', '-400')
                        return (
                            <div
                                key={i}
                                style={{ width: `${r.pct}%` }}
                                className={bgCls}
                                title={`${r.label} ${r.pct}%`}
                            />
                        )
                    })}
                </div>
                <div className="flex flex-wrap gap-2.5 text-[11px]">
                    {ratio.map((r, i) => {
                        const c = TYPE_COLOR[r.type]
                        return (
                            <div key={i} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${c.cls}`}>
                                <span>{c.icon}</span>
                                <span className="font-semibold">{r.label}</span>
                                <span className="font-extrabold">{r.pct}%</span>
                                <span className="text-ink-muted">({r.weeks}주)</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* 월 그리드 + 주차 패널 */}
            <div className={`grid gap-4 items-start ${selected ? 'grid-cols-[1fr_340px] max-lg:grid-cols-1' : 'grid-cols-1'}`}>

                {/* 왼쪽: 월 그리드 */}
                <div className="bg-white border border-line rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                    <div className="text-[14px] font-bold text-ink mb-1 tracking-tight">연간 커리큘럼 진행 현황</div>
                    <div className="text-[11px] text-ink-secondary mb-4">월을 클릭하면 주차별 수업을 확인할 수 있어요.</div>

                    <div className="grid grid-cols-4 max-md:grid-cols-2 gap-2.5">
                        {roadmap.map((m: any, i: number) => {
                            const done = m.weeks.filter((x: any) => x.ok).length
                            const total = m.weeks.length
                            const pct = Math.round(done / total * 100)
                            const isSel = selMonth === i
                            return (
                                <div
                                    key={i}
                                    onClick={() => setSelMonth(selMonth === i ? null : i)}
                                    className={`border rounded-xl p-3 cursor-pointer transition-all hover:-translate-y-0.5 ${
                                        isSel
                                            ? 'border-brand-middle bg-brand-middle-pale shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
                                            : pct === 100
                                                ? 'border-brand-middle-light bg-brand-middle-pale/50 hover:shadow-sm'
                                                : 'border-line bg-white hover:border-brand-middle-light hover:shadow-sm'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className={`w-9 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold ${
                                            isSel
                                                ? 'bg-brand-middle text-white'
                                                : pct === 100
                                                    ? 'bg-brand-middle-bg text-brand-middle-dark'
                                                    : 'bg-gray-100 text-ink-secondary'
                                        }`}>
                                            {pct === 100 ? '✓' : m.m}
                                        </div>
                                        <div className="text-[10px] text-ink-muted font-medium">{done}/{total}</div>
                                    </div>
                                    <div className="text-[12.5px] font-bold text-ink mb-0.5 leading-tight line-clamp-2 min-h-[32px]">{m.theme}</div>
                                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-brand-middle-dark' : 'bg-brand-middle'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* 오른쪽: 주차별 패널 (스크롤 X, 컴팩트) */}
                {selected && selMonth !== null && (
                    <div className="bg-white border-2 border-brand-middle rounded-2xl p-4 shadow-[0_8px_24px_rgba(16,185,129,0.12)]">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-[10px] font-extrabold text-white bg-brand-middle px-2 py-0.5 rounded">{selected.m}</span>
                                    <span className="text-[10px] font-semibold text-ink-muted">{selGrade}</span>
                                </div>
                                <div className="text-[13px] font-extrabold text-ink tracking-tight leading-tight">{selected.theme}</div>
                            </div>
                            <button
                                onClick={() => setSelMonth(null)}
                                className="text-ink-muted hover:text-ink text-base leading-none w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">주차별 수업</div>

                        <div className="space-y-1.5">
                            {selected.weeks.map((wk: any, wi: number) => {
                                const tc = TYPE_COLOR[wk.type]
                                return (
                                    <div
                                        key={wi}
                                        className={`px-2.5 py-2 rounded-lg border transition-all ${
                                            wk.ok
                                                ? 'bg-brand-middle-pale border-brand-middle-light'
                                                : 'bg-gray-50 border-line hover:border-brand-middle-light hover:shadow-sm cursor-pointer'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white flex-shrink-0 mt-0.5 ${
                                                wk.ok ? 'bg-brand-middle' : 'bg-gray-300'
                                            }`}>
                                                {wk.ok ? '✓' : ''}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                                    <span className="text-[10px] font-extrabold text-brand-middle-dark">{wk.w}</span>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${tc.cls}`}>
                                                        {tc.icon} {tc.label}
                                                    </span>
                                                </div>
                                                <div className={`text-[12px] font-bold leading-[1.3] mb-0.5 ${
                                                    wk.ok ? 'text-brand-middle-dark' : 'text-ink'
                                                }`}>
                                                    {wk.t}
                                                </div>
                                                <div className="text-[10.5px] text-ink-secondary leading-[1.4]">
                                                    {wk.d}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}