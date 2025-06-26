// Ghi nhớ các trường đã blur (chạm vào, user tương tác rồi)
const touched = {};
const fields = [
  "username", "fullname", "email", "password", "confirm_password", "phone", "pin"
];

// Theo dõi Captcha và Điều khoản
let captchaOk = false;
let termsOk = false;

// Validate từng field
function validateField(field) {
  const el = document.getElementById(field);
  const val = el.value.trim();
  let error = "";

  // Điều kiện theo từng trường
  switch (field) {
    case "username":
      if (val && !/^[a-z0-9_.]{6,30}$/.test(val))
        error = "Tên đăng nhập không hợp lệ (6-30 ký tự, a-z, 0-9, _ .)";
      break;
    case "fullname":
      if (val && (val.length < 6 || val.length > 50))
        error = "Họ và tên phải 6-50 ký tự";
      break;
    case "email":
      if (val && !/^[^@]+@[^@]+\.[^@]+$/.test(val))
        error = "Email không hợp lệ!";
      break;
    case "password":
      if (val && !/^[a-zA-Z0-9~!@#$%^&*()_+]{8,30}$/.test(val))
        error = "Mật khẩu không hợp lệ (8-30 ký tự)";
      break;
    case "confirm_password":
      if (val && val !== document.getElementById('password').value)
        error = "Mật khẩu nhập lại không khớp!";
      break;
    case "phone":
      if (val && !/^[0-9]{10,15}$/.test(val))
        error = "Số điện thoại phải 10-15 số!";
      break;
    case "pin":
      if (val && !/^[0-9]{8}$/.test(val))
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

// Đánh dấu đã touch khi blur, validate khi nhập (chỉ hiện lỗi khi đã từng tương tác)
fields.forEach(field => {
  const el = document.getElementById(field);
  if (!el) return;
  el.addEventListener("blur", () => {
    touched[field] = true;
    validateField(field);
    updateRegisterBtn();
  });
  el.addEventListener("input", () => {
    if (touched[field]) validateField(field);
    updateRegisterBtn();
  });
});

// Điều khoản
document.getElementById("terms-conditions").addEventListener("change", function() {
  termsOk = this.checked;
  updateRegisterBtn();
});

// Captcha callback cho Turnstile
window.onCaptchaSuccess = function(token) {
  captchaOk = true;
  updateRegisterBtn();
};
window.onCaptchaExpired = function() {
  captchaOk = false;
  updateRegisterBtn();
};

// Hàm kiểm tra toàn bộ form để bật/tắt Đăng ký
function updateRegisterBtn() {
  let valid = true;
  for (const field of fields) {
    const el = document.getElementById(field);
    const val = el.value.trim();
    // Nếu field đã từng blur & có lỗi, hoặc chưa nhập => không cho đăng ký
    if ((touched[field] && el.classList.contains("is-invalid")) || !val) valid = false;
  }
  if (!document.getElementById("terms-conditions").checked) valid = false;
  if (!captchaOk) valid = false;
  document.getElementById("register-btn").disabled = !valid;
}

// Khi submit, validate tất cả (nếu có trường rỗng chưa chạm, báo lỗi)
document.getElementById('formAuthentication').addEventListener('submit', async function(e) {
  e.preventDefault();
  let hasError = false;
  fields.forEach(field => {
    const el = document.getElementById(field);
    const val = el.value.trim();
    touched[field] = true;
    if (!val) {
      setError(field, "Bắt buộc nhập");
      hasError = true;
    } else {
      validateField(field);
      if (el.classList.contains('is-invalid')) hasError = true;
    }
  });
  updateRegisterBtn();
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
      // Nếu backend trả lỗi field cụ thể thì highlight luôn
      fields.forEach(f => {
        if (data.message && data.message.toLowerCase().includes(f)) setError(f, data.message);
      });
      document.getElementById('register-btn').disabled = false;
      if (window.turnstile && typeof window.turnstile.reset === "function") window.turnstile.reset();
    }
  } catch (err) {
    document.getElementById('form-message').innerText = "Không kết nối được server!";
    document.getElementById('register-btn').disabled = false;
    if (window.turnstile && typeof window.turnstile.reset === "function") window.turnstile.reset();
  }
});

// Toggle password
function togglePassword(id) {
  var input = document.getElementById(id);
  input.type = input.type === "password" ? "text" : "password";
}

// Reset captcha khi load lại trang
window.addEventListener('DOMContentLoaded', function() {
  if (window.turnstile && typeof window.turnstile.reset === "function") window.turnstile.reset();
  updateRegisterBtn();
});
