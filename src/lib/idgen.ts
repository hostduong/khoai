export async function getNextId() {
  // Đọc id cuối từ KV, tăng lên, lưu lại
  const key = "KHOAI__profile__last_id";
  let last = await KHOAI_KV_USER.get(key) || "100000";
  let next = (parseInt(last,10) + 1).toString();
  await KHOAI_KV_USER.put(key, next);
  return next;
}
