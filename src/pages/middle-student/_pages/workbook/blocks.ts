// src/pages/middle-student/_pages/workbook/blocks.ts
// mission_workbook.blocks 에 저장되는 워크북 원고의 스키마.
// 주차 하나(mission_key 하나) = Workbook 하나 = page 12개.

/* ------------------------------------------------------------------ */
/* 입력 필드                                                          */
/* ------------------------------------------------------------------ */

/**
 * 답안 저장 키. mission_workbook_answer.answers 의 최상위 키가 되므로
 * 주차 안에서 유일해야 하고, 한 번 배포한 뒤에는 바꾸지 않는다.
 * 규칙: p{페이지번호}-{짧은이름}  예) 'p3-exp-1', 'p5-score-1-direct'
 */
export type FieldId = string;

export type FieldKind =
  | 'text'      // 한 줄 입력
  | 'textarea'  // 여러 줄 입력 (rows 로 높이 지정)
  | 'number'    // 숫자 (시간·횟수·점수)
  | 'check'     // 단독 체크박스
  | 'stars'     // ☆ 5개
  | 'hash';     // # 붙는 짧은 키워드 칸

export interface Field {
  id: FieldId;
  kind: FieldKind;
  label?: string;       // 칸 위에 붙는 설명
  placeholder?: string;
  suffix?: string;      // 칸 뒤에 붙는 단위 표기. 예) '시간', '회', '/5'
  rows?: number;        // kind='textarea' 일 때만
  max?: number;         // kind='number' | 'stars' 일 때 상한
}

/* ------------------------------------------------------------------ */
/* 블록 12종                                                          */
/* ------------------------------------------------------------------ */

/** 1. 표지 */
export interface CoverBlock {
  type: 'cover';
  badge: string;        // 'B-KURS · 중1 DISCOVER'
  week: string;         // '1M · 1주차'
  subject?: string;     // '국어'
  title: string;        // '나를 보여주는 경험 5개 찾기'
  question?: string;    // 오늘의 질문
  quote: string;        // 오늘의 한 줄
  outputTitle: string;  // 'MY EXPERIENCE 5'
  outputDesc?: string;
  askName?: boolean;    // 이름·수업 날짜 입력칸 표시
}

/** 2. 안내문 */
export interface NoticeBlock {
  type: 'notice';
  variant: 'plain' | 'quote' | 'point';
  heading?: string;
  lines: string[];      // 한 줄이 한 문단
}

/** 3. 진행표 (순서 · 시간 · 활동) */
export interface AgendaBlock {
  type: 'agenda';
  heading?: string;
  rows: { time: string; label: string }[];
}

/** 4. 입력 나열 */
export interface FieldsBlock {
  type: 'fields';
  layout: 'stack' | 'numbered' | 'inline' | 'hash';
  heading?: string;
  note?: string;
  fields: Field[];
}

/** 5. 표 입력 — 셀이 문자열이면 고정 텍스트, Field 면 입력칸 */
export interface GridBlock {
  type: 'grid';
  heading?: string;
  note?: string;
  columns: string[];
  rows: (string | Field)[][];
  total?: Field;        // 합계 칸 (직접 입력)
}

/** 6. 채점 격자 — 항목 × 기준, 총점 자동 합산 */
export interface ScoreBlock {
  type: 'score';
  heading?: string;
  criteria: string[];           // ['직접함','구체성','내 선택','다음 행동']
  max: number;                  // 기준 하나당 만점 (보통 5)
  rows: { label: string; ids: FieldId[] }[];  // ids 길이 = criteria 길이
  showTotal?: boolean;
}

/** 7. 반복 카드 — 같은 문항 묶음을 N장 */
export interface CardsBlock {
  type: 'cards';
  heading?: string;
  cardLabel: string;            // 'CARD' | 'GROUP' | 'TOP'
  cards: { title?: string; fields: Field[] }[];
}

/** 8. 선택지 — 체크박스·영어 워드칩 공용 */
export interface ChoiceBlock {
  type: 'choice';
  heading?: string;
  note?: string;
  mode: 'single' | 'multi';
  id: FieldId;                  // 선택값 저장 키
  options: string[];
  pick?: number;                // '2개 고르기' 안내용
  chip?: boolean;               // true면 칩 스타일
  other?: FieldId;              // 'other:' 직접 입력칸
}

/** 9. 빈칸 문장 — parts 를 이어 붙이고 Field 자리에 입력칸 */
export interface SentenceBlock {
  type: 'sentence';
  heading?: string;
  note?: string;
  numbered?: boolean;
  sentences: (string | Field)[][];
}

/** 10. FINAL OUTPUT 카드 */
export interface OutputBlock {
  type: 'output';
  title: string;                // 'MY LIFE DATA CARD'
  groups: { heading?: string; fields: Field[] }[];
}

/** 11. SELF CHECK */
export interface SelfCheckBlock {
  type: 'selfcheck';
  heading?: string;             // 'SELF CHECK' | 'MY RECORD'
  items: { id: FieldId; label: string }[];
}

/** 12. 다음 주 예고 */
export interface NextWeekBlock {
  type: 'nextweek';
  heading?: string;             // '다음 주 예고' | '다음 달 질문'
  subject?: string;             // '수학'
  title: string;
  quote?: string;
  finalList?: string[];         // 4주차 '1개월 FINAL' 목록
}

export type WorkbookBlock =
  | CoverBlock
  | NoticeBlock
  | AgendaBlock
  | FieldsBlock
  | GridBlock
  | ScoreBlock
  | CardsBlock
  | ChoiceBlock
  | SentenceBlock
  | OutputBlock
  | SelfCheckBlock
  | NextWeekBlock;

/* ------------------------------------------------------------------ */
/* 페이지 / 문서                                                      */
/* ------------------------------------------------------------------ */

export interface WorkbookPage {
  no: number;           // 1~12
  title: string;        // '활동 1 · 최근 1년 경험 10개 꺼내기'
  step?: string;        // 상단 단계 표시용 짧은 이름. 없으면 title 사용
  blocks: WorkbookBlock[];
}

/** mission_workbook.blocks 에 그대로 들어가는 형태 */
export interface WorkbookDoc {
  version: 1;
  pages: WorkbookPage[];
}

/** mission_workbook_answer.answers 에 그대로 들어가는 형태 */
export type WorkbookAnswers = Record<FieldId, string | number | boolean | string[]>;

/* ------------------------------------------------------------------ */
/* 유틸                                                               */
/* ------------------------------------------------------------------ */

/** 블록에서 입력 필드만 뽑아낸다. 진행률·제출 검사에 사용 */
export function collectFields(block: WorkbookBlock): Field[] {
  switch (block.type) {
    case 'fields':
      return block.fields;
    case 'grid':
      return [
        ...block.rows.flat().filter((c): c is Field => typeof c !== 'string'),
        ...(block.total ? [block.total] : []),
      ];
    case 'score':
      return block.rows.flatMap((r) =>
        r.ids.map((id) => ({ id, kind: 'number' as FieldKind, max: block.max })),
      );
    case 'cards':
      return block.cards.flatMap((c) => c.fields);
    case 'choice':
      return [
        { id: block.id, kind: 'text' as FieldKind },
        ...(block.other ? [{ id: block.other, kind: 'text' as FieldKind }] : []),
      ];
    case 'sentence':
      return block.sentences.flat().filter((p): p is Field => typeof p !== 'string');
    case 'output':
      return block.groups.flatMap((g) => g.fields);
    case 'selfcheck':
      return block.items.map((i) => ({ id: i.id, kind: 'check' as FieldKind }));
    default:
      return [];
  }
}

/** 페이지 단위 작성률 (0~1) */
export function pageProgress(page: WorkbookPage, answers: WorkbookAnswers): number {
  const fields = page.blocks.flatMap(collectFields);
  if (fields.length === 0) return 1;
  const filled = fields.filter((f) => {
    const v = answers[f.id];
    if (v === undefined || v === null) return false;
    if (typeof v === 'string') return v.trim() !== '';
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'boolean') return v;
    return true;
  }).length;
  return filled / fields.length;
}