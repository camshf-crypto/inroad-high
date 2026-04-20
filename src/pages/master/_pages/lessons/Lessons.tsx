import { useState, useRef } from 'react'

const THEME = {
  accent: '#7C3AED',
  accentDark: '#5B21B6',
  accentBg: '#F5F3FF',
  accentBorder: '#C4B5FD',
  accentShadow: 'rgba(124, 58, 237, 0.15)',
  gradient: 'linear-gradient(135deg, #5B21B6, #8B5CF6)',
}

const SUBJECTS = [
  { key: 'korean', label: '국어', icon: '📖', color: '#DC2626' },
  { key: 'math', label: '수학', icon: '🔢', color: '#2563EB' },
  { key: 'english', label: '영어', icon: '🌍', color: '#059669' },
  { key: 'science', label: '과학', icon: '🔬', color: '#7C3AED' },
  { key: 'social', label: '사회', icon: '🏛️', color: '#F59E0B' },
  { key: 'interview', label: '면접', icon: '🎤', color: '#EC4899' },
]

const TARGET_GRADES = [
  { key: 'middle', label: '중등', icon: '📚', color: '#059669' },
  { key: 'high', label: '고등', icon: '🎓', color: '#2563EB' },
  { key: 'all', label: '전체', icon: '🌟', color: '#7C3AED' },
]

const INIT_LESSONS = [
  {
    id: 1,
    title: '중학 국어 1강: 글의 구조 파악하기',
    subject: 'korean',
    target: 'middle',
    teacher: '김국어',
    duration: '15:32',
    fileSize: '287 MB',
    fileName: '중학국어_1강_글의구조.mp4',
    resolution: '1080p',
    thumbnail: '',
    views: 1234,
    academyCount: 42,
    uploadDate: '2025.04.18',
    description: '중학교 국어 첫 시간, 글의 구조를 어떻게 파악하는지 배워봐요.',
    status: 'active',
    visibility: 'all',
    uploadProgress: 100,
  },
  {
    id: 2,
    title: '중학 수학 1강: 유리수와 무리수',
    subject: 'math',
    target: 'middle',
    teacher: '박수학',
    duration: '22:15',
    fileSize: '412 MB',
    fileName: '중학수학_1강_유리수무리수.mp4',
    resolution: '1080p',
    thumbnail: '',
    views: 2341,
    academyCount: 38,
    uploadDate: '2025.04.15',
    description: '유리수와 무리수의 차이점을 쉽게 설명해드려요.',
    status: 'active',
    visibility: 'all',
    uploadProgress: 100,
  },
  {
    id: 3,
    title: '고등 영어 1강: 영어 면접 기초',
    subject: 'english',
    target: 'high',
    teacher: 'Sarah Kim',
    duration: '28:45',
    fileSize: '534 MB',
    fileName: '고등영어_1강_면접기초.mp4',
    resolution: '1080p',
    thumbnail: '',
    views: 3456,
    academyCount: 45,
    uploadDate: '2025.04.12',
    description: '대학 입시 영어 면접을 위한 기초 강의.',
    status: 'active',
    visibility: 'all',
    uploadProgress: 100,
  },
  {
    id: 4,
    title: '면접 시뮬레이션: 자소서 기반 질문 대응',
    subject: 'interview',
    target: 'high',
    teacher: '최면접',
    duration: '32:18',
    fileSize: '612 MB',
    fileName: '면접시뮬_자소서기반.mp4',
    resolution: '4K',
    thumbnail: '',
    views: 4892,
    academyCount: 47,
    uploadDate: '2025.04.08',
    description: '자소서를 기반으로 하는 면접 질문 대응 전략.',
    status: 'active',
    visibility: 'all',
    uploadProgress: 100,
  },
]

export default function MasterLessons() {
  const [lessons, setLessons] = useState<any[]>(() => {
    const saved = localStorage.getItem('master_lessons_v2')
    return saved ? JSON.parse(saved) : INIT_LESSONS
  })

  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [targetFilter, setTargetFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<any>(null)

  // 업로드 상태
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    subject: 'korean',
    target: 'middle',
    teacher: '',
    duration: '',
    visibility: 'all',
  })

  const saveLessons = (list: any[]) => {
    localStorage.setItem('master_lessons_v2', JSON.stringify(list))
    setLessons(list)
  }

  const filtered = lessons.filter(l => {
    if (search && !l.title.includes(search) && !l.teacher.includes(search)) return false
    if (subjectFilter !== 'all' && l.subject !== subjectFilter) return false
    if (targetFilter !== 'all' && l.target !== targetFilter) return false
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    return true
  })

  const stats = {
    total: lessons.length,
    active: lessons.filter(l => l.status === 'active').length,
    draft: lessons.filter(l => l.status === 'draft').length,
    totalViews: lessons.reduce((sum, l) => sum + l.views, 0),
    totalSize: lessons.reduce((sum, l) => {
      const mb = parseFloat(l.fileSize) || 0
      return sum + mb
    }, 0),
  }

  // 📏 파일 크기 포맷
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  }

  // 🎬 파일 선택
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('⚠️ 영상 파일만 업로드 가능해요! (MP4, MOV, AVI 등)')
      return
    }

    // 크기 제한 (5GB)
    if (file.size > 5 * 1024 * 1024 * 1024) {
      alert('⚠️ 파일 크기는 5GB 이하여야 해요!')
      return
    }

    setSelectedFile(file)

    // 자동으로 제목 채우기 (파일명에서)
    if (!form.title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      setForm(prev => ({ ...prev, title: nameWithoutExt }))
    }
  }

  // 📤 드래그앤드롭
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  // 📁 파일 선택 클릭
  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  // 🚀 업로드 실행
  const handleUpload = async () => {
    if (!selectedFile) {
      alert('⚠️ 영상 파일을 선택해주세요!')
      return
    }
    if (!form.title.trim() || !form.teacher.trim()) {
      alert('⚠️ 제목과 강사는 필수예요!')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    // 🎬 업로드 시뮬레이션 (실제로는 Supabase/AWS로 전송)
    const intervalTime = 150
    const totalSteps = 20

    for (let i = 0; i <= totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, intervalTime))
      setUploadProgress(Math.round((i / totalSteps) * 100))
    }

    // 새 강의 추가
    const newLesson = {
      id: Math.max(...lessons.map(l => l.id), 0) + 1,
      title: form.title,
      description: form.description,
      subject: form.subject,
      target: form.target,
      teacher: form.teacher,
      duration: form.duration || '00:00',
      fileSize: formatFileSize(selectedFile.size),
      fileName: selectedFile.name,
      resolution: '1080p',
      thumbnail: '',
      views: 0,
      academyCount: 0,
      uploadDate: new Date().toLocaleDateString('ko-KR').replace(/\. /g, '.').slice(0, -1),
      status: 'active',
      visibility: form.visibility,
      uploadProgress: 100,
    }

    saveLessons([newLesson, ...lessons])

    // 리셋
    setUploading(false)
    setUploadProgress(0)
    setSelectedFile(null)
    setForm({
      title: '',
      description: '',
      subject: 'korean',
      target: 'middle',
      teacher: '',
      duration: '',
      visibility: 'all',
    })
    setShowUploadModal(false)

    alert(`✅ [${newLesson.title}] 업로드 완료!\n\n📁 파일: ${newLesson.fileName}\n💾 크기: ${newLesson.fileSize}\n\n💡 실제 서비스에서는 Supabase Storage나 AWS S3에 자동 저장돼요.`)
  }

  const openUploadModal = () => {
    setSelectedFile(null)
    setForm({
      title: '',
      description: '',
      subject: 'korean',
      target: 'middle',
      teacher: '',
      duration: '',
      visibility: 'all',
    })
    setShowUploadModal(true)
  }

  const openEditModal = (lesson: any) => {
    setSelectedLesson(lesson)
    setForm({
      title: lesson.title,
      description: lesson.description,
      subject: lesson.subject,
      target: lesson.target,
      teacher: lesson.teacher,
      duration: lesson.duration,
      visibility: lesson.visibility,
    })
    setShowEditModal(true)
  }

  const handleEdit = () => {
    if (!selectedLesson) return
    const updated = lessons.map(l =>
      l.id === selectedLesson.id ? { ...l, ...form } : l
    )
    saveLessons(updated)
    setShowEditModal(false)
    alert('✅ 강의가 수정됐어요!')
  }

  const handleDelete = (lesson: any) => {
    if (!confirm(`"${lesson.title}"을 삭제하시겠어요?\n\n⚠️ 영상 파일도 함께 삭제됩니다.`)) return
    saveLessons(lessons.filter(l => l.id !== lesson.id))
    alert('🗑️ 강의가 삭제됐어요.')
  }

  const openPreview = (lesson: any) => {
    setSelectedLesson(lesson)
    setShowPreviewModal(true)
  }

  const toggleStatus = (lesson: any) => {
    const newStatus = lesson.status === 'active' ? 'draft' : 'active'
    const updated = lessons.map(l =>
      l.id === lesson.id ? { ...l, status: newStatus } : l
    )
    saveLessons(updated)
  }

  return (
    <div className="px-8 py-7 min-h-full">

      {/* 헤더 */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎬</span>
            <div className="text-[22px] font-extrabold text-ink tracking-tight">강의 영상 관리</div>
          </div>
          <div className="text-[13px] font-medium text-ink-secondary">
            본사에서 제작한 영상을 업로드하면 전체 학원에 자동 배포돼요.
          </div>
        </div>

        <button
          onClick={openUploadModal}
          className="h-10 px-5 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px"
          style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
        >
          ⬆️ 영상 업로드
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 max-md:grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl px-5 py-4 shadow-[0_8px_24px_rgba(124,58,237,0.15)]" style={{ background: THEME.gradient }}>
          <div className="text-[11px] font-bold text-white/80 uppercase tracking-wider mb-1">전체 강의</div>
          <div className="flex items-baseline gap-1">
            <div className="text-[28px] font-extrabold text-white tracking-tight">{stats.total}</div>
            <div className="text-[13px] font-semibold text-white/80">개</div>
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">✓ 공개중</div>
          <div className="flex items-baseline gap-1">
            <div className="text-[28px] font-extrabold text-green-600 tracking-tight">{stats.active}</div>
            <div className="text-[13px] font-semibold text-ink-muted">개</div>
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">👁️ 총 조회수</div>
          <div className="flex items-baseline gap-1">
            <div className="text-[28px] font-extrabold tracking-tight" style={{ color: THEME.accent }}>
              {stats.totalViews.toLocaleString()}
            </div>
            <div className="text-[13px] font-semibold text-ink-muted">회</div>
          </div>
        </div>

        <div className="bg-white border border-line rounded-2xl px-5 py-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">💾 총 용량</div>
          <div className="flex items-baseline gap-1">
            <div className="text-[28px] font-extrabold text-ink tracking-tight">
              {(stats.totalSize / 1024).toFixed(1)}
            </div>
            <div className="text-[13px] font-semibold text-ink-muted">GB</div>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white border border-line rounded-2xl px-5 py-4 mb-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
        <div className="flex gap-2.5 items-center flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 제목, 강사명으로 검색..."
              className="w-full h-10 px-4 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
              onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
              onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div className="flex gap-1">
            <span className="text-[10px] font-bold text-ink-muted self-center mr-1">과목:</span>
            <button
              onClick={() => setSubjectFilter('all')}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
              style={{
                borderColor: subjectFilter === 'all' ? THEME.accent : '#E5E7EB',
                background: subjectFilter === 'all' ? THEME.accentBg : '#fff',
                color: subjectFilter === 'all' ? THEME.accentDark : '#6B7280',
              }}
            >
              전체
            </button>
            {SUBJECTS.map(s => {
              const active = subjectFilter === s.key
              return (
                <button
                  key={s.key}
                  onClick={() => setSubjectFilter(s.key)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
                  style={{
                    borderColor: active ? s.color : '#E5E7EB',
                    background: active ? `${s.color}15` : '#fff',
                    color: active ? s.color : '#6B7280',
                  }}
                >
                  {s.icon} {s.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex gap-2.5 items-center flex-wrap mt-2.5">
          <div className="flex gap-1">
            <span className="text-[10px] font-bold text-ink-muted self-center mr-1">대상:</span>
            <button
              onClick={() => setTargetFilter('all')}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
              style={{
                borderColor: targetFilter === 'all' ? THEME.accent : '#E5E7EB',
                background: targetFilter === 'all' ? THEME.accentBg : '#fff',
                color: targetFilter === 'all' ? THEME.accentDark : '#6B7280',
              }}
            >
              전체
            </button>
            {TARGET_GRADES.map(t => {
              const active = targetFilter === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setTargetFilter(t.key)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
                  style={{
                    borderColor: active ? t.color : '#E5E7EB',
                    background: active ? `${t.color}15` : '#fff',
                    color: active ? t.color : '#6B7280',
                  }}
                >
                  {t.icon} {t.label}
                </button>
              )
            })}
          </div>

          <div className="flex gap-1 ml-auto">
            <span className="text-[10px] font-bold text-ink-muted self-center mr-1">상태:</span>
            {[
              { key: 'all', label: '전체' },
              { key: 'active', label: '✓ 공개중' },
              { key: 'draft', label: '📝 초안' },
            ].map(s => {
              const active = statusFilter === s.key
              return (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
                  style={{
                    borderColor: active ? THEME.accent : '#E5E7EB',
                    background: active ? THEME.accentBg : '#fff',
                    color: active ? THEME.accentDark : '#6B7280',
                  }}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-[11px] font-medium text-ink-secondary">
            검색 결과: <span className="font-extrabold" style={{ color: THEME.accent }}>{filtered.length}개</span>
          </div>
        </div>
      </div>

      {/* 강의 카드 그리드 */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-line border-dashed rounded-2xl px-6 py-20 text-center text-ink-muted shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="text-5xl mb-4">🎬</div>
          <div className="text-[14px] font-bold text-ink-secondary mb-1">아직 업로드된 강의가 없어요</div>
          <div className="text-[12px] font-medium mb-4">첫 강의 영상을 업로드해보세요!</div>
          <button
            onClick={openUploadModal}
            className="h-10 px-5 text-white rounded-lg text-[13px] font-bold inline-block"
            style={{ background: THEME.gradient }}
          >
            ⬆️ 영상 업로드하기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1 gap-4">
          {filtered.map(lesson => {
            const subject = SUBJECTS.find(s => s.key === lesson.subject)
            const target = TARGET_GRADES.find(t => t.key === lesson.target)

            return (
              <div
                key={lesson.id}
                className="bg-white border border-line rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(15,23,42,0.1)]"
              >
                {/* 썸네일 영역 (영상 아이콘) */}
                <div
                  onClick={() => openPreview(lesson)}
                  className="relative cursor-pointer group"
                  style={{
                    paddingBottom: '56.25%',
                    background: `linear-gradient(135deg, ${subject?.color || '#7C3AED'}, ${subject?.color || '#5B21B6'}dd)`,
                  }}
                >
                  {/* 배경 패턴 */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl opacity-30">{subject?.icon || '🎬'}</div>
                  </div>

                  {/* 재생 버튼 */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center text-2xl">
                      ▶️
                    </div>
                  </div>

                  {/* 재생 시간 */}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 text-white rounded text-[11px] font-bold">
                    ⏱️ {lesson.duration}
                  </div>

                  {/* 화질 뱃지 */}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 text-white rounded text-[10px] font-bold">
                    {lesson.resolution}
                  </div>

                  {/* 상태 뱃지 */}
                  <div className="absolute top-2 left-2">
                    {lesson.status === 'active' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-green-500">
                        ✓ 공개중
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-amber-500">
                        📝 초안
                      </span>
                    )}
                  </div>

                  {/* 대상 뱃지 */}
                  <div className="absolute top-2 right-2">
                    {target && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ background: target.color }}
                      >
                        {target.icon} {target.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* 정보 */}
                <div className="px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    {subject && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ color: subject.color, background: `${subject.color}15` }}
                      >
                        {subject.icon} {subject.label}
                      </span>
                    )}
                    <span className="text-[10px] font-medium text-ink-muted">· {lesson.uploadDate}</span>
                  </div>

                  <div className="text-[14px] font-extrabold text-ink leading-[1.4] mb-1 line-clamp-2 min-h-[40px]">
                    {lesson.title}
                  </div>

                  <div className="text-[11px] font-medium text-ink-secondary mb-2">
                    👨‍🏫 {lesson.teacher}
                  </div>

                  {/* 파일 정보 */}
                  <div className="bg-gray-50 rounded-lg px-2 py-1.5 mb-3 flex items-center gap-2">
                    <span className="text-[10px]">📁</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-ink truncate">{lesson.fileName}</div>
                      <div className="text-[9px] font-medium text-ink-muted">{lesson.fileSize}</div>
                    </div>
                  </div>

                  {/* 통계 */}
                  <div className="flex items-center gap-3 mb-3 text-[11px] font-semibold text-ink-muted">
                    <span>👁️ {lesson.views.toLocaleString()}회</span>
                    <span>·</span>
                    <span>🏫 {lesson.academyCount}개</span>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => openPreview(lesson)}
                      className="flex-1 h-8 border rounded-lg text-[11px] font-bold transition-all"
                      style={{ color: THEME.accent, borderColor: THEME.accentBorder, background: '#fff' }}
                      onMouseEnter={e => { e.currentTarget.style.background = THEME.accentBg }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                    >
                      ▶️ 재생
                    </button>
                    <button
                      onClick={() => openEditModal(lesson)}
                      className="h-8 px-2.5 border border-line rounded-lg text-[11px] font-bold text-ink-secondary hover:bg-gray-50 transition-colors"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => toggleStatus(lesson)}
                      className="h-8 px-2.5 border border-line rounded-lg text-[11px] font-bold transition-all"
                      style={{
                        color: lesson.status === 'active' ? '#F59E0B' : '#059669',
                        background: '#fff',
                      }}
                    >
                      {lesson.status === 'active' ? '⏸️' : '▶️'}
                    </button>
                    <button
                      onClick={() => handleDelete(lesson)}
                      className="h-8 px-2.5 border border-red-200 rounded-lg text-[11px] font-bold text-red-500 bg-white hover:bg-red-50 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ============ 업로드 모달 ============ */}
      {showUploadModal && (
        <div
          onClick={() => !uploading && setShowUploadModal(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl w-[680px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <div className="px-6 py-5 relative overflow-hidden" style={{ background: THEME.gradient }}>
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-extrabold text-white">⬆️ 영상 업로드</div>
                  <div className="text-[12px] text-white/80 mt-0.5">
                    제작한 영상을 업로드하면 전체 학원에 배포돼요
                  </div>
                </div>
                {!uploading && (
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="px-6 py-5">

              {/* 📁 파일 드롭존 */}
              {!selectedFile ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={handleFileClick}
                  className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-4"
                  style={{
                    borderColor: isDragging ? THEME.accent : '#D1D5DB',
                    background: isDragging ? THEME.accentBg : '#F9FAFB',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect(file)
                    }}
                  />

                  <div className="text-5xl mb-3">{isDragging ? '📥' : '🎬'}</div>
                  <div className="text-[15px] font-extrabold text-ink mb-1">
                    {isDragging ? '여기에 파일을 놓으세요!' : '영상 파일을 드래그하거나 클릭'}
                  </div>
                  <div className="text-[11px] font-medium text-ink-secondary mb-3">
                    MP4, MOV, AVI · 최대 5GB
                  </div>
                  <button
                    className="h-10 px-5 text-white rounded-lg text-[12px] font-bold inline-block"
                    style={{ background: THEME.gradient }}
                  >
                    📁 파일 선택
                  </button>
                </div>
              ) : (
                /* 선택된 파일 정보 */
                <div className="border-2 rounded-2xl p-5 mb-4" style={{ borderColor: THEME.accent, background: THEME.accentBg }}>
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: THEME.gradient }}>
                      🎬
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-extrabold text-ink truncate mb-0.5">
                        {selectedFile.name}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-medium text-ink-secondary">
                        <span>💾 {formatFileSize(selectedFile.size)}</span>
                        <span>·</span>
                        <span>🎞️ {selectedFile.type}</span>
                      </div>
                    </div>
                    {!uploading && (
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-ink-muted hover:text-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* 업로드 진행률 */}
                  {uploading && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-[11px] font-bold" style={{ color: THEME.accentDark }}>
                          📤 업로드 중...
                        </div>
                        <div className="text-[11px] font-extrabold" style={{ color: THEME.accent }}>
                          {uploadProgress}%
                        </div>
                      </div>
                      <div className="h-2 bg-white rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${uploadProgress}%`,
                            background: THEME.gradient,
                          }}
                        />
                      </div>
                      <div className="text-[10px] font-medium text-ink-muted mt-1.5 text-center">
                        💡 실제 서비스에서는 Supabase/AWS로 자동 업로드됩니다
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 폼 */}
              {!uploading && (
                <div className="flex flex-col gap-3">
                  {/* 제목 */}
                  <div>
                    <label className="text-[11px] font-bold text-ink-secondary mb-1 block">제목 *</label>
                    <input
                      value={form.title}
                      onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="예: 중학 국어 1강 - 글의 구조 파악하기"
                      className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                      onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                      onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                    />
                  </div>

                  {/* 과목/대상 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-ink-secondary mb-1 block">과목 *</label>
                      <select
                        value={form.subject}
                        onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none cursor-pointer bg-white"
                      >
                        {SUBJECTS.map(s => (
                          <option key={s.key} value={s.key}>{s.icon} {s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-ink-secondary mb-1 block">대상 *</label>
                      <select
                        value={form.target}
                        onChange={e => setForm(prev => ({ ...prev, target: e.target.value }))}
                        className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none cursor-pointer bg-white"
                      >
                        {TARGET_GRADES.map(t => (
                          <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 강사/시간 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-ink-secondary mb-1 block">강사 *</label>
                      <input
                        value={form.teacher}
                        onChange={e => setForm(prev => ({ ...prev, teacher: e.target.value }))}
                        placeholder="예: 김국어"
                        className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                        onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                        onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-ink-secondary mb-1 block">재생시간</label>
                      <input
                        value={form.duration}
                        onChange={e => setForm(prev => ({ ...prev, duration: e.target.value }))}
                        placeholder="예: 15:32"
                        className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none transition-all placeholder:text-ink-muted"
                        onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                        onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                      />
                    </div>
                  </div>

                  {/* 설명 */}
                  <div>
                    <label className="text-[11px] font-bold text-ink-secondary mb-1 block">설명</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="강의 내용을 간단히 설명해주세요..."
                      rows={2}
                      className="w-full border border-line rounded-lg px-3 py-2 text-[13px] font-medium outline-none resize-y leading-[1.6]"
                      onFocus={e => { e.target.style.borderColor = THEME.accent; e.target.style.boxShadow = `0 0 0 3px ${THEME.accentShadow}` }}
                      onBlur={e => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none' }}
                    />
                  </div>

                  {/* 공개 범위 */}
                  <div>
                    <label className="text-[11px] font-bold text-ink-secondary mb-2 block">공개 범위</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'all', label: '🌐 전체', desc: '모든 학원' },
                        { key: 'middle', label: '📚 중등', desc: '중등만' },
                        { key: 'high', label: '🎓 고등', desc: '고등만' },
                      ].map(v => {
                        const active = form.visibility === v.key
                        return (
                          <button
                            key={v.key}
                            onClick={() => setForm(prev => ({ ...prev, visibility: v.key }))}
                            className="px-3 py-2 rounded-xl border-2 transition-all text-center"
                            style={{
                              borderColor: active ? THEME.accent : '#E5E7EB',
                              background: active ? THEME.accentBg : '#fff',
                            }}
                          >
                            <div className="text-[12px] font-extrabold" style={{ color: active ? THEME.accentDark : '#1a1a1a' }}>
                              {v.label}
                            </div>
                            <div className="text-[10px] font-medium" style={{ color: active ? THEME.accent : '#6B7280' }}>
                              {v.desc}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!uploading && (
              <div className="px-6 py-4 border-t border-line flex gap-2">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile}
                  className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold transition-all hover:-translate-y-px disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: THEME.gradient, boxShadow: `0 4px 12px ${THEME.accentShadow}` }}
                >
                  ⬆️ 업로드 시작
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ 수정 모달 ============ */}
      {showEditModal && selectedLesson && (
        <div
          onClick={() => setShowEditModal(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl w-[560px] max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
          >
            <div className="px-6 py-5" style={{ background: THEME.gradient }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-extrabold text-white">✏️ 강의 정보 수정</div>
                  <div className="text-[12px] text-white/80 mt-0.5">영상 파일은 변경되지 않아요</div>
                </div>
                <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-white hover:bg-white/20">✕</button>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
                <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">📁 원본 파일</div>
                <div className="text-[13px] font-bold text-ink">{selectedLesson.fileName}</div>
                <div className="text-[11px] font-medium text-ink-muted">{selectedLesson.fileSize} · {selectedLesson.resolution}</div>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[11px] font-bold text-ink-secondary mb-1 block">제목 *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-ink-secondary mb-1 block">과목 *</label>
                    <select
                      value={form.subject}
                      onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none cursor-pointer bg-white"
                    >
                      {SUBJECTS.map(s => (
                        <option key={s.key} value={s.key}>{s.icon} {s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-ink-secondary mb-1 block">대상 *</label>
                    <select
                      value={form.target}
                      onChange={e => setForm(prev => ({ ...prev, target: e.target.value }))}
                      className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none cursor-pointer bg-white"
                    >
                      {TARGET_GRADES.map(t => (
                        <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-ink-secondary mb-1 block">강사 *</label>
                  <input
                    value={form.teacher}
                    onChange={e => setForm(prev => ({ ...prev, teacher: e.target.value }))}
                    className="w-full h-10 px-3 border border-line rounded-lg text-[13px] font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-ink-secondary mb-1 block">설명</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full border border-line rounded-lg px-3 py-2.5 text-[13px] font-medium outline-none resize-y"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-line flex gap-2">
              <button onClick={() => setShowEditModal(false)} className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50">
                취소
              </button>
              <button onClick={handleEdit} className="flex-1 h-11 text-white rounded-lg text-[13px] font-bold" style={{ background: THEME.gradient }}>
                💾 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 미리보기 모달 ============ */}
      {showPreviewModal && selectedLesson && (
        <div
          onClick={() => setShowPreviewModal(false)}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(6px)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl w-[800px] max-w-full max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
          >
            <div className="px-6 py-4 border-b border-line flex items-center justify-between">
              <div>
                <div className="text-[16px] font-extrabold text-ink">🎬 {selectedLesson.title}</div>
                <div className="text-[11px] font-medium text-ink-muted">👨‍🏫 {selectedLesson.teacher}</div>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:bg-gray-100">✕</button>
            </div>

            {/* 영상 플레이어 영역 (Mock) */}
            <div
              className="relative flex items-center justify-center text-white"
              style={{
                paddingBottom: '56.25%',
                background: 'linear-gradient(135deg, #1a1a1a, #2a2a2a)',
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
                <div className="text-6xl">🎬</div>
                <div className="text-[14px] font-extrabold">영상 플레이어 영역</div>
                <div className="text-[11px] font-medium text-white/60 text-center leading-[1.6]">
                  💡 실제 서비스에서는 여기에 영상이 재생돼요<br />
                  📁 파일: {selectedLesson.fileName}<br />
                  💾 {selectedLesson.fileSize} · {selectedLesson.resolution}
                </div>
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl mt-2 cursor-pointer hover:bg-white/30 transition-colors">
                  ▶️
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">⏱️ 재생 시간</div>
                  <div className="text-[14px] font-extrabold text-ink">{selectedLesson.duration}</div>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">💾 파일 크기</div>
                  <div className="text-[14px] font-extrabold text-ink">{selectedLesson.fileSize}</div>
                </div>
              </div>

              {selectedLesson.description && (
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">📝 설명</div>
                  <div className="text-[13px] font-medium text-ink leading-[1.6]">
                    {selectedLesson.description}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}