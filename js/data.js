// ============================================================
// 두루고등학교 교육과정 데이터
// 출처: 교육과정사이트용 과목 정리.xlsx (2025·2026 입학생 동일)
// ============================================================

const GRADUATION_REQUIREMENTS = {
  totalCredits:    192,
  activityCredits: 18,
  subjectCredits:  174,
  minAttendance:   2 / 3,
  minAchievement:  40,

  creditsPerSemester: { 1: 31, 2: 29, 3: 27 },

  // 교과 영역별 최소 이수 학점
  areaMinCredits: {
    korean:  8,
    math:    8,
    english: 8,
    social:  14,   // 사회(한국사 포함)
    science: 10,
    pe:      10,
    arts:    10,
    others:  16,   // 기가/정보/제2외국어/한문/교양
  },
};

// ============================================================
// 선택과목 풀 정의 (엑셀 병합 셀 기준)
// 같은 풀 안의 과목들은 동일한 선택규칙 적용
// ============================================================
const SELECTION_POOLS = {
  // 2학년 1학기: 10개 중 택4 (3학점)
  elect_y2s1: { pick: 4, credits: 3, year: 2, semester: 1, label: '2-1 선택(택4)' },
  // 2학년 1학기: 제2외국어 3개 중 택1 (3학점)
  lang_y2s1:  { pick: 1, credits: 3, year: 2, semester: 1, label: '제2외국어·한문①(택1)' },
  // 2학년 2학기: 제2외국어 3개 중 택1 (3학점)
  lang_y2s2:  { pick: 1, credits: 3, year: 2, semester: 2, label: '제2외국어·한문②(택1)' },
  // 2학년 2학기: 13개 중 택4 (3학점)
  elect_y2s2: { pick: 4, credits: 3, year: 2, semester: 2, label: '2-2 선택(택4)' },
  // 3학년 1학기: 22개 중 택4 (3학점)
  elect_y3s1: { pick: 4, credits: 3, year: 3, semester: 1, label: '3-1 선택(택4)' },
  // 3학년 1학기: 예술 2개 중 택1 (2학점)
  arts_y3s1:  { pick: 1, credits: 2, year: 3, semester: 1, label: '예술③(택1)' },
  // 3학년 2학기: 예술 2개 중 택1 (2학점)
  arts_y3s2:  { pick: 1, credits: 2, year: 3, semester: 2, label: '예술④(택1)' },
  // 3학년 2학기: 11개 중 택3 (3학점)
  elect_y3s2a: { pick: 3, credits: 3, year: 3, semester: 2, label: '3-2 선택A(택3)' },
  // 3학년 2학기: 6개 중 택3 (3학점)
  elect_y3s2b: { pick: 3, credits: 3, year: 3, semester: 2, label: '3-2 선택B(택3)' },
};

// ============================================================
// 두루고 개설 과목 (2025·2026 입학생 공통)
// choiceGroup: 동일 그룹 내 택1 (하나라도 인정 시 그룹 충족)
// selectionPool: 소속 선택과목 풀 (SELECTION_POOLS 키)
// campus: true → 캠퍼스형 공동교육과정을 통해 이수
// ============================================================

const DURU_SUBJECTS = [

  // ════════════════════════════════════════════════════════
  // 1학년 공통 과목
  // ════════════════════════════════════════════════════════

  // 국어 (공통 6학점)
  { id:"KO_C1",  name:"공통국어1",         area:"korean",  credits:3, type:"common",  year:1, semester:1 },
  { id:"KO_C2",  name:"공통국어2",         area:"korean",  credits:3, type:"common",  year:1, semester:2 },

  // 수학 (공통 6학점)
  { id:"MA_C1",  name:"공통수학1",         area:"math",    credits:3, type:"common",  year:1, semester:1 },
  { id:"MA_C2",  name:"공통수학2",         area:"math",    credits:3, type:"common",  year:1, semester:2 },

  // 영어 (공통 6학점)
  { id:"EN_C1",  name:"공통영어1",         area:"english", credits:3, type:"common",  year:1, semester:1 },
  { id:"EN_C2",  name:"공통영어2",         area:"english", credits:3, type:"common",  year:1, semester:2 },

  // 사회/한국사 (공통 14학점: 한국사6 + 통합사회8)
  { id:"HI_C1",  name:"한국사1",           area:"social",  credits:3, type:"common",  year:1, semester:1 },
  { id:"HI_C2",  name:"한국사2",           area:"social",  credits:3, type:"common",  year:1, semester:2 },
  { id:"SO_C1",  name:"통합사회1",         area:"social",  credits:4, type:"common",  year:1, semester:1 },
  { id:"SO_C2",  name:"통합사회2",         area:"social",  credits:4, type:"common",  year:1, semester:2 },

  // 과학 (공통 10학점: 통합과학8 + 과탐2)
  { id:"SC_C1",  name:"통합과학1",         area:"science", credits:4, type:"common",  year:1, semester:1 },
  { id:"SC_C2",  name:"통합과학2",         area:"science", credits:4, type:"common",  year:1, semester:2 },
  { id:"SC_EX1", name:"과학탐구실험1",     area:"science", credits:1, type:"common",  year:1, semester:1 },
  { id:"SC_EX2", name:"과학탐구실험2",     area:"science", credits:1, type:"common",  year:1, semester:2 },

  // 체육 (1학년: 2+2=4학점)
  { id:"PE_1_1", name:"체육1",             area:"pe",      credits:2, type:"general", year:1, semester:1 },
  { id:"PE_1_2", name:"체육2",             area:"pe",      credits:2, type:"general", year:1, semester:2 },

  // 예술 (1학년: 음악3 + 미술3 = 6학점, 학기별 교차 이수)
  { id:"MU_1",   name:"음악",              area:"arts",    credits:3, type:"general", year:1, semester:null },
  { id:"AR_1",   name:"미술",              area:"arts",    credits:3, type:"general", year:1, semester:null },

  // 기타 1학년 (기가 + 정보 + 진로 + 생태 = 10학점, 학기별 교차)
  { id:"TH_1",   name:"기술·가정",         area:"others",  credits:3, type:"general", year:1, semester:null },
  { id:"IN_1",   name:"정보",              area:"others",  credits:3, type:"general", year:1, semester:null },
  { id:"CA_1",   name:"진로와 직업",       area:"others",  credits:2, type:"general", year:1, semester:null },
  { id:"EC_1",   name:"생태와 환경",       area:"others",  credits:2, type:"general", year:1, semester:null },

  // ════════════════════════════════════════════════════════
  // 2학년 과목
  // ════════════════════════════════════════════════════════

  // 국어 (2학년)
  { id:"KO_G1",  name:"문학",              area:"korean",  credits:4, type:"general",     year:2, semester:1 },
  { id:"KO_G2",  name:"화법과 언어",       area:"korean",  credits:4, type:"general",     year:2, semester:2 },
  { id:"KO_CA2", name:"주제 탐구 독서",    area:"korean",  credits:3, type:"career",      year:2, semester:2, selectionPool:"elect_y2s2" },

  // 수학 (2학년)
  { id:"MA_G1",  name:"대수",              area:"math",    credits:4, type:"general",     year:2, semester:1 },
  { id:"MA_CA1", name:"기하",              area:"math",    credits:3, type:"career",      year:2, semester:1, selectionPool:"elect_y2s1" },
  { id:"MA_G2",  name:"미적분Ⅰ",          area:"math",    credits:4, type:"general",     year:2, semester:2 },
  { id:"MA_CA2", name:"인공지능 수학",     area:"math",    credits:3, type:"career",      year:2, semester:2, selectionPool:"elect_y2s2" },
  { id:"MA_CA3", name:"경제 수학",         area:"math",    credits:3, type:"career",      year:2, semester:2, selectionPool:"elect_y2s2" },

  // 영어 (2학년)
  { id:"EN_G1",  name:"영어Ⅰ",            area:"english", credits:4, type:"general",     year:2, semester:1 },
  { id:"EN_G2",  name:"영어Ⅱ",            area:"english", credits:4, type:"general",     year:2, semester:2 },
  { id:"EN_CV1", name:"세계 문화와 영어",  area:"english", credits:3, type:"convergence", year:2, semester:2, selectionPool:"elect_y2s2" },

  // 사회 (2학년 1학기)
  { id:"SO_G1",  name:"한국지리 탐구",     area:"social",  credits:3, type:"career",      year:2, semester:1, selectionPool:"elect_y2s1" },
  { id:"SO_G2",  name:"사회와 문화",       area:"social",  credits:3, type:"general",     year:2, semester:1, selectionPool:"elect_y2s1" },
  { id:"SO_G3",  name:"세계사",            area:"social",  credits:3, type:"general",     year:2, semester:1, selectionPool:"elect_y2s1" },
  { id:"SO_G4",  name:"윤리와 사상",       area:"social",  credits:3, type:"career",      year:2, semester:1, selectionPool:"elect_y2s1" },
  { id:"SO_G5",  name:"법과 사회",         area:"social",  credits:3, type:"career",      year:2, semester:1, selectionPool:"elect_y2s1" },

  // 사회 (2학년 2학기)
  { id:"SO_G6",  name:"동아시아 역사 기행",area:"social",  credits:3, type:"career",      year:2, semester:2, selectionPool:"elect_y2s2" },
  { id:"SO_G7",  name:"현대사회와 윤리",   area:"social",  credits:3, type:"general",     year:2, semester:2, selectionPool:"elect_y2s2" },
  { id:"SO_G8",  name:"세계시민과 지리",   area:"social",  credits:3, type:"general",     year:2, semester:2, selectionPool:"elect_y2s2" },
  { id:"SO_G9",  name:"경제",              area:"social",  credits:3, type:"career",      year:2, semester:2, selectionPool:"elect_y2s2" },
  { id:"SO_G10", name:"정치",              area:"social",  credits:3, type:"career",      year:2, semester:2, selectionPool:"elect_y2s2" },

  // 과학 (2학년 1학기)
  { id:"SC_G1",  name:"물리학",            area:"science", credits:3, type:"general",     year:2, semester:1, selectionPool:"elect_y2s1" },
  { id:"SC_G2",  name:"화학",              area:"science", credits:3, type:"general",     year:2, semester:1, selectionPool:"elect_y2s1" },
  { id:"SC_G3",  name:"생명과학",          area:"science", credits:3, type:"general",     year:2, semester:1, selectionPool:"elect_y2s1" },
  { id:"SC_G4",  name:"지구과학",          area:"science", credits:3, type:"general",     year:2, semester:1, selectionPool:"elect_y2s1" },

  // 과학 (2학년 2학기)
  { id:"SC_CA1", name:"역학과 에너지",     area:"science", credits:3, type:"career",      year:2, semester:2, selectionPool:"elect_y2s2" },
  { id:"SC_CA2", name:"물질과 에너지",     area:"science", credits:3, type:"career",      year:2, semester:2, selectionPool:"elect_y2s2" },
  { id:"SC_CA3", name:"세포와 물질대사",   area:"science", credits:3, type:"career",      year:2, semester:2, selectionPool:"elect_y2s2" },
  { id:"SC_CA4", name:"지구시스템과학",    area:"science", credits:3, type:"career",      year:2, semester:2, selectionPool:"elect_y2s2" },

  // 체육 (2학년: 2+2=4학점)
  { id:"PE_2_1", name:"스포츠 생활1",      area:"pe",      credits:2, type:"convergence", year:2, semester:1 },
  { id:"PE_2_2", name:"스포츠 생활2",      area:"pe",      credits:2, type:"convergence", year:2, semester:2 },

  // 제2외국어/한문 (2학년 1학기: 택1 그룹)
  { id:"L2_CN1", name:"중국어",            area:"others",  credits:3, type:"general",     year:2, semester:1, choiceGroup:"lang_y2s1", choiceLabel:"제2외국어·한문①(택1)", selectionPool:"lang_y2s1" },
  { id:"L2_JP1", name:"일본어",            area:"others",  credits:3, type:"general",     year:2, semester:1, choiceGroup:"lang_y2s1", choiceLabel:"제2외국어·한문①(택1)", selectionPool:"lang_y2s1" },
  { id:"L2_HN1", name:"한문",              area:"others",  credits:3, type:"general",     year:2, semester:1, choiceGroup:"lang_y2s1", choiceLabel:"제2외국어·한문①(택1)", selectionPool:"lang_y2s1" },

  // 제2외국어/한문 (2학년 2학기: 택1 그룹)
  { id:"L2_CN2", name:"중국어 회화",       area:"others",  credits:3, type:"career",      year:2, semester:2, choiceGroup:"lang_y2s2", choiceLabel:"제2외국어·한문②(택1)", selectionPool:"lang_y2s2" },
  { id:"L2_JP2", name:"일본어 회화",       area:"others",  credits:3, type:"career",      year:2, semester:2, choiceGroup:"lang_y2s2", choiceLabel:"제2외국어·한문②(택1)", selectionPool:"lang_y2s2" },
  { id:"L2_HN2", name:"언어생활과 한자",   area:"others",  credits:3, type:"convergence", year:2, semester:2, choiceGroup:"lang_y2s2", choiceLabel:"제2외국어·한문②(택1)", selectionPool:"lang_y2s2" },

  // ════════════════════════════════════════════════════════
  // 3학년 과목
  // ════════════════════════════════════════════════════════

  // 국어 (3학년)
  { id:"KO_G3",  name:"독서와 작문",       area:"korean",  credits:4, type:"general",     year:3, semester:1 },
  { id:"KO_CA1", name:"문학과 영상",       area:"korean",  credits:3, type:"career",      year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"KO_CV1", name:"언어생활 탐구",     area:"korean",  credits:3, type:"convergence", year:3, semester:2 },
  { id:"KO_CV2", name:"독서 토론과 글쓰기",area:"korean",  credits:3, type:"convergence", year:3, semester:2, selectionPool:"elect_y3s2a" },

  // 수학 (3학년)
  { id:"MA_G3",  name:"확률과 통계",       area:"math",    credits:4, type:"general",     year:3, semester:1 },
  { id:"MA_CA4", name:"미적분Ⅱ",          area:"math",    credits:3, type:"career",      year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"MA_CA5", name:"고급 대수",         area:"math",    credits:3, type:"career",      year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"MA_CA6", name:"고급 미적분",       area:"math",    credits:3, type:"career",      year:3, semester:2, selectionPool:"elect_y3s2a" },
  { id:"MA_CV1", name:"수학과제 탐구",     area:"math",    credits:3, type:"convergence", year:3, semester:2, selectionPool:"elect_y3s2a" },

  // 영어 (3학년)
  { id:"EN_G3",  name:"영어 독해와 작문",  area:"english", credits:4, type:"general",     year:3, semester:1 },
  { id:"EN_CA1", name:"영미 문학 읽기",    area:"english", credits:3, type:"career",      year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"EN_CA2", name:"심화 영어",         area:"english", credits:3, type:"career",      year:3, semester:2 },
  { id:"EN_CV2", name:"실생활 영어 회화",  area:"english", credits:3, type:"convergence", year:3, semester:2, selectionPool:"elect_y3s2a" },

  // 사회 (3학년 1학기)
  { id:"SO_CV1", name:"역사로 탐구하는 현대 세계(3-1)", area:"social", credits:3, type:"convergence", year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"SO_CV2", name:"여행지리",          area:"social",  credits:3, type:"convergence", year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"SO_CV3", name:"사회문제 탐구",     area:"social",  credits:3, type:"convergence", year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"SO_CV4", name:"윤리문제 탐구",     area:"social",  credits:3, type:"convergence", year:3, semester:1, selectionPool:"elect_y3s1" },

  // 사회 (3학년 2학기)
  { id:"SO_CA1", name:"인문학과 윤리",     area:"social",  credits:3, type:"career",      year:3, semester:2, selectionPool:"elect_y3s2b" },
  { id:"SO_CV5", name:"역사로 탐구하는 현대 세계(3-2)", area:"social", credits:3, type:"convergence", year:3, semester:2, selectionPool:"elect_y3s2b" },
  { id:"SO_CV6", name:"기후변화와 지속가능한 세계",     area:"social", credits:3, type:"convergence", year:3, semester:2, selectionPool:"elect_y3s2b" },
  { id:"SO_CV7", name:"금융과 경제생활",   area:"social",  credits:3, type:"convergence", year:3, semester:2, selectionPool:"elect_y3s2b" },

  // 과학 (3학년 1학기)
  { id:"SC_CA5", name:"전자기와 양자",     area:"science", credits:3, type:"career",      year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"SC_CA6", name:"화학 반응의 세계",  area:"science", credits:3, type:"career",      year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"SC_CA7", name:"생물의 유전",       area:"science", credits:3, type:"career",      year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"SC_CA8", name:"행성우주과학",      area:"science", credits:3, type:"career",      year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"SC_CV1", name:"융합과학 탐구",     area:"science", credits:3, type:"convergence", year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"SC_CA9", name:"고급 물리학",       area:"science", credits:3, type:"career",      year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"SC_CA10",name:"고급 화학",         area:"science", credits:3, type:"career",      year:3, semester:1, selectionPool:"elect_y3s1" },

  // 과학 (3학년 2학기)
  { id:"SC_CV2", name:"과학의 역사와 문화",area:"science", credits:3, type:"convergence", year:3, semester:2, selectionPool:"elect_y3s2b" },
  { id:"SC_CV3", name:"기후변화와 환경생태",area:"science",credits:3, type:"convergence", year:3, semester:2, selectionPool:"elect_y3s2b" },

  // 체육 (3학년: 1+1=2학점)
  { id:"PE_3_1", name:"스포츠 문화",       area:"pe",      credits:1, type:"career",      year:3, semester:1 },
  { id:"PE_3_2", name:"스포츠 과학",       area:"pe",      credits:1, type:"career",      year:3, semester:2 },
  { id:"PE_3_3", name:"운동과 건강",       area:"pe",      credits:3, type:"career",      year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"PE_3_4", name:"기초 체육 전공 실기",area:"pe",     credits:3, type:"career",      year:3, semester:2, selectionPool:"elect_y3s2a" },

  // 예술 (3학년: 택1×2 = 4학점)
  { id:"MU_3_1", name:"음악 연주와 창작",  area:"arts",    credits:2, type:"career",      year:3, semester:1, choiceGroup:"arts_y3s1", choiceLabel:"예술③(택1)", selectionPool:"arts_y3s1" },
  { id:"AR_3_1", name:"미술 창작",         area:"arts",    credits:2, type:"career",      year:3, semester:1, choiceGroup:"arts_y3s1", choiceLabel:"예술③(택1)", selectionPool:"arts_y3s1" },
  { id:"MU_3_2", name:"음악 감상과 비평",  area:"arts",    credits:2, type:"career",      year:3, semester:2, choiceGroup:"arts_y3s2", choiceLabel:"예술④(택1)", selectionPool:"arts_y3s2" },
  { id:"AR_3_2", name:"미술 감상과 비평",  area:"arts",    credits:2, type:"career",      year:3, semester:2, choiceGroup:"arts_y3s2", choiceLabel:"예술④(택1)", selectionPool:"arts_y3s2" },
  // 예술 추가 선택
  { id:"MU_CV1", name:"음악과 미디어",     area:"arts",    credits:3, type:"convergence", year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"AR_CV1", name:"미술과 매체",       area:"arts",    credits:3, type:"convergence", year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"MU_CA1", name:"음악 이론",         area:"arts",    credits:3, type:"career",      year:3, semester:2, selectionPool:"elect_y3s2a" },
  { id:"AR_CA1", name:"미술 전공 실기",    area:"arts",    credits:3, type:"career",      year:3, semester:2, selectionPool:"elect_y3s2a" },

  // 정보 (3학년)
  { id:"IT_CA1", name:"인공지능 기초",     area:"others",  credits:3, type:"career",      year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"IT_CA2", name:"소프트웨어와 생활", area:"others",  credits:3, type:"career",      year:3, semester:2, selectionPool:"elect_y3s2a" },

  // 제2외국어/한문 (3학년 1학기: elect_y3s1 풀 소속)
  { id:"L2_CN3", name:"중국 문화",         area:"others",  credits:3, type:"convergence", year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"L2_JP3", name:"일본 문화",         area:"others",  credits:3, type:"convergence", year:3, semester:1, selectionPool:"elect_y3s1" },
  { id:"L2_HN3", name:"한문 고전 읽기(3-1)",area:"others", credits:3, type:"career",      year:3, semester:1, selectionPool:"elect_y3s1" },

  // 제2외국어/한문 (3학년 2학기: elect_y3s2a 풀 소속)
  { id:"L2_CN4", name:"심화 중국어",       area:"others",  credits:3, type:"career",      year:3, semester:2, selectionPool:"elect_y3s2a" },
  { id:"L2_JP4", name:"심화 일본어",       area:"others",  credits:3, type:"career",      year:3, semester:2, selectionPool:"elect_y3s2a" },
  { id:"L2_HN4", name:"한문 고전 읽기(3-2)",area:"others", credits:3, type:"career",      year:3, semester:2, selectionPool:"elect_y3s2a" },
];

// ============================================================
// 캠퍼스형·온라인 공동교육과정 대표 과목 (세종시)
// ============================================================
const ALTERNATIVE_SUBJECTS = {
  campus: [
    { name:"고급수학I",          area:"math",    credits:4 },
    { name:"AP 미적분학",        area:"math",    credits:4 },
    { name:"인공지능수학(캠퍼스)",area:"math",    credits:4 },
    { name:"고급 물리학(캠퍼스)", area:"science", credits:4 },
    { name:"고급 화학(캠퍼스)",   area:"science", credits:4 },
    { name:"고급 생명과학",       area:"science", credits:4 },
    { name:"프로그래밍",         area:"others",  credits:4 },
    { name:"데이터과학",         area:"others",  credits:4 },
  ],
  online: [
    { name:"융합과학 탐구(온라인)",area:"science", credits:4 },
    { name:"과학사(온라인)",      area:"science", credits:2 },
    { name:"국제경제",           area:"social",  credits:4 },
    { name:"세계문제와미래사회",  area:"social",  credits:4 },
    { name:"인공지능 기초(온라인)",area:"others", credits:4 },
    { name:"빅데이터 분석",      area:"others",  credits:4 },
    { name:"독일어I",            area:"others",  credits:4 },
    { name:"프랑스어I",          area:"others",  credits:4 },
  ],
};

// ============================================================
// 이전 학교 과목명 → 두루고 과목 ID 매핑 (별칭 테이블)
// ============================================================
const SUBJECT_ALIASES = [
  // 국어
  { aliases:["국어","국어(상)","국어(하)"],                          targetIds:["KO_C1","KO_C2"] },
  { aliases:["공통국어","공통국어1"],                                targetIds:["KO_C1"] },
  { aliases:["공통국어2"],                                           targetIds:["KO_C2"] },
  { aliases:["문학"],                                                targetIds:["KO_G1"] },
  { aliases:["화법과작문","화법과 언어","화법과언어"],               targetIds:["KO_G2"] },
  { aliases:["독서","독서와작문","독서와 작문"],                     targetIds:["KO_G3"] },
  { aliases:["언어와매체","언어생활탐구","언어생활 탐구"],           targetIds:["KO_CV1"] },
  { aliases:["주제탐구독서","주제 탐구 독서"],                       targetIds:["KO_CA2"] },
  { aliases:["문학과영상","문학과 영상"],                            targetIds:["KO_CA1"] },
  { aliases:["독서토론과글쓰기","독서 토론과 글쓰기"],               targetIds:["KO_CV2"] },

  // 수학
  { aliases:["수학","수학(상)","수학(하)"],                          targetIds:["MA_C1","MA_C2"] },
  { aliases:["공통수학","공통수학1"],                                targetIds:["MA_C1"] },
  { aliases:["공통수학2"],                                           targetIds:["MA_C2"] },
  // 기본수학1·2: 타교 이수 시 공통수학에 준하여 인정
  { aliases:["기본수학","기본수학1"],                                targetIds:["MA_C1"] },
  { aliases:["기본수학2"],                                           targetIds:["MA_C2"] },
  { aliases:["대수","수학I","수학1","수학Ⅰ"],                       targetIds:["MA_C2","MA_G1"] },
  // 구교육과정 수학II(극한·미분·적분) → 미적분Ⅰ에 가장 유사
  { aliases:["수학II","수학Ⅱ","수학2"],                             targetIds:["MA_G2"] },
  { aliases:["기하","기하와벡터"],                                   targetIds:["MA_CA1"] },
  { aliases:["미적분I","미적분Ⅰ","미적분","미적분학"],              targetIds:["MA_G2"] },
  { aliases:["인공지능수학","인공지능 수학"],                        targetIds:["MA_CA2"] },
  { aliases:["경제수학","경제 수학"],                                targetIds:["MA_CA3"] },
  { aliases:["확률과통계","확률과 통계"],                            targetIds:["MA_G3"] },
  { aliases:["미적분II","미적분Ⅱ","미적분2"],                       targetIds:["MA_CA4"] },
  { aliases:["고급대수","고급 대수"],                                targetIds:["MA_CA5"] },
  { aliases:["고급미적분","고급 미적분"],                            targetIds:["MA_CA6"] },
  { aliases:["수학과제탐구","수학과제 탐구"],                        targetIds:["MA_CV1"] },

  // 영어
  { aliases:["영어","영어(상)","영어(하)"],                          targetIds:["EN_C1","EN_C2"] },
  { aliases:["공통영어","공통영어1"],                                targetIds:["EN_C1"] },
  { aliases:["공통영어2"],                                           targetIds:["EN_C2"] },
  // 기본영어1·2: 타교 이수 시 공통영어에 준하여 인정
  { aliases:["기본영어","기본영어1"],                                targetIds:["EN_C1"] },
  { aliases:["기본영어2"],                                           targetIds:["EN_C2"] },
  { aliases:["영어I","영어Ⅰ","영어1"],                             targetIds:["EN_G1"] },
  { aliases:["영어II","영어Ⅱ","영어2"],                            targetIds:["EN_G2"] },
  { aliases:["영어독해와작문","영어 독해와 작문"],                   targetIds:["EN_G3"] },
  { aliases:["세계문화와영어","세계 문화와 영어"],                   targetIds:["EN_CV1"] },
  { aliases:["영미문학읽기","영미 문학 읽기"],                       targetIds:["EN_CA1"] },
  { aliases:["심화영어","심화 영어","심화영어독해와작문","심화 영어 독해와 작문"], targetIds:["EN_CA2"] },
  { aliases:["실생활영어회화","실생활 영어 회화"],                   targetIds:["EN_CV2"] },

  // 한국사 & 사회 (area: social)
  { aliases:["한국사","한국사1"],                                             targetIds:["HI_C1"] },
  { aliases:["한국사2"],                                                      targetIds:["HI_C2"] },
  { aliases:["통합사회","통합사회1"],                                         targetIds:["SO_C1"] },
  { aliases:["통합사회2"],                                                    targetIds:["SO_C2"] },
  { aliases:["한국지리","한국지리탐구","한국지리 탐구"],                      targetIds:["SO_G1"] },
  { aliases:["사회","사회와문화","사회와 문화","사회·문화","사회문화"],        targetIds:["SO_G2"] },
  { aliases:["세계사"],                                                       targetIds:["SO_G3"] },
  { aliases:["윤리와사상","윤리와 사상"],                                     targetIds:["SO_G4"] },
  { aliases:["법과사회","법과 사회","법과정치","정치와법"],                   targetIds:["SO_G5"] },
  { aliases:["동아시아사","동아시아역사기행","동아시아 역사 기행"],           targetIds:["SO_G6"] },
  { aliases:["생활과윤리","현대사회와윤리","현대사회와 윤리"],                targetIds:["SO_G7"] },
  { aliases:["세계지리","세계시민과지리","세계시민과 지리"],                  targetIds:["SO_G8"] },
  { aliases:["경제"],                                                         targetIds:["SO_G9"] },
  { aliases:["정치"],                                                         targetIds:["SO_G10"] },
  { aliases:["여행지리"],                                                     targetIds:["SO_CV2"] },
  { aliases:["역사로탐구하는현대세계","역사로 탐구하는 현대 세계"],          targetIds:["SO_CV1","SO_CV5"] },
  { aliases:["사회문제탐구","사회문제 탐구"],                                 targetIds:["SO_CV3"] },
  { aliases:["윤리문제탐구","윤리문제 탐구"],                                 targetIds:["SO_CV4"] },
  { aliases:["인문학과윤리","인문학과 윤리"],                                 targetIds:["SO_CA1"] },
  { aliases:["기후변화와지속가능한세계","기후변화와 지속가능한 세계"],        targetIds:["SO_CV6"] },
  { aliases:["금융과경제생활","금융과 경제생활"],                             targetIds:["SO_CV7"] },

  // 과학
  { aliases:["통합과학","통합과학1"],                                targetIds:["SC_C1"] },
  { aliases:["통합과학2"],                                           targetIds:["SC_C2"] },
  { aliases:["과학탐구실험","과학탐구실험1"],                        targetIds:["SC_EX1"] },
  { aliases:["과학탐구실험2"],                                       targetIds:["SC_EX2"] },
  { aliases:["물리학","물리학I","물리","물리I"],                     targetIds:["SC_G1"] },
  { aliases:["화학","화학I"],                                        targetIds:["SC_G2"] },
  { aliases:["생명과학","생명과학I","생물"],                         targetIds:["SC_G3"] },
  { aliases:["지구과학","지구과학I"],                                targetIds:["SC_G4"] },
  { aliases:["역학과에너지","역학과 에너지"],                        targetIds:["SC_CA1"] },
  { aliases:["물질과에너지","물질과 에너지"],                        targetIds:["SC_CA2"] },
  { aliases:["세포와물질대사","세포와 물질대사"],                    targetIds:["SC_CA3"] },
  { aliases:["지구시스템과학"],                                      targetIds:["SC_CA4"] },
  { aliases:["전자기와양자","전자기와 양자"],                        targetIds:["SC_CA5"] },
  { aliases:["화학반응의세계","화학 반응의 세계"],                   targetIds:["SC_CA6"] },
  { aliases:["생물의유전","생물의 유전"],                            targetIds:["SC_CA7"] },
  { aliases:["행성우주과학"],                                        targetIds:["SC_CA8"] },
  { aliases:["융합과학탐구","융합과학 탐구"],                        targetIds:["SC_CV1"] },
  { aliases:["고급물리학","고급 물리학"],                            targetIds:["SC_CA9"] },
  { aliases:["고급화학","고급 화학"],                                targetIds:["SC_CA10"] },
  { aliases:["과학의역사와문화","과학의 역사와 문화"],               targetIds:["SC_CV2"] },
  { aliases:["기후변화와환경생태","기후변화와 환경생태"],            targetIds:["SC_CV3"] },

  // 체육
  { aliases:["체육","체육1"],                                        targetIds:["PE_1_1"] },
  { aliases:["체육2"],                                               targetIds:["PE_1_2"] },
  { aliases:["스포츠생활","스포츠생활1","스포츠 생활1"],             targetIds:["PE_2_1"] },
  { aliases:["스포츠생활2","스포츠 생활2"],                          targetIds:["PE_2_2"] },
  { aliases:["스포츠문화","스포츠 문화"],                            targetIds:["PE_3_1","PE_1_1"] },
  { aliases:["스포츠과학","스포츠 과학"],                            targetIds:["PE_3_2","PE_1_2"] },
  { aliases:["운동과건강","운동과 건강"],                            targetIds:["PE_3_3"] },
  { aliases:["기초체육전공실기","기초 체육 전공 실기"],              targetIds:["PE_3_4"] },

  // 예술
  { aliases:["음악","음악1"],                                        targetIds:["MU_1"] },
  { aliases:["미술","미술1"],                                        targetIds:["AR_1"] },
  // 타교 예술 과목 매핑
  // · 같은 교과명 과목(음악 감상과 비평, 미술 감상과 비평 등)은 1학년 슬롯(MU_1/AR_1)으로 인정
  // · 두루고 3학년 과목명과 동일한 것은 해당 3학년 슬롯으로 정확히 매핑 (중복이수 방지)
  { aliases:["음악연주와창작","음악 연주와 창작"],                   targetIds:["MU_1","MU_3_1"] },
  { aliases:["미술창작","미술 창작"],                                targetIds:["AR_1","AR_3_1"] },
  { aliases:["음악감상과비평","음악 감상과 비평"],                   targetIds:["MU_1","MU_3_2"] },
  { aliases:["미술감상과비평","미술 감상과 비평"],                   targetIds:["AR_1","AR_3_2"] },
  { aliases:["음악과미디어","음악과 미디어"],                        targetIds:["MU_CV1"] },
  { aliases:["미술과매체","미술과 매체"],                            targetIds:["AR_CV1"] },
  { aliases:["음악이론"],                                            targetIds:["MU_CA1"] },
  { aliases:["미술전공실기","미술 전공 실기"],                       targetIds:["AR_CA1"] },

  // 기타 1학년
  { aliases:["기술가정","기술·가정","기술·가정"],                    targetIds:["TH_1"] },
  { aliases:["정보","정보과학"],                                     targetIds:["IN_1"] },
  { aliases:["진로와직업","진로와 직업","진로"],                     targetIds:["CA_1"] },
  { aliases:["생태와환경","생태와 환경","환경"],                     targetIds:["EC_1"] },

  // 제2외국어/한문
  { aliases:["중국어","중국어I"],                                    targetIds:["L2_CN1"] },
  { aliases:["일본어","일본어I"],                                    targetIds:["L2_JP1"] },
  { aliases:["한문"],                                                targetIds:["L2_HN1"] },
  { aliases:["중국어회화","중국어 회화"],                            targetIds:["L2_CN2"] },
  { aliases:["일본어회화","일본어 회화"],                            targetIds:["L2_JP2"] },
  { aliases:["언어생활과한자","언어생활과 한자"],                    targetIds:["L2_HN2"] },
  { aliases:["중국문화","중국 문화"],                                targetIds:["L2_CN3"] },
  { aliases:["일본문화","일본 문화"],                                targetIds:["L2_JP3"] },
  { aliases:["한문고전읽기","한문 고전 읽기"],                       targetIds:["L2_HN3","L2_HN4"] },
  { aliases:["심화중국어","심화 중국어"],                            targetIds:["L2_CN4"] },
  { aliases:["심화일본어","심화 일본어"],                            targetIds:["L2_JP4"] },

  // 정보 (3학년) — 인공지능 기초는 아래 IT 계열 항목에서 IN_1 포함하여 처리
  { aliases:["소프트웨어와생활","소프트웨어와 생활"],                targetIds:["IT_CA2"] },

  // ── 전문 교과 (특성화고·직업계고 전학생 대응) ──────────────────
  // 전문 공통 과목
  { aliases:["성공적인직업생활","성공적인 직업 생활"],               targetIds:["CA_1"] },
  { aliases:["디지털과직업생활","디지털과 직업 생활"],               targetIds:["IN_1"] },

  // 정보·통신 계열 전공 일반 → 정보 (IN_1)
  { aliases:["프로그래밍","자료구조","자료 구조",
             "알고리즘설계","알고리즘 설계",
             "컴퓨터구조","컴퓨터 구조",
             "컴퓨터시스템일반","컴퓨터 시스템 일반",
             "컴퓨터네트워크","컴퓨터 네트워크",
             "정보처리와관리","정보 처리와 관리",
             "정보통신","통신일반","통신 일반",
             "컴퓨터그래픽","컴퓨터 그래픽",
             "웹디자인","웹 디자인"],                                targetIds:["IN_1"] },

  // 정보·통신 계열 심화 → 인공지능 기초 (IT_CA1) + 정보 (IN_1) 인정
  { aliases:["인공지능기초","인공지능 기초"],                        targetIds:["IT_CA1","IN_1"] },
  { aliases:["인공지능일반","인공지능 일반",
             "빅데이터분석","빅 데이터 분석",
             "인공지능모델링","인공지능 모델링",
             "사물인터넷과센서제어","사물 인터넷과 센서 제어"],       targetIds:["IT_CA1","IN_1"] },

  // 정보·통신 계열 실무 → 소프트웨어와 생활 (IT_CA2)
  { aliases:["응용프로그래밍개발","응용 프로그래밍 개발",
             "네트워크구축","네트워크 구축",
             "시스템프로그래밍","시스템 프로그래밍"],                 targetIds:["IT_CA2"] },

  // 경영·금융 계열 → 사회 영역
  { aliases:["상업경제","상업 경제",
             "기업과경영","기업과 경영"],                             targetIds:["SO_G9"] },
  { aliases:["금융일반","금융 일반",
             "보험일반","보험 일반"],                                 targetIds:["SO_CV7"] },
];

// 교과 영역 한글 이름
const AREA_NAMES = {
  korean:  "국어",
  math:    "수학",
  english: "영어",
  social:  "사회(한국사 포함)",
  science: "과학",
  pe:      "체육",
  arts:    "예술(음악·미술)",
  others:  "기가/정보/제2외국어/한문/교양",
};

// 트랙 한글 이름 (선택 폼 표시용)
const TRACK_NAMES = {
  general:  "일반 (트랙 미지정)",
};
