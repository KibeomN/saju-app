// 휴대폰(특히 카톡)이 예전 화면을 저장해 두고 새 기능 파일과 섞어 쓰면 버튼이 멈춤 → 예전 화면이면 새 주소로 한 번 다시 열기
(function () { if (!document.getElementById("myName") && !/[?&]r=/.test(location.search)) { location.replace(location.pathname + "?r=" + Date.now()); throw new Error("새 화면으로 다시 여는 중"); } })();

// 회원번호 + 궁합
// 회원번호에는 생년월일·시간·성별·보정 여부가 담겨 있음 (저장소 없이 번호만으로 사주를 다시 계산)
// 주의: 암호가 아니라 '섞어 둔 것'이라, 번호를 아는 사람은 생년월일을 알 수 있음

(() => {
  // ---------- 회원번호 만들기 / 풀기 ----------
  const ALPHA = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 헷갈리는 0,O,1,I 제외 (32자)
  const MOD = 1n << 30n;
  const A = 387420489n; // 홀수라서 되돌릴 수 있음
  const B = 91283467n;
  const A_INV = (() => { // A의 역원 (mod 2^30)
    let x = 1n;
    for (let i = 0; i < 6; i++) x = (x * (2n - A * x)) % MOD;
    return ((x % MOD) + MOD) % MOD;
  })();
  const MAX = 201 * 12 * 31 * 1441 * 4;

  function checkChar(s) {
    let sum = 0;
    for (let i = 0; i < s.length; i++) sum += ALPHA.indexOf(s[i]) * (i + 3);
    return ALPHA[sum % 32];
  }

  function encode(info) {
    const minute = info.timeKnown ? info.h * 60 + info.mi : 1440;
    let v = ((((info.y - 1900) * 12 + (info.mo - 1)) * 31 + (info.d - 1)) * 1441 + minute) * 4
      + (info.gender === "female" ? 2 : 0) + (info.correction ? 1 : 0);
    let x = (BigInt(v) * A + B) % MOD;
    let s = "";
    for (let i = 0; i < 6; i++) { s = ALPHA[Number(x % 32n)] + s; x /= 32n; }
    s += checkChar(s);
    return s.slice(0, 3) + "-" + s.slice(3);
  }

  function decode(code) {
    const s = code.toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/O/g, "0").replace(/I/g, "1");
    if (s.length !== 7) return null;
    for (const ch of s) if (ALPHA.indexOf(ch) < 0) return null;
    if (checkChar(s.slice(0, 6)) !== s[6]) return null;
    let x = 0n;
    for (let i = 0; i < 6; i++) x = x * 32n + BigInt(ALPHA.indexOf(s[i]));
    let v = Number((((x - B) % MOD + MOD) % MOD * A_INV) % MOD);
    if (v >= MAX) return null;
    const correction = v % 2 === 1; v = Math.floor(v / 2);
    const gender = v % 2 === 1 ? "female" : "male"; v = Math.floor(v / 2);
    const minute = v % 1441; v = Math.floor(v / 1441);
    const d = v % 31 + 1; v = Math.floor(v / 31);
    const mo = v % 12 + 1; v = Math.floor(v / 12);
    const y = v + 1900;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCMonth() !== mo - 1) return null; // 2월 30일 같은 잘못된 날짜
    const timeKnown = minute < 1440;
    return { y, mo, d, h: timeKnown ? Math.floor(minute / 60) : 12, mi: timeKnown ? minute % 60 : 0, timeKnown, gender, correction };
  }

  // ---------- 궁합 계산 ----------
  const mod = (n, m) => ((n % m) + m) % m;
  const stemHap = (a, b) => mod(a - b, 10) === 5; // 갑기, 을경, 병신, 정임, 무계
  const branchHap = (a, b) => (a + b) % 12 === 1; // 육합
  const branchClash = (a, b) => mod(a - b, 12) === 6; // 충
  const branchTrine = (a, b) => a !== b && a % 4 === b % 4; // 삼합 (같은 무리)
  const ZODIAC = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
  const EL_KO = ["나무(목)", "불(화)", "흙(토)", "쇠(금)", "물(수)"];

  // 상대 일간이 나에게 어떤 의미인지 (십성)
  const REL = [
    "상대는 나에게 '비견'이에요. 나와 같은 기운을 가진 사람이라 말하지 않아도 통하는 부분이 많아요. 친구나 동료처럼 대등하게 어깨를 나란히 하는 관계예요. 다만 둘 다 고집이 비슷해 의견이 갈리면 쉽게 물러서지 않아요.",
    "상대는 나에게 '겁재'예요. 비슷하면서도 경쟁심을 자극하는 사람이에요. 함께 있으면 서로 자극을 주고받으며 성장하지만, 돈이나 사람 문제에서 은근한 신경전이 생길 수 있어요.",
    "상대는 나에게 '식신'이에요. 내가 상대를 편하게 챙겨주고 싶어지는 관계예요. 함께 먹고 즐기며 웃는 시간이 많고, 내가 베푸는 만큼 관계가 따뜻해져요.",
    "상대는 나에게 '상관'이에요. 상대 앞에서 내 재능과 말솜씨가 살아나요. 대화가 재미있고 아이디어가 넘치지만, 서로 말이 날카로워지면 상처를 줄 수 있어요.",
    "상대는 나에게 '편재'예요. 상대는 나에게 활력과 기회를 주는 존재예요. 함께 있으면 바깥 활동과 새로운 일이 많아져요. 내가 상대를 이끄는 관계가 되기 쉬워요.",
    "상대는 나에게 '정재'예요. 안정감과 실속을 주는 사람이에요. 함께 있으면 생활이 차분해지고 계획대로 쌓여가요. 남자에게는 전통적으로 아내 자리를 뜻하는 좋은 인연이에요.",
    "상대는 나에게 '편관'이에요. 상대에게서 강한 카리스마와 긴장감을 느껴요. 나를 단련시키고 성장시켜 주지만, 상대가 나를 누르는 느낌을 받을 수도 있어요.",
    "상대는 나에게 '정관'이에요. 반듯하고 믿음직한 사람으로 느껴져요. 상대 덕분에 내가 더 바르게 행동하게 되고, 여자에게는 전통적으로 남편 자리를 뜻하는 좋은 인연이에요.",
    "상대는 나에게 '편인'이에요. 상대는 나에게 독특한 영감과 새로운 시각을 주는 사람이에요. 깊은 대화가 잘 되지만, 서로의 속마음을 다 알기는 어려울 수 있어요.",
    "상대는 나에게 '정인'이에요. 상대는 나를 아껴주고 도와주는 사람이에요. 함께 있으면 마음이 편해지고 배우는 것이 많아요. 다만 내가 너무 기대기만 하지 않도록 균형을 맞추세요."
  ];

  function relGod(myStem, otherStem) {
    const group = mod(STEM_EL[otherStem] - STEM_EL[myStem], 5);
    return group * 2 + ((otherStem % 2) === (myStem % 2) ? 0 : 1);
  }

  function compare(me, you) {
    const s1 = me.s, s2 = you.s;
    const f = []; // 근거 문장
    let base = 0, love = 0, friend = 0, biz = 0;

    // 1. 일간끼리 (나와 상대의 본질)
    const e1 = STEM_EL[s1.day.stem], e2 = STEM_EL[s2.day.stem];
    if (stemHap(s1.day.stem, s2.day.stem)) {
      base += 15; love += 10;
      f.push(["좋음", `두 사람의 일간(나를 나타내는 글자)이 '천간합'을 이뤄요. 서로 끌어당기는 힘이 아주 강한, 궁합에서 가장 반가운 조합 중 하나예요.`]);
    }
    if (mod(e2 - e1, 5) === 1 || mod(e1 - e2, 5) === 1) {
      base += 10; friend += 5; biz += 5;
      const giver = mod(e2 - e1, 5) === 1 ? "내가 상대를" : "상대가 나를";
      f.push(["좋음", `${EL_KO[e1]}와 ${EL_KO[e2]}는 서로 살려주는 '상생' 관계예요. ${giver} 키워주고 도와주는 흐름이라 함께할수록 힘이 붙어요.`]);
    } else if (e1 === e2) {
      base += 4; friend += 10;
      f.push(["보통", `두 사람 모두 ${EL_KO[e1]} 기운이에요. 생각과 행동 방식이 비슷해 편하지만, 같은 약점을 갖고 있어 서로 채워주기는 어려울 수 있어요.`]);
    } else {
      base -= 6; biz += 3;
      const ctrl = mod(e2 - e1, 5) === 2 ? "내가 상대를" : "상대가 나를";
      f.push(["주의", `${EL_KO[e1]}와 ${EL_KO[e2]}는 '상극' 관계예요. ${ctrl} 누르는 흐름이라 주도권 다툼이 생기기 쉬워요. 하지만 긴장감이 있는 만큼 서로를 다듬어 주기도 해요.`]);
    }

    // 2. 일지끼리 (배우자 자리 = 생활 궁합)
    const b1 = s1.day.branch, b2 = s2.day.branch;
    if (branchHap(b1, b2)) { base += 12; love += 10; f.push(["좋음", "두 사람의 일지(생활의 자리)가 '육합'이에요. 함께 생활할 때 손발이 잘 맞고, 같이 있으면 편안해요."]); }
    else if (branchTrine(b1, b2)) { base += 8; love += 5; friend += 5; f.push(["좋음", "두 사람의 일지가 '삼합' 무리에 속해요. 목표를 함께 세우면 한 팀처럼 잘 굴러가요."]); }
    else if (branchClash(b1, b2)) { base -= 10; love -= 5; f.push(["주의", "두 사람의 일지가 '충'이에요. 생활 습관이나 리듬이 정반대라 부딪히기 쉬워요. 서로의 공간과 시간을 존중하면 오히려 자극이 되는 관계가 돼요."]); }
    else if (b1 === b2) { base += 2; friend += 4; f.push(["보통", "두 사람의 일지가 같아요. 생활 방식이 비슷해 편하지만, 같은 부분에서 동시에 예민해질 수 있어요."]); }

    // 3. 띠 궁합 (년지)
    const y1 = s1.year.branch, y2 = s2.year.branch;
    if (branchHap(y1, y2) || branchTrine(y1, y2)) { base += 6; friend += 8; biz += 4; f.push(["좋음", `두 사람은 띠 궁합이 좋아요. 집안 분위기나 주변 사람들과도 잘 어울리는 관계예요.`]); }
    else if (branchClash(y1, y2)) { base -= 5; friend -= 4; f.push(["주의", `두 사람은 띠가 서로 부딪혀요(충). 가치관이나 주변 환경이 달라 처음엔 낯설 수 있어요.`]); }
    else f.push(["보통", `두 사람은 띠로 보면 무난한 사이예요.`]);

    // 4. 오행 보완
    const fills = [];
    me.elCounts.forEach((c, i) => { if (c === 0 && you.elCounts[i] >= 2) fills.push(`내게 없는 ${EL_KO[i]}을 상대가`); });
    you.elCounts.forEach((c, i) => { if (c === 0 && me.elCounts[i] >= 2) fills.push(`상대에게 없는 ${EL_KO[i]}을 내가`); });
    if (fills.length) { base += 6 * Math.min(fills.length, 2); biz += 8; f.push(["좋음", `${fills.join(", ")} 채워줘요. 서로의 빈 곳을 메워주는 보완 궁합이에요.`]); }

    // 5. 연애: 남녀일 때 배우자 별
    const g1 = relGod(s1.day.stem, s2.day.stem), g2 = relGod(s2.day.stem, s1.day.stem);
    const mixed = me.gender !== you.gender;
    if (mixed) {
      const man = me.gender === "male" ? s1 : s2, woman = me.gender === "male" ? s2 : s1;
      const wifeStar = relGod(man.day.stem, woman.day.stem);
      if (wifeStar === 5 || wifeStar === 4) { love += 12; f.push(["좋음", "두 사람의 배치를 보면 서로를 아끼고 책임지려는 마음이 자연스럽게 생기는, 전통적으로 부부 인연으로 보는 좋은 배치예요."]); }
    }

    // 6. 사업: 서로에게 재성·식상·인성이 되는지
    if ([4, 5].includes(g1) || [4, 5].includes(g2)) biz += 10;
    if ([2, 3].includes(g1) || [2, 3].includes(g2)) biz += 6;
    if ([8, 9].includes(g1) || [8, 9].includes(g2)) biz += 5;
    if ([1].includes(g1) || [1].includes(g2)) biz -= 6;
    if (me.strength !== you.strength && me.strength !== "middle" && you.strength !== "middle") { biz += 6; f.push(["좋음", "한 사람은 기운이 강하고 한 사람은 약한 편이라, 이끄는 사람과 받쳐주는 사람으로 역할이 자연스럽게 나뉘어요."]); }
    if (me.strength === "strong" && you.strength === "strong") { biz -= 4; friend += 3; }

    const clamp = (n) => Math.max(40, Math.min(98, Math.round(n)));
    return {
      g1, g2, facts: f,
      total: clamp(65 + base * 0.9),
      love: clamp(62 + base * 0.6 + love),
      friend: clamp(64 + base * 0.5 + friend),
      biz: clamp(62 + base * 0.5 + biz),
    };
  }

  // ---------- 궁합 문장 ----------
  const band = (n) => (n >= 85 ? 0 : n >= 72 ? 1 : n >= 60 ? 2 : 3);
  const LOVE = [
    "연애 궁합이 아주 좋아요. 처음 만났을 때부터 끌림이 강하고, 시간이 지나도 쉽게 식지 않는 관계예요. 서로의 부족한 점을 자연스럽게 감싸주며, 결혼까지 이야기해도 좋은 흐름이에요. 다만 너무 편해지면 표현이 줄어드니, 고마움과 사랑을 말로 자주 전해 주세요.",
    "연애 궁합이 좋은 편이에요. 함께 있으면 편안하고 대화가 잘 통해요. 가끔 사소한 다툼이 있어도 금방 풀리는 관계예요. 기념일이나 작은 이벤트로 설렘을 이어가면 오래 가는 커플이 될 수 있어요.",
    "연애 궁합은 노력에 따라 달라지는 보통 수준이에요. 서로 다른 부분이 있어 처음엔 맞춰가는 시간이 필요해요. 상대의 방식이 틀린 게 아니라 다른 것이라고 받아들이면, 오히려 서로를 성장시키는 관계가 돼요.",
    "연애 궁합은 부딪히는 부분이 많은 편이에요. 끌림은 있어도 생활 방식과 감정 표현이 달라 오해가 쌓이기 쉬워요. 감정이 상했을 때 바로 말하기보다 하루 쉬고 이야기하는 규칙을 정해 두면 큰 도움이 돼요."
  ];
  const FRIEND = [
    "친구 궁합이 아주 좋아요. 말하지 않아도 통하는 단짝 같은 사이예요. 힘들 때 가장 먼저 떠오르는 사람이 되기 쉽고, 오랜 시간이 지나도 우정이 이어져요.",
    "친구 궁합이 좋은 편이에요. 함께 놀고 이야기하는 게 즐거운 사이예요. 서로의 다른 점이 오히려 재미가 되고, 필요할 때 든든한 편이 되어 줘요.",
    "친구 궁합은 무난해요. 자주 만나지 않아도 편한 사이지만, 깊은 속얘기를 나누려면 시간이 필요해요. 공통 취미를 하나 만들면 훨씬 가까워져요.",
    "친구 궁합은 조심이 필요해요. 경쟁심이나 가치관 차이로 부딪히기 쉬워요. 돈 거래나 큰 부탁은 피하고, 적당한 거리를 두면 오래 좋은 사이로 지낼 수 있어요."
  ];
  const BIZ = [
    "사업 궁합이 아주 좋아요. 한 사람이 아이디어를 내면 다른 사람이 현실로 만들어 주는 식으로 역할이 잘 나뉘어요. 함께 일을 벌이면 혼자보다 훨씬 큰 결과를 낼 수 있어요. 그래도 돈 문제는 처음부터 계약서로 분명히 해 두세요.",
    "사업 궁합이 좋은 편이에요. 서로의 강점이 겹치지 않아 협력하기 좋아요. 다만 결정권을 누가 가질지 미리 정해 두면 갈등 없이 오래 함께할 수 있어요.",
    "사업 궁합은 보통이에요. 함께 일할 수는 있지만 생각하는 방향이 다를 때가 있어요. 큰 동업보다는 프로젝트 단위로 함께해 보고 결정하는 것이 안전해요.",
    "사업 궁합은 조심이 필요해요. 돈과 결정 방식에서 부딪히기 쉬워요. 동업이나 돈이 크게 얽히는 일은 피하고, 각자의 일을 하면서 필요할 때 돕는 관계가 좋아요."
  ];
  const TOTAL = ["천생연분에 가까운 궁합이에요!", "서로에게 힘이 되는 좋은 궁합이에요.", "맞춰갈수록 좋아지는 궁합이에요.", "서로를 이해하려는 노력이 필요한 궁합이에요."];

  // 두 일간의 관계 유형: 0 상생, 1 같은 기운, 2 상극
  const relType = (a, b) => { const e1 = STEM_EL[a.s.day.stem], e2 = STEM_EL[b.s.day.stem]; return e1 === e2 ? 1 : (mod(e2 - e1, 5) === 1 || mod(e1 - e2, 5) === 1) ? 0 : 2; };
  const FIGHT = [
    "다툼이 생기는 지점: 한 사람이 계속 주고 한 사람이 계속 받는 관계가 되면 주는 쪽이 지쳐요. 챙김을 받았다면 작은 것이라도 꼭 돌려주세요.",
    "다툼이 생기는 지점: 둘 다 비슷해서 같은 일에 동시에 고집을 부려요. 누가 먼저 양보할지 미리 순서를 정해두면 좋아요.",
    "다툼이 생기는 지점: 한 사람이 다른 사람을 바꾸려 할 때 싸움이 커져요. 고쳐주려 하기보다 있는 그대로 인정하는 연습이 필요해요."
  ];
  const LAST = [
    "오래 가는 비결: 서로를 살려주는 관계라 함께하는 목표가 있을 때 가장 빛나요. 여행 계획, 저축 목표처럼 둘만의 프로젝트를 만들어 보세요.",
    "오래 가는 비결: 편안함이 무기인 관계예요. 다만 익숙함이 지루함이 되지 않게 가끔 새로운 장소, 새로운 경험을 함께 해보세요.",
    "오래 가는 비결: 긴장감이 있는 관계라 존중이 가장 중요해요. 상대의 영역(일, 친구, 취미)을 건드리지 않는 선을 정해두면 오히려 끌림이 오래가요."
  ];
  const LEARN = [
    "나무(목) 기운의 사람에게서는 시작하는 용기와 추진력을 배울 수 있어요.",
    "불(화) 기운의 사람에게서는 밝은 에너지와 솔직한 표현을 배울 수 있어요.",
    "흙(토) 기운의 사람에게서는 꾸준함과 믿음직함을 배울 수 있어요.",
    "쇠(금) 기운의 사람에게서는 결단력과 정리하는 힘을 배울 수 있어요.",
    "물(수) 기운의 사람에게서는 여유와 깊은 생각을 배울 수 있어요."
  ];
  const FIELD = [
    "함께하면 좋은 분야: 두 사람 모두 자기 주도성이 강해요. 각자 맡은 영역이 분명한 공동 창업, 운동·코칭 분야가 맞아요.",
    "함께하면 좋은 분야: 아이디어와 표현력이 모여요. 콘텐츠 제작, 쇼핑몰, 교육, 앱·서비스 기획처럼 무언가를 만들어 파는 일이 맞아요.",
    "함께하면 좋은 분야: 돈 감각이 모여요. 유통, 무역, 판매, 투자처럼 숫자가 분명한 일이 맞아요.",
    "함께하면 좋은 분야: 체계와 책임감이 모여요. 관리, 대행, 컨설팅처럼 신뢰가 중요한 일이 맞아요.",
    "함께하면 좋은 분야: 지식과 문서 감각이 모여요. 교육, 출판, 상담, 자격증 기반 서비스가 맞아요."
  ];

  function daeunNow(a) {
    return a.daeun.list.find((d) => a.age >= d.age && a.age < d.age + 10) || null;
  }

  // ---------- 화면 ----------
  const $ = (id) => document.getElementById(id);
  let myInfo = null, myAnalysis = null;

  function analyzeInfo(info) {
    const s = calcSaju(info.y, info.mo, info.d, info.h, info.mi, info.timeKnown, info.correction);
    return analyze(s, info.gender, { y: info.y, mo: info.mo, d: info.d });
  }

  window.onMySaju = (info, a) => {
    myInfo = info; myAnalysis = a;
    $("myCode").textContent = encode(info);
    $("gunghapResult").classList.add("hidden");
    // 상대 성별 기본값: 나와 반대
    document.querySelector(`input[name="pGender"][value="${a.gender === "male" ? "female" : "male"}"]`).checked = true;
    $("codeMsg").textContent = "";
  };

  $("copyCode").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("myCode").textContent);
      $("copyCode").textContent = "복사됨 ✓";
    } catch {
      $("copyCode").textContent = "길게 눌러 복사";
    }
    setTimeout(() => { $("copyCode").textContent = "복사"; }, 1500);
  });

  const mode = () => document.querySelector('input[name="ghMode"]:checked').value;
  function setMode(m) {
    document.querySelector(`input[name="ghMode"][value="${m}"]`).checked = true;
    $("modeCode").classList.toggle("hidden", m !== "code");
    $("modeBirth").classList.toggle("hidden", m !== "birth");
    $("modeHint").textContent = m === "birth"
      ? "상대가 앱을 쓰지 않아도 생일만 알면 볼 수 있어요."
      : "상대가 앱에서 받은 회원번호를 넣어 주세요. 상대의 생일은 보이지 않아요.";
    $("codeMsg").textContent = "";
  }
  document.querySelectorAll('input[name="ghMode"]').forEach((r) => r.addEventListener("change", () => setMode(mode())));
  $("pUnknown").addEventListener("change", () => { TimeField.setDisabled("pTime", $("pUnknown").checked); });
  TimeField.setDisabled("pTime", $("pUnknown").checked);

  // 사주 보기 바로 아래 '궁합 보기' 버튼: 내 사주를 먼저 계산하고 궁합 칸으로 이동
  $("quickGunghap").addEventListener("click", () => {
    submitForm($("form"));
    if ($("result").classList.contains("hidden")) return; // 내 생일이 잘못된 경우
    setTimeout(() => $("ghCard").scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  });

  $("friendCode").addEventListener("input", (e) => {
    let v = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 7);
    if (v.length > 3) v = v.slice(0, 3) + "-" + v.slice(3);
    e.target.value = v;
  });

  $("gunghapForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("friendName").value.trim() || "상대";
    if (mode() === "code") {
      const code = $("friendCode").value.trim().toUpperCase();
      const info = decode(code);
      if (!info) { $("codeMsg").textContent = "회원번호가 맞지 않아요. 7자리를 다시 확인해 주세요."; return; }
      $("codeMsg").textContent = "";
      showPartner(info, name, code, false);
    } else {
      const dt = DateField.read("pDate");
      if (!dt) { $("codeMsg").textContent = "상대 생일을 다시 확인해 주세요. 숫자 8자리로 넣어요 (예: 1998.04.21)"; return; }
      const { y, mo, d } = dt;
      const known = !$("pUnknown").checked;
      const { h, mi } = known ? TimeField.read("pTime") : { h: 12, mi: 0 };
      const info = { y, mo, d, h, mi, timeKnown: !!known, gender: document.querySelector('input[name="pGender"]:checked').value, correction: true };
      $("codeMsg").textContent = "";
      showPartner(info, name, encode(info), true);
    }
  });

  // 상대 정보로 궁합 보여주기 (회원번호/생일 공통). 저장할 때 쓰려고 마지막 상대를 기억
  let lastPartner = null;
  function showPartner(info, name, code, direct) {
    lastPartner = { name, code, direct };
    partnerLabel = direct
      ? `<span class="lock">🎂 생일로 본 궁합${info.timeKnown ? "" : " · 시간 모름"}</span>`
      : `회원번호 ${esc(code)}<br><span class="lock">🔒 생년월일·시간·성별 비공개</span>`;
    const you = analyzeInfo(info);
    renderGunghap(myAnalysis, you, name);
    if (window.onGunghap) window.onGunghap(myAnalysis, you, esc(name), code);
    if (window.logUse && myInfo) window.logUse("gunghap", myInfo.name);
  }
  let partnerLabel = "";

  function scoreRow(label, n) {
    return `<div class="score-row"><div class="bar-name">${label}</div>
      <div class="bar-track"><div class="bar-fill grp" style="width:${n}%"></div></div>
      <div class="bar-count">${n}점</div></div>`;
  }

  const esc = (t) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function renderGunghap(me, you, name) {
    name = esc(name);
    const rt = relType(me, you);
    const c = compare(me, you);
    const gk = (p) => STEMS_KO[p.stem] + BRANCHES_KO[p.branch];
    const who = (a) => `${gk(a.s.year)}년 ${gk(a.s.month)}월 ${gk(a.s.day)}일${a.s.hour ? " " + gk(a.s.hour) + "시" : ""} · ${a.gender === "male" ? "남자" : "여자"}`;
    const P = (t) => `<p>${t}</p>`, H = (t) => `<h3>${t}</h3>`;

    const summary = `
      <div class="ring" style="--p:${c.total}"><div><b>${c.total}</b><small>점</small></div></div>
      <p class="big center">${TOTAL[band(c.total)]}</p>
      <div class="pair"><div><b>나</b><br>${who(me)}</div><div><b>${name}</b><br>${partnerLabel}</div></div>
      ${you.s.hour ? "" : '<p class="hint center">상대의 태어난 시간을 몰라서 여섯 글자로 본 궁합이에요.</p>'}
      ${scoreRow("연애", c.love)}${scoreRow("친구", c.friend)}${scoreRow("사업", c.biz)}`;

    const factsHtml = c.facts.map(([t, txt]) => `<li><span class="tag tag-${t === "좋음" ? "good" : t === "주의" ? "warn" : "mid"}">${t}</span>${txt}</li>`).join("");
    const basics = H("서로에게 어떤 사람일까") + P(`<b>내 입장에서 보면</b> ${REL[c.g1]}`) + P(`<b>${name} 입장에서 보면</b> ${REL[c.g2]}`) +
      H("궁합을 이렇게 봤어요") + `<ul class="facts">${factsHtml}</ul>`;

    const loveHtml = H(`연애 궁합 ${c.love}점`) + P(LOVE[band(c.love)]) +
      H("다툼이 생기는 지점") + P(FIGHT[rt].replace(/^[^:]+: /, "")) +
      H("오래 가는 비결") + P(LAST[rt].replace(/^[^:]+: /, "")) +
      H("데이트 팁") + P(`두 사람에게 함께 도움이 되는 건 ${EL_KO[[0, 1, 2, 3, 4].sort((x, y) => (me.elCounts[x] + you.elCounts[x]) - (me.elCounts[y] + you.elCounts[y]))[0]]} 기운이에요. ${["숲길 산책이나 꽃구경", "햇볕 좋은 날 야외 데이트나 공연", "맛집 탐방이나 집에서 요리하기", "전시회나 깔끔한 카페", "바다·강가 산책이나 수영장"][[0, 1, 2, 3, 4].sort((x, y) => (me.elCounts[x] + you.elCounts[x]) - (me.elCounts[y] + you.elCounts[y]))[0]]} 같은 데이트가 잘 맞아요.`);

    const friendHtml = H(`친구 궁합 ${c.friend}점`) + P(FRIEND[band(c.friend)]) +
      H("서로에게 배울 점") + P(`나는 ${name}에게서: ${LEARN[STEM_EL[you.s.day.stem]]}`) + P(`${name}은(는) 나에게서: ${LEARN[STEM_EL[me.s.day.stem]]}`) +
      H("우정을 지키는 법") + P(FIGHT[rt].replace(/^[^:]+: /, "").replace("관계가 되면", "우정이 되면")) +
      H("함께하면 좋은 것") + P(c.friend >= 72 ? "여행, 운동, 새로운 취미처럼 몸으로 함께 부딪히는 경험이 우정을 더 단단하게 만들어요." : "가벼운 식사나 차 한잔처럼 부담 없는 만남을 꾸준히 이어가는 것이 좋아요. 무리한 부탁은 서로 피하세요.");

    const groupSum = [0, 1, 2, 3, 4].map((g) => me.groupCounts[g] + you.groupCounts[g]);
    const topG = groupSum.indexOf(Math.max(...groupSum));
    const bizHtml = H(`사업 궁합 ${c.biz}점`) + P(BIZ[band(c.biz)]) +
      H("함께하면 좋은 분야") + P(FIELD[topG].replace(/^[^:]+: /, "")) +
      H("돈 문제에서 조심할 점") + P(groupSum[0] >= 5
        ? "두 사람 모두 자기 몫을 챙기려는 기운이 강해요. 수익 배분, 투자 비율, 그만둘 때의 정산 방법을 처음부터 문서로 남겨 두세요."
        : groupSum[2] === 0
          ? "두 사람 모두 돈 관리에 약한 편이에요. 장부 정리와 세금은 외부 도움을 받거나, 한 사람이 꼼꼼히 맡도록 정해두세요."
          : "큰 문제는 없지만, 친한 사이일수록 돈 이야기를 미루기 쉬워요. 한 달에 한 번 숫자를 같이 보는 시간을 정해두면 오해가 쌓이지 않아요.") +
      H("역할 나누기") + P(me.strength === "strong" && you.strength !== "strong"
        ? `나는 앞에서 이끌고 결정하는 역할, ${name}은(는) 실무와 관리를 맡는 역할이 잘 맞아요.`
        : you.strength === "strong" && me.strength !== "strong"
          ? `${name}이(가) 앞에서 이끌고, 나는 꼼꼼하게 받쳐주는 역할이 잘 맞아요.`
          : "두 사람 모두 비슷한 힘을 가졌어요. 분야를 나눠 각자 책임지는 영역을 정하면 부딪힘이 줄어요.");

    const n1 = daeunNow(me), n2 = daeunNow(you);
    let flow = H("지금 두 사람의 대운");
    flow += P(n1 ? `나는 지금 ${n1.age}~${n1.age + 9}세 '${gk(n1)}' 대운이에요.` : "나는 아직 첫 대운 전이에요.");
    // 상대의 나이와 간지는 숨기고, 상대에게 지금 대운이 어떤 의미인지만 보여줌
    flow += P(n2 ? `${name}은(는) 지금 '${window.READINGS.tenGodNames[relGod(you.s.day.stem, n2.stem)]}'의 대운을 지나고 있어요. ${window.READINGS.luckStem[relGod(you.s.day.stem, n2.stem)].replace(/^[^:]+: /, "")}` : `${name}은(는) 아직 큰 흐름이 본격적으로 시작되기 전이에요.`);
    if (n1 && n2) {
      const ea = STEM_EL[n1.stem], eb = STEM_EL[n2.stem];
      if (stemHap(n1.stem, n2.stem) || mod(ea - eb, 5) === 1 || mod(eb - ea, 5) === 1)
        flow += P("두 사람의 지금 대운이 서로 잘 어울려요. 지금 함께 시작하는 일, 함께 세우는 계획에 힘이 실리는 시기예요.");
      else if (ea === eb)
        flow += P("두 사람이 지금 비슷한 기운의 대운을 지나고 있어요. 같은 고민을 하고 있을 가능성이 커서 서로에게 좋은 상담 상대가 될 수 있어요.");
      else
        flow += P("두 사람의 지금 대운은 방향이 조금 달라요. 한 사람이 바쁠 때 다른 사람은 쉬어가는 시기일 수 있으니, 서로의 속도를 인정해 주세요.");
      if (branchClash(n1.branch, n2.branch)) flow += P("지금 대운의 지지끼리 부딪히고 있어요(충). 이사, 이직 같은 큰 변화가 겹칠 수 있으니 중요한 결정은 충분히 상의하세요.");
    }
    const y = me.thisYear;
    const ym = relGod(me.s.day.stem, y.stem), yy = relGod(you.s.day.stem, y.stem);
    flow += H(`${me.year}년 두 사람`) + P(`올해 나에게는 '${window.READINGS.tenGodNames[ym]}'의 해, ${name}에게는 '${window.READINGS.tenGodNames[yy]}'의 해예요. ` +
      (Math.floor(ym / 2) === Math.floor(yy / 2) ? "올해 두 사람이 비슷한 흐름을 타고 있어 함께 움직이기 좋아요." : "올해 두 사람의 관심사가 다를 수 있어요. 서로의 상황을 자주 물어봐 주세요."));

    const tabs = [["종합", basics], ["연애 궁합", loveHtml], ["친구 궁합", friendHtml], ["사업 궁합", bizHtml], ["대운·올해", flow]];
    $("ghSummary").innerHTML = summary;
    $("ghTabs").innerHTML = tabs.map(([n], i) => `<button type="button" class="tab ${i ? "" : "on"}" data-i="${i}">${n}</button>`).join("");
    $("ghPanels").innerHTML = tabs.map(([n, h], i) => `<div class="gh-panel reading ${i ? "hidden" : ""}" data-i="${i}"><h2>${n}</h2>${h}</div>`).join("");
    $("gunghapResult").classList.remove("hidden");
    $("gunghapResult").scrollIntoView({ behavior: "smooth" });
  }

  $("ghTabs").addEventListener("click", (e) => {
    const b = e.target.closest(".tab"); if (!b) return;
    document.querySelectorAll("#ghTabs .tab").forEach((t) => t.classList.toggle("on", t === b));
    document.querySelectorAll(".gh-panel").forEach((p) => p.classList.toggle("hidden", p.dataset.i !== b.dataset.i));
  });

  window.SajuCode = { encode, decode, compare, analyzeInfo, showPartner, getLastPartner: () => lastPartner, getMyCode: () => (myInfo ? encode(myInfo) : ""), getMyName: () => (myInfo ? myInfo.name : "") };
})();
