import { sha256, randomBase62 } from "./hash";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const now = Math.floor(Date.now() / 1000);
    const data = await request.json();
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "";
    const ua = request.headers.get("User-Agent") || "";
    const device_name = request.headers.get("Sec-CH-UA-Platform") || "";
    const city = request.cf?.city || "";
    const country = request.cf?.country || request.headers.get("CF-IPCountry") || "VN";

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
        username = emailMap.user;
      }
    }
    if (!userProfile) {
      // Log login failed (user not found)
      const loggerKey = `KHOAI__logger:login:${username}:${now}`;
      const logData = {
        user: username,
        ip: ip,
        ua: ua,
        device_name: device_name,
        location: { city, country },
        success: false,
        fail_reason: "Tài khoản không tồn tại",
        method: "login",
        origin_url: "/api/login",
        time: now
      };
      await env.KHOAI_KV_LOGGER.put(loggerKey, JSON.stringify(logData, null, 2), { expirationTtl: 90 * 24 * 3600 });
      return Response.json({ success: false, message: "Tài khoản không tồn tại!" }, { status: 400 });
    }
    if (userProfile.status === "lock") {
      // Log login failed (account locked)
      const loggerKey = `KHOAI__logger:login:${username}:${now}`;
      const logData = {
        user: username,
        ip: ip,
        ua: ua,
        device_name: device_name,
        location: { city, country },
        success: false,
        fail_reason: "Tài khoản đã bị khóa",
        method: "login",
        origin_url: "/api/login",
        time: now
      };
      await env.KHOAI_KV_LOGGER.put(loggerKey, JSON.stringify(logData, null, 2), { expirationTtl: 90 * 24 * 3600 });
      return Response.json({ success: false, message: "Tài khoản đã bị khóa!" }, { status: 403 });
    }

    // 4. KIỂM TRA PASSWORD (hash với salt_user riêng từng user)
    const salt_user = userProfile.security?.salt_user || "";
    const hashedInputPass = await sha256(password + salt_user);
    if (hashedInputPass !== userProfile.security.user_password) {
      // Log login failed (wrong password)
      const loggerKey = `KHOAI__logger:login:${username}:${now}`;
      const logData = {
        user: username,
        ip: ip,
        ua: ua,
        device_name: device_name,
        location: { city, country },
        success: false,
        fail_reason: "Sai mật khẩu",
        method: "login",
        origin_url: "/api/login",
        time: now
      };
      await env.KHOAI_KV_LOGGER.put(loggerKey, JSON.stringify(logData, null, 2), { expirationTtl: 90 * 24 * 3600 });
      return Response.json({ success: false, message: "Sai mật khẩu!" }, { status: 400 });
    }

    // 5. Nếu bật open_pin thì bắt buộc phải kiểm tra PIN
    if (userProfile.security.open_pin === true) {
      if (!pin || typeof pin !== "string" || !/^[0-9]{8}$/.test(pin)) {
        // Log login failed (missing/wrong pin)
        const loggerKey = `KHOAI__logger:login:${username}:${now}`;
        const logData = {
          user: username,
          ip: ip,
          ua: ua,
          device_name: device_name,
          location: { city, country },
          success: false,
          fail_reason: "PIN không hợp lệ",
          method: "login",
          origin_url: "/api/login",
          time: now
        };
        await env.KHOAI_KV_LOGGER.put(loggerKey, JSON.stringify(logData, null, 2), { expirationTtl: 90 * 24 * 3600 });
        return Response.json({ success: false, message: "Vui lòng nhập đúng mã PIN (8 số)!" }, { status: 400 });
      }
      const hashedPin = await sha256(pin + salt_user);
      if (hashedPin !== userProfile.security.pin) {
        // Log login failed (wrong pin)
        const loggerKey = `KHOAI__logger:login:${username}:${now}`;
        const logData = {
          user: username,
          ip: ip,
          ua: ua,
          device_name: device_name,
          location: { city, country },
          success: false,
          fail_reason: "Mã PIN không đúng",
          method: "login",
          origin_url: "/api/login",
          time: now
        };
        await env.KHOAI_KV_LOGGER.put(loggerKey, JSON.stringify(logData, null, 2), { expirationTtl: 90 * 24 * 3600 });
        return Response.json({ success: false, message: "Mã PIN không đúng!" }, { status: 400 });
      }
    }

    // ======== BỔ SUNG XOÁ SESSION CŨ (logic mới duy nhất bạn yêu cầu) ========
    const salt_cookie = env.SALT_COOKIE;
    const salt_profile_cookie = env.SALT_PROFILE_COOKIE;
    const ua_hash = await sha256(ua);
    const userCookieKey = `KHOAI__cookie:user:${username}:${ua_hash}`;
    // Xoá session cũ (nếu có)
    const oldUserKV = await env.KHOAI_KV_COOKIE.get(userCookieKey, "json");
    if (oldUserKV && oldUserKV.cookie_id) {
      const oldCookieKey = `KHOAI__cookie:cookie:${oldUserKV.cookie_id}`;
      await env.KHOAI_KV_COOKIE.delete(oldCookieKey);
      await env.KHOAI_KV_COOKIE.delete(userCookieKey);
    }

    // 6. TẠO COOKIE, PROFILE_COOKIE (dùng SALT_COOKIE, SALT_PROFILE_COOKIE)
    const cookie = randomBase62(100);
    const cookie_id = await sha256(ua_hash + cookie + salt_cookie);

    await env.KHOAI_KV_COOKIE.put(
      `KHOAI__cookie:cookie:${cookie_id}`,
      JSON.stringify({ user: username, last_seen: now }, null, 2),
      { expirationTtl: 14 * 24 * 3600 }
    );
    await env.KHOAI_KV_COOKIE.put(
      `KHOAI__cookie:user:${username}:${ua_hash}`,
      JSON.stringify({
        cookie_id: cookie_id,
        ua: ua_hash,
        device_name: device_name,
        ip_created: ip,
        country: country,
        city: city,
        login_time: now,
        last_seen: now,
      }, null, 2),
      { expirationTtl: 14 * 24 * 3600 }
    );

    // 7. Tạo profile_cookie chuẩn
    const profile_cookie = await sha256(ua_hash + cookie + salt_profile_cookie);

    // 8. GHI LOG LOGIN THÀNH CÔNG với location thực tế
    const loggerKey = `KHOAI__logger:login:${username}:${now}`;
    const logData = {
      user: username,
      ip: ip,
      ua: ua,
      device_name: device_name,
      location: { city, country },
      success: true,
      fail_reason: "",
      method: "login",
      origin_url: "/api/login",
      time: now
    };
    await env.KHOAI_KV_LOGGER.put(loggerKey, JSON.stringify(logData, null, 2), { expirationTtl: 90 * 24 * 3600 });

    // 9. Set-Cookie trả về cho client
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
