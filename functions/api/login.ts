import { sha256, randomBase62 } from "./hash";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const now = Math.floor(Date.now() / 1000);
    const data = await request.json();
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "";
    const ua = request.headers.get("User-Agent") || "";

    // 1. VALIDATE CAPTCHA
    const captchaToken = data["cf-turnstile-response"];
    let result;
    try {
      const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: new URLSearchParams({
          secret: env.CF_TURNSTILE_SECRET,
          response: captchaToken,
          remoteip: ip,
        }),
        headers: { "content-type": "application/x-www-form-urlencoded" },
      });
      result = await verify.json();
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: "Lỗi khi gọi siteverify!", error: String(err), stack: err?.stack }), { status: 500 });
    }
    if (!result.success) {
      return Response.json({ success: false, message: "Captcha không hợp lệ!", error: result }, { status: 400 });
    }

    // 2. LẤY INPUT
    let { username = "", password = "", pin = "", "cf-turnstile-response": _, ...others } = data;
    username = (username || "").trim();
    password = (password || "").trim();

    // 3. TÌM USER BẰNG username/email
    let userProfile = await env.KHOAI_KV_USER.get(`KHOAI__profile:user:${username}`, "json");
    if (!userProfile) {
      const emailMap = await env.KHOAI_KV_USER.get(`KHOAI__profile:email:${username}`, "json");
      if (emailMap?.user) {
        userProfile = await env.KHOAI_KV_USER.get(`KHOAI__profile:user:${emailMap.user}`, "json");
      }
    }
    if (!userProfile) {
      return Response.json({ success: false, message: "Tài khoản không tồn tại!" }, { status: 400 });
    }
    if (userProfile.status === "lock") {
      return Response.json({ success: false, message: "Tài khoản đã bị khóa!" }, { status: 403 });
    }

    // 4. KIỂM TRA PASSWORD ĐÚNG CHUẨN HỆ THỐNG
    const hashedInputPass = await sha256(password + userProfile.security.salt_user);
    if (hashedInputPass !== userProfile.security.user_password) {
      return Response.json({ success: false, message: "Sai mật khẩu!" }, { status: 400 });
    }

    // 5. Nếu bật open_pin thì bắt buộc phải kiểm tra PIN
    if (userProfile.security.open_pin === true) {
      if (!pin || typeof pin !== "string" || !/^[0-9]{8}$/.test(pin)) {
        return Response.json({ success: false, message: "Vui lòng nhập đúng mã PIN (8 số)!" }, { status: 400 });
      }
      const hashedPin = await sha256(pin + userProfile.security.salt_user);
      if (hashedPin !== userProfile.security.pin) {
        return Response.json({ success: false, message: "Mã PIN không đúng!" }, { status: 400 });
      }
    }

    // 6. Cập nhật ip_logged/ua_logged
    let ip_logged = Array.isArray(userProfile.security.ip_logged) ? [...userProfile.security.ip_logged] : [];
    let ua_logged = Array.isArray(userProfile.security.ua_logged) ? [...userProfile.security.ua_logged] : [];
    if (ip && !ip_logged.includes(ip)) {
      ip_logged.unshift(ip);
      if (ip_logged.length > 20) ip_logged = ip_logged.slice(0, 20);
    }
    if (ua && !ua_logged.includes(ua)) {
      ua_logged.unshift(ua);
      if (ua_logged.length > 20) ua_logged = ua_logged.slice(0, 20);
    }
    userProfile.security.ip_logged = ip_logged;
    userProfile.security.ua_logged = ua_logged;
    await env.KHOAI_KV_USER.put(`KHOAI__profile:user:${userProfile.username}`, JSON.stringify(userProfile));

    // 7. TẠO COOKIE, PROFILE_COOKIE (dùng SALT_COOKIE, SALT_PROFILE_COOKIE)
    const cookie = randomBase62(100);
    const salt_cookie = env.SALT_COOKIE;
    const salt_profile_cookie = env.SALT_PROFILE_COOKIE;

    // Hash UA
    const ua_hash = await sha256(ua);

    // COOKIE_ID
    const cookie_id = await sha256(ua_hash + cookie + salt_cookie);

    // Lưu vào KV
    await env.KHOAI_KV_COOKIE.put(
      `KHOAI__cookie:cookie:${cookie_id}`,
      JSON.stringify({ user: userProfile.username, last_seen: now }),
      { expirationTtl: 14 * 24 * 3600 }
    );
    await env.KHOAI_KV_COOKIE.put(
      `KHOAI__cookie:user:${userProfile.username}:${ua_hash}`,
      JSON.stringify({
        cookie_id: cookie_id,
        ua: ua_hash,
        device_name: request.headers.get("Sec-CH-UA-Platform") || "",
        ip_created: ip,
        country: userProfile.userData?.country || "VN",
        city: userProfile.userData?.city || "",
        login_time: now,
        last_seen: now,
      }),
      { expirationTtl: 14 * 24 * 3600 }
    );

    // profile_cookie
    const profile_cookie = await sha256(ua_hash + cookie + salt_profile_cookie);

    // 8. Set-Cookie trả về cho client
    return new Response(
      JSON.stringify({
        success: true,
        redirect: "/overview",
        cookie,
        profile_cookie
      }),
      {
        headers: {
          "Set-Cookie": [
            `cookie=${cookie}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=1209600`,
            `profile_cookie=${profile_cookie}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=1209600`
          ],
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: "Lỗi hệ thống ngoài dự kiến!", error: String(err), stack: err?.stack }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
