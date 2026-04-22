import { useState, useEffect } from 'react'
import {
  useMyQuestions,
  useMyQuestionAnalyses,
  useMyQuestionFollowups,
  useUploadSaenggibuPdf,
  useMyUploadedPdf,
  useDeleteMyPdf,
  useSubmitFirstAnswer,
  useSubmitUpgradedAnswer,
  useSubmitFollowupAnswer,
  gradeToNum,
  getStep,
  type ExpectQuestion,
} from '../../_hooks/useMyHighSaenggibuQuestions'

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백', '꼬리질문']

const ALL_DEPTS = [
  '간호학과', '건축학과', '경영학과', '경제학과', '고분자공학과', '공법학과', '공중보건학과',
  '광고홍보학과', '교육학과', '국어국문학과', '국제관계학과', '국제통상학과', '기계공학과',
  '기계공학부', '노어노문학과', '데이터사이언스학과', '독어독문학과', '동양어문학과',
  '디자인학과', '디지털미디어학과', '로봇공학과', '무역학과', '문헌정보학과', '물리학과',
  '미디어커뮤니케이션학과', '바이오공학과', '법학과', '법학부', '보건관리학과', '불어불문학과',
  '사학과', '사회복지학과', '사회학과', '산업공학과', '산업디자인학과', '생명과학과',
  '생명공학과', '생물학과', '서어서문학과', '소비자학과', '소프트웨어학과', '소프트웨어학부',
  '수학과', '수학교육학과', '스포츠과학과', '식품공학과', '식품영양학과', '신문방송학과',
  '신소재공학과', '심리학과', '아동학과', '약학과', '언어학과', '에너지공학과', '역사학과',
  '연극영화학과', '영어교육학과', '영어영문학과', '예술학과', '의과대학', '의류학과',
  '의생명과학과', '의용공학과', '이중언어학과', '인공지능학과', '일어일문학과', '임상병리학과',
  '자유전공학부', '전기공학과', '전기전자공학부', '전자공학과', '정치외교학과', '정치학과',
  '지구환경과학과', '지리학과', '지적재산학과', '철학과', '체육학과', '치의학과', '치위생학과',
  '컴퓨터공학과', '컴퓨터공학부', '컴퓨터과학과', '통계학과', '특수교육학과', '한국어교육학과',
  '한문학과', '해양공학과', '행정학과', '화학공학과', '화학공학부', '화학과', '환경공학과',
  '회계학과', '회화과', '후마니타스학부', '물리치료학과', '방사선학과', '응급구조학과',
  '작업치료학과', '치기공학과', '피부미용학과', '의료경영학과', '보건행정학과', '안경광학과',
  '의료정보학과', '언어치료학과', '스포츠의학과', '레저스포츠학과', '태권도학과',
  '항공우주공학과', '원자력공학과', '조선해양공학과', '토목공학과', '건설환경공학과',
  '도시공학과', '도시계획학과', '조경학과', '부동산학과', '금융학과', '세무학과', '보험학과',
  '관광학과', '호텔경영학과', '외식경영학과', '항공서비스학과', '미술학과', '음악학과',
  '피아노학과', '성악과', '작곡과', '관현악과', '무용학과', '사진학과', '만화애니메이션학과',
  '게임학과', '실내디자인학과', '패션디자인학과', '시각디자인학과', '영상학과', '방송연예학과',
  '모델학과', '뷰티학과', '신학과', '불교학과',
]

export default function Expect() {
  const [grade, setGrade] = useState('고1')
  const [selQId, setSelQId] = useState<string | null>(null)
  const [myAnswer, setMyAnswer] = useState('')
  const [upgradedAnswer, setUpgradedAnswer] = useState('')
  const [editingStep1, setEditingStep1] = useState(false)
  const [editingStep3, setEditingStep3] = useState(false)
  const [activeTab, setActiveTab] = useState<'questions' | 'upload'>('questions')
  const [tailAnswers, setTailAnswers] = useState<Record<string, string>>({})

  const [deptSearch, setDeptSearch] = useState<Record<string, string>>({ '고1': '', '고2': '', '고3': '' })
  const [selDept, setSelDept] = useState<Record<string, string>>({ '고1': '', '고2': '', '고3': '' })
  const [deptDropOpen, setDeptDropOpen] = useState<Record<string, boolean>>({ '고1': false, '고2': false, '고3': false })

  const gradeNum = gradeToNum(grade) ?? 1

  // DB 조회
  const { data: questions = [], isLoading: loadingQ } = useMyQuestions(gradeNum)
  const { data: analyses = [] } = useMyQuestionAnalyses(selQId ?? undefined)
  const { data: followups = [] } = useMyQuestionFollowups(selQId ?? undefined)
  const { data: uploadedPdf, refetch: refetchPdf } = useMyUploadedPdf(gradeNum)

  // 뮤테이션
  const uploadPdf = useUploadSaenggibuPdf()
  const deletePdf = useDeleteMyPdf()
  const submitFirst = useSubmitFirstAnswer()
  const submitUpgraded = useSubmitUpgradedAnswer()
  const submitTail = useSubmitFollowupAnswer()

  const selQ = questions.find(q => q.id === selQId) ?? null
  const step = selQ ? getStep(selQ, analyses) : 0
  const round1 = analyses.find(a => a.round === 1)
  const round2 = analyses.find(a => a.round === 2)

  const filteredDepts = ALL_DEPTS.filter(d => d.includes(deptSearch[grade]))

  // 학년 변경시 선택 해제
  useEffect(() => {
    setSelQId(null)
    setMyAnswer('')
    setUpgradedAnswer('')
    setEditingStep1(false)
    setEditingStep3(false)
  }, [grade])

  // 질문 선택시 기존 답변 초기화
  useEffect(() => {
    if (selQ) {
      setMyAnswer('')
      setUpgradedAnswer('')
      setEditingStep1(false)
      setEditingStep3(false)
    }
  }, [selQId])

  // 업로드된 PDF 있을 때 selDept 동기화
  useEffect(() => {
    if (uploadedPdf) {
      // 질문 중에서 가장 최근 major_dept 가져오기 (참고용)
      const recentDept = questions.find(q => q.major_dept)?.major_dept
      if (recentDept) {
        setSelDept(prev => ({ ...prev, [grade]: recentDept }))
      }
    }
  }, [uploadedPdf, questions])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!selDept[grade]) {
      alert('전공학과를 먼저 선택해주세요!')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('파일 크기는 50MB 이하로 올려주세요.')
      return
    }

    uploadPdf.mutate({
      file,
      grade: gradeNum,
      majorDept: selDept[grade],
    }, {
      onSuccess: () => {
        alert('생기부 업로드 완료! 선생님이 예상질문을 만들어줄 거에요.')
        refetchPdf()
      },
      onError: (err: any) => {
        alert('업로드 실패: ' + (err?.message || '알 수 없는 오류'))
      },
    })
  }

  const handleDeleteFile = () => {
    if (!uploadedPdf) return
    if (!window.confirm('업로드한 생기부를 삭제할까요?')) return
    deletePdf.mutate(uploadedPdf.path, {
      onSuccess: () => {
        refetchPdf()
      },
    })
  }

  const handleSubmitFirst = () => {
    if (!myAnswer.trim() || !selQ) return
    submitFirst.mutate({
      questionId: selQ.id,
      answer: myAnswer.trim(),
    }, {
      onSuccess: () => {
        setMyAnswer('')
        setEditingStep1(false)
      },
    })
  }

  const handleSubmitUpgraded = () => {
    if (!upgradedAnswer.trim() || !selQ) return
    submitUpgraded.mutate({
      questionId: selQ.id,
      answer: upgradedAnswer.trim(),
    }, {
      onSuccess: () => {
        setUpgradedAnswer('')
        setEditingStep3(false)
      },
    })
  }

  const handleSubmitTail = (followupId: string) => {
    const text = (tailAnswers[followupId] || '').trim()
    if (!text) return
    submitTail.mutate({ followupId, answer: text }, {
      onSuccess: () => {
        setTailAnswers(prev => ({ ...prev, [followupId]: '' }))
      },
    })
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden px-6 py-5 font-sans text-ink">

      {/* 상단 필터 + 인쇄 */}
      <div className="flex justify-between items-center flex-shrink-0 flex-wrap gap-2">
        <div className="flex gap-1.5">
          {['고1', '고2', '고3'].map(g => (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className={`px-4 py-1.5 rounded-full text-[13px] border transition-all ${
                grade === g
                  ? 'bg-brand-high text-white border-brand-high font-semibold shadow-[0_2px_8px_rgba(37,99,235,0.15)]'
                  : 'bg-white text-ink-secondary border-line hover:border-brand-high-light hover:text-brand-high-dark font-medium'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-1.5 bg-white text-brand-high-dark border border-brand-high-light rounded-full text-[12px] font-semibold hover:bg-brand-high-pale flex items-center gap-1.5 transition-all"
        >
          🖨️ 최종 답변집 인쇄
        </button>
      </div>

      {/* 좌우 */}
      <div className="flex gap-4 flex-1 overflow-hidden">

        {/* 왼쪽 */}
        <div className="w-[360px] flex-shrink-0 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">

          {/* 탭 */}
          <div className="flex border-b border-line-light flex-shrink-0">
            {[{ key: 'questions', label: '예상질문' }, { key: 'upload', label: '생기부 업로드' }].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`flex-1 py-3 text-[13px] font-semibold transition-colors border-b-2 ${
                  activeTab === t.key
                    ? 'text-brand-high-dark border-brand-high'
                    : 'text-ink-secondary border-transparent hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 탭 1: 예상질문 */}
          {activeTab === 'questions' && (
            <>
              <div className="px-4 py-2.5 border-b border-line-light flex-shrink-0">
                <div className="text-[12px] text-ink-secondary font-medium leading-[1.7]">
                  총 <span className="text-brand-high-dark font-bold">{questions.length}개</span>
                  <br />
                  답변완료 <span className="text-emerald-600 font-bold">{questions.filter(q => q.student_answer).length}개</span> ·
                  미답변 <span className="text-amber-600 font-bold">{questions.filter(q => !q.student_answer).length}개</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {loadingQ ? (
                  <div className="text-center py-10 text-ink-muted text-[12px]">
                    불러오는 중...
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-10 text-ink-muted">
                    <div className="text-3xl mb-2">💬</div>
                    <div className="text-[12px] mb-1">예상질문이 없어요.</div>
                    <div className="text-[11px] leading-relaxed">
                      생기부를 업로드하면<br />선생님이 예상질문을 만들어줘요.
                    </div>
                  </div>
                ) : questions.map((q, i) => {
                  const qStep = getStep(q, [])
                  const hasAnswer = !!q.student_answer
                  return (
                    <div
                      key={q.id}
                      onClick={() => setSelQId(q.id)}
                      className={`border rounded-xl px-3 py-2.5 mb-1.5 cursor-pointer transition-all ${
                        selQId === q.id
                          ? 'border-brand-high bg-brand-high-pale shadow-[0_2px_8px_rgba(37,99,235,0.1)]'
                          : 'border-line bg-white hover:border-brand-high-light hover:shadow-sm'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-brand-high-dark bg-brand-high-pale px-2 py-0.5 rounded-full inline-block mb-1.5">
                        질문 {i + 1}
                      </span>
                      <div className="text-[12.5px] text-ink leading-relaxed font-semibold mb-1.5">
                        {q.teacher_edited_question || q.question}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {q.tag && (
                          <span className="text-[10px] font-medium text-ink-secondary bg-gray-100 px-2 py-0.5 rounded-full">
                            {q.tag}
                          </span>
                        )}
                        {hasAnswer ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            답변완료
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            미답변
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* 탭 2: 업로드 */}
          {activeTab === 'upload' && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-[11px] font-semibold text-ink-secondary bg-gray-100 px-3 py-1 rounded-full inline-block mb-3">
                {grade} 생기부
              </div>

              {/* 전공학과 선택 */}
              <div className="mb-4">
                <div className="text-[13px] font-bold text-ink mb-1">전공학과 선택</div>
                <div className="text-[12px] text-ink-secondary mb-2 leading-relaxed">
                  지원 희망 학과를 선택하면 더 정확한 예상질문을 만들어 드려요.
                </div>

                <div className="relative">
                  <div
                    onClick={() => setDeptDropOpen(prev => ({ ...prev, [grade]: true }))}
                    className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 bg-white cursor-text transition-colors ${
                      deptDropOpen[grade] ? 'border-brand-high' : 'border-line'
                    }`}
                  >
                    <span className="text-ink-muted">🔍</span>
                    <input
                      value={selDept[grade] && !deptDropOpen[grade] ? selDept[grade] : deptSearch[grade]}
                      onChange={e => {
                        setDeptSearch(prev => ({ ...prev, [grade]: e.target.value }))
                        setSelDept(prev => ({ ...prev, [grade]: '' }))
                        setDeptDropOpen(prev => ({ ...prev, [grade]: true }))
                      }}
                      onFocus={() => setDeptDropOpen(prev => ({ ...prev, [grade]: true }))}
                      placeholder="학과명 검색 (예: 컴퓨터, 간호, 경영...)"
                      className="flex-1 border-none outline-none text-[12px] font-sans bg-transparent text-ink"
                    />
                    {selDept[grade] && (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setSelDept(prev => ({ ...prev, [grade]: '' }))
                          setDeptSearch(prev => ({ ...prev, [grade]: '' }))
                        }}
                        className="text-[11px] text-ink-muted hover:text-ink"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {deptDropOpen[grade] && (
                    <>
                      <div
                        onClick={() => setDeptDropOpen(prev => ({ ...prev, [grade]: false }))}
                        className="fixed inset-0 z-10"
                      />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-line rounded-lg z-20 max-h-[200px] overflow-y-auto shadow-lg">
                        {filteredDepts.length === 0 ? (
                          <div className="px-3 py-3 text-[12px] text-ink-muted text-center">검색 결과가 없어요</div>
                        ) : filteredDepts.map((d, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              setSelDept(prev => ({ ...prev, [grade]: d }))
                              setDeptSearch(prev => ({ ...prev, [grade]: '' }))
                              setDeptDropOpen(prev => ({ ...prev, [grade]: false }))
                            }}
                            className={`px-3 py-2 text-[12px] cursor-pointer transition-colors ${
                              selDept[grade] === d
                                ? 'bg-brand-high-pale text-brand-high-dark font-semibold'
                                : 'text-ink hover:bg-brand-high-pale/50'
                            } ${i < filteredDepts.length - 1 ? 'border-b border-line-light' : ''}`}
                          >
                            {d}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {selDept[grade] && (
                  <div className="mt-2 flex items-center gap-1.5 bg-brand-high-pale border border-brand-high-light rounded-lg px-3 py-2">
                    <span className="text-brand-high-dark font-bold">✓</span>
                    <span className="text-[12px] text-brand-high-dark font-semibold">{selDept[grade]}</span>
                    <span className="text-[11px] text-ink-secondary ml-1">선택됨</span>
                  </div>
                )}
              </div>

              {/* 업로드 */}
              <div>
                <div className="text-[13px] font-bold text-ink mb-1">생기부 업로드</div>
                <div className="text-[12px] text-ink-secondary mb-3 leading-relaxed">
                  생기부를 업로드하면 선생님이 예상질문을 생성해드려요.
                </div>

                <input
                  type="file"
                  accept=".pdf"
                  id={`upload-${grade}`}
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploadPdf.isPending}
                />

                {uploadedPdf ? (
                  <>
                    <div className="border border-emerald-300 rounded-xl p-4 bg-emerald-50 flex items-center gap-3 mb-2">
                      <div className="text-3xl">📄</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-emerald-800 truncate">{uploadedPdf.name}</div>
                        <div className="text-[11px] text-emerald-600 font-medium">
                          {(uploadedPdf.size / 1024).toFixed(1)} KB · 업로드 완료
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <label
                        htmlFor={`upload-${grade}`}
                        className="flex-1 py-2 bg-white text-brand-high-dark border border-brand-high rounded-lg text-[12px] font-bold text-center cursor-pointer hover:bg-brand-high-pale transition-all"
                      >
                        🔄 다시 업로드
                      </label>
                      <button
                        onClick={handleDeleteFile}
                        disabled={deletePdf.isPending}
                        className="px-4 py-2 bg-white text-red-500 border border-red-300 rounded-lg text-[12px] font-bold hover:bg-red-50 disabled:opacity-50 transition-all"
                      >
                        {deletePdf.isPending ? '삭제중...' : '🗑 삭제'}
                      </button>
                    </div>
                  </>
                ) : uploadPdf.isPending ? (
                  <div className="border-[1.5px] border-dashed border-brand-high-light rounded-xl py-7 text-center bg-brand-high-pale/30">
                    <div className="text-3xl mb-2">⏳</div>
                    <div className="text-[13px] font-bold text-brand-high-dark">업로드 중...</div>
                  </div>
                ) : (
                  <label
                    htmlFor={selDept[grade] ? `upload-${grade}` : undefined}
                    onClick={e => {
                      if (!selDept[grade]) {
                        e.preventDefault()
                        alert('먼저 전공학과를 선택해주세요!')
                      }
                    }}
                    className={`block border-[1.5px] border-dashed rounded-xl py-7 text-center transition-all ${
                      selDept[grade]
                        ? 'border-brand-high-light bg-brand-high-pale/30 cursor-pointer hover:bg-brand-high-pale'
                        : 'border-line bg-gray-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-3xl mb-2">📄</div>
                    <div className={`text-[13px] font-bold ${selDept[grade] ? 'text-brand-high-dark' : 'text-ink-muted'}`}>
                      PDF 파일 업로드
                    </div>
                    <div className="text-[11px] text-ink-muted mt-1 font-medium">
                      {selDept[grade] ? `${grade} 생기부를 업로드해주세요` : '전공학과를 먼저 선택해주세요'}
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽 */}
        <div className="flex-1 bg-white border border-line rounded-2xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          {!selQ ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
              <div className="text-4xl">💬</div>
              <div className="text-[14px] font-semibold text-ink-secondary">질문을 선택해주세요</div>
              <div className="text-[12px]">왼쪽에서 질문을 클릭하면 답변을 작성할 수 있어요</div>
            </div>
          ) : (
            <>
              {/* 헤더 */}
              <div className="px-5 py-3.5 border-b border-line-light flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[13px] font-bold text-ink">질문 {questions.findIndex(q => q.id === selQ.id) + 1}</div>
                    <div className="text-[11px] text-ink-secondary mt-0.5 font-medium">{selQ.tag || '기타'}</div>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                    selQ.student_answer
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-amber-700 bg-amber-50 border-amber-200'
                  }`}>
                    {selQ.student_answer ? '답변완료' : '미답변'}
                  </span>
                </div>

                {/* 5단계 스테퍼 */}
                <div className="flex">
                  {STEP_LABELS.map((label, i) => {
                    const stepNum = i + 1
                    // step 로직: 0=미답변, 1=답변완료, 2=1차피드백, 3=업그레이드, 4=최종피드백
                    // 스테퍼에서는 step+1 이 현재 위치
                    const currentStep = step + 1  // 1~5
                    const isDone = stepNum < currentStep
                    const isOn = stepNum === currentStep
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                        {i < 4 && (
                          <div className={`absolute top-3 left-[55%] w-[90%] h-[1.5px] ${isDone ? 'bg-emerald-500' : 'bg-line'}`} />
                        )}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 border-2 transition-all ${
                          isDone
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : isOn
                              ? 'bg-brand-high text-white border-brand-high shadow-[0_2px_8px_rgba(37,99,235,0.3)]'
                              : 'bg-gray-100 text-ink-muted border-line'
                        }`}>
                          {isDone ? '✓' : stepNum}
                        </div>
                        <div className={`text-[10px] font-semibold whitespace-nowrap ${
                          isDone ? 'text-emerald-600' : isOn ? 'text-brand-high-dark' : 'text-ink-muted'
                        }`}>
                          {label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 본문 */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50">

                {/* 질문 */}
                <div className="bg-white border border-line rounded-xl px-4 py-3">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">예상 질문</div>
                  <div className="text-[14px] font-bold text-ink leading-relaxed">
                    {selQ.teacher_edited_question || selQ.question}
                  </div>
                </div>

                {/* 질문 의도 */}
                {selQ.purpose && Array.isArray(selQ.purpose) && selQ.purpose.length > 0 && (
                  <div className="bg-brand-high-pale border border-brand-high-light rounded-xl px-4 py-3">
                    <div className="text-[11px] font-bold text-brand-high-dark mb-1.5">💡 질문 의도</div>
                    <ul className="pl-4 m-0">
                      {selQ.purpose.map((p: string, i: number) => (
                        <li key={i} className="text-[12px] text-brand-high-dark leading-relaxed list-disc">{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Step 1 */}
                <div className="bg-white border border-line rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-bold text-white bg-ink-secondary px-2 py-0.5 rounded-full">Step 1</span>
                    <span className="text-[11px] font-semibold text-ink-secondary">내 첫 답변</span>
                  </div>
                  {selQ.student_answer && !editingStep1 ? (
                    <div>
                      <div className="bg-gray-50 border border-line-light rounded-lg px-3 py-2.5 text-[13px] text-ink leading-relaxed mb-2 whitespace-pre-wrap">
                        {selQ.student_answer}
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => { setEditingStep1(true); setMyAnswer(selQ.student_answer || '') }}
                          className="text-[11px] font-semibold text-ink-secondary bg-white border border-line rounded-md px-3 py-1 hover:bg-gray-50 transition-all"
                        >
                          ✏️ 수정
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <textarea
                        value={myAnswer}
                        onChange={e => setMyAnswer(e.target.value)}
                        placeholder="답변을 작성해주세요..."
                        rows={4}
                        className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] outline-none resize-y leading-relaxed focus:border-brand-high transition-colors font-sans"
                      />
                      <div className="flex gap-2 mt-2 justify-end">
                        {editingStep1 && (
                          <button
                            onClick={() => { setEditingStep1(false); setMyAnswer('') }}
                            className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-all"
                          >
                            취소
                          </button>
                        )}
                        <button
                          onClick={handleSubmitFirst}
                          disabled={!myAnswer.trim() || submitFirst.isPending}
                          className={`w-[108px] h-9 rounded-lg text-[12px] font-bold flex-shrink-0 transition-all ${
                            myAnswer.trim() && !submitFirst.isPending
                              ? 'bg-brand-high text-white hover:bg-brand-high-dark shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
                              : 'bg-gray-200 text-ink-muted cursor-not-allowed'
                          }`}
                        >
                          {submitFirst.isPending ? '제출중...' : editingStep1 ? '수정 완료' : '답변 제출'}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Step 2 */}
                {selQ.student_answer && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-brand-high px-2 py-0.5 rounded-full">Step 2</span>
                      <span className="text-[11px] font-semibold text-ink-secondary">선생님 1차 피드백</span>
                    </div>
                    {round1?.teacher_feedback ? (
                      <div className="bg-brand-high-pale border border-brand-high-light rounded-lg px-3 py-2.5 text-[13px] text-brand-high-dark leading-relaxed whitespace-pre-wrap">
                        {round1.teacher_feedback}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">
                        선생님 피드백을 기다리는 중이에요.
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3 */}
                {round1?.teacher_feedback && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-ink-secondary px-2 py-0.5 rounded-full">Step 3</span>
                      <span className="text-[11px] font-semibold text-ink-secondary">업그레이드 답변</span>
                    </div>
                    {round2?.revised_answer && !editingStep3 ? (
                      <div>
                        <div className="bg-gray-50 border border-line-light rounded-lg px-3 py-2.5 text-[13px] text-ink leading-relaxed mb-2 whitespace-pre-wrap">
                          {round2.revised_answer}
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => { setEditingStep3(true); setUpgradedAnswer(round2.revised_answer || '') }}
                            className="text-[11px] font-semibold text-ink-secondary bg-white border border-line rounded-md px-3 py-1 hover:bg-gray-50 transition-all"
                          >
                            ✏️ 수정
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[12px] text-amber-800 font-medium mb-2">
                          💡 선생님 피드백을 반영해서 답변을 업그레이드해보세요!
                        </div>
                        <textarea
                          value={upgradedAnswer}
                          onChange={e => setUpgradedAnswer(e.target.value)}
                          placeholder="피드백을 반영한 업그레이드 답변을 작성해주세요..."
                          rows={4}
                          className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] outline-none resize-y leading-relaxed focus:border-brand-high transition-colors font-sans"
                        />
                        <div className="flex gap-2 mt-2 justify-end">
                          {editingStep3 && (
                            <button
                              onClick={() => { setEditingStep3(false); setUpgradedAnswer('') }}
                              className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-all"
                            >
                              취소
                            </button>
                          )}
                          <button
                            onClick={handleSubmitUpgraded}
                            disabled={!upgradedAnswer.trim() || submitUpgraded.isPending}
                            className={`w-[108px] h-9 rounded-lg text-[12px] font-bold flex-shrink-0 transition-all ${
                              upgradedAnswer.trim() && !submitUpgraded.isPending
                                ? 'bg-brand-high text-white hover:bg-brand-high-dark shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
                                : 'bg-gray-200 text-ink-muted cursor-not-allowed'
                            }`}
                          >
                            {submitUpgraded.isPending ? '제출중...' : editingStep3 ? '수정 완료' : '업그레이드 제출'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Step 4 */}
                {round2?.revised_answer && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-full">Step 4</span>
                      <span className="text-[11px] font-semibold text-ink-secondary">선생님 최종 피드백</span>
                    </div>
                    {round2.teacher_feedback ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-[13px] text-emerald-900 leading-relaxed whitespace-pre-wrap">
                        {round2.teacher_feedback}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">
                        선생님 최종 피드백을 기다리는 중이에요.
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5 꼬리질문 */}
                {followups.length > 0 && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-brand-high px-2 py-0.5 rounded-full">Step 5</span>
                      <span className="text-[11px] font-semibold text-ink-secondary">꼬리질문</span>
                    </div>
                    {followups.map((fu, i) => (
                      <div key={fu.id} className="mb-3">
                        <div className="flex items-start gap-2 px-3 py-2 bg-gray-50 border border-line-light rounded-lg mb-2 text-[12px] text-ink leading-relaxed">
                          <span className="text-[10px] font-bold text-brand-high-dark bg-brand-high-pale px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5">
                            꼬리 {i + 1}
                          </span>
                          <span className="leading-relaxed">
                            {fu.teacher_edited_question || fu.ai_generated_question}
                          </span>
                        </div>
                        {fu.student_answer ? (
                          <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-200">
                            <div className="text-[10px] font-bold text-emerald-700 mb-1.5">내 답변</div>
                            <div className="text-[12px] text-ink leading-relaxed whitespace-pre-wrap">{fu.student_answer}</div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-2.5 border border-line-light">
                            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">꼬리질문 답변</div>
                            <textarea
                              value={tailAnswers[fu.id] || ''}
                              onChange={e => setTailAnswers(prev => ({ ...prev, [fu.id]: e.target.value }))}
                              placeholder="꼬리질문에 대한 답변을 작성해주세요..."
                              rows={3}
                              className="w-full border border-line rounded-lg px-2.5 py-2 text-[12px] outline-none resize-y leading-relaxed bg-white focus:border-brand-high transition-colors font-sans"
                            />
                            <div className="flex gap-2 mt-2 justify-end">
                              <button
                                onClick={() => handleSubmitTail(fu.id)}
                                disabled={!(tailAnswers[fu.id] || '').trim() || submitTail.isPending}
                                className={`w-[102px] h-9 rounded-lg text-[12px] font-bold transition-all ${
                                  (tailAnswers[fu.id] || '').trim() && !submitTail.isPending
                                    ? 'bg-brand-high text-white hover:bg-brand-high-dark shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
                                    : 'bg-gray-200 text-ink-muted cursor-not-allowed'
                                }`}
                              >
                                {submitTail.isPending ? '제출중...' : '제출'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}