// 날짜·시간 입력 도우미
// - 날짜: 달력 대신 숫자 8자리를 직접 입력 (19951215 → 1995.12.15 로 자동 정리)
// - 시간: '시'와 '분'을 각각 고르는 상자 두 개

(() => {
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");

  function formatDigits(v) {
    const d = v.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 4) return d;
    if (d.length <= 6) return d.slice(0, 4) + "." + d.slice(4);
    return d.slice(0, 4) + "." + d.slice(4, 6) + "." + d.slice(6);
  }

  window.DateField = {
    // 올바른 날짜면 {y, mo, d}, 아니면 null
    read(id) {
      const d = $(id).value.replace(/\D/g, "");
      if (d.length !== 8) return null;
      const y = +d.slice(0, 4), mo = +d.slice(4, 6), day = +d.slice(6, 8);
      if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || day < 1) return null;
      const dt = new Date(Date.UTC(y, mo - 1, day));
      if (dt.getUTCMonth() !== mo - 1) return null; // 2월 30일 같은 날짜 막기
      return { y, mo, d: day };
    },
    write(id, y, mo, d) { $(id).value = `${y}.${pad(mo)}.${pad(d)}`; },
  };

  // 오래된 아이폰 브라우저에는 requestSubmit 기능이 없어서 대신 쓰는 함수
  window.submitForm = (form) => {
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  };

  // 화면에 오류가 생기면 사용자에게 알려주기 (원인 파악용)
  window.addEventListener("error", (e) => {
    let bar = document.getElementById("errBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "errBar";
      bar.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:99;background:#8b3a2b;color:#fff;padding:12px 14px;border-radius:12px;font-size:14px;line-height:1.5";
      document.body.appendChild(bar);
    }
    bar.textContent = "앗, 문제가 생겼어요. 새로고침해도 계속되면 이 문구를 캡처해서 알려주세요: " + String(e.message || "").slice(0, 120);
  });

  window.TimeField = {
    read(id) { return { h: +$(id + "H").value, mi: +$(id + "M").value }; },
    write(id, h, mi) { $(id + "H").value = String(h); $(id + "M").value = String(mi); },
    setDisabled(id, off) { $(id + "H").disabled = off; $(id + "M").disabled = off; $(id).classList.toggle("off", off); },
  };

  const hourLabel = (h) => {
    if (h === 0) return "밤 12시";
    if (h === 12) return "낮 12시";
    return `${h < 12 ? "오전" : "오후"} ${h % 12}시`;
  };

  document.querySelectorAll(".date-input").forEach((el) => {
    el.addEventListener("input", () => { el.value = formatDigits(el.value); });
  });

  document.querySelectorAll(".time-row").forEach((row) => {
    const H = $(row.id + "H"), M = $(row.id + "M");
    for (let h = 0; h < 24; h++) H.add(new Option(hourLabel(h), String(h)));
    for (let m = 0; m < 60; m++) M.add(new Option(`${pad(m)}분`, String(m)));
    H.value = "12"; M.value = "0";
  });
})();
