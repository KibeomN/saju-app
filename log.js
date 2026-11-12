// 이용 기록 남기기: 이름, 한 일, 시간만 저장 (생년월일·상대 이름은 저장하지 않음)
// 기록은 관리자만 Supabase 사이트에서 볼 수 있고, 이 화면에서는 읽을 수 없음
(() => {
  const C = window.APP_CONFIG || {};
  const last = {};

  function deviceId() {
    try {
      let id = localStorage.getItem("saju.device");
      if (!id) { id = Math.random().toString(36).slice(2, 10); localStorage.setItem("saju.device", id); }
      return id;
    } catch { return null; }
  }

  window.logUse = (action, name) => {
    if (!C.SUPABASE_URL || !name) return;
    const key = action + "|" + name;
    if (last[key] && Date.now() - last[key] < 60000) return; // 1분 안에 같은 기록은 한 번만
    last[key] = Date.now();
    fetch(`${C.SUPABASE_URL}/rest/v1/usage_logs`, {
      method: "POST",
      keepalive: true,
      headers: { apikey: C.SUPABASE_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ user_name: String(name).trim().slice(0, 20), action, device: deviceId() }),
    }).catch(() => { /* 기록 실패해도 앱은 그대로 동작 */ });
  };
})();
