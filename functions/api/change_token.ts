import { randomBase62, sha256 } from "./hash";

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    // 1. Xác thực session lấy username (dùng code /api/overview)
    const cookies = parseCookies(request.headers.get("Cookie") || "");
    const cookie = cookies.cookie || "";
    const profile_cookie = cookies.profile_cookie || "";
    const ua = request.headers.get("User-Agent") || "";
    const salt_profile_cookie = env.SALT_PROFILE_COOKIE;
    const expected_profile_cookie = await sha256(await sha256(ua) + cookie + salt_profile_cookie);
    if (!profile_cookie || !cookie || profile_cookie !== expected_profile_cookie) {
      return Response.json({ success: false, message: "Chưa đăng nhập!" }, { status: 401 });
    }
    const salt_cookie = env.SALT_COOKIE;
    const ua_hash = await sha256(ua);
    const cookie_id = await sha256(ua_hash + cookie + salt_cookie);
    const cookieKV = await env.KHOAI_KV_COOKIE.get(`KHOAI__cookie:cookie:${cookie_id}`, "json");
    if (!cookieKV?.user) return Response.json({ success: false, message: "Session hết hạn!" }, { status: 401 });
    const username = cookieKV.user;

    // 2. Lấy type từ query (mặc định là master)
    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "master";

    // 3. Lấy key user
    const userTokenKey = `KHOAI__token:user:${username}`;
    const userTokens = await env.KHOAI_KV_TOKEN.get(userTokenKey, "json") || {};

    // 4. Lấy token cũ
    const oldToken = userTokens[`token_${type}`];

    // 5. Sinh token mới
    const salt_token = env.SALT_TOKEN;
    const newToken = randomBase62(100);

    // 6. Cập nhật lại userTokens
    userTokens[`token_${type}`] = newToken;
    userTokens[`status_${type}`] = "live";
    // Nếu là token dịch vụ thì cần update thêm hạn dùng, etc...

    await env.KHOAI_KV_TOKEN.put(userTokenKey, JSON.stringify(userTokens, null, 2));

    // 7. Ghi lại các key KV mới
    await env.KHOAI_KV_TOKEN.put(
      `KHOAI__token:token:${newToken}`,
      JSON.stringify({ type, user: username })
    );
    await env.KHOAI_KV_TOKEN.put(
      `KHOAI__token:${type}:${await sha256(newToken + salt_token)}`,
      JSON.stringify({
        title: `Token ${type}`,
        status: "live",
        type: type,
        user: username,
        note: "Làm mới token",
        rate_limit: 0,
        rate_window: "minute",
        time: Math.floor(Date.now() / 1000)
      })
    );

    // 8. Xóa token cũ nếu có
    if (oldToken) {
      await env.KHOAI_KV_TOKEN.delete(`KHOAI__token:token:${oldToken}`);
      await env.KHOAI_KV_TOKEN.delete(`KHOAI__token:${type}:${await sha256(oldToken + salt_token)}`);
    }

    // 9. Phản hồi
    return Response.json({ success: true, token: newToken });

  } catch (err) {
    return Response.json({ success: false, message: "Lỗi hệ thống!", error: String(err) }, { status: 500 });
  }
}

function parseCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader.split(";").map(part => part.trim().split("=")).filter(arr => arr.length === 2)
  );
}
