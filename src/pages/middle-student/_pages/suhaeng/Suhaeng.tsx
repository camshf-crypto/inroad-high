import { useState, useEffect } from 'react'
import { useAtomValue } from 'jotai'
import { studentState, academyState } from '@/lib/auth/atoms'

const TYPES = [
  { id: '논술형', icon: '✏️', desc: '근거를 갖춘 긴 글쓰기', subjects: '국어·사회·역사', count: 8 },
  { id: '서술형', icon: '📝', desc: '핵심 개념 요약 답안', subjects: '전 과목', count: 12 },
  { id: '주제탐구', icon: '🔬', desc: '자료 조사·분석·보고서', subjects: '사회·과학·역사', count: 5 },
  { id: '구술발표', icon: '🎤', desc: '주제별 발표 영상', subjects: '진로·음악·미술', count: 6 },
  { id: '탐구수행', icon: '🧪', desc: '실험·관찰·분석', subjects: '과학·기가', count: 4 },
]

const MY_SCHOOL_SUHAENG = [
  {
    id: 'm1', grade: '중2', subject: '국어', type: '논술형',
    title: '주장하는 글쓰기 (사회 이슈)',
    content: '최근 청소년들의 SNS 사용이 증가하면서 이에 대한 사회적 논의가 많습니다. 청소년의 SNS 사용에 대한 자신의 입장을 정하고, 구체적인 근거를 들어 400자 이상 800자 이내로 논술하시오.',
    ratio: 40, dueIn: 5, urgent: true, practiced: 2, scheduledAt: '2026.05.12',
    minChars: 400, maxChars: 800, timeLimit: 30,
    hints: [
      { title: '입장 선택', desc: 'SNS 사용의 장점 또는 단점 중 명확한 입장 선택.' },
      { title: '근거 2~3개', desc: '실제 사례, 통계, 경험을 들어 설명.' },
      { title: '반박 대응', desc: '반대 입장에 대한 대응도 포함하면 좋아요.' },
      { title: '결론', desc: '주장을 다시 확인하며 마무리.' },
    ],
    keywords: ['SNS', '청소년', '디지털', '소셜미디어', '중독'],
  },
  {
    id: 'm2', grade: '중2', subject: '역사', type: '주제탐구',
    title: '조선 후기 사회 변화 보고서',
    content: '조선 후기(17~19세기) 사회·경제·문화의 변화를 조사하고, 이 변화가 오늘날 우리 사회에 어떤 영향을 미쳤는지 분석하는 탐구 보고서를 작성하시오.',
    ratio: 20, dueIn: 12, urgent: false, practiced: 0, scheduledAt: '2026.05.19', timeLimit: 60,
    sections: [
      { key: 'background', label: '1. 탐구 배경', placeholder: '왜 조선 후기를 탐구하게 되었는지 작성하세요.', minChars: 50 },
      { key: 'method', label: '2. 조사 방법', placeholder: '어떤 자료를 어떻게 조사했는지 작성하세요.', minChars: 50 },
      { key: 'content', label: '3. 조사 내용', placeholder: '조선 후기의 사회·경제·문화 변화를 정리하세요.', minChars: 150 },
      { key: 'analysis', label: '4. 분석 및 결론', placeholder: '오늘날에 미친 영향을 분석하세요.', minChars: 100 },
      { key: 'reference', label: '5. 참고 자료', placeholder: '참고한 자료의 출처를 작성하세요.', minChars: 20 },
    ],
    keywords: ['조선후기', '실학', '서민문화', '상품경제', '신분제'],
  },
  {
    id: 'm3', grade: '중2', subject: '과학', type: '탐구수행',
    title: '물질의 상태 변화 실험 보고서',
    content: '얼음이 녹아서 물이 되고, 물이 끓어서 수증기가 되는 과정을 관찰하고, 각 상태 변화의 조건과 특징을 실험을 통해 확인하시오.',
    ratio: 20, dueIn: 18, urgent: false, practiced: 1, scheduledAt: '2026.05.25', timeLimit: 45,
    sections: [
      { key: 'purpose', label: '실험 목적', placeholder: '무엇을 알아보려는지 작성하세요.', minChars: 30 },
      { key: 'hypothesis', label: '가설', placeholder: '예상되는 결과를 "만약 ~라면, ~할 것이다" 형식으로.', minChars: 30 },
      { key: 'materials', label: '준비물', placeholder: '사용한 준비물을 나열하세요.', minChars: 20 },
      { key: 'procedure', label: '실험 과정', placeholder: '①, ②, ③... 순서대로 작성하세요.', minChars: 80 },
      { key: 'result', label: '결과 및 데이터', placeholder: '관찰 내용과 데이터를 정리하세요.', minChars: 80 },
      { key: 'conclusion', label: '결론', placeholder: '실험 결과와 가설을 비교하며 정리.', minChars: 50 },
    ],
    keywords: ['상태변화', '융해', '기화', '응고', '액화'],
  },
  {
    id: 'm4', grade: '중2', subject: '진로', type: '구술발표',
    title: '나의 관심 직업 3분 발표',
    content: '본인이 관심 있는 직업 하나를 선택하여, 그 직업의 하는 일, 필요한 역량, 본인이 준비해야 할 점을 3~5분 이내로 발표하시오.',
    ratio: 50, dueIn: 24, urgent: false, practiced: 3, scheduledAt: '2026.05.31', timeLimit: 30,
    presentTimeMin: 3, presentTimeMax: 5,
    sections: [
      { key: 'topic', label: '발표 주제 (직업명)', placeholder: '예: 데이터 분석가', minChars: 3 },
      { key: 'script', label: '발표 원고', placeholder: '인사 → 직업 소개 → 하는 일 → 필요 역량 → 준비 계획 → 마무리', minChars: 200 },
    ],
    checklist: [
      '큰 목소리로 또렷하게 말한다',
      '중요한 부분은 천천히 강조한다',
      '청중과 눈을 맞춘다',
      '시간 (3~5분) 을 지킨다',
      '손짓·표정을 적절히 사용한다',
    ],
    keywords: ['직업탐색', '진로', '커리어', '역량', '미래직업'],
  },
  {
    id: 'm5', grade: '중1', subject: '국어', type: '서술형',
    title: '시의 심상과 운율 서술',
    content: '김소월의 「진달래꽃」에서 사용된 심상과 운율을 분석하여 200자 내외로 서술하시오.',
    ratio: 20, dueIn: 35, urgent: false, practiced: 0, scheduledAt: '2026.06.15',
    minChars: 150, maxChars: 300, timeLimit: 15,
    hints: [
      { title: '심상', desc: '시각적·청각적·촉각적 심상 등을 찾아보세요.' },
      { title: '운율', desc: '반복되는 음절, 구절을 확인하세요.' },
      { title: '간결하게', desc: '핵심만 뽑아서 짧게 작성.' },
    ],
    keywords: ['진달래꽃', '김소월', '심상', '운율', '이별'],
  },
  {
    id: 'm6', grade: '중3', subject: '사회', type: '논술형',
    title: '민주주의와 시민의 역할',
    content: '현대 민주주의 사회에서 시민의 역할과 책임에 대해 본인의 생각을 구체적인 사례와 함께 500자 이상 700자 이내로 논술하시오.',
    ratio: 30, dueIn: 50, urgent: false, practiced: 0, scheduledAt: '2026.06.30',
    minChars: 500, maxChars: 700, timeLimit: 30,
    hints: [
      { title: '시민의 역할', desc: '투표, 참여, 감시 등 구체적으로.' },
      { title: '사례', desc: '최근 사회 이슈 하나 인용.' },
      { title: '결론', desc: '본인의 다짐으로 마무리.' },
    ],
    keywords: ['민주주의', '시민참여', '권리', '책임', '참여'],
  },
]

const PRACTICE = [
  {
    id: 1, school: '서울 OO중', subject: '국어', type: '논술형',
    difficulty: '★★☆', score: 40, attempts: 124, avg: 82, myBest: 85, isReal: true,
    title: '환경 보호를 위한 개인의 역할',
    content: '최근 지구 온난화와 플라스틱 쓰레기 문제가 심각해지면서 환경 보호에 대한 관심이 높아지고 있습니다. 환경 보호를 위해 청소년 개인이 실천할 수 있는 구체적인 방법을 제시하고, 그 방법이 왜 효과적인지 근거를 들어 400자 이상 800자 이내로 논술하시오.',
    minChars: 400, maxChars: 800, timeLimit: 30,
    hints: [
      { title: '두괄식', desc: '첫 문장에 주장을 먼저 제시.' },
      { title: '근거 2~3개', desc: '통계, 사례, 경험 등 구체적으로.' },
      { title: '반박 대응', desc: '예상 반론에 대한 답변 포함.' },
      { title: '결론', desc: '주장을 다시 확인하며 마무리.' },
    ],
    keywords: ['환경보호', '탄소중립', '플라스틱', '순환경제', '기후변화'],
    myAnswer: '나는 환경 보호를 위해 청소년 개인이 일상에서 작은 실천을 꾸준히 하는 것이 가장 효과적이라고 생각한다...',
    submittedAt: '2026. 04. 23 14:32',
    feedbackStatus: 'completed' as const,
    teacherName: '박선생님', totalScore: 34,
    overallComment: '전반적으로 구조가 탄탄하고 주장이 명확합니다. 근거 부분에서 통계나 사례를 더 구체적으로 제시하면 좋겠어요.',
    sectionFeedback: [
      { label: '구조 (두괄식)', score: 9, max: 10, level: 'good', comment: '첫 문장에 주장이 명확히 제시됐어요.' },
      { label: '주장의 명확성', score: 10, max: 10, level: 'great', comment: '주장이 일관되고 설득력 있습니다.' },
      { label: '근거 제시', score: 11, max: 15, level: 'improve', comment: '통계·사례가 더 필요해요.' },
      { label: '문장력·맞춤법', score: 4, max: 5, level: 'good', comment: '맞춤법 오류 1곳 발견됐어요.' },
    ],
    improvements: [
      { title: '구체적 통계·수치 보강', desc: '2~3개 더 넣으면 설득력 상승.' },
      { title: '반박 대응 추가', desc: '반박 대응을 넣으면 고득점.' },
      { title: '맞춤법 확인', desc: '"혼자서는" → "혼자서"가 자연스러워요.' },
    ],
  },
  {
    id: 2, school: '부산 OO중', subject: '사회', type: '서술형',
    difficulty: '★★☆', score: 20, attempts: 89, avg: 76, myBest: null, isReal: true,
    title: '민주주의의 4가지 기본 원리',
    content: '민주주의를 구성하는 4가지 기본 원리(국민 주권, 권력 분립, 법치주의, 기본권 보장)에 대해 각각 설명하고, 하나를 선택하여 예시를 들어 구체적으로 서술하시오.',
    minChars: 150, maxChars: 300, timeLimit: 15,
    hints: [
      { title: '핵심 개념', desc: '4가지 원리를 먼저 간단히 정의.' },
      { title: '예시', desc: '한 가지만 구체적 예시로 설명.' },
      { title: '간결하게', desc: '핵심만 뽑아서 짧게 작성.' },
    ],
    keywords: ['민주주의', '국민주권', '권력분립', '법치주의', '기본권'],
    feedbackStatus: 'none' as const,
  },
  {
    id: 3, school: '대구 OO중', subject: '과학', type: '주제탐구',
    difficulty: '★★★', score: 30, attempts: 45, avg: 74, myBest: null, isReal: true,
    title: '미세먼지 발생 원인과 해결 방안',
    content: '우리 지역의 미세먼지 발생 원인을 조사하고, 국내외 해결 사례를 분석하여 우리가 실천할 수 있는 방안을 제시하는 탐구 보고서를 작성하시오.',
    timeLimit: 60,
    sections: [
      { key: 'background', label: '1. 탐구 배경', placeholder: '왜 이 주제를 탐구하게 되었는지 동기를 작성하세요.', minChars: 50 },
      { key: 'method', label: '2. 조사 방법', placeholder: '어떤 자료를 어떻게 조사했는지 작성하세요.', minChars: 50 },
      { key: 'content', label: '3. 조사 내용', placeholder: '조사한 내용을 구체적으로 정리하세요.', minChars: 100 },
      { key: 'analysis', label: '4. 분석 및 결론', placeholder: '조사 결과를 분석하고 결론을 도출하세요.', minChars: 100 },
      { key: 'reference', label: '5. 참고 자료', placeholder: '참고한 자료의 출처를 작성하세요.', minChars: 20 },
    ],
    keywords: ['미세먼지', 'PM2.5', '대기오염', '중국발황사', '환경정책'],
    feedbackStatus: 'none' as const,
  },
  {
    id: 4, school: '인천 OO중', subject: '진로', type: '구술발표',
    difficulty: '★★☆', score: 50, attempts: 67, avg: 81, myBest: null, isReal: true,
    title: '나의 관심 분야 소개 발표',
    content: '본인이 가장 관심 있는 분야를 하나 선택하여 3분 이내로 발표하시오.',
    timeLimit: 30, maxScriptChars: 500, presentTimeMin: 3, presentTimeMax: 5,
    sections: [
      { key: 'topic', label: '발표 주제', placeholder: '예: 인공지능의 미래', minChars: 3 },
      { key: 'script', label: '발표 원고', placeholder: '3분 분량의 발표 원고를 작성하세요.', minChars: 200 },
    ],
    checklist: [
      '큰 목소리로 또렷하게 말한다',
      '청중과 눈을 맞춘다',
      '시간을 지킨다',
      '손짓·표정을 활용한다',
    ],
    keywords: ['관심분야', '열정', '미래', '탐구', '호기심'],
    feedbackStatus: 'none' as const,
  },
  {
    id: 5, school: '광주 OO중', subject: '과학', type: '탐구수행',
    difficulty: '★★★', score: 20, attempts: 38, avg: 75, myBest: null, isReal: true,
    title: '식물의 광합성 관찰 실험',
    content: '식물이 빛을 받을 때와 받지 않을 때의 변화를 관찰하여 광합성의 조건을 알아보시오.',
    timeLimit: 45,
    sections: [
      { key: 'purpose', label: '실험 목적', placeholder: '무엇을 알아보려는지 작성.', minChars: 30 },
      { key: 'hypothesis', label: '가설', placeholder: '예상 결과를 작성.', minChars: 30 },
      { key: 'materials', label: '준비물', placeholder: '사용한 준비물 나열.', minChars: 20 },
      { key: 'procedure', label: '실험 과정', placeholder: '순서대로 작성.', minChars: 80 },
      { key: 'result', label: '결과 및 데이터', placeholder: '관찰 내용 정리.', minChars: 80 },
      { key: 'conclusion', label: '결론', placeholder: '가설과 비교하며 정리.', minChars: 50 },
    ],
    keywords: ['광합성', '엽록체', '이산화탄소', '산소', '식물'],
    feedbackStatus: 'none' as const,
  },
]

type Mode = 'list' | 'practice' | 'feedback'

function SearchBox() {
  const [query, setQuery] = useState('')
  const [engine, setEngine] = useState<'naver' | 'google'>('naver')
  const handleSearch = () => {
    if (!query.trim()) return
    const url = engine === 'naver' ? `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}` : `https://www.google.com/search?q=${encodeURIComponent(query)}`
    window.open(url, '_blank')
    setQuery('')
  }
  return (
    <div>
      <div className="flex gap-1 mb-2">
        <button onClick={() => setEngine('naver')} className={`flex-1 text-[10px] font-bold py-1 rounded-md transition-all ${engine === 'naver' ? 'bg-green-500 text-white' : 'bg-gray-100 text-ink-secondary hover:bg-gray-200'}`}>N 네이버</button>
        <button onClick={() => setEngine('google')} className={`flex-1 text-[10px] font-bold py-1 rounded-md transition-all ${engine === 'google' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-ink-secondary hover:bg-gray-200'}`}>G 구글</button>
      </div>
      <div className="relative">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="검색어를 입력하세요..." className="w-full h-9 px-3 pr-9 text-[11px] border border-line rounded-md focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted" />
        <button onClick={handleSearch} className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-brand-middle text-white rounded-md hover:bg-brand-middle-hover transition-all text-xs flex items-center justify-center">🔍</button>
      </div>
    </div>
  )
}

function PracticeSidebar({ q }: { q: any }) {
  return (
    <div className="w-[300px] flex-shrink-0 h-full overflow-y-auto pr-1 space-y-3">
      <div className="bg-white border border-line rounded-xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-brand-middle-dark">🔍</span>
          <span className="text-[12px] font-extrabold text-ink">자료 검색</span>
        </div>
        <SearchBox />
        <div className="mt-3">
          <div className="text-[10px] font-bold text-ink-muted mb-1.5">추천 키워드</div>
          <div className="flex flex-wrap gap-1">
            {(q.keywords || []).map((tag: string) => (
              <button key={tag} onClick={() => window.open(`https://search.naver.com/search.naver?query=${encodeURIComponent(tag)}`, '_blank')} className="text-[10px] px-2 py-0.5 bg-brand-middle-pale text-brand-middle-dark rounded-full border border-brand-middle-light hover:bg-brand-middle hover:text-white transition-all">#{tag}</button>
            ))}
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-line">
          <div className="text-[10px] font-bold text-ink-muted mb-1.5">빠른 링크</div>
          <div className="space-y-1">
            {[
              { icon: '📚', label: '네이버 지식백과', url: 'https://terms.naver.com' },
              { icon: '📖', label: '위키백과', url: 'https://ko.wikipedia.org' },
              { icon: '📊', label: '통계청 KOSIS', url: 'https://kosis.kr' },
              { icon: '📰', label: '네이버 뉴스', url: 'https://news.naver.com' },
            ].map((link, i) => (
              <button key={i} onClick={() => window.open(link.url, '_blank')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-brand-middle-pale transition-colors group">
                <span className="text-sm">{link.icon}</span>
                <span className="text-[11px] font-medium text-ink-secondary group-hover:text-brand-middle-dark transition-colors">{link.label}</span>
                <span className="ml-auto text-[10px] text-ink-muted">↗</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {q.hints && (
        <div className="bg-white border border-line rounded-xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="text-amber-500">💡</span>
            <span className="text-[12px] font-extrabold text-ink">작성 힌트</span>
          </div>
          <div className="space-y-2">
            {q.hints.map((h: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-md p-2 border border-line">
                <div className="text-[11px] font-bold text-brand-middle-dark mb-0.5">{i + 1}. {h.title}</div>
                <div className="text-[11px] text-ink-secondary leading-[1.5]">{h.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {q.checklist && (
        <div className="bg-white border border-line rounded-xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="text-amber-500">✅</span>
            <span className="text-[12px] font-extrabold text-ink">발표 체크리스트</span>
          </div>
          <div className="space-y-1.5">
            {q.checklist.map((item: string, i: number) => (
              <label key={i} className="flex items-start gap-2 text-[11px] text-ink-secondary leading-[1.5] cursor-pointer hover:text-ink transition-colors">
                <input type="checkbox" className="mt-0.5 accent-brand-middle flex-shrink-0" />
                <span>{item}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function QuestionCard({ q }: { q: any }) {
  return (
    <div className="bg-white border border-line rounded-xl px-4 py-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
        <span className="text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded">문제</span>
        {q.isReal && <span className="text-[10px] font-bold text-brand-middle-dark bg-brand-middle-bg px-2 py-0.5 rounded border border-brand-middle-light">✓ 실제 기출</span>}
        <span className="text-[10px] text-ink-muted font-semibold">{q.school ? `2026 ${q.school} 수행평가` : `우리 학교 · ${q.scheduledAt || ''}`}</span>
        {q.difficulty && <span className="text-[10px] text-amber-500">{q.difficulty}</span>}
        {q.ratio && <span className="text-[10px] text-ink-muted">· 배점 {q.ratio}%</span>}
      </div>
      <p className="text-[13px] text-ink leading-[1.8]">{q.content}</p>
    </div>
  )
}

function PracticeHeader({ q, secondsLeft, onBack, onSubmit, canSubmit }: any) {
  const timeUrgent = secondsLeft < 300
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return (
    <div className="flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-[12px] font-semibold text-ink-secondary hover:text-ink transition-colors">← 목록으로</button>
        <div className="w-px h-4 bg-line" />
        <div>
          <div className="text-[11px] text-ink-muted font-semibold">{q.school || '우리 학교'} · {q.subject} {q.type} {q.ratio && `(배점 ${q.ratio}%)`}</div>
          <div className="text-[14px] font-bold text-ink">{q.title}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${timeUrgent ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <span className="text-xs">🕐</span>
          <span className={`text-[13px] font-extrabold tabular-nums ${timeUrgent ? 'text-red-600 animate-pulse' : 'text-amber-700'}`}>{formatTime(secondsLeft)}</span>
        </div>
        <button className="h-8 px-3 text-[11px] font-medium text-ink-secondary bg-white border border-line rounded-md hover:border-brand-middle-light transition-all">💾 임시저장</button>
        <button onClick={onSubmit} disabled={!canSubmit} className={`h-8 px-5 text-[12px] font-semibold rounded-md transition-all ${canSubmit ? 'bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle' : 'bg-gray-100 text-ink-muted cursor-not-allowed'}`}>제출</button>
      </div>
    </div>
  )
}

function EssayPractice({ q, onBack, onSubmit }: any) {
  const [answer, setAnswer] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(q.timeLimit * 60)
  useEffect(() => { if (secondsLeft <= 0) return; const t = setInterval(() => setSecondsLeft(p => p - 1), 1000); return () => clearInterval(t) }, [secondsLeft])
  const wordCount = answer.length
  const isValid = wordCount >= q.minChars && wordCount <= q.maxChars
  const handleSubmit = () => { if (!isValid) { alert(`${q.minChars}~${q.maxChars}자로 작성해주세요.`); return } onSubmit() }
  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <PracticeHeader q={q} secondsLeft={secondsLeft} onBack={onBack} onSubmit={handleSubmit} canSubmit={isValid} />
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 h-full overflow-y-auto pr-1 space-y-3">
          <QuestionCard q={q} />
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="text-brand-middle-dark">✏️</span><span className="text-[12px] font-bold text-ink">내 답안</span></div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className={`font-extrabold tabular-nums ${wordCount < q.minChars ? 'text-ink-muted' : wordCount > q.maxChars ? 'text-red-500' : 'text-brand-middle-dark'}`}>{wordCount}자</span>
                <span className="text-ink-muted">/ {q.minChars}~{q.maxChars}자</span>
              </div>
            </div>
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="이곳에 답안을 작성하세요. 두괄식으로 주장을 먼저 제시하고, 근거를 들어 설명한 뒤 결론으로 마무리하세요." className="w-full h-[500px] p-4 text-[13px] leading-[1.8] text-ink resize-none focus:outline-none placeholder:text-ink-muted" />
          </div>
        </div>
        <PracticeSidebar q={q} />
      </div>
    </div>
  )
}

function ShortAnswerPractice({ q, onBack, onSubmit }: any) {
  const [answer, setAnswer] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(q.timeLimit * 60)
  useEffect(() => { if (secondsLeft <= 0) return; const t = setInterval(() => setSecondsLeft(p => p - 1), 1000); return () => clearInterval(t) }, [secondsLeft])
  const wordCount = answer.length
  const isValid = wordCount >= q.minChars && wordCount <= q.maxChars
  const handleSubmit = () => { if (!isValid) { alert(`${q.minChars}~${q.maxChars}자로 작성해주세요.`); return } onSubmit() }
  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <PracticeHeader q={q} secondsLeft={secondsLeft} onBack={onBack} onSubmit={handleSubmit} canSubmit={isValid} />
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 h-full overflow-y-auto pr-1 space-y-3">
          <QuestionCard q={q} />
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="text-brand-middle-dark">📝</span><span className="text-[12px] font-bold text-ink">서술형 답안 (짧고 정확하게)</span></div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className={`font-extrabold tabular-nums ${wordCount < q.minChars ? 'text-ink-muted' : wordCount > q.maxChars ? 'text-red-500' : 'text-brand-middle-dark'}`}>{wordCount}자</span>
                <span className="text-ink-muted">/ {q.minChars}~{q.maxChars}자</span>
              </div>
            </div>
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="핵심 개념을 중심으로 간결하게 답안을 작성하세요." className="w-full h-[300px] p-4 text-[13px] leading-[1.8] text-ink resize-none focus:outline-none placeholder:text-ink-muted" />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-[11px] text-amber-700 flex items-center gap-2">
            <span>💡</span>서술형은 핵심 개념을 간결하고 정확하게 쓰는 것이 중요해요.
          </div>
        </div>
        <PracticeSidebar q={q} />
      </div>
    </div>
  )
}

function ResearchPractice({ q, onBack, onSubmit }: any) {
  const [sections, setSections] = useState<Record<string, string>>(() => q.sections.reduce((acc: any, s: any) => ({ ...acc, [s.key]: '' }), {}))
  const [secondsLeft, setSecondsLeft] = useState(q.timeLimit * 60)
  useEffect(() => { if (secondsLeft <= 0) return; const t = setInterval(() => setSecondsLeft(p => p - 1), 1000); return () => clearInterval(t) }, [secondsLeft])
  const totalChars = Object.values(sections).join('').length
  const allValid = q.sections.every((s: any) => (sections[s.key]?.length || 0) >= s.minChars)
  const handleSubmit = () => { if (!allValid) { alert('모든 섹션을 최소 글자수만큼 작성해주세요.'); return } onSubmit() }
  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <PracticeHeader q={q} secondsLeft={secondsLeft} onBack={onBack} onSubmit={handleSubmit} canSubmit={allValid} />
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 h-full overflow-y-auto pr-1 space-y-3">
          <QuestionCard q={q} />
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="text-brand-middle-dark">🔬</span><span className="text-[12px] font-bold text-ink">탐구 보고서</span></div>
              <div className="text-[11px] text-ink-muted">총 <span className="font-extrabold text-brand-middle-dark">{totalChars}</span>자 · {q.sections.length}개 섹션</div>
            </div>
            <div className="p-4 space-y-4">
              {q.sections.map((s: any) => {
                const value = sections[s.key] || ''
                const valid = value.length >= s.minChars
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[12px] font-bold text-ink">{s.label}</label>
                      <span className={`text-[10px] font-bold tabular-nums ${valid ? 'text-brand-middle-dark' : 'text-ink-muted'}`}>{value.length}자 {valid ? '✓' : `/ 최소 ${s.minChars}자`}</span>
                    </div>
                    <textarea value={value} onChange={(e) => setSections({ ...sections, [s.key]: e.target.value })} placeholder={s.placeholder} rows={4} className="w-full px-3 py-2.5 text-[12px] border border-line rounded-lg focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted resize-y leading-[1.7]" />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <PracticeSidebar q={q} />
      </div>
    </div>
  )
}

function PresentationPractice({ q, onBack, onSubmit }: any) {
  const [sections, setSections] = useState<Record<string, string>>(() => q.sections.reduce((acc: any, s: any) => ({ ...acc, [s.key]: '' }), {}))
  const [secondsLeft, setSecondsLeft] = useState(q.timeLimit * 60)
  const [isRecording, setIsRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  useEffect(() => { if (secondsLeft <= 0) return; const t = setInterval(() => setSecondsLeft(p => p - 1), 1000); return () => clearInterval(t) }, [secondsLeft])
  useEffect(() => { if (!isRecording) return; const t = setInterval(() => setRecordTime(p => p + 1), 1000); return () => clearInterval(t) }, [isRecording])
  const allValid = q.sections.every((s: any) => (sections[s.key]?.length || 0) >= s.minChars)
  const handleSubmit = () => { if (!allValid) { alert('발표 주제와 원고를 모두 작성해주세요.'); return } onSubmit() }
  const formatRecTime = (sec: number) => { const m = Math.floor(sec / 60); const s = sec % 60; return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` }
  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <PracticeHeader q={q} secondsLeft={secondsLeft} onBack={onBack} onSubmit={handleSubmit} canSubmit={allValid} />
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 h-full overflow-y-auto pr-1 space-y-3">
          <QuestionCard q={q} />
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="text-brand-middle-dark">🎤</span><span className="text-[12px] font-bold text-ink">발표 준비</span></div>
              <div className="text-[11px] text-ink-muted">발표 시간: {q.presentTimeMin}~{q.presentTimeMax}분</div>
            </div>
            <div className="p-4 space-y-3">
              {q.sections.map((s: any) => {
                const value = sections[s.key] || ''
                const valid = value.length >= s.minChars
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[12px] font-bold text-ink">{s.label}</label>
                      <span className={`text-[10px] font-bold tabular-nums ${valid ? 'text-brand-middle-dark' : 'text-ink-muted'}`}>{value.length}자 {valid ? '✓' : `/ 최소 ${s.minChars}자`}</span>
                    </div>
                    {s.key === 'topic' ? (
                      <input type="text" value={value} onChange={(e) => setSections({ ...sections, [s.key]: e.target.value })} placeholder={s.placeholder} className="w-full h-10 px-3 text-[13px] border border-line rounded-lg focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted" />
                    ) : (
                      <textarea value={value} onChange={(e) => setSections({ ...sections, [s.key]: e.target.value })} placeholder={s.placeholder} rows={8} className="w-full px-3 py-2.5 text-[12px] border border-line rounded-lg focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted resize-y leading-[1.7]" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-line rounded-xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-1.5 mb-3"><span>🎙️</span><span className="text-[12px] font-extrabold text-ink">음성 녹음</span></div>
              <button onClick={() => { setIsRecording(!isRecording); if (!isRecording) setRecordTime(0) }} className={`w-full h-16 rounded-lg font-bold text-white transition-all flex flex-col items-center justify-center gap-1 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-middle hover:bg-brand-middle-hover'}`}>
                <span className="text-xl">{isRecording ? '⏹' : '🎙️'}</span>
                <span className="text-[11px]">{isRecording ? `녹음 중 ${formatRecTime(recordTime)}` : '녹음 시작'}</span>
              </button>
              <div className="text-[10px] text-ink-muted mt-2 text-center">원고를 보면서 연습해보세요</div>
            </div>
            <div className="bg-white border border-line rounded-xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-1.5 mb-3"><span>📹</span><span className="text-[12px] font-extrabold text-ink">영상 업로드</span></div>
              <button className="w-full h-16 rounded-lg font-bold text-white bg-brand-middle hover:bg-brand-middle-hover transition-all flex flex-col items-center justify-center gap-1">
                <span className="text-xl">📹</span>
                <span className="text-[11px]">영상 선택</span>
              </button>
              <div className="text-[10px] text-ink-muted mt-2 text-center">MP4 / MOV · 최대 100MB</div>
            </div>
          </div>
        </div>
        <PracticeSidebar q={q} />
      </div>
    </div>
  )
}

function ExperimentPractice({ q, onBack, onSubmit }: any) {
  const [sections, setSections] = useState<Record<string, string>>(() => q.sections.reduce((acc: any, s: any) => ({ ...acc, [s.key]: '' }), {}))
  const [secondsLeft, setSecondsLeft] = useState(q.timeLimit * 60)
  useEffect(() => { if (secondsLeft <= 0) return; const t = setInterval(() => setSecondsLeft(p => p - 1), 1000); return () => clearInterval(t) }, [secondsLeft])
  const allValid = q.sections.every((s: any) => (sections[s.key]?.length || 0) >= s.minChars)
  const totalChars = Object.values(sections).join('').length
  const handleSubmit = () => { if (!allValid) { alert('모든 항목을 최소 글자수만큼 작성해주세요.'); return } onSubmit() }
  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <PracticeHeader q={q} secondsLeft={secondsLeft} onBack={onBack} onSubmit={handleSubmit} canSubmit={allValid} />
      <div className="flex-1 flex gap-3 min-h-0">
        <div className="flex-1 h-full overflow-y-auto pr-1 space-y-3">
          <QuestionCard q={q} />
          <div className="bg-white border border-line rounded-xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="text-brand-middle-dark">🧪</span><span className="text-[12px] font-bold text-ink">실험 보고서</span></div>
              <div className="text-[11px] text-ink-muted">총 <span className="font-extrabold text-brand-middle-dark">{totalChars}</span>자</div>
            </div>
            <div className="p-4 space-y-4">
              {q.sections.map((s: any) => {
                const value = sections[s.key] || ''
                const valid = value.length >= s.minChars
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[12px] font-bold text-ink">{s.label}</label>
                      <span className={`text-[10px] font-bold tabular-nums ${valid ? 'text-brand-middle-dark' : 'text-ink-muted'}`}>{value.length}자 {valid ? '✓' : `/ 최소 ${s.minChars}자`}</span>
                    </div>
                    <textarea value={value} onChange={(e) => setSections({ ...sections, [s.key]: e.target.value })} placeholder={s.placeholder} rows={s.key === 'procedure' || s.key === 'result' ? 5 : 3} className="w-full px-3 py-2.5 text-[12px] border border-line rounded-lg focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted resize-y leading-[1.7]" />
                  </div>
                )
              })}
            </div>
          </div>
          <div className="bg-white border border-line rounded-xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-1.5 mb-3">
              <span>📷</span>
              <span className="text-[12px] font-extrabold text-ink">실험 사진 첨부</span>
              <span className="text-[10px] text-ink-muted ml-auto">선택사항 · 최대 5장</span>
            </div>
            <button className="w-full h-20 rounded-lg font-bold text-brand-middle-dark bg-brand-middle-pale border-2 border-dashed border-brand-middle-light hover:bg-brand-middle-bg transition-all flex flex-col items-center justify-center gap-1">
              <span className="text-2xl">📷</span>
              <span className="text-[11px]">실험 과정 사진 업로드</span>
            </button>
          </div>
        </div>
        <PracticeSidebar q={q} />
      </div>
    </div>
  )
}

export default function MiddleSuhaeng() {
  const student = useAtomValue(studentState)
  const academy = useAtomValue(academyState)
  const [mode, setMode] = useState<Mode>('list')
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null)
  const [selectedType, setSelectedType] = useState('논술형')
  const [showAllModal, setShowAllModal] = useState(false)
  const [modalGrade, setModalGrade] = useState('중2')

  const myGradeSuhaeng = MY_SCHOOL_SUHAENG.filter(s => s.grade === '중2')

  const startPractice = (question: any) => {
    setSelectedQuestion(question)
    if (question.feedbackStatus === 'completed') {
      setMode('feedback')
      return
    }
    setMode('practice')
  }

  const backToList = () => {
    setMode('list')
    setSelectedQuestion(null)
  }

  const handleSubmit = () => {
    alert('제출 완료! 선생님 피드백을 기다려주세요.')
    backToList()
  }

  const filteredPractice = PRACTICE.filter(p => p.type === selectedType)

  if (mode === 'practice' && selectedQuestion) {
    const q = selectedQuestion
    if (q.type === '논술형') return <EssayPractice q={q} onBack={backToList} onSubmit={handleSubmit} />
    if (q.type === '서술형') return <ShortAnswerPractice q={q} onBack={backToList} onSubmit={handleSubmit} />
    if (q.type === '주제탐구') return <ResearchPractice q={q} onBack={backToList} onSubmit={handleSubmit} />
    if (q.type === '구술발표') return <PresentationPractice q={q} onBack={backToList} onSubmit={handleSubmit} />
    if (q.type === '탐구수행') return <ExperimentPractice q={q} onBack={backToList} onSubmit={handleSubmit} />
  }

  if (mode === 'feedback' && selectedQuestion) {
    const q = selectedQuestion
    const scorePercent = Math.round((q.totalScore / q.score) * 100)
    return (
      <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={backToList} className="text-[12px] font-semibold text-ink-secondary hover:text-ink transition-colors">← 목록으로</button>
            <div className="w-px h-4 bg-line" />
            <div>
              <div className="text-[11px] text-ink-muted font-semibold">{q.school} · {q.subject} {q.type} · {q.submittedAt} 제출</div>
              <div className="text-[14px] font-bold text-ink">{q.title}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-middle-bg border border-brand-middle-light rounded-lg">
              <span className="text-xs">✓</span>
              <span className="text-[12px] font-extrabold text-brand-middle-dark">피드백 완료</span>
            </div>
            <button onClick={() => setMode('practice')} className="h-8 px-4 text-[12px] font-semibold bg-brand-middle hover:bg-brand-middle-hover text-white rounded-md transition-all hover:-translate-y-px hover:shadow-btn-middle">🔄 수정해서 재제출</button>
          </div>
        </div>
        <div className="flex-1 flex gap-3 min-h-0">
          <div className="flex-1 h-full overflow-y-auto pr-1 space-y-3">
            <div className="bg-gradient-to-br from-brand-middle-dark to-brand-middle rounded-xl p-5 text-white shadow-[0_4px_16px_rgba(16,185,129,0.15)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-sm">👨‍🏫</div>
                    <div>
                      <div className="text-[12px] font-extrabold">{q.teacherName} 피드백</div>
                      <div className="text-[10px] text-white/70">담당 선생님이 직접 작성하셨어요</div>
                    </div>
                  </div>
                  <div className="text-[13px] leading-[1.8] text-white/95 bg-white/10 rounded-lg p-3 backdrop-blur border border-white/15">{q.overallComment}</div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-[10px] text-white/70 font-semibold mb-1">총점</div>
                  <div className="flex items-baseline gap-0.5 justify-end">
                    <span className="text-[40px] font-extrabold leading-none">{q.totalScore}</span>
                    <span className="text-[16px] font-bold text-white/80">/{q.score}</span>
                  </div>
                  <div className="text-[11px] font-bold text-amber-300 mt-1">{scorePercent}점</div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-line rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <div className="px-4 py-3 border-b border-line">
                <div className="text-[13px] font-extrabold text-ink tracking-tight flex items-center gap-1.5">
                  <span className="w-0.5 h-3.5 bg-brand-middle rounded-full"></span>영역별 평가
                </div>
              </div>
              <div className="p-4 space-y-3">
                {q.sectionFeedback.map((item: any, i: number) => {
                  const pct = (item.score / item.max) * 100
                  const colors = {
                    great: { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                    good: { bar: 'bg-brand-middle', text: 'text-brand-middle-dark', bg: 'bg-brand-middle-pale', border: 'border-brand-middle-light' },
                    improve: { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
                  }[item.level as 'great' | 'good' | 'improve']
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-bold text-ink">{item.label}</span>
                        <span className={`text-[12px] font-extrabold ${colors.text}`}>{item.score}<span className="text-ink-muted font-bold">/{item.max}</span></span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                        <div className={`h-full ${colors.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className={`${colors.bg} ${colors.border} border rounded-md px-3 py-2 text-[11px] ${colors.text} leading-[1.6]`}>{item.comment}</div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="bg-white border border-line rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                <div className="text-[13px] font-extrabold text-ink tracking-tight flex items-center gap-1.5">
                  <span className="w-0.5 h-3.5 bg-brand-middle rounded-full"></span>내가 제출한 답안
                </div>
                <div className="text-[10px] text-ink-muted">{q.myAnswer.length}자</div>
              </div>
              <div className="p-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-line text-[13px] leading-[1.9] text-ink">{q.myAnswer}</div>
              </div>
            </div>
          </div>
          <div className="w-[300px] flex-shrink-0 h-full overflow-y-auto pr-1 space-y-3">
            <div className="bg-white border border-line rounded-xl p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-amber-500">🎯</span>
                <span className="text-[12px] font-extrabold text-ink">다음엔 이렇게 해봐요</span>
              </div>
              <div className="space-y-2">
                {q.improvements.map((tip: any, i: number) => (
                  <div key={i} className="bg-amber-50 border border-amber-200 rounded-md p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold text-white bg-amber-500 rounded-full w-4 h-4 flex items-center justify-center">{i + 1}</span>
                      <span className="text-[11px] font-extrabold text-amber-900">{tip.title}</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-[1.6]">{tip.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-90px)] overflow-hidden px-6 py-5 font-sans text-ink">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[18px] font-extrabold text-ink tracking-tight">수행평가</div>
          <div className="text-[12px] text-ink-muted mt-0.5">{student?.name} · {academy?.academyName}</div>
        </div>
        <div className="flex gap-2">
          <div className="bg-brand-middle-bg text-brand-middle-dark text-[12px] font-bold px-3.5 py-1.5 rounded-full border border-brand-middle-light">다가오는 수행평가 {myGradeSuhaeng.length}건</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-0">
        <div className="bg-white border border-line rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex-shrink-0">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <div>
              <div className="text-[14px] font-extrabold text-ink tracking-tight">우리 학교 다가오는 수행평가</div>
              <div className="text-[11px] text-ink-muted mt-0.5">인천 신정중학교 중2 · 2026학년도 1학기 평가 계획</div>
            </div>
            <button onClick={() => setShowAllModal(true)} className="text-[11px] font-semibold text-brand-middle-dark hover:text-brand-middle transition-colors">전체 보기 ›</button>
          </div>
          <div className="grid grid-cols-4 gap-2.5 p-3">
            {myGradeSuhaeng.map((t) => (
              <div key={t.id} onClick={() => startPractice(t)} className={`relative rounded-lg border px-3 py-2.5 cursor-pointer transition-all hover:-translate-y-px ${t.urgent ? 'bg-amber-50/50 border-amber-200 hover:shadow-[0_4px_16px_rgba(245,158,11,0.15)]' : 'bg-gray-50 border-line hover:border-brand-middle-light hover:shadow-sm'}`}>
                {t.urgent && <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full">D-{t.dueIn}</div>}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-bold text-ink-secondary bg-white border border-line px-1.5 py-0.5 rounded">{t.subject}</span>
                  <span className="text-[10px] font-semibold text-brand-middle-dark">{t.type}</span>
                </div>
                <div className="text-[12px] font-bold text-ink leading-tight mb-2 line-clamp-2 min-h-[30px]">{t.title}</div>
                <div className="flex items-center justify-between text-[10px] pt-2 border-t border-line">
                  <span className="text-ink-muted">D-{t.dueIn} · {t.ratio}%</span>
                  <span className="text-ink-secondary">연습 <span className="font-bold text-brand-middle-dark">{t.practiced}회</span></span>
                </div>
                <div className="mt-1.5 text-[10px] font-bold text-brand-middle-dark flex items-center gap-1">바로 연습 →</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0">
          <div className="text-[14px] font-extrabold text-ink tracking-tight mb-1 flex items-center gap-1.5">
            <span className="w-0.5 h-3.5 bg-brand-middle rounded-full"></span>수행평가 유형별 연습
          </div>
          <div className="text-[11px] text-ink-muted mb-2.5">전국 중학교 기출문제로 유형별 실력을 키워보세요</div>
          <div className="grid grid-cols-5 gap-2">
            {TYPES.map(t => {
              const sel = selectedType === t.id
              return (
                <button key={t.id} onClick={() => setSelectedType(t.id)} className={`rounded-xl px-3 py-3 text-left transition-all border ${sel ? 'bg-gradient-to-br from-brand-middle-dark to-brand-middle text-white border-brand-middle shadow-[0_4px_16px_rgba(16,185,129,0.2)] -translate-y-0.5' : 'bg-white border-line hover:border-brand-middle-light hover:-translate-y-px'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 text-base ${sel ? 'bg-white/15' : 'bg-brand-middle-bg'}`}>{t.icon}</div>
                  <div className={`text-[13px] font-bold mb-0.5 ${sel ? 'text-white' : 'text-ink'}`}>{t.id}</div>
                  <div className={`text-[10px] leading-tight mb-2 ${sel ? 'text-white/80' : 'text-ink-muted'}`}>{t.desc}</div>
                  <div className={`pt-2 border-t flex items-center justify-between ${sel ? 'border-white/15' : 'border-line'}`}>
                    <span className={`text-[9px] ${sel ? 'text-white/70' : 'text-ink-muted'}`}>{t.subjects}</span>
                    <span className={`text-[10px] font-bold ${sel ? 'text-amber-300' : 'text-brand-middle-dark'}`}>{t.count}개</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-white border border-line rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.04)] flex-shrink-0">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <div>
              <div className="text-[14px] font-extrabold text-ink tracking-tight">{selectedType} · 연습 문제</div>
              <div className="text-[11px] text-ink-muted mt-0.5">전국 중학교 실제 기출 · 선생님 맞춤 피드백</div>
            </div>
          </div>
          <div>
            {filteredPractice.length === 0 ? (
              <div className="px-4 py-10 text-center text-ink-muted text-[12px]">
                <div className="text-3xl mb-2">📚</div>{selectedType} 연습 문제 준비 중이에요
              </div>
            ) : filteredPractice.map((p, idx) => (
              <div key={p.id} onClick={() => startPractice(p)} className="px-4 py-3 border-b border-line last:border-b-0 hover:bg-brand-middle-pale/30 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[12px] font-extrabold text-ink-muted group-hover:bg-brand-middle-bg group-hover:text-brand-middle-dark transition-colors">{String(idx + 1).padStart(2, '0')}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      {p.isReal ? <span className="text-[9px] font-bold text-white bg-brand-middle px-1.5 py-0.5 rounded">✓ 실제 기출</span> : <span className="text-[9px] font-bold text-ink-secondary bg-gray-100 px-1.5 py-0.5 rounded">유사 기출</span>}
                      <span className="text-[10px] font-semibold text-ink-muted">{p.school} · {p.subject}</span>
                      <span className="text-[10px] text-amber-500">{p.difficulty}</span>
                      <span className="text-[10px] text-ink-muted">· 배점 {p.score}%</span>
                      {p.feedbackStatus === 'completed' && <span className="text-[9px] font-bold text-white bg-emerald-500 px-1.5 py-0.5 rounded">✓ 피드백 완료</span>}
                    </div>
                    <div className="text-[13px] font-bold text-ink leading-snug group-hover:text-brand-middle-dark transition-colors">{p.title}</div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-center min-w-[36px]">
                      <div className="text-[9px] text-ink-muted font-medium">평균</div>
                      <div className="text-[12px] font-extrabold text-ink-secondary">{p.avg}점</div>
                    </div>
                    <div className="text-center min-w-[36px]">
                      <div className="text-[9px] text-ink-muted font-medium">내 최고</div>
                      {p.myBest ? <div className="text-[12px] font-extrabold text-brand-middle-dark">{p.myBest}점</div> : <div className="text-[12px] font-bold text-ink-muted">—</div>}
                    </div>
                    <div className="text-center min-w-[36px]">
                      <div className="text-[9px] text-ink-muted font-medium">응시</div>
                      <div className="text-[12px] font-extrabold text-ink-secondary">{p.attempts}</div>
                    </div>
                    <button className="h-8 px-3 bg-brand-middle hover:bg-brand-middle-hover text-white text-[11px] font-semibold rounded-md transition-all hover:-translate-y-px hover:shadow-btn-middle">
                      {p.feedbackStatus === 'completed' ? '피드백 보기' : '연습 시작'} ›
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAllModal && (
        <div onClick={() => setShowAllModal(false)} className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-[720px] max-h-[80vh] flex flex-col shadow-[0_20px_60px_rgba(15,23,42,0.25)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <div>
                <div className="text-[16px] font-extrabold text-ink tracking-tight">인천 신정중학교 수행평가 전체</div>
                <div className="text-[11px] text-ink-muted mt-0.5">학년별 전체 수행평가 일정</div>
              </div>
              <button onClick={() => setShowAllModal(false)} className="text-ink-muted hover:text-ink text-xl transition-colors">✕</button>
            </div>
            <div className="flex gap-1 px-5 py-3 border-b border-line">
              {['중1', '중2', '중3'].map(g => (
                <button key={g} onClick={() => setModalGrade(g)} className={`px-4 py-1.5 rounded-full text-[12px] font-bold border transition-all ${modalGrade === g ? 'bg-brand-middle text-white border-brand-middle' : 'bg-white text-ink-secondary border-line hover:border-brand-middle-light'}`}>
                  {g} {g === '중2' && <span className="ml-1 text-[10px] text-amber-400">(내 학년)</span>}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {MY_SCHOOL_SUHAENG.filter(s => s.grade === modalGrade).length === 0 ? (
                <div className="text-center py-10 text-ink-muted text-[12px]">
                  <div className="text-3xl mb-2">📅</div>{modalGrade} 수행평가 정보가 없어요
                </div>
              ) : (
                <div className="space-y-2">
                  {MY_SCHOOL_SUHAENG.filter(s => s.grade === modalGrade).map(s => (
                    <div key={s.id} onClick={() => { setShowAllModal(false); startPractice(s) }} className="border border-line rounded-lg p-3 hover:border-brand-middle-light hover:bg-brand-middle-pale/20 cursor-pointer transition-all">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-ink-secondary bg-white border border-line px-1.5 py-0.5 rounded">{s.subject}</span>
                        <span className="text-[10px] font-semibold text-brand-middle-dark">{s.type}</span>
                        <span className="text-[10px] text-ink-muted">· 배점 {s.ratio}%</span>
                        {s.urgent && <span className="text-[9px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded">D-{s.dueIn}</span>}
                        <span className="ml-auto text-[10px] text-ink-muted">{s.scheduledAt}</span>
                      </div>
                      <div className="text-[13px] font-bold text-ink">{s.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}