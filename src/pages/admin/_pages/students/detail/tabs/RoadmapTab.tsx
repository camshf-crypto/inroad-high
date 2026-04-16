import { useState } from 'react'

const SEC: React.CSSProperties = { border: '0.5px solid #E5E7EB', borderRadius: 12, background: '#fff', padding: 20, marginBottom: 14 }

function RoadmapCard({ m, isCur, isSel, onClick }: { m: any, isCur: boolean, isSel: boolean, onClick: () => void }) {
  const done = m.missions.filter((x: any) => x.ok).length
  const total = m.missions.length
  const pct = total > 0 ? Math.round(done / total * 100) : 0
  let cardBorder = '#E5E7EB', cardBg = '#fff', badgeBg = '#F3F4F6', badgeColor = '#6B7280'
  if (isSel) { cardBorder = '#3B5BDB'; cardBg = '#EEF2FF'; badgeBg = '#3B5BDB'; badgeColor = '#fff' }
  else if (isCur) { cardBorder = '#BAC8FF'; cardBg = '#F5F8FF'; badgeBg = '#BAC8FF'; badgeColor = '#fff' }
  if (pct === 100) { badgeBg = '#ECFDF5'; badgeColor = '#059669' }

  return (
    <div onClick={onClick} style={{ border: `0.5px solid ${cardBorder}`, borderRadius: 10, padding: 12, cursor: 'pointer', background: cardBg }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: badgeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: badgeColor }}>
          {pct === 100 ? '✓' : m.m.replace('월', '')}
        </div>
        <span style={{ fontSize: 9, color: '#6B7280', background: '#F3F4F6', padding: '1px 5px', borderRadius: 99 }}>{m.freq}</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a', marginBottom: 2 }}>{m.m}</div>
      <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 7, lineHeight: 1.4 }}>{m.theme}</div>
      <div style={{ height: 3, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#059669' : '#3B5BDB', borderRadius: 99 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6B7280' }}>
        <span>{done}/{total} 완료</span>
        {m.files.length > 0 && <span>📁 {m.files.length}</span>}
      </div>
    </div>
  )
}

export default function RoadmapTab({ roadmap, student }: { roadmap: any[], student: any }) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const selected = selectedMonth !== null ? roadmap[selectedMonth] : null

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap: 16 }}>
        <div>
          <div style={SEC}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 4 }}>연간 로드맵 진행 현황</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 14 }}>월을 클릭하면 상세 미션을 확인할 수 있어요.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
              {roadmap.map((m: any, i: number) => (
                <RoadmapCard
                  key={i}
                  m={m}
                  isCur={m.m === student.month}
                  isSel={selectedMonth === i}
                  onClick={() => setSelectedMonth(selectedMonth === i ? null : i)}
                />
              ))}
            </div>
          </div>
          <div style={SEC}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 14 }}>업로드 파일 목록</div>
            {roadmap.flatMap((m: any) => m.files.map((f: any) => ({ ...f, month: m.m }))).length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6B7280', fontSize: 13, padding: '20px 0' }}>업로드된 파일이 없어요.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {roadmap.flatMap((m: any) => m.files.map((f: any) => ({ ...f, month: m.m }))).map((f: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#F8F7F5', borderRadius: 8 }}>
                    <span>📄</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#1a1a1a' }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>{f.month} · {f.size}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#3B5BDB', border: '0.5px solid #3B5BDB', padding: '3px 10px', borderRadius: 99, cursor: 'pointer' }}>다운로드</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {selected && (
          <div style={{ ...SEC, height: 'fit-content', position: 'sticky', top: 0, borderColor: '#3B5BDB' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>{selected.m}</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{selected.theme}</div>
                <div style={{ fontSize: 10, color: '#3B5BDB', marginTop: 2 }}>{selected.freq}</div>
              </div>
              <div onClick={() => setSelectedMonth(null)} style={{ cursor: 'pointer', fontSize: 14, color: '#6B7280' }}>✕</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 8 }}>미션 목록</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selected.missions.map((ms: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: ms.ok ? '#ECFDF5' : '#F8F7F5', border: `0.5px solid ${ms.ok ? '#6EE7B7' : '#E5E7EB'}`, borderRadius: 7 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: ms.ok ? '#059669' : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', flexShrink: 0 }}>
                    {ms.ok ? '✓' : ''}
                  </div>
                  <span style={{ fontSize: 12, color: ms.ok ? '#059669' : '#6B7280', fontWeight: ms.ok ? 500 : 400 }}>{ms.t}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}