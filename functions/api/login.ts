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
    let profile;
    let userKey = `KHOAI__profile__user:${username}`;
    let userProfile = await env.KHOAI_KV_USER.get(userKey, "json");
    if (!userProfile) {
      // Nếu không có, thử tìm theo email
      const emailKey = `KHOAI__profile__email:${username}`;
      const emailMap = await env.KHOAI_KV_USER.get(emailKey, "json");
      if (emailMap?.user) {
        userKey = `KHOAI__profile__user:${emailMap.user}`;
        userProfile = await env.KHOAI_KV_USER.get(userKey, "json");
      }
    }
    if (!userProfile) {
      return Response.json({ success: false, message: "Tài khoản không tồn tại!" }, { status: 400 });
    }
    if (userProfile.status === "lock") {
      return Response.json({ success: false, message: "Tài khoản đã bị khóa!" }, { status: 403 });
    }

    // 4. KIỂM TRA PASSWORD (dùng SALT_USER)
    const salt_user = env.SALT_USER;
    const hashedInputPass = await sha256(password + salt_user);
    // Password hash đúng với trường nào trong userProfile? (tuỳ bạn đặt tên, ví dụ userProfile.userPassword hoặc userProfile.pass hoặc object)
    // Dưới đây kiểm tra lần lượt:
    let hashOk = false;
    if (userProfile.pass && hashedInputPass === userProfile.pass) hashOk = true;
    if (userProfile.userPassword && hashedInputPass === userProfile.userPassword) hashOk = true;
    if (userProfile.security && userProfile.security.password && hashedInputPass === userProfile.security.password) hashOk = true;
    if (!hashOk) {
      return Response.json({ success: false, message: "Sai mật khẩu!" }, { status: 400 });
    }

    // 5. Nếu bật open_pin thì bắt buộc phải kiểm tra PIN
    let requirePin = false;
    if (userProfile.security && userProfile.security.open_pin === "true") requirePin = true;
    if (userProfile.open_pin === "true") requirePin = true;
    if (requirePin) {
      if (!pin || typeof pin !== "string" || !/^[0-9]{8}$/.test(pin)) {
        return Response.json({ success: false, message: "Vui lòng nhập đúng mã PIN (8 số)!" }, { status: 400 });
      }
      const hashedPin = await sha256(pin + salt_user);
      let pinOk = false;
      if (userProfile.pin && hashedPin === userProfile.pin) pinOk = true;
      if (userProfile.security && userProfile.security.pin && hashedPin === userProfile.security.pin) pinOk = true;
      if (!pinOk) {
        return Response.json({ success: false, message: "Mã PIN không đúng!" }, { status: 400 });
      }
    }

    // 6. TẠO COOKIE
    const cookie = randomBase62(100);
    const salt_cookie = env.SALT_COOKIE;
    const userAgentHash = await sha256(ua);
    const cookieKey = `KHOAI__cookie:cookie:${await sha256(userAgentHash + cookie + salt_cookie)}`;
    await env.KHOAI_KV_COOKIE.put(cookieKey, JSON.stringify({
      user: userProfile.username,
      last_seen: now,
      ip,
    }), { expirationTtl: 14 * 24 * 3600 });

    // 7. PROFILE_COOKIE
    const salt_profile_cookie = env.SALT_PROFILE_COOKIE;
    const profile_cookie = await sha256(userAgentHash + cookie + salt_profile_cookie);

    // 8. Cập nhật ip_logged, ua_logged (nếu cần)
    if (userProfile.security) {
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
    }
    await env.KHOAI_KV_USER.put(userKey, JSON.stringify(userProfile));

    // 9. RETURN COOKIE + PROFILE_COOKIE
    return new Response(JSON.stringify({
      success: true,
      redirect: "/overview",
      cookie,
      profile_cookie
    }), {
      headers: {
        "Set-Cookie": [
          `cookie=${cookie}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=1209600`,
          `profile_cookie=${profile_cookie}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=1209600`
        ],
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: "Lỗi hệ thống ngoài dự kiến!", error: String(err), stack: err?.stack }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
