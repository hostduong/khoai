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

    // 4. KIỂM TRA PASSWORD
    const salt = userProfile.salt;
    const hashedInputPass = await sha256(password + salt);
    if (hashedInputPass !== userProfile.pass) {
      return Response.json({ success: false, message: "Sai mật khẩu!" }, { status: 400 });
    }

    // 5. Nếu bật open_pin thì bắt buộc phải kiểm tra PIN
    if (userProfile.open_pin === "true") {
      if (!pin || typeof pin !== "string" || !/^[0-9]{8}$/.test(pin)) {
        return Response.json({ success: false, message: "Vui lòng nhập đúng mã PIN (8 số)!" }, { status: 400 });
      }
      const hashedPin = await sha256(pin + salt);
      if (hashedPin !== userProfile.pin) {
        return Response.json({ success: false, message: "Mã PIN không đúng!" }, { status: 400 });
      }
    }

    // 6. Cập nhật ip_logged (không trùng, tối đa 20) và ua_logged (không trùng, tối đa 20)
    let ip_logged = Array.isArray(userProfile.ip_logged) ? [...userProfile.ip_logged] : [];
    let ua_logged = Array.isArray(userProfile.ua_logged) ? [...userProfile.ua_logged] : [];
    if (ip && !ip_logged.includes(ip)) {
      ip_logged.unshift(ip);
      if (ip_logged.length > 20) ip_logged = ip_logged.slice(0, 20);
    }
    if (ua && !ua_logged.includes(ua)) {
      ua_logged.unshift(ua);
      if (ua_logged.length > 20) ua_logged = ua_logged.slice(0, 20);
    }
    userProfile.ip_logged = ip_logged;
    userProfile.ua_logged = ua_logged;
    // Lưu lại
    await env.KHOAI_KV_USER.put(userKey, JSON.stringify(userProfile));

    // 7. TẠO COOKIE, PROFILE_COOKIE
    const cookie = randomBase62(60);
    const cookieSalt = randomBase62(20);
    const token = userProfile.token || (await sha256(randomBase62(60) + salt));
    // Cookie xác thực KV
    await env.KHOAI_KV_COOKIE.put(
      `KHOAI__cookie__salt:${userProfile.username}`,
      JSON.stringify({ salt: cookieSalt, time: now })
    );
    await env.KHOAI_KV_COOKIE.put(
      `KHOAI__cookie__user:${userProfile.username}:${await sha256(cookie + cookieSalt)}`,
      JSON.stringify({
        user: userProfile.username,
        open_ip: userProfile.open_ip ?? "off",
        ip: [],
        au: await sha256(ua + cookieSalt),
        time: now,
      }),
      { expirationTtl: 7 * 24 * 3600 }
    );

    // profile_cookie = sha256(username + email + UA + salt_profile + cookie)
    const salt_profile = env.SALT_PROFILE;
    const profile_cookie = await sha256(
      userProfile.username + userProfile.email + ua + salt_profile + cookie
    );

    // 8. Set-Cookie trả về cho client
    return new Response(
      JSON.stringify({
        success: true,
        message: "Đăng nhập thành công!",
        redirect: "/overview",
        username: userProfile.username,
        email: userProfile.email,
        id: userProfile.id,
        fullname: userProfile.fullname,
        coin: userProfile.coin,
        token,
        cookie,
        profile_cookie
      }),
      {
        headers: {
          "Set-Cookie": [
            `cookie=${cookie}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`,
            `profile_cookie=${profile_cookie}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`
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
