import { useState } from 'react'

const ALL_UNIVERSITIES = [
  '서울대학교', '연세대학교', '고려대학교', '한양대학교', '성균관대학교',
  '중앙대학교', '경희대학교', '이화여자대학교', '가천대학교', '인하대학교',
  '아주대학교', '단국대학교', '숙명여자대학교', '동국대학교', '건국대학교',
  '홍익대학교', '세종대학교', '국민대학교', '광운대학교', '숭실대학교',
]

const ALL_DEPTS = [
  '간호학과', '건축학과', '경영학과', '경제학과', '고분자공학과',
  '광고홍보학과', '교육학과', '국어국문학과', '기계공학과', '기계공학부',
  '데이터사이언스학과', '디자인학과', '디지털미디어학과', '로봇공학과',
  '무역학과', '문헌정보학과', '물리학과', '바이오공학과', '법학과', '법학부',
  '사회복지학과', '사회학과', '산업공학과', '생명과학과', '생명공학과',
  '소프트웨어학과', '소프트웨어학부', '수학과', '심리학과', '약학과',
  '언어학과', '에너지공학과', '영어영문학과', '의과대학', '의류학과',
  '인공지능학과', '전기공학과', '전기전자공학부', '전자공학과', '정치외교학과',
  '철학과', '치의학과', '컴퓨터공학과', '컴퓨터공학부', '컴퓨터과학과',
  '통계학과', '행정학과', '화학공학과', '화학공학부', '화학과', '환경공학과',
  '회계학과', '물리치료학과', '방사선학과', '응급구조학과', '보건행정학과',
  '항공우주공학과', '토목공학과', '건설환경공학과', '도시공학과', '조경학과',
  '금융학과', '세무학과', '관광학과', '호텔경영학과', '미술학과', '음악학과',
  '영상학과', '게임학과', '패션디자인학과', '시각디자인학과', '신학과',
]

const PAST_QUESTIONS: Record<string, any[]> = {
  '서울대학교_컴퓨터공학부': [
    { id: 1, text: '본인의 전공 선택 동기와 관련된 구체적인 경험을 말해보세요.', type: '공통', answered: true, answer: '중학교 때 코딩 동아리에서 처음 프로그래밍을 접했고 문제를 논리적으로 해결하는 과정이 재미있었습니다.', teacherFeedback: '좋은 답변이에요! 더 구체적인 프로젝트 경험을 추가하면 좋겠어요.', upgradedAnswer: '중학교 코딩 동아리에서 간단한 계산기 앱을 만들며 프로그래밍의 재미를 알게 됐고, 이후 고등학교에서 AI 챗봇 프로젝트까지 발전시켰습니다.', finalFeedback: '훌륭해요! 구체적인 성장 과정이 잘 드러났어요.', tails: ['그 경험이 지원 학과 선택에 어떤 영향을 미쳤나요?'] },
    { id: 2, text: '가장 인상 깊었던 수업과 그 이유를 설명해주세요.', type: '공통', answered: true, answer: '고2 때 들은 인공지능 수업이 가장 인상 깊었습니다.', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 3, text: '팀 프로젝트에서 갈등이 생겼을 때 어떻게 해결했나요?', type: '인성', answered: false, answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 4, text: 'AI 기술의 윤리적 문제에 대해 어떻게 생각하시나요?', type: '전공', answered: false, answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 5, text: '본인의 연구 경험이 있다면 말해보세요.', type: '전공', answered: false, answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
  '연세대학교_컴퓨터과학과': [
    { id: 1, text: '지원 학과에서 배우고 싶은 것이 무엇인가요?', type: '공통', answered: true, answer: '자연어 처리와 컴퓨터 비전을 깊이 공부하고 싶습니다.', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 2, text: '본인의 강점이 학과 공부에 어떻게 도움이 될까요?', type: '인성', answered: false, answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
  '고려대학교_컴퓨터학과': [
    { id: 1, text: '전공 관련 최근 이슈에 대해 본인의 견해를 말해주세요.', type: '전공', answered: false, answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
}

const TYPE_COLOR: Record<string, any> = {
  '공통': { bg: '#EEF2FF', color: '#3B5BDB', border: '#BAC8FF' },
  '전공': { bg: '#F0FDF4', color: '#059669', border: '#6EE7B7' },
  '인성': { bg: '#FFF3E8', color: '#D97706', border: '#FDBA74' },
}

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백', '꼬리질문']

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

export default function Past() {
  const [selUnivName, setSelUnivName] = useState('')
  const [selDeptName, setSelDeptName] = useState('')
  const [univSearch, setUnivSearch] = useState('')
  const [deptSearch, setDeptSearch] = useState('')
  const [univDropOpen, setUnivDropOpen] = useState(false)
  const [deptDropOpen, setDeptDropOpen] = useState(false)
  const [selQ, setSelQ] = useState<any>(null)
  const [questions, setQuestions] = useState(PAST_QUESTIONS)
  const [myAnswer, setMyAnswer] = useState('')
  const [upgradedAnswer, setUpgradedAnswer] = useState('')
  const [isRecording1, setIsRecording1] = useState(false)
  const [isRecording3, setIsRecording3] = useState(false)
  const [tailRecordings, setTailRecordings] = useState<Record<number, boolean>>({})
  const [editingStep1, setEditingStep1] = useState(false)
  const [editingStep3, setEditingStep3] = useState(false)

  const qKey = selUnivName && selDeptName ? `${selUnivName}_${selDeptName}` : ''
  const curQuestions = qKey ? (questions[qKey] || []) : []
  const filteredUnivs = ALL_UNIVERSITIES.filter(u => u.includes(univSearch))
  const filteredDepts = ALL_DEPTS.filter(d => d.includes(deptSearch))

  const getStep = (q: any) => {
    if (!q.answered) return 0
    if (!q.teacherFeedback) return 1
    if (!q.upgradedAnswer) return 2
    if (!q.finalFeedback) return 3
    return 4
  }

  const submitAnswer = () => {
    if (!myAnswer.trim() || !selQ || !qKey) return
    const updated = { ...questions, [qKey]: questions[qKey].map(q => q.id === selQ.id ? { ...q, answered: true, answer: myAnswer, teacherFeedback: '', upgradedAnswer: '', finalFeedback: '' } : q) }
    setQuestions(updated)
    setSelQ({ ...selQ, answered: true, answer: myAnswer, teacherFeedback: '', upgradedAnswer: '', finalFeedback: '' })
    setMyAnswer(''); setIsRecording1(false); setEditingStep1(false)
  }

  const submitUpgrade = () => {
    if (!upgradedAnswer.trim() || !selQ || !qKey) return
    const updated = { ...questions, [qKey]: questions[qKey].map(q => q.id === selQ.id ? { ...q, upgradedAnswer, finalFeedback: '' } : q) }
    setQuestions(updated)
    setSelQ({ ...selQ, upgradedAnswer, finalFeedback: '' })
    setUpgradedAnswer(''); setIsRecording3(false); setEditingStep3(false)
  }

  const resetAll = () => {
    setSelUnivName(''); setSelDeptName('')
    setUnivSearch(''); setDeptSearch('')
    setSelQ(null)
  }

  // 학교+학과 둘 다 선택된 상태면 입력창은 비워서 보여줌
  const univInputValue = selUnivName && selDeptName ? '' : (selUnivName && !univDropOpen ? selUnivName : univSearch)
  const deptInputValue = selUnivName && selDeptName ? '' : (selDeptName && !deptDropOpen ? selDeptName : deptSearch)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: 'calc(100vh - 50px)', overflow: 'hidden', padding: '20px 24px' }}>

      {/* 학교/학과 선택 */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>

        {/* 학교 검색 */}
        <div style={{ position: 'relative', width: 180 }}>
          <div onClick={() => { if (!selUnivName || !selDeptName) setUnivDropOpen(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, border: `0.5px solid ${univDropOpen ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 8, padding: '7px 10px', background: '#fff', cursor: 'text', height: 34 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>🏫</span>
            <input
              value={univInputValue}
              onChange={e => { setUnivSearch(e.target.value); setSelUnivName(''); setSelDeptName(''); setSelQ(null); setUnivDropOpen(true) }}
              onFocus={() => { if (!selUnivName || !selDeptName) setUnivDropOpen(true) }}
              placeholder="학교 검색"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, fontFamily: 'inherit', background: 'transparent', color: '#1a1a1a', minWidth: 0 }}
            />
            {selUnivName && !selDeptName
              ? <button onClick={e => { e.stopPropagation(); setSelUnivName(''); setSelDeptName(''); setUnivSearch(''); setSelQ(null) }}
                  style={{ fontSize: 10, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>✕</button>
              : !selDeptName
                ? <span onClick={e => { e.stopPropagation(); setUnivDropOpen(!univDropOpen) }}
                    style={{ fontSize: 10, color: '#9CA3AF', cursor: 'pointer', flexShrink: 0, userSelect: 'none' as const }}>▼</span>
                : null
            }
          </div>
          {univDropOpen && (
            <>
              <div onClick={() => setUnivDropOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }} />
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 8, zIndex: 20, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                {filteredUnivs.length === 0 ? (
                  <div style={{ padding: '10px 12px', fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>검색 결과 없음</div>
                ) : filteredUnivs.map((u, i) => (
                  <div key={i} onClick={() => { setSelUnivName(u); setUnivSearch(''); setSelDeptName(''); setDeptSearch(''); setUnivDropOpen(false); setSelQ(null) }}
                    style={{ padding: '8px 12px', fontSize: 12, color: '#1a1a1a', cursor: 'pointer', background: selUnivName === u ? '#EEF2FF' : '#fff', borderBottom: i < filteredUnivs.length - 1 ? '0.5px solid #F3F4F6' : 'none' }}
                    onMouseEnter={e => { if (selUnivName !== u) (e.currentTarget as HTMLElement).style.background = '#F8F9FF' }}
                    onMouseLeave={e => { if (selUnivName !== u) (e.currentTarget as HTMLElement).style.background = '#fff' }}>
                    {u}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <span style={{ fontSize: 12, color: '#D1D5DB', flexShrink: 0 }}>›</span>

        {/* 학과 검색 */}
        <div style={{ position: 'relative', width: 180 }}>
          <div onClick={() => { if (selUnivName && !selDeptName) setDeptDropOpen(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, border: `0.5px solid ${deptDropOpen ? '#3B5BDB' : selUnivName ? '#E5E7EB' : '#F3F4F6'}`, borderRadius: 8, padding: '7px 10px', background: selUnivName ? '#fff' : '#F9F9F9', cursor: selUnivName && !selDeptName ? 'text' : selUnivName ? 'default' : 'not-allowed', height: 34 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>📚</span>
            <input
              value={deptInputValue}
              onChange={e => { if (!selUnivName) return; setDeptSearch(e.target.value); setSelDeptName(''); setSelQ(null); setDeptDropOpen(true) }}
              onFocus={() => { if (selUnivName && !selDeptName) setDeptDropOpen(true) }}
              placeholder={selUnivName ? '학과 검색' : '학교 먼저 선택'}
              disabled={!selUnivName}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, fontFamily: 'inherit', background: 'transparent', color: '#1a1a1a', minWidth: 0 }}
            />
            {selDeptName && selUnivName
              ? null
              : selUnivName
                ? <span onClick={e => { e.stopPropagation(); setDeptDropOpen(!deptDropOpen) }}
                    style={{ fontSize: 10, color: '#9CA3AF', cursor: 'pointer', flexShrink: 0, userSelect: 'none' as const }}>▼</span>
                : <span style={{ fontSize: 10, color: '#D1D5DB', flexShrink: 0 }}>▼</span>
            }
          </div>
          {deptDropOpen && selUnivName && (
            <>
              <div onClick={() => setDeptDropOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }} />
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 8, zIndex: 20, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                {filteredDepts.length === 0 ? (
                  <div style={{ padding: '10px 12px', fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>검색 결과 없음</div>
                ) : filteredDepts.map((d, i) => (
                  <div key={i} onClick={() => { setSelDeptName(d); setDeptSearch(''); setDeptDropOpen(false); setSelQ(null) }}
                    style={{ padding: '8px 12px', fontSize: 12, color: '#1a1a1a', cursor: 'pointer', background: selDeptName === d ? '#EEF2FF' : '#fff', borderBottom: i < filteredDepts.length - 1 ? '0.5px solid #F3F4F6' : 'none' }}
                    onMouseEnter={e => { if (selDeptName !== d) (e.currentTarget as HTMLElement).style.background = '#F8F9FF' }}
                    onMouseLeave={e => { if (selDeptName !== d) (e.currentTarget as HTMLElement).style.background = '#fff' }}>
                    {d}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 선택 완료 태그 */}
        {selUnivName && selDeptName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#3B5BDB', background: '#EEF2FF', padding: '4px 10px', borderRadius: 99, border: '0.5px solid #BAC8FF', flexShrink: 0 }}>
            <span>✓ {selUnivName} · {selDeptName}</span>
            <button onClick={resetAll}
              style={{ fontSize: 10, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>

        {/* 왼쪽 질문 목록 */}
        <div style={{ width: 360, flexShrink: 0, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
            {selUnivName && selDeptName ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{selUnivName}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{selDeptName}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                  총 <span style={{ color: '#3B5BDB', fontWeight: 600 }}>{curQuestions.length}개</span> ·
                  답변완료 <span style={{ color: '#059669', fontWeight: 600 }}>{curQuestions.filter(q => q.answered).length}개</span>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>학교와 학과를 선택해주세요</div>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
            {!selUnivName || !selDeptName ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 12 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🏫</div>
                위에서 학교와 학과를 선택해주세요
              </div>
            ) : curQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 12 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📝</div>
                기출문제가 없어요.
              </div>
            ) : curQuestions.map((q, i) => {
              const tc = TYPE_COLOR[q.type] || TYPE_COLOR['공통']
              return (
                <div key={q.id} onClick={() => { setSelQ(q); setMyAnswer(''); setUpgradedAnswer(''); setIsRecording1(false); setIsRecording3(false); setEditingStep1(false); setEditingStep3(false) }}
                  style={{ border: `0.5px solid ${selQ?.id === q.id ? '#3B5BDB' : '#E5E7EB'}`, borderRadius: 10, padding: '11px 13px', marginBottom: 7, cursor: 'pointer', background: selQ?.id === q.id ? '#EEF2FF' : '#fff' }}>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#3B5BDB', background: '#EEF2FF', padding: '1px 7px', borderRadius: 99 }}>Q{i + 1}</span>
                    <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 7px', borderRadius: 99, background: tc.bg, color: tc.color, border: `0.5px solid ${tc.border}` }}>{q.type}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#1a1a1a', lineHeight: 1.5, fontWeight: 500, marginBottom: 5 }}>{q.text}</div>
                  {q.answered
                    ? <span style={{ fontSize: 10, color: '#059669', background: '#ECFDF5', padding: '2px 7px', borderRadius: 99, border: '0.5px solid #6EE7B7' }}>답변완료 · {getStep(q)}/5단계</span>
                    : <span style={{ fontSize: 10, color: '#D97706', background: '#FFF3E8', padding: '2px 7px', borderRadius: 99, border: '0.5px solid #FDBA74' }}>미답변</span>
                  }
                </div>
              )
            })}
          </div>
        </div>

        {/* 오른쪽 상세 */}
        <div style={{ flex: 1, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selQ ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: 8 }}>
              <div style={{ fontSize: 32 }}>🎓</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#6B7280' }}>질문을 선택해주세요</div>
              <div style={{ fontSize: 12 }}>왼쪽에서 기출문제를 클릭하면 답변을 작성할 수 있어요</div>
            </div>
          ) : (
            <>
              <div style={{ padding: '13px 16px', borderBottom: '0.5px solid #E5E7EB', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>Q{curQuestions.findIndex(q => q.id === selQ.id) + 1}</div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: TYPE_COLOR[selQ.type]?.bg, color: TYPE_COLOR[selQ.type]?.color, border: `0.5px solid ${TYPE_COLOR[selQ.type]?.border}` }}>{selQ.type}</span>
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
                  <div style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', marginBottom: 5 }}>기출 질문</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.6 }}>{selQ.text}</div>
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