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

    // 2. VALIDATE INPUT (lược bớt, chỉ kiểm tra username, email, password, pin cơ bản)
    const { username, fullname = "", email, password, confirm_password, phone = "", pin } = data;

    if (
      typeof username !== "string" ||
      username.length < 6 || username.length > 30 ||
      !/^[a-zA-Z0-9_.]+$/.test(username)
    ) {
      return Response.json({ success: false, message: "Tên đăng nhập không hợp lệ!" });
    }
    if (
      typeof email !== "string" ||
      email.length < 6 || email.length > 100 ||
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
    ) {
      return Response.json({ success: false, message: "Email không hợp lệ!" });
    }
    if (
      typeof password !== "string" ||
      password.length < 8 || password.length > 30 ||
      /['"<>\s`]/.test(password) ||
      !/^[\x21-\x7E]+$/.test(password)
    ) {
      return Response.json({ success: false, message: "Mật khẩu không hợp lệ!" });
    }
    if (password !== confirm_password)
      return Response.json({ success: false, message: "Mật khẩu nhập lại không khớp!" });
    if (
      typeof pin !== "string" ||
      !/^[0-9]{8}$/.test(pin)
    ) {
      return Response.json({ success: false, message: "PIN phải đúng 8 số!" });
    }

    // 3. CHECK TỒN TẠI USERNAME/EMAIL
    const userKey = `KHOAI__profile__user:${username}`;
    const emailKey = `KHOAI__profile__email:${email}`;
    const idCounterKey = `KHOAI__profile__number:number`;
    let userExists = await env.KHOAI_KV_USER.get(userKey);
    let emailExists = await env.KHOAI_KV_USER.get(emailKey);
    let idCounter = await env.KHOAI_KV_USER.get(idCounterKey, "json");
    if (userExists) return Response.json({ success: false, message: "Tên đăng nhập đã tồn tại!" });
    if (emailExists) return Response.json({ success: false, message: "Email đã tồn tại!" });

    // 4. CẤP ID MỚI
    let newId = (parseInt(idCounter?.number || "100000") + 1).toString();
    await env.KHOAI_KV_USER.put(idCounterKey, JSON.stringify({ number: newId }));

    // 5. TẠO SALT, HASH PASS/PIN DÙNG SALT_USER
    const salt_user = env.SALT_USER;
    const hashedPass = await sha256(password + salt_user);
    const hashedPin = await sha256(pin + salt_user);

    // 6. TẠO API TOKEN (master)
    const apiToken = randomBase62(100);
    const salt_token = env.SALT_TOKEN;
    const hashedToken = await sha256(apiToken + salt_token);

    // 7. TẠO COOKIE
    const cookie = randomBase62(60);
    const salt_cookie = env.SALT_COOKIE;
    const userAgentHash = await sha256(ua);
    const cookieKey = `KHOAI__cookie:cookie:${await sha256(userAgentHash + cookie + salt_cookie)}`;
    await env.KHOAI_KV_COOKIE.put(cookieKey, JSON.stringify({
      user: username,
      last_seen: now,
      ip,
    }), { expirationTtl: 14 * 24 * 3600 });

    // 8. PROFILE_COOKIE
    const salt_profile_cookie = env.SALT_PROFILE_COOKIE;
    const profile_cookie = await sha256(userAgentHash + cookie + salt_profile_cookie);

    // 9. TẠO PROFILE OBJECT
    const userProfile = {
      id: newId,
      status: "live",
      ban_reason: "",
      role: "user",
      verified_email: "false",
      coin: {
        available_coin: 0,
        loaded_coin: 0,
        purchased_mail: 0
      },
      security: {
        pin: hashedPin,
        open_pin: "false",
        ip_whitelist: [],
        open_ip: "false",
        ip_logged: ip ? [ip] : [],
        ua_logged: ua ? [ua] : []
      },
      userData: {
        user_email: email,
        fullname,
        phone,
        country: "VN",
        language: "vi",
        mail_total_save: 0,
      },
      initialRegistrationData: {
        time: now
      },
      preferences: {},
      master_token: hashedToken,
      username,
    };

    // 10. GHI VÀO KV
    await env.KHOAI_KV_USER.put(userKey, JSON.stringify(userProfile));
    await env.KHOAI_KV_USER.put(emailKey, JSON.stringify({ user: username }));
    await env.KHOAI_KV_USER.put(`KHOAI__profile__id:${newId}`, JSON.stringify({ user: username }));

    // 11. GHI TOKEN MASTER
    await env.KHOAI_KV_TOKEN.put(`KHOAI__token__user:${hashedToken}`, JSON.stringify({ status: "live", ban_reason: "", user: username, time: now }));
    await env.KHOAI_KV_TOKEN.put(`KHOAI__token__salt:${salt_token}`, JSON.stringify({ time: now }));

    // 12. RETURN COOKIE + PROFILE_COOKIE
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
