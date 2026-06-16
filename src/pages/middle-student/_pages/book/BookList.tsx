import { useState, useRef, useEffect } from "react";
import { useAtomValue } from "jotai";
import { studentState, academyState } from "@/lib/auth/atoms";
import { searchBooksPaged, type BookSearchResult } from "@/lib/kakaoBooks";
import {
  useMyBooks,
  useAddBook,
  useUpdateBookRecord,
  useBookFeedback,
} from "@/pages/middle-student/_hooks/useBooklist";
import { useMiddleConceptData } from "@/pages/middle-student/_hooks/useMiddleConceptData";

// ── 분야 → 세부 카테고리 구조 ──────────────────────────────
const CATEGORY_MAP: Record<string, { label: string; keyword: string }[]> = {
  "🩺 의학": [
    { label: "의학 입문", keyword: "의학 입문" },
    { label: "내과학", keyword: "내과학" },
    { label: "외과학", keyword: "외과학" },
    { label: "소아과학", keyword: "소아과학" },
    { label: "산부인과학", keyword: "산부인과학" },
    { label: "정신의학", keyword: "정신의학" },
    { label: "신경과학", keyword: "신경과학" },
    { label: "응급의학", keyword: "응급의학" },
    { label: "재활의학", keyword: "재활의학" },
    { label: "피부과학", keyword: "피부과학" },
    { label: "안과학", keyword: "안과학" },
    { label: "이비인후과", keyword: "이비인후과" },
    { label: "영상의학", keyword: "영상의학" },
    { label: "병리학", keyword: "병리학" },
    { label: "해부학", keyword: "해부학" },
    { label: "생리학", keyword: "생리학" },
    { label: "약리학", keyword: "약리학" },
    { label: "면역학", keyword: "면역학" },
    { label: "감염병학", keyword: "감염병학" },
    { label: "종양학", keyword: "종양학" },
    { label: "의료 윤리", keyword: "의료 윤리" },
    { label: "의사 에세이", keyword: "의사 에세이" },
    { label: "공중보건", keyword: "공중보건" },
    { label: "의료 인류학", keyword: "의료 인류학" },
    { label: "디지털 헬스케어", keyword: "디지털 헬스케어" },
    { label: "의학 역사", keyword: "의학 역사" },
    { label: "노인의학", keyword: "노인의학" },
    { label: "예방의학", keyword: "예방의학" },
    { label: "한의학", keyword: "한의학" },
    { label: "줄기세포 연구", keyword: "줄기세포 연구" },
  ],
  "💊 약학": [
    { label: "약학 입문", keyword: "약학 입문" },
    { label: "약물학", keyword: "약물학" },
    { label: "약제학", keyword: "약제학" },
    { label: "임상약학", keyword: "임상약학" },
    { label: "약물동태학", keyword: "약물동태학" },
    { label: "독성학", keyword: "독성학" },
    { label: "천연물 약학", keyword: "천연물 약학" },
    { label: "한약학", keyword: "한약학" },
    { label: "신약 개발", keyword: "신약 개발" },
    { label: "제약산업", keyword: "제약산업" },
    { label: "항생제", keyword: "항생제" },
    { label: "항암제", keyword: "항암제" },
    { label: "백신 과학", keyword: "백신 과학" },
    { label: "약물 중독", keyword: "약물 중독" },
    { label: "의약품 규제", keyword: "의약품 규제" },
    { label: "바이오의약품", keyword: "바이오의약품" },
    { label: "약사 에세이", keyword: "약사 에세이" },
    { label: "조제학", keyword: "조제학" },
    { label: "병원 약학", keyword: "병원 약학" },
    { label: "사회약학", keyword: "사회약학" },
    { label: "약학 윤리", keyword: "약학 윤리" },
    { label: "유전체 약학", keyword: "유전체 약학" },
    { label: "나노의약", keyword: "나노의약" },
    { label: "면역약학", keyword: "면역약학" },
    { label: "영양약학", keyword: "영양약학" },
    { label: "약학 역사", keyword: "약학 역사" },
    { label: "화장품 과학", keyword: "화장품 과학" },
    { label: "의료기기", keyword: "의료기기" },
    { label: "임상시험", keyword: "임상시험" },
    { label: "약물유전체학", keyword: "약물유전체학" },
  ],
  "🦷 치의학": [
    { label: "치의학 입문", keyword: "치의학 입문" },
    { label: "구강해부학", keyword: "구강해부학" },
    { label: "구강병리학", keyword: "구강병리학" },
    { label: "보존치학", keyword: "보존치학" },
    { label: "치주과학", keyword: "치주과학" },
    { label: "구강외과학", keyword: "구강외과학" },
    { label: "교정치과학", keyword: "교정치과학" },
    { label: "소아치과학", keyword: "소아치과학" },
    { label: "보철치과학", keyword: "보철치과학" },
    { label: "구강내과학", keyword: "구강내과학" },
    { label: "임플란트", keyword: "임플란트" },
    { label: "심미치과", keyword: "심미치과" },
    { label: "구강보건", keyword: "구강보건" },
    { label: "디지털 치의학", keyword: "디지털 치의학" },
    { label: "치과재료학", keyword: "치과재료학" },
    { label: "구강미생물학", keyword: "구강미생물학" },
    { label: "치의학 윤리", keyword: "치의학 윤리" },
    { label: "치과 역사", keyword: "치과 역사" },
    { label: "치과 에세이", keyword: "치과 에세이" },
    { label: "노인 치의학", keyword: "노인 치의학" },
    { label: "구강암", keyword: "구강암" },
    { label: "치과 공중보건", keyword: "치과 공중보건" },
    { label: "특수 환자 치과", keyword: "특수 환자 치과" },
    { label: "치과 경영", keyword: "치과 경영" },
    { label: "구강 수면의학", keyword: "구강 수면의학" },
    { label: "치과 방사선학", keyword: "치과 방사선학" },
    { label: "구강 면역학", keyword: "구강 면역학" },
    { label: "턱관절 질환", keyword: "턱관절 질환" },
    { label: "치아 미백", keyword: "치아 미백" },
    { label: "구강 위생", keyword: "구강 위생" },
  ],
  "🐾 수의학": [
    { label: "수의학 입문", keyword: "수의학 입문" },
    { label: "동물 해부학", keyword: "동물 해부학" },
    { label: "수의 내과학", keyword: "수의 내과학" },
    { label: "수의 외과학", keyword: "수의 외과학" },
    { label: "수의 병리학", keyword: "수의 병리학" },
    { label: "동물 감염병", keyword: "동물 감염병" },
    { label: "반려동물 의학", keyword: "반려동물 의학" },
    { label: "야생동물 의학", keyword: "야생동물 의학" },
    { label: "동물원 의학", keyword: "동물원 의학" },
    { label: "수산동물 의학", keyword: "수산동물 의학" },
    { label: "말 의학", keyword: "말 의학" },
    { label: "소 의학", keyword: "소 의학" },
    { label: "돼지 의학", keyword: "돼지 의학" },
    { label: "닭 의학", keyword: "닭 의학" },
    { label: "동물 행동학", keyword: "동물 행동학" },
    { label: "동물 복지", keyword: "동물 복지" },
    { label: "인수공통 감염병", keyword: "인수공통 감염병" },
    { label: "수의 약리학", keyword: "수의 약리학" },
    { label: "동물 영양학", keyword: "동물 영양학" },
    { label: "동물 번식학", keyword: "동물 번식학" },
    { label: "수의 영상학", keyword: "수의 영상학" },
    { label: "동물 마취학", keyword: "동물 마취학" },
    { label: "수의 공중보건", keyword: "수의 공중보건" },
    { label: "식품 위생", keyword: "식품 위생" },
    { label: "동물 생태학", keyword: "동물 생태학" },
    { label: "동물 보호", keyword: "동물 보호" },
    { label: "수의사 에세이", keyword: "수의사 에세이" },
    { label: "동물 심리학", keyword: "동물 심리학" },
    { label: "멸종위기 동물", keyword: "멸종위기 동물" },
    { label: "원헬스", keyword: "원헬스" },
  ],
  "⚖️ 법학": [
    { label: "법학 입문", keyword: "법학 입문" },
    { label: "헌법", keyword: "헌법" },
    { label: "민법", keyword: "민법" },
    { label: "형사법", keyword: "형사법" },
    { label: "행정법", keyword: "행정법" },
    { label: "상법", keyword: "상법" },
    { label: "노동법", keyword: "노동법" },
    { label: "국제법", keyword: "국제법" },
    { label: "법철학", keyword: "법철학" },
    { label: "법사학", keyword: "법사학" },
    { label: "민사소송법", keyword: "민사소송법" },
    { label: "형사소송법", keyword: "형사소송법" },
    { label: "헌법재판", keyword: "헌법재판" },
    { label: "인권법", keyword: "인권법" },
    { label: "환경법", keyword: "환경법" },
    { label: "IT/정보법", keyword: "정보법 IT" },
    { label: "지적재산권", keyword: "지적재산권" },
    { label: "국제인권법", keyword: "국제인권법" },
    { label: "사회정의", keyword: "사회정의" },
    { label: "법조 에세이", keyword: "법조인 에세이" },
    { label: "범죄학", keyword: "범죄학" },
    { label: "청소년법", keyword: "청소년법" },
    { label: "의료법", keyword: "의료법" },
    { label: "소비자법", keyword: "소비자법" },
    { label: "조세법", keyword: "조세법" },
    { label: "금융법", keyword: "금융법" },
    { label: "AI와 법", keyword: "인공지능 법" },
    { label: "로스쿨 입문", keyword: "로스쿨 입문" },
    { label: "법과 경제", keyword: "법경제학" },
    { label: "비교법학", keyword: "비교법학" },
  ],
  "🏛️ 정치/외교": [
    { label: "정치학 입문", keyword: "정치학 입문" },
    { label: "민주주의", keyword: "민주주의" },
    { label: "권위주의", keyword: "권위주의" },
    { label: "국제관계론", keyword: "국제관계론" },
    { label: "외교론", keyword: "외교론" },
    { label: "안보론", keyword: "안보론" },
    { label: "정치사상", keyword: "정치사상" },
    { label: "정치제도론", keyword: "정치제도론" },
    { label: "선거와 정당", keyword: "선거 정당" },
    { label: "한국 정치", keyword: "한국 정치" },
    { label: "미국 정치", keyword: "미국 정치" },
    { label: "동아시아 정치", keyword: "동아시아 정치" },
    { label: "유럽 정치", keyword: "유럽 정치" },
    { label: "국제기구", keyword: "국제기구" },
    { label: "외교사", keyword: "외교 역사" },
    { label: "한반도 문제", keyword: "한반도 통일" },
    { label: "글로벌 거버넌스", keyword: "글로벌 거버넌스" },
    { label: "정치 경제학", keyword: "정치경제학" },
    { label: "비교정치", keyword: "비교정치" },
    { label: "시민사회", keyword: "시민사회" },
    { label: "공공정책", keyword: "공공정책" },
    { label: "국제분쟁", keyword: "국제분쟁" },
    { label: "난민과 이주", keyword: "난민 이주" },
    { label: "기후외교", keyword: "기후외교" },
    { label: "핵·군비통제", keyword: "핵군비통제" },
    { label: "사이버 안보", keyword: "사이버 안보" },
    { label: "정치 에세이", keyword: "정치 에세이" },
    { label: "지정학", keyword: "지정학" },
    { label: "국제정치경제", keyword: "국제정치경제" },
    { label: "평화학", keyword: "평화학" },
  ],
  "💻 컴퓨터/IT": [
    { label: "컴퓨터 과학 입문", keyword: "컴퓨터과학 입문" },
    { label: "프로그래밍 기초", keyword: "프로그래밍 기초" },
    { label: "파이썬", keyword: "파이썬 Python" },
    { label: "자바", keyword: "자바 Java" },
    { label: "웹 개발", keyword: "웹 개발" },
    { label: "앱 개발", keyword: "앱 개발" },
    { label: "인공지능 입문", keyword: "인공지능 입문" },
    { label: "머신러닝", keyword: "머신러닝" },
    { label: "딥러닝", keyword: "딥러닝" },
    { label: "자연어처리", keyword: "자연어처리 NLP" },
    { label: "컴퓨터 비전", keyword: "컴퓨터 비전" },
    { label: "데이터사이언스", keyword: "데이터사이언스" },
    { label: "빅데이터", keyword: "빅데이터" },
    { label: "클라우드 컴퓨팅", keyword: "클라우드 컴퓨팅" },
    { label: "사이버보안", keyword: "사이버보안" },
    { label: "네트워크", keyword: "네트워크" },
    { label: "운영체제", keyword: "운영체제" },
    { label: "알고리즘", keyword: "알고리즘" },
    { label: "데이터구조", keyword: "자료구조" },
    { label: "데이터베이스", keyword: "데이터베이스" },
    { label: "블록체인", keyword: "블록체인" },
    { label: "메타버스", keyword: "메타버스" },
    { label: "IoT", keyword: "사물인터넷 IoT" },
    { label: "로봇공학", keyword: "로봇공학" },
    { label: "게임 개발", keyword: "게임 개발" },
    { label: "UI/UX 디자인", keyword: "UX 디자인" },
    { label: "스타트업 기술", keyword: "스타트업 기술" },
    { label: "IT 에세이", keyword: "IT 에세이" },
    { label: "미래기술", keyword: "미래기술" },
    { label: "양자컴퓨팅", keyword: "양자컴퓨팅" },
  ],
  "🔧 공학": [
    { label: "공학 입문", keyword: "공학 입문" },
    { label: "기계공학", keyword: "기계공학" },
    { label: "전자공학", keyword: "전자공학" },
    { label: "전기공학", keyword: "전기공학" },
    { label: "화학공학", keyword: "화학공학" },
    { label: "재료공학", keyword: "재료공학" },
    { label: "항공우주공학", keyword: "항공우주공학" },
    { label: "자동차공학", keyword: "자동차공학" },
    { label: "로봇공학", keyword: "로봇공학" },
    { label: "반도체공학", keyword: "반도체공학" },
    { label: "나노기술", keyword: "나노기술" },
    { label: "에너지공학", keyword: "에너지공학" },
    { label: "원자력공학", keyword: "원자력공학" },
    { label: "바이오공학", keyword: "바이오공학" },
    { label: "환경공학", keyword: "환경공학" },
    { label: "토목공학", keyword: "토목공학" },
    { label: "해양공학", keyword: "해양공학" },
    { label: "산업공학", keyword: "산업공학" },
    { label: "제어공학", keyword: "제어공학" },
    { label: "통신공학", keyword: "통신공학" },
    { label: "광공학", keyword: "광공학" },
    { label: "플라즈마공학", keyword: "플라즈마공학" },
    { label: "3D 프린팅", keyword: "3D 프린팅" },
    { label: "자율주행", keyword: "자율주행" },
    { label: "스마트 팩토리", keyword: "스마트팩토리" },
    { label: "엔지니어 에세이", keyword: "엔지니어 에세이" },
    { label: "공학 윤리", keyword: "공학 윤리" },
    { label: "기술 역사", keyword: "기술 역사" },
    { label: "신재생에너지", keyword: "신재생에너지" },
    { label: "수소에너지", keyword: "수소에너지" },
  ],
  "🏗️ 건축": [
    { label: "건축학 입문", keyword: "건축학 입문" },
    { label: "건축 설계", keyword: "건축 설계" },
    { label: "건축 구조", keyword: "건축 구조" },
    { label: "건축 재료", keyword: "건축 재료" },
    { label: "건축 역사", keyword: "건축 역사" },
    { label: "현대 건축", keyword: "현대 건축" },
    { label: "한국 건축", keyword: "한국 건축" },
    { label: "서양 건축사", keyword: "서양 건축사" },
    { label: "도시계획", keyword: "도시계획" },
    { label: "도시 재생", keyword: "도시 재생" },
    { label: "주거 건축", keyword: "주거 건축" },
    { label: "공공 건축", keyword: "공공 건축" },
    { label: "문화시설 건축", keyword: "문화시설 건축" },
    { label: "인테리어 디자인", keyword: "인테리어 디자인" },
    { label: "조경 설계", keyword: "조경 설계" },
    { label: "친환경 건축", keyword: "친환경 건축" },
    { label: "패시브 하우스", keyword: "패시브 하우스" },
    { label: "스마트 빌딩", keyword: "스마트 빌딩" },
    { label: "BIM 설계", keyword: "BIM 설계" },
    { label: "건축 법규", keyword: "건축 법규" },
    { label: "건축 경제", keyword: "건축 경제" },
    { label: "공간 심리학", keyword: "공간 심리학" },
    { label: "건축 에세이", keyword: "건축가 에세이" },
    { label: "미니멀 건축", keyword: "미니멀리즘 건축" },
    { label: "유니버설 디자인", keyword: "유니버설 디자인" },
    { label: "재난 방재 건축", keyword: "방재 건축" },
    { label: "수중 건축", keyword: "수중 건축" },
    { label: "우주 건축", keyword: "우주 건축" },
    { label: "건축과 예술", keyword: "건축 예술" },
    { label: "도시 교통", keyword: "도시 교통" },
  ],
  "💼 경영": [
    { label: "경영학 입문", keyword: "경영학 입문" },
    { label: "경영 전략", keyword: "경영 전략" },
    { label: "마케팅", keyword: "마케팅" },
    { label: "브랜딩", keyword: "브랜딩" },
    { label: "디지털 마케팅", keyword: "디지털 마케팅" },
    { label: "영업 전략", keyword: "영업 전략" },
    { label: "스타트업 창업", keyword: "스타트업 창업" },
    { label: "기업가 정신", keyword: "기업가 정신" },
    { label: "리더십", keyword: "리더십" },
    { label: "조직관리", keyword: "조직관리" },
    { label: "인사관리", keyword: "인사관리" },
    { label: "경영 혁신", keyword: "경영 혁신" },
    { label: "공급망 관리", keyword: "공급망 관리" },
    { label: "생산관리", keyword: "생산관리" },
    { label: "글로벌 경영", keyword: "글로벌 경영" },
    { label: "사회적 기업", keyword: "사회적 기업" },
    { label: "ESG 경영", keyword: "ESG 경영" },
    { label: "비즈니스 모델", keyword: "비즈니스 모델" },
    { label: "협상론", keyword: "협상론" },
    { label: "경영 컨설팅", keyword: "경영 컨설팅" },
    { label: "플랫폼 비즈니스", keyword: "플랫폼 비즈니스" },
    { label: "구독 경제", keyword: "구독 경제" },
    { label: "기업 문화", keyword: "기업 문화" },
    { label: "CEO 에세이", keyword: "CEO 자서전 에세이" },
    { label: "경영 역사", keyword: "경영 역사" },
    { label: "경영 심리학", keyword: "경영 심리학" },
    { label: "고객 경험", keyword: "고객 경험 CX" },
    { label: "데이터 경영", keyword: "데이터 경영" },
    { label: "린 스타트업", keyword: "린 스타트업" },
    { label: "경영과 윤리", keyword: "경영 윤리" },
  ],
  "📈 경제": [
    { label: "경제학 입문", keyword: "경제학 입문" },
    { label: "미시경제학", keyword: "미시경제학" },
    { label: "거시경제학", keyword: "거시경제학" },
    { label: "행동경제학", keyword: "행동경제학" },
    { label: "실험경제학", keyword: "실험경제학" },
    { label: "경제사", keyword: "경제사" },
    { label: "국제경제학", keyword: "국제경제학" },
    { label: "무역론", keyword: "무역론" },
    { label: "환율과 금융", keyword: "환율 금융" },
    { label: "경제발전론", keyword: "경제발전론" },
    { label: "노동경제학", keyword: "노동경제학" },
    { label: "복지경제학", keyword: "복지경제학" },
    { label: "환경경제학", keyword: "환경경제학" },
    { label: "산업조직론", keyword: "산업조직론" },
    { label: "공공경제학", keyword: "공공경제학" },
    { label: "금융경제학", keyword: "금융경제학" },
    { label: "불평등과 분배", keyword: "불평등 분배" },
    { label: "빈곤 경제학", keyword: "빈곤 경제학" },
    { label: "경제지리학", keyword: "경제지리학" },
    { label: "부동산 경제", keyword: "부동산 경제" },
    { label: "플랫폼 경제", keyword: "플랫폼 경제" },
    { label: "디지털 경제", keyword: "디지털 경제" },
    { label: "AI와 경제", keyword: "인공지능 경제" },
    { label: "경제 에세이", keyword: "경제학자 에세이" },
    { label: "경제학자 열전", keyword: "경제학자" },
    { label: "한국 경제", keyword: "한국 경제" },
    { label: "자본주의 비판", keyword: "자본주의" },
    { label: "공유경제", keyword: "공유경제" },
    { label: "탈성장 경제", keyword: "탈성장" },
    { label: "경제와 정치", keyword: "정치경제" },
  ],
  "🧮 회계/금융": [
    { label: "회계학 입문", keyword: "회계학 입문" },
    { label: "재무회계", keyword: "재무회계" },
    { label: "관리회계", keyword: "관리회계" },
    { label: "세무회계", keyword: "세무회계" },
    { label: "원가회계", keyword: "원가회계" },
    { label: "금융 입문", keyword: "금융 입문" },
    { label: "투자론", keyword: "투자론" },
    { label: "주식 투자", keyword: "주식 투자" },
    { label: "채권 투자", keyword: "채권 투자" },
    { label: "펀드 투자", keyword: "펀드 투자" },
    { label: "파생상품", keyword: "파생상품" },
    { label: "자산관리", keyword: "자산관리" },
    { label: "재무관리", keyword: "재무관리" },
    { label: "기업 분석", keyword: "기업 분석" },
    { label: "금융 시장", keyword: "금융 시장" },
    { label: "은행론", keyword: "은행론" },
    { label: "보험론", keyword: "보험론" },
    { label: "부동산 금융", keyword: "부동산 금융" },
    { label: "핀테크", keyword: "핀테크" },
    { label: "암호화폐", keyword: "암호화폐" },
    { label: "ESG 투자", keyword: "ESG 투자" },
    { label: "행동 재무학", keyword: "행동 재무학" },
    { label: "금융 위기", keyword: "금융 위기" },
    { label: "금융 역사", keyword: "금융 역사" },
    { label: "공인회계사", keyword: "공인회계사 CPA" },
    { label: "국제 금융", keyword: "국제 금융" },
    { label: "중앙은행", keyword: "중앙은행" },
    { label: "금융 규제", keyword: "금융 규제" },
    { label: "개인 재무", keyword: "개인 재무 관리" },
    { label: "금융 에세이", keyword: "금융인 에세이" },
  ],
  "🎓 교육": [
    { label: "교육학 입문", keyword: "교육학 입문" },
    { label: "교육철학", keyword: "교육철학" },
    { label: "교육심리학", keyword: "교육심리학" },
    { label: "교육사회학", keyword: "교육사회학" },
    { label: "교육과정론", keyword: "교육과정론" },
    { label: "수업 방법론", keyword: "수업 방법론" },
    { label: "교육 평가", keyword: "교육 평가" },
    { label: "특수교육", keyword: "특수교육" },
    { label: "유아교육", keyword: "유아교육" },
    { label: "초등교육", keyword: "초등교육" },
    { label: "중등교육", keyword: "중등교육" },
    { label: "고등교육", keyword: "고등교육" },
    { label: "평생교육", keyword: "평생교육" },
    { label: "원격교육", keyword: "원격교육" },
    { label: "에듀테크", keyword: "에듀테크" },
    { label: "미래교육", keyword: "미래교육" },
    { label: "핀란드 교육", keyword: "핀란드 교육" },
    { label: "민주주의 교육", keyword: "민주주의 교육" },
    { label: "인성교육", keyword: "인성교육" },
    { label: "다문화 교육", keyword: "다문화 교육" },
    { label: "교육 불평등", keyword: "교육 불평등" },
    { label: "학교 폭력", keyword: "학교 폭력" },
    { label: "진로교육", keyword: "진로교육" },
    { label: "학습법", keyword: "학습법 공부법" },
    { label: "독서 교육", keyword: "독서 교육" },
    { label: "교사 에세이", keyword: "교사 에세이" },
    { label: "교육 개혁", keyword: "교육 개혁" },
    { label: "창의교육", keyword: "창의교육" },
    { label: "STEM 교육", keyword: "STEM 교육" },
    { label: "교육과 AI", keyword: "교육 인공지능" },
  ],
  "🧠 심리": [
    { label: "심리학 입문", keyword: "심리학 입문" },
    { label: "인지심리학", keyword: "인지심리학" },
    { label: "발달심리학", keyword: "발달심리학" },
    { label: "사회심리학", keyword: "사회심리학" },
    { label: "임상심리학", keyword: "임상심리학" },
    { label: "상담심리학", keyword: "상담심리학" },
    { label: "이상심리학", keyword: "이상심리학" },
    { label: "신경심리학", keyword: "신경심리학" },
    { label: "긍정심리학", keyword: "긍정심리학" },
    { label: "행동심리학", keyword: "행동심리학" },
    { label: "진화심리학", keyword: "진화심리학" },
    { label: "성격심리학", keyword: "성격심리학" },
    { label: "동기와 정서", keyword: "동기 정서 심리학" },
    { label: "학습 심리학", keyword: "학습 심리학" },
    { label: "건강심리학", keyword: "건강심리학" },
    { label: "스포츠 심리학", keyword: "스포츠 심리학" },
    { label: "조직 심리학", keyword: "조직 심리학" },
    { label: "환경 심리학", keyword: "환경 심리학" },
    { label: "법 심리학", keyword: "법 심리학" },
    { label: "아동 심리학", keyword: "아동 심리학" },
    { label: "청소년 심리학", keyword: "청소년 심리학" },
    { label: "노인 심리학", keyword: "노인 심리학" },
    { label: "트라우마 심리학", keyword: "트라우마" },
    { label: "중독 심리학", keyword: "중독 심리학" },
    { label: "뇌과학", keyword: "뇌과학" },
    { label: "마음챙김", keyword: "마음챙김 명상" },
    { label: "자존감", keyword: "자존감 심리학" },
    { label: "관계 심리학", keyword: "관계 심리학" },
    { label: "심리학 에세이", keyword: "심리학 에세이" },
    { label: "정신분석학", keyword: "정신분석학" },
  ],
  "🤝 사회복지": [
    { label: "사회복지학 입문", keyword: "사회복지학 입문" },
    { label: "사회복지 정책", keyword: "사회복지 정책" },
    { label: "사회복지 실천", keyword: "사회복지 실천" },
    { label: "사례관리", keyword: "사례관리" },
    { label: "지역사회 복지", keyword: "지역사회 복지" },
    { label: "아동 복지", keyword: "아동 복지" },
    { label: "청소년 복지", keyword: "청소년 복지" },
    { label: "노인 복지", keyword: "노인 복지" },
    { label: "장애인 복지", keyword: "장애인 복지" },
    { label: "여성 복지", keyword: "여성 복지" },
    { label: "다문화 복지", keyword: "다문화 복지" },
    { label: "빈곤과 불평등", keyword: "빈곤 불평등" },
    { label: "사회보험", keyword: "사회보험" },
    { label: "의료 사회복지", keyword: "의료 사회복지" },
    { label: "학교 사회복지", keyword: "학교 사회복지" },
    { label: "정신건강 복지", keyword: "정신건강 복지" },
    { label: "인권과 복지", keyword: "인권 복지" },
    { label: "NGO와 시민사회", keyword: "NGO 시민사회" },
    { label: "자원봉사론", keyword: "자원봉사론" },
    { label: "사회적 경제", keyword: "사회적 경제" },
    { label: "국제 개발협력", keyword: "국제 개발협력" },
    { label: "사회복지 역사", keyword: "사회복지 역사" },
    { label: "복지국가론", keyword: "복지국가론" },
    { label: "사회적 배제", keyword: "사회적 배제" },
    { label: "홈리스 복지", keyword: "홈리스 복지" },
    { label: "재난 복지", keyword: "재난 복지" },
    { label: "커뮤니티 케어", keyword: "커뮤니티 케어" },
    { label: "사회복지 에세이", keyword: "사회복지사 에세이" },
    { label: "사회문제론", keyword: "사회문제론" },
    { label: "공정과 복지", keyword: "공정 복지" },
  ],
  "✍️ 문학": [
    { label: "한국 현대소설", keyword: "한국 현대소설" },
    { label: "한국 고전소설", keyword: "한국 고전소설" },
    { label: "세계 고전소설", keyword: "세계 고전소설" },
    { label: "현대 세계소설", keyword: "현대 세계소설" },
    { label: "SF 소설", keyword: "SF 소설" },
    { label: "추리소설", keyword: "추리소설" },
    { label: "역사소설", keyword: "역사소설" },
    { label: "성장소설", keyword: "성장소설" },
    { label: "단편소설", keyword: "단편소설" },
    { label: "한국 시", keyword: "한국 시" },
    { label: "세계 시", keyword: "세계 시" },
    { label: "에세이", keyword: "에세이" },
    { label: "수필", keyword: "수필" },
    { label: "희곡/드라마", keyword: "희곡 드라마" },
    { label: "고전 문학", keyword: "고전 문학" },
    { label: "신화와 전설", keyword: "신화 전설" },
    { label: "판타지 문학", keyword: "판타지 문학" },
    { label: "문학 이론", keyword: "문학 이론" },
    { label: "문학 비평", keyword: "문학 비평" },
    { label: "작가론", keyword: "작가론" },
    { label: "문학과 사회", keyword: "문학 사회" },
    { label: "페미니즘 문학", keyword: "페미니즘 문학" },
    { label: "디아스포라 문학", keyword: "디아스포라 문학" },
    { label: "그림책/동화", keyword: "그림책 동화" },
    { label: "청소년 문학", keyword: "청소년 문학" },
    { label: "번역 문학", keyword: "번역 문학" },
    { label: "일본 문학", keyword: "일본 문학" },
    { label: "영미 문학", keyword: "영미 문학" },
    { label: "프랑스 문학", keyword: "프랑스 문학" },
    { label: "라틴아메리카 문학", keyword: "라틴아메리카 문학" },
  ],
  "🎨 예술/디자인": [
    { label: "예술학 입문", keyword: "예술학 입문" },
    { label: "서양 미술사", keyword: "서양 미술사" },
    { label: "한국 미술사", keyword: "한국 미술사" },
    { label: "현대 미술", keyword: "현대 미술" },
    { label: "회화", keyword: "회화" },
    { label: "조각", keyword: "조각" },
    { label: "사진 예술", keyword: "사진 예술" },
    { label: "판화", keyword: "판화" },
    { label: "설치 미술", keyword: "설치 미술" },
    { label: "그래픽 디자인", keyword: "그래픽 디자인" },
    { label: "산업 디자인", keyword: "산업 디자인" },
    { label: "패션 디자인", keyword: "패션 디자인" },
    { label: "UX/UI 디자인", keyword: "UX UI 디자인" },
    { label: "타이포그래피", keyword: "타이포그래피" },
    { label: "색채학", keyword: "색채학" },
    { label: "영화 예술", keyword: "영화 예술" },
    { label: "애니메이션", keyword: "애니메이션" },
    { label: "음악 이론", keyword: "음악 이론" },
    { label: "클래식 음악", keyword: "클래식 음악" },
    { label: "대중음악", keyword: "대중음악" },
    { label: "무용/공연", keyword: "무용 공연" },
    { label: "연극", keyword: "연극" },
    { label: "건축과 예술", keyword: "건축 예술" },
    { label: "디자인 역사", keyword: "디자인 역사" },
    { label: "예술 철학", keyword: "예술 철학" },
    { label: "큐레이터 에세이", keyword: "큐레이터 에세이" },
    { label: "예술가 에세이", keyword: "예술가 에세이" },
    { label: "공예", keyword: "공예" },
    { label: "게임 아트", keyword: "게임 아트" },
    { label: "NFT 디지털 아트", keyword: "NFT 디지털 아트" },
  ],
  "🔬 과학": [
    { label: "과학 입문", keyword: "과학 입문" },
    { label: "물리학 입문", keyword: "물리학 입문" },
    { label: "양자역학", keyword: "양자역학" },
    { label: "상대성 이론", keyword: "상대성 이론" },
    { label: "열역학", keyword: "열역학" },
    { label: "전자기학", keyword: "전자기학" },
    { label: "화학 입문", keyword: "화학 입문" },
    { label: "유기화학", keyword: "유기화학" },
    { label: "무기화학", keyword: "무기화학" },
    { label: "물리화학", keyword: "물리화학" },
    { label: "천문학", keyword: "천문학" },
    { label: "우주론", keyword: "우주론" },
    { label: "태양계", keyword: "태양계" },
    { label: "블랙홀", keyword: "블랙홀" },
    { label: "수학 입문", keyword: "수학 입문" },
    { label: "정수론", keyword: "정수론" },
    { label: "확률과 통계", keyword: "확률 통계" },
    { label: "위상수학", keyword: "위상수학" },
    { label: "수학의 역사", keyword: "수학 역사" },
    { label: "과학 역사", keyword: "과학 역사" },
    { label: "과학 철학", keyword: "과학 철학" },
    { label: "과학과 사회", keyword: "과학 사회" },
    { label: "기후과학", keyword: "기후과학" },
    { label: "지질학", keyword: "지질학" },
    { label: "해양학", keyword: "해양학" },
    { label: "기상학", keyword: "기상학" },
    { label: "과학 에세이", keyword: "과학자 에세이" },
    { label: "노벨상 과학", keyword: "노벨상 과학" },
    { label: "미래과학", keyword: "미래과학" },
    { label: "과학과 윤리", keyword: "과학 윤리" },
  ],
  "🌱 생명/환경": [
    { label: "생물학 입문", keyword: "생물학 입문" },
    { label: "세포생물학", keyword: "세포생물학" },
    { label: "분자생물학", keyword: "분자생물학" },
    { label: "유전학", keyword: "유전학" },
    { label: "유전체학", keyword: "유전체학" },
    { label: "진화론", keyword: "진화론" },
    { label: "생태학", keyword: "생태학" },
    { label: "생물다양성", keyword: "생물다양성" },
    { label: "미생물학", keyword: "미생물학" },
    { label: "바이러스학", keyword: "바이러스학" },
    { label: "면역학", keyword: "면역학" },
    { label: "신경과학", keyword: "신경과학" },
    { label: "식물학", keyword: "식물학" },
    { label: "동물학", keyword: "동물학" },
    { label: "해양생물학", keyword: "해양생물학" },
    { label: "환경과학", keyword: "환경과학" },
    { label: "기후변화", keyword: "기후변화" },
    { label: "탄소중립", keyword: "탄소중립" },
    { label: "환경정책", keyword: "환경정책" },
    { label: "지속가능성", keyword: "지속가능성" },
    { label: "생태계 복원", keyword: "생태계 복원" },
    { label: "멸종위기종", keyword: "멸종위기종" },
    { label: "GMO와 생명윤리", keyword: "GMO 생명윤리" },
    { label: "합성생물학", keyword: "합성생물학" },
    { label: "뇌과학", keyword: "뇌과학" },
    { label: "노화 과학", keyword: "노화 과학" },
    { label: "영양과학", keyword: "영양과학" },
    { label: "생명 에세이", keyword: "생물학자 에세이" },
    { label: "생명 철학", keyword: "생명 철학" },
    { label: "자연과 인간", keyword: "자연 인간" },
  ],
  "📂 기타": [
    { label: "자기계발", keyword: "자기계발" },
    { label: "습관과 루틴", keyword: "습관 루틴" },
    { label: "시간 관리", keyword: "시간 관리" },
    { label: "목표 설정", keyword: "목표 설정" },
    { label: "독서법", keyword: "독서법" },
    { label: "글쓰기", keyword: "글쓰기" },
    { label: "스피치/발표", keyword: "스피치 발표" },
    { label: "한국사", keyword: "한국사" },
    { label: "세계사", keyword: "세계사" },
    { label: "동양사", keyword: "동양 역사" },
    { label: "서양사", keyword: "서양 역사" },
    { label: "철학 입문", keyword: "철학 입문" },
    { label: "동양 철학", keyword: "동양 철학" },
    { label: "서양 철학", keyword: "서양 철학" },
    { label: "윤리학", keyword: "윤리학" },
    { label: "종교학", keyword: "종교학" },
    { label: "불교", keyword: "불교" },
    { label: "기독교", keyword: "기독교" },
    { label: "인문학 에세이", keyword: "인문학 에세이" },
    { label: "여행 에세이", keyword: "여행 에세이" },
    { label: "문화 인류학", keyword: "문화 인류학" },
    { label: "사회학 입문", keyword: "사회학 입문" },
    { label: "미디어와 사회", keyword: "미디어 사회" },
    { label: "스포츠 과학", keyword: "스포츠 과학" },
    { label: "스포츠 에세이", keyword: "스포츠 에세이" },
    { label: "음식과 문화", keyword: "음식 문화" },
    { label: "언어학", keyword: "언어학" },
    { label: "젠더 연구", keyword: "젠더 연구" },
    { label: "통계와 데이터", keyword: "통계 데이터" },
    { label: "리더십 에세이", keyword: "리더십 에세이" },
  ],
};
const FIELDS = Object.keys(CATEGORY_MAP);

// ── 📚 추천 도서 더미 (나중에 DB로 교체) ──────────────────────
// 형식: { 분야: { 기초: [...20권], 중급: [...20권], 심화: [...20권] } }
// 책 클릭 → 제목으로 카카오 자동 검색 → 기존 등록 흐름 재사용
type RecBook = { title: string; author: string };
type RecLevel = "기초" | "중급" | "심화";
const REC_LEVELS: RecLevel[] = ["기초", "중급", "심화"];

const RECOMMEND_BOOKS: Record<string, Record<RecLevel, RecBook[]>> = {
  // ⬇️ 샘플(의학) — 디자인 확인용 더미. 나중에 DB 데이터로 교체.
  "🩺 의학": {
    기초: [
      { title: "아픔이 길이 되려면", author: "김승섭" },
      { title: "골든아워", author: "이국종" },
      { title: "이토록 평범한 미래", author: "김연수" },
      { title: "닥터 차정숙", author: "예시 저자" },
      { title: "의사의 일", author: "예시 저자" },
    ],
    중급: [
      { title: "질병이 바꾼 세계의 역사", author: "로날트 D. 게르슈테" },
      { title: "사피엔스", author: "유발 하라리" },
      { title: "암: 만병의 황제의 역사", author: "싯다르타 무케르지" },
    ],
    심화: [
      { title: "이기적 유전자", author: "리처드 도킨스" },
      { title: "유전자의 내밀한 역사", author: "싯다르타 무케르지" },
    ],
  },
};

const EMPTY_RECORD = { summary: "", quote: "", feeling: "", careerLink: "" };
const PAGE_SIZE = 10;

const stripHtml = (str: string) => (str || "").replace(/<[^>]*>/g, "");
const formatDate = (iso: string) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return "";
  }
};

export default function MiddleBookList() {
  const student = useAtomValue(studentState);
  const academy = useAtomValue(academyState);

  const studentId = student?.id ? String(student.id) : undefined;
  const { data: books = [], isLoading } = useMyBooks(studentId);
  const { concept } = useMiddleConceptData();
  const addBook = useAddBook();
  const updateRecord = useUpdateBookRecord();

  const [selBookId, setSelBookId] = useState<string | null>(null);
  const [editRecord, setEditRecord] = useState(false);
  const [tempRecord, setTempRecord] = useState({ ...EMPTY_RECORD });

  // 모달 상태
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageableCount, setPageableCount] = useState(0);
  const [isEnd, setIsEnd] = useState(false);
  const [selSearchBook, setSelSearchBook] = useState<BookSearchResult | null>(null);
  const [selCategory, setSelCategory] = useState("");

  // ★ 분야/카테고리 선택 상태
  const [selField, setSelField] = useState<string | null>(null);
  const [selSubCategory, setSelSubCategory] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // ★ 추천 도서 난이도 탭 상태
  const [selLevel, setSelLevel] = useState<RecLevel>("기초");

  const searchListRef = useRef<HTMLDivElement>(null);

  const selBook = books.find((b) => b.id === selBookId) ?? null;
  const { data: selBookFeedback } = useBookFeedback(selBookId ?? undefined);

  const runSearch = async (query: string, pageNum: number) => {
    setSearching(true);
    setSearchError("");
    try {
      const { results, totalCount, pageableCount, isEnd } =
        await searchBooksPaged(query, pageNum, PAGE_SIZE);
      setSearchResults(results);
      setTotalCount(totalCount);
      setPageableCount(pageableCount);
      setIsEnd(isEnd);
      setSearchQuery(query);
      setPage(pageNum);
      searchListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error(err);
      setSearchError("검색에 실패했어요. 잠시 후 다시 시도해주세요.");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchResults([]);
      setSearchError("");
      setPage(1);
      setTotalCount(0);
      setPageableCount(0);
      setIsEnd(false);
      return;
    }
    const timer = setTimeout(() => runSearch(searchInput, 1), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const goPage = (p: number) => {
    if (p < 1 || searching) return;
    runSearch(searchInput, p);
  };

  // ★ 분야 클릭 → 세부 카테고리 펼침
  const handleFieldClick = (field: string) => {
    if (selField === field) {
      setSelField(null);
      setSelSubCategory(null);
    } else {
      setSelField(field);
      setSelSubCategory(null);
      setSelLevel("기초");
      setSearchResults([]);
      setSearchInput("");
    }
  };

  // ★ 세부 카테고리 클릭 → 검색
  const handleSubCategoryClick = (field: string, sub: { label: string; keyword: string }) => {
    setSelSubCategory(sub.label);
    setSelCategory(`${field} > ${sub.label}`);
    setSearchInput(sub.keyword);
    setShowCustomInput(false);
    setCustomCategory("");
  };

  // ★ 추천 도서 클릭 → 제목으로 카카오 검색
  const handleRecBookClick = (book: RecBook) => {
    if (!selField) return;
    setSearchInput(book.title);
    setSelCategory(`${selField} > ${selLevel}`);
    setSelSubCategory(null);
    setShowCustomInput(false);
    setCustomCategory("");
  };

  // ★ 직접 입력 카테고리 확정
  const handleCustomConfirm = () => {
    if (!customCategory.trim()) return;
    setSelSubCategory(`직접입력:${customCategory}`);
    setSelCategory(customCategory.trim());
    setSearchInput(customCategory.trim());
    setShowCustomInput(false);
  };

  const openBookDetail = (book: BookSearchResult) => {
    setSelSearchBook(book);
    setModalStep(2);
  };

  const goToRegister = () => {
    if (!selSearchBook) return;
    setModalStep(3);
  };

  const backToSearch = () => setModalStep(1);
  const backToDetail = () => setModalStep(2);

  const handleAddBook = async () => {
    if (!selSearchBook) return;
    if (!student?.id || !academy?.academyId) {
      alert("로그인 정보를 불러오지 못했어요.");
      return;
    }
    try {
      const newBook = await addBook.mutateAsync({
        student_id: String(student.id),
        academy_id: String(academy.academyId),
        isbn: (selSearchBook.isbn || "").split(" ")[0],
        title: stripHtml(selSearchBook.title),
        author: selSearchBook.author,
        publisher: selSearchBook.publisher,
        year: selSearchBook.datetime ? selSearchBook.datetime.slice(0, 4) : "",
        thumbnail: selSearchBook.thumbnail,
        contents: stripHtml(selSearchBook.description),
        category: selCategory || "기타",
      });
      setSelBookId(newBook.id);
      setEditRecord(false);
      closeModal();
    } catch (e: any) {
      alert(`책 추가 실패: ${e.message}`);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setModalStep(1);
    setSearchQuery("");
    setSearchInput("");
    setSearchResults([]);
    setSearchError("");
    setPage(1);
    setTotalCount(0);
    setPageableCount(0);
    setIsEnd(false);
    setSelSearchBook(null);
    setSelCategory("");
    setSelField(null);
    setSelSubCategory(null);
    setCustomCategory("");
    setShowCustomInput(false);
    setSelLevel("기초");
  };

  const saveRecord = async () => {
    if (!selBook) return;
    try {
      await updateRecord.mutateAsync({
        booklist_id: selBook.id,
        record: tempRecord,
      });
      setEditRecord(false);
    } catch (e: any) {
      alert(`저장 실패: ${e.message}`);
    }
  };

  const startEdit = () => {
    if (!selBook) return;
    setTempRecord({ ...EMPTY_RECORD, ...selBook.record });
    setEditRecord(true);
  };

  const totalPages = Math.ceil(pageableCount / PAGE_SIZE);
  const pageButtons = (() => {
    if (totalPages <= 1) return [];
    const maxVisible = 5;
    const startPage = Math.max(1, Math.min(page - Math.floor(maxVisible / 2), totalPages - maxVisible + 1));
    const endPage = Math.min(startPage + maxVisible - 1, totalPages);
    const arr: number[] = [];
    for (let i = startPage; i <= endPage; i++) arr.push(i);
    return arr;
  })();

  const totalCountBooks = books.length;
  const recordedCount = books.filter((b) => b.record?.summary).length;

  const modalTitle = modalStep === 1 ? "📚 책 추가하기" : modalStep === 2 ? "도서 상세" : "도서 등록";
  const modalDesc =
    modalStep === 1 ? "관심 분야 → 추천 도서 / 세부 카테고리 → 검색 순서로 찾아보세요"
      : modalStep === 2 ? "책 정보를 확인하고 등록할지 결정해주세요"
        : "이 책으로 등록할까요?";

  // ★ 현재 분야의 추천 도서 (없으면 빈 객체)
  const recBooksForField = selField ? RECOMMEND_BOOKS[selField] : undefined;
  const recBooksForLevel = recBooksForField ? recBooksForField[selLevel] || [] : [];

  return (
    <div className="flex h-full overflow-hidden font-sans text-ink">
      {/* 왼쪽: 독서 기록장 */}
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[20px] font-extrabold text-ink tracking-tight">독서 리스트</div>
            <div className="text-[13px] text-ink-muted mt-0.5">{student?.name} · {academy?.academyName}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-brand-middle-bg text-brand-middle-dark text-[13px] font-semibold px-4 py-1.5 rounded-full border border-brand-middle-light">
              총 {totalCountBooks}권 · {recordedCount}권 기록완료
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="h-9 px-4 bg-brand-middle hover:bg-brand-middle-hover text-white text-[13px] font-semibold rounded-lg transition-all hover:-translate-y-px hover:shadow-btn-middle"
            >
              + 책 추가
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-20 text-ink-muted">
            <div className="text-3xl mb-3">⏳</div>
            <div className="text-[13px]">불러오는 중...</div>
          </div>
        )}

        {!isLoading && books.length === 0 && (
          <div className="text-center py-20 text-ink-muted">
            <div className="text-5xl mb-3">📚</div>
            <div className="text-[15px] mb-1 font-medium">아직 읽은 책이 없어요.</div>
            <div className="text-[13px]">+ 책 추가 버튼을 눌러 첫 번째 책을 추가해보세요!</div>
          </div>
        )}

        {!isLoading && books.length > 0 && !selBook && (
          <div className="text-center py-20 text-ink-muted">
            <div className="text-5xl mb-3">📖</div>
            <div className="text-[15px] mb-1 font-medium">오른쪽에서 책을 선택해주세요</div>
          </div>
        )}

        {selBook && (
          <div className="bg-white border border-line rounded-2xl p-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
            <div className="flex gap-4 mb-5">
              <div className="w-[70px] h-[92px] bg-brand-middle-pale rounded-lg flex items-center justify-center text-3xl flex-shrink-0 border border-line overflow-hidden">
                {selBook.thumbnail ? (
                  <img src={selBook.thumbnail} alt={selBook.title} className="w-full h-full object-cover" />
                ) : "📚"}
              </div>
              <div className="flex-1">
                <div className="text-[17px] font-bold text-ink mb-1 tracking-tight">{selBook.title}</div>
                <div className="text-[13px] text-ink-secondary mb-2">{selBook.author} · {selBook.publisher} · {selBook.year}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold bg-brand-middle-bg text-brand-middle-dark px-2.5 py-0.5 rounded-full border border-brand-middle-light">{selBook.category}</span>
                  <span className="text-[11px] text-ink-muted">{new Date(selBook.added_at).toLocaleDateString("ko-KR")} 추가</span>
                </div>
              </div>
            </div>

            <div className="border-t border-line-light pt-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[14px] font-bold text-ink">📖 독서 기록장</div>
                {!editRecord && (
                  <button
                    onClick={startEdit}
                    className="text-[12px] font-semibold text-brand-middle-dark bg-brand-middle-bg border border-brand-middle-light rounded-lg px-3 py-1.5 hover:bg-brand-middle hover:text-white transition-all"
                  >
                    ✏️ {selBook.record?.summary ? "수정" : "작성하기"}
                  </button>
                )}
              </div>

              {editRecord && (
                <div>
                  {selBookFeedback?.teacher_feedback && (
                    <div className="bg-[#EEF2FF] border-2 border-[#BAC8FF] rounded-xl px-4 py-3 mb-4 sticky top-0">
                      <div className="text-[12px] font-bold text-[#3B5BDB] mb-1.5 flex items-center gap-1">💬 선생님 피드백 (참고)</div>
                      <div className="text-[13px] text-[#1E3A8A] leading-[1.7] whitespace-pre-wrap">{selBookFeedback.teacher_feedback}</div>
                      <div className="text-[10px] text-[#3B5BDB]/70 mt-2">⬇ 피드백을 참고해서 아래 기록을 수정해보세요</div>
                    </div>
                  )}
                  {[
                    { key: "summary", label: "📝 줄거리 요약", placeholder: "책의 주요 내용을 간단히 정리해보세요." },
                    { key: "quote", label: "💬 인상 깊은 구절", placeholder: "가장 기억에 남는 문장이나 구절을 적어보세요." },
                    { key: "feeling", label: "💭 느낀 점", placeholder: "이 책을 읽고 어떤 생각이나 감정이 들었나요?" },
                    { key: "careerLink", label: "🎯 진로와의 연결점", placeholder: "이 책이 나의 진로나 꿈과 어떻게 연결되나요?" },
                  ].map((f) => (
                    <div key={f.key} className="mb-3">
                      <label className="text-[12px] font-bold text-ink-secondary block mb-1.5">{f.label}</label>
                      <textarea
                        value={(tempRecord as any)[f.key]}
                        onChange={(e) => setTempRecord((p) => ({ ...p, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        rows={3}
                        className="w-full border border-line rounded-lg px-3.5 py-2.5 text-[13px] leading-[1.7] resize-y focus:outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-all placeholder:text-ink-muted"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setEditRecord(false)} disabled={updateRecord.isPending} className="flex-1 h-10 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">취소</button>
                    <button onClick={saveRecord} disabled={updateRecord.isPending} className="flex-[2] h-10 bg-brand-middle hover:bg-brand-middle-hover text-white rounded-lg text-[13px] font-semibold transition-all hover:-translate-y-px hover:shadow-btn-middle disabled:opacity-50">
                      {updateRecord.isPending ? "저장 중..." : "저장"}
                    </button>
                  </div>
                </div>
              )}

              {!editRecord && selBook.record?.summary && (
                <div>
                  {[
                    { key: "summary", label: "📝 줄거리 요약", bg: "bg-gray-50", border: "border-line", text: "text-ink" },
                    { key: "quote", label: "💬 인상 깊은 구절", bg: "bg-[#F5F3FF]", border: "border-[#DDD6FE]", text: "text-[#4C1D95]" },
                    { key: "feeling", label: "💭 느낀 점", bg: "bg-[#FFF7ED]", border: "border-[#FDBA74]", text: "text-[#92400E]" },
                    { key: "careerLink", label: "🎯 진로와의 연결점", bg: "bg-brand-middle-bg", border: "border-brand-middle-light", text: "text-brand-middle-dark" },
                  ].map((f) => (selBook.record as any)?.[f.key] ? (
                    <div key={f.key} className={`${f.bg} border ${f.border} rounded-xl px-4 py-3 mb-2.5`}>
                      <div className={`text-[12px] font-bold ${f.text} mb-1.5`}>{f.label}</div>
                      <div className={`text-[13px] ${f.text} leading-[1.7]`}>{(selBook.record as any)[f.key]}</div>
                    </div>
                  ) : null)}
                  <div className={`${selBookFeedback?.teacher_feedback ? "bg-[#EEF2FF] border-[#BAC8FF]" : "bg-gray-50 border-line"} border rounded-xl px-4 py-3 mt-1`}>
                    <div className={`text-[12px] font-bold ${selBookFeedback?.teacher_feedback ? "text-[#3B5BDB]" : "text-ink-muted"} ${selBookFeedback?.teacher_feedback ? "mb-1.5" : ""}`}>
                      {selBookFeedback?.teacher_feedback ? "💬 선생님 피드백" : "💬 선생님 피드백을 기다리는 중이에요..."}
                    </div>
                    {selBookFeedback?.teacher_feedback && (
                      <>
                        <div className="text-[13px] text-[#1E3A8A] leading-[1.7] whitespace-pre-wrap">{selBookFeedback.teacher_feedback}</div>
                        {selBookFeedback.teacher_at && <div className="text-[11px] text-ink-muted mt-1">{new Date(selBookFeedback.teacher_at).toLocaleDateString("ko-KR")}</div>}
                      </>
                    )}
                  </div>
                </div>
              )}

              {!editRecord && !selBook.record?.summary && (
                <div className="text-center py-10 text-ink-muted">
                  <div className="text-4xl mb-2.5">📖</div>
                  <div className="text-[13px] font-medium">아직 독서 기록이 없어요.</div>
                  <div className="text-[11px] mt-1">위의 작성하기 버튼을 눌러 기록을 남겨보세요!</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="w-px bg-line flex-shrink-0" />

      {/* 오른쪽: 책 목록 */}
      <div className="w-[300px] flex-shrink-0 overflow-y-auto px-4 py-6 bg-[#F8FAFC]">
        <div className="text-[13px] font-bold text-ink mb-3 px-1">읽은 책 목록</div>
        {books.length === 0 ? (
          <div className="text-center py-10 text-ink-muted text-[12px]">아직 추가된 책이 없어요.</div>
        ) : books.map((b) => {
          const isSel = selBookId === b.id;
          return (
            <div key={b.id} onClick={() => { setSelBookId(b.id); setEditRecord(false); }}
              className={`p-3 rounded-xl mb-1.5 cursor-pointer border transition-all ${isSel ? "border-brand-middle bg-white shadow-[0_4px_16px_rgba(16,185,129,0.12)]" : "border-line bg-white hover:border-brand-middle-light hover:shadow-sm"}`}>
              <div className="flex gap-2.5">
                <div className="w-8 h-10 bg-gray-100 rounded flex items-center justify-center text-sm flex-shrink-0 overflow-hidden">
                  {b.thumbnail ? <img src={b.thumbnail} alt={b.title} className="w-full h-full object-cover" /> : "📚"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[12.5px] ${isSel ? "font-semibold text-brand-middle-dark" : "font-medium text-ink"} truncate`}>{b.title}</div>
                  <div className="text-[10px] text-ink-muted mt-0.5">{b.author}</div>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    <span className="text-[9px] font-bold bg-brand-middle-bg text-brand-middle-dark px-1.5 py-0.5 rounded-full">{b.category}</span>
                    {b.record?.summary ? <span className="text-[9px] text-green-600 font-semibold">기록완료</span> : <span className="text-[9px] text-amber-500 font-semibold">기록없음</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ⭐ 모달 ⭐ */}
      {showAddModal && (
        <div onClick={closeModal} className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()}
            className={`bg-white rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl ${modalStep === 1 ? "w-[720px]" : modalStep === 2 ? "w-[600px]" : "w-[480px]"} max-w-full`}>

            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-line-light flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                {(modalStep === 2 || modalStep === 3) && (
                  <button onClick={modalStep === 2 ? backToSearch : backToDetail} className="text-ink-secondary hover:text-ink text-[14px] transition-colors">←</button>
                )}
                <div>
                  <div className="text-[15px] font-bold text-ink tracking-tight">{modalTitle}</div>
                  <div className="text-[11px] text-ink-muted mt-0.5 font-medium">{modalDesc}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className={`h-2 rounded-full transition-all ${s === modalStep ? "w-5 bg-brand-middle" : s < modalStep ? "w-2 bg-brand-middle-dark" : "w-2 bg-line"}`} />
                  ))}
                </div>
                <button onClick={closeModal} className="text-ink-muted hover:text-ink text-[18px] transition-colors">✕</button>
              </div>
            </div>

            {/* ⭐ 진로 계열 검사 배너 (Step 1에서만 표시) */}
            {modalStep === 1 && concept && (
              <div className="px-6 py-3 bg-gradient-to-r from-brand-middle-pale to-emerald-50 border-b border-brand-middle-light flex-shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-brand-middle-dark uppercase tracking-wider">🎯 내 진로</span>
                  <span className="px-2.5 py-0.5 bg-white text-ink-secondary text-[11px] font-semibold rounded-full border border-line">
                    {concept.typeName}
                  </span>
                  <span className="text-ink-muted text-[10px]">›</span>
                  <span className="px-2.5 py-0.5 bg-white text-brand-middle-dark text-[11px] font-bold rounded-full border border-brand-middle-light">
                    {concept.major}
                  </span>
                  <span className="text-ink-muted text-[10px]">›</span>
                  <span className="px-2.5 py-0.5 bg-brand-middle text-white text-[11px] font-bold rounded-full">
                    {concept.career || concept.customGoal}
                  </span>
                </div>
                {concept.keywords.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] font-bold text-brand-middle-dark">키워드:</span>
                    {concept.keywords.map((kw) => (
                      <button
                        key={kw}
                        onClick={() => {
                          setSearchInput(kw);
                          setSelCategory(`내 진로 > ${kw}`);
                          setSelField(null);
                          setSelSubCategory(null);
                        }}
                        className="px-2 py-0.5 bg-white hover:bg-brand-middle hover:text-white text-brand-middle-dark text-[10.5px] font-bold rounded-full border border-brand-middle-light transition-all"
                        title="클릭하면 이 키워드로 검색됨"
                      >
                        #{kw}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 1: 분야 → 카테고리 → 검색 */}
            {modalStep === 1 && (
              <div className="flex flex-1 overflow-hidden">

                {/* 왼쪽: 분야 목록 */}
                <div className="w-[180px] flex-shrink-0 border-r border-line overflow-y-auto py-3">
                  <div className="text-[11px] font-bold text-ink-muted px-4 mb-2">📂 분야 선택</div>
                  {FIELDS.map((field) => (
                    <button
                      key={field}
                      onClick={() => handleFieldClick(field)}
                      className={`w-full text-left px-4 py-2.5 text-[12px] font-medium transition-all flex items-center justify-between ${selField === field
                        ? "bg-brand-middle-pale text-brand-middle-dark font-bold border-r-2 border-brand-middle"
                        : "text-ink-secondary hover:bg-gray-50 hover:text-ink"
                        }`}
                    >
                      <span>{field}</span>
                      {selField === field && <span className="text-brand-middle text-[10px]">›</span>}
                    </button>
                  ))}
                </div>

                {/* 오른쪽: 추천도서 + 카테고리 + 검색 결과 */}
                <div ref={searchListRef} className="flex-1 overflow-y-auto">

                  {/* ★ 추천 도서 (분야에 추천 데이터 있을 때만) */}
                  {selField && recBooksForField && (
                    <div className="px-4 pt-4 pb-3 border-b border-line-light bg-brand-middle-pale/20">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="text-[11px] font-bold text-brand-middle-dark">
                          📚 {selField} 추천 도서
                        </div>
                        {/* 난이도 탭 */}
                        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                          {REC_LEVELS.map((lv) => (
                            <button
                              key={lv}
                              onClick={() => setSelLevel(lv)}
                              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${selLevel === lv
                                ? "bg-brand-middle text-white shadow-sm"
                                : "text-ink-secondary hover:text-ink"
                                }`}
                            >
                              {lv}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-0.5">
                        {recBooksForLevel.length === 0 ? (
                          <div className="text-center py-6 text-[12px] text-ink-muted">
                            아직 등록된 추천 도서가 없어요.
                          </div>
                        ) : (
                          recBooksForLevel.map((book, i) => (
                            <button
                              key={i}
                              onClick={() => handleRecBookClick(book)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-line bg-white hover:border-brand-middle hover:bg-brand-middle-pale/50 transition-all text-left group"
                            >
                              <span className="w-5 h-5 rounded-full bg-brand-middle-bg text-brand-middle-dark text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                {i + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="text-[12px] font-semibold text-ink truncate">{book.title}</div>
                                <div className="text-[10px] text-ink-muted truncate">{book.author}</div>
                              </div>
                              <span className="text-[10px] text-brand-middle-dark font-bold flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                검색 →
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* 세부 카테고리 */}
                  {selField && (
                    <div className="px-4 pt-4 pb-3 border-b border-line-light">
                      <div className="text-[11px] font-bold text-ink-muted mb-2">
                        {selField} · 세부 카테고리
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORY_MAP[selField].map((sub) => (
                          <button
                            key={sub.label}
                            onClick={() => handleSubCategoryClick(selField, sub)}
                            disabled={searching}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border disabled:opacity-50 ${selSubCategory === sub.label
                              ? "bg-brand-middle text-white border-brand-middle shadow-[0_2px_6px_rgba(16,185,129,0.25)]"
                              : "bg-white text-ink-secondary border-line hover:border-brand-middle-light hover:bg-brand-middle-pale hover:text-brand-middle-dark"
                              }`}
                          >
                            {sub.label}
                          </button>
                        ))}
                        {/* ★ 직접 입력 버튼 */}
                        <button
                          onClick={() => { setShowCustomInput(true); setSelSubCategory(null); setSearchInput(""); setCustomCategory(""); }}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${showCustomInput
                            ? "bg-amber-500 text-white border-amber-500"
                            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                            }`}
                        >
                          ✏️ 직접 입력
                        </button>
                      </div>
                      {/* ★ 직접 입력 칸 */}
                      {showCustomInput && (
                        <div className="mt-2 flex gap-2 items-center">
                          <input
                            type="text"
                            value={customCategory}
                            onChange={e => setCustomCategory(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleCustomConfirm()}
                            placeholder="카테고리를 직접 입력하세요 (예: 스포츠 의학)"
                            autoFocus
                            className="flex-1 h-9 px-3 text-[12px] border border-amber-200 rounded-lg focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200/50 placeholder:text-ink-muted"
                          />
                          <button
                            onClick={handleCustomConfirm}
                            disabled={!customCategory.trim()}
                            className="h-9 px-3 bg-amber-500 text-white text-[12px] font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-40"
                          >
                            확인
                          </button>
                          <button
                            onClick={() => { setShowCustomInput(false); setCustomCategory(""); }}
                            className="h-9 px-3 bg-white text-ink-secondary text-[12px] border border-line rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            취소
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 직접 검색 */}
                  <div className="px-4 pt-3 pb-3">
                    {!selField && (
                      <div className="text-[11px] font-medium text-ink-muted mb-1.5">
                        👈 왼쪽에서 분야를 선택하거나 직접 검색해보세요
                      </div>
                    )}
                    {selField && (
                      <div className="text-[11px] font-medium text-ink-muted mb-1.5">
                        또는 직접 검색
                      </div>
                    )}
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">🔍</span>
                      <input
                        id="book-search-input"
                        value={searchInput}
                        onChange={(e) => {
                          setSearchInput(e.target.value);
                          if (e.target.value !== searchInput) setSelSubCategory(null);
                        }}
                        placeholder="책 제목, 저자, 키워드로 검색"
                        className="w-full h-10 border border-line rounded-lg pl-10 pr-10 text-[13px] outline-none focus:border-brand-middle focus:ring-2 focus:ring-brand-middle/10 transition-colors font-sans"
                      />
                      {searching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-gray-200 border-t-brand-middle rounded-full animate-spin" />
                        </div>
                      )}
                      {searchInput && !searching && (
                        <button onClick={() => { setSearchInput(""); setSelSubCategory(null); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink text-[16px]">×</button>
                      )}
                    </div>
                  </div>

                  {/* 안내 화면 */}
                  {!searchInput && searchResults.length === 0 && (
                    <div className="px-4 pb-4">
                      {!selField ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl">
                          <div className="text-4xl mb-3">📚</div>
                          <div className="text-[13px] font-medium text-ink-secondary mb-1">관심 있는 분야를 선택해보세요!</div>
                          <div className="text-[11px] text-ink-muted">왼쪽에서 분야를 고르면 추천 도서와 세부 카테고리가 나타나요</div>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-brand-middle-pale/40 rounded-xl border border-brand-middle-light/50">
                          <div className="text-3xl mb-2">☝️</div>
                          <div className="text-[13px] font-medium text-brand-middle-dark mb-1">추천 도서나 카테고리를 선택하세요</div>
                          <div className="text-[11px] text-ink-muted">또는 직접 검색해도 돼요</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 검색 결과 */}
                  <div className="px-4 pb-4">
                    {searchError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-3">
                        <div className="text-[12px] text-red-600 font-medium">⚠️ {searchError}</div>
                      </div>
                    )}

                    {searchInput && !searching && !searchError && searchResults.length === 0 && (
                      <div className="text-center py-10">
                        <div className="text-3xl mb-2">🔍</div>
                        <div className="text-[13px] text-ink-muted">검색 결과가 없어요.</div>
                      </div>
                    )}

                    {searchResults.length > 0 && (
                      <div className="text-[11px] text-ink-muted mb-2 font-medium">
                        "<span className="text-brand-middle-dark font-bold">{searchQuery}</span>" 검색 결과 총{" "}
                        <span className="text-brand-middle-dark font-bold">{totalCount.toLocaleString()}</span>건
                        {totalCount > pageableCount && <span className="ml-1">· 상위 {pageableCount.toLocaleString()}건 노출</span>}
                      </div>
                    )}

                    {searchResults.map((book, i) => (
                      <div key={i} onClick={() => openBookDetail(book)}
                        className="border border-line rounded-xl px-4 py-3 mb-2 cursor-pointer flex gap-3 items-start bg-white hover:bg-brand-middle-pale/50 hover:border-brand-middle-light transition-all">
                        {book.thumbnail ? (
                          <img src={book.thumbnail} alt={book.title} className="w-12 h-16 object-cover rounded flex-shrink-0 bg-gray-100" />
                        ) : (
                          <div className="w-12 h-16 bg-brand-middle-pale rounded flex-shrink-0 flex items-center justify-center text-xl">📖</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-ink mb-0.5 line-clamp-1">{stripHtml(book.title)}</div>
                          <div className="text-[11px] text-ink-secondary mb-1.5 font-medium">{book.author}{book.publisher && ` · ${book.publisher}`}</div>
                          {book.description && <div className="text-[11px] text-ink-muted leading-relaxed line-clamp-2">{stripHtml(book.description)}</div>}
                        </div>
                        <div className="text-[11px] font-bold text-brand-middle-dark flex-shrink-0 mt-1">상세 →</div>
                      </div>
                    ))}

                    {searchResults.length > 0 && totalPages > 1 && (
                      <div className="flex items-center justify-center gap-1 mt-4 pt-4 border-t border-line">
                        <button onClick={() => goPage(1)} disabled={page === 1 || searching} className="w-8 h-8 rounded-lg text-[12px] font-semibold text-ink-secondary hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">«</button>
                        <button onClick={() => goPage(page - 1)} disabled={page === 1 || searching} className="w-8 h-8 rounded-lg text-[12px] font-semibold text-ink-secondary hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">‹</button>
                        {pageButtons.map((p) => (
                          <button key={p} onClick={() => goPage(p)} disabled={searching}
                            className={`w-8 h-8 rounded-lg text-[12px] font-bold transition-all disabled:opacity-50 ${p === page ? "bg-brand-middle text-white shadow-[0_2px_6px_rgba(16,185,129,0.25)]" : "text-ink hover:bg-gray-100"}`}>
                            {p}
                          </button>
                        ))}
                        <button onClick={() => goPage(page + 1)} disabled={isEnd || page >= totalPages || searching} className="w-8 h-8 rounded-lg text-[12px] font-semibold text-ink-secondary hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">›</button>
                        <button onClick={() => goPage(totalPages)} disabled={page >= totalPages || searching} className="w-8 h-8 rounded-lg text-[12px] font-semibold text-ink-secondary hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">»</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: 도서 상세 */}
            {modalStep === 2 && selSearchBook && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <div className="flex gap-4 mb-5">
                    {selSearchBook.thumbnail ? (
                      <img src={selSearchBook.thumbnail} alt={selSearchBook.title} className="w-[120px] h-[168px] object-cover rounded-lg flex-shrink-0 bg-gray-100 shadow-[0_4px_16px_rgba(0,0,0,0.12)]" />
                    ) : (
                      <div className="w-[120px] h-[168px] bg-brand-middle-pale rounded-lg flex-shrink-0 flex items-center justify-center text-4xl shadow-[0_4px_16px_rgba(0,0,0,0.08)]">📖</div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="text-[17px] font-bold text-ink leading-snug mb-2 tracking-tight">{stripHtml(selSearchBook.title)}</div>
                      <div className="text-[13px] font-semibold text-ink-secondary mb-1">{selSearchBook.author}</div>
                      {selSearchBook.translators && selSearchBook.translators.length > 0 && <div className="text-[12px] text-ink-muted mb-1">번역: {selSearchBook.translators.join(", ")}</div>}
                      {selSearchBook.publisher && <div className="text-[12px] text-ink-muted mb-1">출판사: <span className="font-semibold text-ink-secondary">{selSearchBook.publisher}</span></div>}
                      {selSearchBook.datetime && <div className="text-[12px] text-ink-muted mb-1">출간일: <span className="font-semibold text-ink-secondary">{formatDate(selSearchBook.datetime)}</span></div>}
                      {selSearchBook.isbn && <div className="text-[11px] text-ink-muted mb-1 font-mono">ISBN: {selSearchBook.isbn}</div>}
                      {selSearchBook.url && (
                        <a href={selSearchBook.url} target="_blank" rel="noopener noreferrer"
                          className="mt-auto inline-flex items-center gap-1.5 text-[12px] font-bold text-brand-middle-dark hover:text-brand-middle bg-white border border-brand-middle-light hover:border-brand-middle px-3 py-1.5 rounded-lg transition-all self-start">
                          🔗 내용 상세 보기
                        </a>
                      )}
                    </div>
                  </div>
                  {selSearchBook.description ? (
                    <div>
                      <div className="text-[12px] font-bold text-ink mb-2">📝 책 소개</div>
                      <div className="bg-gray-50 border border-line rounded-xl px-4 py-3.5 text-[13px] text-ink leading-[1.75] whitespace-pre-wrap">{stripHtml(selSearchBook.description)}</div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-line rounded-xl px-4 py-6 text-center">
                      <div className="text-[12px] text-ink-muted">이 책에 대한 소개 정보가 없어요.</div>
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 border-t border-line-light flex gap-2 flex-shrink-0 bg-white">
                  <button onClick={backToSearch} className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-all">← 다른 책 보기</button>
                  <button onClick={goToRegister} className="flex-[1.5] h-11 bg-brand-middle text-white rounded-lg text-[13px] font-bold hover:bg-brand-middle-hover transition-all hover:-translate-y-px hover:shadow-btn-middle">이 책으로 등록하기 →</button>
                </div>
              </div>
            )}

            {/* Step 3: 등록 확인 */}
            {modalStep === 3 && selSearchBook && (
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="bg-brand-middle-pale border border-brand-middle-light rounded-xl px-4 py-4 mb-5 flex items-start gap-3">
                  {selSearchBook.thumbnail ? (
                    <img src={selSearchBook.thumbnail} alt={selSearchBook.title} className="w-14 h-20 object-cover rounded flex-shrink-0 bg-white" />
                  ) : <span className="text-2xl flex-shrink-0">📖</span>}
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-brand-middle-dark mb-1">{stripHtml(selSearchBook.title)}</div>
                    <div className="text-[12px] text-brand-middle-dark/80 font-medium mb-1">{selSearchBook.author}{selSearchBook.publisher && ` · ${selSearchBook.publisher}`}</div>
                    {selCategory && <span className="inline-block text-[10px] font-bold text-white bg-brand-middle px-2 py-0.5 rounded-full mt-1">{selCategory}</span>}
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex gap-2">
                  <span className="text-base flex-shrink-0">💡</span>
                  <div className="text-[12px] text-amber-900 leading-[1.6]">이 책을 독서 리스트에 추가할까요?<br />추가 후 줄거리·느낀점·진로 연결점을 기록할 수 있어요.</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={closeModal} className="flex-1 h-11 bg-white text-ink-secondary border border-line rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-all">취소</button>
                  <button onClick={handleAddBook} disabled={addBook.isPending}
                    className={`flex-[2] h-11 rounded-lg text-[13px] font-bold transition-all ${!addBook.isPending ? "bg-brand-middle text-white hover:bg-brand-middle-hover hover:-translate-y-px hover:shadow-btn-middle" : "bg-gray-200 text-ink-muted cursor-not-allowed"}`}>
                    {addBook.isPending ? "추가 중..." : "📚 독서 리스트에 추가"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}