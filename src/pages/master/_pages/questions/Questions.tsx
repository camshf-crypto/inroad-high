import { useState } from 'react'
import PastQuestionsTab from './PastQuestionsTab'
import MajorQuestionsTab from './MajorQuestionsTab'
import PassageInterviewTab from './PassageInterviewTab'
import ExportModal from './ExportModal'
import { THEME } from './mock-data'
import type { Grade } from './mock-data'

type TabType = 'past' | 'major' | 'passage'

export default function MasterQuestions() {
  const [grade, setGrade] = useState<Grade>('high')
  const [activeTab, setActiveTab] = useState<TabType>('past')
  const [showExportModal, setShowExportModal] = useState(false)

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'past', label: '기출문제', icon: '📝' },
    { id: 'major', label: '전공질문', icon: '🎓' },
    { id: 'passage', label: '제시문면접', icon: '📜' },
  ]

  return (
    <div className="px-8 py-7 min-h-full">

      {/* 헤더 */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📝</span>
            <div className="text-[22px] font-extrabold text-ink tracking-tight">
              질문 관리
            </div>
          </div>
          <div className="text-[13px] font-medium text-ink-secondary">
            전국 학원에 배포할 면접 질문 콘텐츠를 등록하고 관리합니다.
          </div>
        </div>

        {/* 우측: 내보내기 + 학년 토글 */}
        <div className="flex items-center gap-3">
          {/* 🆕 내보내기 버튼 */}
          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border text-[12px] font-bold rounded-full transition-all hover:-translate-y-px"
            style={{
              color: THEME.accent,
              borderColor: THEME.accent,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = THEME.accentBg
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#fff'
            }}
          >
            <span>⬇️</span>
            내보내기
          </button>

          {/* 학년 토글 */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
              학년
            </span>
            <div
              className="inline-flex p-1 rounded-full border"
              style={{ background: '#F1F5F9', borderColor: '#E2E8F0' }}
            >
              <button
                onClick={() => setGrade('high')}
                className="px-4 py-1.5 text-[12px] font-bold rounded-full transition-all flex items-center gap-1.5"
                style={{
                  background: grade === 'high' ? '#fff' : 'transparent',
                  color: grade === 'high' ? THEME.accentDark : '#64748B',
                  boxShadow: grade === 'high' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <span>🎓</span>
                고등
              </button>
              <button
                onClick={() => setGrade('middle')}
                className="px-4 py-1.5 text-[12px] font-bold rounded-full transition-all flex items-center gap-1.5"
                style={{
                  background: grade === 'middle' ? '#fff' : 'transparent',
                  color: grade === 'middle' ? THEME.accentDark : '#64748B',
                  boxShadow: grade === 'middle' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                <span>📚</span>
                중등
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 카드 */}
      <div className="bg-white border border-line rounded-2xl shadow-[0_2px_8px_rgba(15,23,42,0.04)] mb-6 overflow-hidden">
        <div className="border-b border-line">
          <nav className="flex gap-1 px-2 -mb-px">
            {tabs.map(tab => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-5 py-3.5 text-[13px] font-extrabold transition-all flex items-center gap-2 border-b-2"
                  style={{
                    color: active ? THEME.accent : '#64748B',
                    borderColor: active ? THEME.accent : 'transparent',
                  }}
                >
                  <span className="text-base">{tab.icon}</span>
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="p-6">
          {activeTab === 'past' && <PastQuestionsTab grade={grade} />}
          {activeTab === 'major' && <MajorQuestionsTab grade={grade} />}
          {activeTab === 'passage' && <PassageInterviewTab grade={grade} />}
        </div>
      </div>

      {/* 🆕 내보내기 모달 */}
      {showExportModal && (
        <ExportModal currentGrade={grade} onClose={() => setShowExportModal(false)} />
      )}
    </div>
  )
}