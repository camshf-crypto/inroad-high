import { useState, useMemo, useEffect } from 'react'
import {
  useMiddleLessons,
  useMiddleLessonsProgress,
  useToggleLessonComplete,
  useUpdateLessonMemo,
  type MiddleGrade,
  type MiddleLesson,
} from '@/pages/admin/_hooks/middle/useMiddleLessons'

function toGrade(g: string | null | undefined): MiddleGrade {
  if (g?.includes('3')) return '중3'
  if (g?.includes('2')) return '중2'
  return '중1'
}

interface Props {
  student: any
}

export default function LessonTab({ student }: Props) {
  const studentId: string = student.id
  const studentGrade = toGrade(student?.grade)

  const { data: lessons = [], isLoading: lessonsLoading } = useMiddleLessons(studentGrade)
  const { data: progressMap, isLoading: progLoading } = useMiddleLessonsProgress(studentId)
  const toggleComplete = useToggleLessonComplete(studentId)
  const updateMemo = useUpdateLessonMemo(studentId)

  const [selLessonId, setSelLessonId] = useState<string | null>(null)
  const [memoDraft, setMemoDraft] = useState<string>('')
  const [memoEditing, setMemoEditing] = useState(false)

  // 첫 로드 시 첫번째 레슨 자동 선택
  useEffect(() => {
    if (lessons.length > 0 && !selLessonId) {
      setSelLessonId(lessons[0].id)
    }
  }, [lessons, selLessonId])

  // 레슨 바뀌면 메모 초기화
  useEffect(() => {
    if (!selLessonId) {
      setMemoDraft('')
      setMemoEditing(false)
      return
    }
    const prog = progressMap?.get(selLessonId)
    setMemoDraft(prog?.teacher_memo ?? '')
    setMemoEditing(false)
  }, [selLessonId, progressMap])

  // 월별 그룹핑
  const months = useMemo(() => {
    const map = new Map<string, MiddleLesson[]>()
    for (const l of lessons) {
      if (!map.has(l.month_label)) map.set(l.month_label, [])
      map.get(l.month_label)!.push(l)
    }
    return Array.from(map.entries()).map(([m, list]) => ({
      m,
      list: list.sort((a, b) => a.week_no - b.week_no),
    }))
  }, [lessons])

  const selLesson = lessons.find(l => l.id === selLessonId)
  const isCompleted = (lessonId: string) => progressMap?.get(lessonId)?.is_completed === true
  const isReviewed = (lessonId: string) => progressMap?.get(lessonId)?.is_reviewed === true

  const doneCount = lessons.filter(l => isCompleted(l.id)).length
  const totalCount = lessons.length

  const handleToggleComplete = () => {
    if (!selLesson) return
    toggleComplete.mutate({
      lessonId: selLesson.id,
      isCompleted: !isCompleted(selLesson.id),
    })
  }

  const handleSaveMemo = () => {
    if (!selLesson) return
    updateMemo.mutate(
      { lessonId: selLesson.id, memo: memoDraft },
      {
        onSuccess: () => {
          setMemoEditing(false)
        },
      },
    )
  }

  const handleCancelMemo = () => {
    if (!selLessonId) return
    const prog = progressMap?.get(selLessonId)
    setMemoDraft(prog?.teacher_memo ?? '')
    setMemoEditing(false)
  }

  if (lessonsLoading || progLoading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block', width: 24, height: 24,
            border: '2px solid #E5E7EB', borderTopColor: '#059669',
            borderRadius: '50%', animation: 'spin 1s linear infinite',
            marginBottom: 12,
          }} />
          <div style={{ fontSize: 13, color: '#6B7280' }}>수업 정보를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  if (lessons.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{studentGrade} 수업이 등록되지 않았어요</div>
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>본사에서 영상을 등록할 때까지 기다려주세요</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* 왼쪽: 영상 + 정보 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 24px 0' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>수업 관리</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{student?.name} · {studentGrade}</div>
          </div>
          <div style={{
            background: '#ECFDF5', color: '#059669', fontSize: 13, fontWeight: 600,
            padding: '6px 16px', borderRadius: 99,
          }}>
            {doneCount}/{totalCount} 수업완료
          </div>
        </div>

        {selLesson && (
          <div style={{
            background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 14,
            padding: 20, marginBottom: 16,
          }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#059669',
                background: '#ECFDF5', padding: '2px 10px', borderRadius: 99,
              }}>
                {selLesson.month_label}
              </span>
              <span style={{ fontSize: 11, color: '#6B7280' }}>{selLesson.week_no}주차</span>
              {isCompleted(selLesson.id) && (
                <span style={{
                  fontSize: 11, fontWeight: 600, color: '#fff',
                  background: '#059669', padding: '2px 10px', borderRadius: 99,
                }}>
                  ✓ 수업완료
                </span>
              )}
              {isReviewed(selLesson.id) && (
                <span style={{
                  fontSize: 11, fontWeight: 600, color: '#1E3A8A',
                  background: '#EFF6FF', padding: '2px 10px', borderRadius: 99,
                  border: '1px solid #93C5FD',
                }}>
                  📚 학생 복습완료
                </span>
              )}
            </div>

            <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>
              {selLesson.title}
            </div>
            {selLesson.sub_title && (
              <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>{selLesson.sub_title}</div>
            )}

            {/* 영상 플레이어 */}
            <div style={{
              background: '#1a1a2e', borderRadius: 10, aspectRatio: '16/9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14, overflow: 'hidden',
            }}>
              {selLesson.video_url ? (
                <video src={selLesson.video_url} controls style={{ width: '100%', height: '100%', borderRadius: 10 }} />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, margin: '0 auto 10px',
                  }}>▶</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>본사에서 영상을 등록하면 여기서 볼 수 있어요</div>
                </div>
              )}
            </div>

            {/* 교재 페이지 */}
            {selLesson.page_range && (
              <div style={{
                background: '#FFF7ED', border: '0.5px solid #FDBA74', borderRadius: 10,
                padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
              }}>
                <span style={{ fontSize: 18 }}>📖</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>이번 수업 교재 범위</div>
                  <div style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>비커스 스피치 교재 — {selLesson.page_range}</div>
                </div>
              </div>
            )}

            {/* 수업 완료 + 메모 영역 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <button
                  onClick={handleToggleComplete}
                  disabled={toggleComplete.isPending}
                  style={{
                    height: 38, padding: '0 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    cursor: toggleComplete.isPending ? 'not-allowed' : 'pointer',
                    border: 'none', fontFamily: 'inherit',
                    background: isCompleted(selLesson.id) ? '#ECFDF5' : '#059669',
                    color: isCompleted(selLesson.id) ? '#059669' : '#fff',
                    outline: isCompleted(selLesson.id) ? '1px solid #6EE7B7' : 'none',
                    opacity: toggleComplete.isPending ? 0.6 : 1,
                  }}
                >
                  {toggleComplete.isPending
                    ? '저장 중...'
                    : isCompleted(selLesson.id) ? '✓ 수업완료' : '수업 완료 처리'}
                </button>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                  {isCompleted(selLesson.id) ? '학생 페이지에 표시돼요' : '수업이 끝나면 완료 처리해주세요'}
                </span>
              </div>

              {/* 선생님 메모 */}
              <div style={{
                background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 10,
                padding: '12px 14px',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                  💬 선생님 메모 (학생에게 보이지 않아요)
                </div>
                <textarea
                  value={memoDraft}
                  onChange={e => { setMemoDraft(e.target.value); setMemoEditing(true) }}
                  placeholder="이 학생에 대한 메모를 남겨주세요..."
                  rows={3}
                  style={{
                    width: '100%', padding: '8px 10px', fontSize: 12,
                    border: '1px solid #E5E7EB', borderRadius: 6,
                    resize: 'none', outline: 'none', fontFamily: 'inherit',
                    background: '#fff',
                  }}
                />
                {memoEditing && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
                    <button
                      onClick={handleCancelMemo}
                      style={{
                        padding: '4px 10px', fontSize: 11, fontWeight: 600,
                        color: '#6B7280', background: '#fff',
                        border: '1px solid #E5E7EB', borderRadius: 6, cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSaveMemo}
                      disabled={updateMemo.isPending}
                      style={{
                        padding: '4px 12px', fontSize: 11, fontWeight: 700,
                        color: '#fff', background: '#059669',
                        border: 'none', borderRadius: 6,
                        cursor: updateMemo.isPending ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        opacity: updateMemo.isPending ? 0.6 : 1,
                      }}
                    >
                      {updateMemo.isPending ? '저장 중...' : '저장'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 구분선 */}
      <div style={{ width: '0.5px', background: '#E5E7EB', flexShrink: 0 }} />

      {/* 오른쪽: 수업 목록 */}
      <div style={{ width: 280, flexShrink: 0, overflowY: 'auto', padding: '24px 16px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>
          전체 수업 목록
        </div>
        {months.map((m, mi) => (
          <div key={m.m}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: '#9CA3AF',
              marginBottom: 6, marginTop: mi > 0 ? 14 : 0,
            }}>
              {m.m}
            </div>
            {m.list.map(l => {
              const isSelected = selLessonId === l.id
              const completed = isCompleted(l.id)
              const reviewed = isReviewed(l.id)
              return (
                <div
                  key={l.id}
                  onClick={() => setSelLessonId(l.id)}
                  style={{
                    padding: '9px 12px', borderRadius: 8, marginBottom: 5,
                    cursor: 'pointer',
                    border: `0.5px solid ${isSelected ? '#059669' : completed ? '#6EE7B7' : '#E5E7EB'}`,
                    background: isSelected ? '#ECFDF5' : completed ? '#F0FDF4' : '#fff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: completed ? '#059669' : isSelected ? '#059669' : '#F3F4F6',
                      color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, flexShrink: 0,
                    }}>
                      {completed ? '✓' : l.week_no}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12,
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? '#059669' : '#1a1a1a',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {l.title}
                      </div>
                      <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>
                        {l.page_range}
                      </div>
                    </div>
                    {reviewed && (
                      <span style={{
                        fontSize: 9, color: '#1E3A8A', background: '#EFF6FF',
                        padding: '1px 5px', borderRadius: 99, flexShrink: 0,
                      }}>
                        복습
                      </span>
                    )}
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