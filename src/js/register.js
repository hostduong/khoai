// Biến lưu trạng thái đã nhập từng trường
const isTouched = {};
["username", "fullname", "email", "password", "confirm_password", "phone", "pin"].forEach(f => isTouched[f] = false);

// Validate chỉ báo lỗi khi đã nhập giá trị và đã "chạm"
function showErrorField(field, value) {
  const error = validateField(field, value);
  const feedback = document.getElementById(`error-${field.replace("_", "-")}`);
  const input = document.getElementById(field);
  // Chỉ báo đỏ khi đã từng input/chạm và có lỗi
  if (isTouched[field] && value && error) {
    input.classList.add("is-invalid");
    feedback.textContent = error;
  } else {
    input.classList.remove("is-invalid");
    feedback.textContent = "";
  }
}

// Gán sự kiện input cho tất cả trường
["username", "fullname", "email", "password", "confirm_password", "phone", "pin"].forEach(field => {
  const input = document.getElementById(field);
  if (!input) return;
  input.addEventListener("input", function () {
    isTouched[field] = true;
    showErrorField(field, this.value);
    updateRegisterBtn();
  });
});

// Chỉ enable nút Đăng ký nếu tất cả hợp lệ
function updateRegisterBtn() {
  let valid = true;
  ["username", "fullname", "email", "password", "confirm_password", "phone", "pin"].forEach(field => {
    const input = document.getElementById(field);
    const value = input.value;
    const error = validateField(field, value);
    if (!value || error) valid = false;
  });
  if (!document.getElementById('terms-conditions').checked) valid = false;
  if (!window.captchaOk) valid = false;
  document.getElementById('register-btn').disabled = !valid;
}

// Điều khoản và Captcha
document.getElementById('terms-conditions').addEventListener('change', updateRegisterBtn);
window.captchaOk = false;
window.onCaptchaSuccess = function(token) {
  window.captchaOk = true;
  updateRegisterBtn(); // Chỉ enable nút, KHÔNG báo lỗi đỏ!
};
window.onCaptchaExpired = function() {
  window.captchaOk = false;
  updateRegisterBtn();
};

// Validate từng trường riêng biệt (giữ nguyên logic validateField)
function validateField(field, value) {
  switch (field) {
    case "username":
      if (!value) return "";
      if (!/^[a-z0-9_.]{6,30}$/.test(value)) return "Tên đăng nhập không hợp lệ (6-30 ký tự, a-z, 0-9, _ .)";
      return "";
    case "fullname":
      if (!value) return "";
      if (value.length < 6 || value.length > 50) return "Họ và tên phải từ 6-50 ký tự";
      return "";
    case "email":
      if (!value) return "";
      if (!/^[^@]+@[^@]+\.[^@]+$/.test(value)) return "Email không hợp lệ!";
      return "";
    case "password":
      if (!value) return "";
      if (!/^[a-zA-Z0-9~!@#$%^&*()_+]{8,30}$/.test(value)) return "Mật khẩu không hợp lệ (8-30 ký tự)";
      return "";
    case "confirm_password":
      const pw = document.getElementById("password").value;
      if (!value) return "";
      if (value !== pw) return "Mật khẩu nhập lại không khớp!";
      return "";
    case "phone":
      if (!value) return "";
      if (!/^[0-9]{10,15}$/.test(value)) return "Số điện thoại phải không đúng!";
      return "";
    case "pin":
      if (!value) return "";
      if (!/^[0-9]{8}$/.test(value)) return "PIN phải đúng 8 số!";
      return "";
    default:
      return "";
  }
}

// === Submit AJAX giữ nguyên! ===
document.getElementById('formAuthentication').addEventListener('submit', async function(e) {
  e.preventDefault();
  document.getElementById('register-btn').disabled = true;
  document.getElementById('form-message').innerText = "Đang xử lý...";

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
      document.getElementById('form-message').innerText = "🎉 Đăng ký thành công!";
      setTimeout(() => window.location.href = '/overview', 1500);
    } else {
      document.getElementById('form-message').innerText = data.message || "Có lỗi xảy ra, thử lại!";
      document.getElementById('register-btn').disabled = false;
      if (window.turnstile && typeof window.turnstile.reset === "function") window.turnstile.reset();
    }
  } catch (err) {
    document.getElementById('form-message').innerText = "Không kết nối được server!";
    document.getElementById('register-btn').disabled = false;
    if (window.turnstile && typeof window.turnstile.reset === "function") window.turnstile.reset();
  }
});

window.addEventListener('DOMContentLoaded', updateRegisterBtn);
