// --- Touched state cho từng field ---
const touched = {};
const fields = [
  "username", "fullname", "email", "password", "confirm_password", "phone", "pin"
];

// Gắn sự kiện blur & input để chỉ show lỗi khi user đã từng nhập/truy cập
fields.forEach(field => {
  const el = document.getElementById(field);
  if (!el) return;
  el.addEventListener("blur", () => {
    touched[field] = true;
    validateField(field);
  });
  el.addEventListener("input", () => {
    if (touched[field]) validateField(field);
  });
});

function validateField(field) {
  const el = document.getElementById(field);
  const val = el.value.trim();
  let error = "";
  switch (field) {
    case "username":
      if (!/^[a-z0-9_.]{6,30}$/.test(val))
        error = "Tên đăng nhập không hợp lệ (6-30 ký tự, a-z, 0-9, _ .)";
      break;
    case "fullname":
      if (val.length < 6 || val.length > 50)
        error = "Họ và tên phải 6-50 ký tự";
      break;
    case "email":
      if (!/^[^@]+@[^@]+\.[^@]+$/.test(val))
        error = "Email không hợp lệ!";
      break;
    case "password":
      if (!/^[a-zA-Z0-9~!@#$%^&*()_+]{8,30}$/.test(val))
        error = "Mật khẩu không hợp lệ (8-30 ký tự)";
      break;
    case "confirm_password":
      if (val !== document.getElementById('password').value)
        error = "Mật khẩu nhập lại không khớp!";
      break;
    case "phone":
      if (!/^[0-9]{10,15}$/.test(val))
        error = "Số điện thoại phải 10-15 số!";
      break;
    case "pin":
      if (!/^[0-9]{8}$/.test(val))
        error = "PIN phải đúng 8 số!";
      break;
  }
  setError(field, error);
}

function setError(field, error) {
  const el = document.getElementById(field);
  const errorEl = document.getElementById("error-" + field);
  if (!el || !errorEl) return;
  if (error) {
    el.classList.add("is-invalid");
    errorEl.innerText = error;
    errorEl.style.display = "";
  } else {
    el.classList.remove("is-invalid");
    errorEl.innerText = "";
    errorEl.style.display = "none";
  }
}

// --- Reset Captcha ---
function resetCaptcha() {
  if (window.turnstile && typeof window.turnstile.reset === "function") {
    const widget = document.querySelector(".cf-turnstile");
    if (widget) window.turnstile.reset(widget);
  }
}

// --- Submit Form ---
document.getElementById('formAuthentication').addEventListener('submit', async function(e) {
  e.preventDefault();

  // Validate all, show lỗi nếu có
  let hasError = false;
  fields.forEach(field => {
    touched[field] = true;
    validateField(field);
    const el = document.getElementById(field);
    if (el && el.classList.contains('is-invalid')) hasError = true;
  });
  if (hasError) return;

  document.getElementById('register-btn').disabled = true;
  document.getElementById('form-message').innerText = "Đang xử lý...";

  // Lấy token captcha
  const captchaToken = document.querySelector('.cf-turnstile input[name="cf-turnstile-response"]')?.value || "";

  const form = e.target;
  const body = {
    username: form.username.value.trim(),
    fullname: form.fullname.value.trim(),
    email: form.email.value.trim(),
    password: form.password.value,
    confirm_password: form.confirm_password.value,
    phone: form.phone.value.trim(),
    pin: form.pin.value.trim(),
    "cf-turnstile-response": captchaToken
  };

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('form-message').innerText = "🎉 Đăng ký thành công! Đang chuyển hướng...";
      setTimeout(() => window.location.href = '/overview', 1200);
    } else {
      document.getElementById('form-message').innerText = data.message || "Có lỗi xảy ra, thử lại!";
      // Nếu lỗi field cụ thể từ backend, highlight field luôn
      fields.forEach(f => {
        if (data.message && data.message.toLowerCase().includes(f)) setError(f, data.message);
      });
      document.getElementById('register-btn').disabled = false;
      resetCaptcha();
    }
  } catch (err) {
    document.getElementById('form-message').innerText = "Không kết nối được server!";
    document.getElementById('register-btn').disabled = false;
    resetCaptcha();
  }
});

// --- Toggle password visibility ---
function togglePassword(id) {
  var input = document.getElementById(id);
  input.type = input.type === "password" ? "text" : "password";
}

// Nếu muốn reset captcha khi reload:
window.addEventListener('DOMContentLoaded', resetCaptcha);
