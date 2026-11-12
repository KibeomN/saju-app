// 데이터 저장소(Supabase) 공개 주소와 공개 열쇠
// 공개 열쇠는 화면 코드에 있어도 되는 열쇠예요. 이 열쇠로는 '기록 남기기'만 되고, 읽기·수정·삭제는 막혀 있어요(권한 규칙).
// 비밀 열쇠(service_role, sb_secret_)는 절대 여기에 넣지 않아요.
window.APP_CONFIG = {
  SUPABASE_URL: "https://enqdkonsnoudotweobkx.supabase.co",
  SUPABASE_KEY: "sb_publishable_pBmtTlAJayl-QeQyKV1-kw_OXpWG8qZ"
};
