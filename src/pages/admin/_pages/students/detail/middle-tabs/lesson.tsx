import { useState } from 'react'

const LESSONS: Record<string, any[]> = {
  '중1': [
    { m: '1월', list: [
      { w: 1, title: '말하는 나를 발견하다', sub: '자기PR 마인드셋', page: 'p.1~8', videoUrl: '', done: false },
      { w: 2, title: '생각을 기획하는 힘', sub: '나만의 동아리 설계 입문', page: 'p.9~16', videoUrl: '', done: false },
      { w: 3, title: '진로 키워드 탐색 스피치', sub: '꿈 찾기 활동', page: 'p.17~24', videoUrl: '', done: false },
      { w: 4, title: '직업탐색 스피치', sub: '내가 되고 싶은 직업군 발표', page: 'p.25~32', videoUrl: '', done: false },
    ]},
    { m: '2월', list: [
      { w: 1, title: '책 속의 나를 말하다', sub: '독서기록장 작성', page: 'p.33~40', videoUrl: '', done: false },
      { w: 2, title: '자기주도적 학습 스피치', sub: '정의와 사례', page: 'p.41~48', videoUrl: '', done: false },
      { w: 3, title: '학습법/목표관리 스피치', sub: '과목별 학습법 기초', page: 'p.49~56', videoUrl: '', done: false },
      { w: 4, title: '진로 발표회', sub: '진로 주제 첫 발표 및 피드백', page: 'p.57~64', videoUrl: '', done: false },
    ]},
    { m: '3월', list: [
      { w: 1, title: '나의 강점을 말하다', sub: 'VIA 강점 진단 기초', page: 'p.65~72', videoUrl: '', done: false },
      { w: 2, title: '한줄의 근거로 설득하기', sub: '1문장 주장 훈련', page: 'p.73~80', videoUrl: '', done: false },
      { w: 3, title: '셀프리더십 스피치', sub: '학교생활 중 리더십 활동', page: 'p.81~88', videoUrl: '', done: false },
      { w: 4, title: '진로 뉴스 발표', sub: '관련 기사 요약 및 의견 말하기', page: 'p.89~96', videoUrl: '', done: false },
    ]},
    { m: '4월', list: [
      { w: 1, title: '실전 발표 마스터', sub: '수행평가 대비 발표준비', page: 'p.97~104', videoUrl: '', done: false },
      { w: 2, title: '토론 스피치', sub: '시사 주제 찬성/반대 기초', page: 'p.105~112', videoUrl: '', done: false },
      { w: 3, title: '문해력 스피치 1', sub: '1문장 핵심 요약 훈련', page: 'p.113~120', videoUrl: '', done: false },
      { w: 4, title: '동아리 면접 연습', sub: '시뮬레이션 기초', page: 'p.121~128', videoUrl: '', done: false },
    ]},
    { m: '6월', list: [
      { w: 1, title: '나만의 스토리텔링', sub: '내가 겪은 일 말하기', page: 'p.129~136', videoUrl: '', done: false },
      { w: 2, title: '문해력 스피치 2', sub: '2문장 작품 핵심 요약', page: 'p.137~144', videoUrl: '', done: false },
      { w: 3, title: '논리적/비판적 스피치', sub: '중요 사건 글쓰기 입문', page: 'p.145~152', videoUrl: '', done: false },
      { w: 4, title: '모의 발표/피드백', sub: '실제 발표 적용 피드백', page: 'p.153~160', videoUrl: '', done: false },
    ]},
    { m: '8월', list: [
      { w: 1, title: '자기소개서 작성 스피치 1', sub: '고입 개념 이해', page: 'p.161~168', videoUrl: '', done: false },
      { w: 2, title: '탐구 보고서 스피치', sub: '자사고/특목고 자소서 이해', page: 'p.169~176', videoUrl: '', done: false },
      { w: 3, title: '인성/가치관 스피치', sub: '인생에서 중요한 기준 찾기', page: 'p.177~184', videoUrl: '', done: false },
      { w: 4, title: '디자인씽킹 스피치', sub: '공감·문제정의 프로세스', page: 'p.185~192', videoUrl: '', done: false },
    ]},
    { m: '9월', list: [
      { w: 1, title: '리더는 말로 이끈다', sub: '리더십 영상 보고 발표', page: 'p.193~200', videoUrl: '', done: false },
      { w: 2, title: '스토리텔링 스피치', sub: '레고 활용 스토리텔링 실습', page: 'p.201~208', videoUrl: '', done: false },
      { w: 3, title: '생활기록부 스피치', sub: '항목 이해 및 발표 스피치화', page: 'p.209~216', videoUrl: '', done: false },
      { w: 4, title: '면접 스피치 1', sub: '자사고/특목고 면접 중요성 이해', page: 'p.217~224', videoUrl: '', done: false },
    ]},
    { m: '11월', list: [
      { w: 1, title: '면접 스피치 2', sub: '우아한 대화법 5원칙 소개', page: 'p.225~232', videoUrl: '', done: false },
      { w: 2, title: '면접 스피치 3', sub: '고입대비 면접 시뮬레이션 입문', page: 'p.233~240', videoUrl: '', done: false },
      { w: 3, title: '모의 발표/피드백', sub: '파트너러키 경영', page: 'p.241~248', videoUrl: '', done: false },
      { w: 4, title: '진로 발표회', sub: '1년 진로 주제 최종 발표', page: 'p.249~256', videoUrl: '', done: false },
    ]},
  ],
  '중2': [
    { m: '1월', list: [
      { w: 1, title: '실전 발표 마스터 심화', sub: '수행평가 실전까지', page: 'p.1~8', videoUrl: '', done: false },
      { w: 2, title: '자기소개서 작성 스피치 2', sub: '세부항목 분석', page: 'p.9~16', videoUrl: '', done: false },
      { w: 3, title: '토론 스피치 심화', sub: '찬반/중립 토론 기법 A-Z', page: 'p.17~24', videoUrl: '', done: false },
      { w: 4, title: '진로 키워드 심화', sub: '학과 연결 자기소개서 초안', page: 'p.25~32', videoUrl: '', done: false },
    ]},
    { m: '2월', list: [
      { w: 1, title: '나만의 스토리텔링 심화', sub: '창작 이야기 완성', page: 'p.33~40', videoUrl: '', done: false },
      { w: 2, title: '문해력 스피치 2 심화', sub: '문학작품 핵심 요약', page: 'p.41~48', videoUrl: '', done: false },
      { w: 3, title: '셀프리더십 심화', sub: '활동별로 만들기', page: 'p.49~56', videoUrl: '', done: false },
      { w: 4, title: '탐구 보고서 심화', sub: '자기소개서 작성 준비', page: 'p.57~64', videoUrl: '', done: false },
    ]},
    { m: '3월', list: [
      { w: 1, title: '한줄의 근거 심화', sub: '1문장 논리 설득 발표', page: 'p.65~72', videoUrl: '', done: false },
      { w: 2, title: '논리적/비판적 스피치 심화', sub: '글쓰기 완성', page: 'p.73~80', videoUrl: '', done: false },
      { w: 3, title: '동아리 면접 연습 심화', sub: '면접관 역할 실습', page: 'p.81~88', videoUrl: '', done: false },
      { w: 4, title: '디자인씽킹 심화', sub: '아이디어→프로토타입 제작', page: 'p.89~96', videoUrl: '', done: false },
    ]},
    { m: '4월', list: [
      { w: 1, title: '생활기록부 스피치 심화', sub: '세특 항목 분석 발표', page: 'p.97~104', videoUrl: '', done: false },
      { w: 2, title: '면접 스피치 1 심화', sub: '기출문제 대비 연습', page: 'p.105~112', videoUrl: '', done: false },
      { w: 3, title: '리더는 말로 이끈다 심화', sub: '리더십 관련 영상 발표', page: 'p.113~120', videoUrl: '', done: false },
      { w: 4, title: '인성/가치관 심화', sub: '비전/사명/핵심가치 설정', page: 'p.121~128', videoUrl: '', done: false },
    ]},
    { m: '6월', list: [
      { w: 1, title: '면접 스피치 2 심화', sub: '5원칙 적용 실전 연습', page: 'p.129~136', videoUrl: '', done: false },
      { w: 2, title: '면접 스피치 3 심화', sub: '3P 스피치 목적·사람·장소', page: 'p.137~144', videoUrl: '', done: false },
      { w: 3, title: '스토리텔링 스피치 심화', sub: '고입대비 스토리 구성', page: 'p.145~152', videoUrl: '', done: false },
      { w: 4, title: '모의 발표/피드백', sub: '면접 실제 적용 피드백', page: 'p.153~160', videoUrl: '', done: false },
    ]},
    { m: '8월', list: [
      { w: 1, title: '자기소개서 완성본 작성', sub: '지원학교 맞춤 초안', page: 'p.161~168', videoUrl: '', done: false },
      { w: 2, title: '책 속의 나를 심화', sub: '독서스피치 완성', page: 'p.169~176', videoUrl: '', done: false },
      { w: 3, title: '자기주도적 학습 심화', sub: '사례 발표 및 피드백', page: 'p.177~184', videoUrl: '', done: false },
      { w: 4, title: '진로 뉴스 발표 심화', sub: '찬반 토론 연계', page: 'p.185~192', videoUrl: '', done: false },
    ]},
    { m: '9월', list: [
      { w: 1, title: '면접 기출 집중', sub: '자사고/특목고 최근 5개년', page: 'p.193~200', videoUrl: '', done: false },
      { w: 2, title: '생활기록부 완성 스피치', sub: '항목별 최종 점검', page: 'p.201~208', videoUrl: '', done: false },
      { w: 3, title: '문해력 프로젝트 2 심화', sub: '핵심 논리 구조화', page: 'p.209~216', videoUrl: '', done: false },
      { w: 4, title: '나의 강점 심화', sub: 'VIA 강점 발표 완성본', page: 'p.217~224', videoUrl: '', done: false },
    ]},
    { m: '11월', list: [
      { w: 1, title: '면접 시뮬레이션', sub: '실전 모의면접 1회차', page: 'p.225~232', videoUrl: '', done: false },
      { w: 2, title: '면접 시뮬레이션', sub: '실전 모의면접 2회차', page: 'p.233~240', videoUrl: '', done: false },
      { w: 3, title: '자기소개서 최종 점검', sub: '제출본 완성', page: 'p.241~248', videoUrl: '', done: false },
      { w: 4, title: '진로 발표회', sub: '2년 성장 스토리 최종 발표', page: 'p.249~256', videoUrl: '', done: false },
    ]},
  ],
  '중3': [
    { m: '1월', list: [
      { w: 1, title: '자사고/특목고 면접 기출 분석', sub: '학교별 경향', page: 'p.1~8', videoUrl: '', done: false },
      { w: 2, title: '면접 시뮬레이션 실전 1', sub: '면접관 피드백', page: 'p.9~16', videoUrl: '', done: false },
      { w: 3, title: '자기소개서 최종 완성', sub: '지원 학교별 맞춤 작성', page: 'p.17~24', videoUrl: '', done: false },
      { w: 4, title: '실전 스피치 마스터', sub: '면접 답변 스피치 완성', page: 'p.25~32', videoUrl: '', done: false },
    ]},
    { m: '2월', list: [
      { w: 1, title: '면접 시뮬레이션 실전 2', sub: '꼬리질문 대비', page: 'p.33~40', videoUrl: '', done: false },
      { w: 2, title: 'SKY·교대 제시문 분석', sub: '입시 연계 특강', page: 'p.41~48', videoUrl: '', done: false },
      { w: 3, title: '생활기록부 최종 스피치', sub: '면접 연계 답변 완성', page: 'p.49~56', videoUrl: '', done: false },
      { w: 4, title: '인성/가치관 최종', sub: '면접 질문 대비 핵심 정리', page: 'p.57~64', videoUrl: '', done: false },
    ]},
    { m: '3월', list: [
      { w: 1, title: '면접 시뮬레이션 실전 3', sub: '3P 스피치 완성도 점검', page: 'p.65~72', videoUrl: '', done: false },
      { w: 2, title: '논리적/비판적 스피치 최종', sub: '실전 면접 답변 적용', page: 'p.73~80', videoUrl: '', done: false },
      { w: 3, title: '탐구 보고서 최종', sub: '면접 예상문제 연결', page: 'p.81~88', videoUrl: '', done: false },
      { w: 4, title: '리더십 발표 최종', sub: '면접 리더십 질문 대비', page: 'p.89~96', videoUrl: '', done: false },
    ]},
    { m: '4월', list: [
      { w: 1, title: '실전 모의면접 4회차', sub: '학교별 시나리오 적용', page: 'p.97~104', videoUrl: '', done: false },
      { w: 2, title: '답변 분석 리포트', sub: '개인별 약점 집중 보완', page: 'p.105~112', videoUrl: '', done: false },
      { w: 3, title: '디자인씽킹 최종 발표', sub: '포트폴리오 완성', page: 'p.113~120', videoUrl: '', done: false },
      { w: 4, title: '진로 발표회', sub: '3년 성장 스토리 및 진학 목표', page: 'p.121~128', videoUrl: '', done: false },
    ]},
    { m: '6월', list: [
      { w: 1, title: '면접 최종 점검 1', sub: '자사고 지원 대비', page: 'p.129~136', videoUrl: '', done: false },
      { w: 2, title: '면접 최종 점검 2', sub: '특목고 지원 대비', page: 'p.137~144', videoUrl: '', done: false },
      { w: 3, title: '자기소개서 제출 직전 검토', sub: '최종 수정', page: 'p.145~152', videoUrl: '', done: false },
      { w: 4, title: '실전 모의면접 5회차', sub: '최종 피드백', page: 'p.153~160', videoUrl: '', done: false },
    ]},
    { m: '8월', list: [
      { w: 1, title: '자사고 원서접수 대비', sub: '학교별 면접 특징 분석', page: 'p.161~168', videoUrl: '', done: false },
      { w: 2, title: '면접 최종 시뮬레이션', sub: '실전 면접관 투입', page: 'p.169~176', videoUrl: '', done: false },
      { w: 3, title: '생활기록부 면접 연계 최종', sub: '예상 질문 100개', page: 'p.177~184', videoUrl: '', done: false },
      { w: 4, title: '합격 스피치 완성', sub: '3년 집대성 면접 답변 정리', page: 'p.185~192', videoUrl: '', done: false },
    ]},
    { m: '9월', list: [
      { w: 1, title: '면접 D-30', sub: '개인별 최약점 집중 보완', page: 'p.193~200', videoUrl: '', done: false },
      { w: 2, title: '면접 D-20', sub: '실전 모의면접 최종 점검', page: 'p.201~208', videoUrl: '', done: false },
      { w: 3, title: '면접 D-10', sub: '멘탈 관리 및 최종 리허설', page: 'p.209~216', videoUrl: '', done: false },
      { w: 4, title: '면접 D-1', sub: '합격 스피치 마지막 점검', page: 'p.217~224', videoUrl: '', done: false },
    ]},
    { m: '11월', list: [
      { w: 1, title: '합격 후 진로 발표', sub: '입학 후 계획 스피치', page: 'p.225~232', videoUrl: '', done: false },
      { w: 2, title: '후배를 위한 발표', sub: '3년 경험 공유 스피치', page: 'p.233~240', videoUrl: '', done: false },
      { w: 3, title: '고등 준비 스피치', sub: '자사고/특목고 입학 대비', page: 'p.241~248', videoUrl: '', done: false },
      { w: 4, title: '3년 진로 발표회', sub: '최종 성장 스토리 발표', page: 'p.249~256', videoUrl: '', done: false },
    ]},
  ],
}

export default function LessonTab({ student }: { student: any }) {
  const grade = student?.grade || '중1'
  const lessons = LESSONS[grade] || LESSONS['중1']

  const allLessons = lessons.flatMap((m: any) => m.list.map((l: any) => ({ ...l, month: m.m })))
  const [selLesson, setSelLesson] = useState<any>(allLessons[0])
  const [data, setData] = useState(JSON.parse(JSON.stringify(lessons)))
  const [showUrlSaved, setShowUrlSaved] = useState(false)
  const [uploading, setUploading] = useState(false)

  const toggleDone = (mi: number, li: number) => {
    const next = JSON.parse(JSON.stringify(data))
    next[mi].list[li].done = !next[mi].list[li].done
    setData(next)
    if (selLesson?.month === next[mi].m && selLesson?.w === next[mi].list[li].w) {
      setSelLesson({ ...next[mi].list[li], month: next[mi].m })
    }
  }

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selLesson) return
    setUploading(true)
    // 백엔드 연동 시 여기서 FormData로 서버 업로드
    // const formData = new FormData()
    // formData.append('video', file)
    // await fetch('/api/upload', { method: 'POST', body: formData })
    setTimeout(() => {
      const fakeUrl = `/videos/${file.name}`
      const next = JSON.parse(JSON.stringify(data))
      const mi = next.findIndex((m: any) => m.m === selLesson.month)
      const li = next[mi]?.list.findIndex((l: any) => l.w === selLesson.w)
      if (mi >= 0 && li >= 0) {
        next[mi].list[li].videoUrl = fakeUrl
        setData(next)
        setSelLesson({ ...selLesson, videoUrl: fakeUrl })
      }
      setUploading(false)
      setShowUrlSaved(true)
      setTimeout(() => setShowUrlSaved(false), 2000)
    }, 1000)
  }

  const deleteVideo = () => {
    if (!selLesson) return
    const next = JSON.parse(JSON.stringify(data))
    const mi = next.findIndex((m: any) => m.m === selLesson.month)
    const li = next[mi]?.list.findIndex((l: any) => l.w === selLesson.w)
    if (mi >= 0 && li >= 0) {
      next[mi].list[li].videoUrl = ''
      setData(next)
      setSelLesson({ ...selLesson, videoUrl: '' })
    }
  }

  const doneCount = data.flatMap((m: any) => m.list).filter((l: any) => l.done).length
  const totalCount = data.flatMap((m: any) => m.list).length

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* 왼쪽: 영상 + 정보 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 24px 0' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>수업 관리</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{student?.name} · {grade}</div>
          </div>
          <div style={{ background: '#ECFDF5', color: '#059669', fontSize: 13, fontWeight: 600, padding: '6px 16px', borderRadius: 99 }}>
            {doneCount}/{totalCount} 수업완료
          </div>
        </div>

        {selLesson && (
          <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 14, padding: '20px', marginBottom: 16 }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', background: '#ECFDF5', padding: '2px 10px', borderRadius: 99 }}>{selLesson.month}</span>
              <span style={{ fontSize: 11, color: '#6B7280' }}>{selLesson.w}주차</span>
              {selLesson.done && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: '#059669', padding: '2px 10px', borderRadius: 99 }}>✓ 수업완료</span>
              )}
            </div>

            <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>{selLesson.title}</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>{selLesson.sub}</div>

            {/* 영상 플레이어 */}
            <div style={{ background: '#1a1a2e', borderRadius: 10, aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, overflow: 'hidden' }}>
              {selLesson.videoUrl ? (
                <video
                  src={selLesson.videoUrl}
                  controls
                  style={{ width: '100%', height: '100%', borderRadius: 10 }}
                />
              ) : (
                <div style={{ textAlign: 'center' as const }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 10px' }}>▶</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>영상을 업로드해주세요</div>
                </div>
              )}
            </div>

            {/* 영상 업로드 */}
            <div style={{ background: '#F8F7F5', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>🎬 수업 영상</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, fontSize: 12, color: selLesson.videoUrl ? '#059669' : '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                  {uploading ? '업로드 중...' : selLesson.videoUrl ? selLesson.videoUrl : '업로드된 영상이 없어요'}
                </div>
                {showUrlSaved && <span style={{ fontSize: 11, color: '#059669', flexShrink: 0 }}>✓ 업로드됨!</span>}
                {selLesson.videoUrl && (
                  <button onClick={deleteVideo}
                    style={{ height: 32, padding: '0 10px', background: '#FEF2F2', color: '#EF4444', border: '0.5px solid #FCA5A5', borderRadius: 7, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    삭제
                  </button>
                )}
                <label style={{ height: 32, padding: '0 12px', background: '#fff', color: '#059669', border: '0.5px solid #059669', borderRadius: 7, fontSize: 11, cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, fontFamily: 'inherit' }}>
                  {selLesson.videoUrl ? '✏️ 재업로드' : '+ 영상 업로드'}
                  <input
                    type="file"
                    accept="video/*"
                    style={{ display: 'none' }}
                    disabled={uploading}
                    onChange={handleVideoUpload}
                  />
                </label>
              </div>
            </div>

            {/* 교재 페이지 */}
            <div style={{ background: '#FFF7ED', border: '0.5px solid #FDBA74', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 18 }}>📖</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>이번 수업 교재 범위</div>
                <div style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>인데미 스피치 교재 — {selLesson.page}</div>
              </div>
            </div>

            {/* 수업 완료 처리 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => {
                  const mi = data.findIndex((m: any) => m.m === selLesson.month)
                  const li = data[mi]?.list.findIndex((l: any) => l.w === selLesson.w)
                  if (mi >= 0 && li >= 0) toggleDone(mi, li)
                }}
                style={{
                  height: 38, padding: '0 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                  background: selLesson.done ? '#ECFDF5' : '#059669',
                  color: selLesson.done ? '#059669' : '#fff',
                  outline: selLesson.done ? '1px solid #6EE7B7' : 'none',
                }}>
                {selLesson.done ? '✓ 수업완료' : '수업 완료 처리'}
              </button>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                {selLesson.done ? '수업이 완료됐어요!' : '수업이 끝나면 완료 처리해주세요'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 구분선 */}
      <div style={{ width: '0.5px', background: '#E5E7EB', flexShrink: 0 }} />

      {/* 오른쪽: 수업 목록 */}
      <div style={{ width: 280, flexShrink: 0, overflowY: 'auto', padding: '24px 16px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>전체 수업 목록</div>
        {data.map((m: any, mi: number) => (
          <div key={mi}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 6, marginTop: mi > 0 ? 14 : 0 }}>{m.m}</div>
            {m.list.map((l: any, li: number) => {
              const isSelected = selLesson?.month === m.m && selLesson?.w === l.w
              return (
                <div key={li}
                  onClick={() => setSelLesson({ ...l, month: m.m })}
                  style={{ padding: '9px 12px', borderRadius: 8, marginBottom: 5, cursor: 'pointer', border: `0.5px solid ${isSelected ? '#059669' : l.done ? '#6EE7B7' : '#E5E7EB'}`, background: isSelected ? '#ECFDF5' : l.done ? '#F0FDF4' : '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: l.done ? '#059669' : isSelected ? '#059669' : '#F3F4F6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0 }}>
                      {l.done ? '✓' : l.w}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: isSelected ? 600 : 400, color: isSelected ? '#059669' : '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{l.title}</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>{l.page}</div>
                    </div>
                    {l.videoUrl && <span style={{ fontSize: 9, color: '#059669', background: '#ECFDF5', padding: '1px 5px', borderRadius: 99, flexShrink: 0 }}>영상</span>}
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