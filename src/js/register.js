// === Toggle password fields (giữ nguyên nếu đã có) ===
function togglePassword(id) {
  const input = document.getElementById(id);
  input.type = input.type === "password" ? "text" : "password";
}

// === Validate từng trường chỉ khi có value ===
function validateField(field, value) {
  switch (field) {
    case "username":
      if (!value) return ""; // Không lỗi nếu rỗng
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

// === Lắng nghe input để chỉ báo đỏ khi có value và sai ===
["username", "fullname", "email", "password", "confirm_password", "phone", "pin"].forEach(field => {
  const input = document.getElementById(field);
  if (!input) return;
  input.addEventListener("input", function () {
    const error = validateField(field, this.value);
    const feedback = document.getElementById(`error-${field.replace("_", "-")}`);
    if (this.value && error) {
      input.classList.add("is-invalid");
      feedback.textContent = error;
    } else {
      input.classList.remove("is-invalid");
      feedback.textContent = "";
    }
    updateRegisterBtn();
  });
});

// Điều khoản và Captcha
document.getElementById('terms-conditions').addEventListener('change', updateRegisterBtn);
window.captchaOk = false;
window.onCaptchaSuccess = function(token) {
  window.captchaOk = true;
  updateRegisterBtn();
};
window.onCaptchaExpired = function() {
  window.captchaOk = false;
  updateRegisterBtn();
};

// === ĐK chỉ bật khi mọi trường hợp lệ, đủ tích và captcha ===
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

// Submit giữ nguyên, KHÔNG đổi logic submit AJAX của bạn! Nếu chưa có, chèn lại như sau:
document.getElementById('formAuthentication').addEventListener('submit', async function(e) {
  e.preventDefault();
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
      document.getElementById('form-message').innerText = "🎉 Đăng ký thành công!";
      setTimeout(() => window.location.href = '/overview', 1500);
    } else {
      document.getElementById('form-message').innerText = data.message || "Có lỗi xảy ra, thử lại!";
      document.getElementById('register-btn').disabled = false;
      if (window.turnstile && typeof window.turnstile.reset === "function") {
        window.turnstile.reset();
      }
    }
  } catch (err) {
    document.getElementById('form-message').innerText = "Không kết nối được server!";
    document.getElementById('register-btn').disabled = false;
    if (window.turnstile && typeof window.turnstile.reset === "function") {
      window.turnstile.reset();
    }
  }
});

window.addEventListener('DOMContentLoaded', updateRegisterBtn);
