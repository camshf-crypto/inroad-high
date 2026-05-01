import { THEME } from './mock-data'
import type { PassageInterview } from './mock-data'

interface Props {
  item: PassageInterview
  onClose: () => void
}

interface Field {
  label: string
  value: string | number
  mono?: boolean
  badge?: 'blue' | 'amber'
}

interface Group {
  title: string
  fields: Field[]
}

export default function PassageDetailModal({ item, onClose }: Props) {
  const isHigh = item.grade === 'high'

  // 필드 그룹 정의
  const groups: Group[] = [
    {
      title: '🏫 학교 정보',
      fields: [
        { label: '학교코드', value: item.schoolCode, mono: true },
        { label: '학교명', value: item.schoolName },
        { label: '학교순서', value: item.schoolOrder },
      ],
    },
    ...(isHigh
      ? [
          {
            title: '📚 계열 정보',
            fields: [
              { label: '계열코드', value: item.trackCode || '-', mono: true },
              { label: '계열명', value: item.trackName || '-' },
              {
                label: '계열세부코드',
                value: item.trackDetailCode || '-',
                mono: true,
              },
            ],
          } as Group,
        ]
      : []),
    {
      title: '📦 세트 정보',
      fields: [
        { label: '세트코드', value: item.setCode, mono: true },
        { label: '연도', value: `${item.year}년` },
        { label: '회차', value: `${item.round}회차` },
        { label: '회차순서', value: item.roundOrder },
        { label: '총일수', value: `${item.totalDays}일` },
      ],
    },
    {
      title: '❓ 질문 정보',
      fields: [
        { label: '질문코드', value: item.questionCode, mono: true },
        { label: '질문순서', value: item.questionOrder },
      ],
    },
    {
      title: '📎 첨부',
      fields: [
        { label: '제시문 개수', value: `${item.passageCount}개`, badge: 'blue' },
        { label: '문항참고이미지 개수', value: `${item.imageCount}개`, badge: 'amber' },
      ],
    },
  ]

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[720px] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <div className="text-[15px] font-extrabold text-ink tracking-tight">
              제시문면접 상세
            </div>
            <span
              className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ background: THEME.accentBg, color: THEME.accent }}
            >
              <span>{isHigh ? '🎓' : '📚'}</span>
              {isHigh ? '고등' : '중등'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 원질문 / 세부질문 (강조) */}
          <div
            className="p-4 rounded-2xl border"
            style={{ background: THEME.accentBg, borderColor: THEME.accentBorder + '60' }}
          >
            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
              원질문
            </div>
            <p className="text-[14px] font-bold text-ink leading-[1.6] mb-3">
              {item.originalQuestion}
            </p>
            <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
              세부질문
            </div>
            <p className="text-[13px] font-medium text-ink-secondary leading-[1.6]">
              {item.subQuestion}
            </p>
          </div>

          {/* 그룹별 정보 */}
          {groups.map((group, idx) => (
            <div
              key={idx}
              className="bg-white border border-line rounded-2xl overflow-hidden"
            >
              <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-line">
                <div className="text-[12px] font-extrabold text-ink">
                  {group.title}
                </div>
              </div>
              <div className="p-4">
                <table className="w-full">
                  <tbody>
                    {group.fields.map((field, fIdx) => (
                      <tr
                        key={fIdx}
                        style={{
                          borderBottom:
                            fIdx < group.fields.length - 1
                              ? '1px solid #F1F5F9'
                              : 'none',
                        }}
                      >
                        <td className="py-2 text-[12px] font-semibold text-ink-secondary w-[140px]">
                          {field.label}
                        </td>
                        <td className="py-2 text-right">
                          {field.badge === 'blue' && (
                            <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-[12px] font-bold rounded-full">
                              {field.value}
                            </span>
                          )}
                          {field.badge === 'amber' && (
                            <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 text-[12px] font-bold rounded-full">
                              {field.value}
                            </span>
                          )}
                          {!field.badge && (
                            <span
                              className={`text-[13px] font-bold text-ink ${field.mono ? 'font-mono' : ''}`}
                            >
                              {field.value}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* 등록일 */}
          <div className="text-center text-[11px] font-semibold text-ink-muted pt-2">
            등록일: {item.createdAt}
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-line bg-[#F8FAFC] flex items-center justify-end gap-2">
          <button className="px-4 py-2 bg-white border border-line text-red-600 text-[12px] font-bold rounded-full hover:bg-red-50 transition-all">
            🗑️ 삭제
          </button>
          <button
            className="px-4 py-2 bg-white border text-[12px] font-bold rounded-full transition-all"
            style={{ color: THEME.accent, borderColor: THEME.accent }}
          >
            ✏️ 수정
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-white text-[12px] font-bold rounded-full transition-all hover:-translate-y-px"
            style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}