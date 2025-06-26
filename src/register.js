// --- Toggle Password ---
function togglePassword(id) {
  var input = document.getElementById(id);
  input.type = input.type === "password" ? "text" : "password";
}

// --- Validate từng trường ---
function validateField(field) {
  let error = "";
  const value = field.value.trim();
  switch (field.name) {
    case "username":
      if (!/^[a-z0-9_.]{6,30}$/.test(value)) error = "Tên đăng nhập không hợp lệ (6-30 ký tự, a-z, 0-9, _ .)";
      break;
    case "fullname":
      if (value.length < 6 || value.length > 50) error = "Họ và tên phải từ 6-50 ký tự";
      break;
    case "email":
      if (!/^[^@]+@[^@]+\.[^@]+$/.test(value)) error = "Email không hợp lệ!";
      break;
    case "password":
      if (!/^[a-zA-Z0-9~!@#$%^&*()_+]{8,30}$/.test(value)) error = "Mật khẩu không hợp lệ (8-30 ký tự)";
      break;
    case "confirm_password":
      if (value !== document.getElementById("password").value) error = "Mật khẩu nhập lại không khớp!";
      break;
    case "phone":
      if (!/^[0-9]{10,15}$/.test(value)) error = "Số điện thoại phải không đúng!";
      break;
    case "pin":
      if (!/^[0-9]{8}$/.test(value)) error = "PIN phải đúng 8 số!";
      break;
  }
  const errorDiv = document.getElementById("error-" + field.name.replace("_", "-"));
  if (error) {
    field.classList.add("is-invalid");
    if (errorDiv) errorDiv.innerText = error;
  } else {
    field.classList.remove("is-invalid");
    if (errorDiv) errorDiv.innerText = "";
  }
  return !error;
}

// Gán sự kiện validate realtime
document.querySelectorAll("#formAuthentication input").forEach(input => {
  input.addEventListener("input", function() {
    validateField(input);
    updateRegisterBtn();
  });
  input.addEventListener("blur", function() {
    validateField(input);
  });
});

// --- Validate tổng thể để bật/tắt nút đăng ký ---
function updateRegisterBtn() {
  const form = document.getElementById('formAuthentication');
  let valid = true;
  document.querySelectorAll("#formAuthentication input").forEach(input => {
    if (!validateField(input)) valid = false;
  });
  if (!form["terms-conditions"].checked) valid = false;
  if (!window.captchaOk) valid = false;
  document.getElementById('register-btn').disabled = !valid;
}
document.getElementById('formAuthentication').addEventListener('input', updateRegisterBtn);

// --- Captcha & Validate ---
window.captchaOk = false;
function onCaptchaSuccess(token) {
  window.captchaOk = true;
  updateRegisterBtn();
}
function onCaptchaExpired() {
  window.captchaOk = false;
  updateRegisterBtn();
}

// --- Reset captcha sau mỗi submit lỗi ---
function resetCaptcha() {
  if (window.turnstile && typeof window.turnstile.reset === "function") {
    const widget = document.querySelector(".cf-turnstile");
    if (widget) window.turnstile.reset(widget);
  }
}
window.addEventListener('DOMContentLoaded', resetCaptcha);

// --- Xử lý submit AJAX + báo lỗi đúng trường ---
document.getElementById('formAuthentication').addEventListener('submit', async function(e) {
  e.preventDefault();

  // Validate toàn bộ lần cuối
  let valid = true;
  document.querySelectorAll("#formAuthentication input").forEach(input => {
    if (!validateField(input)) valid = false;
  });
  if (!valid) {
    document.getElementById('form-message').innerText = "Vui lòng kiểm tra lại các trường nhập!";
    return;
  }

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
      setTimeout(() => window.location.href = '/overview', 2000);
    } else {
      document.getElementById('form-message').innerText = data.message || "Có lỗi xảy ra, thử lại!";
      document.getElementById('register-btn').disabled = false;
      resetCaptcha();

      // --- Báo lỗi đúng trường nếu có message ---
      const mapMsgToField = {
        "Tên đăng nhập không hợp lệ": "username",
        "Tên đăng nhập đã tồn tại": "username",
        "Họ và tên phải 6-50 ký tự": "fullname",
        "Email không hợp lệ": "email",
        "Email đã tồn tại": "email",
        "Mật khẩu không hợp lệ": "password",
        "Mật khẩu nhập lại không khớp": "confirm_password",
        "Số điện thoại không đúng": "phone",
        "PIN phải đúng 8 số": "pin"
      };
      for (const msg in mapMsgToField) {
        if (data.message && data.message.includes(msg)) {
          const field = document.getElementById(mapMsgToField[msg]);
          if (field) {
            field.classList.add("is-invalid");
            field.focus();
            document.getElementById("error-" + mapMsgToField[msg].replace("_", "-")).innerText = data.message;
          }
          break;
        }
      }
    }
  } catch (err) {
    document.getElementById('form-message').innerText = "Không kết nối được server!";
    document.getElementById('register-btn').disabled = false;
    resetCaptcha();
  }
});
