// src/constants/essayRounds.ts
// 자소서 4차수 정의 — 학생 마법사 / 어드민 피드백란 / AI 프롬프트가 모두 이 파일을 본다.
// 원칙: 차수마다 "보는 대상"이 다르다. 소재 → 근거 → 표현 → 일관성.
//       앞 차수에서 끝낸 것은 뒤에서 다시 건드리지 않는다.

export type RoundScope = "section" | "whole";

export interface EssayRoundDef {
  round: 1 | 2 | 3 | 4;
  /** 화면에 뜨는 이름 */
  title: string;
  /** 한 줄 요약 (탭·배지용) */
  short: string;
  /** 이번 차수에 하는 일 */
  goal: string;
  /** 이번 차수에 하지 않는 일 — AI·선생님이 넘지 말아야 할 선 */
  notDoing: string;
  /** 피드백의 성격 (첨삭이냐 판정이냐 질문이냐) */
  feedbackStyle: string;
  /** 통과 기준 — 다음 차수로 넘어가도 되는지 판단 */
  passCriteria: string[];
  /** section = 문항 안에서 본다 / whole = 문항 사이를 본다 */
  scope: RoundScope;
}

export const ESSAY_ROUNDS: EssayRoundDef[] = [
  {
    round: 1,
    title: "소재가 맞나 — 직업군·컨셉 정하기",
    short: "소재 확정",
    goal:
      "문항별로 어떤 경험을 쓸지만 확정한다. 학생의 직업군·컨셉을 잡고, 그 컨셉에 맞는 경험 하나를 문항마다 고른다.",
    notDoing:
      "문장은 아예 고치지 않는다. 표현·분량·맞춤법을 지적하지 않는다.",
    feedbackStyle:
      "첨삭이 아니라 판정이다. 소재 하나하나에 대해 '이 소재로 간다 / 바꾼다 / 둘 중 고민' 셋 중 하나로 답한다. 바꾼다면 왜 약한지와 대안 방향을 한 줄로 준다.",
    passCriteria: ["문항마다 쓸 경험이 하나씩 확정됐는가"],
    scope: "section",
  },
  {
    round: 2,
    title: "근거가 있나",
    short: "근거 채우기",
    goal:
      "확정된 소재에 장면·행동·변화를 채운다. 무엇을 했고, 그래서 무엇이 달라졌는지가 드러나게 한다.",
    notDoing:
      "소재를 다시 바꾸지 않는다. 문장을 대신 써주지 않는다. 표현·분량은 아직 보지 않는다.",
    feedbackStyle:
      "문장을 고쳐주지 말고 되묻는 질문으로 준다. 예: '그때 네가 실제로 한 행동이 뭐야?', '그 전과 후에 뭐가 달라졌어?' 학생이 답하면 그 답이 곧 문장 재료가 된다.",
    passCriteria: [
      "추상 서술 없이 각 문단에 장면이 하나씩 있는가",
      "'느꼈다·배웠다'로 끝나지 않고 행동과 변화가 있는가",
    ],
    scope: "section",
  },
  {
    round: 3,
    title: "읽히나, 그리고 면접에서 버티나",
    short: "표현·면접 대비",
    goal:
      "표현·분량·중복 표현을 정리한다. 여기서 처음으로 문장을 손댄다. 그리고 꼬리질문을 뽑아 붙여 면접 준비로 넘긴다.",
    notDoing:
      "소재와 경험을 새로 바꾸지 않는다. 학생이 쓰지 않은 내용을 새로 만들어 넣지 않는다.",
    feedbackStyle:
      "이 단계에서만 문장 단위 첨삭이 허용된다. 다만 대신 써주는 게 아니라 '이 문장은 같은 말이 두 번 나온다' 식으로 짚어준다. 마지막에 꼬리질문 3개를 뽑는다.",
    passCriteria: [
      "글자수를 충족했는가",
      "금지 기재(수상·점수·교외 활동 등)가 없는가",
      "꼬리질문 3개에 답할 수 있는가",
    ],
    scope: "section",
  },
  {
    round: 4,
    title: "일관성 있나",
    short: "일관성 점검",
    goal:
      "문항을 전부 이어서 읽고 문항 사이의 일관성을 본다. 세 문항의 학생이 같은 사람으로 읽히는지, 1차에서 정한 컨셉·직업군과 끝까지 맞는지 확인한다.",
    notDoing:
      "문항 하나만 떼어 보지 않는다. 이 단계에서 소재를 갈아엎지 않는다.",
    feedbackStyle:
      "문항별 첨삭이 아니라 문항 간 대조다. 서로 어긋나는 지점을 짚어 어느 쪽에 맞출지 고르게 한다.",
    passCriteria: [
      "세 문항의 학생이 같은 사람으로 읽히는가",
      "1차에서 정한 컨셉·직업군과 끝까지 맞는가",
      "같은 경험이 여러 문항에 중복되지 않는가",
    ],
    scope: "whole",
  },
];

export const MAX_ESSAY_ROUND = 4;

/** 차수 정의 가져오기 (범위를 벗어나면 마지막 차수로) */
export function getRoundDef(round: number): EssayRoundDef {
  return (
    ESSAY_ROUNDS.find((r) => r.round === round) ??
    ESSAY_ROUNDS[ESSAY_ROUNDS.length - 1]
  );
}

/** 이번 차수가 문항 사이를 보는 단계인가 (4차) */
export function isWholeScope(round: number): boolean {
  return getRoundDef(round).scope === "whole";
}