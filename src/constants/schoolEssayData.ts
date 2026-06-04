// src/constants/schoolEssayData.ts
// 자소서 분석용 학교 데이터 — 엑셀 2개 통합 (최신본)
//   ① 학교 특색 (인재상·평가요소·특색프로그램·강조가치) — 고등_학교데이터.xlsx (15개)
//   ② 자소서 문항·배점 — 자기소개서_고등학교별_점수.xlsx (외고7 + 과학고20 = 27개)
//
// ※ 두 엑셀의 학교 목록이 다름:
//   - 완전체(특색+문항 둘 다): 5개 — 명덕외고·한성·세종·진산·부산과학고
//   - 문항만: 22개 (특색 미입력)  / 특색만: 10개 (문항 미입력)
//   hasProfile / sections 유무로 분석 시 자동 분기됨.

export type SchoolType = "foreign" | "science";
export type ScoringMode = "official" | "platform";

export interface SchoolProfile {
  ideal_student: string;
  eval_factors: string;
  programs: string;
  core_values: string;
  notes: string;
}
export interface RubricSection {
  key: string;
  label: string;
  max?: number | null;
  charLimit?: number | null;
  question: string;
}
export interface SchoolEssayData {
  school: string;
  type: SchoolType;
  hasProfile: boolean;
  profile: SchoolProfile | null;
  scoringMode: ScoringMode;
  total: number;
  sections: RubricSection[];
}

export const PLATFORM_RUBRIC = [
  {
    "label": "수학 탐구력",
    "max": 25,
    "point": "수학적 호기심, 탐구 주제의 적절성, 사고 과정, 문제해결 방식, 성장"
  },
  {
    "label": "과학 탐구력",
    "max": 25,
    "point": "가설 설정, 관찰·실험·자료분석, 시행착오, 검증 과정, 성장"
  },
  {
    "label": "자기주도성/문제해결",
    "max": 20,
    "point": "목표 설정, 계획, 실행, 결과 평가, 막힌 지점에서의 개선"
  },
  {
    "label": "지원동기·진로계획",
    "max": 15,
    "point": "학교 특성과 본인 관심 분야의 연결, 입학 후 계획, 진로 방향성"
  },
  {
    "label": "인성·협업",
    "max": 15,
    "point": "배려, 협력, 갈등관리, 규칙준수, 공동탐구 태도"
  }
] as { label: string; max: number; point: string }[];

export const SCHOOL_ESSAY_DATA: SchoolEssayData[] = [
  {
    "school": "대원외국어고등학교",
    "type": "foreign",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "official",
    "total": 40,
    "sections": [
      {
        "key": "selfStudy",
        "label": "자기주도학습 과정",
        "max": 20,
        "question": "학습을 위해 주도적으로 수행한 목표 설정, 계획, 학습 그리고 그 결과 평가까지의 전 과정(교육과정에서 진로체험 및 동아리 활동, 꿈과 끼를 살리기 위한 활동 및 경험 등을 포함)과 그 과정에서 느낀점을 구체적으로 기술하십시오."
      },
      {
        "key": "reason",
        "label": "지원동기 및 진로계획",
        "max": 10,
        "question": "학교특성과 연계해 지원학교에 관심을 갖게 된 동기, 입학 후 본인의 꿈과 끼를 살리기 위한 활동 계획 및 졸업 후의 본인의 꿈을 이루기 위한 진로 계획에 관하여 구체적으로 기술하십시오."
      },
      {
        "key": "character",
        "label": "인성 영역",
        "max": 10,
        "question": "자기소개서, 학교생활기록부에 기재된 핵심인성요소(핵심인성요소는 봉사체험활동을 포함한 배려, 나눔, 협력, 타인 존중, 규칙준수 등 학생의 인성을 나타낼 수 있는 다양한 요소를 의미)에 대한 중학교 활동 실적 및 중학교 활동을 통해 배우고 느낀 점을 구체적으로 기술하십시오."
      }
    ]
  },
  {
    "school": "대일외국어고등학교",
    "type": "foreign",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "official",
    "total": 40,
    "sections": [
      {
        "key": "selfStudy",
        "label": "자기주도학습 과정",
        "max": 20,
        "question": "본인이 스스로 학습계획을 세우고 학습해 온 과정과 그 과정에서 느꼈던 점"
      },
      {
        "key": "reason",
        "label": "지원동기 및 진로계획",
        "max": 10,
        "question": "외국어고의 특성과 연계해 대일외고에 관심을 갖게 된 동기, 고등학교 입학 후 자기주도적으로 본인의 꿈과 끼를 살리기 위한 활동 계획 및 고등학교 졸업 후 진로계획"
      },
      {
        "key": "character",
        "label": "인성 영역",
        "max": 10,
        "question": "본인의 인성(배려, 나눔, 협력, 타인 존중, 규칙준수 등)을 나타낼 수 있는 개인적 경험 및 이를 통해 배우고 느낀 점을 구체적으로 기술하고 다음사항에 유의바랍니다."
      }
    ]
  },
  {
    "school": "명덕외국어고등학교",
    "type": "foreign",
    "hasProfile": true,
    "profile": {
      "ideal_student": "'자기 분야의 세계 1인자' / 교양인·세계인·봉사인 / 슬로건: 세계의 중심에 서기 위한 첫걸음",
      "eval_factors": "외국어 역량(전공어 심화) / 깊이 있는 독서·사유·표현(교양인) / 글로벌 소통·교류(세계인) / 역지사지·배려·봉사(봉사인) / 자기주도적 학습 / 진로 설계 역량 / 논리적·창의적 사고력",
      "programs": "전공 6개 어과(중국어·영어·독일어·프랑스어·일본어·러시아어), 세계문화축제(1·2학년 전체, 전공어 기반 문화 부스·공연), 창의적 체험활동 4영역(자율 Book Project·동아리·봉사·진로 심층탐색), 국제교류(형수중학교 등 유학생 교환·협동수업·한국학생 봉사 연계), 맞춤형 방과후학교·온라인 교수학습센터, 도서관 연계 독서활동, 명덕 인재상 프로그램(Best/Joyful/Dedicated MYUNGDUK)",
      "core_values": "교양인·세계인·봉사인 (인재상) / 자기 분야의 세계 1인자",
      "notes": "사립 외국어고(자기주도학습전형·영어내신+자소서+면접) / 서울 강서구 / 1991 설립·1992 1회 입학(누적 졸업 12,000명+) / 학과 6개 / 형수중학교 등 유학생 국제교류 / 2022 개정 선택중심 교육과정 / 기숙사 운영 / 초기 이과반(별명 명덕과학고) 운영 이력"
    },
    "scoringMode": "official",
    "total": 40,
    "sections": [
      {
        "key": "selfStudy",
        "label": "자기주도학습 과정",
        "max": 20,
        "question": "학습을 위해 주도적으로 수행한 목표 설정, 계획, 학습 그리고 그 결과 평가까지의 전 과정(교육과정에서 진로체험 및 동아리 활동, 꿈과 끼를 살리기 위한 활동 및 경험 등을 포함)과 그 과정에서 느낀점을 구체적으로 기술하십시오."
      },
      {
        "key": "reason",
        "label": "지원동기 및 진로계획",
        "max": 10,
        "question": "학교특성과 연계해 지원학교에 관심을 갖게 된 동기, 입학 후 본인의 꿈과 끼를 살리기 위한 활동 계획 및 졸업 후의 본인의 꿈을 이루기 위한 진로 계획에 관하여 구체적으로 기술하십시오."
      },
      {
        "key": "character",
        "label": "인성 영역",
        "max": 10,
        "question": "1. 활동 실적:봉사ㆍ체험활동을 포함한 배려,나눔,협력,타인 존중,규칙준수 등에 대한 중학교 활동 실적."
      }
    ]
  },
  {
    "school": "서울외국어고등학교",
    "type": "foreign",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "official",
    "total": 40,
    "sections": [
      {
        "key": "selfStudy",
        "label": "자기주도 학습과정",
        "max": 15,
        "question": "본인이 스스로 학습계획을 세우고 학습해 온 과정(교육과정에서 교과, 동아리, 진로체험, 꿈과 끼를 살리기 위한 활동 및 경험 모두 포함)과 그 과정에서 느꼈던 점을 기술하십시오"
      },
      {
        "key": "reason",
        "label": "지원동기 및 진로계획",
        "max": 15,
        "question": "외국어고의 특성과 연계해 전공어에 관심을 갖게 된 동기, 고등학교 입학 후 자기주도적으로 본인의 꿈   과 끼를 살리기 위한 활동계획 및 고등학교 졸업 후 진로계획에 관하여 구체적으로 기술하십시오."
      },
      {
        "key": "character",
        "label": "인성영역",
        "max": 10,
        "question": "학교생활기록부 행동특성 및 종합의견에 기재된 본인의 인성(배려, 나눔, 봉사, 협력, 타인존중, 갈등관리, 관계지향성, 규칙준수 등)을 나타낼 수 있는 개인적 경험 및 이를 통해 배우고 느낀 점을 구체적으로 기술하십시오."
      }
    ]
  },
  {
    "school": "이화여자외국어고등학교",
    "type": "foreign",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "official",
    "total": 40,
    "sections": [
      {
        "key": "selfStudy",
        "label": "자기주도 학습과정",
        "max": 20,
        "question": "학습을 위해 주도적으로 수행한 목표 설정, 계획, 학습 그리고 그 결과 평가까지의 전 과정(교육과정에서 진로체험 및 동아리 활동, 꿈과 끼를 살리기 위한 활동 및 경험 등을 포함)과 그 과정에서 느낀점을 구체적으로 기술하십시오."
      },
      {
        "key": "reason",
        "label": "지원동기 및 진로계획",
        "max": 10,
        "question": "학교특성과 연계해 지원학교에 관심을 갖게 된 동기, 입학 후 본인의 꿈과 끼를 살리기 위한 활동 계획 및 졸업 후의 본인의 꿈을 이루기 위한 진로 계획에 관하여 구체적으로 기술하십시오."
      },
      {
        "key": "character",
        "label": "인성영역",
        "max": 10,
        "question": "핵심인성요소에 대한 중학교 활동 실적: 자기소개서, 학교생활기록부에 기재된 핵심인성요소에 대한 중학교 활동 실적"
      }
    ]
  },
  {
    "school": "한영외국어고등학교",
    "type": "foreign",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "official",
    "total": 40,
    "sections": [
      {
        "key": "selfStudy",
        "label": "자기주도 학습과정",
        "max": 20,
        "question": "학습을 위해 주도적으로 수행한 목표 설정, 계획, 학습 그리고 그 결과 평가까지의 전 과정(교육과정에서 진로체험 및 동아리 활동, 꿈과 끼를 살리기 위한 활동 및 경험 등을 포함)과 그 과정에서 느낀점을 구체적으로 기술하십시오."
      },
      {
        "key": "reason",
        "label": "지원동기 및 진로계획",
        "max": 10,
        "question": "외국어고등학교의 특성과 연계해 본교에 관심을 갖게 된 동기와, 본교 입학 후 자기주도적으로 본인의 꿈과 끼를 살리기 위한 활동 계획 및 졸업 후 본인의 꿈을 이루기 위한 진로 계획과 실현방법에 관해 구체적으로 기술하시오."
      },
      {
        "key": "character",
        "label": "인성영역",
        "max": 10,
        "question": "봉사·체험활동을 포함한 본인의 인성(배려, 나눔, 협력, 타인 존중, 규칙준수 등)을 나타낼 수 있는 개인적 경험 및 이를 통해 배우고 느낀 점을 구체적으로 기술하시오."
      }
    ]
  },
  {
    "school": "부산외국어고등학교",
    "type": "foreign",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "official",
    "total": 40,
    "sections": [
      {
        "key": "selfStudy",
        "label": "자기주도 학습과정",
        "max": 20,
        "question": "본인이 스스로 학습계획을 세우고 학습해 온 과정과 그 과정에서 느꼈던 점, 학교 특성과 연계해 지원학교에 관심을 갖게 된 동기, 고등학교 입학 후 자기주도적으로 본인의 꿈과 끼를 살리기 위한 활동계획 및 고등학교 졸업 후\n진로계획에 관하여 구체적으로 기술하십시오."
      },
      {
        "key": "character",
        "label": "인성영역",
        "max": 20,
        "question": "본인의 인성(배려, 나눔, 협력, 타인 존중, 규칙준수 등)을 나타낼 수 있는 개인적 경험 및 이를 통해 배우고 느낀\n점을 구체적으로 기술하십시오."
      }
    ]
  },
  {
    "school": "한성과학고등학교",
    "type": "science",
    "hasProfile": true,
    "profile": {
      "ideal_student": "국가와 인류 사회 발전에 기여하는 창의적 과학 인재 / 비전: 과학 영재 교육의 요람 / 교훈: 창조(創造) / 방향 2축: 탐구능력·창의성 + 인성·리더십",
      "eval_factors": "과학적 탐구 능력 / 융합적 사고를 통한 창의성 / 자기주도적 학습·연구 역량(과제연구·R&E) / 이공계 진로 적합성 / 민주시민 의식·바른 인성 / 협력·공감 리더십 / 나눔·봉사 실천 / 독서 소양",
      "programs": "고교학점제 192학점↑(속진 2년·일반 3년), AP 교육과정(미적분·물리·화학·생물·프로그래밍)·전문교과 풍부, 융합과제연구·R&E(R&E실 운영), 창의적 체험활동 3영역(자율자치·동아리·진로), 봉사활동(지역사회·소외계층·복지시설 연계 집중 봉사, 사전교육), 동아리(정규+자율+학교 스포츠 클럽, 여민락 발표회·전탐프 8~12명 팀), 천체관측(폴라리스·플라네타리움), 한어울제·수학과학 체험전, 해외 이공계 체험·제주도 자연탐사",
      "core_values": "창조 (교훈) / 탐구능력·창의성 + 인성·리더십 / 창의적 과학 인재",
      "notes": "영재학교 아닌 과학고(자기주도학습전형·면접) / 서울 서대문구(서울권 과학고, 세종과학고와 함께) / 1992 개교 / 학교장 경영관 3축(역량·사람·관계중심) / 중장기 발전계획 3단계(2025~2036, 탐구역량·인성·첨단AI역량) / 자소서 4축(지원동기·탐구경험·인성·독서) / 기숙사 운영 / 천체관측 시설"
    },
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "sciInquiry",
        "label": "과학 탐구 경험",
        "charLimit": 800,
        "question": "지원자가 중학교 재학기간 중 과학 분야에서 크게 성장할 수 있었던 탐구 활동과 자기주도학습 경험을 구체적으로 기술하시오. ※ 주제, 동기, 과정, 결과, 배우고 느낀 점 포함"
      },
      {
        "key": "mathInquiry",
        "label": "수학 탐구 경험",
        "charLimit": 800,
        "question": "지원자가 중학교 재학기간 중 수학 분야에서 크게 성장할 수 있었던 탐구 활동과 자기주도학습 경험을 구체적으로 기술하시오. ※ 주제, 동기, 과정, 결과, 배우고 느낀 점 포함"
      },
      {
        "key": "character",
        "label": "인성",
        "charLimit": 400,
        "question": "지원자가 중학교 재학기간 중 배려, 나눔, 협력, 갈등관리, 리더십 등을 실천한 사례와 그 과정을 통해 배우고 느낀 점을 구체적으로 기술하시오."
      },
      {
        "key": "reason",
        "label": "진로탐색 및 진로계획",
        "charLimit": 400,
        "question": "지원자의 진로탐색 과정과 진로계획을 구체적으로 기술하시오."
      }
    ]
  },
  {
    "school": "세종과학고등학교",
    "type": "science",
    "hasProfile": true,
    "profile": {
      "ideal_student": "미래를 선도하는 창의적 과학인재 / 자율적 사고·창의적 탐구·공익적 봉사 / 교훈: 진리탐구·인류봉사",
      "eval_factors": "자율적 사고 / 창의적 탐구 능력 / 공익적 봉사 정신 / 창의융합적 사고력 / 문제 해결력 / 소통·협력",
      "programs": "융합과학탐구(연간 4단위, 4일 집중탐구), 융합과학탐구 멘토링, R&E(3~4명 팀, 5~12월 장기), 장영실탐구대회·장영실융합과학창의력대회, 자연탐사(5월 4일간), 인문학 포럼, 교-수-평-기 일체화",
      "core_values": "탐구, 봉사, 도전, 협력 (세종 정신)",
      "notes": "영재학교 아닌 과학고(자기주도학습전형·면접) / 서울 구로구 / 장영실 브랜드 탐구활동 / 기숙사 운영"
    },
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "reason",
        "label": "진로탐색",
        "charLimit": 400,
        "question": "지원자가 중학교 재학 기간 또는 최근 3년간 수행한 진로탐색 활동과 앞으로의 진로계획을 구체적으로 적어 주십시오."
      },
      {
        "key": "sciInquiry",
        "label": "과학 탐구 경험",
        "charLimit": 800,
        "question": "지원자가 중학교 재학 기간 또는 최근 3년간 과학 분야에서 자기주도적으로 수행한 탐구 경험을 주제, 동기, 과정, 결과, 배우고 느낀 점이 드러나도록 구체적으로 적어 주십시오."
      },
      {
        "key": "mathInquiry",
        "label": "수학 탐구 경험",
        "charLimit": 800,
        "question": "지원자가 중학교 재학 기간 또는 최근 3년간 수학 분야에서 자기주도적으로 수행한 탐구 경험을 주제, 동기, 과정, 결과, 배우고 느낀 점이 드러나도록 구체적으로 적어 주십시오."
      },
      {
        "key": "character",
        "label": "인성",
        "charLimit": 400,
        "question": "지원자가 중학교 재학 기간 또는 최근 3년간 배려, 나눔, 협력, 타인 존중, 갈등관리, 규칙준수 등을 실천한 사례와 그 과정에서 배우고 느낀 점을 적어 주십시오."
      },
      {
        "key": "reading",
        "label": "독서 경험",
        "charLimit": null,
        "question": "지원자가 최근 3년간 읽은 책 중 본인의 성장에 의미 있었던 독서 경험을 구체적으로 적어 주십시오."
      }
    ]
  },
  {
    "school": "경기북과학고등학교",
    "type": "science",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "reason",
        "label": "지원동기",
        "charLimit": null,
        "question": "경기북과학고등학교에 지원하게 된 동기를 지원자의 관심 분야(수학, 물리학, 화학, 생명과학, 지구과학, 정보)와 관련지어 구체적으로 쓰시오."
      },
      {
        "key": "msInquiry",
        "label": "수학·과학·정보 자기주도 학습활동",
        "charLimit": null,
        "question": "중학교 재학 중 수학, 과학, 정보 분야에서 자기주도적으로 학습한 활동을 아래 표에 적고, 자신의 열정, 탐구력 및 창의적 문제해결력 등이 잘 드러나도록 구체적으로 서술하시오."
      },
      {
        "key": "character",
        "label": "인성",
        "charLimit": null,
        "question": "중학교 재학중 배려, 협력, 갈등관리와 관련하여 실천한 사례를 들고, 그 과정을 통해 배우고 느낀 점을 구체적으로 작성하시오."
      }
    ]
  },
  {
    "school": "인천과학고등학교",
    "type": "science",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "reason",
        "label": "지원동기",
        "charLimit": 200,
        "question": "본교에 지원하게 된 동기를 적어 주십시오."
      },
      {
        "key": "mathInquiry",
        "label": "수학 관련 교내 학습·탐구 경험",
        "charLimit": 300,
        "question": "중학교 재학 중 수학과 관련된 교내 학습 활동이나 탐구 경험을 구체적으로 적고, 그 과정에서 이루어진 성장과 변화를 적어 주십시오."
      },
      {
        "key": "sciInquiry",
        "label": "과학 관련 교내 학습·탐구 경험",
        "charLimit": 300,
        "question": "중학교 재학 중 과학과 관련된 교내 학습 활동이나 탐구 경험을 구체적으로 적고, 그 과정에서 이루어진 성장과 변화를 적어 주십시오."
      },
      {
        "key": "character",
        "label": "인성",
        "charLimit": 400,
        "question": "중학교 재학 중 배려, 나눔, 협력, 타인 존중, 갈등 관리, 관계 지향성 등을 실천한 구체적인 사례와 그 과정에서 이루어진 성장과 변화를 적어 주십시오."
      }
    ]
  },
  {
    "school": "인천진산과학고등학교",
    "type": "science",
    "hasProfile": true,
    "profile": {
      "ideal_student": "바른 인성을 갖춘 창의융합형 과학인재 / 배려와 나눔을 실천하는 창의력을 지닌 학생",
      "eval_factors": "자기주도적 탐구역량 / 창의적 문제해결력 / 수학·과학 전문성 / 협력·배려의 인성",
      "programs": "R&E 연구활동(4~5명 팀, 논문집 발간), 자율탐구·과학 과제연구, 1인 3동아리(학술/취미/자율), 수학 멘토-멘티 Morning Question, Jinsan Research & Science Festival, 이공계 대학·연구소 탐방, 재능기부 봉사활동",
      "core_values": "창의, 도전, 봉사",
      "notes": "학년 트랙: 10학년 탐색 → 11학년 속진/심화(AP) → 12학년 대학진학 / 국제교류(대만·일본)"
    },
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "selfStudy",
        "label": "장래희망·자기주도 활동",
        "charLimit": null,
        "question": "장래의 꿈을 이루기 위해 스스로 수행한 활동과 진학 후의 학업계획을 구체적으로 적어 주십시오."
      },
      {
        "key": "mathInquiry",
        "label": "수학 탐구활동 2가지",
        "charLimit": null,
        "question": "수학과 관련하여 자기주도적으로 수행한 탐구활동 2가지를 구체적으로 적어 주십시오."
      },
      {
        "key": "sciInquiry",
        "label": "과학 탐구활동 2가지",
        "charLimit": null,
        "question": "과학과 관련하여 자기주도적으로 수행한 탐구활동 2가지를 구체적으로 적어 주십시오."
      },
      {
        "key": "msInquiry",
        "label": "수학·과학 우수성",
        "charLimit": null,
        "question": "수학 또는 과학 분야에서 남들보다 뛰어나다고 생각하는 점 1가지와 그 이유를 구체적으로 적어 주십시오."
      },
      {
        "key": "character",
        "label": "인성 활동 2가지",
        "charLimit": null,
        "question": "핵심 인성 요소와 관련하여 실천한 활동 2가지와 그 과정에서 배우고 느낀 점을 구체적으로 적어 주십시오."
      }
    ]
  },
  {
    "school": "부산과학고등학교",
    "type": "science",
    "hasProfile": true,
    "profile": {
      "ideal_student": "미래 세계를 이끌어 갈 창의적인 지도자 / 교훈: 창의·덕성·봉사 / 인재상: 창의인·덕성인·건전인 / 비전: 과학을 통해 보다 나은 세상 추구",
      "eval_factors": "수학·과학 자기주도학습 역량 / 창의성·잠재력 / 탐구력·연구 역량(R&E) / 올바른 품성·인성 / 이공계 진로 적합성 / 문화예술적 소양·건강한 심신",
      "programs": "연구중심교육(고급 수학·과학·AP, 100% 서술형 평가, R&E 창의과제연구 1·2학년 전원·논문집·탐구대회, 12개 교과 심화동아리, 영재반, Open Lab), 융합교육(Art Science Inquiry·STEAM 에세이·발명교육센터), SW·AI교육('수학과 인공지능'·Ocean ICT Festival·로봇공작실), 인성교육(1인 1악기·BSS 오케스트라·해송제·휴 콘서트·은애학교 통합교육·그린리더스), 글로벌 영어교육(싱가포르 SST·미국 IVY 탐방·Vision BSS), 조기졸업·과기원 조기입학, 천문대·발명교육센터 인프라, 문화동아리 15개+",
      "core_values": "창의·덕성·봉사 (교훈) / 창의인·덕성인·건전인 (인재상)",
      "notes": "영재학교 아닌 과학고(자기주도학습전형·서류면담+소집면접) / 부산 금정구 / 2003 개교(옛 장영실과학고, 2010 개명) / 고교학점제 204 이수단위 / 2학년 조기졸업·과기원 조기입학 자격 / 진학 KAIST·UNIST·POSTECH 등 과기원+이공계 / 천문대·R&E실 인프라 / 기숙사 / 인재상은 공식 요람 기준 '건전인'(봉사인 표기 버전 주의)"
    },
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "reason",
        "label": "지원동기·학업계획",
        "charLimit": null,
        "question": "지원자가 부산과학고에 지원하게 된 동기와 본교 입학 후 학업계획을 구체적으로 기술하시오."
      },
      {
        "key": "sciInquiry",
        "label": "과학 탐구 경험",
        "charLimit": null,
        "question": "지원자가 중학교 재학 기간 또는 최근 3년간 과학 영역에서 크게 성장할 수 있었던 탐구 경험과 활동 사례를 자세하게 기술하시오. 그 탐구 사례의 주제, 동기, 과정, 결과를 쓰고 그것을 통해 지원자가 어떤 성장, 변화를 이루었는지 구체적으로 설명하시오."
      },
      {
        "key": "mathInquiry",
        "label": "수학 탐구 경험",
        "charLimit": null,
        "question": "지원자가 중학교 재학 기간 또는 최근 3년간 수학 영역에서 크게 성장할 수 있었던 탐구 경험과 활동 사례를 자세하게 기술하시오. 그 탐구 사례의 주제, 동기, 과정, 결과를 쓰고 그것을 통해 지원자가 어떤 성장, 변화를 이루었는지 구체적으로 설명하시오."
      },
      {
        "key": "character",
        "label": "인성·협업",
        "charLimit": null,
        "question": "지원자가 중학교 재학 기간 또는 최근 3년간 배려, 나눔, 지도력, 소통, 협업, 규칙준수와 관련해 구체적으로 실천한 사례를 들고 그 과정을 통해 배우고 느낀 점을 기술하시오."
      }
    ]
  },
  {
    "school": "부산일과학고등학교",
    "type": "science",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "sciInquiry",
        "label": "과학 탐구 경험",
        "charLimit": null,
        "question": "지원자가 과학 분야에서 자기주도적으로 행한 탐구 경험이나 활동 사례와 이를 통해 지원자가 어떤 성장 또는 변화를 이루었는지 구체적으로 적어 주십시오."
      },
      {
        "key": "mathInquiry",
        "label": "수학 탐구 경험",
        "charLimit": null,
        "question": "지원자가 수학 분야에서 자기주도적으로 행한 탐구 경험이나 활동 사례와 이를 통해 지원자가 어떤 성장 또는 변화를 이루었는지 구체적으로 적어 주십시오."
      },
      {
        "key": "character",
        "label": "인성·협업",
        "charLimit": null,
        "question": "지원자가 중학교 재학기간 중 평소 주변 사람들이나 사회를 위해 배려, 나눔, 협력, 타인존중, 갈등관리, 규칙준수 등과 관련하여 활동한 내용을 사례를 들어 적어 주십시오. 또한 이를 통해 지원자가 어떤 성장 또는 변화를 이루었는지 구체적으로 적어 주십시오."
      }
    ]
  },
  {
    "school": "대구일과학고등학교",
    "type": "science",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "selfStudy",
        "label": "지원동기·진로계획·자기주도학습·독서",
        "charLimit": 800,
        "question": "지원동기, 장래 희망, 입학 후 학습계획 및 진로계획, 자기주도적 학습내용, 특별한 독서 경험을 구체적으로 적어 주십시오."
      },
      {
        "key": "msInquiry",
        "label": "수학·과학 탐구 활동",
        "charLimit": 500,
        "question": "수학·과학(정보) 분야의 탐구 경험과 활동 사례를 반드시 3개의 탐구 주제로 중요한 것부터 차례대로 서술하되 수학 1개, 과학 1개의 탐구 활동은 꼭 포함하여 적어 주십시오."
      },
      {
        "key": "character",
        "label": "인성 및 다양한 활동",
        "charLimit": 700,
        "question": "핵심인성요소 관련 활동과 봉사활동 경험 등 다양한 활동을 통해 배우고 느낀 점을 구체적으로 적어 주십시오."
      }
    ]
  },
  {
    "school": "대전동신과학고등학교",
    "type": "science",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "msInquiry",
        "label": "수학·과학 탐구 경험",
        "charLimit": null,
        "question": "지원자가 중학교 재학 중 수학, 과학 분야에서 자기주도적으로 수행한 탐구 경험과 활동 사례를 구체적으로 적어 주십시오."
      },
      {
        "key": "msInquiry",
        "label": "수학·과학 자기주도적 학습",
        "charLimit": null,
        "question": "지원자가 중학교 재학 중 수학, 과학 분야에서 목표 설정과 계획, 학습 과정, 결과 및 평가에 이르는 자기주도적 학습 과정을 구체적으로 적어 주십시오."
      },
      {
        "key": "character",
        "label": "인성 및 봉사활동",
        "charLimit": null,
        "question": "지원자가 중학교 재학 중 핵심인성요소 및 봉사활동과 관련하여 실천한 사례와 그 과정에서 배우고 느낀 점을 구체적으로 적어 주십시오."
      }
    ]
  },
  {
    "school": "울산과학고등학교",
    "type": "science",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "selfStudy",
        "label": "지원동기 및 진로계획, 자기주도학습 과정",
        "charLimit": null,
        "question": "본교 지원동기와 진로계획, 중학교 재학 중 자기주도적으로 학습한 과정을 구체적으로 적어 주십시오."
      },
      {
        "key": "mathInquiry",
        "label": "수학 탐구 경험",
        "charLimit": null,
        "question": "지원자가 중학교 재학 중 수학 분야에서 크게 성장할 수 있었던 탐구 경험 또는 활동을 배우고 느낀 점을 중심으로 3개 이내로 적어 주십시오."
      },
      {
        "key": "sciInquiry",
        "label": "과학 탐구 경험",
        "charLimit": null,
        "question": "지원자가 중학교 재학 중 과학 분야에서 크게 성장할 수 있었던 탐구 경험 또는 활동을 배우고 느낀 점을 중심으로 3개 이내로 적어 주십시오."
      },
      {
        "key": "character",
        "label": "인성 활동",
        "charLimit": null,
        "question": "핵심 인성요소와 관련하여 실천한 활동 사례와 이를 통해 배우고 느낀 점을 구체적으로 적어 주십시오."
      }
    ]
  },
  {
    "school": "강원과학고등학교",
    "type": "science",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "creativity",
        "label": "도전정신·창의성 학습경험",
        "charLimit": null,
        "question": "중학교 재학 기간 중 도전정신 및 창의성을 발휘하여 성장할 수 있었던 학습 경험을 구체적으로 적어 주십시오."
      },
      {
        "key": "mathInquiry",
        "label": "수학 탐구 경험",
        "charLimit": null,
        "question": "중학교 재학 기간 중 수학 분야에서 주도적으로 수행한 탐구 경험을 구체적으로 적어 주십시오."
      },
      {
        "key": "sciInquiry",
        "label": "과학 탐구 경험",
        "charLimit": null,
        "question": "중학교 재학 기간 중 과학 분야에서 주도적으로 수행한 탐구 경험을 구체적으로 적어 주십시오."
      },
      {
        "key": "character",
        "label": "인성",
        "charLimit": null,
        "question": "중학교 재학 기간 중 핵심 인성 요소를 실천한 사례와 그 과정에서 배우고 느낀 점을 구체적으로 적어 주십시오."
      }
    ]
  },
  {
    "school": "충북과학고등학교",
    "type": "science",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "reason",
        "label": "진로탐색·진로계획",
        "charLimit": null,
        "question": "지원자가 중학교 재학 기간 중 자신의 꿈을 이루기 위해 수행했던 진로탐색활동과 입학 후 진로를 개척하기 위한 계획을 구체적으로 적어 주십시오."
      },
      {
        "key": "character",
        "label": "인성",
        "charLimit": null,
        "question": "지원자가 중학교 재학 기간 중 핵심인성요소를 실천한 사례를 기술하고, 그 과정에서 배우고 느낀 점을 구체적으로 적어 주십시오."
      },
      {
        "key": "sciInquiry",
        "label": "과학 탐구·자기주도학습",
        "charLimit": null,
        "question": "지원자가 중학교 재학 기간 중 과학 분야에서 크게 성장할 수 있었던 탐구 활동과 자기주도학습경험을 구체적 사례를 포함하여 적어 주십시오."
      },
      {
        "key": "mathInquiry",
        "label": "수학 탐구·자기주도학습",
        "charLimit": null,
        "question": "지원자가 중학교 재학 기간 중 수학 분야에서 크게 성장할 수 있었던 탐구 활동과 자기주도학습경험을 구체적 사례를 포함하여 적어 주십시오."
      },
      {
        "key": "selfStudy",
        "label": "정보 탐구·자기주도학습",
        "charLimit": null,
        "question": "지원자가 중학교 재학 기간 중 정보 분야에서 크게 성장할 수 있었던 탐구 활동과 자기주도학습경험을 구체적 사례를 포함하여 적어 주십시오."
      }
    ]
  },
  {
    "school": "충남과학고등학교",
    "type": "science",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "reason",
        "label": "지원동기·학습계획·진로계획",
        "charLimit": null,
        "question": "지원자가 충남과학고등학교에 지원한 동기와 진학 후의 학습계획 및 진로계획을 구체적으로 기술하십시오."
      },
      {
        "key": "msInquiry",
        "label": "성장환경·수학/과학 탐구",
        "charLimit": null,
        "question": "지원자가 성장해 온 환경과 중학교 재학 기간 중 수학·과학 분야에서 자기주도적으로 탐구한 경험을 구체적으로 기술하십시오."
      },
      {
        "key": "other",
        "label": "교과 외 활동 1",
        "charLimit": null,
        "question": "지원자가 중학교 재학 기간 중 교과 외 활동을 통해 성장한 사례를 구체적으로 기술하십시오."
      },
      {
        "key": "other",
        "label": "교과 외 활동 2",
        "charLimit": null,
        "question": "지원자가 중학교 재학 기간 중 교과 외 활동을 통해 성장한 또 다른 사례를 구체적으로 기술하십시오."
      },
      {
        "key": "other",
        "label": "교과 외 활동 3",
        "charLimit": null,
        "question": "지원자가 중학교 재학 기간 중 교과 외 활동을 통해 성장한 세 번째 사례를 구체적으로 기술하십시오."
      }
    ]
  },
  {
    "school": "전북과학고등학교",
    "type": "science",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "selfStudy",
        "label": "지원동기·진로계획·자기주도학습과정",
        "charLimit": 800,
        "question": "지원자가 전북과학고등학교에 지원하게 된 동기를 과학고의 특성과 연계하여 적고, 중학교 재학 기간 중 특별한 관심 및 활동(학업 노력, 학습경험, 독서활동 등)을 통해 어떤 성장과 변화가 있었는지, 입학 후 학습계획 및 향후 진로계획을 구체적으로 적어 주십시오."
      },
      {
        "key": "mathInquiry",
        "label": "수학 탐구 경험",
        "charLimit": null,
        "question": "지원자가 중학교 재학 기간 중 수학 분야에서 크게 성장할 수 있었던 탐구활동 경험과 사례 하나를 구체적으로 적어 주십시오."
      },
      {
        "key": "sciInquiry",
        "label": "과학 탐구 경험",
        "charLimit": null,
        "question": "지원자가 중학교 재학 기간 중 과학 분야에서 크게 성장할 수 있었던 탐구활동 경험과 사례 하나를 구체적으로 적어 주십시오."
      }
    ]
  },
  {
    "school": "전남과학고등학교",
    "type": "science",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "selfStudy",
        "label": "지원동기·진로계획·자기주도학습 성장과정",
        "charLimit": null,
        "question": "지원자의 지원 동기 및 진로 계획을 본교 교육과정과 연계하여 적고, 자기주도 학습을 통해 성장한 과정을 구체적으로 적어 주십시오."
      },
      {
        "key": "msInquiry",
        "label": "과학·수학·융합 탐구 활동",
        "charLimit": null,
        "question": "과학, 수학, 융합 분야에서 자기주도적으로 탐구한 활동을 4개 이내로 쓰고, 주제별 열정, 잠재성, 창의성이 드러나도록 동기, 과정, 결과, 배우고 느낀 점을 구체적으로 적어 주십시오."
      },
      {
        "key": "reading",
        "label": "독서",
        "charLimit": null,
        "question": "수학, 과학, 진로, 교양 관련 도서 2권 이내와 각 도서의 핵심 용어를 적고, 독서를 통해 배우고 느낀 점을 구체적으로 적어 주십시오."
      },
      {
        "key": "character",
        "label": "인성",
        "charLimit": null,
        "question": "핵심인성요소를 실천한 사례와 그 과정에서 배우고 느낀 점을 구체적으로 적어 주십시오."
      }
    ]
  },
  {
    "school": "경북과학고등학교",
    "type": "science",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "reason",
        "label": "지원동기·학습 및 진로계획",
        "charLimit": null,
        "question": "지원 동기와 입학 후 자신의 장래 희망을 이루기 위한 학습 및 진로 계획을 적어 주십시오."
      },
      {
        "key": "character",
        "label": "인성 요소",
        "charLimit": null,
        "question": "자신의 인성 중 탁월하다고 판단한 2가지 요소 중 하나를 선택하여 구체적인 사례와 함께 적어 주십시오."
      },
      {
        "key": "creativity",
        "label": "창의적 아이디어",
        "charLimit": null,
        "question": "창의적 아이디어를 발휘하여 문제를 해결했거나 새로운 시도를 한 사례를 구체적으로 적어 주십시오."
      },
      {
        "key": "creativity",
        "label": "지적 호기심·몰입 경험",
        "charLimit": null,
        "question": "지적 호기심을 가지고 특정 분야에 몰두했던 경험을 구체적으로 적어 주십시오."
      },
      {
        "key": "msInquiry",
        "label": "수학 또는 과학 학습경험",
        "charLimit": null,
        "question": "수학 또는 과학 교과에 기울인 노력과 학습경험을 구체적으로 적어 주십시오."
      },
      {
        "key": "reading",
        "label": "독서",
        "charLimit": null,
        "question": "수학·과학 분야에서 감명 깊게 읽은 책 3권과 각 책의 핵심단어 5개씩을 적어 주십시오."
      }
    ]
  },
  {
    "school": "경산과학고등학교",
    "type": "science",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "reason",
        "label": "지원동기·학습 및 진로계획",
        "charLimit": null,
        "question": "지원자가 과학고에 지원한 동기와 입학 후 학습 및 진로계획을 구체적으로 적어 주십시오."
      },
      {
        "key": "sciInquiry",
        "label": "과학 학습경험·탐구활동",
        "charLimit": null,
        "question": "중학교 재학 기간 중 과학 분야의 학습경험과 탐구활동을 통해 이루어낸 성장과 변화를 구체적으로 적어 주십시오."
      },
      {
        "key": "mathInquiry",
        "label": "수학 학습경험·탐구활동",
        "charLimit": null,
        "question": "중학교 재학 기간 중 수학 분야의 학습경험과 탐구활동을 통해 이루어낸 성장과 변화를 구체적으로 적어 주십시오."
      },
      {
        "key": "character",
        "label": "인성·협업",
        "charLimit": null,
        "question": "배려, 나눔, 협력, 갈등 관리 등 인성 관련 실천 사례와 그 과정에서 배우고 느낀 점을 구체적으로 적어 주십시오."
      }
    ]
  },
  {
    "school": "경남과학고등학교",
    "type": "science",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "selfStudy",
        "label": "지원동기·학습계획·자기주도학습과정",
        "charLimit": null,
        "question": "지원 동기와 입학 후 학습계획, 중학교 재학 기간 중 자기주도적으로 학습한 과정을 구체적으로 적어 주십시오."
      },
      {
        "key": "mathInquiry",
        "label": "수학 탐구 경험",
        "charLimit": null,
        "question": "수학 관련 탐구경험과 이를 통해 이루어진 지적 성장을 구체적으로 적어 주십시오."
      },
      {
        "key": "character",
        "label": "봉사·인성",
        "charLimit": null,
        "question": "봉사활동 사례와 그 과정에서 배우고 느낀 점을 구체적으로 적어 주십시오."
      },
      {
        "key": "reading",
        "label": "독서 경험",
        "charLimit": null,
        "question": "지원자에게 의미 있었던 독서 경험 2권을 서술하십시오."
      }
    ]
  },
  {
    "school": "창원과학고등학교",
    "type": "science",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "reason",
        "label": "지원동기·학습계획·진로 및 장래희망",
        "charLimit": null,
        "question": "지원자가 창원과학고등학교에 지원한 동기와 진학 후의 학습 계획, 진로 및 장래희망에 대해서 기술하여 주십시오."
      },
      {
        "key": "mathInquiry",
        "label": "수학 학습 및 탐구활동",
        "charLimit": null,
        "question": "중학교 재학 기간 중 수학 분야의 학습 및 탐구활동을 통해 이루어낸 성장과 변화에 대해서 구체적인 사례를 기술하여 주십시오."
      },
      {
        "key": "sciInquiry",
        "label": "과학 학습 및 탐구활동",
        "charLimit": null,
        "question": "중학교 재학 기간 중 과학 분야의 학습 및 탐구활동을 통해 이루어낸 성장과 변화에 대해서 구체적인 사례를 기술하여 주십시오."
      },
      {
        "key": "reading",
        "label": "실천활동 또는 독서활동",
        "charLimit": null,
        "question": "지원자가 평소 주변 사람들과 사회를 위해 실천한 활동이나 독서활동을 통해 본인의 성장, 변화를 이끈 구체적인 사례를 적어 주십시오."
      }
    ]
  },
  {
    "school": "제주과학고등학교",
    "type": "science",
    "hasProfile": false,
    "profile": null,
    "scoringMode": "platform",
    "total": 100,
    "sections": [
      {
        "key": "selfStudy",
        "label": "지원동기와 자기주도학습과정",
        "charLimit": null,
        "question": "본교에 지원하게 된 동기와 중학교 재학 기간 중 자기주도적으로 학습하며 성장하고 변화한 과정을 구체적인 일화 중심으로 적어 주십시오."
      },
      {
        "key": "msInquiry",
        "label": "수학·과학 탐구경험 및 독서·활동",
        "charLimit": null,
        "question": "중학교 재학 기간 중 수학과 과학 분야를 구별하여 탐구 경험과 학습활동 사례를 적고, 진로·교양 관련 독서 결과나 활동을 통해 성장하고 변화한 점을 구체적으로 적어 주십시오."
      },
      {
        "key": "character",
        "label": "인성",
        "charLimit": null,
        "question": "중학교 재학 기간 중 인성 요소와 관련한 활동 사례와 그 과정에서 배우고 느낀 점을 구체적으로 적어 주십시오."
      }
    ]
  }
];

function normalize(name: string): string {
  return (name || "").replace(/\s*\(.*?\)\s*/g, "").replace(/\s+/g, "").trim();
}
export function getSchoolEssayData(schoolName: string): SchoolEssayData | undefined {
  if (!schoolName) return undefined;
  const n = normalize(schoolName);
  const exact = SCHOOL_ESSAY_DATA.find((s) => normalize(s.school) === n);
  if (exact) return exact;
  return SCHOOL_ESSAY_DATA.find(
    (s) => normalize(s.school).includes(n) || n.includes(normalize(s.school))
  );
}
export function getSection(schoolName: string, sectionKeyOrLabel: string): RubricSection | undefined {
  const data = getSchoolEssayData(schoolName);
  if (!data) return undefined;
  const n = normalize(sectionKeyOrLabel);
  return data.sections.find(
    (s) => s.key === sectionKeyOrLabel || normalize(s.label).includes(n) || n.includes(normalize(s.label))
  );
}