const fields = ["username", "fullname", "email", "password", "confirm_password", "phone", "pin"];
const touched = {};

// 1. Đánh dấu đã chạm từng trường
fields.forEach(f => touched[f] = false);

// 2. Hàm check và báo lỗi đỏ đúng chuẩn
function showError(field) {
  const input = document.getElementById(field);
  const feedback = document.getElementById(`error-${field.replace("_", "-")}`);
  if (!input) return;
  let error = "";
  if (input.value) {
    if (field === "confirm_password") {
      const pw = document.getElementById("password").value;
      if (input.value !== pw) error = "Mật khẩu nhập lại không khớp!";
    } else if (!input.checkValidity()) {
      error = input.validationMessage;
    }
  }
  if (touched[field] && error) {
    input.classList.add("is-invalid");
    feedback.textContent = error;
  } else {
    input.classList.remove("is-invalid");
    feedback.textContent = "";
  }
}

// 3. Sự kiện input và blur để set touched và check lỗi
fields.forEach(field => {
  const input = document.getElementById(field);
  if (!input) return;
  input.addEventListener("input", function () {
    touched[field] = true;
    showError(field);
    updateRegisterBtn();
  });
  input.addEventListener("blur", function () {
    touched[field] = true;
    showError(field);
  });
});

// 4. Bật/tắt nút Đăng ký (chỉ bật nếu mọi trường hợp lệ)
function updateRegisterBtn() {
  let valid = true;
  for (let field of fields) {
    const input = document.getElementById(field);
    if (!input.value) valid = false;
    else if (field === "confirm_password") {
      const pw = document.getElementById("password").value;
      if (input.value !== pw) valid = false;
    } else if (!input.checkValidity()) valid = false;
  }
  if (!document.getElementById('terms-conditions').checked) valid = false;
  if (!window.captchaOk) valid = false;
  document.getElementById('register-btn').disabled = !valid;
}

// 5. Sự kiện điều khoản và captcha
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

// 6. Clear hết lỗi khi reload
window.addEventListener('DOMContentLoaded', function() {
  fields.forEach(field => {
    const input = document.getElementById(field);
    const feedback = document.getElementById(`error-${field.replace("_", "-")}`);
    if (input) input.classList.remove("is-invalid");
    if (feedback) feedback.textContent = "";
    touched[field] = false;
  });
  updateRegisterBtn();
});

// 7. Submit AJAX (giữ nguyên, KHÔNG xóa)
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
