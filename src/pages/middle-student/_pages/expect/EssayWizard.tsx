import { useState, useMemo, useEffect, useRef } from "react";
import {
  useEssayWizard,
  useSaveEssayWizard,
  useSubmitToTeacher,
} from "@/pages/middle-student/_hooks/useEssayWizard";
import { getSchoolEssayData } from "@/constants/schoolEssayData";
import { SCHOOL_SUBQUESTIONS } from "@/constants/schoolSubQuestions";

// ──────────────────────────────────────────
// 타입
// ──────────────────────────────────────────
interface KeywordRow {
  keyword: string;
  experience: string;
}

interface MindmapBranch {
  학교생활: string[];
  동아리: string[];
  독서학습: string[];
  봉사인성: string[];
  학교관심: string[];
}

type SubAnswer = { q1: string; q2: string; q3: string; q4: string };

// 🎯 항목(섹션)을 학교별 동적으로 — key 기반 Record
type SectionAnswers = Record<string, SubAnswer>;
type ExperienceMatching = Record<string, string[]>;

interface ExperienceCard {
  text: string;
  category: keyof MindmapBranch;
  branchIcon: string;
  questionLabel: string;
}

interface WizardData {
  keywords: KeywordRow[];
  mindmap: MindmapBranch;
  matching: ExperienceMatching;
  sections: SectionAnswers;
}

// ════════════════════════════════════════════════════════════
// 🎯 학교별 동적 항목 정의
// ════════════════════════════════════════════════════════════
const SECTION_ICON: Record<string, string> = {
  selfStudy: "🎓",
  reason: "🏫",
  career: "🚀",
  character: "💛",
  sciInquiry: "🔬",
  mathInquiry: "📐",
};

type SubQuestion = { title: string; guide: string; example: string };

// key별 세부 질문 가이드 풀 (마법사 4단계에서 사용)
const QUESTION_GUIDE: Record<string, SubQuestion[]> = {
  selfStudy: [
    { title: "어떤 학습 목표를 세우고 어떻게 계획했어?", guide: '공부할 때 무작정 한 게 아니라 "목표 → 계획"의 과정이 있었는지 떠올려요.', example: '"2학년 때 영어 회화 약점을 느끼고, 6개월간 매주 영자신문 1편 읽기를 목표로 세웠다"' },
    { title: "실제로 어떻게 학습했고 어려움은 어떻게 극복했어?", guide: "계획대로 다 안 됐을 수 있어요. 막힌 부분을 어떻게 해결했는지 솔직하게 적어요.", example: '"처음엔 한 기사 읽는데 1시간 걸려 좌절했지만, 단어 노트를 만들어 매주 30개씩 외웠다"' },
    { title: "진로체험·동아리·꿈끼 활동 중 가장 의미 있었던 건?", guide: "교과 외 활동 중 본인의 진로나 꿈과 연결된 활동을 골라요.", example: '"과학동아리 부장으로 1년간 매월 실험 프로젝트를 기획·진행했다"' },
    { title: "결과를 평가하고 무엇을 느꼈어?", guide: '"재미있었다" 말고, 구체적으로 뭘 배웠고 어떻게 성장했는지 적어요.', example: '"꾸준함의 힘을 알게 됐고, 6개월 단위로 도전하는 습관이 생겼다"' },
  ],
  reason: [
    { title: "이 학교 건학이념·특성 중 가장 와닿은 게 뭐야?", guide: "학교 홈페이지에서 건학이념·인재상을 확인하고, 내 가치관과 맞는 한 가지를 골라요.", example: "\"이 학교의 '글로벌 인재 양성' 이념이 가장 와닿았다.\"" },
    { title: "그 이념·특성과 연결되는 내 경험은?", guide: "3단계에서 매칭한 경험을 활용해요. 구체적인 사건과 숫자를 넣으면 좋아요.", example: '"5년간 비행기 모형 30개를 조립하며 항공역학 강의를 50편 이상 봤다"' },
    { title: "왜 다른 학교가 아니라 이 학교여야 해?", guide: "이 학교만의 특별한 점(프로그램, 동아리, 환경 등)을 구체적으로 적어요.", example: '"이 학교에만 있는 항공물리 동아리에서 활동하고 싶다"' },
    { title: "입학하면 어떤 학생이 되고 싶어?", guide: '단순한 다짐 말고, 구체적으로 뭘 하고 싶은지 적어요.', example: '"동아리에 들어가 드론 자작 프로젝트에 참여하고 싶다"' },
  ],
  career: [
    { title: "고등학교 졸업 후 어떤 분야로 가고 싶어?", guide: "구체적인 학과·분야를 적어요. 모르겠으면 관심 키워드부터.", example: '"항공우주공학과 진학 후 무인기 개발 분야로 가고 싶다"' },
    { title: "그 분야에 관심이 생긴 결정적 계기는?", guide: "단순히 멋있어서가 아니라, 어떤 경험이 그 분야로 이끌었는지 적어요.", example: '"5학년 때 본 항공기 정비사 다큐멘터리가 결정적이었다"' },
    { title: "그 진로를 위해 지금까지 한 노력은?", guide: "독서, 강의 시청, 동아리, 대회 참가 등 구체적으로.", example: '"항공역학 강의 50편 시청, 모형 30개 조립, 과학동아리 부장 1년"' },
    { title: "5년 후, 10년 후 모습은 어떨까?", guide: "막연한 꿈이 아니라 구체적인 단계로 그려요.", example: '"5년 후 공학과 학생으로 드론 동아리, 10년 후 무인기 연구원"' },
  ],
  character: [
    { title: "친구·이웃을 도왔던 가장 기억에 남는 일은?", guide: "거창한 봉사 말고 일상 속 작은 배려도 좋아요. 봉사체험활동도 포함.", example: '"수학을 어려워하던 짝꿍에게 1학기 동안 매일 점심시간 멘토링했다"' },
    { title: "그 과정에서 어려웠던 점과 배운 점은?", guide: "도와주는 게 무조건 쉽진 않았을 거예요. 솔직하게 적어요.", example: '"내 방식만 고집해 처음엔 이해 못했지만, 짝꿍 입장에서 다시 설명하며 배려를 배웠다"' },
    { title: "팀에서 갈등이 있었을 때 어떻게 해결했어?", guide: "팀 활동에서 의견이 안 맞을 때 어떻게 풀었는지 떠올려요. (협력·타인존중)", example: '"발표 주제로 의견이 갈렸을 때 투표 대신 각자 이유를 듣고 절충안을 도출했다"' },
    { title: "규칙·약속을 지키며 책임감을 보였던 경험은?", guide: "약속·규칙을 지킨 사례를 적어요. (규칙준수)", example: '"학급 환경부장으로 1년간 매일 분리수거 점검을 빠짐없이 했다"' },
  ],
  // 🔬 과학고용
  sciInquiry: [
    { title: "어떤 과학 주제가 궁금해서 탐구를 시작했어?", guide: "호기심이 생긴 계기와 탐구 주제를 구체적으로 적어요.", example: '"식물이 빛 방향으로 휘는 이유가 궁금해 굴광성을 직접 실험해보기로 했다"' },
    { title: "어떤 가설을 세우고 어떻게 관찰·실험했어?", guide: "가설 설정 → 관찰/실험/자료분석 과정을 단계로 적어요.", example: '"빛을 한쪽에서만 주면 줄기가 휜다고 가설을 세우고, 2주간 매일 각도를 측정했다"' },
    { title: "시행착오나 막힌 부분은 어떻게 해결했어?", guide: "실패하거나 예상과 달랐던 부분, 그걸 어떻게 다뤘는지 솔직하게.", example: '"처음엔 측정값이 들쭉날쭉했는데, 빛 세기를 고정하니 일정해졌다"' },
    { title: "결과에서 무엇을 알았고 어떻게 성장했어?", guide: "검증 결과와 배운 점, 다음 탐구로 이어진 호기심을 적어요.", example: '"굴광성이 옥신 때문임을 확인했고, 식물 호르몬에 더 관심이 생겼다"' },
  ],
  mathInquiry: [
    { title: "어떤 수학적 호기심에서 탐구를 시작했어?", guide: "궁금했던 수학 개념·현상과 그 계기를 적어요.", example: '"피보나치 수열이 자연에서 자주 보이는 이유가 궁금했다"' },
    { title: "어떻게 탐구하고 문제를 해결했어?", guide: "사고 과정, 풀이 방식, 시도한 방법을 단계로 적어요.", example: '"해바라기 씨앗 배열을 세어 황금각과의 관계를 직접 계산해봤다"' },
    { title: "막힌 지점에서 어떻게 개선했어?", guide: "안 풀리던 부분, 다른 방법으로 접근한 경험을 적어요.", example: '"손으로 세기 어려워 사진을 격자로 나눠 세는 방법을 고안했다"' },
    { title: "결과에서 무엇을 알았고 어떻게 성장했어?", guide: "알게 된 것과 수학적 사고가 어떻게 늘었는지 적어요.", example: '"자연 속 수학 규칙을 발견하는 재미를 알았고, 수열을 더 깊이 공부하게 됐다"' },
  ],
};

// 매칭 단계에서 보여줄 "이런 경험이 어울려요" 예시 풀
const MATCHING_EXAMPLES: Record<string, string[]> = {
  selfStudy: ["- 스스로 세운 학습 목표·달성 경험", "- 동아리 프로젝트·교내 대회 참가", "- 진로 체험·꿈을 키운 활동", "- 어려움을 극복한 학습 경험", "- 기억에 남는 책·스스로 찾아 한 학습"],
  reason: ["- 학교 건학이념과 맞는 가치관 형성 경험", "- 학교 특성에 관심 갖게 된 사건", "- 학교 인재상과 닮은 내 모습", "- 학교 프로그램·동아리에 끌린 이유"],
  career: ["- 진로에 영향 준 결정적 경험", "- 진로 관련 독서·강의·다큐", "- 관심 분야 탐구 활동", "- 진로 박람회·직업 체험"],
  character: ["- 친구·후배를 도운 봉사 경험", "- 갈등 해결·협력 경험", "- 규칙·약속 지킨 사례", "- 배려·나눔 실천 경험", "- 학급·자치회 활동"],
  sciInquiry: ["- 과학 실험·관찰 경험", "- 자유탐구·과학 동아리 활동", "- 과학 관련 독서·다큐", "- 궁금증을 직접 확인한 경험"],
  mathInquiry: ["- 수학 문제를 깊이 파고든 경험", "- 수학 동아리·경시 준비", "- 수학 관련 독서·탐구", "- 일상에서 수학 규칙 발견"],
};

type SectionDef = { key: string; label: string; icon: string };

// 학교 이름 → 동적 항목 정의 + 빈 데이터 키
function getWizardSections(schoolName: string): SectionDef[] {
  const data = getSchoolEssayData(schoolName);
  if (!data || !data.sections?.length) {
    return [
      { key: "selfStudy", label: "자기주도학습 과정", icon: "🎓" },
      { key: "reason", label: "지원동기", icon: "🏫" },
      { key: "career", label: "진로계획", icon: "🚀" },
      { key: "character", label: "인성", icon: "💛" },
    ];
  }
  return data.sections.map((s: any) => ({
    key: s.key,
    label: s.label,
    icon: SECTION_ICON[s.key] || "📝",
  }));
}

// 질문 가이드 우선순위: ① 학교별 세부질문 → ② key별 기본 → ③ 범용 기본
function guideFor(key: string, schoolName?: string): SubQuestion[] {
  if (schoolName && SCHOOL_SUBQUESTIONS[schoolName]?.[key]?.length) {
    return SCHOOL_SUBQUESTIONS[schoolName][key];
  }
  return QUESTION_GUIDE[key] || [
    { title: "이 항목에서 보여줄 핵심 경험은?", guide: "이 항목 주제에 맞는 경험을 떠올려요.", example: "구체적인 사건을 적어요." },
    { title: "어떤 과정을 거쳤어?", guide: "동기 → 과정 → 결과 순으로 적어요.", example: "단계별로 적어요." },
    { title: "어려웠던 점과 극복은?", guide: "막힌 부분과 해결 과정을 적어요.", example: "솔직하게 적어요." },
    { title: "무엇을 배우고 느꼈어?", guide: "성장한 점을 구체적으로 적어요.", example: "배운 점을 적어요." },
  ];
}

const SUGGESTED_KEYWORDS = ["탐구심", "도전정신", "리더십", "협력", "창의성", "끈기", "책임감", "성실함", "소통능력", "배려", "자기주도성", "분석력"];

const MINDMAP_STRUCTURE = [
  { key: "학교생활" as keyof MindmapBranch, icon: "🏫", questions: ["가장 몰입했던 수업", "선생님께 칭찬받은 순간", "힘들었던 일과 극복", "발표·발의 경험"], placeholders: ["예: 과학수업 화산실험", "예: 과학발표 우수상", "예: 수학성적 하락 극복", "예: 학급회의 의견 제안"] },
  { key: "동아리" as keyof MindmapBranch, icon: "🎯", questions: ["가입한 동아리·역할", "진행한 프로젝트·행사", "팀에서 의견충돌·해결", "교내 대회 참가"], placeholders: ["예: 과학동아리 부장", "예: 환경캠페인 1년", "예: 발표 주제 갈등 절충", "예: 영어말하기대회 우수"] },
  { key: "독서학습" as keyof MindmapBranch, icon: "📚", questions: ["기억에 남는 책", "스스로 찾아 한 학습", "관심사·취미가 직무 연결", "스스로 세운 목표·달성"], placeholders: ["예: 코스모스 칼 세이건", "예: 영자신문 매주 읽기", "예: 비행기모형 30개 조립", "예: 100일 독서계획 달성"] },
  { key: "봉사인성" as keyof MindmapBranch, icon: "💛", questions: ["친구를 도운 경험", "봉사·자치회 활동", "규칙·약속 지킨 사례", "갈등을 해결했던 일"], placeholders: ["예: 짝꿍 수학 멘토링", "예: 노인복지관 봉사 1년", "예: 환경부장 분리수거 점검", "예: 친구 다툼 중재"] },
  { key: "학교관심" as keyof MindmapBranch, icon: "🏠", questions: ["학교 건학이념과 맞는 가치관 형성 경험", "학교 특성에 관심 갖게 된 사건", "학교가 추구하는 인재상과 닮은 내 모습", "학교 프로그램·동아리에 끌린 이유"], placeholders: ["예: 자율 학습 정신 공감", "예: 학교 견학 후 관심", "예: 도전·탐구심 좋아함", "예: 항공물리부에 끌림"] },
];

const CATEGORY_COLORS: Record<keyof MindmapBranch, string> = {
  학교생활: "bg-emerald-100 text-emerald-700 border-emerald-200",
  동아리: "bg-teal-100 text-teal-700 border-teal-200",
  독서학습: "bg-amber-100 text-amber-700 border-amber-200",
  봉사인성: "bg-rose-100 text-rose-700 border-rose-200",
  학교관심: "bg-sky-100 text-sky-700 border-sky-200",
};

const KOREAN_PARTICLES = ["으로써", "으로서", "에서는", "에서도", "이라는", "이라고", "에서", "에게", "한테", "께서", "이라", "라고", "으로", "으나", "지만", "라는", "처럼", "을", "를", "이", "가", "은", "는", "와", "과", "에", "의", "도", "만", "로", "야", "여", "랑"];

function stripParticles(word: string): string {
  let cleaned = word.trim();
  for (const particle of KOREAN_PARTICLES) {
    if (cleaned.endsWith(particle) && cleaned.length > particle.length) {
      cleaned = cleaned.slice(0, -particle.length);
      break;
    }
  }
  return cleaned;
}

function extractMeaningfulWords(text: string): string[] {
  return text.replace(/[,.!?·\-\(\)\[\]"'·:;~]/g, " ").split(/\s+/).filter((w) => w.trim().length >= 2).map(stripParticles).filter((w) => w.length >= 2);
}

function checkAppears(targetWords: string[], bodyText: string): boolean {
  return targetWords.some((w) => bodyText.includes(w));
}

const EMPTY_SUB: SubAnswer = { q1: "", q2: "", q3: "", q4: "" };

interface Props {
  schoolName: string;
  essayId: string;
  studentId: string;
  academyId: string | null;
  onComplete: (finalContent: Record<string, string>) => void;
  onCancel: () => void;
}

export default function EssayWizard({ schoolName, essayId, studentId, academyId, onComplete, onCancel }: Props) {
  // 🎯 이 학교의 항목들
  const sectionDefs = useMemo(() => getWizardSections(schoolName), [schoolName]);
  const sectionKeys = useMemo(() => sectionDefs.map((s) => s.key), [sectionDefs]);

  // 동적 빈 데이터
  const makeEmptyData = (): WizardData => {
    const matching: ExperienceMatching = {};
    const sections: SectionAnswers = {};
    sectionKeys.forEach((k) => { matching[k] = []; sections[k] = { ...EMPTY_SUB }; });
    return {
      keywords: [{ keyword: "", experience: "" }, { keyword: "", experience: "" }, { keyword: "", experience: "" }, { keyword: "", experience: "" }, { keyword: "", experience: "" }],
      mindmap: { 학교생활: ["", "", "", ""], 동아리: ["", "", "", ""], 독서학습: ["", "", "", ""], 봉사인성: ["", "", "", ""], 학교관심: ["", "", "", ""] },
      matching,
      sections,
    };
  };

  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>(makeEmptyData);
  const [activeSectionTab, setActiveSectionTab] = useState<string>(sectionKeys[0]);
  const [checklist, setChecklist] = useState<boolean[]>([false, false, false, false, false]);
  const [expandedExp, setExpandedExp] = useState<string | null>(null);
  const [currentBranchIdx, setCurrentBranchIdx] = useState(0);

  const { data: savedWizard, isLoading: isLoadingWizard } = useEssayWizard(essayId);
  const saveWizard = useSaveEssayWizard();
  const submitToTeacher = useSubmitToTeacher();

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const isInitialLoadRef = useRef(true);

  // activeSectionTab이 현재 학교 키에 없으면 첫 키로
  useEffect(() => {
    if (!sectionKeys.includes(activeSectionTab)) setActiveSectionTab(sectionKeys[0]);
  }, [sectionKeys, activeSectionTab]);

  useEffect(() => {
    if (savedWizard && isInitialLoadRef.current) {
      const savedMindmap = savedWizard.mindmap || {};
      const mergedMindmap: MindmapBranch = {
        학교생활: savedMindmap.학교생활 || ["", "", "", ""],
        동아리: savedMindmap.동아리 || ["", "", "", ""],
        독서학습: savedMindmap.독서학습 || ["", "", "", ""],
        봉사인성: savedMindmap.봉사인성 || ["", "", "", ""],
        학교관심: savedMindmap.학교관심 || ["", "", "", ""],
      };
      // 저장된 matching/sections를 현재 학교 키 기준으로 병합
      const empty = makeEmptyData();
      const mergedMatching: ExperienceMatching = { ...empty.matching };
      const mergedSections: SectionAnswers = { ...empty.sections };
      if (savedWizard.matching) {
        sectionKeys.forEach((k) => { if (savedWizard.matching[k]) mergedMatching[k] = savedWizard.matching[k]; });
      }
      if (savedWizard.sections) {
        sectionKeys.forEach((k) => { if (savedWizard.sections[k]) mergedSections[k] = { ...EMPTY_SUB, ...savedWizard.sections[k] }; });
      }
      setData({
        keywords: savedWizard.keywords?.length ? savedWizard.keywords : empty.keywords,
        mindmap: mergedMindmap,
        matching: mergedMatching,
        sections: mergedSections,
      });
      setCurrentStep(savedWizard.current_step || 1);
      isInitialLoadRef.current = false;
    } else if (!savedWizard && !isLoadingWizard && isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedWizard, isLoadingWizard]);

  useEffect(() => {
    if (isInitialLoadRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveWizard.mutateAsync({ essay_id: essayId, student_id: studentId, academy_id: academyId, data: { ...data, current_step: currentStep } });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (e) {
        console.error("자동저장 실패:", e);
        setSaveStatus("idle");
      }
    }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, currentStep]);

  const toggleSuggestKeyword = (kw: string) => {
    const filled = data.keywords.filter((k) => k.keyword.trim()).length;
    const exists = data.keywords.some((k) => k.keyword === kw);
    if (exists) {
      setData((prev) => ({ ...prev, keywords: prev.keywords.map((k) => (k.keyword === kw ? { keyword: "", experience: "" } : k)) }));
    } else {
      if (filled >= 5) return;
      setData((prev) => {
        const newKws = [...prev.keywords];
        const idx = newKws.findIndex((k) => !k.keyword.trim());
        if (idx >= 0) newKws[idx] = { keyword: kw, experience: newKws[idx].experience };
        return { ...prev, keywords: newKws };
      });
    }
  };

  const updateKeyword = (idx: number, field: keyof KeywordRow, value: string) => {
    setData((prev) => { const newKws = [...prev.keywords]; newKws[idx] = { ...newKws[idx], [field]: value }; return { ...prev, keywords: newKws }; });
  };

  const updateMindmap = (branch: keyof MindmapBranch, idx: number, value: string) => {
    setData((prev) => { const nb = [...prev.mindmap[branch]]; nb[idx] = value; return { ...prev, mindmap: { ...prev.mindmap, [branch]: nb } }; });
  };

  const experienceCards: ExperienceCard[] = useMemo(() => {
    const cards: ExperienceCard[] = [];
    MINDMAP_STRUCTURE.forEach((branch) => {
      data.mindmap[branch.key].forEach((text, qIdx) => {
        if (text.trim()) cards.push({ text: text.trim(), category: branch.key, branchIcon: branch.icon, questionLabel: branch.questions[qIdx] });
      });
    });
    return cards;
  }, [data.mindmap]);

  const usedExperiences = useMemo(() => {
    const used = new Set<string>();
    Object.values(data.matching).forEach((arr: string[]) => arr.forEach((e: string) => used.add(e)));
    return used;
  }, [data.matching]);

  const moveExpToSection = (text: string, section: string) => {
    setData((prev) => {
      const newMatching: ExperienceMatching = {};
      sectionKeys.forEach((k) => { newMatching[k] = (prev.matching[k] || []).filter((e) => e !== text); });
      newMatching[section] = [...(newMatching[section] || []), text];
      return { ...prev, matching: newMatching };
    });
  };

  const removeExpFromSection = (text: string, section: string) => {
    setData((prev) => ({ ...prev, matching: { ...prev.matching, [section]: (prev.matching[section] || []).filter((e) => e !== text) } }));
  };

  const getCardByText = (text: string): ExperienceCard | undefined => experienceCards.find((c) => c.text === text);

  const matchedCardsForCurrentSection = useMemo(() => {
    return (data.matching[activeSectionTab] || []).map(getCardByText).filter((c): c is ExperienceCard => !!c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.matching, activeSectionTab, experienceCards]);

  const updateSubAnswer = (section: string, field: keyof SubAnswer, value: string) => {
    setData((prev) => ({ ...prev, sections: { ...prev.sections, [section]: { ...(prev.sections[section] || EMPTY_SUB), [field]: value } } }));
  };

  const draftFor = (section: string): string => {
    const a = data.sections[section] || EMPTY_SUB;
    return [a.q1, a.q2, a.q3, a.q4].filter((s) => s.trim()).join(" ");
  };

  const totalCharCount = useMemo(() => sectionKeys.map(draftFor).join("").replace(/\s/g, "").length, [data.sections, sectionKeys]); // eslint-disable-line react-hooks/exhaustive-deps
  const fullEssayText = useMemo(() => sectionKeys.map(draftFor).join(" "), [data.sections, sectionKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  const keywordCheck = useMemo(() => {
    return data.keywords.filter((k) => k.keyword.trim()).map((k) => {
      const keyword = k.keyword.trim();
      const experience = k.experience.trim();
      if (fullEssayText.includes(keyword)) return { keyword, appears: true };
      if (checkAppears(extractMeaningfulWords(keyword), fullEssayText)) return { keyword, appears: true };
      if (experience && checkAppears(extractMeaningfulWords(experience), fullEssayText)) return { keyword, appears: true };
      return { keyword, appears: false };
    });
  }, [data.keywords, fullEssayText]);

  const keywordAppearedCount = keywordCheck.filter((k) => k.appears).length;
  const filledKeywords = data.keywords.filter((k) => k.keyword.trim()).length;

  const experienceCheck = useMemo(() => {
    const allMatched = sectionKeys.flatMap((sec) => (data.matching[sec] || []).map((text) => ({ section: sec, text })));
    return allMatched.map(({ section, text }) => ({ section, text, appears: checkAppears(extractMeaningfulWords(text), draftFor(section)) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.matching, data.sections, sectionKeys]);

  const experienceAppearedCount = experienceCheck.filter((e) => e.appears).length;
  const totalMatchedExp = experienceCheck.length;

  const isStep1Done = filledKeywords >= 3;
  const filledMindmap = (Object.values(data.mindmap) as string[][]).flat().filter((s) => s.trim()).length;
  const isStep2Done = filledMindmap >= 4;
  const matchedCount = sectionKeys.reduce((sum, k) => sum + (data.matching[k]?.length || 0), 0);
  const isStep3Done = matchedCount >= 2;
  const filledSections = sectionKeys.filter((sec) => Object.values(data.sections[sec] || EMPTY_SUB).some((v) => v.trim())).length;
  const isStep4Done = filledSections >= 2;

  const STEPS = [
    { num: 1, label: "키워드", done: isStep1Done },
    { num: 2, label: "경험", done: isStep2Done },
    { num: 3, label: "매칭", done: isStep3Done },
    { num: 4, label: "작성", done: isStep4Done },
    { num: 5, label: "점검", done: false },
    { num: 6, label: "피드백", done: false },
  ];

  const currentBranch = MINDMAP_STRUCTURE[currentBranchIdx];
  const currentBranchFilled = currentBranch ? data.mindmap[currentBranch.key].filter((s) => s.trim()).length : 0;

  // 완료 시 학교 키대로 content 생성
  const buildFinalContent = (): Record<string, string> => {
    const content: Record<string, string> = {};
    sectionKeys.forEach((k) => { content[k] = draftFor(k); });
    return content;
  };

  const defByKey = (key: string) => sectionDefs.find((d) => d.key === key);

  if (isLoadingWizard) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="text-3xl mb-3">⏳</div>
          <div className="text-[14px] font-bold text-ink">자소서 마법사 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      <div className="flex items-center gap-6 px-6 py-3 bg-white border-b border-line flex-shrink-0">
        <div className="flex items-center gap-3 flex-shrink-0">
          <button onClick={onCancel} className="text-[12px] font-semibold text-ink-secondary hover:text-ink transition-colors">← 나가기</button>
          <div className="w-px h-4 bg-line" />
          <div>
            <div className="text-[14px] font-extrabold text-ink tracking-tight whitespace-nowrap">📝 자소서 마법사</div>
            <div className="text-[10px] text-ink-muted leading-[1.3] flex items-center gap-1">
              <span className="text-brand-middle-dark font-bold">{schoolName}</span>
              <span className="text-ink-muted">· {sectionDefs.length}개 문항</span>
              {saveStatus === "saving" && <span className="text-amber-600">· 저장 중...</span>}
              {saveStatus === "saved" && <span className="text-emerald-600">· ✓ 자동저장됨</span>}
            </div>
          </div>
        </div>
        <div className="w-px h-10 bg-line flex-shrink-0" />
        <div className="flex items-center flex-1 min-w-0">
          {STEPS.map((s, idx) => {
            const isActive = currentStep === s.num;
            const isPast = currentStep > s.num;
            const isLast = idx === STEPS.length - 1;
            return (
              <div key={s.num} className="flex items-center flex-1 last:flex-initial">
                <div onClick={() => setCurrentStep(s.num)} className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all ${isActive ? "bg-brand-middle text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] scale-110 ring-4 ring-brand-middle-pale" : isPast ? "bg-brand-middle-dark text-white" : "bg-white text-ink-muted border border-line"}`}>
                    {isPast ? "✓" : s.num}
                  </div>
                  <div className={`text-[11px] font-semibold whitespace-nowrap ${isActive ? "text-brand-middle-dark" : isPast ? "text-brand-middle-dark" : "text-ink-muted"}`}>{s.label}</div>
                </div>
                {!isLast && <div className={`flex-1 h-0.5 mx-3 ${isPast ? "bg-brand-middle" : "bg-gray-200"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className={currentStep === 4 ? "max-w-[1280px] mx-auto" : "max-w-[900px] mx-auto"}>
          {/* 1단계 — 키워드 (학교 무관, 그대로) */}
          {currentStep === 1 && (
            <div className="bg-white border border-line rounded-2xl p-7 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <h2 className="text-[18px] font-extrabold text-ink mb-2 tracking-tight">1단계 · 나의 키워드 5개 잡기</h2>
              <p className="text-[12.5px] text-ink-secondary leading-[1.7] mb-5">자소서를 쓰기 전에 "나를 보여줄 단어 5개"를 먼저 정해요.<br />이 키워드들이 자소서 곳곳에 자연스럽게 녹아들면 글에 일관성이 생겨요.</p>
              <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-4 py-3 mb-5 flex gap-3">
                <div className="text-2xl flex-shrink-0"></div>
                <div>
                  <div className="text-[12px] font-bold text-brand-middle-dark mb-1">AI 추천 — {schoolName}에 어울리는 키워드</div>
                  <div className="text-[12px] text-ink-secondary leading-[1.6]">아래 추천 중에서 골라도 되고, 직접 입력해도 돼요. 키워드 5개를 정하면 다음 단계로 갈 수 있어요!</div>
                </div>
              </div>
              <div className="mb-5">
                <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">💡 추천 키워드 (탭해서 추가/제거)</div>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_KEYWORDS.map((kw) => {
                    const selected = data.keywords.some((k) => k.keyword === kw);
                    return (
                      <button key={kw} type="button" onClick={() => toggleSuggestKeyword(kw)} className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${selected ? "bg-brand-middle text-white border border-brand-middle" : "bg-white border border-line text-ink-secondary hover:border-brand-middle-light hover:bg-brand-middle-pale"}`}>
                        {selected ? "✓ " : "+ "}{kw}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">✏️ 내 키워드 5개 (각 키워드를 보여줄 경험 한 줄)</div>
                {data.keywords.map((kw, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={kw.keyword} onChange={(e) => updateKeyword(i, "keyword", e.target.value)} placeholder={`키워드 ${i + 1}`} className="w-[140px] h-10 px-3 border border-line rounded-lg text-[13px] focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all flex-shrink-0" />
                    <input value={kw.experience} onChange={(e) => updateKeyword(i, "experience", e.target.value)} placeholder="이 키워드를 보여줄 내 경험 한 줄" className="flex-1 h-10 px-3 border border-line rounded-lg text-[13px] focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all" />
                  </div>
                ))}
              </div>
              <div className="mt-5 bg-gray-50 border border-line rounded-lg px-4 py-2.5 text-[12px] text-ink-secondary">
                <span className="font-bold text-brand-middle-dark">{filledKeywords}/5</span> 키워드 입력됨
                {isStep1Done ? " · ✅ 다음 단계로 갈 수 있어요!" : " · 최소 3개 이상 입력해주세요"}
              </div>
            </div>
          )}

          {/* 2단계 — 마인드맵 (학교 무관, 그대로) */}
          {currentStep === 2 && (
            <div className="bg-white border border-line rounded-2xl p-7 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <h2 className="text-[18px] font-extrabold text-ink mb-2 tracking-tight">2단계 · 경험 꺼내기 (마인드맵)</h2>
              <p className="text-[12.5px] text-ink-secondary leading-[1.7] mb-5">머릿속에 흩어진 경험을 5개 가지로 한꺼번에 꺼내요.<br /><strong>완성된 문장 말고 단어 나열로 충분해요!</strong> 30초 이상 안 떠오르면 다음 칸으로 넘어가요.</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex gap-3">
                <div className="text-2xl flex-shrink-0"></div>
                <div>
                  <div className="text-[12px] font-bold text-amber-800 mb-1">AI 힌트 — 경험을 꺼내는 팁</div>
                  <div className="text-[12px] text-amber-900 leading-[1.6]">"기억에 남는 사건"보다 "내가 1주일 이상 시간을 들인 일"이 자소서 재료가 돼요. 동아리 활동, 교내 대회, 읽은 책, 친구와 협력한 프로젝트 — 사소해 보여도 다 적어보세요.<br /><strong className="text-sky-700">🏠 학교관심</strong>은 지원동기에 쓸 재료라서 꼭 적어주세요!</div>
                </div>
              </div>
              <div className="flex items-center justify-between mb-4 bg-gray-50 border border-line rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  {MINDMAP_STRUCTURE.map((b, idx) => {
                    const filled = data.mindmap[b.key].filter((s) => s.trim()).length;
                    const isCurrent = idx === currentBranchIdx;
                    const hasContent = filled > 0;
                    return (
                      <button key={b.key} type="button" onClick={() => setCurrentBranchIdx(idx)} className="flex flex-col items-center gap-1 group" title={b.key}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base transition-all ${isCurrent ? "bg-brand-middle text-white scale-110 shadow-[0_4px_12px_rgba(16,185,129,0.3)] ring-4 ring-brand-middle-pale" : hasContent ? "bg-brand-middle-pale border-2 border-brand-middle text-brand-middle-dark" : "bg-white border-2 border-line text-ink-muted group-hover:border-brand-middle-light"}`}>{b.icon}</div>
                        <div className={`text-[10px] font-semibold whitespace-nowrap ${isCurrent ? "text-brand-middle-dark" : hasContent ? "text-brand-middle-dark" : "text-ink-muted"}`}>{b.key}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[12px] font-bold text-ink-secondary tabular-nums">{currentBranchIdx + 1} / {MINDMAP_STRUCTURE.length}</div>
              </div>
              {currentBranch && (
                <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-brand-middle-light rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-white border-2 border-brand-middle-light flex items-center justify-center text-3xl shadow-sm">{currentBranch.icon}</div>
                    <div>
                      <div className="text-[18px] font-extrabold text-ink tracking-tight">{currentBranch.key}</div>
                      <div className="text-[11px] text-ink-secondary mt-0.5">{currentBranchFilled}/4개 적었어요
                        {currentBranch.key === "학교관심" && <span className="ml-2 text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">⭐ 지원동기 재료</span>}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {currentBranch.questions.map((q, i) => (
                      <div key={i}>
                        <div className="text-[12px] font-bold text-ink-secondary mb-1.5 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-brand-middle text-white text-[10px] font-extrabold flex items-center justify-center">{i + 1}</span>{q}
                        </div>
                        <input value={data.mindmap[currentBranch.key][i]} onChange={(e) => updateMindmap(currentBranch.key, i, e.target.value)} placeholder={currentBranch.placeholders[i]} className="w-full h-11 px-3.5 bg-white border border-line rounded-lg text-[13px] focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mt-5 gap-3">
                <button type="button" onClick={() => setCurrentBranchIdx((p) => Math.max(0, p - 1))} disabled={currentBranchIdx === 0} className="h-11 px-5 bg-white border border-line rounded-lg text-[13px] font-semibold text-ink-secondary hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">← 이전</button>
                <div className="text-[11px] text-ink-muted font-medium text-center">
                  {currentBranchIdx === MINDMAP_STRUCTURE.length - 1 ? <span className="text-brand-middle-dark font-bold">✅ 마지막이예요!</span> : <span>다음: <strong className="text-brand-middle-dark">{MINDMAP_STRUCTURE[currentBranchIdx + 1].icon} {MINDMAP_STRUCTURE[currentBranchIdx + 1].key}</strong></span>}
                </div>
                <button type="button" onClick={() => setCurrentBranchIdx((p) => Math.min(MINDMAP_STRUCTURE.length - 1, p + 1))} disabled={currentBranchIdx === MINDMAP_STRUCTURE.length - 1} className="h-11 px-5 bg-brand-middle hover:bg-brand-middle-hover text-white rounded-lg text-[13px] font-semibold transition-all hover:-translate-y-px hover:shadow-btn-middle disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none">다음 →</button>
              </div>
              <div className="mt-5 bg-gray-50 border border-line rounded-lg px-4 py-2.5 text-[12px] text-ink-secondary">
                <span className="font-bold text-brand-middle-dark">총 {filledMindmap}개</span> 경험 적었어요
                {isStep2Done ? " · ✅ 다음 단계로 갈 수 있어요!" : " · 최소 4개 이상 적어주세요"}
              </div>
            </div>
          )}

          {/* 3단계 — 매칭 (학교 항목 동적) */}
          {currentStep === 3 && (
            <div className="bg-white border border-line rounded-2xl p-7 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <h2 className="text-[18px] font-extrabold text-ink mb-2 tracking-tight">3단계 · 경험을 자소서 항목에 연결하기</h2>
              <p className="text-[12.5px] text-ink-secondary leading-[1.7] mb-5">2단계에서 꺼낸 경험들을 <strong>{schoolName}의 {sectionDefs.length}개 자소서 항목</strong>에 매칭해요.<br />각 항목 박스 안에 어떤 경험이 어울리는지 예시를 보여줄게요!</p>
              <div className="grid grid-cols-[280px_1fr] gap-4">
                <div className="bg-gray-50 border border-line rounded-xl p-3">
                  <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2 px-1">📦 내 경험 카드 ({experienceCards.length}개)</div>
                  {experienceCards.length === 0 ? (
                    <div className="text-[11px] text-ink-muted text-center py-6">2단계에서<br />경험을 먼저 적어주세요</div>
                  ) : (
                    experienceCards.map((card, i) => {
                      const used = usedExperiences.has(card.text);
                      return (
                        <div key={i} className={`bg-white border rounded-lg px-3 py-2 mb-1.5 transition-all ${used ? "opacity-40 border-line" : "border-line"}`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${CATEGORY_COLORS[card.category]}`}>{card.branchIcon} {card.category}</span>
                            {used && <span className="text-[9px] text-ink-muted">매칭됨</span>}
                          </div>
                          <div className="text-[12px] text-ink leading-[1.5] mb-1.5">{card.text}</div>
                          {!used && (
                            <div className="grid grid-cols-2 gap-1">
                              {sectionDefs.map((sec) => (
                                <button key={sec.key} type="button" onClick={() => moveExpToSection(card.text, sec.key)} className="text-[10px] font-semibold py-1 rounded bg-brand-middle-pale text-brand-middle-dark hover:bg-brand-middle hover:text-white transition-colors">
                                  {sec.icon} {sec.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="space-y-3">
                  {sectionDefs.map((sec) => {
                    const matched = data.matching[sec.key] || [];
                    const examples = MATCHING_EXAMPLES[sec.key] || ["- 이 항목 주제에 맞는 경험을 매칭하세요"];
                    return (
                      <div key={sec.key} className={`border-2 rounded-xl p-4 transition-all ${matched.length > 0 ? "border-brand-middle bg-brand-middle-pale/40" : "border-dashed border-line bg-white"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[13px] font-bold text-ink">{sec.icon} {sec.label}</div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${matched.length > 0 ? "bg-brand-middle text-white" : "bg-gray-100 text-ink-muted"}`}>{matched.length > 0 ? `${matched.length}개 매칭` : "매칭 필요"}</span>
                        </div>
                        {matched.length === 0 && (
                          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-2">
                            <div className="text-[10.5px] font-bold text-amber-800 mb-1.5">💡 이런 경험이 잘 어울려요</div>
                            <div className="space-y-1">{examples.map((ex, i) => <div key={i} className="text-[11px] text-amber-900 leading-[1.5]">{ex}</div>)}</div>
                            <div className="text-[10.5px] text-amber-700 mt-2 pt-1.5 border-t border-amber-200/60">👈 왼쪽 경험 카드에서 "<strong>{sec.label}</strong>" 버튼을 눌러 추가하세요</div>
                          </div>
                        )}
                        {matched.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {matched.map((text) => (
                              <span key={text} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-brand-middle-light rounded-full text-[11px] font-semibold text-brand-middle-dark">
                                {text}
                                <button type="button" onClick={() => removeExpFromSection(text, sec.key)} className="text-ink-muted hover:text-red-500 ml-1">✕</button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-5 bg-gray-50 border border-line rounded-lg px-4 py-2.5 text-[12px] text-ink-secondary">
                <span className="font-bold text-brand-middle-dark">{matchedCount}개</span> 경험 매칭됨
                {isStep3Done ? " · ✅ 다음 단계로 갈 수 있어요!" : " · 최소 2개 이상 매칭해주세요"}
              </div>
            </div>
          )}

          {/* 4단계 — 작성 (학교 항목 동적) */}
          {currentStep === 4 && (
            <div className="grid grid-cols-[340px_1fr] gap-4 items-start">
              <div className="bg-white border border-line rounded-2xl p-5 shadow-[0_4px_16px_rgba(15,23,42,0.04)] sticky top-0 max-h-[calc(100vh-220px)] overflow-y-auto">
                <div className="text-[14px] font-extrabold text-ink mb-1 flex items-center gap-1.5">📋 내 참고 자료</div>
                <div className="text-[10px] text-ink-muted mb-4 leading-[1.5]">오른쪽 답변 작성할 때 이걸 보면서 쓰세요!</div>
                <div className="mb-5">
                  <div className="text-[11px] font-extrabold text-brand-middle-dark uppercase tracking-wider mb-2 flex items-center gap-1">🎯 내 키워드 ({filledKeywords}/5)</div>
                  {data.keywords.filter((k) => k.keyword.trim()).length === 0 ? (
                    <div className="text-[11px] text-ink-muted bg-gray-50 rounded-lg px-3 py-3 text-center">1단계에서 키워드를 먼저 적어주세요</div>
                  ) : (
                    <div className="space-y-1.5">
                      {data.keywords.filter((k) => k.keyword.trim()).map((kw, i) => (
                        <div key={i} className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-brand-middle-light rounded-lg px-3 py-2">
                          <div className="text-[12px] font-extrabold text-brand-middle-dark">#{kw.keyword}</div>
                          {kw.experience && <div className="text-[10px] text-ink-secondary mt-0.5 leading-[1.4]">💭 {kw.experience}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="border-t border-line my-4" />
                <div className="mb-3">
                  <div className="text-[11px] font-extrabold text-brand-middle-dark uppercase tracking-wider mb-2 flex items-center gap-1">📌 {defByKey(activeSectionTab)?.label}에 매칭한 경험 ({matchedCardsForCurrentSection.length}개)</div>
                  {matchedCardsForCurrentSection.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                      <div className="text-[10.5px] text-amber-800 leading-[1.5] mb-1.5">⚠️ 이 항목에 매칭된 경험이 없어요</div>
                      <button type="button" onClick={() => setCurrentStep(3)} className="text-[10.5px] font-bold text-amber-900 underline hover:text-amber-700">← 3단계로 돌아가기</button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {matchedCardsForCurrentSection.map((card) => {
                        const isExpanded = expandedExp === card.text;
                        return (
                          <div key={card.text} className={`bg-white border rounded-lg overflow-hidden transition-all ${isExpanded ? "border-brand-middle shadow-sm" : "border-line"}`}>
                            <button type="button" onClick={() => setExpandedExp(isExpanded ? null : card.text)} className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors">
                              <div className="flex items-start gap-1.5 mb-1">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${CATEGORY_COLORS[card.category]}`}>{card.branchIcon}</span>
                                <span className="text-[11.5px] font-bold text-ink leading-[1.4] flex-1">{card.text}</span>
                                <span className={`text-[10px] text-ink-muted flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="px-3 pb-2.5 bg-gradient-to-br from-emerald-50/40 to-white border-t border-brand-middle-light/50">
                                <div className="text-[9px] font-bold text-ink-muted uppercase tracking-wider mt-2 mb-1">📍 2단계 위치</div>
                                <div className="bg-white border border-line rounded px-2 py-1.5 mb-2">
                                  <div className="text-[10px] text-ink-secondary">{card.branchIcon} {card.category} 가지의</div>
                                  <div className="text-[10.5px] font-bold text-brand-middle-dark">"{card.questionLabel}"</div>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                                  <div className="text-[10px] text-amber-800 leading-[1.4]">💡 <strong>팁:</strong> 언제/어디서/무엇을/어떻게 했는지 구체적으로! 숫자 넣으면 좋아요.</div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-line">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">🗂️ 전체 매칭 현황</div>
                  {sectionDefs.map((sec) => (
                    <button key={sec.key} type="button" onClick={() => { setActiveSectionTab(sec.key); setExpandedExp(null); }} className={`w-full flex items-center justify-between px-2 py-1.5 mb-1 rounded transition-colors ${activeSectionTab === sec.key ? "bg-brand-middle-pale" : "hover:bg-gray-50"}`}>
                      <span className={`text-[11px] font-semibold ${activeSectionTab === sec.key ? "text-brand-middle-dark" : "text-ink-secondary"}`}>{sec.icon} {sec.label}</span>
                      <span className="text-[10px] font-bold text-brand-middle-dark">{(data.matching[sec.key] || []).length}개</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                <h2 className="text-[18px] font-extrabold text-ink mb-2 tracking-tight">4단계 · 항목별로 차근차근 작성</h2>
                <p className="text-[12px] text-ink-secondary leading-[1.7] mb-4">← 왼쪽 참고 자료를 보면서 답변을 작성해보세요!</p>
                <div className="flex gap-1 mb-5 bg-gray-50 p-1 rounded-lg flex-wrap">
                  {sectionDefs.map((sec) => {
                    const filled = Object.values(data.sections[sec.key] || EMPTY_SUB).filter((v) => v.trim()).length;
                    return (
                      <button key={sec.key} type="button" onClick={() => { setActiveSectionTab(sec.key); setExpandedExp(null); }} className={`flex-1 min-w-0 h-10 px-1.5 rounded-md text-[11px] font-bold transition-all truncate ${activeSectionTab === sec.key ? "bg-brand-middle text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)]" : "text-ink-muted hover:text-ink"}`}>
                        {filled > 0 && <span className={`mr-1 ${activeSectionTab === sec.key ? "text-white" : "text-brand-middle"}`}>✓</span>}{sec.icon} {sec.label}
                      </button>
                    );
                  })}
                </div>
                <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-4 py-3 mb-4">
                  <div className="text-[11px] font-bold text-brand-middle-dark mb-0.5">자소서 {sectionKeys.indexOf(activeSectionTab) + 1}번 항목</div>
                  <div className="text-[14px] font-extrabold text-ink mb-1">{defByKey(activeSectionTab)?.icon} {defByKey(activeSectionTab)?.label}</div>
                  <div className="text-[11px] text-ink-secondary">권장 분량: 350~400자 · 현재 <span className="font-bold text-brand-middle-dark">{draftFor(activeSectionTab).replace(/\s/g, "").length}자</span></div>
                </div>
                {guideFor(activeSectionTab, schoolName).map((q, i) => {
                  const fieldKey = `q${i + 1}` as keyof SubAnswer;
                  const value = (data.sections[activeSectionTab] || EMPTY_SUB)[fieldKey];
                  return (
                    <div key={i} className="mb-4 border border-line rounded-xl p-4 bg-gray-50">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="w-6 h-6 rounded-full bg-brand-middle text-white text-[12px] font-extrabold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <span className="text-[14px] font-bold text-ink leading-[1.5]">{q.title}</span>
                      </div>
                      <div className="text-[11px] text-ink-secondary leading-[1.6] mb-1.5 ml-8">{q.guide}</div>
                      <div className="text-[11px] text-ink-muted leading-[1.6] mb-2 ml-8 italic"><strong className="not-italic">예시:</strong> {q.example}</div>
                      <textarea value={value} onChange={(e) => updateSubAnswer(activeSectionTab, fieldKey, e.target.value)} placeholder="자유롭게 적어요. 나중에 다듬을 거라 일단 생각나는 대로!" rows={3} className="w-full px-3 py-2 bg-white border border-line rounded-lg text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted" />
                      <div className="text-right text-[10px] text-ink-muted mt-1">{value.replace(/\s/g, "").length}자</div>
                    </div>
                  );
                })}
                <div className="mt-5 bg-gradient-to-br from-brand-middle-pale to-white border-2 border-brand-middle-light rounded-xl p-4">
                  <div className="text-[12px] font-bold text-brand-middle-dark mb-2">✨ {defByKey(activeSectionTab)?.label} 자소서 초안 (4개 답변 합침)</div>
                  <div className="bg-white border border-line rounded-lg px-3 py-3 text-[13px] text-ink leading-[1.8] min-h-[80px]">
                    {draftFor(activeSectionTab) || <span className="text-ink-muted italic">→ 4개 답변을 채우면 여기에 초안이 자동 생성돼요</span>}
                  </div>
                </div>
                <div className="mt-5 bg-gray-50 border border-line rounded-lg px-4 py-2.5 text-[12px] text-ink-secondary">
                  <span className="font-bold text-brand-middle-dark">{filledSections}/{sectionDefs.length}</span> 항목 작성 시작됨
                  {isStep4Done ? " · ✅ 다음 단계로 갈 수 있어요!" : " · 최소 2개 항목 이상 작성해주세요"}
                </div>
              </div>
            </div>
          )}

          {/* 5단계 — 점검 (학교 항목 동적) */}
          {currentStep === 5 && (
            <div className="bg-white border border-line rounded-2xl p-7 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <h2 className="text-[18px] font-extrabold text-ink mb-2 tracking-tight">5단계 · 전체 자소서 점검 후 제출</h2>
              <p className="text-[12.5px] text-ink-secondary leading-[1.7] mb-5">{sectionDefs.length}개 항목을 합친 전체 자소서예요. 셀프 점검 후 선생님께 제출하세요.</p>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-gray-50 border border-line rounded-xl p-3 text-center">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">전체 글자수</div>
                  <div className={`text-[18px] font-extrabold ${totalCharCount > 1500 ? "text-red-500" : "text-brand-middle-dark"}`}>{totalCharCount} / 1,500</div>
                </div>
                <div className="bg-gray-50 border border-line rounded-xl p-3 text-center">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">키워드 등장</div>
                  <div className={`text-[18px] font-extrabold ${keywordAppearedCount === filledKeywords && filledKeywords > 0 ? "text-emerald-600" : "text-amber-600"}`}>{keywordAppearedCount}/{filledKeywords}</div>
                </div>
                <div className="bg-gray-50 border border-line rounded-xl p-3 text-center">
                  <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1">경험 반영</div>
                  <div className={`text-[18px] font-extrabold ${experienceAppearedCount === totalMatchedExp && totalMatchedExp > 0 ? "text-emerald-600" : "text-amber-600"}`}>{experienceAppearedCount}/{totalMatchedExp}</div>
                </div>
              </div>

              {keywordCheck.length > 0 && (
                <div className="mb-5 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-brand-middle-light rounded-xl p-4">
                  <div className="text-[13px] font-extrabold text-brand-middle-dark mb-1">1단계 키워드가 자소서에 등장하는지 자동 체크</div>
                  <div className="text-[11px] text-ink-secondary mb-3">키워드 자체나 그 키워드의 경험 단어가 자소서 본문에 등장하면 ✅로 표시돼요!</div>
                  <div className="grid grid-cols-2 gap-2">
                    {keywordCheck.map((k, i) => (
                      <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${k.appears ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                        <span className="text-[16px] flex-shrink-0">{k.appears ? "✅" : "⚠️"}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-[12px] font-bold ${k.appears ? "text-emerald-700" : "text-amber-700"}`}>#{k.keyword}</div>
                          <div className={`text-[10px] ${k.appears ? "text-emerald-600" : "text-amber-600"}`}>{k.appears ? "자소서에 등장!" : "아직 등장 안 함"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {experienceCheck.length > 0 && (
                <div className="mb-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="text-[13px] font-extrabold text-blue-900 mb-1">3단계에서 매칭한 경험이 자소서에 반영됐는지 체크</div>
                  <div className="text-[11px] text-ink-secondary mb-3">경험의 핵심 단어가 해당 항목 자소서에 있으면 ✅로 표시돼요!</div>
                  <div className="space-y-2">
                    {sectionDefs.map((sec) => {
                      const sectionExps = experienceCheck.filter((e) => e.section === sec.key);
                      if (sectionExps.length === 0) return null;
                      return (
                        <div key={sec.key} className="bg-white border border-blue-100 rounded-lg p-2.5">
                          <div className="text-[11px] font-bold text-blue-900 mb-1.5">{sec.icon} {sec.label}</div>
                          <div className="space-y-1">
                            {sectionExps.map((exp, i) => (
                              <div key={i} className={`flex items-start gap-1.5 text-[11px] leading-[1.5] ${exp.appears ? "text-emerald-700" : "text-amber-700"}`}>
                                <span className="flex-shrink-0">{exp.appears ? "✅" : "⚠️"}</span>
                                <span className="flex-1">{exp.text}<span className="text-[10px] ml-1 opacity-70">{exp.appears ? "(반영됨)" : "(반영 필요)"}</span></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {sectionDefs.map((sec) => {
                  const draft = draftFor(sec.key);
                  const allKeywords = data.keywords.filter((k) => k.keyword.trim());
                  const allExperiences: string[] = [];
                  (Object.keys(data.mindmap) as Array<keyof MindmapBranch>).forEach((branch) => {
                    data.mindmap[branch].forEach((exp) => { if (exp.trim()) allExperiences.push(exp.trim()); });
                  });
                  return (
                    <div key={sec.key} className="border border-line rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[13px] font-bold text-ink">{sec.icon} {sec.label}</div>
                        <span className="text-[10px] text-ink-muted">{draft.replace(/\s/g, "").length}자</span>
                      </div>
                      <div className="text-[13px] text-ink leading-[1.8] mb-2">{draft || <span className="text-ink-muted italic">아직 작성 안 됨</span>}</div>
                      {draft && allKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 items-center mt-2 pt-2 border-t border-line-light">
                          <span className="text-[10px] text-ink-muted mr-1">🎯 키워드:</span>
                          {allKeywords.map((k, i) => {
                            const allWords = [k.keyword, ...extractMeaningfulWords(k.keyword), ...(k.experience ? extractMeaningfulWords(k.experience) : [])];
                            const inThis = allWords.some((w) => draft.includes(w));
                            return <span key={i} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${inThis ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-400 border border-gray-200"}`}>{inThis ? "✓" : "✕"} {k.keyword}</span>;
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="text-[13px] font-extrabold text-amber-900 mb-3">✅ 제출 전 셀프 점검</div>
                {['모든 항목이 "같은 사람의 같은 이야기"로 연결돼요', "내가 정한 키워드가 자연스럽게 등장해요 (위에서 자동 체크됨!)", "추상적 표현 대신 구체적인 사건·숫자가 들어갔어요", "학교 특성과 내 경험이 어떻게 만나는지 설명했어요", "띄어쓰기 제외 1,500자 이내예요"].map((text, i) => (
                  <label key={i} className="flex items-start gap-2 mb-2 cursor-pointer">
                    <input type="checkbox" checked={checklist[i]} onChange={() => setChecklist((prev) => prev.map((v, idx) => (idx === i ? !v : v)))} className="mt-0.5 accent-brand-middle" />
                    <span className="text-[12.5px] text-ink leading-[1.6]">{text}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 6단계 — 피드백 (학교 항목 동적) */}
          {currentStep === 6 && (
            <div className="bg-white border border-line rounded-2xl p-7 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-[18px] font-extrabold text-ink tracking-tight">6단계 · 선생님 피드백 받기 + 수정</h2>
                {savedWizard?.submitted && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">✓ 제출완료</span>}
              </div>
              <p className="text-[12.5px] text-ink-secondary leading-[1.7] mb-5">항목별로 선생님 피드백을 받고, 그에 맞춰 자소서를 수정해보세요.<br />수정한 후 <strong>재제출</strong>하면 선생님이 추가 피드백을 드려요.</p>
              {sectionDefs.map((sec) => {
                const sectionFeedbacks = savedWizard?.feedback?.[sec.key] || [];
                const draft = draftFor(sec.key);
                return (
                  <div key={sec.key} className="mb-6 border border-line rounded-xl p-5 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[14px] font-extrabold text-ink">{sec.icon} {sec.label}</div>
                      <span className="text-[11px] text-ink-muted">{draft.replace(/\s/g, "").length}자</span>
                    </div>
                    <div className="bg-white border border-line rounded-lg px-4 py-3 mb-3">
                      <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">📝 내 자소서</div>
                      <div className="text-[13px] text-ink leading-[1.8] whitespace-pre-wrap">{draft || <span className="text-ink-muted italic">아직 작성 안 됨</span>}</div>
                    </div>
                    {sectionFeedbacks.length > 0 ? (
                      <div className="bg-brand-middle-pale border border-brand-middle-light rounded-lg px-4 py-3 mb-3">
                        <div className="text-[11px] font-bold text-brand-middle-dark mb-2 flex items-center gap-1">💬 선생님 피드백 ({sectionFeedbacks.length}차)</div>
                        <div className="space-y-2">
                          {sectionFeedbacks.map((fb: any, i: number) => (
                            <div key={i} className="bg-white border border-brand-middle-light rounded-md px-3 py-2">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[9px] font-extrabold text-white bg-brand-middle px-1.5 py-0.5 rounded-full">{fb.round}차</span>
                                <span className="text-[9px] text-ink-muted">{new Date(fb.created_at).toLocaleDateString("ko-KR")}</span>
                              </div>
                              <div className="text-[12.5px] text-brand-middle-dark leading-[1.7] whitespace-pre-wrap">{fb.text}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-3 text-center">
                        <div className="text-[12px] text-amber-800 font-medium">💬 선생님 피드백을 기다리는 중이에요...</div>
                      </div>
                    )}
                    {sectionFeedbacks.length > 0 && (
                      <div className="bg-white border-2 border-dashed border-brand-middle rounded-lg p-3">
                        <div className="text-[11px] font-bold text-brand-middle-dark mb-2">✏️ 피드백 반영해서 수정하기</div>
                        {guideFor(sec.key, schoolName).map((q, i) => {
                          const fieldKey = `q${i + 1}` as keyof SubAnswer;
                          const value = (data.sections[sec.key] || EMPTY_SUB)[fieldKey];
                          return (
                            <div key={i} className="mb-2">
                              <div className="text-[11px] font-semibold text-ink-secondary mb-1">{i + 1}. {q.title}</div>
                              <textarea value={value} onChange={(e) => updateSubAnswer(sec.key, fieldKey, e.target.value)} rows={2} className="w-full px-3 py-2 bg-white border border-line rounded text-[12.5px] leading-[1.6] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-5">
                <div className="text-[12px] text-blue-900 leading-[1.7]">💡 <strong>팁:</strong> 선생님 피드백은 학원 어드민에서 작성됩니다. 피드백이 도착하면 위 항목별로 보여요. 수정한 후 하단 <strong>재제출</strong> 버튼을 눌러주세요.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-t border-line px-6 py-3 flex-shrink-0">
        <div className="max-w-[900px] mx-auto flex items-center justify-between">
          <button type="button" onClick={() => setCurrentStep((p) => Math.max(1, p - 1))} disabled={currentStep === 1} className="h-10 px-5 bg-white border border-line rounded-lg text-[13px] font-semibold text-ink-secondary hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">← 이전 단계</button>
          <div className="text-[11px] text-ink-muted font-medium">{currentStep} / 6 단계</div>
          {currentStep < 5 && (
            <button type="button" onClick={() => setCurrentStep((p) => Math.min(6, p + 1))} className="h-10 px-5 bg-brand-middle hover:bg-brand-middle-hover text-white rounded-lg text-[13px] font-semibold transition-all hover:-translate-y-px hover:shadow-btn-middle">다음 단계 →</button>
          )}
          {currentStep === 5 && (
            <button type="button" onClick={async () => {
              try {
                await submitToTeacher.mutateAsync(essayId);
                await onComplete(buildFinalContent());
                setCurrentStep(6);
              } catch (e) { console.error("제출 실패:", e); alert("제출에 실패했어요. 다시 시도해주세요."); }
            }} disabled={!isStep4Done || totalCharCount > 1500 || submitToTeacher.isPending}
              className={`h-10 px-5 rounded-lg text-[13px] font-bold transition-all ${isStep4Done && totalCharCount <= 1500 && !submitToTeacher.isPending ? "bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle" : "bg-gray-100 text-ink-muted cursor-not-allowed"}`}>
              {submitToTeacher.isPending ? "제출 중..." : "선생님께 제출하기"}
            </button>
          )}
          {currentStep === 6 && (
            <button type="button" onClick={async () => {
              try {
                await onComplete(buildFinalContent());
                alert("✅ 수정한 자소서가 저장되었어요!\n선생님이 추가 피드백을 드릴 거예요.");
              } catch (e) { alert("저장 실패. 다시 시도해주세요."); }
            }} disabled={saveWizard.isPending}
              className="h-10 px-5 rounded-lg text-[13px] font-bold transition-all bg-brand-middle hover:bg-brand-middle-hover text-white hover:-translate-y-px hover:shadow-btn-middle">
              수정 자소서 재제출
            </button>
          )}
        </div>
      </div>
    </div>
  );
}