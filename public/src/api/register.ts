import { getNextId, hashPassword, randomBase62, sendMail } from '../lib';
import { User } from '../models/user';
import { KHOAI_KV_USER } from '../lib/kv';

export async function onRequestPost({ request }) {
  const data = await request.json();
  // Validate input...
  if(!data.fullname || !data.email || !data.password || !data.phone || !data.pin) {
    return new Response(JSON.stringify({ ok: false, message: "Thiếu thông tin." }), {status: 400});
  }
  if(!/^\d{6}$/.test(data.pin)) return res({ok:false,message:"PIN không hợp lệ"});
  if(data.password.length < 8) return res({ok:false,message:"Mật khẩu quá ngắn"});
  // Check trùng email
  const emailKey = `KHOAI__profile__email:${data.email.toLowerCase()}`;
  if(await KHOAI_KV_USER.get(emailKey)) return res({ok:false,message:"Email đã tồn tại."});
  // Sinh id tự tăng
  const id = await getNextId();
  const salt = randomBase62(20);
  const pass = hashPassword(data.password, salt);
  const pin = hashPassword(data.pin, salt);
  const username = 'u' + id;
  const token = randomBase62(60);
  const now = Math.floor(Date.now()/1000);
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
    token: hashPassword(token, salt)
    // ... có thể bổ sung thêm field nếu cần
  };
  // Lưu vào KV
  await KHOAI_KV_USER.put(`KHOAI__profile__user:${username}`, JSON.stringify(user));
  await KHOAI_KV_USER.put(emailKey, JSON.stringify({user: username}));
  await KHOAI_KV_USER.put(`KHOAI__profile__id:${id}`, JSON.stringify({user: username}));
  // Gửi mail xác thực nếu muốn (có thể dùng sendMail)
  // await sendMail(data.email, "Đăng ký thành công!", ...);
  return new Response(JSON.stringify({ ok: true }), {headers:{'content-type':'application/json'}});
}

function res(obj) {
  return new Response(JSON.stringify(obj), {headers:{'content-type':'application/json'}});
}
