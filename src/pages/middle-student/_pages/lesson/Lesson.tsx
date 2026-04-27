import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '../../_store/auth'

const LESSONS: Record<string, any[]> = {
  '중1': [
    { m: '1월', list: [
      { w: 1, title: '말하는 나를 발견하다', sub: '자기PR 마인드셋', page: 'p.1~8', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '생각을 기획하는 힘', sub: '나만의 동아리 설계 입문', page: 'p.9~16', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '진로 키워드 탐색 스피치', sub: '꿈 찾기 활동', page: 'p.17~24', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '직업탐색 스피치', sub: '내가 되고 싶은 직업군 발표', page: 'p.25~32', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '2월', list: [
      { w: 1, title: '책 속의 나를 말하다', sub: '독서기록장 작성', page: 'p.33~40', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '자기주도적 학습 스피치', sub: '정의와 사례', page: 'p.41~48', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '학습법/목표관리 스피치', sub: '과목별 학습법 기초', page: 'p.49~56', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '진로 발표회', sub: '진로 주제 첫 발표 및 피드백', page: 'p.57~64', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '3월', list: [
      { w: 1, title: '나의 강점을 말하다', sub: 'VIA 강점 진단 기초', page: 'p.65~72', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '한줄의 근거로 설득하기', sub: '1문장 주장 훈련', page: 'p.73~80', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '셀프리더십 스피치', sub: '학교생활 중 리더십 활동', page: 'p.81~88', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '진로 뉴스 발표', sub: '관련 기사 요약 및 의견 말하기', page: 'p.89~96', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '4월', list: [
      { w: 1, title: '실전 발표 마스터', sub: '수행평가 대비 발표준비', page: 'p.97~104', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '토론 스피치', sub: '시사 주제 찬성/반대 기초', page: 'p.105~112', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '문해력 스피치 1', sub: '1문장 핵심 요약 훈련', page: 'p.113~120', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '동아리 면접 연습', sub: '시뮬레이션 기초', page: 'p.121~128', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '6월', list: [
      { w: 1, title: '나만의 스토리텔링', sub: '내가 겪은 일 말하기', page: 'p.129~136', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '문해력 스피치 2', sub: '2문장 작품 핵심 요약', page: 'p.137~144', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '논리적/비판적 스피치', sub: '중요 사건 글쓰기 입문', page: 'p.145~152', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '모의 발표/피드백', sub: '실제 발표 적용 피드백', page: 'p.153~160', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '8월', list: [
      { w: 1, title: '자기소개서 작성 스피치 1', sub: '고입 개념 이해', page: 'p.161~168', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '탐구 보고서 스피치', sub: '자사고/특목고 자소서 이해', page: 'p.169~176', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '인성/가치관 스피치', sub: '인생에서 중요한 기준 찾기', page: 'p.177~184', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '디자인씽킹 스피치', sub: '공감·문제정의 프로세스', page: 'p.185~192', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '9월', list: [
      { w: 1, title: '리더는 말로 이끈다', sub: '리더십 영상 보고 발표', page: 'p.193~200', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '스토리텔링 스피치', sub: '레고 활용 스토리텔링 실습', page: 'p.201~208', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '생활기록부 스피치', sub: '항목 이해 및 발표 스피치화', page: 'p.209~216', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '면접 스피치 1', sub: '자사고/특목고 면접 중요성 이해', page: 'p.217~224', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '11월', list: [
      { w: 1, title: '면접 스피치 2', sub: '우아한 대화법 5원칙 소개', page: 'p.225~232', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '면접 스피치 3', sub: '고입대비 면접 시뮬레이션 입문', page: 'p.233~240', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '모의 발표/피드백', sub: '파트너러키 경영', page: 'p.241~248', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '진로 발표회', sub: '1년 진로 주제 최종 발표', page: 'p.249~256', videoUrl: '', reviewed: false, done: false },
    ]},
  ],
  '중2': [
    { m: '1월', list: [
      { w: 1, title: '실전 발표 마스터 심화', sub: '수행평가 실전까지', page: 'p.1~8', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '자기소개서 작성 스피치 2', sub: '세부항목 분석', page: 'p.9~16', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '토론 스피치 심화', sub: '찬반/중립 토론 기법 A-Z', page: 'p.17~24', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '진로 키워드 심화', sub: '학과 연결 자기소개서 초안', page: 'p.25~32', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '2월', list: [
      { w: 1, title: '나만의 스토리텔링 심화', sub: '창작 이야기 완성', page: 'p.33~40', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '문해력 스피치 2 심화', sub: '문학작품 핵심 요약', page: 'p.41~48', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '셀프리더십 심화', sub: '활동별로 만들기', page: 'p.49~56', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '탐구 보고서 심화', sub: '자기소개서 작성 준비', page: 'p.57~64', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '3월', list: [
      { w: 1, title: '한줄의 근거 심화', sub: '1문장 논리 설득 발표', page: 'p.65~72', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '논리적/비판적 스피치 심화', sub: '글쓰기 완성', page: 'p.73~80', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '동아리 면접 연습 심화', sub: '면접관 역할 실습', page: 'p.81~88', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '디자인씽킹 심화', sub: '아이디어→프로토타입 제작', page: 'p.89~96', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '4월', list: [
      { w: 1, title: '생활기록부 스피치 심화', sub: '세특 항목 분석 발표', page: 'p.97~104', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '면접 스피치 1 심화', sub: '기출문제 대비 연습', page: 'p.105~112', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '리더는 말로 이끈다 심화', sub: '리더십 관련 영상 발표', page: 'p.113~120', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '인성/가치관 심화', sub: '비전/사명/핵심가치 설정', page: 'p.121~128', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '6월', list: [
      { w: 1, title: '면접 스피치 2 심화', sub: '5원칙 적용 실전 연습', page: 'p.129~136', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '면접 스피치 3 심화', sub: '3P 스피치 목적·사람·장소', page: 'p.137~144', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '스토리텔링 스피치 심화', sub: '고입대비 스토리 구성', page: 'p.145~152', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '모의 발표/피드백', sub: '면접 실제 적용 피드백', page: 'p.153~160', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '8월', list: [
      { w: 1, title: '자기소개서 완성본 작성', sub: '지원학교 맞춤 초안', page: 'p.161~168', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '책 속의 나를 심화', sub: '독서스피치 완성', page: 'p.169~176', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '자기주도적 학습 심화', sub: '사례 발표 및 피드백', page: 'p.177~184', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '진로 뉴스 발표 심화', sub: '찬반 토론 연계', page: 'p.185~192', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '9월', list: [
      { w: 1, title: '면접 기출 집중', sub: '자사고/특목고 최근 5개년', page: 'p.193~200', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '생활기록부 완성 스피치', sub: '항목별 최종 점검', page: 'p.201~208', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '문해력 프로젝트 2 심화', sub: '핵심 논리 구조화', page: 'p.209~216', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '나의 강점 심화', sub: 'VIA 강점 발표 완성본', page: 'p.217~224', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '11월', list: [
      { w: 1, title: '면접 시뮬레이션', sub: '실전 모의면접 1회차', page: 'p.225~232', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '면접 시뮬레이션', sub: '실전 모의면접 2회차', page: 'p.233~240', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '자기소개서 최종 점검', sub: '제출본 완성', page: 'p.241~248', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '진로 발표회', sub: '2년 성장 스토리 최종 발표', page: 'p.249~256', videoUrl: '', reviewed: false, done: false },
    ]},
  ],
  '중3': [
    { m: '1월', list: [
      { w: 1, title: '자사고/특목고 면접 기출 분석', sub: '학교별 경향', page: 'p.1~8', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '면접 시뮬레이션 실전 1', sub: '면접관 피드백', page: 'p.9~16', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '자기소개서 최종 완성', sub: '지원 학교별 맞춤 작성', page: 'p.17~24', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '실전 스피치 마스터', sub: '면접 답변 스피치 완성', page: 'p.25~32', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '2월', list: [
      { w: 1, title: '면접 시뮬레이션 실전 2', sub: '꼬리질문 대비', page: 'p.33~40', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: 'SKY·교대 제시문 분석', sub: '입시 연계 특강', page: 'p.41~48', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '생활기록부 최종 스피치', sub: '면접 연계 답변 완성', page: 'p.49~56', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '인성/가치관 최종', sub: '면접 질문 대비 핵심 정리', page: 'p.57~64', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '3월', list: [
      { w: 1, title: '면접 시뮬레이션 실전 3', sub: '3P 스피치 완성도 점검', page: 'p.65~72', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '논리적/비판적 스피치 최종', sub: '실전 면접 답변 적용', page: 'p.73~80', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '탐구 보고서 최종', sub: '면접 예상문제 연결', page: 'p.81~88', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '리더십 발표 최종', sub: '면접 리더십 질문 대비', page: 'p.89~96', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '4월', list: [
      { w: 1, title: '실전 모의면접 4회차', sub: '학교별 시나리오 적용', page: 'p.97~104', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '답변 분석 리포트', sub: '개인별 약점 집중 보완', page: 'p.105~112', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '디자인씽킹 최종 발표', sub: '포트폴리오 완성', page: 'p.113~120', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '진로 발표회', sub: '3년 성장 스토리 및 진학 목표', page: 'p.121~128', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '6월', list: [
      { w: 1, title: '면접 최종 점검 1', sub: '자사고 지원 대비', page: 'p.129~136', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '면접 최종 점검 2', sub: '특목고 지원 대비', page: 'p.137~144', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '자기소개서 제출 직전 검토', sub: '최종 수정', page: 'p.145~152', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '실전 모의면접 5회차', sub: '최종 피드백', page: 'p.153~160', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '8월', list: [
      { w: 1, title: '자사고 원서접수 대비', sub: '학교별 면접 특징 분석', page: 'p.161~168', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '면접 최종 시뮬레이션', sub: '실전 면접관 투입', page: 'p.169~176', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '생활기록부 면접 연계 최종', sub: '예상 질문 100개', page: 'p.177~184', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '합격 스피치 완성', sub: '3년 집대성 면접 답변 정리', page: 'p.185~192', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '9월', list: [
      { w: 1, title: '면접 D-30', sub: '개인별 최약점 집중 보완', page: 'p.193~200', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '면접 D-20', sub: '실전 모의면접 최종 점검', page: 'p.201~208', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '면접 D-10', sub: '멘탈 관리 및 최종 리허설', page: 'p.209~216', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '면접 D-1', sub: '합격 스피치 마지막 점검', page: 'p.217~224', videoUrl: '', reviewed: false, done: false },
    ]},
    { m: '11월', list: [
      { w: 1, title: '합격 후 진로 발표', sub: '입학 후 계획 스피치', page: 'p.225~232', videoUrl: '', reviewed: false, done: false },
      { w: 2, title: '후배를 위한 발표', sub: '3년 경험 공유 스피치', page: 'p.233~240', videoUrl: '', reviewed: false, done: false },
      { w: 3, title: '고등 준비 스피치', sub: '자사고/특목고 입학 대비', page: 'p.241~248', videoUrl: '', reviewed: false, done: false },
      { w: 4, title: '3년 진로 발표회', sub: '최종 성장 스토리 발표', page: 'p.249~256', videoUrl: '', reviewed: false, done: false },
    ]},
  ],
}

export default function MiddleLesson() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)

  const grade = student?.grade || '중1'
  const lessons = LESSONS[grade] || LESSONS['중1']

  // 전체 레슨 flatten
  const allLessons = lessons.flatMap((m: any) => m.list.map((l: any) => ({ ...l, month: m.m })))
  const curLesson = allLessons.find((l: any) => !l.done) || allLessons[0]

  const [selLesson, setSelLesson] = useState<any>(curLesson)
  const [data, setData] = useState(JSON.parse(JSON.stringify(lessons)))

  const toggleReview = (mi: number, li: number) => {
    const next = JSON.parse(JSON.stringify(data))
    next[mi].list[li].reviewed = !next[mi].list[li].reviewed
    setData(next)
    if (selLesson?.month === next[mi].m && selLesson?.w === next[mi].list[li].w) {
      setSelLesson({ ...next[mi].list[li], month: next[mi].m })
    }
  }

  const reviewedCount = data.flatMap((m: any) => m.list).filter((l: any) => l.reviewed).length
  const totalCount = data.flatMap((m: any) => m.list).length

  return (
    <div className="flex h-full overflow-hidden font-sans text-ink">

      {/* 왼쪽: 영상 + 정보 */}
      <div className="flex-1 overflow-y-auto px-7 py-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[20px] font-extrabold text-ink tracking-tight">수업 영상</div>
            <div className="text-[13px] text-ink-muted mt-0.5">{student?.name} · {academy?.academyName}</div>
          </div>
          <div className="bg-brand-middle-bg text-brand-middle-dark text-[13px] font-bold px-4 py-1.5 rounded-full border border-brand-middle-light">
            {reviewedCount}/{totalCount} 복습완료
          </div>
        </div>

        {/* 선택된 수업 영상 */}
        {selLesson && (
          <div className="bg-white border border-line rounded-2xl p-6 mb-4 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">

            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2.5 py-0.5 rounded-full border border-brand-middle-light">
                {selLesson.month}
              </span>
              <span className="text-[11px] text-ink-secondary font-medium">{selLesson.w}주차</span>
            </div>

            <div className="text-[18px] font-extrabold text-ink tracking-tight mb-1">{selLesson.title}</div>
            <div className="text-[13px] text-ink-secondary mb-5">{selLesson.sub}</div>

            {/* 영상 영역 */}
            <div className="bg-[#0F172A] rounded-xl aspect-video flex items-center justify-center mb-4 cursor-pointer relative overflow-hidden group">
              {selLesson.videoUrl ? (
                <iframe
                  src={selLesson.videoUrl}
                  className="w-full h-full border-0 rounded-xl"
                  allowFullScreen
                />
              ) : (
                <>
                  {/* 배경 그라데이션 장식 */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-50"
                    style={{ background: 'radial-gradient(circle at 30% 40%, rgba(16, 185, 129, 0.15), transparent 60%)' }}
                  />
                  <div className="text-center relative">
                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-2xl mx-auto mb-3 group-hover:bg-brand-middle group-hover:scale-110 transition-all">
                      ▶
                    </div>
                    <div className="text-[12px] text-white/60">영상이 업로드되면 여기서 볼 수 있어요</div>
                  </div>
                </>
              )}
            </div>

            {/* 교재 페이지 */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
              <span className="text-xl flex-shrink-0">📖</span>
              <div>
                <div className="text-[12px] font-bold text-amber-700">이번 수업 교재 범위</div>
                <div className="text-[11px] text-amber-600 mt-0.5">비커스 스피치 교재 — {selLesson.page}</div>
              </div>
            </div>

            {/* 복습 완료 버튼 */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  const mi = data.findIndex((m: any) => m.m === selLesson.month)
                  const li = data[mi]?.list.findIndex((l: any) => l.w === selLesson.w)
                  if (mi >= 0 && li >= 0) toggleReview(mi, li)
                }}
                className={`h-10 px-5 rounded-lg text-[13px] font-semibold transition-all ${
                  selLesson.reviewed
                    ? 'bg-brand-middle-bg text-brand-middle-dark border border-brand-middle-light hover:bg-brand-middle-pale'
                    : 'bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle'
                }`}
              >
                {selLesson.reviewed ? '✓ 복습 완료' : '복습하기'}
              </button>
              <span className="text-[12px] text-ink-muted">
                {selLesson.reviewed ? '복습을 완료했어요!' : '영상을 다시 보고 복습했다면 체크해주세요!'}
              </span>
            </div>
          </div>
        )}

        {/* 교재 구매 배너 */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-[14px] font-bold text-amber-700 mb-0.5">📚 아직 교재가 없으신가요?</div>
            <div className="text-[12px] text-amber-600">비커스 스피치 교재를 구매하면 수업을 더 효과적으로 준비할 수 있어요.</div>
          </div>
          <button className="h-10 px-4 bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-bold rounded-lg whitespace-nowrap flex-shrink-0 transition-all hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(249,115,22,0.3)]">
            교재 구매하기 →
          </button>
        </div>
      </div>

      {/* 구분선 */}
      <div className="w-px bg-line flex-shrink-0" />

      {/* 오른쪽: 수업 목록 */}
      <div className="w-[300px] flex-shrink-0 overflow-y-auto px-4 py-6 bg-[#F8FAFC]">
        <div className="text-[13px] font-bold text-ink mb-3 px-1">전체 수업 목록</div>

        {data.map((m: any, mi: number) => (
          <div key={mi}>
            <div className={`text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 px-1 ${mi > 0 ? 'mt-4' : ''}`}>
              {m.m}
            </div>
            {m.list.map((l: any, li: number) => {
              const isSelected = selLesson?.month === m.m && selLesson?.w === l.w
              return (
                <div
                  key={li}
                  onClick={() => setSelLesson({ ...l, month: m.m })}
                  className={`p-3 rounded-xl mb-1.5 cursor-pointer border transition-all ${
                    isSelected
                      ? 'border-brand-middle bg-white shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
                      : l.reviewed
                        ? 'border-brand-middle-light bg-brand-middle-pale/60 hover:shadow-sm'
                        : 'border-line bg-white hover:border-brand-middle-light hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      l.reviewed || isSelected
                        ? 'bg-brand-middle text-white'
                        : 'bg-gray-100 text-ink-muted'
                    }`}>
                      {l.reviewed ? '✓' : l.w}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[12.5px] truncate ${
                        isSelected
                          ? 'font-semibold text-brand-middle-dark'
                          : 'font-medium text-ink'
                      }`}>
                        {l.title}
                      </div>
                      <div className="text-[10px] text-ink-muted mt-0.5">{l.page}</div>
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