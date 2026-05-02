import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import type {
  PassageInterviewInsert,
  Grade,
} from '@/lib/types/questions'

// ============================================
// 엑셀 → JSON 헬퍼
// ============================================
async function parseExcel<T = any>(file: File): Promise<T[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheet]
  return XLSX.utils.sheet_to_json<T>(sheet, { defval: null })
}

function extractFormulaId(value: any): number | null {
  if (value == null || value === '') return null
  const num = Number(value)
  if (isNaN(num) || num < 1 || num > 67) return null
  return num
}

function parseSchoolYear(value: any): 1 | 2 | 3 {
  if (value == null || value === '') return 3
  if (typeof value === 'number') {
    if (value >= 1 && value <= 3) return value as 1 | 2 | 3
    return 3
  }
  const str = String(value)
  const match = str.match(/(\d)/)
  if (!match) return 3
  const num = Number(match[1])
  if (num >= 1 && num <= 3) return num as 1 | 2 | 3
  return 3
}

function safeNumber(value: any, defaultValue: number = 0): number {
  if (value == null || value === '') return defaultValue
  if (typeof value === 'number') return value
  const str = String(value).trim()
  const directNum = Number(str)
  if (!isNaN(directNum)) return directNum
  const match = str.match(/(\d+)/)
  if (match) return Number(match[1])
  return defaultValue
}

// ============================================
// 1️⃣ 기출문제 업로드 (기존 그대로)
// ============================================
interface PastQuestionsUploadInput {
  grade: Grade
  excelFile: File
}

export function useUploadPastQuestions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ grade, excelFile }: PastQuestionsUploadInput) => {
      const rows = await parseExcel<any>(excelFile)

      if (grade === 'high') {
        const inserts = rows
          .filter(r => r['질문'] || r['질문내용'])
          .map(r => ({
            university: r['대학'] || r['학교'] || r['대학교'] || '',
            department: r['학과'] || r['학과/계열'] || r['학과명'] || '',
            admission_type: r['전형'] || null,
            question: r['질문'] || r['질문내용'] || '',
            formula_id: extractFormulaId(
              r['유형'] || r['공식번호'] || r['유형(공식번호)']
            ),
          }))
          .filter(r => r.university && r.department && r.question)

        if (inserts.length === 0) {
          throw new Error('엑셀에서 유효한 데이터를 찾지 못했어요. 컬럼명: 대학/학과/전형/질문/유형')
        }

        const { data, error } = await supabase
          .from('high_questions')
          .insert(inserts)
          .select()

        if (error) throw error
        return data
      } else {
        const inserts = rows
          .filter(r => r['질문'] || r['질문내용'])
          .map(r => ({
            school_name: r['학교'] || r['학교명'] || '',
            school_type: r['학교유형'] || null,
            question_type: r['질문유형'] || null,
            question: r['질문'] || r['질문내용'] || '',
            answer_guide: r['답변가이드'] || r['가이드'] || null,
            difficulty: r['난이도'] ? Number(r['난이도']) : null,
            formula_id: extractFormulaId(
              r['유형'] || r['공식번호'] || r['유형(공식번호)']
            ),
          }))
          .filter(r => r.school_name && r.question)

        if (inserts.length === 0) {
          throw new Error('엑셀에서 유효한 데이터를 찾지 못했어요. 컬럼명: 학교/질문/유형')
        }

        const { data, error } = await supabase
          .from('middle_questions')
          .insert(inserts)
          .select()

        if (error) throw error
        return data
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['master-past-questions', variables.grade],
      })
    },
  })
}

// ============================================
// 2️⃣ 전공질문 업로드 (마스터 + 학생 시스템 양쪽 INSERT)
// ============================================
interface MajorQuestionsUploadInput {
  grade: Grade
  excelFile: File
}

// 정답 변환: 1~5 → A~E
function convertAnswer(value: any): string | null {
  if (value == null || value === '') return null
  const str = String(value).trim()
  if (!str) return null

  if (/^[A-E]$/i.test(str)) return str.toUpperCase()

  const num = Number(str)
  if (!isNaN(num) && num >= 1 && num <= 5) {
    return ['A', 'B', 'C', 'D', 'E'][num - 1]
  }

  return str
}

function detectQuestionType(row: any): 'objective' | 'subjective' {
  const choice1 = row['선택지1']
  if (choice1 && String(choice1).trim()) return 'objective'

  const type = String(row['질문유형'] || '').trim()
  if (type === '객관식') return 'objective'
  if (type === '주관식') return 'subjective'

  return 'subjective'
}

export function useUploadMajorQuestions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ grade, excelFile }: MajorQuestionsUploadInput) => {
      const rows = await parseExcel<any>(excelFile)

      // 1. 엑셀 행 정리 (마스터 + 학생 양쪽 데이터 동시 보관)
      const cleanRows = rows
        .filter(r => r['질문'])
        .map(r => {
          const schoolYear = parseSchoolYear(r['학년'])
          const departmentName = String(r['학과명'] || '').trim()
          const masterCode = String(r['마스터코드'] || '').trim()
          const departmentCode = String(r['학과코드'] || '').trim()
          const totalDays = safeNumber(r['총일수'], 0)
          const day = safeNumber(r['day'] || r['Day'] || r['DAY'], 1)
          const seq = safeNumber(r['seq'] || r['Seq'] || r['SEQ'] || r['순서'], 1)
          const questionType = detectQuestionType(r)
          const questionText = String(r['질문'] || '').trim()
          const rawAnswer = r['정답'] || r['모범답안'] || r['정답·모범답안'] || r['정답/모범답안']

          return {
            // ── 공통 ──
            school_year: schoolYear,
            department_name: departmentName,
            master_code: masterCode,
            department_code: departmentCode,
            total_days: totalDays,
            day,
            seq,
            question_text: questionText,
            question_type: questionType,
            explanation: r['해설'] ? String(r['해설']).trim() : null,
            // ── 마스터(major_questions)용 ──
            mq_question_type_code: r['질문유형코드'] ? String(r['질문유형코드']).trim() : null,
            mq_question_type: r['질문유형'] ? String(r['질문유형']).trim() : null,
            mq_choice_1: r['선택지1'] ? String(r['선택지1']).trim() : null,
            mq_choice_2: r['선택지2'] ? String(r['선택지2']).trim() : null,
            mq_choice_3: r['선택지3'] ? String(r['선택지3']).trim() : null,
            mq_choice_4: r['선택지4'] ? String(r['선택지4']).trim() : null,
            mq_choice_5: r['선택지5'] ? String(r['선택지5']).trim() : null,
            mq_answer: rawAnswer != null ? String(rawAnswer).trim() : null,
            // ── 학생(high_major_question)용 ──
            choice_a: r['선택지1'] ? String(r['선택지1']).trim() : null,
            choice_b: r['선택지2'] ? String(r['선택지2']).trim() : null,
            choice_c: r['선택지3'] ? String(r['선택지3']).trim() : null,
            choice_d: r['선택지4'] ? String(r['선택지4']).trim() : null,
            choice_e: r['선택지5'] ? String(r['선택지5']).trim() : null,
            correct_answer: convertAnswer(rawAnswer),
            difficulty: '보통',
          }
        })
        .filter(r => r.department_name && r.question_text && r.master_code)

      if (cleanRows.length === 0) {
        throw new Error(
          '엑셀에서 유효한 데이터를 찾지 못했어요.\n' +
          '필수 컬럼: 학과명, 마스터코드, 질문\n' +
          '(마스터코드는 학과 식별자로 반드시 필요)'
        )
      }

      // ─────────────────────────────────────────
      // ✅ 2-A. 마스터 측 (major_questions) INSERT
      // ─────────────────────────────────────────
      const { data: { user } } = await supabase.auth.getUser()
      const createdBy = user?.id ?? null

      const masterInserts = cleanRows.map(r => ({
        grade, // 'high' | 'middle'
        school_year: r.school_year,
        department_code: r.department_code,
        department_name: r.department_name,
        master_code: r.master_code,
        total_days: r.total_days,
        question_type_code: r.mq_question_type_code,
        question_type: r.mq_question_type,
        day: r.day,
        seq: r.seq,
        question: r.question_text,
        choice_1: r.mq_choice_1,
        choice_2: r.mq_choice_2,
        choice_3: r.mq_choice_3,
        choice_4: r.mq_choice_4,
        choice_5: r.mq_choice_5,
        answer: r.mq_answer,
        explanation: r.explanation,
        created_by: createdBy,
      }))

      // master_code 단위로 기존 데이터 삭제 후 재INSERT (덮어쓰기 정책)
      const masterCodes = Array.from(new Set(cleanRows.map(r => r.master_code)))
      if (masterCodes.length > 0) {
        const { error: delMqErr } = await supabase
          .from('major_questions')
          .delete()
          .in('master_code', masterCodes)
        if (delMqErr) {
          throw new Error(`마스터 측 기존 데이터 정리 실패: ${delMqErr.message}`)
        }
      }

      const { error: mqErr } = await supabase
        .from('major_questions')
        .insert(masterInserts)
      if (mqErr) {
        throw new Error(`마스터 측 INSERT 실패: ${mqErr.message}`)
      }

      // ─────────────────────────────────────────
      // ✅ 2-B. 학생 측 (high_major_seed/chapter/question) INSERT
      // ─────────────────────────────────────────

      // 학과별로 그룹핑 (department_name × school_year)
      const departmentMap = new Map<string, typeof cleanRows>()
      cleanRows.forEach(r => {
        const key = `${r.department_name}__${r.school_year}`
        if (!departmentMap.has(key)) departmentMap.set(key, [])
        departmentMap.get(key)!.push(r)
      })

      let totalInserted = 0
      const errors: string[] = []

      for (const [_key, deptRows] of departmentMap.entries()) {
        const sample = deptRows[0]
        const deptName = sample.department_name
        const schoolYear = sample.school_year

        try {
          // 학과(seed) 가져오거나 생성
          let majorId: string

          const { data: existingSeed } = await supabase
            .from('high_major_seed')
            .select('id')
            .eq('name', deptName)
            .maybeSingle()

          if (existingSeed) {
            majorId = existingSeed.id
          } else {
            const { data: newSeed, error: seedError } = await supabase
              .from('high_major_seed')
              .insert({
                name: deptName,
                description: `${deptName} 전공질문`,
                is_active: true,
              })
              .select('id')
              .single()

            if (seedError) throw new Error(`학과 생성 실패: ${seedError.message}`)
            majorId = newSeed.id
          }

          // day별로 그룹핑 → 챕터 만들기
          const dayMap = new Map<number, typeof deptRows>()
          deptRows.forEach(r => {
            if (!dayMap.has(r.day)) dayMap.set(r.day, [])
            dayMap.get(r.day)!.push(r)
          })

          for (const [day, dayRows] of dayMap.entries()) {
            // 챕터 가져오거나 생성
            let chapterId: string

            const { data: existingChapter } = await supabase
              .from('high_major_chapter')
              .select('id')
              .eq('major_id', majorId)
              .eq('grade', schoolYear)
              .eq('chapter_no', day)
              .maybeSingle()

            if (existingChapter) {
              chapterId = existingChapter.id

              // 기존 질문 삭제 (덮어쓰기)
              await supabase
                .from('high_major_question')
                .delete()
                .eq('chapter_id', chapterId)
            } else {
              const { data: newChapter, error: chapterError } = await supabase
                .from('high_major_chapter')
                .insert({
                  major_id: majorId,
                  grade: schoolYear,
                  chapter_no: day,
                  title: `Day ${day}`,
                  description: `${deptName} ${schoolYear}학년 Day ${day}`,
                  is_active: true,
                })
                .select('id')
                .single()

              if (chapterError) throw new Error(`챕터 생성 실패: ${chapterError.message}`)
              chapterId = newChapter.id
            }

            // 질문들 INSERT
            const questionInserts = dayRows.map(r => ({
              chapter_id: chapterId,
              question_type: r.question_type,
              question_text: r.question_text,
              choice_a: r.question_type === 'objective' ? r.choice_a : null,
              choice_b: r.question_type === 'objective' ? r.choice_b : null,
              choice_c: r.question_type === 'objective' ? r.choice_c : null,
              choice_d: r.question_type === 'objective' ? r.choice_d : null,
              choice_e: r.question_type === 'objective' ? r.choice_e : null,
              correct_answer: r.correct_answer,
              explanation: r.explanation,
              difficulty: r.difficulty,
              is_active: true,
            }))

            const { error: qError } = await supabase
              .from('high_major_question')
              .insert(questionInserts)

            if (qError) throw new Error(`질문 INSERT 실패 (${deptName} Day ${day}): ${qError.message}`)
            totalInserted += questionInserts.length
          }
        } catch (e: any) {
          errors.push(`[${deptName} ${schoolYear}학년] ${e.message}`)
        }
      }

      if (errors.length > 0 && totalInserted === 0) {
        throw new Error(errors.join('\n'))
      }

      return {
        length: totalInserted,
        inserted: totalInserted,
        masterRows: masterInserts.length,
        departments: departmentMap.size,
        errors: errors.length > 0 ? errors : undefined,
      }
    },
    onSuccess: () => {
      // 마스터 측 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['master-major-departments'] })
      queryClient.invalidateQueries({ queryKey: ['master-major-questions'] })
      // 학생 측 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ['major-seeds'] })
      queryClient.invalidateQueries({ queryKey: ['major-chapters'] })
      queryClient.invalidateQueries({ queryKey: ['chapter-questions'] })
      queryClient.invalidateQueries({ queryKey: ['active-majors-for-mockexam'] })
    },
  })
}

// ============================================
// 3️⃣ 제시문면접 업로드 (기존 그대로)
// ============================================
interface PassageInterviewsUploadInput {
  grade: Grade
  excelFile: File
  imageFiles: File[]
}

export function useUploadPassageInterviews() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      grade,
      excelFile,
      imageFiles,
    }: PassageInterviewsUploadInput) => {
      const rows = await parseExcel<any>(excelFile)

      const inserts: PassageInterviewInsert[] = rows
        .filter(r => r['원질문'])
        .map(r => ({
          grade,
          school_code: r['학교코드'] || '',
          school_name: r['학교명'] || '',
          school_order: Number(r['학교순서'] || 0),
          track_code: grade === 'high' ? (r['계열코드'] || null) : null,
          track_name: grade === 'high' ? (r['계열명'] || null) : null,
          track_detail_code: grade === 'high' ? (r['계열세부코드'] || null) : null,
          total_days: Number(r['총일수'] || 0),
          set_code: r['세트코드'] || '',
          year: Number(r['연도'] || new Date().getFullYear()),
          round: Number(r['회차'] || 1),
          round_order: Number(r['회차순서'] || 1),
          question_code: r['질문코드'] || '',
          question_order: Number(r['질문순서'] || 1),
          original_question: r['원질문'] || '',
          sub_question: r['세부질문'] || null,
          passage_count: Number(r['제시문개수'] || 0),
          image_count: Number(r['문항참고이미지개수'] || 0),
        }))

      if (inserts.length === 0) {
        throw new Error('엑셀에서 유효한 데이터를 찾지 못했어요.')
      }

      const { data: insertedPassages, error: insertError } = await supabase
        .from('passage_interviews')
        .upsert(inserts, {
          onConflict: 'set_code,question_code',
          ignoreDuplicates: false,
        })
        .select()

      if (insertError) throw insertError

      if (imageFiles.length > 0 && insertedPassages) {
        const imageInserts: any[] = []

        for (const file of imageFiles) {
          const fileName = file.name
          const matchingPassage = insertedPassages.find(p =>
            fileName.includes(p.set_code) || fileName.includes(p.question_code),
          )

          if (!matchingPassage) {
            console.warn(`이미지와 매칭되는 제시문 없음: ${fileName}`)
            continue
          }

          const safeFileName = `${matchingPassage.set_code}/${Date.now()}_${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('passage-images')
            .upload(safeFileName, file, {
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadError) {
            console.error('이미지 업로드 실패:', uploadError)
            continue
          }

          const { data: urlData } = supabase.storage
            .from('passage-images')
            .getPublicUrl(safeFileName)

          imageInserts.push({
            passage_id: matchingPassage.id,
            image_type: fileName.toLowerCase().includes('passage') ? 'passage' : 'reference',
            image_url: urlData.publicUrl,
            image_order: imageInserts.filter(i => i.passage_id === matchingPassage.id).length + 1,
            file_name: fileName,
          })
        }

        if (imageInserts.length > 0) {
          const { error: imgError } = await supabase
            .from('passage_images')
            .insert(imageInserts)

          if (imgError) throw imgError
        }
      }

      return {
        passages: insertedPassages,
        imageCount: imageFiles.length,
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['master-passage-interviews', variables.grade],
      })
    },
  })
}