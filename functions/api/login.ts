import { sha256, randomBase62 } from "./hash";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const data = await request.json();
    const now = Math.floor(Date.now() / 1000);
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

    // 2. VALIDATE INPUT
    let { username = "", password = "", pin = "" } = data;
    username = (username || "").trim();
    password = (password || "").trim();

    if (!username || !password) {
      return Response.json({ success: false, message: "Vui lòng nhập đủ thông tin đăng nhập!" });
    }
    if (username.length < 6 || username.length > 100) {
      return Response.json({ success: false, message: "Tên đăng nhập/email không hợp lệ!" });
    }

    // 3. LẤY USERNAME QUA EMAIL (nếu nhập email)
    let realUsername = username;
    let userProfile;
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(username)) {
      const emailKey = `KHOAI__profile__email:${username}`;
      const emailMap = await env.KHOAI_KV_USER.get(emailKey, "json");
      if (!emailMap?.user) return Response.json({ success: false, message: "Tài khoản không tồn tại!" });
      realUsername = emailMap.user;
    }

    // 4. LẤY PROFILE USER
    const userKey = `KHOAI__profile__user:${realUsername}`;
    const userDataRaw = await env.KHOAI_KV_USER.get(userKey);
    if (!userDataRaw) return Response.json({ success: false, message: "Tài khoản không tồn tại!" });
    userProfile = JSON.parse(userDataRaw);

    if (userProfile.status === "lock") {
      return Response.json({ success: false, message: "Tài khoản đã bị khóa! " + (userProfile.ban_reason || "") });
    }

    // 5. KIỂM TRA PASSWORD
    if (!userProfile.salt) return Response.json({ success: false, message: "Tài khoản lỗi dữ liệu." });
    const hashedPass = await sha256(password + userProfile.salt);
    if (userProfile.pass !== hashedPass) {
      return Response.json({ success: false, message: "Mật khẩu không đúng!", field: "password" });
    }

    // 6. YÊU CẦU PIN (nếu bật open_pin)
    if (userProfile.open_pin === "true") {
      if (!pin) {
        // Nếu chưa gửi pin thì yêu cầu client nhập pin
        return Response.json({ success: false, require_pin: true, field: "pin", message: "Tài khoản này yêu cầu nhập mã PIN để đăng nhập." });
      }
      const hashedPin = await sha256(pin + userProfile.salt);
      if (userProfile.pin !== hashedPin) {
        return Response.json({ success: false, message: "Mã PIN không đúng!", field: "pin" });
      }
    }

    // 7. TẠO COOKIE MỚI (và cập nhật profile_token, ip_logged, ua_logged)
    let cookie, cookieSalt;
    try {
      cookie = randomBase62(60);
      cookieSalt = randomBase62(20);
      await env.KHOAI_KV_COOKIE.put(
        `KHOAI__cookie__salt:${realUsername}`,
        JSON.stringify({ salt: cookieSalt, time: now })
      );
      await env.KHOAI_KV_COOKIE.put(
        `KHOAI__cookie__user:${realUsername}:${await sha256(cookie + cookieSalt)}`,
        JSON.stringify({
          user: realUsername,
          open_ip: userProfile.open_ip || "off",
          ip: [],
          au: await sha256(ua + cookieSalt),
          time: now,
        }),
        { expirationTtl: 7 * 24 * 3600 }
      );
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: "Lỗi khi tạo cookie!", error: String(err), stack: err?.stack }), { status: 500 });
    }

    // 8. TẠO PROFILE TOKEN
    let profileToken = "";
    try {
      const salt_profile = env.SALT_PROFILE;
      profileToken = await sha256(realUsername + userProfile.email + ua + salt_profile + cookie);
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: "Lỗi khi tạo profileToken!", error: String(err), stack: err?.stack }), { status: 500 });
    }

    // 9. CẬP NHẬT IP/UA
    let ip_logged = Array.isArray(userProfile.ip_logged) ? userProfile.ip_logged.filter(x => !!x) : [];
    let ua_logged = Array.isArray(userProfile.ua_logged) ? userProfile.ua_logged.filter(x => !!x) : [];
    // Thêm mới lên đầu, không trùng, tối đa 20 phần tử
    if (ip && !ip_logged.includes(ip)) ip_logged.unshift(ip);
    if (ip_logged.length > 20) ip_logged = ip_logged.slice(0, 20);
    if (ua && !ua_logged.includes(ua)) ua_logged.unshift(ua);
    if (ua_logged.length > 20) ua_logged = ua_logged.slice(0, 20);

    // 10. LƯU LẠI PROFILE VỚI IP/UA
    userProfile.ip_logged = ip_logged;
    userProfile.ua_logged = ua_logged;
    await env.KHOAI_KV_USER.put(userKey, JSON.stringify(userProfile));

    // 11. TRẢ VỀ CHO CLIENT (set-cookie và các trường đã thống nhất)
    return new Response(
      JSON.stringify({
        success: true,
        message: "Đăng nhập thành công!",
        username: realUsername,
        id: userProfile.id,
        fullname: userProfile.fullname,
        coin: userProfile.coin || 0,
        email: userProfile.email,
        token: userProfile.token,
        profile_token: profileToken,
        cookie
      }),
      {
        headers: {
          "Set-Cookie": `cookie=${cookie}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 3600}`,
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
