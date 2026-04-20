import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '../../_store/auth'

const ALL_SCHOOLS = [
  '인천하늘고', '한국과학영재학교', '경기과학고', '서울과학고', '한성과학고',
  '세종과학고', '대전과학고', '광주과학고', '대구과학고', '부산과학고',
  '대원외고', '대일외고', '명덕외고', '서울외고', '이화외고',
  '한영외고', '민족사관고', '하나고', '외대부고', '북일고',
  '상산고', '현대청운고', '포항제철고', '김천고', '휘문고',
  '중동고', '세화고', '양정고', '배재고', '이대부고',
]

const PAST_QUESTIONS: Record<string, any[]> = {
  '인천하늘고': [
    { id: 1, text: '인천하늘고에 지원한 구체적인 이유를 말해보세요.', type: '지원동기', answered: true, answer: '인천하늘고의 자기주도학습 전형이 제 학습 방식과 잘 맞는다고 생각했습니다.', teacherFeedback: '좋은 답변이에요! 학교 건학이념과 더 연결해보세요.', upgradedAnswer: '', finalFeedback: '', tails: ['건학이념 중 어떤 부분이 가장 공감됐나요?'] },
    { id: 2, text: '자기주도학습 경험을 구체적으로 말해보세요.', type: '자기주도', answered: false, answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 3, text: '입학 후 어떤 활동을 통해 꿈을 키워나갈 계획인가요?', type: '활동계획', answered: false, answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 4, text: '배려나 나눔을 실천한 경험을 말해보세요.', type: '인성', answered: false, answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 5, text: '졸업 후 진로 계획을 구체적으로 말해보세요.', type: '진로', answered: false, answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
  '민족사관고': [
    { id: 1, text: '민족사관고에 지원한 이유와 입학 후 목표를 말해보세요.', type: '지원동기', answered: false, answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 2, text: '리더십을 발휘한 경험이 있다면 구체적으로 말해보세요.', type: '인성', answered: false, answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 3, text: '본인의 강점이 민족사관고에서 어떻게 발휘될 수 있나요?', type: '자기소개', answered: false, answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
  '하나고': [
    { id: 1, text: '하나고의 교육철학과 본인의 가치관이 어떻게 연결되나요?', type: '지원동기', answered: false, answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 2, text: '공동체 생활에서 갈등을 해결한 경험을 말해보세요.', type: '인성', answered: false, answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
  '대원외고': [
    { id: 1, text: '외국어 공부에 관심을 갖게 된 계기가 무엇인가요?', type: '지원동기', answered: false, answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 2, text: '글로벌 이슈 중 관심 있는 주제와 본인의 견해를 말해보세요.', type: '전공', answered: false, answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
    { id: 3, text: '외국어를 활용한 경험이 있다면 말해보세요.', type: '활동', answered: false, answer: '', teacherFeedback: '', upgradedAnswer: '', finalFeedback: '', tails: [] },
  ],
}

const TYPE_COLOR: Record<string, string> = {
  '지원동기': 'bg-[#EEF2FF] text-[#3B5BDB] border-[#BAC8FF]',
  '자기주도': 'bg-brand-middle-bg text-brand-middle-dark border-brand-middle-light',
  '활동계획': 'bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]',
  '인성':     'bg-amber-50 text-amber-700 border-amber-200',
  '진로':     'bg-brand-middle-pale text-brand-middle-dark border-brand-middle-light',
  '전공':     'bg-brand-middle-bg text-brand-middle-dark border-brand-middle-light',
  '활동':     'bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]',
  '자기소개': 'bg-orange-50 text-orange-700 border-orange-200',
}

const STEP_LABELS = ['첫 답변', '1차 피드백', '업그레이드', '최종 피드백', '꼬리질문']

const MicBtn = ({ recording, onClick }: { recording: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 text-base transition-all ${
      recording
        ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100'
        : 'bg-brand-middle-pale border-brand-middle-light text-brand-middle-dark hover:bg-brand-middle-bg'
    }`}
  >
    {recording ? '⏹' : '🎙️'}
  </button>
)

const SubmitBtn = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-[108px] h-9 rounded-lg text-[12px] font-semibold flex-shrink-0 transition-all ${
      !disabled
        ? 'bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle'
        : 'bg-gray-100 text-ink-muted cursor-not-allowed'
    }`}
  >
    {label}
  </button>
)

export default function MiddlePast() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)

  const [selSchool, setSelSchool] = useState('')
  const [schoolSearch, setSchoolSearch] = useState('')
  const [schoolDropOpen, setSchoolDropOpen] = useState(false)
  const [selQ, setSelQ] = useState<any>(null)
  const [questions, setQuestions] = useState(PAST_QUESTIONS)
  const [myAnswer, setMyAnswer] = useState('')
  const [upgradedAnswer, setUpgradedAnswer] = useState('')
  const [isRecording1, setIsRecording1] = useState(false)
  const [isRecording3, setIsRecording3] = useState(false)
  const [tailRecordings, setTailRecordings] = useState<Record<number, boolean>>({})
  const [editingStep1, setEditingStep1] = useState(false)
  const [editingStep3, setEditingStep3] = useState(false)

  const curQuestions = selSchool ? (questions[selSchool] || []) : []
  const filteredSchools = ALL_SCHOOLS.filter(s => s.includes(schoolSearch))

  const getStep = (q: any) => {
    if (!q.answered) return 0
    if (!q.teacherFeedback) return 1
    if (!q.upgradedAnswer) return 2
    if (!q.finalFeedback) return 3
    return 4
  }

  const submitAnswer = () => {
    if (!myAnswer.trim() || !selQ || !selSchool) return
    const updated = { ...questions, [selSchool]: questions[selSchool].map(q =>
      q.id === selQ.id ? { ...q, answered: true, answer: myAnswer, teacherFeedback: '', upgradedAnswer: '', finalFeedback: '' } : q
    )}
    setQuestions(updated)
    setSelQ({ ...selQ, answered: true, answer: myAnswer, teacherFeedback: '', upgradedAnswer: '', finalFeedback: '' })
    setMyAnswer('')
    setIsRecording1(false)
    setEditingStep1(false)
  }

  const submitUpgrade = () => {
    if (!upgradedAnswer.trim() || !selQ || !selSchool) return
    const updated = { ...questions, [selSchool]: questions[selSchool].map(q =>
      q.id === selQ.id ? { ...q, upgradedAnswer, finalFeedback: '' } : q
    )}
    setQuestions(updated)
    setSelQ({ ...selQ, upgradedAnswer, finalFeedback: '' })
    setUpgradedAnswer('')
    setIsRecording3(false)
    setEditingStep3(false)
  }

  const schoolInputValue = selSchool && !schoolDropOpen ? selSchool : schoolSearch

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-50px)] overflow-hidden px-6 py-5 font-sans text-ink">

      {/* 헤더 */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[18px] font-extrabold text-ink tracking-tight">기출문제</div>
          <div className="text-[12px] text-ink-muted mt-0.5">{student?.name} · {academy?.academyName}</div>
        </div>
        {selSchool && (
          <div className="bg-brand-middle-bg text-brand-middle-dark text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-brand-middle-light">
            {curQuestions.filter(q => q.answered).length}/{curQuestions.length} 답변완료
          </div>
        )}
      </div>

      {/* 학교 선택 */}
      <div className="flex gap-2 flex-shrink-0 items-center">
        <div className="relative w-[260px]">
          <div
            onClick={() => setSchoolDropOpen(true)}
            className={`flex items-center gap-2 border rounded-lg px-3 bg-white cursor-text h-10 transition-all ${
              schoolDropOpen ? 'border-brand-middle ring-2 ring-brand-middle/10' : 'border-line'
            }`}
          >
            <span className="text-base flex-shrink-0">🏫</span>
            <input
              value={schoolInputValue}
              onChange={e => { setSchoolSearch(e.target.value); setSelSchool(''); setSelQ(null); setSchoolDropOpen(true) }}
              onFocus={() => setSchoolDropOpen(true)}
              placeholder="학교 검색 (예: 인천하늘고, 민사고...)"
              className="flex-1 border-none outline-none text-[13px] bg-transparent text-ink min-w-0 placeholder:text-ink-muted"
            />
            {selSchool ? (
              <button
                onClick={e => { e.stopPropagation(); setSelSchool(''); setSchoolSearch(''); setSelQ(null) }}
                className="text-[11px] text-ink-muted hover:text-ink transition-colors flex-shrink-0"
              >
                ✕
              </button>
            ) : (
              <span
                onClick={e => { e.stopPropagation(); setSchoolDropOpen(!schoolDropOpen) }}
                className="text-[10px] text-ink-muted cursor-pointer flex-shrink-0 select-none"
              >
                ▼
              </span>
            )}
          </div>

          {schoolDropOpen && (
            <>
              <div
                onClick={() => setSchoolDropOpen(false)}
                className="fixed inset-0 z-10"
              />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-line rounded-lg z-20 max-h-[240px] overflow-y-auto shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                {filteredSchools.length === 0 ? (
                  <div className="px-3 py-2.5 text-[12px] text-ink-muted text-center">검색 결과 없음</div>
                ) : filteredSchools.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => { setSelSchool(s); setSchoolSearch(''); setSchoolDropOpen(false); setSelQ(null) }}
                    className={`px-3 py-2 text-[13px] text-ink cursor-pointer transition-colors ${
                      selSchool === s
                        ? 'bg-brand-middle-pale font-semibold text-brand-middle-dark'
                        : 'hover:bg-brand-middle-pale/50'
                    } ${i < filteredSchools.length - 1 ? 'border-b border-line-light' : ''}`}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {selSchool && (
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-middle-dark bg-brand-middle-bg px-3 py-1.5 rounded-full border border-brand-middle-light flex-shrink-0">
            ✓ {selSchool}
          </div>
        )}
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">

        {/* 왼쪽: 질문 목록 */}
        <div className="w-[360px] flex-shrink-0 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="px-3.5 py-3 border-b border-line flex-shrink-0">
            {selSchool ? (
              <>
                <div className="text-[14px] font-bold text-ink tracking-tight">{selSchool}</div>
                <div className="text-[11px] text-ink-secondary mt-1">
                  총 <span className="text-brand-middle-dark font-bold">{curQuestions.length}개</span> ·
                  답변완료 <span className="text-brand-middle-dark font-bold">{curQuestions.filter(q => q.answered).length}개</span>
                </div>
              </>
            ) : (
              <div className="text-[12px] text-ink-muted">학교를 선택해주세요</div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2.5">
            {!selSchool ? (
              <div className="text-center py-10 text-ink-muted text-[12px]">
                <div className="text-3xl mb-2">🏫</div>
                위에서 학교를 선택해주세요
              </div>
            ) : curQuestions.length === 0 ? (
              <div className="text-center py-10 text-ink-muted text-[12px]">
                <div className="text-3xl mb-2">📝</div>
                기출문제가 없어요.
              </div>
            ) : curQuestions.map((q, i) => {
              const typeClass = TYPE_COLOR[q.type] || TYPE_COLOR['지원동기']
              return (
                <div
                  key={q.id}
                  onClick={() => { setSelQ(q); setMyAnswer(''); setUpgradedAnswer(''); setIsRecording1(false); setIsRecording3(false); setEditingStep1(false); setEditingStep3(false) }}
                  className={`border rounded-xl px-3.5 py-3 mb-1.5 cursor-pointer transition-all ${
                    selQ?.id === q.id
                      ? 'border-brand-middle bg-brand-middle-pale shadow-[0_4px_16px_rgba(16,185,129,0.12)]'
                      : 'border-line bg-white hover:border-brand-middle-light hover:shadow-sm'
                  }`}
                >
                  <div className="flex gap-1 mb-1.5">
                    <span className="text-[10px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full">Q{i + 1}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeClass}`}>{q.type}</span>
                  </div>
                  <div className="text-[12px] text-ink leading-relaxed font-semibold mb-1.5">{q.text}</div>
                  {q.answered
                    ? <span className="text-[10px] font-semibold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full border border-brand-middle-light">답변완료 · {getStep(q)}/5단계</span>
                    : <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">미답변</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* 오른쪽: 상세 */}
        <div className="flex-1 bg-white border border-line rounded-xl flex flex-col overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          {!selQ ? (
            <div className="flex-1 flex flex-col items-center justify-center text-ink-muted gap-2">
              <div className="text-4xl">🎓</div>
              <div className="text-[14px] font-semibold text-ink-secondary">질문을 선택해주세요</div>
              <div className="text-[12px]">왼쪽에서 기출문제를 클릭하면 답변을 작성할 수 있어요</div>
            </div>
          ) : (
            <>
              {/* 질문 헤더 */}
              <div className="px-4 py-3.5 border-b border-line flex-shrink-0">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-semibold text-ink">Q{curQuestions.findIndex(q => q.id === selQ.id) + 1}</div>
                    <span className="text-[11px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded-full">{selSchool}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLOR[selQ.type] || TYPE_COLOR['지원동기']}`}>{selQ.type}</span>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                    selQ.answered
                      ? 'bg-brand-middle-bg text-brand-middle-dark border-brand-middle-light'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {selQ.answered ? '답변완료' : '미답변'}
                  </span>
                </div>

                {/* 5단계 */}
                <div className="flex">
                  {STEP_LABELS.map((label, i) => {
                    const step = getStep(selQ)
                    const stepNum = i + 1
                    const isDone = stepNum < step
                    const isOn = stepNum === step
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 relative">
                        {i < 4 && <div className={`absolute top-[11px] left-[55%] w-[90%] h-px ${isDone ? 'bg-brand-middle' : 'bg-line'}`} />}
                        <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-semibold z-10 relative ${
                          isDone || isOn
                            ? 'bg-brand-middle text-white border border-brand-middle'
                            : 'bg-gray-100 text-ink-muted border border-line'
                        }`}>
                          {isDone ? '✓' : stepNum}
                        </div>
                        <div className={`text-[10px] whitespace-nowrap ${
                          isDone || isOn ? 'text-brand-middle-dark font-semibold' : 'text-ink-muted font-medium'
                        }`}>
                          {label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3.5 flex flex-col gap-3">

                {/* 질문 */}
                <div className="bg-gray-50 border border-line rounded-xl px-4 py-3">
                  <div className="text-[10px] font-semibold text-ink-muted mb-1">기출 질문</div>
                  <div className="text-[14px] font-semibold text-ink leading-[1.6]">{selQ.text}</div>
                </div>

                {/* Step 1 */}
                <div className="bg-white border border-line rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-bold text-white bg-ink-muted px-2 py-0.5 rounded-full">Step 1</span>
                    <span className="text-[11px] text-ink-secondary font-medium">내 첫 답변</span>
                  </div>
                  {selQ.answer && !editingStep1 ? (
                    <div>
                      <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] mb-2">{selQ.answer}</div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => { setEditingStep1(true); setMyAnswer(selQ.answer) }}
                          className="text-[11px] font-medium text-ink-secondary bg-white border border-line rounded-md px-2.5 py-1 hover:border-brand-middle-light hover:text-brand-middle-dark transition-all"
                        >
                          ✏️ 수정
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isRecording1 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[12px] text-red-600 font-semibold">녹음 중...</span>
                        </div>
                      )}
                      <textarea
                        value={myAnswer}
                        onChange={e => setMyAnswer(e.target.value)}
                        placeholder="답변을 작성하거나 마이크로 녹음해주세요..."
                        rows={4}
                        className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                      />
                      <div className="flex gap-2 mt-2 justify-end">
                        {editingStep1 && (
                          <button
                            onClick={() => { setEditingStep1(false); setMyAnswer('') }}
                            className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-medium hover:bg-gray-50 transition-colors"
                          >
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
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">Step 2</span>
                      <span className="text-[11px] text-ink-secondary font-medium">선생님 1차 피드백</span>
                    </div>
                    {selQ.teacherFeedback ? (
                      <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 text-[13px] text-[#065F46] leading-[1.8]">{selQ.teacherFeedback}</div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">선생님 피드백을 기다리는 중이에요.</div>
                    )}
                  </div>
                )}

                {/* Step 3 */}
                {selQ.teacherFeedback && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-ink-muted px-2 py-0.5 rounded-full">Step 3</span>
                      <span className="text-[11px] text-ink-secondary font-medium">업그레이드 답변</span>
                    </div>
                    {selQ.upgradedAnswer && !editingStep3 ? (
                      <div>
                        <div className="bg-gray-50 border border-line rounded-lg px-3 py-2.5 text-[13px] text-ink leading-[1.8] mb-2">{selQ.upgradedAnswer}</div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => { setEditingStep3(true); setUpgradedAnswer(selQ.upgradedAnswer) }}
                            className="text-[11px] font-medium text-ink-secondary bg-white border border-line rounded-md px-2.5 py-1 hover:border-brand-middle-light hover:text-brand-middle-dark transition-all"
                          >
                            ✏️ 수정
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[12px] text-amber-700 font-medium mb-2">
                          💡 선생님 피드백을 반영해서 답변을 업그레이드해보세요!
                        </div>
                        {isRecording3 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[12px] text-red-600 font-semibold">녹음 중...</span>
                          </div>
                        )}
                        <textarea
                          value={upgradedAnswer}
                          onChange={e => setUpgradedAnswer(e.target.value)}
                          placeholder="피드백을 반영한 업그레이드 답변을 작성해주세요..."
                          rows={4}
                          className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                        />
                        <div className="flex gap-2 mt-2 justify-end">
                          {editingStep3 && (
                            <button
                              onClick={() => { setEditingStep3(false); setUpgradedAnswer('') }}
                              className="h-9 px-3 bg-white text-ink-secondary border border-line rounded-lg text-[12px] font-medium hover:bg-gray-50 transition-colors"
                            >
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
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">Step 4</span>
                      <span className="text-[11px] text-ink-secondary font-medium">선생님 최종 피드백</span>
                    </div>
                    {selQ.finalFeedback ? (
                      <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-3 py-2.5 text-[13px] text-[#065F46] leading-[1.8]">{selQ.finalFeedback}</div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-ink-muted text-center">선생님 최종 피드백을 기다리는 중이에요.</div>
                    )}
                  </div>
                )}

                {/* Step 5 꼬리질문 */}
                {selQ.tails && selQ.tails.length > 0 && (
                  <div className="bg-white border border-line rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full">Step 5</span>
                      <span className="text-[11px] text-ink-secondary font-medium">꼬리질문</span>
                    </div>
                    {selQ.tails.map((t: string, i: number) => (
                      <div key={i} className="mb-3">
                        <div className="flex items-start gap-1.5 px-2.5 py-2 bg-gray-50 rounded-md mb-2 text-[12px] text-ink leading-[1.5]">
                          <span className="text-[10px] font-bold text-brand-middle-dark bg-brand-middle-bg px-1.5 py-0.5 rounded-full flex-shrink-0 mt-[1px]">꼬리 {i + 1}</span>
                          {t}
                        </div>
                        {tailRecordings[i] && (
                          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-1.5 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[12px] text-red-600 font-semibold">녹음 중...</span>
                          </div>
                        )}
                        <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                          <div className="text-[10px] text-ink-muted mb-1.5">꼬리질문 답변</div>
                          <textarea
                            placeholder="꼬리질문에 대한 답변을 작성해주세요..."
                            rows={2}
                            className="w-full border border-line rounded-md px-2.5 py-2 text-[12px] leading-[1.6] resize-none bg-white focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                          />
                          <div className="flex gap-2 mt-2 justify-end">
                            <MicBtn recording={tailRecordings[i]} onClick={() => setTailRecordings(prev => ({ ...prev, [i]: !prev[i] }))} />
                            <button className="w-[102px] h-[34px] bg-brand-middle hover:bg-brand-middle-hover text-white rounded-md text-[12px] font-semibold transition-all hover:-translate-y-px hover:shadow-btn-middle">
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