// 심층 궁합 (잠금 콘텐츠)
// 지금은 '테스트 모드': 광고 보기·결제 버튼을 누르면 실제 광고·결제 없이 바로 열림
// 나중에 진짜 광고/결제를 붙일 때는 unlockWithAd(), unlockWithPay() 안쪽만 바꾸면 됨
// 주의: 서버 없이 파일만으로 동작하므로, 지금 잠금은 화면상의 잠금일 뿐 기술적으로 우회 가능

(() => {
  const CONFIG = { testMode: true, price: 990, adSeconds: 5 };

  const $ = (id) => document.getElementById(id);
  const mod = (n, m) => ((n % m) + m) % m;
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 불가 환경 */ } },
  };
  const UNLOCK_KEY = "saju.unlocked", REL_KEY = "saju.relations";

  // ---------- 문장 ----------
  const RELS = [["couple", "💑 연인"], ["some", "💓 썸"], ["crush", "💘 짝사랑"], ["friend", "🤝 친구"]];
  const TIMING_LABEL = { couple: "데이트하기 좋은 날", some: "연락하거나 만나자고 하기 좋은 날", crush: "말 걸기·고백하기 좋은 날", friend: "만나서 놀기 좋은 날" };

  // 상대 눈에 비친 나 (상대 일간 기준, 내가 상대에게 어떤 십성인지)
  const PERCEIVE = [
    "상대는 나를 '편한 내 편'으로 느껴요. 처음부터 낯설지 않고, 같이 있으면 긴장이 풀리는 사람이에요. 다만 너무 편해서 설렘보다 우정 쪽으로 기울 수 있어요. 가끔은 평소와 다른 모습(옷차림, 장소, 진지한 대화)을 보여주면 상대가 나를 새롭게 보게 돼요.",
    "상대는 나를 '은근히 신경 쓰이는 사람'으로 느껴요. 나에게 지기 싫은 마음과 끌리는 마음이 함께 있어요. 밀고 당기기가 자연스럽게 생기는 관계라, 내가 너무 쉽게 다 맞춰주면 오히려 흥미가 줄 수 있어요. 내 의견을 분명히 말하는 모습이 매력으로 보여요.",
    "상대는 나를 '같이 있으면 즐거운 사람'으로 느껴요. 상대가 나에게 뭔가를 해주고 싶고, 챙겨주고 싶어지는 관계예요. 상대의 호의를 기분 좋게 받아주고 고맙다고 자주 말하면, 상대는 더 많이 다가와요.",
    "상대는 나를 '자기를 표현하게 만드는 사람'으로 느껴요. 내 앞에서 상대는 말이 많아지고 장난도 많이 쳐요. 다만 상대가 가끔 선을 넘는 말을 할 수 있으니, 서운하면 웃으며 바로 말해 주는 게 좋아요.",
    "상대는 나를 '매력적이고 갖고 싶은 사람'으로 느껴요. 나에게 활력과 설렘을 느끼고, 함께 새로운 걸 해보고 싶어 해요. 상대가 적극적으로 나올 때가 많지만, 너무 쉽게 다 보여주기보다 약간의 여유를 두면 끌림이 오래가요.",
    "상대는 나를 '오래 곁에 두고 싶은 사람'으로 느껴요. 안정감과 믿음을 주는 존재로 보고 있어요. 진지한 관계로 발전하기 좋은 배치예요. 약속을 잘 지키고 꾸준히 연락하는 모습이 상대 마음을 가장 크게 움직여요.",
    "상대는 나를 '강하게 끌리지만 조금 어려운 사람'으로 느껴요. 나에게 카리스마를 느끼고, 내 말 한마디에 크게 반응해요. 상대가 긴장하고 있을 수 있으니, 내가 먼저 편하게 웃어주고 부드럽게 말하면 거리가 확 좁혀져요.",
    "상대는 나를 '믿음직하고 반듯한 사람'으로 느껴요. 나를 존중하고, 내 앞에서 좋은 모습을 보이고 싶어 해요. 상대가 조심스러워 먼저 다가오지 못할 수 있으니, 내가 작은 기회를 먼저 만들어 주세요.",
    "상대는 나를 '알 듯 말 듯한 신비로운 사람'으로 느껴요. 내 생각이 궁금하고, 깊은 대화를 나누고 싶어 해요. 내 속마음을 조금씩 보여줄수록 상대는 더 빠져들어요. 너무 오래 답을 안 주면 오해할 수 있으니 주의하세요.",
    "상대는 나를 '기대고 싶은 따뜻한 사람'으로 느껴요. 나에게 위로와 안정감을 받아요. 상대가 힘들 때 먼저 찾는 사람이 될 수 있어요. 다만 보호자 역할만 하면 연애 감정이 약해질 수 있으니, 나도 가끔 기대는 모습을 보여주세요."
  ];

  const ADVICE = {
    couple: [
      "지금 두 사람은 서로에게 힘이 되는 커플이에요. 이 시기에는 함께하는 목표를 만들면 관계가 한 단계 깊어져요. 여행 계획, 같이 모으는 통장, 함께 배우는 취미처럼 '우리'의 것을 만들어 보세요. 피해야 할 건 익숙함에 기대 표현을 줄이는 거예요. 좋은 궁합일수록 당연하게 여기기 쉬워요. 하루 한 번 '고마워'를 말로 하는 습관이 이 좋은 흐름을 오래 지켜줘요.",
      "지금 두 사람은 서로 맞춰가는 중인 커플이에요. 다른 점이 많아 부딪히기도 하지만, 그만큼 서로를 넓혀주는 관계예요. 다툼이 생기면 '누가 맞나'보다 '어떻게 하면 둘 다 편할까'를 먼저 물어보세요. 감정이 올라온 날에는 결론을 내지 말고 하루 쉬었다가 이야기하는 규칙을 정해두면 큰 싸움을 막을 수 있어요."
    ],
    some: [
      "썸의 흐름이 좋아요. 서로 호감이 있을 가능성이 높고, 자연스럽게 연인으로 넘어갈 수 있는 궁합이에요. 지금 필요한 건 '확인'이에요. 둘만의 약속을 한 번 더 잡고, 그 자리에서 내 마음을 조금 더 분명하게 보여주세요. 너무 오래 애매하게 두면 좋은 흐름이 식을 수 있어요. 아래 '좋은 날'에 만남을 제안해 보세요.",
      "썸이 조금 조심스러운 흐름이에요. 끌림은 있지만 연락 방식이나 속도가 서로 달라 오해가 생기기 쉬워요. 지금은 밀당보다 솔직함이 이기는 때예요. 답장 시간 재기, 일부러 늦게 답하기 같은 행동은 이 궁합에서 역효과가 나요. 가볍고 편한 만남을 몇 번 더 쌓은 뒤에 마음을 전하는 순서가 좋아요."
    ],
    crush: [
      "짝사랑 상대와 궁합이 좋은 편이에요. 상대가 나를 편하게 느낄 가능성이 높아요. 지금 할 일은 '자연스러운 접점'을 늘리는 거예요. 같은 모임, 같은 관심사, 가벼운 부탁처럼 부담 없는 이유로 대화를 이어가세요. 고백은 충분히 친해진 다음, 아래 '좋은 날' 중 하루를 고르면 성공 가능성이 올라가요.",
      "짝사랑 상대와는 맞춰가야 할 부분이 있는 궁합이에요. 그렇다고 가능성이 없는 건 아니에요. 다만 갑작스러운 고백보다는 천천히 신뢰를 쌓는 게 훨씬 중요해요. 상대가 좋아하는 것에 관심을 보이고, 작은 약속을 꼭 지키는 모습을 보여주세요. 상대가 나를 '믿을 수 있는 사람'으로 느끼는 순간이 오면 그때가 기회예요."
    ],
    friend: [
      "오래 갈 좋은 친구 궁합이에요. 함께 새로운 경험을 쌓을수록 우정이 깊어져요. 여행이나 운동처럼 같이 몸으로 부딪히는 활동을 추천해요. 서로의 성공을 진심으로 축하해 줄 수 있는 관계라, 같이 무언가를 해보는 것(공부, 부업, 취미 모임)도 좋아요.",
      "가끔 부딪히지만 서로를 단련시켜 주는 친구 궁합이에요. 돈 거래, 큰 부탁, 서로의 연애에 대한 지나친 조언은 피하는 게 좋아요. 적당한 거리를 지키면 오히려 오래가는 친구가 돼요."
    ]
  };

  // ---------- 계산 ----------
  function dayT(date) {
    const s = calcSaju(date.getFullYear(), date.getMonth() + 1, date.getDate(), 12, 0, true, false);
    return { date, key: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`, day: s.day };
  }

  function forecast(me, you, days) {
    const out = [];
    const start = new Date(); start.setHours(12, 0, 0, 0);
    for (let i = 1; i <= days; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      out.push({ date: d, score: SajuToday.pairToday(me, you, dayT(d)) });
    }
    return out;
  }

  function temperature(me, you, name) {
    const e1 = STEM_EL[me.s.day.stem], e2 = STEM_EL[you.s.day.stem];
    const d = mod(e2 - e1, 5);
    if (d === 0) return `두 사람의 마음 온도는 비슷해요. 누가 더 좋아한다기보다 같은 속도로 가까워지는 관계예요. 그래서 둘 다 먼저 다가가길 기다리다 시간이 흐를 수 있어요. 먼저 움직이는 쪽이 관계의 방향을 정하게 돼요.`;
    if (d === 1) return `내가 ${name}에게 더 많이 주는 흐름이에요. 나는 상대를 챙기고 키워주고 싶어 하고, 상대는 그 마음을 받으며 편안함을 느껴요. 내가 지치지 않도록 상대에게도 표현을 요청하세요.`;
    if (d === 4) return `${name}이(가) 나를 더 챙겨주는 흐름이에요. 상대는 나에게 힘이 되어주고 싶어 하고, 나는 상대 곁에서 안정감을 느껴요. 받은 만큼 고마움을 자주 표현하면 관계가 더 단단해져요.`;
    if (d === 2) return `관계를 이끄는 쪽은 나예요. 내가 방향을 정하고 상대가 따라오는 경우가 많아요. 상대는 나에게 끌리면서도 약간 긴장할 수 있어요. 결정할 때 상대의 의견을 먼저 물어봐 주면 균형이 맞아요.`;
    return `관계를 이끄는 쪽은 ${name}이에요. 상대의 결정에 내가 맞춰가는 경우가 많아요. 상대의 리드가 든든하게 느껴질 수 있지만, 내가 원하는 것도 분명히 말해야 오래 편안해요.`;
  }

  const fmt = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일 (${"일월화수목금토"[d.getDay()]})`;

  function premiumHtml(me, you, name, rel, c) {
    const P = (t) => `<p>${t}</p>`, H = (t) => `<h3>${t}</h3>`;
    const g2 = tenGodOfStem(you.s.day.stem, me.s.day.stem); // 상대 기준으로 본 나
    const fc = forecast(me, you, 60);
    const best = [...fc].sort((a, b) => b.score - a.score).slice(0, 5).sort((a, b) => a.date - b.date);
    const worst = [...fc].sort((a, b) => a.score - b.score).slice(0, 3).sort((a, b) => a.date - b.date);

    // 월별 흐름: 평균은 비슷하게 나와서, 달마다 '특히 좋은 날'이 며칠인지로 비교
    const fc90 = forecast(me, you, 90);
    const cut = [...fc90].map((x) => x.score).sort((a, b) => b - a)[Math.floor(fc90.length * 0.2)];
    const months = [];
    fc90.forEach((x) => {
      const k = `${x.date.getFullYear()}-${x.date.getMonth()}`;
      let m = months.find((y) => y.k === k);
      if (!m) { m = { k, label: `${x.date.getMonth() + 1}월`, good: 0, n: 0, best: x }; months.push(m); }
      m.n++;
      if (x.score >= cut) m.good++;
      if (x.score > m.best.score) m.best = x;
    });
    const shown = months.filter((m) => m.n >= 10);
    const maxRate = Math.max(...shown.map((m) => m.good / m.n));
    const monthRows = shown.map((m) => {
      const rate = m.good / m.n;
      const msg = rate >= maxRate * 0.85 ? "가까워지기 가장 좋은 달" : rate >= maxRate * 0.5 ? "무난하게 이어가는 달" : "서두르지 말고 쉬어가는 달";
      return `<div class="score-row"><div class="bar-name">${m.label}</div><div class="bar-track"><div class="bar-fill grp" style="width:${Math.max(8, Math.round(rate / maxRate * 100))}%"></div></div><div class="bar-count">${m.good}일</div></div><p class="month-msg">${msg} · 가장 좋은 날 ${fmt(m.best.date)}</p>`;
    }).join("") + `<p class="month-msg">막대는 그달의 '특히 좋은 날' 수예요.</p>`;

    const hi = c.love >= 72 ? 0 : 1;
    return H(`${name}의 눈에 비친 나`) + P(PERCEIVE[g2]) +
      H("두 사람의 마음 온도") + P(temperature(me, you, name)) +
      H(`${RELS.find((r) => r[0] === rel)[1]} 맞춤 조언`) + P(ADVICE[rel][rel === "friend" ? (c.friend >= 72 ? 0 : 1) : hi]) +
      H(`💌 ${TIMING_LABEL[rel]} (앞으로 60일)`) +
      `<ul class="dates good">${best.map((x) => `<li><b>${fmt(x.date)}</b><span>${x.score}점</span></li>`).join("")}</ul>` +
      H("⚠️ 오해·다툼 주의일") +
      `<ul class="dates bad">${worst.map((x) => `<li><b>${fmt(x.date)}</b><span>${x.score}점</span></li>`).join("")}</ul>` +
      P("주의일에는 중요한 고백이나 진지한 이야기, 돈 이야기를 피하고 가벼운 안부 정도만 나누는 게 좋아요.") +
      H("📅 앞으로 몇 달의 흐름") + monthRows;
  }

  // ---------- 화면 ----------
  let ctx = null;
  const pairKey = () => `${SajuCode.getMyCode()}|${ctx.code}`;
  const mem = new Set(); // 저장이 안 되는 환경에서도 이번 화면에서는 열려 있게
  const isUnlocked = () => mem.has(pairKey()) || store.get(UNLOCK_KEY, []).includes(pairKey());
  const relOf = () => store.get(REL_KEY, {})[ctx.code] || "some";

  function render() {
    if (!ctx) return;
    const { me, you, name } = ctx;
    const rel = relOf();
    const c = SajuCode.compare(me, you);
    const chips = `<div class="rel-chips">${RELS.map(([k, l]) => `<button type="button" class="tab ${k === rel ? "on" : ""}" data-rel="${k}">${l}</button>`).join("")}</div>`;
    const head = `<h2>✨ 심층 궁합</h2><p class="hint">두 사람의 관계를 골라 주세요. 관계에 맞춰 풀이가 달라져요.</p>${chips}`;

    if (isUnlocked()) {
      $("premium").innerHTML = head + `<div class="reading">${premiumHtml(me, you, name, rel, c)}</div>`;
      return;
    }
    $("premium").innerHTML = head + `
      <div class="locked">
        <ul class="teaser">
          <li>👀 ${name}의 눈에 비친 나</li>
          <li>🌡️ 누가 더 좋아할까? 두 사람의 마음 온도</li>
          <li>💌 앞으로 60일, ${TIMING_LABEL[rel]} 5일</li>
          <li>⚠️ 오해·다툼 주의일 3일</li>
          <li>📅 앞으로 몇 달의 흐름</li>
        </ul>
        <div class="blur-preview"><p>${PERCEIVE[tenGodOfStem(you.s.day.stem, me.s.day.stem)].slice(0, 60)}…</p></div>
        <button type="button" class="btn" id="unlockAd">📺 광고 보고 무료로 열기</button>
        <button type="button" class="btn btn-light" id="unlockPay">💎 ${CONFIG.price.toLocaleString()}원에 바로 열기</button>
        ${CONFIG.testMode ? '<p class="test-badge">테스트 모드: 실제 광고나 결제 없이 바로 열려요</p>' : ""}
      </div>`;
  }

  function unlock() {
    const list = store.get(UNLOCK_KEY, []);
    if (!list.includes(pairKey())) list.push(pairKey());
    store.set(UNLOCK_KEY, list.slice(-200));
    mem.add(pairKey());
    if (window.logUse) window.logUse("premium", SajuCode.getMyName());
    render();
  }

  function modal(html) {
    let m = $("modal");
    if (!m) { m = document.createElement("div"); m.id = "modal"; document.body.appendChild(m); }
    m.innerHTML = `<div class="modal-box">${html}</div>`;
    m.classList.remove("hidden");
    return m;
  }
  const closeModal = () => { const m = $("modal"); if (m) m.classList.add("hidden"); };

  // 진짜 광고를 붙일 때 이 함수 안쪽을 바꾸면 됨
  function unlockWithAd() {
    let left = CONFIG.adSeconds;
    const m = modal(`<div class="ad-box">광고 자리<br><small>(테스트)</small></div><p id="adLeft">${left}초 후에 열려요</p>`);
    const timer = setInterval(() => {
      left--;
      const el = m.querySelector("#adLeft");
      if (el) el.textContent = `${left}초 후에 열려요`;
      if (left <= 0) { clearInterval(timer); closeModal(); unlock(); }
    }, 1000);
  }

  // 진짜 결제를 붙일 때 이 함수 안쪽을 바꾸면 됨 (결제 확인은 반드시 서버에서)
  function unlockWithPay() {
    const m = modal(`<h3>💎 심층 궁합 열기</h3><p class="big">${CONFIG.price.toLocaleString()}원</p>
      <p class="test-badge">테스트 결제예요. 실제로 돈이 나가지 않아요.</p>
      <button type="button" class="btn" id="payOk">결제하기 (테스트)</button>
      <button type="button" class="link-btn" id="payCancel">취소</button>`);
    m.querySelector("#payOk").onclick = () => { closeModal(); unlock(); };
    m.querySelector("#payCancel").onclick = closeModal;
  }

  $("premium").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.rel) {
      const rels = store.get(REL_KEY, {}); rels[ctx.code] = b.dataset.rel; store.set(REL_KEY, rels);
      render();
    } else if (b.id === "unlockAd") unlockWithAd();
    else if (b.id === "unlockPay") unlockWithPay();
  });

  window.onGunghap = (me, you, name, code) => {
    ctx = { me, you, name, code };
    render();
  };
})();
