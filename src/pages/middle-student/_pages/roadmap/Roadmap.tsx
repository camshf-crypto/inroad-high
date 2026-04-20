import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '../../_store/auth'

const TYPE_COLOR: Record<string, { cls: string; label: string }> = {
    E: { cls: 'bg-[#EEF2FF] text-[#3B5BDB]', label: '표현' },
    U: { cls: 'bg-amber-50 text-amber-700', label: '이해' },
    S: { cls: 'bg-brand-middle-bg text-brand-middle-dark', label: '자기계발' },
    M: { cls: 'bg-[#F5F3FF] text-[#7C3AED]', label: '면접' },
}

const CURRICULUM: Record<string, any[]> = {
    '중1': [
        {
            m: '1월', theme: '방학특강 · 자기PR + 진로탐색', freq: '주 1회 (4주)', missions: [
                { t: '말하는 나를 발견하다 — 자기PR 마인드셋', ok: false, type: 'E' },
                { t: '생각을 기획하는 힘 — 나만의 동아리 설계 입문', ok: false, type: 'E' },
                { t: '진로 키워드 탐색 스피치 — 꿈 찾기 활동', ok: false, type: 'S' },
                { t: '직업탐색 스피치 — 내가 되고 싶은 직업군 발표', ok: false, type: 'S' },
            ]
        },
        {
            m: '2월', theme: '방학특강 · 독서 + 자기주도학습', freq: '주 1회 (4주)', missions: [
                { t: '책 속의 나를 말하다 — 독서기록장 작성', ok: false, type: 'E' },
                { t: '자기주도적 학습 스피치 — 정의와 사례', ok: false, type: 'U' },
                { t: '학습법/목표관리 스피치 — 과목별 학습법 기초', ok: false, type: 'U' },
                { t: '진로 발표회 — 진로 주제 첫 발표 및 피드백', ok: false, type: 'S' },
            ]
        },
        {
            m: '3월', theme: '나의 강점 + 설득 스피치', freq: '주 1회 (4주)', missions: [
                { t: '나의 강점을 말하다 — VIA 강점 진단 기초', ok: false, type: 'E' },
                { t: '한줄의 근거로 설득하기 — 1문장 주장 훈련', ok: false, type: 'E' },
                { t: '셀프리더십 스피치 — 학교생활 중 리더십 활동', ok: false, type: 'U' },
                { t: '진로 뉴스 발표 — 관련 기사 요약 및 의견 말하기', ok: false, type: 'S' },
            ]
        },
        {
            m: '5월', theme: '수행평가 대비 + 토론 입문', freq: '주 1회 (4주)', missions: [
                { t: '실전 발표 마스터 — 수행평가 대비 발표준비', ok: false, type: 'E' },
                { t: '토론 스피치 — 시사 주제 찬성/반대 기초', ok: false, type: 'U' },
                { t: '문해력 스피치 1 — 1문장 핵심 요약 훈련', ok: false, type: 'U' },
                { t: '동아리 면접 연습 — 시뮬레이션 기초', ok: false, type: 'S' },
            ]
        },
        {
            m: '7월', theme: '스토리텔링 + 문해력', freq: '주 1회 (4주)', missions: [
                { t: '나만의 스토리텔링 — 내가 겪은 일 말하기', ok: false, type: 'E' },
                { t: '문해력 스피치 2 — 2문장 작품 핵심 요약', ok: false, type: 'U' },
                { t: '논리적/비판적 스피치 — 중요 사건 글쓰기 입문', ok: false, type: 'U' },
                { t: '모의 발표/피드백 — 실제 발표 적용 피드백', ok: false, type: 'M' },
            ]
        },
        {
            m: '8월', theme: '방학특강 · 자소서 + 인성', freq: '주 1회 (4주)', missions: [
                { t: '자기소개서 작성 스피치 1 — 고입 개념 이해', ok: false, type: 'S' },
                { t: '탐구 보고서 스피치 — 자사고/특목고 자소서 이해', ok: false, type: 'S' },
                { t: '인성/가치관 스피치 — 인생에서 중요한 기준 찾기', ok: false, type: 'U' },
                { t: '디자인씽킹 스피치 — 공감·문제정의 프로세스', ok: false, type: 'U' },
            ]
        },
        {
            m: '10월', theme: '리더십 + 생활기록부', freq: '주 1회 (4주)', missions: [
                { t: '리더는 말로 이끈다 — 리더십 영상 보고 발표', ok: false, type: 'E' },
                { t: '스토리텔링 스피치 — 레고 활용 스토리텔링 실습', ok: false, type: 'U' },
                { t: '생활기록부 스피치 — 항목 이해 및 발표 스피치화', ok: false, type: 'S' },
                { t: '면접 스피치 1 — 자사고/특목고 면접 중요성 이해', ok: false, type: 'M' },
            ]
        },
        {
            m: '12월', theme: '면접 스피치 + 진로 발표회', freq: '주 1회 (4주)', missions: [
                { t: '면접 스피치 2 — 우아한 대화법 5원칙 소개', ok: false, type: 'M' },
                { t: '면접 스피치 3 — 고입대비 면접 시뮬레이션 입문', ok: false, type: 'M' },
                { t: '모의 발표/피드백 — 파트너러키 경영', ok: false, type: 'U' },
                { t: '진로 발표회 — 1년 진로 주제 최종 발표', ok: false, type: 'S' },
            ]
        },
    ],
    '중2': [
        {
            m: '1월', theme: '방학특강 · 실전발표 + 자소서', freq: '주 1회 (4주)', missions: [
                { t: '실전 발표 마스터 심화 — 수행평가 실전까지', ok: false, type: 'E' },
                { t: '자기소개서 작성 스피치 2 — 세부항목 분석', ok: false, type: 'S' },
                { t: '토론 스피치 심화 — 찬반/중립 토론 기법 A-Z', ok: false, type: 'U' },
                { t: '진로 키워드 심화 — 학과 연결 자기소개서 초안', ok: false, type: 'S' },
            ]
        },
        {
            m: '2월', theme: '방학특강 · 스토리텔링 심화', freq: '주 1회 (4주)', missions: [
                { t: '나만의 스토리텔링 심화 — 창작 이야기 완성', ok: false, type: 'E' },
                { t: '문해력 스피치 2 심화 — 문학작품 핵심 요약', ok: false, type: 'U' },
                { t: '셀프리더십 심화 — 활동별로 만들기', ok: false, type: 'U' },
                { t: '탐구 보고서 심화 — 자기소개서 작성 준비', ok: false, type: 'S' },
            ]
        },
        {
            m: '3월', theme: '논리/비판 스피치 심화', freq: '주 1회 (4주)', missions: [
                { t: '한줄의 근거 심화 — 1문장 논리 설득 발표', ok: false, type: 'E' },
                { t: '논리적/비판적 스피치 심화 — 글쓰기 완성', ok: false, type: 'U' },
                { t: '동아리 면접 연습 심화 — 면접관 역할 실습', ok: false, type: 'S' },
                { t: '디자인씽킹 심화 — 아이디어→프로토타입 제작', ok: false, type: 'U' },
            ]
        },
        {
            m: '5월', theme: '생기부 + 면접 스피치 심화', freq: '주 1회 (4주)', missions: [
                { t: '생활기록부 스피치 심화 — 세특 항목 분석 발표', ok: false, type: 'S' },
                { t: '면접 스피치 1 심화 — 기출문제 대비 연습', ok: false, type: 'M' },
                { t: '리더는 말로 이끈다 심화 — 리더십 관련 영상 발표', ok: false, type: 'E' },
                { t: '인성/가치관 심화 — 비전/사명/핵심가치 설정', ok: false, type: 'U' },
            ]
        },
        {
            m: '7월', theme: '면접 스피치 실전', freq: '주 1회 (4주)', missions: [
                { t: '면접 스피치 2 심화 — 5원칙 적용 실전 연습', ok: false, type: 'M' },
                { t: '면접 스피치 3 심화 — 3P 스피치 목적·사람·장소', ok: false, type: 'M' },
                { t: '스토리텔링 스피치 심화 — 고입대비 스토리 구성', ok: false, type: 'U' },
                { t: '모의 발표/피드백 — 면접 실제 적용 피드백', ok: false, type: 'M' },
            ]
        },
        {
            m: '8월', theme: '방학특강 · 자소서 완성', freq: '주 1회 (4주)', missions: [
                { t: '자기소개서 완성본 작성 — 지원학교 맞춤 초안', ok: false, type: 'S' },
                { t: '책 속의 나를 심화 — 독서스피치 완성', ok: false, type: 'E' },
                { t: '자기주도적 학습 심화 — 사례 발표 및 피드백', ok: false, type: 'U' },
                { t: '진로 뉴스 발표 심화 — 찬반 토론 연계', ok: false, type: 'S' },
            ]
        },
        {
            m: '10월', theme: '면접 기출 + 생기부 완성', freq: '주 1회 (4주)', missions: [
                { t: '면접 기출 집중 — 자사고/특목고 최근 5개년', ok: false, type: 'M' },
                { t: '생활기록부 완성 스피치 — 항목별 최종 점검', ok: false, type: 'S' },
                { t: '문해력 프로젝트 2 심화 — 핵심 논리 구조화', ok: false, type: 'U' },
                { t: '나의 강점 심화 — VIA 강점 발표 완성본', ok: false, type: 'E' },
            ]
        },
        {
            m: '12월', theme: '면접 시뮬레이션 + 자소서 최종', freq: '주 1회 (4주)', missions: [
                { t: '면접 시뮬레이션 — 실전 모의면접 1회차', ok: false, type: 'M' },
                { t: '면접 시뮬레이션 — 실전 모의면접 2회차', ok: false, type: 'M' },
                { t: '자기소개서 최종 점검 — 제출본 완성', ok: false, type: 'S' },
                { t: '진로 발표회 — 2년 성장 스토리 최종 발표', ok: false, type: 'S' },
            ]
        },
    ],
    '중3': [
        {
            m: '1월', theme: '방학특강 · 면접 기출 집중', freq: '주 1회 (4주)', missions: [
                { t: '자사고/특목고 면접 기출 분석 — 학교별 경향', ok: false, type: 'M' },
                { t: '면접 시뮬레이션 실전 1 — 면접관 피드백', ok: false, type: 'M' },
                { t: '자기소개서 최종 완성 — 지원 학교별 맞춤 작성', ok: false, type: 'S' },
                { t: '실전 스피치 마스터 — 면접 답변 스피치 완성', ok: false, type: 'E' },
            ]
        },
        {
            m: '2월', theme: '방학특강 · 면접 실전 2', freq: '주 1회 (4주)', missions: [
                { t: '면접 시뮬레이션 실전 2 — 꼬리질문 대비', ok: false, type: 'M' },
                { t: 'SKY·교대 제시문 분석 — 입시 연계 특강', ok: false, type: 'M' },
                { t: '생활기록부 최종 스피치 — 면접 연계 답변 완성', ok: false, type: 'S' },
                { t: '인성/가치관 최종 — 면접 질문 대비 핵심 정리', ok: false, type: 'U' },
            ]
        },
        {
            m: '3월', theme: '면접 실전 3 + 논리 스피치', freq: '주 1회 (4주)', missions: [
                { t: '면접 시뮬레이션 실전 3 — 3P 스피치 완성도 점검', ok: false, type: 'M' },
                { t: '논리적/비판적 스피치 최종 — 실전 면접 답변 적용', ok: false, type: 'U' },
                { t: '탐구 보고서 최종 — 면접 예상문제 연결', ok: false, type: 'S' },
                { t: '리더십 발표 최종 — 면접 리더십 질문 대비', ok: false, type: 'E' },
            ]
        },
        {
            m: '5월', theme: '실전 모의면접 + 포트폴리오', freq: '주 1회 (4주)', missions: [
                { t: '실전 모의면접 4회차 — 학교별 시나리오 적용', ok: false, type: 'M' },
                { t: '답변 분석 리포트 — 개인별 약점 집중 보완', ok: false, type: 'M' },
                { t: '디자인씽킹 최종 발표 — 포트폴리오 완성', ok: false, type: 'U' },
                { t: '진로 발표회 — 3년 성장 스토리 및 진학 목표 발표', ok: false, type: 'S' },
            ]
        },
        {
            m: '7월', theme: '면접 최종 점검', freq: '주 1~2회', missions: [
                { t: '면접 최종 점검 1 — 자사고 지원 대비', ok: false, type: 'M' },
                { t: '면접 최종 점검 2 — 특목고 지원 대비', ok: false, type: 'M' },
                { t: '자기소개서 제출 직전 검토 — 최종 수정', ok: false, type: 'S' },
                { t: '실전 모의면접 5회차 — 최종 피드백', ok: false, type: 'M' },
            ]
        },
        {
            m: '8월', theme: '방학특강 · 합격 스피치 완성', freq: '주 1회 (4주)', missions: [
                { t: '자사고 원서접수 대비 — 학교별 면접 특징 분석', ok: false, type: 'M' },
                { t: '면접 최종 시뮬레이션 — 실전 면접관 투입', ok: false, type: 'M' },
                { t: '생활기록부 면접 연계 최종 — 예상 질문 100개', ok: false, type: 'S' },
                { t: '합격 스피치 완성 — 3년 집대성 면접 답변 정리', ok: false, type: 'M' },
            ]
        },
        {
            m: '10월', theme: '면접 시즌 D-DAY', freq: '면접일 맞춤', missions: [
                { t: '면접 D-30 — 개인별 최약점 집중 보완', ok: false, type: 'M' },
                { t: '면접 D-20 — 실전 모의면접 최종 점검', ok: false, type: 'M' },
                { t: '면접 D-10 — 멘탈 관리 및 최종 리허설', ok: false, type: 'M' },
                { t: '면접 D-1 — 합격 스피치 마지막 점검', ok: false, type: 'M' },
            ]
        },
        {
            m: '12월', theme: '합격 후 + 고등 준비', freq: '필요시', missions: [
                { t: '합격 후 진로 발표 — 입학 후 계획 스피치', ok: false, type: 'S' },
                { t: '후배를 위한 발표 — 3년 경험 공유 스피치', ok: false, type: 'U' },
                { t: '고등 준비 스피치 — 자사고/특목고 입학 대비', ok: false, type: 'E' },
                { t: '3년 진로 발표회 — 최종 성장 스토리 발표', ok: false, type: 'S' },
            ]
        },
    ],
}

export default function MiddleRoadmap() {
    const student = useAtomValue(studentState)
    const academy = useAtomValue(academyState)
    const navigate = useNavigate()
    const [selMonth, setSelMonth] = useState<number | null>(null)

    const grade = student?.grade || '중1'
    const roadmap = CURRICULUM[grade] || CURRICULUM['중1']
    const curMonth = new Date().getMonth() + 1 + '월'

    const totalMissions = roadmap.reduce((a: number, m: any) => a + m.missions.length, 0)
    const doneMissions = roadmap.reduce((a: number, m: any) => a + m.missions.filter((x: any) => x.ok).length, 0)
    const overallPct = totalMissions > 0 ? Math.round(doneMissions / totalMissions * 100) : 0
    const selected = selMonth !== null ? roadmap[selMonth] : null

    return (
        <div className="h-full overflow-y-auto px-8 py-7 box-border font-sans text-ink">

            {/* 학생 헤더 */}
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-brand-middle text-white flex items-center justify-center text-[13px] font-bold">
                        {student?.name?.[0]}
                    </div>
                    <div>
                        <div className="text-[15px] font-bold text-ink">{student?.name}</div>
                        <div className="text-[11px] text-ink-secondary font-medium">{grade} · {academy.academyName || '학원 미연결'}</div>
                    </div>
                </div>

                {/* 스탯 */}
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-brand-middle-dark to-brand-middle rounded-xl px-4 py-2 shadow-[0_4px_12px_rgba(16,185,129,0.2)]">
                        <div className="text-[10px] text-white/80 mb-0.5 font-medium">전체 진행률</div>
                        <div className="text-[15px] font-extrabold text-white">{overallPct}%</div>
                    </div>
                    {[
                        { label: '완료 미션', val: `${doneMissions}/${totalMissions}` },
                        { label: '현재 월', val: curMonth },
                        { label: '소속 학원', val: academy.academyName || '미소속' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white border border-line rounded-xl px-4 py-2">
                            <div className="text-[10px] text-ink-secondary mb-0.5 font-medium">{s.label}</div>
                            <div className="text-[15px] font-extrabold text-ink">{s.val}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 월 그리드 + 미션 패널 */}
            <div className={`grid gap-4 items-start ${selected ? 'grid-cols-[1fr_320px] max-lg:grid-cols-1' : 'grid-cols-1'}`}>

                {/* 왼쪽: 월 그리드 */}
                <div className="bg-white border border-line rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                    <div className="text-[14px] font-bold text-ink mb-1 tracking-tight">연간 커리큘럼 진행 현황</div>
                    <div className="text-[11px] text-ink-secondary mb-4">월을 클릭하면 상세 수업을 확인할 수 있어요.</div>

                    <div className="grid grid-cols-4 max-md:grid-cols-2 gap-2.5">
                        {roadmap.map((m: any, i: number) => {
                            const done = m.missions.filter((x: any) => x.ok).length
                            const pct = Math.round(done / m.missions.length * 100)
                            const isCur = m.m === curMonth
                            const isSel = selMonth === i
                            return (
                                <div
                                    key={i}
                                    onClick={() => setSelMonth(selMonth === i ? null : i)}
                                    className={`border rounded-xl p-3 cursor-pointer transition-all hover:-translate-y-0.5 ${
                                        isSel
                                            ? 'border-brand-middle bg-brand-middle-pale shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
                                            : isCur
                                                ? 'border-brand-middle-light bg-brand-middle-pale/50 hover:shadow-sm'
                                                : 'border-line bg-white hover:border-brand-middle-light hover:shadow-sm'
                                    }`}
                                >
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold mb-2 ${
                                        isSel || isCur
                                            ? 'bg-brand-middle text-white'
                                            : pct === 100
                                                ? 'bg-brand-middle-bg text-brand-middle-dark'
                                                : 'bg-gray-100 text-ink-secondary'
                                    }`}>
                                        {pct === 100 ? '✓' : m.m.replace('월', '')}
                                    </div>
                                    <div className="text-[12.5px] font-bold text-ink mb-0.5">{m.m}</div>
                                    <div className="text-[10px] text-ink-secondary mb-2 leading-[1.4] h-7 line-clamp-2">{m.theme}</div>
                                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-1">
                                        <div
                                            className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-brand-middle-dark' : 'bg-brand-middle'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <div className="text-[10px] text-ink-muted font-medium">{done}/{m.missions.length} 완료</div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* 오른쪽: 미션 패널 */}
                {selected && selMonth !== null && (
                    <div className="bg-white border-2 border-brand-middle rounded-2xl p-5 sticky top-0 max-h-[calc(100vh-200px)] overflow-y-auto shadow-[0_8px_24px_rgba(16,185,129,0.12)]">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <div className="text-[15px] font-extrabold text-ink tracking-tight">{selected.m}</div>
                                <div className="text-[11px] text-ink-secondary mt-1 font-medium">{selected.theme}</div>
                                <div className="text-[10px] text-brand-middle-dark mt-1 font-semibold">⏰ {selected.freq}</div>
                            </div>
                            <button
                                onClick={() => setSelMonth(null)}
                                className="text-ink-muted hover:text-ink text-base leading-none w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">수업 목록</div>

                        {selected.missions.map((ms: any, mi: number) => {
                            const tc = TYPE_COLOR[ms.type]
                            return (
                                <div
                                    key={mi}
                                    className={`px-3 py-2.5 rounded-lg mb-1.5 border transition-all ${
                                        ms.ok
                                            ? 'bg-brand-middle-pale border-brand-middle-light'
                                            : 'bg-gray-50 border-line hover:border-brand-middle-light'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white flex-shrink-0 ${
                                            ms.ok ? 'bg-brand-middle' : 'bg-gray-300'
                                        }`}>
                                            {ms.ok ? '✓' : ''}
                                        </div>
                                        <span className={`text-[12px] flex-1 leading-[1.5] ${
                                            ms.ok ? 'text-brand-middle-dark font-semibold' : 'text-ink'
                                        }`}>
                                            {ms.t}
                                        </span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${tc.cls}`}>
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