import { sha256 } from "./hash";

export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    // Lấy cookie và UA
    const cookies = parseCookies(request.headers.get("Cookie") || "");
    const cookie = cookies.cookie || "";
    const profile_cookie = cookies.profile_cookie || "";
    const ua = request.headers.get("User-Agent") || "";

    // Bước 1: Kiểm tra hợp lệ profile_cookie trước (signature nhanh)
    const salt_profile_cookie = env.SALT_PROFILE_COOKIE;
    const expected_profile_cookie = await sha256(await sha256(ua) + cookie + salt_profile_cookie);
    if (!profile_cookie || !cookie || profile_cookie !== expected_profile_cookie) {
      return Response.json({ success: false, message: "Chưa đăng nhập hoặc token không hợp lệ!" }, { status: 401 });
    }

    // Bước 2: Xác thực cookie chính
    const salt_cookie = env.SALT_COOKIE;
    const ua_hash = await sha256(ua);
    const cookie_id = await sha256(ua_hash + cookie + salt_cookie);
    // Tìm theo cookie_id
    const kvKey = `KHOAI__cookie:cookie:${cookie_id}`;
    const cookieKV = await env.KHOAI_KV_COOKIE.get(kvKey, "json");
    if (!cookieKV || !cookieKV.user) {
      return Response.json({ success: false, message: "Session hết hạn hoặc không tồn tại!" }, { status: 401 });
    }
    const username = cookieKV.user;

    // Bước 3: Lấy thông tin user từ KV
    const profileKey = `KHOAI__profile:user:${username}`;
    const userProfile = await env.KHOAI_KV_USER.get(profileKey, "json");
    if (!userProfile) {
      return Response.json({ success: false, message: "Không tìm thấy user!" }, { status: 404 });
    }

    // Bước 4: Lấy thông tin token từ KV
    const tokenKey = `KHOAI__token:user:${username}`;
    const userTokens = await env.KHOAI_KV_TOKEN.get(tokenKey, "json") || {};

    // Gom tất cả token có dạng token_*, extend_time_*, auto_renewed_*, status_*
    const allTokens = {};
    Object.keys(userTokens).forEach(k => {
      if (
        k.startsWith("token_") ||
        k.startsWith("extend_time_") ||
        k.startsWith("auto_renewed_") ||
        k.startsWith("status_")
      ) {
        allTokens[k] = userTokens[k];
      }
    });

    // Lấy đúng các field từ profile mới
    const coin = userProfile.coin || {};
    const userData = userProfile.userData || {};

    // Trả về đúng chuẩn, avatar mặc định nếu chưa có
    return Response.json({
      success: true,
      username: username,
      id: userProfile.id,
      full_name: userData.full_name,
      email: userData.user_email,
      available_coin: coin.available_coin,
      loaded_coin: coin.loaded_coin,
      mail_total_save: coin.mail_total_save,
      purchased_mail: coin.purchased_mail,
      status: userProfile.status,
      role: userProfile.role,
      verified_user_email: userData.verified_user_email,
      avatar: userProfile.avatar || "/images/avatar.jpg",
      ...allTokens
    }, { status: 200 });
  } catch (err) {
    return Response.json({ success: false, message: "Lỗi hệ thống!", error: String(err), stack: err?.stack }, { status: 500 });
  }
}

// Helper: Parse cookies thành object {cookie:..., profile_cookie:...}
function parseCookies(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader.split(";")
      .map(part => part.trim().split("="))
      .filter(arr => arr.length === 2)
  );
}
