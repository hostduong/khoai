import { sha256, randomBase62 } from "./hash";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
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
          remoteip: request.headers.get("CF-Connecting-IP") || "",
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
    const { username, fullname, email, password, confirm_password, phone, pin } = data;

    // Username: BẮT BUỘC, 6-30 ký tự, chỉ chữ/số/._, không phân biệt hoa/thường
    if (
      typeof username !== "string" ||
      username.length < 6 || username.length > 30 ||
      !/^[a-zA-Z0-9_.]+$/.test(username)
    ) {
      return Response.json({ success: false, message: "Tên đăng nhập không hợp lệ!" });
    }

    // Họ tên: KHÔNG bắt buộc, nếu có thì phải 6-50 ký tự, không số, không ký tự đặc biệt
    if (
      typeof fullname === "string" &&
      fullname.length > 0 && (
        fullname.length < 6 || fullname.length > 50 ||
        /[0-9!@#$%^&*()_=+\[\]{};:"'<>?/\\|,~`]/.test(fullname)
      )
    ) {
      return Response.json({ success: false, message: "Họ tên không được chứa số hoặc ký tự đặc biệt, độ dài 6–50 ký tự!" });
    }

    // Email: BẮT BUỘC, 6-100 ký tự, regex chuẩn
    if (
      typeof email !== "string" ||
      email.length < 6 || email.length > 100 ||
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
    ) {
      return Response.json({ success: false, message: "Email không hợp lệ!" });
    }

    // Mật khẩu: BẮT BUỘC, 8-30 ký tự, không chứa ', ", <, >, dấu cách, `, chỉ ký tự ASCII 0x21-0x7E
    if (
      typeof password !== "string" ||
      password.length < 8 || password.length > 30 ||
      /['"<>\s`]/.test(password) ||
      !/^[\x21-\x7E]+$/.test(password)
    ) {
      return Response.json({ success: false, message: "Mật khẩu không hợp lệ!" });
    }

    // Nhập lại mật khẩu: BẮT BUỘC, phải trùng password
    if (password !== confirm_password)
      return Response.json({ success: false, message: "Mật khẩu nhập lại không khớp!" });

    // PIN: BẮT BUỘC, đúng 8 số
    if (
      typeof pin !== "string" ||
      !/^[0-9]{8}$/.test(pin)
    ) {
      return Response.json({ success: false, message: "PIN phải đúng 8 số!" });
    }

    // Số điện thoại: KHÔNG bắt buộc, nếu có thì phải đúng mã quốc tế và hợp lệ cơ bản (+..., 8-15 số)
    if (
      typeof phone === "string" &&
      phone.trim().length > 0
    ) {
      // Loại bỏ khoảng trắng, kiểm tra đúng dạng +84..., 8-15 số
      let raw = phone.replace(/\s/g, "");
      if (!/^\+\d{8,15}$/.test(raw)) {
        return Response.json({ success: false, message: "Số điện thoại không hợp lệ!" });
      }
    }

    
    // 3. CHECK TỒN TẠI USERNAME/EMAIL
    let userExists, emailExists, idCounter;
    const userKey = `KHOAI__profile__user:${username}`;
    const emailKey = `KHOAI__profile__email:${email}`;
    const idCounterKey = `KHOAI__profile__number:number`;
    try {
      userExists = await env.KHOAI_KV_USER.get(userKey);
      emailExists = await env.KHOAI_KV_USER.get(emailKey);
      idCounter = await env.KHOAI_KV_USER.get(idCounterKey, "json");
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: "Lỗi khi truy vấn KV!", error: String(err), stack: err?.stack }), { status: 500 });
    }
    if (userExists) return Response.json({ success: false, message: "Tên đăng nhập đã tồn tại!" });
    if (emailExists) return Response.json({ success: false, message: "Email đã tồn tại!" });

    // 4. CẤP ID MỚI (tăng dần)
    let newId;
    try {
      newId = (parseInt(idCounter?.number || "100000") + 1).toString();
      await env.KHOAI_KV_USER.put(idCounterKey, JSON.stringify({ number: newId }));
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: "Lỗi khi tạo ID mới!", error: String(err), stack: err?.stack }), { status: 500 });
    }

    // 5. TẠO SALT, HASH PASS/PIN
    let salt, hashedPass, hashedPin;
    try {
      salt = randomBase62(20);
      hashedPass = await sha256(password + salt);
      hashedPin = await sha256(pin + salt);
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: "Lỗi khi hash password/pin!", error: String(err), stack: err?.stack }), { status: 500 });
    }

    // 6. TẠO TOKEN (API token)
    let apiToken, hashedToken;
    try {
      apiToken = randomBase62(60);
      hashedToken = await sha256(apiToken + salt);
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: "Lỗi khi tạo token!", error: String(err), stack: err?.stack }), { status: 500 });
    }

    // 7. GHI VÀO KV
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
      ip_logged: ip ? [ip] : [],
      ua_logged: ua ? [ua] : [],
      country: "VN",
      language: "vi",
      coin: 0,
      total: 0,
      mail_total_save: 0,
      time: now,
      token: hashedToken,
    };

    try {
      await env.KHOAI_KV_USER.put(userKey, JSON.stringify(userProfile));
      await env.KHOAI_KV_USER.put(`KHOAI__profile__email:${email}`, JSON.stringify({ user: username }));
      await env.KHOAI_KV_USER.put(`KHOAI__profile__id:${newId}`, JSON.stringify({ user: username }));
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: "Lỗi khi ghi profile vào KV!", error: String(err), stack: err?.stack }), { status: 500 });
    }

    // 8. GHI TOKEN API
    try {
      await env.KHOAI_KV_TOKEN.put(
        `KHOAI__token__user:${hashedToken}`,
        JSON.stringify({ status: "live", ban_reason: "", user: username, time: now })
      );
      await env.KHOAI_KV_TOKEN.put(`KHOAI__token__salt:${salt}`, JSON.stringify({ time: now }));
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: "Lỗi khi ghi token vào KV!", error: String(err), stack: err?.stack }), { status: 500 });
    }

    // 9. AUTO LOGIN: TẠO COOKIE
    let cookie, cookieSalt;
    try {
      cookie = randomBase62(60);
      cookieSalt = randomBase62(20);
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
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: "Lỗi khi tạo cookie!", error: String(err), stack: err?.stack }), { status: 500 });
    }

    // 10. TẠO PROFILE TOKEN
    let profileToken;
    try {
      const salt_profile = env.SALT_PROFILE;
      const userAgent = context.request.headers.get("User-Agent") || "";
      profileToken = await sha256(username + email + userAgent + salt_profile + cookie);
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: "Lỗi khi tạo profileToken!", error: String(err), stack: err?.stack }), { status: 500 });
    }

    // 11. TRẢ VỀ CHO CLIENT (set-cookie và dữ liệu)
    return new Response(
      JSON.stringify({
        success: true,
        message: "Đăng ký thành công!",
        redirect: "/overview",
        username,
        id: newId,
        fullname,
        coin: 0,
        email,
        token: apiToken,
        cookie,
        profileToken
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
    // Trả lỗi cuối cùng nếu mọi thứ còn lại fail bất ngờ
    return new Response(
      JSON.stringify({ success: false, message: "Lỗi hệ thống ngoài dự kiến!", error: String(err), stack: err?.stack }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
