import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type ReportFormat = string

interface Section {
  part: string
  guide: string
  example: string
}

interface Fmt {
  key: ReportFormat
  label: string
  hint: string
  /** 고를 때 묶어서 보여줄 성격 */
  group: string
  sections: Section[]
}

const FORMATS: Fmt[] = [
  {
    key: 'experiment', label: "실험 보고서", hint: "직접 실험하고 측정한 탐구", group: "과학·실험",
    sections: [
      { part: "서론", guide: "왜 이 실험을 했는지, 무엇이 궁금했는지", example: "수업에서 효소의 작용을 배우며, 같은 약을 먹어도 사람마다 효과가 다른 이유가 궁금해 이 탐구를 시작했다." },
      { part: "이론적 배경", guide: "관련 개념과 선행 자료 정리", example: "간에서 분비되는 효소군이 약물 대사 속도를 좌우한다는 점을 관련 자료에서 확인했다." },
      { part: "실험 방법", guide: "무엇을 바꾸고 무엇을 고정했는지", example: "온도를 5℃ 간격으로 바꾸며 반응 속도를 측정했고, 농도와 pH는 동일하게 유지했다." },
      { part: "결과", guide: "숫자와 그래프로. 해석은 다음 단계에서", example: "35℃에서 반응 속도가 가장 높았고, 45℃ 이상에서는 급격히 낮아졌다. (그래프 1)" },
      { part: "고찰·결론", guide: "예상과 다른 부분을 짚고 진로와 연결", example: "고온에서 속도가 떨어진 것은 효소가 변성됐기 때문으로 보인다. 약을 정해진 온도에 보관해야 하는 이유를 이해하게 됐다." },
    ],
  },
  {
    key: 'analysis', label: "조사·분석 보고서", hint: "통계·자료로 현황을 파헤친 탐구", group: "조사·분석",
    sections: [
      { part: "서론", guide: "왜 이 문제를 들여다봤는지", example: "청소년 수면 부족이 문제라는 말은 많지만, 실제로 얼마나 심각한지 수치로 확인해보고 싶었다." },
      { part: "현황 분석", guide: "통계·자료로 실태를 보여주기", example: "공공 통계에 따르면 고등학생 평균 수면시간은 6.1시간으로, 권장치보다 두 시간 이상 짧았다." },
      { part: "원인 분석", guide: "왜 그런지 근거를 들어 따져보기", example: "학업 시간과 스마트폰 사용 시간을 비교한 결과, 후자와의 관련이 더 뚜렷하게 나타났다." },
      { part: "결론·제언", guide: "분석을 종합하고 대안을 제시", example: "등교 시간 조정보다 야간 학습 환경을 손보는 쪽이 먼저라는 결론에 이르렀다." },
    ],
  },
  {
    key: 'inquiry', label: "탐구 보고서", hint: "자유 주제를 파고든 탐구", group: "조사·분석",
    sections: [
      { part: "탐구 동기", guide: "관심을 갖게 된 계기", example: "할머니가 매일 여러 약을 드시는 걸 보며, 약끼리 서로 영향을 주지는 않는지 궁금해졌다." },
      { part: "탐구 내용", guide: "무엇을 어떻게 알아봤는지", example: "약물 상호작용을 다룬 자료 세 건을 읽고, 함께 먹으면 안 되는 조합을 정리했다." },
      { part: "탐구 결과", guide: "알게 된 것과 나만의 해석", example: "같은 성분이 여러 약에 중복으로 들어가, 복용량이 의도치 않게 늘 수 있다는 걸 알게 됐다." },
      { part: "느낀 점", guide: "배운 점과 다음에 하고 싶은 것", example: "약을 처방하는 일이 병에 맞는 약을 고르는 것만이 아님을 알게 됐다. 다음엔 실제 처방 사례를 살펴보고 싶다." },
    ],
  },
  {
    key: 'thesis', label: "소논문", hint: "형식을 갖춘 심화 연구 (고2~3)", group: "조사·분석",
    sections: [
      { part: "초록", guide: "목적·방법·결과를 한 문단으로", example: "본 연구는 청소년의 미디어 이용 시간대와 수면의 질의 관계를 살펴보았다. 설문 120부를 분석한 결과…" },
      { part: "서론", guide: "연구 배경과 연구 문제", example: "미디어 이용이 수면에 영향을 준다는 지적은 많으나, 국내 고등학생을 대상으로 한 자료는 드물다." },
      { part: "선행 연구", guide: "기존 연구 검토와 내 연구의 차별점", example: "기존 연구는 이용 시간에 초점을 맞췄으나, 본 연구는 이용 시간대를 함께 본다는 점에서 다르다." },
      { part: "본론", guide: "자료 분석과 결과 제시", example: "취침 1시간 이내 이용 집단에서 수면의 질 점수가 뚜렷하게 낮게 나타났다. (표 2)" },
      { part: "결론", guide: "종합과 한계, 진로 연결", example: "이용 시간보다 시간대가 더 중요할 수 있다. 다만 표본이 한 학교에 한정된 점은 한계다." },
    ],
  },
  {
    key: 'critique', label: "감상·비평문", hint: "책·작품을 읽고 쓴 글", group: "읽기·쓰기",
    sections: [
      { part: "도입", guide: "무엇을 읽었고 왜 골랐는지", example: "진로를 고민하던 중 의료와 사회를 함께 다룬 책이라는 소개를 보고 골랐다." },
      { part: "분석", guide: "핵심 주장과 근거를 짚기", example: "저자는 질병을 개인의 문제가 아니라 사회 구조의 결과로 본다. 근거로 직업군별 사망률 격차를 든다." },
      { part: "비평", guide: "동의하는 점과 아쉬운 점", example: "구조를 강조한 점에는 동의하지만, 개인이 할 수 있는 일에 대한 언급이 적어 아쉬웠다." },
      { part: "결론", guide: "종합 의견과 진로 연결", example: "환자를 볼 때 그 사람의 생활 조건까지 살펴야 한다는 관점을 얻었다." },
    ],
  },
  {
    key: 'reading', label: "독서 보고서", hint: "책을 읽고 탐구로 이어간 글", group: "읽기·쓰기",
    sections: [
      { part: "책 선정 이유", guide: "왜 이 책을 골랐는지", example: "수업에서 배운 유전 단원을 더 알고 싶어 유전자 편집을 다룬 책을 골랐다." },
      { part: "핵심 내용", guide: "무엇을 다룬 책인지 요약", example: "저자는 유전자 가위 기술의 원리와 함께, 그 기술이 불러올 윤리 문제를 함께 다룬다." },
      { part: "인상 깊은 부분", guide: "한 대목을 골라 왜 인상 깊었는지", example: "치료와 개량의 경계가 모호하다는 지적이 가장 인상 깊었다." },
      { part: "이어진 탐구", guide: "책에서 생긴 질문을 어떻게 더 알아봤는지", example: "국내에서 유전자 치료가 어디까지 허용되는지 관련 자료를 찾아 정리했다." },
      { part: "느낀 점", guide: "진로와의 연결", example: "기술을 아는 것과 그 기술을 어디까지 쓸지 판단하는 건 다른 문제임을 알게 됐다." },
    ],
  },
  {
    key: 'project', label: "프로젝트·제작 보고서", hint: "무언가를 만들거나 설계한 활동", group: "만들기·실행",
    sections: [
      { part: "기획 배경", guide: "왜 이걸 만들려 했는지", example: "교내에 분리수거 표시가 없어 학생들이 헷갈려하는 걸 보고 안내물을 만들기로 했다." },
      { part: "설계", guide: "어떻게 만들 계획이었는지", example: "학년별로 자주 버리는 쓰레기를 조사해, 그 항목만 크게 표시하는 방식으로 설계했다." },
      { part: "제작 과정", guide: "실제로 만들며 겪은 일", example: "처음엔 글씨 위주로 만들었는데 눈에 안 들어와서, 그림 중심으로 다시 만들었다." },
      { part: "결과와 반응", guide: "무엇이 나왔고 어떻게 쓰였는지", example: "급식실 앞에 붙인 뒤 잘못 버린 쓰레기가 눈에 띄게 줄었다는 얘기를 들었다." },
      { part: "보완할 점", guide: "다음에 고친다면", example: "계절마다 버리는 쓰레기가 달라져서, 바꿔 붙일 수 있는 형태였으면 좋았겠다." },
    ],
  },
  {
    key: 'case', label: "사례 연구 보고서", hint: "특정 사례 하나를 깊이 들여다본 글", group: "조사·분석",
    sections: [
      { part: "사례 선정", guide: "왜 이 사례를 골랐는지", example: "고령 인구 비율이 가장 높은 지역의 의료 접근성 문제를 사례로 골랐다." },
      { part: "사례 개요", guide: "무슨 일이 있었는지", example: "해당 지역은 병원까지 평균 40분이 걸리고, 야간 진료가 가능한 곳이 한 곳뿐이다." },
      { part: "분석", guide: "왜 그런 결과가 나왔는지", example: "인구가 적어 병원 운영이 어렵고, 그래서 인구가 더 빠져나가는 구조가 반복되고 있었다." },
      { part: "시사점", guide: "여기서 배울 점", example: "의료 문제를 병원 수만으로 볼 수 없다는 걸 알게 됐다." },
    ],
  },
  {
    key: 'survey', label: "설문·인터뷰 보고서", hint: "직접 묻고 모은 자료로 쓴 글", group: "조사·분석",
    sections: [
      { part: "조사 목적", guide: "무엇을 알고 싶었는지", example: "우리 학교 학생들이 진로를 정할 때 무엇을 가장 어려워하는지 알고 싶었다." },
      { part: "조사 방법", guide: "누구에게 어떻게 물었는지", example: "2학년 4개 반 108명에게 5문항 설문을 돌리고, 그중 6명을 따로 인터뷰했다." },
      { part: "결과", guide: "숫자와 답변을 정리", example: "응답자의 62%가 '내가 뭘 좋아하는지 모르겠다'를 1순위로 꼽았다." },
      { part: "해석", guide: "숫자 뒤에 뭐가 있는지", example: "인터뷰에서는 정보가 부족해서가 아니라 선택이 두려워서라는 말이 반복됐다." },
      { part: "결론", guide: "알게 된 것과 제안", example: "진로 정보를 늘리는 것보다 결정 부담을 줄이는 방식이 필요해 보인다." },
    ],
  },
  {
    key: 'review', label: "문헌 조사 보고서", hint: "자료를 모아 정리한 글", group: "조사·분석",
    sections: [
      { part: "조사 주제", guide: "무엇을 정리하려 했는지", example: "미세플라스틱이 인체에 미치는 영향에 대해 지금까지 밝혀진 것을 정리하려 했다." },
      { part: "자료 선정", guide: "어떤 자료를 어떻게 골랐는지", example: "최근 5년 내 발표된 자료 중 인체 영향을 직접 다룬 것 6건을 골랐다." },
      { part: "정리", guide: "공통점과 차이를 나눠서", example: "대부분 축적 가능성에는 동의했으나, 실제 건강 피해에 대해서는 결론이 갈렸다." },
      { part: "종합", guide: "지금까지 밝혀진 것과 아직 모르는 것", example: "노출량을 실제로 측정한 연구가 적다는 점이 공통된 한계였다." },
    ],
  },
  {
    key: 'proposal', label: "제안서", hint: "문제를 찾아 해결책을 제안한 글", group: "만들기·실행",
    sections: [
      { part: "문제 제기", guide: "무엇이 문제인지", example: "교내 도서관이 시험기간에만 붐비고 평소엔 비어 있다." },
      { part: "원인 분석", guide: "왜 그런지", example: "이용 시간이 수업 시간과 겹치고, 어떤 책이 있는지 알기 어려웠다." },
      { part: "제안", guide: "구체적으로 무엇을 하자는 건지", example: "점심시간 개방과 학년별 추천도서 코너 운영을 제안한다." },
      { part: "기대 효과와 한계", guide: "무엇이 나아지고 무엇이 어려운지", example: "이용률은 올라가겠지만 사서 선생님의 업무가 늘어난다는 점은 함께 고려해야 한다." },
    ],
  },
  {
    key: 'field', label: "현장체험·견학 보고서", hint: "직접 가보고 쓴 글", group: "만들기·실행",
    sections: [
      { part: "사전 준비", guide: "가기 전에 무엇을 알아봤는지", example: "방문 전 그 기관이 하는 일과 최근 사업을 미리 찾아봤다." },
      { part: "체험 내용", guide: "무엇을 보고 들었는지", example: "실제 검사실을 견학하며 검체가 처리되는 순서를 순서대로 볼 수 있었다." },
      { part: "인상 깊은 점", guide: "예상과 달랐던 부분", example: "기계가 다 할 거라 생각했는데, 사람이 확인하는 단계가 훨씬 많았다." },
      { part: "배운 점", guide: "진로와의 연결", example: "정확도를 지키는 일이 기술보다 절차에 달려 있다는 걸 알게 됐다." },
    ],
  },
  {
    key: 'argument', label: "논술·주장하는 글", hint: "입장을 정하고 근거로 설득하는 글", group: "읽기·쓰기",
    sections: [
      { part: "쟁점 제시", guide: "무엇을 두고 의견이 갈리는지", example: "AI 창작물에 저작권을 인정할 것인가를 두고 의견이 나뉜다." },
      { part: "내 주장", guide: "어느 쪽인지 분명하게", example: "현재로서는 인정하기 어렵다고 본다." },
      { part: "근거", guide: "왜 그렇게 생각하는지 두세 가지", example: "저작권은 창작한 사람의 노력을 보호하는 제도인데, 학습 데이터의 출처가 불분명하다." },
      { part: "반론 검토", guide: "반대 입장을 다루고 재반박", example: "도구일 뿐이라는 반론이 있지만, 결과물의 유사성 정도가 기존 도구와 다르다." },
      { part: "결론", guide: "주장 정리와 남은 문제", example: "지금은 인정하기 이르지만, 기준을 만드는 논의는 필요하다." },
    ],
  },
]

const GROUPS = [...new Set(FORMATS.map((f) => f.group))]

/** 학교에서 제일 자주 요구하는 형태 */
const COMMON: ReportFormat[] = ['experiment', 'inquiry', 'reading', 'project']

interface Props {
  topicId: string
  topicTitle: string
  major?: string | null
  grade?: number
  content: string
  format: ReportFormat | null
  saving?: boolean
  /** 선생님 검토 상태 */
  reviewStatus?: string | null
  feedback?: string | null
  finalContent?: string | null
  onSave: (content: string) => void
  onPickFormat: (f: ReportFormat) => void
  onRequestReview?: () => void
  /** 자료가 없을 때 1단계로 보내기 */
  onGoResearch?: () => void
}

export default function ReportWriter({
  topicId, topicTitle, major, grade, content, format, saving,
  reviewStatus, feedback, finalContent, onSave, onPickFormat, onRequestReview, onGoResearch,
}: Props) {
  const [text, setText] = useState(content)
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [split, setSplit] = useState(true)
  const [view, setView] = useState<'mine' | 'final' | 'feedback'>('mine')

  useEffect(() => setText(content), [content])

  const { data: sources = [] } = useQuery({
    queryKey: ['topic-sources', topicId],
    queryFn: async (): Promise<
      { id: string; kind: string; title: string; author: string | null; note: string | null }[]
    > => {
      const { data, error } = await supabase
        .from('high_roadmap_source')
        .select('id, kind, title, author, note')
        .eq('topic_id', topicId)
        .order('sort_order')
      if (error) throw error
      return data ?? []
    },
  })

  const fmt = FORMATS.find((f) => f.key === format) ?? null
  const dirty = text !== content
  const charCount = useMemo(() => text.replace(/\s/g, '').length, [text])

  const analyze = async () => {
    if (!text.trim() || analyzing) return
    setAnalyzing(true)
    setAnalysis(null)
    try {
      const { data, error } = await supabase.functions.invoke('research-coach', {
        body: {
          mode: 'chat',
          major: major ?? '미정',
          grade: grade ? `고${grade}` : undefined,
          topic: topicTitle,
          message:
            `학생이 "${topicTitle}" 탐구로 ${fmt?.label ?? '보고서'}를 썼어.\n\n` +
            `--- 보고서 ---\n${text.trim()}\n---\n\n` +
            `아래 세 가지로 짧게 봐줘.\n` +
            `1) 잘 쓴 점 (구체적으로)\n` +
            `2) 비어 있는 부분 — 근거·과정·해석 중 뭐가 부족한지\n` +
            `3) 바로 고칠 수 있는 제안 2~3개\n` +
            `학생에게 직접 말하듯 쓰고, 대신 써주지는 말고 방향만 알려줘.`,
        },
      })
      if (error || data?.error) throw new Error(error?.message || data?.error)
      setAnalysis(String(data.reply ?? '').trim())
    } catch (e: any) {
      setAnalysis('분석을 받지 못했어요: ' + (e?.message ?? ''))
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="bg-white border border-line rounded-2xl p-5">
      <div className="text-[14px] font-extrabold text-ink mb-1">보고서 쓰기</div>
      <div className="text-[11.5px] text-ink-muted mb-3 leading-relaxed">
        자료 조사에서 모은 근거를 바탕으로 써요. 어떤 형태로 쓸지 먼저 고르면 항목마다 예시가
        나와요.
      </div>

      {/* 양식 선택 */}
      {!showAll ? (
        <div className="mb-3">
          <div className="text-[10.5px] font-bold text-ink-muted mb-1.5">자주 쓰는 형태</div>
          <div className="flex flex-wrap gap-1.5">
            {FORMATS.filter((f) => COMMON.includes(f.key) || f.key === format).map((f) => {
              const on = format === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => onPickFormat(f.key)}
                  className="rounded-lg border px-3 py-2 text-left transition-all"
                  style={{
                    borderColor: on ? '#059669' : '#E5E7EB',
                    background: on ? '#F0FDF4' : '#fff',
                  }}
                >
                  <div
                    className="text-[12.5px] font-bold"
                    style={{ color: on ? '#065F46' : '#334155' }}
                  >
                    {f.label}
                  </div>
                  <div className="text-[9.5px] text-ink-muted mt-0.5">{f.hint}</div>
                </button>
              )
            })}
            <button
              onClick={() => setShowAll(true)}
              className="rounded-lg border border-dashed border-line px-3 py-2 text-[12.5px] text-ink-muted hover:border-brand-high-light hover:text-brand-high"
            >
              다른 양식 {FORMATS.length - COMMON.length}개 보기
            </button>
          </div>
        </div>
      ) : (
      <div className="flex flex-col gap-2.5 mb-3">
        {GROUPS.map((g) => (
          <div key={g}>
            <div className="text-[10.5px] font-bold text-ink-muted mb-1.5">{g}</div>
            <div className="flex flex-wrap gap-1.5">
              {FORMATS.filter((f) => f.group === g).map((f) => {
                const on = format === f.key
                return (
                  <button
                    key={f.key}
                    onClick={() => onPickFormat(f.key)}
                    className="rounded-lg border px-3 py-2 text-left transition-all"
                    style={{
                      borderColor: on ? '#059669' : '#E5E7EB',
                      background: on ? '#F0FDF4' : '#fff',
                    }}
                  >
                    <div
                      className="text-[12.5px] font-bold"
                      style={{ color: on ? '#065F46' : '#334155' }}
                    >
                      {f.label}
                    </div>
                    <div className="text-[9.5px] text-ink-muted mt-0.5">{f.hint}</div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <button
          onClick={() => setShowAll(false)}
          className="self-start text-[11.5px] font-semibold text-ink-secondary hover:underline"
        >
          접기
        </button>
      </div>
      )}

      {/* 개요 + 예시 */}
      {fmt && (
        <div className="rounded-xl border border-green-200 bg-green-50/50 p-4 mb-3">
          <div className="text-[12px] font-bold text-green-900 mb-0.5">
            {fmt.label} 개요
          </div>
          <div className="text-[10.5px] text-ink-muted mb-2.5">
            항목을 누르면 예시 문장이 보여요. 그대로 베끼지 말고 형태만 참고하세요.
          </div>

          <div className="flex flex-col gap-1.5">
            {fmt.sections.map((sec) => {
              const on = openSection === sec.part
              return (
                <div key={sec.part}>
                  <button
                    onClick={() => setOpenSection(on ? null : sec.part)}
                    className="w-full flex items-center gap-2.5 text-left bg-white border border-green-200 rounded-lg px-3 py-2"
                  >
                    <span className="flex-shrink-0 w-[70px] text-[10.5px] font-extrabold text-white bg-green-600 rounded py-1 text-center">
                      {sec.part}
                    </span>
                    <span className="flex-1 text-[12px] text-ink-secondary">{sec.guide}</span>
                    <span className="text-[11px] text-ink-muted flex-shrink-0">
                      {on ? '접기' : '예시'}
                    </span>
                  </button>

                  {on && (
                    <div className="ml-[82px] mt-1 rounded-lg bg-white border border-green-200 px-3.5 py-2.5">
                      <div className="text-[10px] font-bold text-green-700 mb-1">예시</div>
                      <div className="text-[12.5px] text-ink leading-relaxed">
                        {sec.example}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!fmt && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-3 text-[12px] text-amber-900">
          보고서 형태를 먼저 골라주세요. 항목별로 뭘 써야 하는지 예시가 나와요.
        </div>
      )}

      {sources.length === 0 && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3 mb-3 flex items-center gap-3 flex-wrap">
          <div>
            <div className="text-[12px] font-bold text-sky-900 mb-0.5">
              모아둔 자료가 없어요
            </div>
            <div className="text-[11.5px] text-ink-secondary leading-relaxed">
              1단계에서 자료를 모아두면 여기 왼쪽에 띄워놓고 보면서 쓸 수 있어요.
            </div>
          </div>
          {onGoResearch && (
            <button
              onClick={onGoResearch}
              className="ml-auto h-9 px-3.5 bg-white border border-sky-300 text-sky-800 rounded-lg text-[12px] font-bold hover:bg-sky-50 flex-shrink-0"
            >
              자료 조사하러 가기 →
            </button>
          )}
        </div>
      )}

      {sources.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11.5px] font-bold text-sky-900">
            1단계에서 모은 자료 {sources.length}건
          </span>
          <button
            onClick={() => setSplit(!split)}
            className="ml-auto h-8 px-3 bg-white border border-line text-ink-secondary rounded-lg text-[11.5px] font-semibold hover:bg-gray-50"
          >
            {split ? '넓게 쓰기 →' : '← 자료 보며 쓰기'}
          </button>
        </div>
      )}

      <div className={split && sources.length > 0 ? 'grid grid-cols-1 lg:grid-cols-2 gap-3' : ''}>
        {/* 왼쪽 — 모은 자료 */}
        {split && sources.length > 0 && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 max-h-[600px] overflow-y-auto">
            <div className="text-[10.5px] text-ink-muted mb-2">
              근거로 쓸 자료를 눌러 본문에 붙일 수 있어요.
            </div>
            <div className="flex flex-col gap-2">
              {sources.map((sc) => (
                <div key={sc.id} className="bg-white border border-sky-200 rounded-lg px-3 py-2.5">
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-[9.5px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                      {sc.kind}
                    </span>
                    <span className="text-[12px] font-bold text-ink flex-1">{sc.title}</span>
                  </div>
                  {sc.author && (
                    <div className="text-[10.5px] text-ink-muted mb-1">{sc.author}</div>
                  )}
                  {sc.note && (
                    <div className="text-[11.5px] text-ink-secondary leading-relaxed whitespace-pre-wrap mb-1.5">
                      {sc.note}
                    </div>
                  )}
                  <button
                    onClick={() =>
                      setText((t) => {
                        const cite = sc.note?.trim()
                          ? `${sc.note.trim()} (${sc.title}${sc.author ? `, ${sc.author}` : ''})`
                          : `(${sc.title}${sc.author ? `, ${sc.author}` : ''})`
                        return t.trim() ? `${t}\n\n${cite}` : cite
                      })
                    }
                    className="text-[10.5px] font-bold text-sky-700 border border-sky-200 rounded px-2 py-1 hover:bg-sky-50"
                  >
                    본문에 넣기
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 오른쪽 — 작성 */}
        <div>

      {/* 검토 상태 */}
      {reviewStatus === 'requested' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-3 text-[12px] text-amber-900">
          선생님께 검토를 요청했어요. 피드백이 오면 여기에 표시돼요.
        </div>
      )}

      {reviewStatus === 'reviewed' && (
        <div className="flex gap-1.5 mb-3">
          {([
            { k: 'mine' as const, label: '내가 쓴 글' },
            { k: 'final' as const, label: '완성본', disabled: !finalContent },
            { k: 'feedback' as const, label: '선생님 피드백', disabled: !feedback },
          ]).map((t) => {
            const on = view === t.k
            return (
              <button
                key={t.k}
                onClick={() => !t.disabled && setView(t.k)}
                disabled={t.disabled}
                className="px-3.5 py-1.5 rounded-full text-[12px] border transition-all disabled:opacity-40"
                style={{
                  background: on ? '#059669' : '#fff',
                  color: on ? '#fff' : '#6B7280',
                  borderColor: on ? '#059669' : '#E5E7EB',
                  fontWeight: on ? 700 : 500,
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      )}

      {view === 'final' && finalContent ? (
        <div className="rounded-xl border-2 border-green-300 bg-green-50/50 px-4 py-3.5">
          <div className="text-[11px] font-bold text-green-800 mb-1.5">
            선생님이 다듬은 완성본
          </div>
          <div className="text-[13.5px] text-ink leading-[1.8] whitespace-pre-wrap">
            {finalContent}
          </div>
        </div>
      ) : view === 'feedback' && feedback ? (
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 px-4 py-3.5">
          <div className="text-[11px] font-bold text-blue-800 mb-1.5">선생님 피드백</div>
          <div className="text-[13px] text-ink leading-[1.8] whitespace-pre-wrap">
            {feedback}
          </div>
        </div>
      ) : (
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={fmt ? `${fmt.sections[0].part}부터 차례대로 적어보세요.` : '서론부터 차례대로 적어보세요.'}
        rows={16}
        className="w-full border border-line rounded-xl px-4 py-3 text-[13.5px] leading-[1.8] outline-none resize-y focus:border-brand-high"
      />
      )}

      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        <span className="text-[11px] text-ink-muted">공백 제외 {charCount}자</span>

        <button
          onClick={analyze}
          disabled={!text.trim() || analyzing}
          className="ml-auto h-10 px-4 bg-white border border-purple-200 text-purple-700 rounded-lg text-[12.5px] font-bold hover:bg-purple-50 disabled:opacity-40"
        >
          {analyzing ? '분석 중…' : 'AI 분석 받기'}
        </button>

        <button
          onClick={() => onSave(text)}
          disabled={!dirty || saving}
          className="h-10 px-5 bg-brand-high text-white rounded-lg text-[13px] font-bold disabled:opacity-40"
        >
          {saving ? '저장 중…' : dirty ? '저장' : '저장됨'}
        </button>
      </div>

      {onRequestReview && reviewStatus !== 'requested' && (
        <button
          onClick={onRequestReview}
          disabled={!content.trim() || dirty || saving}
          className="w-full h-11 mt-2.5 bg-white border border-green-300 text-green-800 rounded-xl text-[13px] font-bold hover:bg-green-50 disabled:opacity-40"
        >
          {dirty
            ? '저장하고 나서 요청할 수 있어요'
            : reviewStatus === 'reviewed'
              ? '고쳐 쓰고 다시 검토 요청하기'
              : '선생님께 검토 요청하기'}
        </button>
      )}

        </div>
      </div>

      {analysis && (
        <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50 p-4">
          <div className="text-[12.5px] font-extrabold text-purple-900 mb-1.5">AI 분석</div>
          <div className="text-[12.5px] text-ink leading-[1.75] whitespace-pre-wrap">
            {analysis}
          </div>
          <div className="text-[10.5px] text-ink-muted mt-2.5">
            방향만 참고하고 문장은 직접 고쳐 쓰세요. 그래야 면접에서 설명할 수 있어요.
          </div>
        </div>
      )}
    </div>
  )
}