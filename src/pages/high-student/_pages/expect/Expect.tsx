import { useState } from 'react'

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
  '게임학과', '실내디자인학과', '패션디자인학과', '시각디자인학과', '산업디자인학과',
  '영상학과', '방송연예학과', '모델학과', '뷰티학과', '신학과', '불교학과',
]

const QUESTIONS: Record<string, any[]> = {
  '고1': [
    { id: 1, text: '최근 관심 있는 IT 기술이나 이슈가 있다면 설명해 주세요.', tag: '진로탐색', answered: true, purpose: ['지원자가 자기 주도적 탐색과 고민을 바탕으로 지원했는지 확인', '장기적인 목표와 학과 선택의 연계성 확인'], answer: '최근 가장 관심 있는 IT 기술은 생성형 AI입니다. 학교 진로탐색 시간에 AI의 사회적 영향에 대해 발표하면서 파이썬 프로그래밍을 배우며 직접 챗봇도 구현해 봤습니다.', teacherFeedback: '좋은 답변이에요! 구체적인 프로젝트 경험을 더 자세히 설명해보세요.', upgradedAnswer: '챗봇 프로젝트에서 자연어 처리 알고리즘을 직접 구현하면서 AI의 가능성과 한계를 체험했습니다.', finalFeedback: '훌륭해요! 구체적인 경험이 잘 드러났어요.', tails: ['생성형 AI의 윤리적 문제에 대해 어떻게 생각하나요?'] },
    { id: 2, text: '고등학교 생활 중 가장 의미 있었던 탐구 활동은 무엇인가요?', tag: '학교생활', answered: true, purpose: ['학생의 자기주도적 학습 역량 확인'], answer: '지구과학 시간에 기후변화와 식량 안보의 관계를 탐구했습니다.', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 3, text: '지원 학과를 선택한 구체적인 계기가 있나요?', tag: '지원동기', answered: false, purpose: ['지원 동기의 진정성 확인', '학과에 대한 이해도 파악'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
  '고2': [
    { id: 1, text: '본인의 장점과 단점을 솔직하게 말해보세요.', tag: '자기소개', answered: false, purpose: ['자기 인식 능력 확인', '성장 가능성 파악'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 2, text: '독서 활동 중 가장 인상 깊었던 책과 그 이유를 설명해주세요.', tag: '독서활동', answered: true, purpose: ['독서 활동의 깊이와 사고력 확인'], answer: '사피엔스를 읽고 인류 문명의 발전이 협업에서 비롯됐다는 인사이트를 얻었습니다.', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
  '고3': [
    { id: 1, text: '졸업 후 진로 계획을 구체적으로 말해보세요.', tag: '진로계획', answered: false, purpose: ['진로에 대한 구체적인 고민 확인'], answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
}

const MicBtn = ({ recording, onClick }: { recording: boolean, onClick: () => void }) => (
  <button onClick={onClick}
    style={{ width: 36, height: 36, background: recording ? '#FEE2E2' : '#EEF2FF', color: recording ? '#EF4444' : '#3B5BDB', border: `0.5px solid ${recording ? '#FCA5A5' : '#BAC8FF'}`, borderRadius: 7, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    {recording ? '⏹' : '🎙️'}
  </button>
)

const SubmitBtn = ({ label, onClick, disabled }: { label: string, onClick: () => void, disabled: boolean }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ width: 108, height: 36, background: !disabled ? '#3B5BDB' : '#E5E7EB', color: !disabled ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: !disabled ? 'pointer' : 'not-allowed', fontFamily: 'inherit', flexShrink: 0 }}>
    {label}
  </button>
)

export default function Expect() {
  const [grade, setGrade] = useState('고1')
  const [selQ, setSelQ] = useState<any>(null)
  const [questionData, setQuestionData] = useState(QUESTIONS)
  const [myAnswer, setMyAnswer] = useState('')
  const [upgradedAnswer, setUpgradedAnswer] = useState('')
  const [activeTab, setActiveTab] = useState<'questions' | 'upload'>('questions')
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File | null>>({ '고1': null, '고2': null, '고3': null })
  const [isRecording1, setIsRecording1] = useState(false)
  const [isRecording3, setIsRecording3] = useState(false)
  const [tailRecordings, setTailRecordings] = useState<Record<number, boolean>>({})
  const [editingStep1, setEditingStep1] = useState(false)
  const [editingStep3, setEditingStep3] = useState(false)
  const [deptSearch, setDeptSearch] = useState<Record<string, string>>({ '고1': '', '고2': '', '고3': '' })
  const [selDept, setSelDept] = useState<Record<string, string>>({ '고1': '', '고2': '', '고3': '' })
  const [deptDropOpen, setDeptDropOpen] = useState<Record<string, boolean>>({ '고1': false, '고2': false, '고3': false })

  const questions = questionData[grade] || []

  const filteredDepts = ALL_DEPTS.filter(d => d.includes(deptSearch[grade]))

  const getStep = (q: any) => {
    if (!q.answered) return 0
    if (!q.teacherFeedback) return 1
    if (!q.upgradedAnswer) return 2
    if (!q.finalFeedback) return 3
    return 4
  }

  const submitAnswer = () => {
    if (!myAnswer.trim() || !selQ) return
    const updated = { ...questionData, [grade]: questionData[grade].map(q => q.id === selQ.id ? { ...q, answered: true, answer: myAnswer, teacherFeedback: '', upgradedAnswer: '', finalFeedback: '' } : q) }
    setQuestionData(updated)
    setSelQ({ ...selQ, answered: true, answer: myAnswer })
    setMyAnswer('')
    setIsRecording1(false)
    setEditingStep1(false)
  }

  const submitUpgrade = () => {
    if (!upgradedAnswer.trim() || !selQ) return
    const updated = { ...questionData, [grade]: questionData[grade].map(q => q.id === selQ.id ? { ...q, upgradedAnswer, finalFeedback: '' } : q) }
    setQuestionData(updated)
    setSelQ({ ...selQ, upgradedAnswer })
    setUpgradedAnswer('')
    setIsRecording3(false)
    setEditingStep3(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: 'calc(100vh - 90px)', overflow: 'hidden', padding: '20px 24px' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['고1', '고2', '고3'].map(g => (
            <div key={g} onClick={() => { setGrade(g); setSelQ(null) }}
              style={{ padding: '7px 16px', borderRadius: 99, fontSize: 13, cursor: 'pointer', background: grade === g ? '#3B5BDB' : '#fff', color: grade === g ? '#fff' : '#6B7280', border: `0.5px solid ${grade === g ? '#3B5BDB' : '#E5E7EB'}`, fontWeight: grade === g ? 500 : 400 }}>
              {g}
            </div>
          ))}
        </div>
        <button
          onClick={() => window.print()}
          style={{ padding: '7px 16px', background: '#fff', color: '#3B5BDB', border: '0.5px solid #3B5BDB', borderRadius: 99, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
          🖨️ 최종 답변집 인쇄
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>

        <div style={{ width: 360, flexShrink: 0, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
            {[{ key: 'questions', label: '예상질문' }, { key: 'upload', label: '생기부 업로드' }].map(t => (
              <div key={t.key} onClick={() => setActiveTab(t.key as any)}
                style={{ flex: 1, padding: '12px 0', textAlign: 'center', fontSize: 13, fontWeight: activeTab === t.key ? 500 : 400, color: activeTab === t.key ? '#3B5BDB' : '#6B7280', borderBottom: activeTab === t.key ? '2px solid #3B5BDB' : '2px solid transparent', cursor: 'pointer' }}>
                {t.label}
              </div>
            ))}
          </div>

          {activeTab === 'questions' && (
            <>
              <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  총 <span style={{ color: '#3B5BDB', fontWeight: 600 }}>{questions.length}개</span> ·
                  답변완료 <span style={{ color: '#059669', fontWeight: 600 }}>{questions.filter(q => q.answered).length}개</span>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
                {questions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 12 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                    예상질문이 없어요.
                  </div>
                ) : questions.map((q, i) => (
                  <div key={q.id} onClick={() => { setSelQ(q); setMyAnswer(''); setUpgradedAnswer(''); setIsRecording1(false); setIsRecording3(false); setEditingStep1(false); setEditingStep3(false) }}
                    style={{ border: `0.5px solid ${selQ?.id === q.id ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 10, padding: '11px 13px', marginBottom: 7, cursor: 'pointer', background: selQ?.id === q.id ? '#EEF2FF' : '#fff' }}>
                    <span style={{ fontSize: 10, fontWeight: 500, color: '#3B5BDB', background: '#EEF2FF', padding: '1px 7px', borderRadius: 99, display: 'inline-block', marginBottom: 5 }}>질문 {i + 1}</span>
                    <div style={{ fontSize: 12, color: '#1a1a1a', lineHeight: 1.5, fontWeight: 500, marginBottom: 6 }}>{q.text}</div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <span style={{ fontSize: 10, color: '#6B7280', background: '#F3F4F6', padding: '2px 7px', borderRadius: 99 }}>{q.tag}</span>
                      {q.answered
                        ? <span style={{ fontSize: 10, color: '#059669', background: '#ECFDF5', padding: '2px 7px', borderRadius: 99, border: '0.5px solid #6EE7B7' }}>답변완료 · {getStep(q)}/5단계</span>
                        : <span style={{ fontSize: 10, color: '#D97706', background: '#FFF3E8', padding: '2px 7px', borderRadius: 99, border: '0.5px solid #FDBA74' }}>미답변</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'upload' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>
              <div style={{ fontSize: 11, color: '#6B7280', background: '#F3F4F6', padding: '4px 10px', borderRadius: 99, display: 'inline-block', marginBottom: 12 }}>{grade} 생기부</div>

              {/* 전공학과 선택 */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>전공학과 선택</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>지원 희망 학과를 선택하면 더 정확한 예상질문을 만들어 드려요.</div>
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `0.5px solid ${deptDropOpen[grade] ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 8, padding: '9px 12px', background: '#fff', cursor: 'text' }}
                    onClick={() => setDeptDropOpen(prev => ({ ...prev, [grade]: true }))}>
                    <span style={{ fontSize: 14, color: '#9CA3AF' }}>🔍</span>
                    <input
                      value={selDept[grade] && !deptDropOpen[grade] ? selDept[grade] : deptSearch[grade]}
                      onChange={e => {
                        setDeptSearch(prev => ({ ...prev, [grade]: e.target.value }))
                        setSelDept(prev => ({ ...prev, [grade]: '' }))
                        setDeptDropOpen(prev => ({ ...prev, [grade]: true }))
                      }}
                      onFocus={() => setDeptDropOpen(prev => ({ ...prev, [grade]: true }))}
                      placeholder="학과명 검색 (예: 컴퓨터, 간호, 경영...)"
                      style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, fontFamily: 'inherit', background: 'transparent', color: '#1a1a1a' }}
                    />
                    {selDept[grade] && (
                      <button onClick={e => { e.stopPropagation(); setSelDept(prev => ({ ...prev, [grade]: '' })); setDeptSearch(prev => ({ ...prev, [grade]: '' })) }}
                        style={{ fontSize: 11, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>✕</button>
                    )}
                  </div>

                  {deptDropOpen[grade] && (
                    <>
                      <div onClick={() => setDeptDropOpen(prev => ({ ...prev, [grade]: false }))}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }} />
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 8, zIndex: 20, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                        {filteredDepts.length === 0 ? (
                          <div style={{ padding: '12px 14px', fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>검색 결과가 없어요</div>
                        ) : filteredDepts.map((d, i) => (
                          <div key={i} onClick={() => {
                            setSelDept(prev => ({ ...prev, [grade]: d }))
                            setDeptSearch(prev => ({ ...prev, [grade]: '' }))
                            setDeptDropOpen(prev => ({ ...prev, [grade]: false }))
                          }}
                            style={{ padding: '9px 14px', fontSize: 12, color: '#1a1a1a', cursor: 'pointer', background: selDept[grade] === d ? '#EEF2FF' : '#fff', borderBottom: i < filteredDepts.length - 1 ? '0.5px solid #F3F4F6' : 'none' }}
                            onMouseEnter={e => { if (selDept[grade] !== d) (e.target as HTMLElement).style.background = '#F8F9FF' }}
                            onMouseLeave={e => { if (selDept[grade] !== d) (e.target as HTMLElement).style.background = '#fff' }}>
                            {d}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {selDept[grade] && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: 7, padding: '6px 10px' }}>
                    <span style={{ fontSize: 11, color: '#3B5BDB' }}>✓</span>
                    <span style={{ fontSize: 12, color: '#1E3A8A', fontWeight: 500 }}>{selDept[grade]}</span>
                    <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 2 }}>선택됨</span>
                  </div>
                )}
              </div>

              {/* 생기부 업로드 */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>생기부 업로드</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12, lineHeight: 1.6 }}>생기부를 업로드하면 선생님이 예상질문을 생성해드려요.</div>
                <input type="file" accept=".pdf" id={`upload-${grade}`} style={{ display: 'none' }}
                  onChange={e => {
                    if (!selDept[grade]) return
                    const file = e.target.files?.[0] || null
                    setUploadedFiles(prev => ({ ...prev, [grade]: file }))
                  }} />
                {uploadedFiles[grade] ? (
                  <div style={{ border: '0.5px solid #6EE7B7', borderRadius: 10, padding: '16px', background: '#ECFDF5', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 28 }}>📄</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#065F46', marginBottom: 2 }}>{uploadedFiles[grade]!.name}</div>
                      <div style={{ fontSize: 11, color: '#059669' }}>{(uploadedFiles[grade]!.size / 1024).toFixed(1)} KB · 업로드 완료</div>
                    </div>
                    <button onClick={() => { setUploadedFiles(prev => ({ ...prev, [grade]: null })); const input = document.getElementById(`upload-${grade}`) as HTMLInputElement; if (input) input.value = '' }}
                      style={{ fontSize: 11, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>삭제</button>
                  </div>
                ) : (
                  <label htmlFor={selDept[grade] ? `upload-${grade}` : undefined}
                    onClick={e => { if (!selDept[grade]) { e.preventDefault(); alert('먼저 전공학과를 선택해주세요!') } }}
                    style={{ display: 'block', border: `1.5px dashed ${selDept[grade] ? '#BAC8FF' : '#E5E7EB'}`, borderRadius: 10, padding: '24px 0', textAlign: 'center', background: selDept[grade] ? '#F5F8FF' : '#F9F9F9', cursor: selDept[grade] ? 'pointer' : 'not-allowed' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                    <div style={{ fontSize: 13, color: selDept[grade] ? '#3B5BDB' : '#9CA3AF', fontWeight: 500 }}>PDF 파일 업로드</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                      {selDept[grade] ? `${grade} 생기부를 업로드해주세요` : '전공학과를 먼저 선택해주세요'}
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selQ ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: 8 }}>
              <div style={{ fontSize: 32 }}>💬</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#6B7280' }}>질문을 선택해주세요</div>
              <div style={{ fontSize: 12 }}>왼쪽에서 질문을 클릭하면 답변을 작성할 수 있어요</div>
            </div>
          ) : (
            <>
              <div style={{ padding: '13px 16px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>질문 {questions.findIndex(q => q.id === selQ.id) + 1}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{selQ.tag}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 99, background: selQ.answered ? '#ECFDF5' : '#FFF3E8', color: selQ.answered ? '#059669' : '#D97706', border: `0.5px solid ${selQ.answered ? '#6EE7B7' : '#FDBA74'}` }}>
                    {selQ.answered ? '답변완료' : '미답변'}
                  </span>
                </div>
                <div style={{ display: 'flex' }}>
                  {STEP_LABELS.map((label, i) => {
                    const step = getStep(selQ)
                    const stepNum = i + 1
                    const isDone = stepNum < step
                    const isOn = stepNum === step
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative' }}>
                        {i < 4 && <div style={{ position: 'absolute', top: 11, left: '55%', width: '90%', height: 1, background: isDone ? '#059669' : '#E5E7EB' }} />}
                        <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, zIndex: 1, position: 'relative', background: isDone ? '#059669' : isOn ? '#3B5BDB' : '#F3F4F6', color: isDone || isOn ? '#fff' : '#9CA3AF', border: `1px solid ${isDone ? '#059669' : isOn ? '#3B5BDB' : '#E5E7EB'}` }}>
                          {isDone ? '✓' : stepNum}
                        </div>
                        <div style={{ fontSize: 10, color: isDone ? '#059669' : isOn ? '#3B5BDB' : '#9CA3AF', fontWeight: isOn ? 500 : 400, whiteSpace: 'nowrap' }}>{label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                <div style={{ background: '#F8F7F5', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 5 }}>예상 질문</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.6 }}>{selQ.text}</div>
                </div>

                <div style={{ background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: '#3B5BDB', marginBottom: 6 }}>💡 질문 의도</div>
                  <ul style={{ paddingLeft: 14 }}>
                    {selQ.purpose.map((p: string, i: number) => (
                      <li key={i} style={{ fontSize: 12, color: '#1E3A8A', lineHeight: 1.7 }}>{p}</li>
                    ))}
                  </ul>
                </div>

                {/* Step 1 */}
                <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#6B7280', padding: '2px 8px', borderRadius: 99 }}>Step 1</span>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>내 첫 답변</span>
                  </div>
                  {selQ.answer && !editingStep1 ? (
                    <div>
                      <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#374151', lineHeight: 1.8, marginBottom: 8 }}>{selQ.answer}</div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => { setEditingStep1(true); setMyAnswer(selQ.answer) }}
                          style={{ fontSize: 11, color: '#6B7280', background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                          ✏️ 수정
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isRecording1 && (
                        <div style={{ background: '#FEE2E2', border: '0.5px solid #FCA5A5', borderRadius: 8, padding: '8px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                          <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>녹음 중...</span>
                        </div>
                      )}
                      <textarea value={myAnswer} onChange={e => setMyAnswer(e.target.value)}
                        placeholder="답변을 작성하거나 마이크로 녹음해주세요..." rows={4}
                        style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                        {editingStep1 && (
                          <button onClick={() => { setEditingStep1(false); setMyAnswer('') }}
                            style={{ height: 36, padding: '0 12px', background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                            취소
                          </button>
                        )}
                        <MicBtn recording={isRecording1} onClick={() => setIsRecording1(!isRecording1)} />
                        <SubmitBtn label={editingStep1 ? '수정 완료' : '답변 제출'} onClick={submitAnswer} disabled={!myAnswer.trim()} />
                      </div>
                    </>
                  )}
                </div>

                {/* Step 2 */}
                {selQ.answered && (
                  <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#3B5BDB', padding: '2px 8px', borderRadius: 99 }}>Step 2</span>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>선생님 1차 피드백</span>
                    </div>
                    {selQ.teacherFeedback ? (
                      <div style={{ background: '#EEF2FF', border: '0.5px solid #BAC8FF', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#1E3A8A', lineHeight: 1.8 }}>{selQ.teacherFeedback}</div>
                    ) : (
                      <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>선생님 피드백을 기다리는 중이에요.</div>
                    )}
                  </div>
                )}

                {/* Step 3 */}
                {selQ.teacherFeedback && (
                  <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#6B7280', padding: '2px 8px', borderRadius: 99 }}>Step 3</span>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>업그레이드 답변</span>
                    </div>
                    {selQ.upgradedAnswer && !editingStep3 ? (
                      <div>
                        <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#374151', lineHeight: 1.8, marginBottom: 8 }}>{selQ.upgradedAnswer}</div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button onClick={() => { setEditingStep3(true); setUpgradedAnswer(selQ.upgradedAnswer) }}
                            style={{ fontSize: 11, color: '#6B7280', background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                            ✏️ 수정
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ background: '#FFF3E8', border: '0.5px solid #FDBA74', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400E', marginBottom: 8 }}>
                          💡 선생님 피드백을 반영해서 답변을 업그레이드해보세요!
                        </div>
                        {isRecording3 && (
                          <div style={{ background: '#FEE2E2', border: '0.5px solid #FCA5A5', borderRadius: 8, padding: '8px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                            <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>녹음 중...</span>
                          </div>
                        )}
                        <textarea value={upgradedAnswer} onChange={e => setUpgradedAnswer(e.target.value)}
                          placeholder="피드백을 반영한 업그레이드 답변을 작성하거나 마이크로 녹음해주세요..." rows={4}
                          style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }} />
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                          {editingStep3 && (
                            <button onClick={() => { setEditingStep3(false); setUpgradedAnswer('') }}
                              style={{ height: 36, padding: '0 12px', background: '#fff', color: '#6B7280', border: '0.5px solid #E5E7EB', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                              취소
                            </button>
                          )}
                          <MicBtn recording={isRecording3} onClick={() => setIsRecording3(!isRecording3)} />
                          <SubmitBtn label={editingStep3 ? '수정 완료' : '업그레이드 제출'} onClick={submitUpgrade} disabled={!upgradedAnswer.trim()} />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Step 4 */}
                {selQ.upgradedAnswer && (
                  <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#059669', padding: '2px 8px', borderRadius: 99 }}>Step 4</span>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>선생님 최종 피드백</span>
                    </div>
                    {selQ.finalFeedback ? (
                      <div style={{ background: '#ECFDF5', border: '0.5px solid #6EE7B7', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#065F46', lineHeight: 1.8 }}>{selQ.finalFeedback}</div>
                    ) : (
                      <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>선생님 최종 피드백을 기다리는 중이에요.</div>
                    )}
                  </div>
                )}

                {/* Step 5 꼬리질문 */}
                {selQ.tails && selQ.tails.length > 0 && (
                  <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#3B5BDB', padding: '2px 8px', borderRadius: 99 }}>Step 5</span>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>꼬리질문</span>
                    </div>
                    {selQ.tails.map((t: string, i: number) => (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '8px 10px', background: '#F8F7F5', borderRadius: 7, marginBottom: 8, fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                          <span style={{ fontSize: 10, fontWeight: 500, color: '#3B5BDB', background: '#EEF2FF', padding: '2px 6px', borderRadius: 99, flexShrink: 0, marginTop: 1 }}>꼬리 {i + 1}</span>
                          {t}
                        </div>
                        {tailRecordings[i] && (
                          <div style={{ background: '#FEE2E2', border: '0.5px solid #FCA5A5', borderRadius: 8, padding: '8px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
                            <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>녹음 중...</span>
                          </div>
                        )}
                        <div style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 6 }}>꼬리질문 답변</div>
                          <textarea placeholder="꼬리질문에 대한 답변을 작성하거나 마이크로 녹음해주세요..." rows={2}
                            style={{ width: '100%', border: '0.5px solid #E5E7EB', borderRadius: 7, padding: '8px 10px', fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.6, background: '#fff', boxSizing: 'border-box' as const }} />
                          <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                            <MicBtn recording={tailRecordings[i]} onClick={() => setTailRecordings(prev => ({ ...prev, [i]: !prev[i] }))} />
                            <button style={{ width: 102, height: 34, background: '#3B5BDB', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                              제출
                            </button>
                          </div>
                        </div>
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