import { sha256, randomBase62 } from "./hash";

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const now = Math.floor(Date.now() / 1000);
    const data = await request.json();
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "";
    const ua = request.headers.get("User-Agent") || "";
    const device_name = request.headers.get("Sec-CH-UA-Platform") || "";
    const country = request.headers.get("CF-IPCountry") || "VN";
    let city = "";
    try {
      const geo = request.cf?.city;
      if (geo && typeof geo === "string") city = geo;
    } catch (e) {
      city = "";
    }

    const language = "vi";

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
    const { username, fullname, email, password, confirm_password, phone, pin } = data;
    if (
      typeof username !== "string" ||
      username.length < 6 || username.length > 30 ||
      !/^[a-zA-Z0-9_.]+$/.test(username)
    ) return Response.json({ success: false, message: "Tên đăng nhập không hợp lệ!" });

    if (
      typeof fullname === "string" &&
      fullname.length > 0 && (
        fullname.length < 6 || fullname.length > 50 ||
        /[0-9!@#$%^&*()_=+\[\]{};:"'<>?/\\|,~`]/.test(fullname)
      )
    ) return Response.json({ success: false, message: "Họ tên không được chứa số hoặc ký tự đặc biệt, độ dài 6–50 ký tự!" });

    if (
      typeof email !== "string" ||
      email.length < 6 || email.length > 100 ||
      !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
    ) return Response.json({ success: false, message: "Email không hợp lệ!" });

    if (
      typeof password !== "string" ||
      password.length < 8 || password.length > 30 ||
      /['"<>\s`]/.test(password) ||
      !/^[\x21-\x7E]+$/.test(password)
    ) return Response.json({ success: false, message: "Mật khẩu không hợp lệ!" });

    if (password !== confirm_password)
      return Response.json({ success: false, message: "Mật khẩu nhập lại không khớp!" });

    if (
      typeof pin !== "string" ||
      !/^[0-9]{8}$/.test(pin)
    ) return Response.json({ success: false, message: "PIN phải đúng 8 số!" });

    if (
      typeof phone === "string" &&
      phone.trim().length > 0
    ) {
      let value = phone.trim();
      if (/[^\d+\s]/.test(value)) {
        return Response.json({ success: false, message: "Số điện thoại chỉ được chứa số, +, và khoảng trắng!" });
      }
      if (!value.startsWith("+")) {
        return Response.json({ success: false, message: "Số điện thoại phải bắt đầu bằng dấu + (quốc tế)!" });
      }
      let raw = value.replace(/[^\d]/g, "");
      if (raw.length < 8 || raw.length > 15) {
        return Response.json({ success: false, message: "Số điện thoại không hợp lệ, phải từ 8–15 số!" });
      }
    }

    // 3. CHECK EXISTING USER/EMAIL
    let userExists, emailExists, idCounter;
    const userKey = `KHOAI__profile:user:${username}`;
    const emailKey = `KHOAI__profile:email:${email}`;
    const idCounterKey = `KHOAI__profile:number:number`;
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
      await env.KHOAI_KV_USER.put(idCounterKey, JSON.stringify({ number: newId }, null, 2));
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: "Lỗi khi tạo ID mới!", error: String(err), stack: err?.stack }), { status: 500 });
    }

    // 5. SALT_USER riêng biệt cho mỗi user
    const salt_user = randomBase62(50);

    // 6. Hash password và PIN với salt_user riêng
    let hashedPass, hashedPin;
    try {
      hashedPass = await sha256(password + salt_user);
      hashedPin = await sha256(pin + salt_user);
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: "Lỗi khi hash password/pin!", error: String(err), stack: err?.stack }), { status: 500 });
    }

    // 7. Tạo token_master (100 ký tự)
    const token_master = randomBase62(100);

    // 8. TẠO PROFILE USER CHUẨN với salt_user lưu trong security
    const profile = {
      id: newId,
      status: "live",
      role: ["user"],
      ban_reason: "",
      coin: {
        available_coin: 0,
        loaded_coin: 0,
        purchased_mail: 0,
        mail_total_save: 0
      },
      security: {
        open_pin: false,
        pin: hashedPin,
        salt_user: salt_user,
        user_password: hashedPass,
        open_ip: false,
        ip_whitelist: [],
        open_twofa: false,
        twofa_secret: ""
      },
      userData: {
        full_name: fullname,
        phone_number: phone,
        user_email: email,
        birthDate: "",
        verified_user_email: false
      },
      initialRegistrationData: {
        created_at: now,
        ip_created: ip,
        city: city,
        country: country,
        device_name: device_name,
        ua: await sha256(ua),
        language: language
      },
      preferences: {
        theme: "dark",
        language: language
      }
    };

    // 9. GHI PROFILE vào KV (xuống dòng, thụt lề 2 space)
    try {
      await env.KHOAI_KV_USER.put(userKey, JSON.stringify(profile, null, 2));
      await env.KHOAI_KV_USER.put(emailKey, JSON.stringify({ user: username }, null, 2));
      await env.KHOAI_KV_USER.put(`KHOAI__profile:id:${newId}`, JSON.stringify({ user: username }, null, 2));
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: "Lỗi khi ghi profile vào KV!", error: String(err), stack: err?.stack }), { status: 500 });
    }

    // 10. GHI TOKEN API cá nhân (giữ minify cho tiết kiệm dung lượng)
    try {
      await env.KHOAI_KV_TOKEN.put(
        `KHOAI__token:token:${token_master}`,
        JSON.stringify({
          title: "Token cá nhân",
          status: "live",
          type: "master",
          ban_reason: "",
          user: username,
          note: "Tạo tự động sau đăng ký",
          rate_limit: 0,
          rate_window: "minute",
          time: now,
        })
      );
      await env.KHOAI_KV_TOKEN.put(
        `KHOAI__token:user:${username}`,
        JSON.stringify({
          token_master,
        })
      );
    } catch (err) {
      return new Response(JSON.stringify({ success: false, message: "Lỗi khi ghi token vào KV!", error: String(err), stack: err?.stack }), { status: 500 });
    }

    // 11. TẠO COOKIE chuẩn hệ thống (100 ký tự base62)
    const cookie = randomBase62(100);
    const salt_cookie = env.SALT_COOKIE;
    const salt_profile_cookie = env.SALT_PROFILE_COOKIE;
    const ua_hash = await sha256(ua);

    const cookie_id = await sha256(ua_hash + cookie + salt_cookie);

    await env.KHOAI_KV_COOKIE.put(
      `KHOAI__cookie:cookie:${cookie_id}`,
      JSON.stringify({ user: username, last_seen: now }),
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
      }),
      { expirationTtl: 14 * 24 * 3600 }
    );

    // 12. TẠO PROFILE_COOKIE chuẩn
    const profile_cookie = await sha256(ua_hash + cookie + salt_profile_cookie);

    // 13. TRẢ VỀ CHO CLIENT (set-cookie và dữ liệu)
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
