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
