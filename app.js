// 사주 계산기
// - 년주: 입춘 기준, 월주: 절기(절입) 기준 — 태양의 위치(황경)로 계산
// - 일주: 날짜 순번으로 60갑자 계산, 23시 이후는 다음 날로 봄
// - 시주: 일간 기준으로 시의 천간을 정함
// - 대운: 성별과 년간의 음양으로 방향을 정하고, 가까운 절기까지 날짜 ÷ 3으로 시작 나이를 정함
// 풀이 문장은 readings.js 에 있음

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const STEMS_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const BRANCHES_KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

// 오행 번호: 0 목, 1 화, 2 토, 3 금, 4 수
const ELEMENTS = ["목(木)", "화(火)", "토(土)", "금(金)", "수(水)"];
const STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
const BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
// 지지의 대표 천간(정기) — 십성 계산용
const BRANCH_MAIN = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];

const DAY_MASTER = [
  { name: "갑목(甲木)", img: "🌲 큰 나무" },
  { name: "을목(乙木)", img: "🌿 풀과 덩굴" },
  { name: "병화(丙火)", img: "☀️ 태양" },
  { name: "정화(丁火)", img: "🕯️ 촛불" },
  { name: "무토(戊土)", img: "⛰️ 큰 산" },
  { name: "기토(己土)", img: "🌾 논밭" },
  { name: "경금(庚金)", img: "⚔️ 바위와 쇠" },
  { name: "신금(辛金)", img: "💎 보석" },
  { name: "임수(壬水)", img: "🌊 큰 바다" },
  { name: "계수(癸水)", img: "🌧️ 비와 이슬" },
];

const R = window.READINGS || {};
const mod = (n, m) => ((n % m) + m) % m;

// ---------- 천문 계산 ----------

function toJD(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// 태양의 겉보기 황경(도) — Meeus 근사식, 오차 약 0.01도(절기 시각 약 15분 이내)
function sunLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const rad = Math.PI / 180;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * rad;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
    + 0.000289 * Math.sin(3 * M);
  const omega = (125.04 - 1934.136 * T) * rad;
  const lon = L0 + C - 0.00569 - 0.00478 * Math.sin(omega);
  return mod(lon, 360);
}

// 다음(또는 이전) 절기 시각(율리우스일) 찾기. 절기 = 황경 15도 + 30도 간격
function findTerm(jd0, forward) {
  const lon = sunLongitude(jd0);
  const k = Math.floor((lon - 15) / 30);
  const target = mod(15 + 30 * (forward ? k + 1 : k), 360);
  const diff = (jd) => mod(sunLongitude(jd) - target + 180, 360) - 180;
  let a = jd0, b = jd0;
  if (forward) {
    while (diff(b) < 0) { a = b; b += 1; }
  } else {
    while (diff(a) >= 0) { b = a; a -= 1; }
  }
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2;
    if (diff(m) < 0) a = m; else b = m;
  }
  return (a + b) / 2;
}

// ---------- 사주 계산 ----------

function calcSaju(y, mo, d, h, mi, timeKnown, correction) {
  const instant = new Date(Date.UTC(y, mo - 1, d, timeKnown ? h : 12, timeKnown ? mi : 0) - 9 * 3600000);
  const jd = toJD(instant);
  const lon = sunLongitude(jd);

  const monthIdx = Math.floor(mod(lon - 315, 360) / 30); // 0 = 인월

  let sajuYear = y;
  if (mo <= 2 && monthIdx >= 10) sajuYear = y - 1;
  const yearIdx = mod(sajuYear - 4, 60); // 1984 = 갑자
  const yearStem = yearIdx % 10;
  const yearBranch = yearIdx % 12;

  const monthStem = mod((yearStem % 5) * 2 + 2 + monthIdx, 10);
  const monthBranch = mod(2 + monthIdx, 12);

  let local = Date.UTC(y, mo - 1, d, timeKnown ? h : 12, timeKnown ? mi : 0);
  if (timeKnown && correction) local -= 30 * 60000;
  const ld = new Date(local);
  const lh = ld.getUTCHours();
  const lm = ld.getUTCMinutes();

  let dayStart = Date.UTC(ld.getUTCFullYear(), ld.getUTCMonth(), ld.getUTCDate());
  if (timeKnown && lh >= 23) dayStart += 86400000;
  const jdn = Math.round(dayStart / 86400000 + 2440587.5 + 0.5);
  const dayIdx = mod(jdn + 49, 60);
  const dayStem = dayIdx % 10;
  const dayBranch = dayIdx % 12;

  let hour = null;
  if (timeKnown) {
    const hb = Math.floor(((lh * 60 + lm) + 60) / 120) % 12;
    const hs = mod((dayStem % 5) * 2 + hb, 10);
    hour = { stem: hs, branch: hb };
  }

  return {
    jd,
    year: { stem: yearStem, branch: yearBranch },
    month: { stem: monthStem, branch: monthBranch },
    day: { stem: dayStem, branch: dayBranch },
    hour,
  };
}

// 천간·지지 번호 → 60갑자 번호
function ganjiIndex(stem, branch) {
  for (let i = 0; i < 60; i++) if (i % 10 === stem && i % 12 === branch) return i;
  return 0;
}

// 십성: 일간 기준으로 다른 글자의 관계
function tenGodOfStem(dayStem, stem) {
  const group = mod(STEM_EL[stem] - STEM_EL[dayStem], 5);
  const same = (stem % 2) === (dayStem % 2);
  return group * 2 + (same ? 0 : 1);
}
const tenGodOfBranch = (dayStem, branch) => tenGodOfStem(dayStem, BRANCH_MAIN[branch]);

function calcDaeun(s, gender) {
  const yangYear = s.year.stem % 2 === 0;
  const forward = (yangYear && gender === "male") || (!yangYear && gender === "female");
  const termJD = findTerm(s.jd, forward);
  const days = Math.abs(termJD - s.jd);
  const startAge = Math.max(1, Math.round(days / 3));
  const base = ganjiIndex(s.month.stem, s.month.branch);
  const list = [];
  for (let i = 1; i <= 9; i++) {
    const idx = mod(base + (forward ? i : -i), 60);
    list.push({ stem: idx % 10, branch: idx % 12, age: startAge + 10 * (i - 1) });
  }
  return { forward, startAge, list };
}

function analyze(s, gender, birth) {
  const ds = s.day.stem;
  const pillars = [s.year, s.month, s.day, s.hour].filter(Boolean);

  const elCounts = [0, 0, 0, 0, 0];
  pillars.forEach((p) => { elCounts[STEM_EL[p.stem]]++; elCounts[BRANCH_EL[p.branch]]++; });

  // 십성 개수 (일간 자신은 제외)
  const godCounts = Array(10).fill(0);
  pillars.forEach((p) => {
    if (p !== s.day) godCounts[tenGodOfStem(ds, p.stem)]++;
    godCounts[tenGodOfBranch(ds, p.branch)]++;
  });
  const groupCounts = [0, 1, 2, 3, 4].map((g) => godCounts[g * 2] + godCounts[g * 2 + 1]);

  // 신강·신약: 나를 돕는 글자(비겁+인성) 비율, 월지는 두 배로 계산
  const monthGroup = Math.floor(tenGodOfBranch(ds, s.month.branch) / 2);
  const others = groupCounts.reduce((a, b) => a + b, 0) + 1;
  let help = groupCounts[0] + groupCounts[4];
  if (monthGroup === 0 || monthGroup === 4) help++;
  const ratio = help / others;
  const strength = ratio >= 0.5 ? "strong" : ratio <= 0.3 ? "weak" : "middle";

  const daeun = calcDaeun(s, gender);

  // 만 나이
  const now = new Date();
  let age = now.getFullYear() - birth.y;
  if (now.getMonth() + 1 < birth.mo || (now.getMonth() + 1 === birth.mo && now.getDate() < birth.d)) age--;

  // 올해 간지 (오늘 기준)
  const today = calcSaju(now.getFullYear(), now.getMonth() + 1, now.getDate(), 12, 0, true, false);

  return { s, gender, elCounts, godCounts, groupCounts, strength, daeun, age, thisYear: today.year, year: now.getFullYear() };
}

// ---------- 풀이 만들기 ----------

const P = (t) => `<p>${t}</p>`;
// 제목과 겹치는 앞머리("연애할 때 내 모습: ")를 떼고 문단으로
const PS = (t) => P(t.replace(/^[^:<]{1,24}: /, ""));
const H = (t) => `<h3>${t}</h3>`;
const ganjiKo = (p) => STEMS_KO[p.stem] + BRANCHES_KO[p.branch];
const ganjiHan = (p) => STEMS[p.stem] + BRANCHES[p.branch];
const godName = (i) => R.tenGodNames[i];

function sectionPersonality(a) {
  const ds = a.s.day.stem;
  const dm = DAY_MASTER[ds];
  let html = `<p class="big">${dm.img} · ${dm.name}</p>`;
  html += H("타고난 성향") + R.personality[ds].map(P).join("");
  html += H("기운의 세기") + P(R.strength[a.strength]);

  html += H("두드러지는 기운");
  const max = Math.max(...a.groupCounts);
  a.groupCounts.forEach((c, g) => { if (c === max && c >= 2) html += P(R.groupPersonality[g]); });
  a.groupCounts.forEach((c, g) => { if (c === 0) html += P(R.groupMissingPersonality[g]); });
  html += countTable(a);
  html += H("인간관계") + PS(R.relations[ds]);
  html += H("스트레스 푸는 법") + PS(R.stressRelief[STEM_EL[ds]]);
  const L = R.lucky[usefulEl(a)];
  html += H("나에게 도움이 되는 기운") + P(`${a.strength === "strong" ? "기운이 강한 편이라 넘치는 힘을 풀어주는" : a.strength === "weak" ? "기운이 약한 편이라 나를 채워주는" : "균형을 잘 유지해주는"} <b>${L.el}</b> 기운이 도움이 돼요.`) +
    `<ul class="plain"><li><b>행운의 색</b> ${L.color}</li><li><b>좋은 방향</b> ${L.dir}</li><li><b>행운의 숫자</b> ${L.num}</li><li><b>가까이 두면 좋은 것</b> ${L.item}</li></ul>`;
  return html;
}

// 도움이 되는 오행(간단 판단): 강하면 내가 낳는 기운, 약하면 나를 낳는 기운, 중간이면 가장 부족한 기운
function usefulEl(a) {
  const de = STEM_EL[a.s.day.stem];
  if (a.strength === "strong") return (de + 1) % 5;
  if (a.strength === "weak") return (de + 4) % 5;
  return a.elCounts.indexOf(Math.min(...a.elCounts));
}
const topGroup = (a) => [0, 1, 2, 3, 4].sort((x, y) => a.groupCounts[y] - a.groupCounts[x])[0];

function countTable(a) {
  const rows = a.groupCounts.map((c, g) => `
    <div class="bar-row wide">
      <div class="bar-name">${R.groupNames[g].split("(")[0]}</div>
      <div class="bar-track"><div class="bar-fill grp" style="width:${(c / 7) * 100}%"></div></div>
      <div class="bar-count">${c}개</div>
    </div>`).join("");
  return `<div class="mini-title">나를 뺀 글자들의 성격 분포</div>${rows}`;
}

function sectionLove(a) {
  const male = a.gender === "male";
  const ds = a.s.day.stem;
  const seat = tenGodOfBranch(ds, a.s.day.branch);
  const starGroup = male ? 2 : 3;
  const c = a.groupCounts[starGroup];
  const level = c === 0 ? 0 : c <= 2 ? 1 : 2;

  let html = H("배우자 자리로 보는 연애 스타일") + P(R.spouseSeat[seat]);
  html += H(male ? "이성운 (재성)" : "이성운 (관성)") + P(R.loveStar[male ? "male" : "female"][level]);
  const mixed = male ? (a.godCounts[4] && a.godCounts[5]) : (a.godCounts[6] && a.godCounts[7]);
  if (mixed) html += P(R.mixedLove[male ? "male" : "female"]);

  const branches = [a.s.year, a.s.month, a.s.day, a.s.hour].filter(Boolean).map((p) => p.branch);
  const peach = branches.some((b) => [0, 3, 6, 9].includes(b));
  html += H("연애할 때 내 모습") + PS(R.loveBehavior[topGroup(a)]);
  html += H("잘 맞는 상대") + PS(R.goodMatch[STEM_EL[ds]]);
  html += H("매력과 인기") + P(peach ? R.peach : R.noPeach);

  // 연애운이 들어오는 대운
  const loveDaeun = a.daeun.list.filter((d) => Math.floor(tenGodOfStem(ds, d.stem) / 2) === starGroup);
  if (loveDaeun.length) {
    html += H("인연이 강해지는 시기") + P(`대운으로 보면 ${loveDaeun.map((d) => `${d.age}~${d.age + 9}세`).join(", ")} 무렵에 ${male ? "재성" : "관성"} 기운이 들어와 이성 인연과 결혼 이야기가 활발해지기 쉬워요.`);
  }
  html += H("연애 조언") + PS(R.loveAdvice[ds]);
  return html;
}

function sectionWealth(a) {
  const W = R.wealth;
  const c = a.groupCounts[2];
  let html = H("타고난 재물 그릇");
  if (c === 0) html += P(W.none);
  else if (c <= 2) html += P(W.good);
  else html += P(W.many) + P(a.strength === "weak" ? W.manyWeak : a.strength === "strong" ? W.manyStrong : "");
  html += H("돈이 들어오는 길");
  if (a.groupCounts[1] > 0) html += P(W.output);
  if (a.groupCounts[4] > 0) html += P(W.seal);
  if (a.groupCounts[1] === 0 && a.groupCounts[4] === 0) html += P("식상과 인성이 드러나지 않아, 재주나 문서보다는 직접 발로 뛰는 활동과 사람 관계에서 돈이 생기는 편이에요. 꾸준히 일한 만큼 정직하게 쌓이는 구조예요.");
  html += H("돈 쓰는 습관") + PS(R.spending[topGroup(a)]);
  html += H("재테크 스타일") + PS(R.moneyStyle[a.strength]);
  html += H("조심할 점");
  html += P(a.groupCounts[0] >= 3 ? W.rivals : "돈이 크게 새는 구조는 아니에요. 다만 운이 좋을 때 씀씀이가 커지기 쉬우니, 수입이 늘어날 때일수록 저축 비율도 함께 올려 주세요.");
  const ds = a.s.day.stem;
  const rich = a.daeun.list.filter((d) => Math.floor(tenGodOfStem(ds, d.stem) / 2) === 2);
  if (rich.length) html += H("재물운이 커지는 시기") + P(`대운으로 보면 ${rich.map((d) => `${d.age}~${d.age + 9}세`).join(", ")} 무렵에 재성 기운이 들어와 수입과 재산을 늘릴 기회가 많아져요.`);
  return html;
}

function sectionCareer(a) {
  const order = [0, 1, 2, 3, 4].sort((x, y) => a.groupCounts[y] - a.groupCounts[x]);
  let html = H("잘 맞는 일");
  order.slice(0, 2).forEach((g) => { if (a.groupCounts[g] > 0) html += P(R.career[g]); });
  html += P(R.careerElement[STEM_EL[a.s.day.stem]]);
  html += H("직장에서의 모습") + PS(R.workplace[STEM_EL[a.s.day.stem]]) + P(R.avoidWork[STEM_EL[a.s.day.stem]]);
  html += H("일하는 방식");
  html += P(a.strength === "strong"
    ? "기운이 강한 편이라 남 밑에서 시키는 일만 하면 답답해해요. 내가 결정권을 갖는 자리, 성과에 따라 보상이 커지는 구조에서 실력이 나와요."
    : a.strength === "weak"
      ? "기운이 약한 편이라 탄탄한 조직이나 좋은 선배 밑에서 배우며 성장할 때 운이 커져요. 처음부터 혼자 모든 걸 책임지기보다 실력을 쌓은 뒤 독립하는 순서가 좋아요."
      : "기운이 균형 잡혀 있어 조직 생활과 독립 모두 가능해요. 초반에는 조직에서 경험을 쌓고, 내 전문 분야가 생기면 그 분야로 이름을 알리는 흐름이 좋아요.");
  const ds = a.s.day.stem;
  const fame = a.daeun.list.filter((d) => Math.floor(tenGodOfStem(ds, d.stem) / 2) === 3);
  if (fame.length) html += H("승진·명예운이 좋은 시기") + P(`대운으로 보면 ${fame.map((d) => `${d.age}~${d.age + 9}세`).join(", ")} 무렵에 관성 기운이 들어와 자리와 직함을 얻기 좋아요.`);
  return html;
}

function sectionHealth(a) {
  const Hh = R.health;
  let html = H("기본 체질") + PS(R.baseHealth[STEM_EL[a.s.day.stem]]) + PS(R.exercise[a.strength]);
  html += H("오행으로 보는 체질");
  const lines = [];
  a.elCounts.forEach((c, i) => { if (c >= 3) lines.push(Hh.excess[i]); });
  a.elCounts.forEach((c, i) => { if (c === 0) lines.push(Hh.lack[i]); });
  html += (lines.length ? lines : [Hh.balanced]).map(P).join("");
  html += H("오행과 몸의 연결");
  html += `<ul class="plain">${Hh.organs.map((o, i) => `<li><b>${ELEMENTS[i]}</b> ${o}</li>`).join("")}</ul>`;
  html += `<p class="note left">${Hh.note}</p>`;
  return html;
}

function sectionDaeun(a) {
  const ds = a.s.day.stem;
  const d = a.daeun;
  let html = P(`대운은 10년마다 바뀌는 큰 흐름이에요. ${a.gender === "male" ? "남자" : "여자"}이고 태어난 해의 천간이 ${a.s.year.stem % 2 === 0 ? "양" : "음"}이라 대운이 <b>${d.forward ? "앞으로(순행)" : "거꾸로(역행)"}</b> 흘러요. 첫 대운은 <b>약 ${d.startAge}세</b>에 시작해요.`);
  html += `<p class="note left">현재 만 ${a.age}세 기준으로 지금 대운을 표시했어요. 대운이 시작되는 나이는 보는 곳마다 1년 정도 차이가 날 수 있어요.</p>`;
  html += d.list.map((x) => {
    const sg = tenGodOfStem(ds, x.stem);
    const bg = tenGodOfBranch(ds, x.branch);
    const now = a.age >= x.age && a.age < x.age + 10;
    return `
      <div class="luck ${now ? "now" : ""}">
        <div class="luck-head">
          <div class="luck-age">${x.age}~${x.age + 9}세 ${now ? '<span class="badge">지금</span>' : ""}</div>
          <div class="luck-ganji"><span class="el-text-${STEM_EL[x.stem]}">${STEMS[x.stem]}</span><span class="el-text-${BRANCH_EL[x.branch]}">${BRANCHES[x.branch]}</span> ${ganjiKo(x)}</div>
        </div>
        <div class="luck-gods">${godName(sg)} · ${godName(bg)}</div>
        <p>${R.luckStem[sg]} ${R.luckBranch[bg]}</p>
      </div>`;
  }).join("");
  if (a.age < d.startAge) html = P("아직 첫 대운이 시작되기 전이에요.") + html;
  return html;
}

function sectionYear(a) {
  const ds = a.s.day.stem;
  const y = a.thisYear;
  const sg = tenGodOfStem(ds, y.stem);
  const bg = tenGodOfBranch(ds, y.branch);
  let html = `<p class="big">${a.year}년 ${ganjiKo(y)}년 (${ganjiHan(y)})</p>`;
  html += H("올해의 큰 흐름") + P(R.yearStem[sg]);
  html += H("생활 속 변화") + P(`올해 땅의 기운은 나에게 ${godName(bg)}이에요. ${R.luckBranch[bg]}`);
  const db = a.s.day.branch;
  if (mod(y.branch - db, 12) === 6) html += P(R.clash);
  if ((y.branch + db) % 12 === 1) html += P(R.harmony);

  const starGroup = a.gender === "male" ? 2 : 3;
  const yearGroups = [Math.floor(sg / 2), Math.floor(bg / 2)];
  html += H("올해 연애·재물·일");
  html += P(yearGroups.includes(starGroup)
    ? "연애: 올해는 이성 인연의 기운이 들어오는 해예요. 새로운 만남에 마음을 열어두면 좋은 인연을 만나기 쉬워요."
    : "연애: 올해는 큰 인연보다 지금의 관계를 단단히 다지는 해예요. 솔로라면 모임과 취미를 통해 자연스럽게 만남을 넓혀 보세요.");
  html += P(yearGroups.includes(2)
    ? "재물: 돈이 움직이는 해예요. 수입 기회가 생기니 놓치지 말고, 들어온 돈은 바로 일부를 저축해 두세요."
    : yearGroups.includes(0)
      ? "재물: 지출과 경쟁이 늘 수 있는 해예요. 큰 투자보다 지키는 쪽에 무게를 두세요."
      : "재물: 무리하지 않으면 평탄한 해예요. 내 실력을 키우는 데 쓰는 돈은 아끼지 않아도 좋아요.");
  html += P(yearGroups.includes(3)
    ? "일: 자리와 책임이 커지는 해예요. 취업·승진·합격 같은 공식적인 결과를 노려 보세요."
    : yearGroups.includes(1)
      ? "일: 아이디어와 재능을 보여주기 좋은 해예요. 새로운 프로젝트나 이직, 창작에 도전해 보세요."
      : yearGroups.includes(4)
        ? "일: 공부와 준비가 결실을 맺는 해예요. 자격증이나 교육에 투자하면 다음 해에 크게 돌아와요."
        : "일: 내 힘으로 밀고 나가는 해예요. 혼자 준비한 일을 시작하기에 좋아요.");
  html += H("조심할 점") + PS(R.yearCaution[sg]);
  const L = R.lucky[usefulEl(a)];
  html += H("올해의 행운 포인트") + P(`올해도 나에게 도움이 되는 ${L.el} 기운을 가까이하면 좋아요. 행운의 색은 ${L.color}, 좋은 방향은 ${L.dir}, 행운의 숫자는 ${L.num}이에요.`);
  return html;
}

// ---------- 화면 ----------

function charBox(type, idx, god) {
  if (idx === null) return `<div class="char empty"><div class="han">?</div><div class="kor">모름</div></div>`;
  const han = type === "s" ? STEMS[idx] : BRANCHES[idx];
  const ko = type === "s" ? STEMS_KO[idx] : BRANCHES_KO[idx];
  const el = type === "s" ? STEM_EL[idx] : BRANCH_EL[idx];
  return `<div class="char el-${el}"><div class="han">${han}</div><div class="kor">${ko} · ${ELEMENTS[el].slice(0, 1)}</div><div class="god">${god}</div></div>`;
}

const TABS = [
  ["성격", sectionPersonality],
  ["연애운", sectionLove],
  ["재물운", sectionWealth],
  ["직업운", sectionCareer],
  ["건강운", sectionHealth],
  ["대운", sectionDaeun],
  ["올해 운세", sectionYear],
];

function render(a) {
  const s = a.s;
  const ds = s.day.stem;
  const cols = [["시주", s.hour], ["일주", s.day], ["월주", s.month], ["년주", s.year]];
  document.getElementById("pillars").innerHTML = cols.map(([label, p]) => `
    <div class="pillar">
      <div class="label">${label}</div>
      ${charBox("s", p ? p.stem : null, p ? (p === s.day ? "나" : godName(tenGodOfStem(ds, p.stem))) : "")}
      ${charBox("b", p ? p.branch : null, p ? godName(tenGodOfBranch(ds, p.branch)) : "")}
    </div>`).join("");

  document.getElementById("ganjiLine").textContent =
    `${ganjiKo(s.year)}년 ${ganjiKo(s.month)}월 ${ganjiKo(s.day)}일` + (s.hour ? ` ${ganjiKo(s.hour)}시` : "") +
    ` · ${a.gender === "male" ? "남자" : "여자"}`;

  const total = a.elCounts.reduce((x, y) => x + y, 0);
  document.getElementById("elements").innerHTML = a.elCounts.map((c, i) => `
    <div class="bar-row">
      <div class="bar-name">${ELEMENTS[i]}</div>
      <div class="bar-track"><div class="bar-fill el-${i}" style="width:${(c / total) * 100}%"></div></div>
      <div class="bar-count">${c}개</div>
    </div>`).join("");

  // 항목별 풀이 탭
  document.getElementById("tabs").innerHTML = TABS.map(([name], i) =>
    `<button type="button" class="tab ${i === 0 ? "on" : ""}" data-i="${i}">${name}</button>`).join("");
  document.getElementById("panels").innerHTML = TABS.map(([name, fn], i) =>
    `<div class="panel reading ${i === 0 ? "" : "hidden"}" data-i="${i}"><h2>${name}</h2>${fn(a)}</div>`).join("");

  const result = document.getElementById("result");
  result.classList.remove("hidden");
  result.scrollIntoView({ behavior: "smooth" });
}

document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  const i = btn.dataset.i;
  document.querySelectorAll("#tabs .tab").forEach((t) => t.classList.toggle("on", t.dataset.i === i));
  document.querySelectorAll("#panels .panel").forEach((p) => p.classList.toggle("hidden", p.dataset.i !== i));
  document.getElementById("tabs").scrollIntoView({ behavior: "smooth", block: "start" });
});

const unknown = document.getElementById("unknownTime");
unknown.addEventListener("change", () => { TimeField.setDisabled("birthTime", unknown.checked); });

document.getElementById("form").addEventListener("submit", (e) => {
  e.preventDefault();
  const dt = DateField.read("birthDate");
  const msg = document.getElementById("formMsg");
  const name = document.getElementById("myName").value.trim();
  if (!name) { msg.textContent = "내 이름을 적어 주세요."; document.getElementById("myName").focus(); return; }
  if (!dt) { msg.textContent = "생일을 다시 확인해 주세요. 숫자 8자리로 넣어요 (예: 1995.08.15)"; return; }
  msg.textContent = "";
  const gender = document.querySelector('input[name="gender"]:checked').value;
  const { y, mo, d } = dt;
  const timeKnown = !unknown.checked;
  const { h, mi } = timeKnown ? TimeField.read("birthTime") : { h: 12, mi: 0 };
  const correction = document.getElementById("correction").checked;
  const s = calcSaju(y, mo, d, h, mi, !!timeKnown, correction);
  const a = analyze(s, gender, { y, mo, d });
  render(a);
  if (window.onMySaju) window.onMySaju({ y, mo, d, h, mi, timeKnown: !!timeKnown, gender, correction, name }, a);
  if (window.logUse) window.logUse("saju", name);
});
