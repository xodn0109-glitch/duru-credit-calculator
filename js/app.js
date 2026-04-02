// ============================================================
// 두루고 이수학점 계산기 - 메인 로직 (전학생 + 재학생)
// ============================================================

const state = {
  step: 1,
  userType: 'current',       // 'transfer' | 'current'
  studentInfo: {},           // { name, grade, semester }
  semesterSubjects: {},      // { "y-s": [{name, credits, locked?}] }
  matchResults: null,        // 매칭 계산 결과
  manualAreaMappings: {},    // { "과목명|학점|학년-학기|idx": areaCode } — 이전학기 미매칭 과목 수동 영역 지정
};

const ACTIVITY_CREDITS = 18;

// 1학년 분산배치 보완쌍 (교차이수)
const COMPLEMENT_PAIRS = [
  { a: 'MU_1', b: 'AR_1' },   // 음악 ↔ 미술
  { a: 'TH_1', b: 'IN_1' },   // 기술·가정 ↔ 정보
  { a: 'CA_1', b: 'EC_1' },   // 진로와 직업 ↔ 생태와 환경
];

// 1학년 분산배치 반 그룹 (교차이수 연계)
// 기가 반(그룹A): 1학기 TH_1+MU_1+CA_1 → 2학기 IN_1+AR_1+EC_1
// 정보 반(그룹B): 1학기 IN_1+AR_1+EC_1 → 2학기 TH_1+MU_1+CA_1
const DIST_GROUP_A = ['TH_1', 'MU_1', 'CA_1'];
const DIST_GROUP_B = ['IN_1', 'AR_1', 'EC_1'];

// ── 유틸리티 ─────────────────────────────────────────────────
function typeLabel(type) {
  return { common: "공통", general: "일반선택", career: "진로선택", convergence: "융합선택" }[type] || type;
}

function normalize(str) {
  return str.replace(/\s+/g, "").replace(/[·•]/g, "·").toLowerCase();
}

function getSubjectById(id) {
  return DURU_SUBJECTS.find(s => s.id === id);
}

// ── 과목명 자동 매칭 ─────────────────────────────────────────
function autoMatch(subjectName) {
  const norm = normalize(subjectName);

  for (const entry of SUBJECT_ALIASES) {
    for (const alias of entry.aliases) {
      if (normalize(alias) === norm) {
        const targets = entry.targetIds.map(id => getSubjectById(id)).filter(Boolean);
        return { matched: true, targets, method: "alias" };
      }
    }
  }

  const direct = DURU_SUBJECTS.find(s => normalize(s.name) === norm);
  if (direct) return { matched: true, targets: [direct], method: "direct" };

  const partial = DURU_SUBJECTS.filter(s =>
    normalize(s.name).includes(norm) || norm.includes(normalize(s.name))
  );
  if (partial.length > 0) return { matched: true, targets: partial, method: "partial" };

  // 두루고 편제에 없으나 세종시 교육청 편제 가능 과목 (영역 분류 전용)
  for (const entry of SUBJECT_AREA_ONLY) {
    for (const alias of entry.aliases) {
      if (normalize(alias) === norm) {
        return { matched: true, targets: [{ area: entry.area }], method: "area_only" };
      }
    }
  }

  return { matched: false, targets: [], method: "none" };
}

// ── 학기 목록 생성 (1-1 ~ grade-semester) ────────────────────
function getSemesters(grade, sem) {
  const list = [];
  for (let y = 1; y <= grade; y++) {
    for (let s = 1; s <= 2; s++) {
      if (y === grade && s > sem) break;
      list.push({ year: y, semester: s });
    }
  }
  return list;
}

// ── Step 1: 학생 정보 + 유형 선택 ────────────────────────────
function initStep1() {
  const btnTransfer = document.getElementById("btn-type-transfer");
  const btnCurrent  = document.getElementById("btn-type-current");

  function setType(type) {
    state.userType = type;
    state.semesterSubjects = {};
    state.manualAreaMappings = {};
    btnTransfer.classList.toggle("active", type === 'transfer');
    btnCurrent.classList.toggle("active",  type === 'current');
    document.getElementById("grade-label").textContent =
      type === 'transfer' ? "두루고 전입 학년" : "현재 재학 학년";
    document.getElementById("semester-label").textContent =
      type === 'transfer' ? "전입 학기" : "현재 학기";
    document.getElementById("ps-3-label").textContent =
      type === 'transfer' ? "매칭 검토" : "(건너뜀)";
  }

  btnTransfer.addEventListener("click", () => setType('transfer'));
  btnCurrent.addEventListener("click",  () => setType('current'));
  setType('current');

  document.getElementById("btn-step1").addEventListener("click", () => {
    const name     = document.getElementById("inp-name").value.trim();
    const grade    = parseInt(document.getElementById("inp-grade").value);
    const semester = parseInt(document.getElementById("inp-semester").value);
    if (!name) { showToast("이름을 입력해주세요."); return; }
    state.studentInfo = { name, grade, semester };
    state.semesterSubjects = {};
    state.manualAreaMappings = {};
    renderStep2();
    goToStep(2);
  });
}

// ── Step 2: 학기별 과목 입력 ─────────────────────────────────
function renderStep2() {
  const { grade, semester } = state.studentInfo;
  const sems = getSemesters(grade, semester);
  const container = document.getElementById("sem-input-container");
  container.innerHTML = "";

  // 안내 문구
  const isTrans = state.userType === 'transfer';
  document.getElementById("step2-hint").textContent = isTrans
    ? "학기별로 이전 학교에서 이수한 과목명과 학점을 입력하세요. 전입 학기의 과목이 두루고 편제와 매칭됩니다."
    : "학기별로 이수했거나 이수 중인 과목을 입력하세요. 공통과목은 자동으로 채워집니다.";

  for (const { year, semester: s } of sems) {
    const isTransferSem = isTrans && year === grade && s === semester;
    const isCurrentSem  = !isTrans && year === grade && s === semester;
    const key = `${year}-${s}`;

    // 초기 과목 세팅
    if (!state.semesterSubjects[key]) {
      state.semesterSubjects[key] = getInitialSubjects(year, s, isTransferSem);
    }

    const statusLabel = isTransferSem ? "🏫 두루고 이수 시작"
                      : isCurrentSem  ? "📌 현재 학기"
                      : "✅ 이수 완료";
    const statusClass = (isTransferSem || isCurrentSem) ? "current" : "past";

    const block = document.createElement("div");
    block.className = `sem-block ${statusClass}`;

    const duruKey = `duru-${key}`;
    if (isTransferSem && !state.semesterSubjects[duruKey]) {
      state.semesterSubjects[duruKey] = [];
    }

    block.innerHTML = `
      <div class="sem-block-header">
        <span class="sem-title">${year}학년 ${s}학기</span>
        <span class="sem-status-badge ${statusClass}">${statusLabel}</span>
        <span id="sem-total-${key}" style="font-size:0.78rem;font-weight:600;color:var(--gray-400);margin-left:8px">총 0학점</span>
      </div>
      <div class="sem-body">
        ${isTransferSem ? `<p style="font-size:0.78rem;color:var(--gray-500);margin:0 0 6px">① 이전 학교 수강 과목 <span style="color:var(--primary)">(두루고 편제와 매칭됩니다)</span></p>` : ''}
        <table class="subj-input-table">
          <thead>
            <tr>
              <th>과목명</th>
              <th style="width:76px">학점</th>
              <th style="width:34px"></th>
            </tr>
          </thead>
          <tbody id="tbody-${key}"></tbody>
        </table>
        <button class="btn-add btn-add-row" id="btn-add-${key}">+ 과목 추가</button>
        ${isTransferSem ? `
        <div style="margin-top:16px;padding-top:14px;border-top:1px dashed var(--gray-200)">
          <p style="font-size:0.78rem;color:var(--gray-500);margin:0 0 6px">② 두루고 이수 희망 선택과목 <span style="color:var(--primary)">(수강 신청할 선택과목을 입력하세요)</span></p>
          <table class="subj-input-table">
            <thead>
              <tr>
                <th>과목명</th>
                <th style="width:76px">학점</th>
                <th style="width:34px"></th>
              </tr>
            </thead>
            <tbody id="tbody-${duruKey}"></tbody>
          </table>
          <button class="btn-add btn-add-row" id="btn-add-${duruKey}">+ 과목 추가</button>
        </div>` : ''}
      </div>
    `;
    container.appendChild(block);

    const tbody = document.getElementById(`tbody-${key}`);
    for (const sub of state.semesterSubjects[key]) {
      appendSubjRow(tbody, sub.name, sub.credits, sub.locked);
    }

    document.getElementById(`btn-add-${key}`).addEventListener("click", () => {
      appendSubjRow(document.getElementById(`tbody-${key}`));
    });

    if (isTransferSem) {
      const duruTbody = document.getElementById(`tbody-${duruKey}`);
      for (const sub of (state.semesterSubjects[duruKey] || [])) {
        appendSubjRow(duruTbody, sub.name, sub.credits, sub.locked);
      }
      document.getElementById(`btn-add-${duruKey}`).addEventListener("click", () => {
        appendSubjRow(document.getElementById(`tbody-${duruKey}`));
      });
    }

    // 재학생 & 2학년 이상: 1-2 블록 직후에 교차이수 블록 삽입
    if (!isTrans && grade >= 2 && year === 1 && s === 2) {
      const CROSS_IDS = ['MU_1','AR_1','TH_1','IN_1','CA_1','EC_1'];
      const crossKey  = 'cross-y1';

      if (!state.semesterSubjects[crossKey]) {
        state.semesterSubjects[crossKey] = CROSS_IDS.map(id => {
          const sub = DURU_SUBJECTS.find(sc => sc.id === id);
          return { name: sub.name, credits: sub.credits, locked: false }; // 미이수 시 삭제 가능
        });
      }

      const crossBlock = document.createElement("div");
      crossBlock.className = "sem-block past";
      crossBlock.innerHTML = `
        <div class="sem-block-header">
          <span class="sem-title">1학년 학기별 교차이수 과목</span>
          <span class="sem-status-badge past">✅ 이수 완료</span>
          <span id="sem-total-${crossKey}" style="font-size:0.78rem;font-weight:600;color:var(--gray-400);margin-left:8px">총 0학점</span>
          <span style="font-size:0.75rem;color:var(--gray-500);margin-left:8px">음악·미술·기술가정·정보·진로와직업·생태와환경</span>
        </div>
        <div class="sem-body">
          <table class="subj-input-table">
            <thead>
              <tr>
                <th>과목명</th>
                <th style="width:76px">학점</th>
                <th style="width:34px"></th>
              </tr>
            </thead>
            <tbody id="tbody-${crossKey}"></tbody>
          </table>
          <button class="btn-add btn-add-row" id="btn-add-${crossKey}">+ 과목 추가</button>
        </div>
      `;
      container.appendChild(crossBlock);

      const crossTbody = document.getElementById(`tbody-${crossKey}`);
      for (const sub of state.semesterSubjects[crossKey]) {
        appendSubjRow(crossTbody, sub.name, sub.credits, sub.locked);
      }
      document.getElementById(`btn-add-${crossKey}`).addEventListener("click", () => {
        appendSubjRow(crossTbody);
      });
    }
  }
}

// 학기 초기 과목 (재학생: 선택 없이 전원 필수 이수 과목 자동 채움)
// selectionPool·choiceGroup이 모두 없는 과목 = 학교 지정 고정 과목
// locked: false → 미이수 처리 시 사용자가 직접 삭제 가능
function getInitialSubjects(year, s, isTransferSem = false) {
  // 재학생만 두루고 편제 과목 자동 채움
  // 전학생(전입 학기 포함)은 이전 학교 과목을 직접 입력해야 하므로 빈 칸으로 시작
  if (state.userType !== 'current') return [];
  return DURU_SUBJECTS
    .filter(sub => sub.year === year && sub.semester === s && !sub.selectionPool && !sub.choiceGroup)
    .map(sub => ({ name: sub.name, credits: sub.credits, locked: false }));
}

// 학기 블록 총 학점 업데이트
function updateSemTotal(tbody) {
  const key = tbody.id.replace('tbody-', '');
  const totalEl = document.getElementById(`sem-total-${key}`);
  if (!totalEl) return;
  let total = 0;
  tbody.querySelectorAll('.inp-subj-credits').forEach(inp => {
    const v = parseInt(inp.value);
    if (!isNaN(v) && v > 0) total += v;
  });
  totalEl.textContent = `총 ${total}학점`;
  totalEl.style.color = total > 0 ? 'var(--primary)' : 'var(--gray-400)';
}

function appendSubjRow(tbody, name = "", credits = 3, locked = false) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td class="ac-wrap"><input class="inp-subj-name" type="text" placeholder="과목명 검색 (예: 통, 공통수학)" value="${name}" autocomplete="off" ${locked ? 'disabled' : ''}></td>
    <td><input class="inp-subj-credits" type="number" min="1" max="8" value="${credits}" ${locked ? 'disabled' : ''}></td>
    <td>${locked ? '' : '<button class="btn-remove-row" title="삭제">✕</button>'}</td>
  `;
  if (!locked) {
    tr.querySelector(".btn-remove-row").addEventListener("click", () => {
      tr.remove();
      updateSemTotal(tbody);
    });
    const nameInput    = tr.querySelector(".inp-subj-name");
    const creditsInput = tr.querySelector(".inp-subj-credits");
    creditsInput.addEventListener("input", () => updateSemTotal(tbody));
    attachAutocomplete(nameInput, creditsInput);
  }
  tbody.appendChild(tr);
  updateSemTotal(tbody);
}

// ── 과목 자동완성 ─────────────────────────────────────────────
function buildAcCandidates() {
  const seen = new Set();
  const items = [];
  const AREA_LABEL = { korean:'국어', math:'수학', english:'영어', social:'사회',
    science:'과학', pe:'체육', arts:'예술', others:'기타' };

  // ① 두루고 편제 과목명 (정규 이름) — 공백 제거 소문자로 빠른 조회용 Set 구축
  const duruNames = new Set(); // 정규 과목명 (공백 제거 소문자)
  for (const sub of DURU_SUBJECTS) {
    if (!seen.has(sub.id)) {
      seen.add(sub.id);
      items.push({ display: sub.name, fill: sub.name, credits: sub.credits,
        area: AREA_LABEL[sub.area] || sub.area });
    }
    duruNames.add(sub.name.replace(/\s/g,'').toLowerCase());
  }

  // ② 별칭(alias) — 두루고 정규 과목명과 겹치는 표시명은 제외 (중복 방지)
  for (const entry of SUBJECT_ALIASES) {
    for (const alias of entry.aliases) {
      if (alias.length < 2) continue;
      // 공백 제거 소문자로 비교 → 두루고 과목명과 동일하면 스킵
      if (duruNames.has(alias.replace(/\s/g,'').toLowerCase())) continue;
      const targets = entry.targetIds.map(id => DURU_SUBJECTS.find(s => s.id === id)).filter(Boolean);
      if (targets.length === 0) continue;
      const fillName = targets[0].name;
      const credits  = targets[0].credits;
      const areaLabel = AREA_LABEL[targets[0].area] || targets[0].area;
      if (alias !== fillName) {
        items.push({ display: alias, fill: fillName, credits, area: areaLabel, alias: true });
      }
    }
  }
  return items;
}

let _acCandidates = null;
function getAcCandidates() {
  if (!_acCandidates) _acCandidates = buildAcCandidates();
  return _acCandidates;
}

function searchAc(query) {
  const q = query.replace(/\s/g, '').toLowerCase();
  if (!q) return [];
  const candidates = getAcCandidates();
  const starts = [], contains = [];
  for (const c of candidates) {
    const dn = c.display.replace(/\s/g, '').toLowerCase();
    const fn = c.fill.replace(/\s/g, '').toLowerCase();
    if (dn.startsWith(q) || fn.startsWith(q)) starts.push(c);
    else if (dn.includes(q) || fn.includes(q)) contains.push(c);
  }
  // 중복 제거 (fill 기준)
  const seen = new Set();
  const result = [];
  for (const c of [...starts, ...contains]) {
    if (!seen.has(c.display + '|' + c.fill)) {
      seen.add(c.display + '|' + c.fill);
      result.push(c);
    }
  }
  return result.slice(0, 12);
}

function attachAutocomplete(input, creditsInput) {
  let dropdown = null;
  let activeIdx = -1;
  let items = [];

  function closeDropdown() {
    if (dropdown) { dropdown.remove(); dropdown = null; }
    activeIdx = -1;
  }

  function positionDropdown() {
    if (!dropdown) return;
    const rect = input.getBoundingClientRect();
    // position:fixed → 뷰포트 기준, scrollY 불필요
    dropdown.style.top   = (rect.bottom + 3) + 'px';
    dropdown.style.left  = rect.left + 'px';
    dropdown.style.width = Math.max(rect.width, 260) + 'px';
  }

  function renderDropdown(results) {
    closeDropdown();
    if (results.length === 0) return;

    items = results;
    dropdown = document.createElement('div');
    dropdown.className = 'ac-dropdown';

    results.forEach((c, i) => {
      const div = document.createElement('div');
      div.className = 'ac-item';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'ac-item-name';
      nameSpan.textContent = c.display;
      const metaSpan = document.createElement('span');
      metaSpan.className = 'ac-item-meta';
      metaSpan.textContent = c.area;
      const credSpan = document.createElement('span');
      credSpan.className = 'ac-item-credits';
      credSpan.textContent = `${c.credits}학점`;
      div.appendChild(nameSpan);
      div.appendChild(metaSpan);
      div.appendChild(credSpan);
      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectItem(i);
      });
      dropdown.appendChild(div);
    });

    // body에 붙여 overflow 클리핑 탈출
    document.body.appendChild(dropdown);
    positionDropdown();
  }

  function setActive(idx) {
    if (!dropdown) return;
    const divs = dropdown.querySelectorAll('.ac-item');
    divs.forEach((d, i) => d.classList.toggle('ac-active', i === idx));
    activeIdx = idx;
    if (divs[idx]) divs[idx].scrollIntoView({ block: 'nearest' });
  }

  function selectItem(idx) {
    const c = items[idx];
    if (!c) return;
    // alias 항목은 입력명 그대로 보존 (매칭은 계산 시 내부적으로 처리)
    input.value = c.alias ? c.display : c.fill;
    creditsInput.value = c.credits;
    closeDropdown();
  }

  input.addEventListener('input', () => {
    const results = searchAc(input.value);
    renderDropdown(results);
    activeIdx = -1;
  });

  input.addEventListener('keydown', (e) => {
    if (!dropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(activeIdx + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(activeIdx - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0) { e.preventDefault(); selectItem(activeIdx); }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(closeDropdown, 150);
  });

  input.addEventListener('focus', () => {
    if (input.value) {
      const results = searchAc(input.value);
      renderDropdown(results);
    }
  });

  // 스크롤·리사이즈 시 위치 재계산
  const reposition = () => positionDropdown();
  window.addEventListener('scroll', reposition, true);
  window.addEventListener('resize', reposition);

  // input 제거 시 이벤트 정리
  new MutationObserver((mutations, obs) => {
    if (!document.body.contains(input)) {
      closeDropdown();
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      obs.disconnect();
    }
  }).observe(document.body, { childList: true, subtree: true });
}

// DOM에서 학기별 과목 수집
function collectSemesterSubjects() {
  const { grade, semester } = state.studentInfo;

  const allKeys = getSemesters(grade, semester).map(({year, semester: s}) => `${year}-${s}`);
  // 재학생 2학년 이상이면 교차이수 블록도 수집
  if (state.userType !== 'transfer' && grade >= 2) allKeys.push('cross-y1');
  // 전학생은 전입학기 두루고 이수 희망 선택과목 블록도 수집
  if (state.userType === 'transfer') allKeys.push(`duru-${grade}-${semester}`);

  for (const key of allKeys) {
    const tbody = document.getElementById(`tbody-${key}`);
    if (!tbody) continue;
    state.semesterSubjects[key] = [];
    tbody.querySelectorAll("tr").forEach(row => {
      const nameEl   = row.querySelector(".inp-subj-name");
      const credEl   = row.querySelector(".inp-subj-credits");
      if (!nameEl) return;
      const name    = nameEl.value.trim();
      const credits = parseInt(credEl?.value) || 0;
      const locked  = nameEl.disabled;
      if (name) state.semesterSubjects[key].push({ name, credits, locked });
    });
  }
}

function initStep2() {
  document.getElementById("btn-step2").addEventListener("click", () => {
    collectSemesterSubjects();
    const total = Object.values(state.semesterSubjects).flat().length;
    if (total === 0) { showToast("최소 1개 이상의 과목을 입력해주세요."); return; }
    computeMatching();
    if (state.userType === 'transfer') {
      renderStep3();
      goToStep(3);
    } else {
      renderStep4();
      goToStep(4);
    }
  });
  document.getElementById("btn-back-2").addEventListener("click", () => goToStep(1));
}

// ── 매칭 계산 ────────────────────────────────────────────────
function computeMatching() {
  if (state.userType === 'current') {
    computeCurrentMatching();
  } else {
    computeTransferMatching();
  }
}

// 재학생: 전 학기 과목 자동 매칭
function computeCurrentMatching() {
  const { grade, semester } = state.studentInfo;
  const recognizedIds = new Set();
  const semResults = [];

  for (const { year, semester: s } of getSemesters(grade, semester)) {
    const key = `${year}-${s}`;
    const subjects = (state.semesterSubjects[key] || []).map(sub => {
      const r = autoMatch(sub.name);
      if (r.matched) r.targets.forEach(t => recognizedIds.add(t.id));
      return { ...sub, ...r };
    });
    semResults.push({ year, semester: s, subjects });
  }

  // 재학생 2학년 이상: 1학년 교차이수 블록 과목도 인정
  if (grade >= 2 && state.semesterSubjects['cross-y1']) {
    for (const sub of state.semesterSubjects['cross-y1']) {
      const r = autoMatch(sub.name);
      if (r.matched) r.targets.forEach(t => recognizedIds.add(t.id));
    }
  }

  state.matchResults = { type: 'current', recognizedIds, semResults };
}

// 전학생: 전입 이전 학기 인정 + 전입 학기 편제 매칭
function computeTransferMatching() {
  const { grade, semester } = state.studentInfo;
  const sems = getSemesters(grade, semester);

  // ① 전입 이전 학기: 학점 합산 + 영역별 분류
  // 총 학점(preCredits)은 raw 합산, 영역별(preAreaCredits)은 autoMatch로 area 추출
  let preCredits = 0;
  const preAreaCredits = {}; // { area코드: 학점 } — autoMatch 성공분
  const preUnmatchedSubs = []; // autoMatch 실패 → 수동 영역 지정 대상
  const preSems = [];
  let unmatchedIdx = 0; // key 고유성 보장용 전역 인덱스
  for (const { year, semester: s } of sems) {
    if (year === grade && s === semester) break;
    const key = `${year}-${s}`;
    const subjects = state.semesterSubjects[key] || [];
    const semCredits = subjects.reduce((a, sub) => a + sub.credits, 0);
    preCredits += semCredits;
    for (const sub of subjects) {
      const r = autoMatch(sub.name);
      if (r.matched && r.targets.length > 0) {
        const area = r.targets[0].area;
        if (area) preAreaCredits[area] = (preAreaCredits[area] || 0) + sub.credits;
      } else {
        // 인덱스 포함해 key 완전 고유성 보장 (같은 이름+학점+학기 중복도 구분)
        preUnmatchedSubs.push({ name: sub.name, credits: sub.credits, year, semester: s, idx: unmatchedIdx++ });
      }
    }
    preSems.push({ year, semester: s, subjects, semCredits });
  }

  // ② 두루고 전입학기 고정 과목 (매칭 후 재구성 — 아래 ④ 이후에 확정)
  let duruFixed = [];

  // ③ 분산배치 반 그룹 결정 (1학년만 해당)
  // 이전 학교 과목 매칭 정보 없으므로 전입 전학생은 항상 반 배정에 따라 결정
  const distSlots = [];
  if (grade === 1) {
    for (const pair of COMPLEMENT_PAIRS) {
      const subA = getSubjectById(pair.a);
      const subB = getSubjectById(pair.b);
      if (!subA || !subB) continue;
      distSlots.push({ sub: subA, reason: `'${subA.name}'·'${subB.name}' — 반 배정에 따라 결정`, status: 'both_missing' });
      distSlots.push({ sub: subB, reason: `'${subA.name}'·'${subB.name}' — 반 배정에 따라 결정`, status: 'both_missing' });
    }
  }

  // ④ 전입학기 과목 매칭
  const transKey = `${grade}-${semester}`;
  const transMatchedIds = new Set();
  const transResults = (state.semesterSubjects[transKey] || []).map(sub => {
    const r = autoMatch(sub.name);
    if (r.matched) r.targets.forEach(t => { if (t.id) transMatchedIds.add(t.id); });
    return { ...sub, ...r, isDuplicate: false };
  });

  // ④-a 두루고 이수 희망 선택과목도 transMatchedIds에 추가
  // (이전 학교 매칭과 무관하게 학생이 직접 선택한 두루고 과목)
  const duruElectKey = `duru-${grade}-${semester}`;
  (state.semesterSubjects[duruElectKey] || []).forEach(sub => {
    const r = autoMatch(sub.name);
    if (r.matched) r.targets.forEach(t => { if (t.id) transMatchedIds.add(t.id); });
  });

  // 교양 보완쌍 상호 인정: 진로와직업(CA_1) ↔ 생태와환경(EC_1)
  if (transMatchedIds.has('CA_1')) transMatchedIds.add('EC_1');
  if (transMatchedIds.has('EC_1')) transMatchedIds.add('CA_1');

  // ④-b 두루고 전입학기 과목 확정: 필수 과목 + 학생이 선택한 과목
  // 필수 과목(selectionPool·choiceGroup 없는 것)은 항상 포함
  // 선택과목은 학생이 실제 입력하여 매칭된 것만 포함 (미선택 과목은 제외)
  duruFixed = DURU_SUBJECTS.filter(s =>
    s.year === grade && s.semester === semester &&
    ((!s.selectionPool && !s.choiceGroup) || transMatchedIds.has(s.id))
  );

  // ⑤ 슬롯별 매칭 상태 판정
  const fixedSlotStatus = duruFixed.map(slot => ({
    slot,
    matched: transMatchedIds.has(slot.id),
    preDup: false,  // 이전 학기 매칭 제거로 항상 false
  }));

  const distSlotStatus = distSlots.map(ds => ({
    ...ds,
    matched: ds.sub ? transMatchedIds.has(ds.sub.id) : false,
  }));

  // ⑥ 최종 allIds = 전입학기 매칭/이수 예정 두루고 과목
  // (이전 학기는 preCredits로 별도 처리하므로 allIds에 포함 안 함)
  const allIds = new Set();

  // 두루고 배정 슬롯(비매칭 포함)도 인정 IDs에 추가
  // (비매칭 = 두루고에서 새로 이수할 과목이므로 편제상 포함)
  distSlotStatus
    .filter(ds => (ds.status === 'assigned' || ds.status === 'both_missing') && ds.sub)
    .forEach(ds => allIds.add(ds.sub.id));
  fixedSlotStatus
    .forEach(({ slot }) => allIds.add(slot.id));

  // 전입학기 학생이 선택한 선택과목도 이수 예정으로 allIds에 추가
  // (정상적으로 학교를 다닐 것으로 가정)
  transMatchedIds.forEach(id => allIds.add(id));

  state.matchResults = {
    type: 'transfer',
    preSems, preCredits, preAreaCredits, preUnmatchedSubs,
    transResults, transMatchedIds,
    fixedSlotStatus, distSlotStatus,
    allIds,
  };
}

// ── Step 3: 전입학기 매칭 검토 렌더링 ───────────────────────
function renderStep3() {
  const mr = state.matchResults;
  const { grade, semester } = state.studentInfo;

  // ── 이전 학기 요약 ──
  const preSumEl = document.getElementById("pre-sem-summary");
  preSumEl.innerHTML = "";

  if (mr.preSems.length > 0) {
    const card = document.createElement("div");
    card.className = "card";
    const totalPreCredits = mr.preCredits || 0;
    card.innerHTML = `<div class="card-title">✅ 전입 이전 학기 이수 학점 인정</div>`;

    for (const sem of mr.preSems) {
      const semDiv = document.createElement("div");
      semDiv.className = "pre-sem-block";
      semDiv.innerHTML = `
        <div class="pre-sem-header">
          ${sem.year}학년 ${sem.semester}학기 &nbsp;—&nbsp;
          <strong>${sem.semCredits}학점</strong> 이수 완료
          <span style="color:var(--gray-400);font-size:0.8rem;margin-left:6px">(자동 인정)</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">
          ${sem.subjects.map(s =>
            `<span class="subj-chip pre-chip">${s.name}(${s.credits}학점)</span>`
          ).join("")}
        </div>
      `;
      card.appendChild(semDiv);
    }

    const totalDiv = document.createElement("div");
    totalDiv.style.cssText = "margin-top:12px;padding-top:10px;border-top:1px solid var(--gray-200);font-size:0.9rem;color:var(--gray-700)";
    totalDiv.innerHTML = `합계 <strong>${totalPreCredits}학점</strong> — 졸업 학점 산정에 반영`;
    card.appendChild(totalDiv);

    // 두루고 동기간 편제 학점과 비교
    const durugoEquiv = mr.preSems.reduce((acc, sem) =>
      acc + (GRADUATION_REQUIREMENTS.creditsPerSemester[sem.year] || 0), 0);
    const diff = totalPreCredits - durugoEquiv;
    let compColor, compIcon, compText;
    if (diff < 0) {
      compColor = "#dc2626"; compIcon = "⬇";
      compText = `두루고 동기간 편제 학점(${durugoEquiv}학점)보다 <strong>${Math.abs(diff)}학점 적음</strong> — 졸업 학점 확보에 영향`;
    } else if (diff > 0) {
      compColor = "#16a34a"; compIcon = "⬆";
      compText = `두루고 동기간 편제 학점(${durugoEquiv}학점)보다 <strong>${diff}학점 많음</strong>`;
    } else {
      compColor = "#2563eb"; compIcon = "＝";
      compText = `두루고 동기간 편제 학점(${durugoEquiv}학점)과 <strong>동일</strong>`;
    }
    const compDiv = document.createElement("div");
    compDiv.style.cssText = `margin-top:8px;padding:8px 12px;border-radius:8px;background:#f8fafc;border-left:3px solid ${compColor};font-size:0.82rem;color:var(--gray-700)`;
    compDiv.innerHTML = `<span style="color:${compColor};font-weight:700;margin-right:6px">${compIcon} 두루고 비교</span>${compText}`;
    card.appendChild(compDiv);
    preSumEl.appendChild(card);

    // ── 수동 영역 지정 (autoMatch 실패 과목) ──
    const unmatchedSubs = mr.preUnmatchedSubs || [];
    if (unmatchedSubs.length > 0) {
      const manualCard = document.createElement("div");
      manualCard.className = "card";
      manualCard.style.marginTop = "12px";

      const areaOptions = [['', '영역 미지정'], ...Object.entries(AREA_NAMES)]
        .map(([code, name]) => `<option value="${code}">${name}</option>`)
        .join('');

      let rows = '';
      for (const sub of unmatchedSubs) {
        // key에 학년-학기 포함 → 같은 과목명이 여러 학기에 중복 등장해도 각각 처리
        const key = `${sub.name}|${sub.credits}|${sub.year}-${sub.semester}|${sub.idx}`;
        const cur = state.manualAreaMappings[key] || '';
        rows += `
          <tr>
            <td style="padding:6px 8px;font-size:0.88rem">${sub.name} <span style="color:var(--gray-400);font-size:0.78rem">(${sub.year}학년 ${sub.semester}학기)</span></td>
            <td style="padding:6px 8px;font-size:0.88rem;color:var(--gray-500)">${sub.credits}학점</td>
            <td style="padding:6px 4px">
              <select data-key="${key}"
                style="font-size:0.83rem;padding:4px 6px;border:1px solid var(--gray-300);border-radius:6px;width:100%"
                onchange="onManualAreaChange(this)">
                ${areaOptions.replace(`value="${cur}"`, `value="${cur}" selected`)}
              </select>
            </td>
          </tr>`;
      }

      manualCard.innerHTML = `
        <div class="card-title">✏️ 교과 영역 수동 지정</div>
        <p style="font-size:0.82rem;color:var(--gray-500);margin-bottom:12px">
          두루고 편제와 과목명이 달라 자동 분류되지 않은 과목입니다.
          담당 교사가 해당 교과 영역을 지정하면 졸업 분석에 즉시 반영됩니다.
        </p>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="font-size:0.8rem;color:var(--gray-500);border-bottom:1px solid var(--gray-200)">
              <th style="text-align:left;padding:4px 8px;font-weight:600">과목명</th>
              <th style="text-align:left;padding:4px 8px;font-weight:600">학점</th>
              <th style="text-align:left;padding:4px 8px;font-weight:600">교과 영역</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`;
      preSumEl.appendChild(manualCard);
    }
  }

  // ── 전입학기 두루고 편제 매칭 ──
  const transEl = document.getElementById("transfer-matching");
  transEl.innerHTML = "";

  const card2 = document.createElement("div");
  card2.className = "card";
  card2.innerHTML = `
    <div class="card-title">🔀 두루고 ${grade}학년 ${semester}학기 편제 매칭</div>
    <p style="font-size:0.83rem;color:var(--gray-500);margin-bottom:14px">
      이전 학교 과목이 두루고 ${grade}학년 ${semester}학기 편제 슬롯과 어떻게 연결되는지 확인하세요.
    </p>
  `;

  // 고정 과목 슬롯
  const fixedWrap = document.createElement("div");
  fixedWrap.innerHTML = `<div class="slot-section-title">두루고 편제 과목 매칭</div>`;

  for (const { slot, matched, preDup } of mr.fixedSlotStatus) {
    fixedWrap.appendChild(makeSlotRow(slot, matched, preDup, mr, '중복이수'));
  }
  card2.appendChild(fixedWrap);

  // 분산배치 슬롯
  if (mr.distSlotStatus.length > 0) {
    const distWrap = document.createElement("div");
    distWrap.style.marginTop = "18px";
    distWrap.innerHTML = `<div class="slot-section-title">분산배치 과목 (교차이수 보완쌍)</div>`;

    // both_missing 쌍에서 한쪽이 매칭되면 파트너(미매칭) 숨김
    const bothMissingMatchedIds = new Set(
      mr.distSlotStatus
        .filter(ds => ds.status === 'both_missing' && ds.matched && ds.sub)
        .map(ds => ds.sub.id)
    );

    for (const ds of mr.distSlotStatus) {
      if (!ds.sub) continue;
      const isDupPre = ds.status === 'dup_pre';
      const isBothMissing = ds.status === 'both_missing';
      // both_missing이고 미매칭인데, 쌍 파트너가 이미 매칭됐으면 이 슬롯 숨김
      if (isBothMissing && !ds.matched) {
        const pair = COMPLEMENT_PAIRS.find(p => p.a === ds.sub.id || p.b === ds.sub.id);
        if (pair) {
          const partnerId = pair.a === ds.sub.id ? pair.b : pair.a;
          if (bothMissingMatchedIds.has(partnerId)) continue;
          if (pair.b === ds.sub.id) continue; // secondary(subB)는 미매칭 시 항상 숨김
        }
      }
      const row = makeSlotRow(ds.sub, ds.matched, isDupPre, mr, isDupPre ? '중복이수' : null);
      // 이유 태그 추가
      const badge = row.querySelector(".match-method");
      if (!badge) {
        const reasonTag = document.createElement("span");
        reasonTag.className = "match-method";
        reasonTag.textContent = ds.reason;
        row.querySelector(".match-target").appendChild(reasonTag);
      }
      distWrap.appendChild(row);
    }
    card2.appendChild(distWrap);
  }

  // 매칭 안 된 전출교 과목
  const unmatched = mr.transResults.filter(r => !r.matched);
  if (unmatched.length > 0) {
    const warnDiv = document.createElement("div");
    warnDiv.className = "unmatched-warn-block";
    warnDiv.innerHTML = `
      <div style="font-weight:700;font-size:0.85rem;margin-bottom:6px">⚠️ 두루고 편제와 매칭되지 않은 과목</div>
      <div>${unmatched.map(m => `<span class="subj-chip" style="background:var(--warn-light);color:var(--warn);border:1px solid #fde68a">${m.name}(${m.credits}학점)</span>`).join("")}</div>
      <div style="font-size:0.78rem;color:var(--gray-600);margin-top:8px">담당 교사와 인정 여부를 확인하세요.</div>
    `;
    card2.appendChild(warnDiv);
  }

  // 중복이수 경고
  const dupSubjects = mr.transResults.filter(r => r.isDuplicate);
  if (dupSubjects.length > 0) {
    const dupDiv = document.createElement("div");
    dupDiv.className = "dup-warn-block";
    const dupLines = dupSubjects.map(m => {
      const chip = `<span class="subj-chip" style="background:#fef9c3;color:#92400e;border:1px solid #fde68a">${m.name}(${m.credits}학점)</span>`;
      const targets = (m.targets || []);
      const mappedTarget = targets.find(t => t.name !== m.name);
      if (mappedTarget) {
        return `<div style="margin-bottom:4px">${chip} <span style="color:var(--gray-600);font-size:0.78rem">→ <b>${mappedTarget.name}</b>으로 인정되어 중복이수</span></div>`;
      } else if (targets.length > 0) {
        return `<div style="margin-bottom:4px">${chip} <span style="color:var(--gray-600);font-size:0.78rem">→ 동일 과목 중복이수</span></div>`;
      }
      return `<div style="margin-bottom:4px">${chip}</div>`;
    }).join("");
    dupDiv.innerHTML = `
      <div style="font-weight:700;font-size:0.85rem;margin-bottom:8px">🔁 중복 이수 과목</div>
      ${dupLines}
      <div style="font-size:0.78rem;color:var(--gray-600);margin-top:4px">교과 총점(국·영·수 등) 한도 초과 여부를 확인하세요.</div>
    `;
    card2.appendChild(dupDiv);
  }

  transEl.appendChild(card2);
}

// 슬롯 카드 생성 헬퍼
function makeSlotRow(slot, matched, preDup, mr, dupLabel) {
  const div = document.createElement("div");
  div.className = `match-card ${preDup ? "unmatched" : matched ? "matched" : "unmatched"}`;

  const badge = preDup
    ? `<span class="badge" style="background:#fef9c3;color:#92400e">${dupLabel || '중복이수'}</span>`
    : matched
    ? `<span class="badge badge-match">매칭</span>`
    : `<span class="badge badge-nomatch">비매칭</span>`;

  const from = mr.transResults.filter(r => r.matched && r.targets.some(t => t.id === slot.id));
  const fromHtml = from.length > 0
    ? `<span class="match-prev-name">${from.map(m => m.name).join(", ")}</span>`
    : preDup
    ? `<span style="color:var(--warn);font-size:0.85rem">이전 학기 이수</span>`
    : `<span style="color:var(--gray-400);font-size:0.85rem">해당 없음 (두루고에서 신규 이수)</span>`;

  div.innerHTML = `
    <div class="match-header">
      <div class="match-target">
        <span class="match-target-name">[두루고] ${slot.name}</span>
        <span style="font-size:0.8rem;color:var(--gray-500)">${slot.credits}학점 · ${typeLabel(slot.type)}</span>
      </div>
      <div class="match-arrow">←</div>
      <div class="match-prev">${fromHtml}</div>
      ${badge}
    </div>
  `;
  return div;
}

// ── 택1 그룹 접기 ────────────────────────────────────────────
function collapseChoiceGroups(subjects) {
  const seenGroups = new Set();
  return subjects.reduce((acc, s) => {
    if (!s.choiceGroup) {
      acc.push(s);
    } else if (!seenGroups.has(s.choiceGroup)) {
      seenGroups.add(s.choiceGroup);
      const allOptions = DURU_SUBJECTS.filter(x => x.choiceGroup === s.choiceGroup);
      acc.push({ ...s, isChoiceSlot: true,
        displayName: allOptions.map(x => x.name).join(" / "),
        choiceOptions: allOptions.map(x => x.name) });
    }
    return acc;
  }, []);
}

// ── 학점 계산 ────────────────────────────────────────────────
function calcResults() {
  const recognizedIds = state.userType === 'current'
    ? new Set(state.matchResults.recognizedIds)
    : new Set(state.matchResults.allIds);

  const alreadyDone = DURU_SUBJECTS.filter(s => recognizedIds.has(s.id));

  const satisfiedGroups = new Set();
  for (const s of alreadyDone) {
    if (s.choiceGroup) satisfiedGroups.add(s.choiceGroup);
  }

  const toComplete = DURU_SUBJECTS.filter(s =>
    !recognizedIds.has(s.id) &&
    !(s.choiceGroup && satisfiedGroups.has(s.choiceGroup))
  );
  const toCompleteCollapsed = collapseChoiceGroups(toComplete);

  // 전학생: 이전 학기는 raw preCredits로 인정 (두루고 과목 매칭 없음)
  // 재학생: 두루고 편제 기준 인정 학점
  let recognizedCredits = state.userType === 'transfer'
    ? (state.matchResults.preCredits || 0)
    : alreadyDone.reduce((a, s) => a + s.credits, 0);

  const dupIds = new Set(); // 중복이수는 이전학기 매칭 제거로 더 이상 발생 안 함

  // 전학생: 남은 두루고 이수 가능 학점 = 학기당 학점 합계 (1학년 31, 2학년 29, 3학년 27)
  // selectionPool 과목 중복 합산을 방지하기 위해 편제 상 학기별 학점 기준으로 계산
  const { grade: curGrade, semester: curSem } = state.studentInfo;

  let remainCredits;
  if (state.userType === 'transfer') {
    let durugoCapacity = 0;
    for (let g = curGrade; g <= 3; g++) {
      const startS = (g === curGrade) ? curSem : 1;
      for (let s = startS; s <= 2; s++) {
        durugoCapacity += GRADUATION_REQUIREMENTS.creditsPerSemester[g];
      }
    }
    remainCredits = durugoCapacity;
  } else {
    remainCredits = toCompleteCollapsed.reduce((a, s) => a + s.credits, 0);
  }

  const totalExpected  = recognizedCredits + remainCredits + ACTIVITY_CREDITS;

  // 영역별 breakdown용: 수강 가능한 과목 목록 (selectionPool 과목 포함하므로 합계는 상한값)
  const reachableToComplete = state.userType === 'transfer'
    ? toCompleteCollapsed.filter(s =>
        (s.year === 1 && s.semester === null) ||
        s.year > curGrade ||
        (s.year === curGrade && s.semester >= curSem)
      )
    : toCompleteCollapsed;

  const mandatoryToComplete = toCompleteCollapsed.filter(s => s.type === "common");
  const electiveToComplete  = toCompleteCollapsed.filter(s => s.type !== "common");

  // 이전 학기 영역별 학점: autoMatch 성공분 + 수동 지정분 합산
  const preAreaCredits = {};
  if (state.userType === 'transfer') {
    for (const [code, credits] of Object.entries(state.matchResults.preAreaCredits || {})) {
      preAreaCredits[code] = (preAreaCredits[code] || 0) + credits;
    }
    for (const [key, areaCode] of Object.entries(state.manualAreaMappings || {})) {
      if (!areaCode) continue;
      const credits = parseInt(key.split('|')[1]) || 0;
      preAreaCredits[areaCode] = (preAreaCredits[areaCode] || 0) + credits;
    }
  }

  const areaStatus = {};
  for (const [code, name] of Object.entries(AREA_NAMES)) {
    const required = GRADUATION_REQUIREMENTS.areaMinCredits[code] || 0;
    // 두루고 과목 기준 done (전입학기 매칭 포함)
    let done = alreadyDone.filter(s => s.area === code).reduce((a, s) => a + s.credits, 0);
    // 전학생: 이전 학기 영역별 학점 추가 (autoMatch 성공분만, raw 학점 기준)
    done += preAreaCredits[code] || 0;
    const remain = reachableToComplete.filter(s => s.area === code).reduce((a, s) => a + s.credits, 0);
    areaStatus[code] = { name, required, done, remain };
  }

  // 전학생 비매칭 과목 (두루고 편제에 없는 것)
  const unresolvable = state.userType === 'transfer'
    ? (state.matchResults.transResults || []).filter(m => !m.matched && !m.isDuplicate)
    : [];

  return {
    recognizedIds, recognizedCredits, remainCredits, totalExpected, alreadyDone,
    toComplete, toCompleteCollapsed, mandatoryToComplete, electiveToComplete,
    areaStatus, unresolvable,
    graduationReady: totalExpected >= GRADUATION_REQUIREMENTS.totalCredits,
  };
}

// ── Step 4: 결과 렌더링 ──────────────────────────────────────
function renderStep4() {
  const res = calcResults();
  const isCurrent = state.userType === 'current';

  const pct = Math.min(100, Math.round(
    (res.recognizedCredits + ACTIVITY_CREDITS) / GRADUATION_REQUIREMENTS.totalCredits * 100
  ));

  document.getElementById("result-name").textContent = state.studentInfo.name;
  document.getElementById("result-type-badge").textContent = isCurrent
    ? "재학생"
    : `전입 ${state.studentInfo.grade}학년 ${state.studentInfo.semester}학기`;
  document.getElementById("result-recognized").textContent = res.recognizedCredits;
  document.getElementById("result-remaining").textContent  = res.remainCredits;
  document.getElementById("result-total").textContent      = res.totalExpected;
  document.getElementById("progress-bar-fill").style.width = pct + "%";
  document.getElementById("progress-bar-pct").textContent  = pct + "%";
  document.getElementById("progress-need").textContent     = res.remainCredits;
  document.getElementById("label-recognized").textContent  = "인정 학점";

  const statusEl = document.getElementById("graduation-status");
  const totalGap = GRADUATION_REQUIREMENTS.totalCredits - res.totalExpected;
  if (totalGap <= 0) {
    statusEl.className = "grad-status grad-ok";
    statusEl.innerHTML = `✅ 계획대로 이수 시 졸업 요건 192학점 충족 — 남은 교과 학점 <strong>${res.remainCredits}학점</strong> 이수 필요`;
  } else {
    statusEl.className = "grad-status grad-warn";
    statusEl.innerHTML = `⚠️ 현재 ${isCurrent ? "이수" : "인정"} 교과 학점 ${res.recognizedCredits}학점으로는 <strong>${totalGap}학점 부족</strong> — 아래 과목 이수 계획 필수`;
  }

  // 영역별 현황
  const areaBody = document.getElementById("area-table-body");
  areaBody.innerHTML = "";

  // 전학생 안내: 이전 학교 학점은 영역별로 매핑 불가
  const areaNote = document.getElementById("area-transfer-note");
  if (areaNote) areaNote.remove();
  if (!isCurrent) {
    const note = document.createElement("div");
    note.id = "area-transfer-note";
    note.style.cssText = "font-size:0.82rem;color:var(--gray-500);margin-bottom:10px;padding:8px 12px;background:var(--gray-50);border-radius:8px";
    const unmatchedCount = (state.matchResults?.preUnmatchedSubs || []).length;
    const unmatchedNote = unmatchedCount > 0
      ? ` 과목명 불일치로 자동 분류 안 된 <strong>${unmatchedCount}개 과목</strong>은 Step 3에서 영역을 수동 지정하세요.`
      : '';
    note.innerHTML = `ℹ️ 이전 학교 이수 학점은 과목명 매칭 성공 시에만 영역별로 분류됩니다.${unmatchedNote}`;
    areaBody.closest("table")?.parentElement?.insertBefore(note, areaBody.closest("table"));
  }

  for (const [code, st] of Object.entries(res.areaStatus)) {
    if (st.required === 0 && st.done === 0) continue;
    const pctArea = st.required > 0 ? Math.min(100, Math.round(st.done / st.required * 100)) : 100;
    const ok = st.required === 0 || st.done >= st.required;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${st.name}</td>
      <td class="num">${st.required || "—"}</td>
      <td class="num text-green">${st.done}</td>
      <td class="num text-orange">${st.remain > 0 ? st.remain : "—"}</td>
      <td><div class="mini-bar"><div class="mini-bar-fill" style="width:${pctArea}%"></div></div></td>
      <td class="${ok ? "text-green" : "text-red"}">${ok ? "✔ 충족" : `✘ ${st.required - st.done}학점 부족`}</td>
    `;
    areaBody.appendChild(tr);
  }

  // 재학생: 자동 충족 안내
  const autoCard = document.getElementById("auto-satisfied-card");
  if (autoCard) autoCard.style.display = isCurrent ? "block" : "none";
  if (isCurrent) renderAutoSatisfiedGuidance(res);

  // 전학생 모드는 "인정 처리된 두루고 과목" 섹션 불필요 → 숨김
  const recognizedCard = document.getElementById("recognized-list-title")?.closest(".card");
  if (recognizedCard) recognizedCard.style.display = isCurrent ? "block" : "none";
  if (isCurrent) {
    document.getElementById("recognized-list-title").textContent = "이수 중 / 이수 완료 두루고 과목";
    renderSubjectList("recognized-list", res.alreadyDone);
  }
  renderAlternativePaths(res);
}

// ── 재학생: 편제 자동 충족 영역 안내 ─────────────────────────
function renderAutoSatisfiedGuidance(res) {
  const el = document.getElementById("auto-satisfied-section");
  if (!el) return;
  const pe   = res.areaStatus.pe;
  const arts = res.areaStatus.arts;
  const oth  = res.areaStatus.others;

  const peIds   = ["PE_1_1","PE_1_2","PE_2_1","PE_2_2","PE_3_1","PE_3_2"];
  const artsIds = ["MU_1","AR_1"];
  const othIds  = ["TH_1","IN_1","CA_1","EC_1"];

  function missingFrom(ids) {
    return ids.filter(id => !res.recognizedIds.has(id))
      .map(id => { const s = DURU_SUBJECTS.find(x => x.id === id); return s ? s.name : id; });
  }

  const peMissing  = missingFrom(peIds);
  const artsMissing = missingFrom(artsIds);

  const lang1Done = ["L2_CN1","L2_JP1","L2_HN1"].some(id => res.recognizedIds.has(id));
  const lang2Done = ["L2_CN2","L2_JP2","L2_HN2"].some(id => res.recognizedIds.has(id));
  const arts1Done = ["MU_3_1","AR_3_1"].some(id => res.recognizedIds.has(id));
  const arts2Done = ["MU_3_2","AR_3_2"].some(id => res.recognizedIds.has(id));

  const othMissing = [
    ...missingFrom(othIds),
    ...(!lang1Done ? ["제2외국어·한문① (중국어/일본어/한문 중 택1)"] : []),
    ...(!lang2Done ? ["제2외국어·한문② (중국어회화/일본어회화/언어생활과한자 중 택1)"] : []),
  ];
  const artsMissingFull = [
    ...artsMissing,
    ...(!arts1Done ? ["예술③ (음악연주와창작/미술창작 중 택1)"] : []),
    ...(!arts2Done ? ["예술④ (음악감상과비평/미술감상과비평 중 택1)"] : []),
  ];

  function statusRow(areaName, required, done, missing, note) {
    const ok = missing.length === 0;
    const icon = ok ? "✅" : "⚠️";
    const missingHtml = ok
      ? `<span style="color:var(--accent);font-weight:600">정상 이수 시 충족 예정</span>`
      : `<span style="color:var(--warn)">미이수: <strong>${missing.join(", ")}</strong></span>`;
    return `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--gray-100)">
        <span style="font-size:1.1rem;flex-shrink:0">${icon}</span>
        <div style="flex:1">
          <div style="font-weight:700;font-size:0.88rem">${areaName} <span style="font-weight:400;color:var(--gray-500)">(최소 ${required}학점 / 현재 ${done}학점)</span></div>
          <div style="font-size:0.82rem;margin-top:3px">${missingHtml}</div>
          ${note ? `<div style="font-size:0.78rem;color:var(--gray-500);margin-top:3px">${note}</div>` : ""}
        </div>
      </div>`;
  }

  el.innerHTML = `
    <div style="background:var(--info-light);border:1px solid #a5f3fc;border-radius:10px;padding:16px 18px">
      <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px;color:#0e7490">ℹ️ 편제 기반 자동 충족 영역 안내</div>
      <p style="font-size:0.82rem;color:#0e7490;margin-bottom:12px">
        아래 3개 영역은 두루고 편제 과목을 빠짐없이 이수하면 최소 이수 학점이 <strong>자동으로 충족</strong>됩니다.
      </p>
      ${statusRow("체육", 10, pe.done, peMissing, "체육1·2 + 스포츠생활1·2 + 스포츠문화 + 스포츠과학 = 10학점")}
      ${statusRow("예술(음악·미술)", 10, arts.done, artsMissingFull, "음악·미술(1학년) + 3학년 택1 두 그룹(각 2학점) = 10학점")}
      ${statusRow("기가/정보/제2외국어/교양", 16, oth.done, othMissing, "1학년 기가·정보·진로·생태(10학점) + 2학년 제2외국어 택1 두 그룹(6학점) = 16학점")}
    </div>
  `;
}

// ── 과목 목록 (칩) ────────────────────────────────────────────
function renderSubjectList(containerId, subjects) {
  const el = document.getElementById(containerId);
  el.innerHTML = "";
  if (subjects.length === 0) {
    el.innerHTML = `<p class="empty-msg">해당 과목 없음</p>`;
    return;
  }
  const groups = {};
  for (const s of subjects) {
    const area = AREA_NAMES[s.area] || s.area;
    if (!groups[area]) groups[area] = [];
    groups[area].push(s);
  }
  for (const [area, list] of Object.entries(groups)) {
    const section = document.createElement("div");
    section.className = "subj-group";
    section.innerHTML = `<div class="subj-group-title">${area}</div>`;
    for (const s of list) {
      const chip = document.createElement("span");
      chip.className = "subj-chip";
      if (s.isChoiceSlot) {
        chip.classList.add("chip-choice");
        chip.innerHTML = `${s.displayName} <em style="opacity:.7">(${s.credits}학점, 택1)</em>`;
      } else {
        chip.textContent = `${s.name} (${s.credits}학점)`;
      }
      if (s.campus) chip.classList.add("chip-campus");
      section.appendChild(chip);
    }
    el.appendChild(section);
  }
}

function renderAlternativePaths(res) {
  const section = document.getElementById("alternative-section");
  section.innerHTML = "";

  // 두루고 편제 과목을 모두 이수해도 졸업 요건 미충족 여부 확인
  // 전학생: 이전 학교 학점이 영역별 미반영이므로 영역 부족 판단 불가 → 총학점만 기준
  const isCur = state.userType === 'current';
  const hasAreaShortfall = isCur
    ? Object.values(res.areaStatus).some(st => st.required > 0 && (st.done + st.remain) < st.required)
    : false;
  const needsExtra = !res.graduationReady || hasAreaShortfall;

  const div = document.createElement("div");
  div.className = "alt-card online";

  if (!needsExtra) {
    div.style.cssText = "background:#f0fdf4;border-color:#bbf7d0";
    div.innerHTML = `
      <div style="font-weight:600;color:#15803d;margin-bottom:6px">✅ 두루고 교육과정 이수만으로 졸업학점 및 교과별 필수 이수학점 충족 가능</div>
      <p class="alt-desc" style="color:#166534">
        캠퍼스형 공동교육과정이나 온세종학교 수강 없이 두루고 편제 과목 이수만으로 졸업 요건을 충족할 수 있습니다.
      </p>
    `;
  } else {
    div.innerHTML = `
      <p class="alt-desc">
        두루고 교육과정만으로 졸업 필수 학점 또는 교과별 필수 학점을 채우기 어려운 경우,
        <strong>캠퍼스형 공동교육과정</strong> 또는 <strong>온세종학교</strong>의 개설 과목을 확인하여
        추가 이수를 계획하세요. 담임·교무 선생님과 상담 후 수강 신청하세요.
      </p>
    `;
  }
  section.appendChild(div);
}

function renderWarnings(res) {
  const list = document.getElementById("warning-list");
  list.innerHTML = "";
  const isCurrent = state.userType === 'current';
  const warnings = [];

  // 영역별 경고
  for (const [code, st] of Object.entries(res.areaStatus)) {
    if (st.required === 0) continue;
    if (isCurrent) {
      // 재학생: 현재 이수 학점 기준
      if (st.done < st.required) {
        warnings.push({
          level: "error",
          msg: `<strong>${st.name}</strong> 영역 최소 이수 학점 미달 (필요 ${st.required}학점, 이수 ${st.done}학점 — ${st.required - st.done}학점 부족)`,
        });
      }
    } else {
      // 전학생: done(전입학기) + remain(두루고 이수 예정) 합산 기준
      // → 두루고 편제만으로도 해당 영역을 채울 수 없을 때만 경고
      if ((st.done + st.remain) < st.required) {
        warnings.push({
          level: "error",
          msg: `<strong>${st.name}</strong> 영역 학점 부족 우려 — 두루고 편제 이수 후 예상 ${st.done + st.remain}학점 (필요 ${st.required}학점). 이전 학교 이수 학점 포함 여부를 담당 교사와 확인하세요.`,
        });
      }
    }
  }

  if (!res.graduationReady) {
    warnings.push({ level: "error", msg: `졸업 요건 192학점 미달 예상 — 현재 예상 ${res.totalExpected}학점` });
  }

  if (!isCurrent && res.unresolvable.length > 0) {
    warnings.push({
      level: "warn",
      msg: `두루고 편제와 매칭되지 않은 과목 ${res.unresolvable.length}개 — 학교 담당 교사와 인정 여부 확인 필요`,
    });
  }

  warnings.push({ level: "info", msg: "이 계산기는 참고용이며, 최종 이수 여부는 반드시 학교 교무실과 확인하세요." });
  if (!isCurrent) {
    warnings.push({ level: "info", msg: "전학생 학점 인정은 「고등학교 학사 운영 지침」 및 학교 내규에 따릅니다." });
  }

  for (const w of warnings) {
    const li = document.createElement("li");
    li.className = `warn-item warn-${w.level}`;
    li.innerHTML = w.msg;
    list.appendChild(li);
  }
}

// ── 단계 전환 ────────────────────────────────────────────────
function goToStep(n) {
  state.step = n;
  document.querySelectorAll(".step-panel").forEach((el, i) => {
    el.classList.toggle("active", i + 1 === n);
  });
  document.querySelectorAll(".progress-step").forEach((el, i) => {
    el.classList.remove("done", "active", "skipped");
    if (state.userType === 'current' && i + 1 === 3) {
      el.classList.add("skipped");
    } else if (i + 1 < n) {
      el.classList.add("done");
    } else if (i + 1 === n) {
      el.classList.add("active");
    }
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── 인쇄 ──────────────────────────────────────────────────────
function printResult() { window.print(); }

// ── 수동 영역 지정 onChange ───────────────────────────────────
function onManualAreaChange(selectEl) {
  const key = selectEl.dataset.key;
  const areaCode = selectEl.value;
  state.manualAreaMappings[key] = areaCode;

  // Step 4가 열려 있으면 영역 테이블 + 졸업 판정 실시간 업데이트
  if (state.step === 4) {
    refreshStep4Area();
  }
}

// Step 4 영역 테이블 + 졸업 판정 부분 업데이트
function refreshStep4Area() {
  const res = calcResults();

  // 영역별 현황 테이블
  const areaBody = document.getElementById("area-table-body");
  if (areaBody) {
    areaBody.innerHTML = "";
    for (const [code, st] of Object.entries(res.areaStatus)) {
      if (st.required === 0 && st.done === 0) continue;
      const pctArea = st.required > 0 ? Math.min(100, Math.round(st.done / st.required * 100)) : 100;
      const ok = st.required === 0 || st.done >= st.required;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${st.name}</td>
        <td class="num">${st.required || "—"}</td>
        <td class="num text-green">${st.done}</td>
        <td class="num text-orange">${st.remain > 0 ? st.remain : "—"}</td>
        <td><div class="mini-bar"><div class="mini-bar-fill" style="width:${pctArea}%"></div></div></td>
        <td class="${ok ? "text-green" : "text-red"}">${ok ? "✔ 충족" : `✘ ${st.required - st.done}학점 부족`}</td>
      `;
      areaBody.appendChild(tr);
    }
  }

  // 졸업 판정 상태
  const statusEl = document.getElementById("graduation-status");
  if (statusEl) {
    const isCurrent = state.userType === 'current';
    const totalGap = GRADUATION_REQUIREMENTS.totalCredits - res.totalExpected;
    if (totalGap <= 0) {
      statusEl.className = "grad-status grad-ok";
      statusEl.innerHTML = `✅ 계획대로 이수 시 졸업 요건 192학점 충족 — 남은 교과 학점 <strong>${res.remainCredits}학점</strong> 이수 필요`;
    } else {
      statusEl.className = "grad-status grad-warn";
      statusEl.innerHTML = `⚠️ 현재 ${isCurrent ? "이수" : "인정"} 교과 학점 ${res.recognizedCredits}학점으로는 <strong>${totalGap}학점 부족</strong> — 아래 과목 이수 계획 필수`;
    }
  }

  // 경고 목록 갱신
  renderWarnings(res);
  renderAlternativePaths(res);
}

// ── 토스트 ───────────────────────────────────────────────────
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}

// ── 초기화 ───────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initStep1();
  initStep2();

  document.getElementById("btn-step3").addEventListener("click", () => {
    renderStep4();
    goToStep(4);
  });
  document.getElementById("btn-back-3").addEventListener("click", () => goToStep(2));
  document.getElementById("btn-back-4").addEventListener("click", () => {
    if (state.userType === 'current') goToStep(2);
    else goToStep(3);
  });
  document.getElementById("btn-print").addEventListener("click", printResult);
  document.getElementById("btn-restart").addEventListener("click", () => {
    if (confirm("처음부터 다시 시작하시겠습니까?")) location.reload();
  });

  goToStep(1);
});
