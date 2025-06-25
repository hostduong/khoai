import { KHOAI_KV_USER } from '../lib/kv';
import { hashPassword, randomBase62 } from '../lib/hash';
import { getNextId } from '../lib/idgen';
import type { User } from '../models/user';

export async function onRequestPost({ request }) {
  const data = await request.json();

  // Validate cơ bản
  if (!data.fullname || !data.email || !data.password || !data.phone || !data.pin)
    return res({ ok: false, message: "Thiếu thông tin" }, 400);

  if (!/^\d{6}$/.test(data.pin)) return res({ ok: false, message: "PIN phải gồm 6 số." }, 400);
  if (data.password.length < 8) return res({ ok: false, message: "Mật khẩu tối thiểu 8 ký tự." }, 400);

  // Check email đã tồn tại chưa
  const emailKey = `KHOAI__profile__email:${data.email.toLowerCase()}`;
  if (await KHOAI_KV_USER.get(emailKey)) return res({ ok: false, message: "Email đã tồn tại." }, 400);

  // Sinh id tự tăng
  const id = await getNextId();
  const salt = randomBase62(20);
  const pass = await hashPassword(data.password, salt);
  const pin = await hashPassword(data.pin, salt);
  const username = 'u' + id;
  const token = randomBase62(60);
  const now = Math.floor(Date.now() / 1000);

  const user: User = {
    id: String(id),
    status: 'live',
    role: 'user',
    verified_email: "false",
    email: data.email,
    salt,
    pass,
    fullname: data.fullname,
    phone: data.phone,
    pin,
    open_pin: "false",
    ip_whitelist: [],
    open_ip: "false",
    ip_logged: [],
    ua_logged: [],
    country: "",
    language: "vi",
    coin: 0,
    total: 0,
    mail_total_save: 0,
    time: now,
    token: await hashPassword(token, salt),
  };

  // Lưu vào KV
  await KHOAI_KV_USER.put(`KHOAI__profile__user:${username}`, JSON.stringify(user));
  await KHOAI_KV_USER.put(emailKey, JSON.stringify({ user: username }));
  await KHOAI_KV_USER.put(`KHOAI__profile__id:${id}`, JSON.stringify({ user: username }));

  // (Có thể gửi mail xác nhận ở đây nếu muốn)
  return res({ ok: true });
}

function res(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}
