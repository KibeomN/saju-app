// 오늘의 운세 + 친구 목록 + 친구와 오늘의 궁합
// - 오늘의 운세는 '오늘의 일진(오늘 날짜의 일주)'이 내 사주와 어떤 관계인지로 계산
// - 내 정보와 친구 목록은 이 기기(브라우저)에만 저장 (서버 없음)

(() => {
  const $ = (id) => document.getElementById(id);
  const mod = (n, m) => ((n % m) + m) % m;
  const clamp = (n) => Math.max(40, Math.min(98, Math.round(n)));
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const R = window.READINGS;

  // ---------- 저장 (이 기기에만) ----------
  const store = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch { return false; } },
    del(key) { try { localStorage.removeItem(key); } catch { /* 저장 불가 환경 */ } },
  };
  const ME_KEY = "saju.me", FRIENDS_KEY = "saju.friends";

  // ---------- 오늘 ----------
  function todayInfo() {
    const n = new Date();
    const s = calcSaju(n.getFullYear(), n.getMonth() + 1, n.getDate(), 12, 0, true, false);
    return { date: n, key: `${n.getFullYear()}-${n.getMonth() + 1}-${n.getDate()}`, day: s.day };
  }
  function hash(str) { let h = 7; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }

  const stemHap = (a, b) => mod(a - b, 10) === 5;
  const branchHap = (a, b) => (a + b) % 12 === 1;
  const branchClash = (a, b) => mod(a - b, 12) === 6;
  const branchTrine = (a, b) => a !== b && a % 4 === b % 4;
  const god = (dayStem, stem) => tenGodOfStem(dayStem, stem);

  function usefulEl(a) {
    const de = STEM_EL[a.s.day.stem];
    if (a.strength === "strong") return (de + 1) % 5;
    if (a.strength === "weak") return (de + 4) % 5;
    return a.elCounts.indexOf(Math.min(...a.elCounts));
  }

  // 오늘이 나에게 어떤 날인지 점수 계산
  function todayCore(a, t, seed) {
    const ds = a.s.day.stem, db = a.s.day.branch;
    const sg = god(ds, t.day.stem), bg = tenGodOfBranch(ds, t.day.branch);
    const grp = Math.floor(sg / 2), bgrp = Math.floor(bg / 2);
    let total = [64, 72, 74, 66, 70][grp];
    if (a.strength === "weak" && (grp === 0 || grp === 4)) total += 8;
    if (a.strength === "strong" && (grp === 1 || grp === 2 || grp === 3)) total += 6;
    if (a.strength === "strong" && grp === 4) total -= 4;
    if (a.strength === "weak" && grp === 3) total -= 4;
    const hap = branchHap(db, t.day.branch), clash = branchClash(db, t.day.branch), trine = branchTrine(db, t.day.branch);
    if (hap) total += 10; else if (trine) total += 6; else if (clash) total -= 12;
    if (stemHap(ds, t.day.stem)) total += 5;
    const useful = STEM_EL[t.day.stem] === usefulEl(a);
    if (useful) total += 6;
    total += (hash(t.key + ds + db) % 7) - 3; // 같은 날 같은 사람은 항상 같은 값

    const star = a.gender === "male" ? 2 : 3;
    const groups = [grp, bgrp];
    return {
      sg, bg, grp, hap, clash, useful,
      total: clamp(total),
      love: clamp(total + (groups.includes(star) ? 10 : 0) + (hap ? 5 : 0) - (clash ? 4 : 0)),
      money: clamp(total + (groups.includes(2) ? 10 : 0) - (sg === 1 ? 10 : 0) + (grp === 1 ? 4 : 0)),
      work: clamp(total + (groups.includes(3) || groups.includes(4) ? 8 : 0) - (sg === 3 ? 4 : 0)),
      health: clamp(total + (useful ? 4 : 0) - (clash ? 8 : 0) + (a.strength === "weak" && grp === 4 ? 4 : 0)),
    };
  }

  // ---------- 오늘의 운세 문장 ----------
  const TODAY = [
    "오늘은 '비견'의 날이에요. 내 힘이 단단해지는 하루예요. 미뤄둔 일을 혼자 밀고 나가기 좋고, 친구나 동료와 함께하면 힘이 두 배가 돼요. 다만 고집이 세지기 쉬우니 사소한 의견 차이는 웃으며 넘겨 주세요.",
    "오늘은 '겁재'의 날이에요. 경쟁심과 승부욕이 올라오는 하루예요. 운동이나 도전에는 좋지만, 돈 쓸 일과 남과의 신경전이 생기기 쉬워요. 충동구매와 내기는 오늘만큼은 참아 보세요.",
    "오늘은 '식신'의 날이에요. 마음이 여유롭고 즐거운 하루예요. 맛있는 음식, 취미, 창작에 운이 따라요. 하고 싶었던 작은 일을 하나 해보면 기분 좋은 결과가 와요.",
    "오늘은 '상관'의 날이에요. 아이디어와 말솜씨가 반짝이는 하루예요. 발표, 글쓰기, 기획에 좋아요. 다만 말이 날카로워지기 쉬우니 윗사람 앞에서는 한 번 더 생각하고 말하세요.",
    "오늘은 '편재'의 날이에요. 활동적이고 기회가 많은 하루예요. 밖으로 나가 사람을 만나면 뜻밖의 수입이나 좋은 정보가 생겨요. 들어온 만큼 나가기도 쉬우니 지출은 계획대로만 하세요.",
    "오늘은 '정재'의 날이에요. 차분하게 실속을 챙기는 하루예요. 정리, 저축, 계획 세우기에 좋아요. 꾸준히 해온 일에서 작은 보상이 돌아올 수 있어요.",
    "오늘은 '편관'의 날이에요. 긴장되고 바쁜 하루가 될 수 있어요. 갑자기 일이 몰리거나 압박을 느낄 수 있지만, 잘 넘기면 실력을 인정받아요. 무리한 운전과 과로는 피하세요.",
    "오늘은 '정관'의 날이에요. 반듯하게 인정받는 하루예요. 면접, 보고, 서류 제출처럼 공식적인 일에 좋아요. 약속 시간과 예의를 잘 지키면 평가가 올라가요.",
    "오늘은 '편인'의 날이에요. 생각이 많아지는 하루예요. 새로운 공부나 특이한 아이디어에는 좋지만, 걱정이 꼬리를 물 수 있어요. 고민은 종이에 적어 보고, 결정은 내일로 미뤄도 괜찮아요.",
    "오늘은 '정인'의 날이에요. 도움과 배움이 들어오는 하루예요. 윗사람이나 선배의 조언이 큰 힘이 돼요. 책 읽기, 공부, 계약서 검토에 좋은 날이에요."
  ];
  const LOVE = ["친구 같은 편안한 대화가 잘 통해요.", "질투나 기싸움을 조심하세요.", "함께 맛있는 걸 먹으면 사이가 더 좋아져요.", "재치 있는 말이 매력이 되지만, 농담 수위는 조절하세요.", "새로운 만남의 기회가 생기기 쉬워요.", "진지하고 안정적인 대화가 잘 통해요.", "강한 끌림이 있지만 다툼도 생기기 쉬워요.", "반듯한 모습이 좋은 인상을 줘요.", "혼자만의 시간이 필요할 수 있어요. 솔직하게 말해 주세요.", "상대에게 위로를 받거나 위로를 줄 수 있는 날이에요."];
  const MONEY = ["큰 변동 없이 평범해요.", "지출이 늘기 쉬우니 지갑을 단단히 닫으세요.", "작은 즐거움에 쓰는 돈은 괜찮아요.", "아이디어가 돈이 될 수 있어요. 메모해 두세요.", "뜻밖의 수입이나 좋은 정보가 생길 수 있어요.", "저축과 정리에 좋은 날이에요.", "갑작스러운 지출에 대비하세요.", "정해진 수입이 안정적으로 들어와요.", "투자 결정은 미루는 게 좋아요.", "문서와 계약 관련 일이 잘 풀려요."];
  const WORK = ["혼자 집중하는 일에 좋아요.", "경쟁이 있는 일에 강해요.", "즐겁게 일하면 결과도 좋아요.", "기획과 발표에 강한 날이에요.", "밖에서 뛰는 일, 영업에 좋아요.", "꼼꼼한 마무리가 빛나요.", "일이 몰릴 수 있으니 우선순위를 정하세요.", "윗사람의 인정을 받기 좋아요.", "새로운 방법을 시도해 보세요.", "공부와 자격증 준비에 좋아요."];
  const COLOR = [["초록색", "3"], ["빨간색", "7"], ["노란색", "5"], ["흰색", "9"], ["남색", "1"]];

  function scoreRow(label, n) {
    return `<div class="score-row"><div class="bar-name">${label}</div>
      <div class="bar-track"><div class="bar-fill grp" style="width:${n}%"></div></div>
      <div class="bar-count">${n}점</div></div>`;
  }

  function renderToday(a) {
    const t = todayInfo();
    const c = todayCore(a, t, "");
    const d = t.date;
    const ue = usefulEl(a);
    const col = COLOR[ue];
    let html = `<p class="today-date">${d.getMonth() + 1}월 ${d.getDate()}일 · 오늘의 일진 ${STEMS_KO[t.day.stem]}${BRANCHES_KO[t.day.branch]}일</p>
      <div class="ring" style="--p:${c.total}"><div><b>${c.total}</b><small>점</small></div></div>
      ${scoreRow("연애", c.love)}${scoreRow("금전", c.money)}${scoreRow("일", c.work)}${scoreRow("건강", c.health)}
      <div class="reading">
        <p>${TODAY[c.sg]}</p>
        ${c.hap ? "<p>오늘의 기운이 내 생활의 자리(일지)와 잘 어울려요(합). 사람 운이 좋고 일이 술술 풀리기 쉬워요.</p>" : ""}
        ${c.clash ? "<p>오늘의 기운이 내 생활의 자리(일지)와 부딪혀요(충). 계획이 바뀌거나 이동이 생기기 쉬우니 여유 시간을 두세요.</p>" : ""}
        ${c.useful ? "<p>오늘은 나에게 도움이 되는 기운이 들어오는 날이에요. 미뤄둔 중요한 일을 하기 좋아요.</p>" : ""}
        <ul class="plain">
          <li><b>연애</b> ${LOVE[c.sg]}</li>
          <li><b>금전</b> ${MONEY[c.sg]}</li>
          <li><b>일·공부</b> ${WORK[c.sg]}</li>
        </ul>
        <p class="lucky">🍀 오늘의 행운 색 <b>${col[0]}</b> · 행운의 숫자 <b>${col[1]}</b></p>
      </div>`;
    $("todayBox").innerHTML = html;
  }

  // ---------- 친구와 오늘의 궁합 ----------
  const PAIR_TODAY = [
    "오늘 두 사람은 찰떡이에요! 같이 무엇을 해도 즐겁고, 평소 못 하던 이야기도 술술 나와요. 오늘 먼저 연락해 보세요.",
    "오늘 두 사람은 기분 좋게 잘 맞아요. 가볍게 만나 밥 한 끼 하기 좋은 날이에요.",
    "오늘 두 사람은 무난해요. 큰 일정보다 짧은 연락이나 안부 정도가 딱 좋아요.",
    "오늘은 서로 예민할 수 있어요. 중요한 이야기나 돈 이야기는 다른 날로 미루세요."
  ];
  const ACTIVITY = ["공원 산책이나 등산", "맛집이나 공연, 노래방", "집밥이나 카페에서 수다", "운동이나 전시회", "영화, 바다·강가 산책"];
  const band = (n) => (n >= 85 ? 0 : n >= 72 ? 1 : n >= 60 ? 2 : 3);

  function pairToday(me, fr, t) {
    const base = SajuCode.compare(me, fr).total;
    const m = todayCore(me, t, ""), f = todayCore(fr, t, "");
    let s = base * 0.55 + (m.total + f.total) / 2 * 0.35 + 8;
    if (m.useful && f.useful) s += 5;
    if (m.clash || f.clash) s -= 6;
    if (m.hap && f.hap) s += 6;
    s += (hash(t.key + me.s.day.stem + fr.s.day.stem + me.s.day.branch + fr.s.day.branch) % 5) - 2;
    return clamp(s);
  }

  let me = null;
  let pendingDelete = null;

  function friends() { return store.get(FRIENDS_KEY, []); }

  function renderFriends() {
    const list = friends();
    const box = $("friendList");
    if (!me) { box.innerHTML = ""; return; }
    if (!list.length) {
      box.innerHTML = `<p class="hint">아직 친구가 없어요. 위에서 친구 회원번호로 궁합을 본 다음 '친구로 저장'을 눌러 주세요.</p>`;
      return;
    }
    const t = todayInfo();
    const el = STEM_EL[t.day.stem];
    box.innerHTML = list.map((fr, i) => {
      const info = SajuCode.decode(fr.code);
      if (!info) return "";
      const fa = SajuCode.analyzeInfo(info);
      const sc = pairToday(me, fa, t);
      return `
        <div class="friend">
          <div class="friend-top">
            <div><div class="friend-name">${esc(fr.name)}</div><div class="friend-code">${fr.direct ? "🎂 생일로 추가" : esc(fr.code)}</div></div>
            <div class="friend-score"><b>${sc}</b><small>오늘의 궁합</small></div>
          </div>
          <p>${PAIR_TODAY[band(sc)]} 오늘 함께하기 좋은 건 <b>${ACTIVITY[el]}</b>이에요.</p>
          <div class="friend-btns">
            <button type="button" class="btn-sm" data-act="detail" data-i="${i}">궁합 자세히</button>
            <button type="button" class="btn-sm danger" data-act="del" data-i="${i}">${pendingDelete === i ? "정말 삭제할까요?" : "삭제"}</button>
          </div>
        </div>`;
    }).join("");
  }

  $("friendList").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const i = Number(b.dataset.i);
    const list = friends();
    if (b.dataset.act === "detail") {
      const info = SajuCode.decode(list[i].code);
      if (info) SajuCode.showPartner(info, list[i].name, list[i].code, !!list[i].direct);
      $("saveFriend").textContent = "⭐ 내 목록에 저장";
    } else if (b.dataset.act === "del") {
      if (pendingDelete === i) {
        list.splice(i, 1);
        store.set(FRIENDS_KEY, list);
        pendingDelete = null;
      } else {
        pendingDelete = i;
      }
      renderFriends();
    }
  });

  $("saveFriend").addEventListener("click", () => {
    const lp = SajuCode.getLastPartner();
    if (!lp || !SajuCode.decode(lp.code)) return;
    const name = lp.name || "상대";
    const list = friends().filter((f) => f.code !== lp.code);
    list.unshift({ name: name.slice(0, 10), code: lp.code, direct: lp.direct });
    if (!store.set(FRIENDS_KEY, list.slice(0, 30))) {
      $("saveFriend").textContent = "이 화면에서는 저장할 수 없어요";
      return;
    }
    $("saveFriend").textContent = "저장됨 ✓";
    setTimeout(() => { $("saveFriend").textContent = "⭐ 내 목록에 저장"; }, 1500);
    renderFriends();
  });

  // 궁합 결과가 나오면 '친구로 저장' 버튼 글자 초기화
  $("gunghapForm").addEventListener("submit", () => { $("saveFriend").textContent = "⭐ 내 목록에 저장"; });

  // ---------- 내 정보 기억하기 ----------
  const prevHook = window.onMySaju;
  window.onMySaju = (info, a) => {
    if (prevHook) prevHook(info, a);
    me = a;
    if ($("rememberMe").checked) store.set(ME_KEY, info); else store.del(ME_KEY);
    renderToday(a);
    renderFriends();
  };

  $("forgetMe").addEventListener("click", () => {
    store.del(ME_KEY);
    $("rememberMe").checked = false;
    $("forgetMe").textContent = "지웠어요 ✓";
    setTimeout(() => { $("forgetMe").textContent = "저장된 내 정보 지우기"; }, 1500);
  });

  // 저장된 내 정보가 있으면 바로 보여주기
  const saved = store.get(ME_KEY, null);
  if (saved && saved.y) {
    const pad = (n) => String(n).padStart(2, "0");
    document.querySelector(`input[name="gender"][value="${saved.gender}"]`).checked = true;
    DateField.write("birthDate", saved.y, saved.mo, saved.d);
    if (saved.name) $("myName").value = saved.name;
    $("unknownTime").checked = !saved.timeKnown;
    TimeField.setDisabled("birthTime", !saved.timeKnown);
    if (saved.timeKnown) TimeField.write("birthTime", saved.h, saved.mi);
    $("correction").checked = !!saved.correction;
    submitForm($("form"));
    window.scrollTo(0, 0);
  }

  window.SajuToday = { todayCore, pairToday, todayInfo };
})();
