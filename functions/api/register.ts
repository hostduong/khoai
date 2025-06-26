
export async function onRequestPost(context) {
  try {
    // Toàn bộ code gốc ở đây (bên dưới)
    const { request, env } = context;
    const data = await request.json();

    // ... Toàn bộ code đăng ký của bạn ở đây ...

  } catch (err) {
    // Trả thẳng lỗi về cho frontend (debug mode)
    return new Response(
      JSON.stringify({ success: false, message: "Lỗi hệ thống (DEBUG)", error: String(err), stack: err?.stack }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}


import { sha256, randomBase62 } from "./hash";
// KV binding: env.KHOAI_KV_USER, env.KHOAI_KV_TOKEN, env.KHOAI_KV_COOKIE

export async function onRequestPost(context) {
  const { request, env } = context;
  const data = await request.json();

  // 1. VALIDATE CAPTCHA
  const captchaToken = data["cf-turnstile-response"];
  const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({
      secret: env.CF_TURNSTILE_SECRET, // Bạn lưu secret key ở env
      response: captchaToken,
      remoteip: request.headers.get("CF-Connecting-IP") || "",
    }),
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
  const result = await verify.json();
  if (!result.success) {
  // Log mọi thứ (xem trên log hoặc gửi ra frontend debug)
  return Response.json({ success: false, message: "Captcha không hợp lệ!", error: result }, { status: 400 });
 }


  // 2. VALIDATE INPUT (tối ưu, kiểm tra lại ở backend)
  const { username, fullname, email, password, confirm_password, phone, pin } = data;
  if (!/^[a-z0-9_.]{6,30}$/.test(username)) return Response.json({ success: false, message: "Tên đăng nhập không hợp lệ!" });
  if (!fullname || fullname.length < 6 || fullname.length > 50) return Response.json({ success: false, message: "Họ và tên phải 6-50 ký tự!" });
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return Response.json({ success: false, message: "Email không hợp lệ!" });
  if (!/^[a-zA-Z0-9~!@#$%^&*()_+]{8,30}$/.test(password)) return Response.json({ success: false, message: "Mật khẩu không hợp lệ!" });
  if (password !== confirm_password) return Response.json({ success: false, message: "Mật khẩu nhập lại không khớp!" });
  if (!/^[0-9]{10,15}$/.test(phone)) return Response.json({ success: false, message: "Số điện thoại phải 10-15 số!" });
  if (!/^[0-9]{8}$/.test(pin)) return Response.json({ success: false, message: "PIN phải đúng 8 số!" });

  // 3. CHECK TỒN TẠI USERNAME/EMAIL
  const userKey = `KHOAI__profile__user:${username}`;
  const emailKey = `KHOAI__profile__email:${email}`;
  const idCounterKey = `KHOAI__profile__number:number`;

  const userExists = await env.KHOAI_KV_USER.get(userKey);
  if (userExists) return Response.json({ success: false, message: "Tên đăng nhập đã tồn tại!" });
  const emailExists = await env.KHOAI_KV_USER.get(emailKey);
  if (emailExists) return Response.json({ success: false, message: "Email đã tồn tại!" });

  // 4. CẤP ID MỚI (tăng dần)
  let idCounter = await env.KHOAI_KV_USER.get(idCounterKey, "json");
  let newId = (parseInt(idCounter?.number || "100000") + 1).toString();
  await env.KHOAI_KV_USER.put(idCounterKey, JSON.stringify({ number: newId }));

  // 5. TẠO SALT, HASH PASS/PIN
  const salt = randomBase62(20);
  const hashedPass = await sha256(password + salt);
  const hashedPin = await sha256(pin + salt);

  // 6. TẠO TOKEN (API token)
  const apiToken = randomBase62(60);
  const hashedToken = await sha256(apiToken + salt);

  // 7. GHI VÀO KV
  const now = Math.floor(Date.now() / 1000);
  const userProfile = {
    id: newId,
    status: "live",
    ban_reason: "",
    role: "user",
    verified_email: "false",
    email,
    salt,
    pass: hashedPass,
    fullname,
    phone,
    pin: hashedPin,
    open_pin: "false",
    ip_whitelist: [],
    open_ip: "false",
    ip_logged: [],
    ua_logged: [],
    country: "VN",
    language: "vi",
    coin: 0,
    total: 0,
    mail_total_save: 0,
    time: now,
    token: hashedToken,
  };

  await env.KHOAI_KV_USER.put(userKey, JSON.stringify(userProfile));
  await env.KHOAI_KV_USER.put(`KHOAI__profile__email:${email}`, JSON.stringify({ user: username }));
  await env.KHOAI_KV_USER.put(`KHOAI__profile__id:${newId}`, JSON.stringify({ user: username }));

  // 8. GHI TOKEN API
  await env.KHOAI_KV_TOKEN.put(
    `KHOAI__token__user:${hashedToken}`,
    JSON.stringify({ status: "live", ban_reason: "", user: username, time: now })
  );
  await env.KHOAI_KV_TOKEN.put(`KHOAI__token__salt:${salt}`, JSON.stringify({ time: now }));

  // 9. AUTO LOGIN: TẠO COOKIE
  // (Có thể sinh random cookie và salt cookie riêng)
  const cookie = randomBase62(60);
  const cookieSalt = randomBase62(20);
  await env.KHOAI_KV_COOKIE.put(
    `KHOAI__cookie__salt:${username}`,
    JSON.stringify({ salt: cookieSalt, time: now })
  );
  await env.KHOAI_KV_COOKIE.put(
    `KHOAI__cookie__user:${username}:${await sha256(cookie + cookieSalt)}`,
    JSON.stringify({
      user: username,
      open_ip: "off",
      ip: [],
      au: await sha256((context.request.headers.get("User-Agent") || "") + cookieSalt),
      time: now,
    }),
    { expirationTtl: 7 * 24 * 3600 }
  );

  // 10. TRẢ VỀ CHO CLIENT (set-cookie và success)
  return new Response(
    JSON.stringify({ success: true, message: "Đăng ký thành công!", username }),
    {
      headers: {
        "Set-Cookie": `cookie=${cookie}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 3600}`,
        "Content-Type": "application/json",
      },
      status: 200,
    }
  );
}
