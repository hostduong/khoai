const fields = ["username", "password", "pin"];
const touched = {};
fields.forEach(f => touched[f] = false);

// ===== Validate các trường =====
function validateUsername(val) {
  // Email hoặc username (không bắt buộc chỉ a-z thường), chấp nhận chữ hoa, số, dấu ._@+-
  return (
    typeof val === "string" &&
    val.length >= 6 &&
    val.length <= 100 &&
    /^[a-zA-Z0-9@._+-]+$/.test(val)
  );
}

function validatePassword(val) {
  // Độ dài 8-30, cấm ' " < > ` và dấu cách, chỉ ký tự ASCII printable
  return (
    typeof val === "string" &&
    val.length >= 8 &&
    val.length <= 30 &&
    !/['"<>\s`]/.test(val) &&
    /^[\x21-\x7E]+$/.test(val)
  );
}

function validatePin(val) {
  return val === "" || /^[0-9]{8}$/.test(val); // Cho phép rỗng hoặc đúng 8 số
}

// ===== Show lỗi chi tiết =====
function showError(field) {
  const input = document.getElementById(field);
  const feedback = document.getElementById(`error-${field}`);
  if (!input || !feedback) return;
  let error = "";
  const val = input.value || "";

  // Focus: chỉ báo lỗi sai ký tự
  if (document.activeElement === input) {
    if (field === "username" && val && /[^a-zA-Z0-9@._+-]/.test(val)) {
      error = "Tên đăng nhập hoặc email chỉ được chứa chữ, số, @, . _ + -";
    } else if (field === "password" && val) {
      if (/['"<>\s`]/.test(val)) {
        error = "Mật khẩu không được chứa ', \", <, >, dấu cách hoặc ký tự lạ.";
      } else if (!/^[\x21-\x7E]+$/.test(val)) {
        error = "Mật khẩu chỉ cho phép ký tự tiếng Anh và ký tự đặc biệt.";
      }
    } else if (field === "pin" && val && /[^\d]/.test(val)) {
      error = "PIN chỉ gồm 8 chữ số.";
    }
  }
  // Blur hoặc đã touched: kiểm tra format/độ dài
  else if (touched[field]) {
    if (val) {
      if (field === "username") {
        if (val.length < 6 || val.length > 100)
          error = "Tên đăng nhập/email phải từ 6-100 ký tự.";
        else if (!/^[a-zA-Z0-9@._+-]+$/.test(val))
          error = "Tên đăng nhập hoặc email chỉ được chứa chữ, số, @, . _ + -";
      }
      else if (field === "password") {
        if (val.length < 8 || val.length > 30)
          error = "Mật khẩu phải từ 8–30 ký tự.";
        else if (/['"<>\s`]/.test(val) || !/^[\x21-\x7E]+$/.test(val))
          error = "Mật khẩu không được chứa ', \", <, >, dấu cách, emoji hoặc ký tự lạ.";
      }
      else if (field === "pin") {
        if (val.length !== 8)
          error = "PIN phải đúng 8 số.";
        else if (/[^\d]/.test(val))
          error = "PIN chỉ gồm các số.";
      }
    }
  }

  // Hiển thị lỗi
  if (error) {
    input.classList.add("is-invalid");
    feedback.textContent = error;
  } else {
    input.classList.remove("is-invalid");
    feedback.textContent = "";
  }
}

// ===== Cập nhật nút đăng nhập =====
function updateLoginBtn() {
  let valid = true;
  const requiredFields = ["username", "password"];
  for (let field of fields) {
    const input = document.getElementById(field);
    if (!input) continue;
    if (!input.value && requiredFields.includes(field)) valid = false;
    else if (field === "username" && input.value && !validateUsername(input.value)) valid = false;
    else if (field === "password" && input.value && !validatePassword(input.value)) valid = false;
    else if (field === "pin" && input.value && !validatePin(input.value)) valid = false;
    else if (!input.checkValidity() && requiredFields.includes(field)) valid = false;
  }
  document.getElementById('login-btn').disabled = !valid;
}

// ====== Remember Me Logic ======
function saveRemember() {
  const username = document.getElementById('username').value || "";
  const password = document.getElementById('password').value || "";
  const remember = document.getElementById('rememberMe').checked;

  // Luôn lưu lại trạng thái checkbox
  localStorage.setItem('remember_checked', remember ? "1" : "0");

  if (remember) {
    localStorage.setItem('remember_user', username);
    localStorage.setItem('remember_pass', password);
    localStorage.setItem('remember_expire', (Date.now() + 7 * 24 * 3600 * 1000).toString());
  } else {
    // Không lưu pass, chỉ giữ lại username/email (không TTL)
    localStorage.setItem('remember_user', username);
    localStorage.removeItem('remember_pass');
    localStorage.removeItem('remember_expire');
  }
}

function tryFillRemembered() {
  const savedUser = localStorage.getItem('remember_user') || "";
  const savedPass = localStorage.getItem('remember_pass') || "";
  const expire = parseInt(localStorage.getItem('remember_expire') || "0", 10);
  const checked = localStorage.getItem('remember_checked') === "1";

  // Nếu có expire và đã hết hạn thì tự xóa luôn
  if (expire && expire < Date.now()) {
    localStorage.removeItem('remember_pass');
    localStorage.removeItem('remember_expire');
    document.getElementById('password').value = "";
    document.getElementById('rememberMe').checked = false;
    // Username vẫn giữ
  } else {
    document.getElementById('username').value = savedUser;
    document.getElementById('rememberMe').checked = checked;
    if (checked && savedPass) {
      document.getElementById('password').value = savedPass;
    }
  }
}

// Sự kiện thay đổi rememberMe hoặc input
document.getElementById('rememberMe').addEventListener('change', saveRemember);
document.getElementById('username').addEventListener('input', saveRemember);
document.getElementById('password').addEventListener('input', saveRemember);

// ====== End Remember Me ======

// ===== Gắn sự kiện validate =====
fields.forEach(field => {
  const input = document.getElementById(field);
  if (!input) return;

  input.addEventListener("input", function () {
    touched[field] = true;
    showError(field);
    updateLoginBtn();
  });

  input.addEventListener("blur", function () {
    touched[field] = true;
    showError(field);
  });
});

// Xử lý PIN: chỉ cho phép nhập số (giống register)
const pinInput = document.getElementById('pin');
if (pinInput) {
  pinInput.addEventListener('input', function () {
    let value = pinInput.value.replace(/[^0-9]/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (pinInput.value !== value) pinInput.value = value;
  });
}

window.addEventListener('DOMContentLoaded', function () {
  tryFillRemembered();

  fields.forEach(field => {
    const input = document.getElementById(field);
    const feedback = document.getElementById(`error-${field}`);
    if (input) input.classList.remove("is-invalid");
    if (feedback) feedback.textContent = "";
    touched[field] = false;
  });
  updateLoginBtn();
});

// Xử lý submit form
window.addEventListener('DOMContentLoaded', function () {
  document.getElementById('login-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    // Đánh dấu touched và show lỗi
    let valid = true;
    const requiredFields = ["username", "password"];
    fields.forEach(field => {
      touched[field] = true;
      showError(field);
      const input = document.getElementById(field);
      if (input && input.classList.contains('is-invalid')) valid = false;
      if (input && !input.value && requiredFields.includes(field)) valid = false;
    });

    if (!valid) {
      updateLoginBtn();
      return;
    }

    // Captcha xử lý nếu có
    const captchaInput = document.querySelector('.cf-turnstile input[name="cf-turnstile-response"]');
    const captchaToken = captchaInput ? captchaInput.value : "";

    const formData = {};
    fields.forEach(field => formData[field] = document.getElementById(field)?.value ?? "");
    formData['cf-turnstile-response'] = captchaToken;

    document.getElementById('login-btn').disabled = true;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('error-username').textContent = "";
        document.getElementById('error-password').textContent = "";
        document.getElementById('error-pin').textContent = "";
        // Lưu Remember Me nếu cần (sau đăng nhập vẫn giữ nếu tích)
        saveRemember();
        setTimeout(() => window.location.href = data.redirect || '/overview', 500);
      } else {
        // Ưu tiên báo lỗi đúng trường
        if (data.field && document.getElementById(`error-${data.field}`)) {
          document.getElementById(`error-${data.field}`).textContent = data.message || "Có lỗi xảy ra!";
        } else {
          document.getElementById('error-username').textContent = "";
          document.getElementById('error-password').textContent = "";
          document.getElementById('error-pin').textContent = "";
          document.getElementById('error-username').textContent = data.message || "Có lỗi xảy ra!";
        }
        document.getElementById('login-btn').disabled = false;
        if (window.turnstile && typeof window.turnstile.reset === "function") {
          window.turnstile.reset();
        }
      }
    } catch (err) {
      document.getElementById('error-username').textContent = "Không kết nối được server!";
      document.getElementById('login-btn').disabled = false;
      if (window.turnstile && typeof window.turnstile.reset === "function") {
        window.turnstile.reset();
      }
    }
  });
});
