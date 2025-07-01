const fields = ["username", "fullname", "email", "password", "confirm_password", "phone", "pin"];
const touched = {};

fields.forEach(f => touched[f] = false);

// Hàm validate các trường
function validateUsername(val) {
  return val.length >= 6 && val.length <= 30 && /^[a-z0-9_.]+$/.test(val);
}
function validateEmail(val) {
  return val.length >= 6 && val.length <= 100 && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val);
}
function validatePassword(val) {
  // 8-30 ký tự, chữ số, các ký tự ~!@#$%^&*()_+.
  return val.length >= 8 && val.length <= 30 && /^[a-zA-Z0-9~!@#$%^&*()_+.]+$/.test(val) && !/[\'\"<>\s]/.test(val);
}
function validateName(val) {
  // 6-50 ký tự, không số, không ký tự đặc biệt
  return val.length >= 6 && val.length <= 50 && /^[^0-9!@#$%^&*()_=+\[\]{};:"'<>?/\\|,~`]+$/.test(val);
}
function validatePin(val) {
  return /^[0-9]{8}$/.test(val);
}
function validatePhone(val) {
  const input = document.querySelector("#phone");
  if (!window.phoneInput) return false;
  return phoneInput.isValidNumber();
}


// Hàm kiểm tra lỗi và show message
function showError(field) {
  const input = document.getElementById(field);
  const feedback = document.getElementById(`error-${field.replace("_", "-")}`);
  if (!input) return;
  let error = "";

  if (input.value) {
    if (field === "username" && !validateUsername(input.value)) {
      error = "Tên đăng nhập chỉ dùng chữ thường, số, _ hoặc . từ 6–30 ký tự";
    } else if (field === "email" && !validateEmail(input.value)) {
      error = "Email không hợp lệ.";
    } else if (field === "password" && !validatePassword(input.value)) {
      error = "Mật khẩu 8–30 ký tự, không khoảng trắng, không ký tự đặc biệt ngoài ~!@#$%^&*()_+.";
    } else if (field === "confirm_password") {
      const pw = document.getElementById("password").value;
      if (input.value !== pw) error = "Mật khẩu nhập lại không khớp!";
    } else if (field === "phone" && !validatePhone(input.value)) {
      error = "Số điện thoại phải đủ 8–15 số.";
    } else if (field === "fullname" && !validateName(input.value)) {
      error = "Họ tên không hợp lệ.";
    } else if (field === "pin" && !validatePin(input.value)) {
      error = "PIN phải đúng 8 số.";
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


// Cập nhật nút đăng ký
function updateRegisterBtn() {
  let valid = true;
  for (let field of fields) {
    const input = document.getElementById(field);
    if (!input.value) valid = false;
    else if (field === "username" && !validateUsername(input.value)) valid = false;
    else if (field === "confirm_password") {
      const pw = document.getElementById("password").value;
      if (input.value !== pw) valid = false;
    } else if (field === "email" && !validateEmail(input.value)) valid = false;
    else if (field === "password" && !validatePassword(input.value)) valid = false;
    else if (field === "phone" && !validatePhone(input.value)) valid = false;
    else if (field === "fullname" && !validateName(input.value)) valid = false;
    else if (field === "pin" && !validatePin(input.value)) valid = false;
    else if (!input.checkValidity()) valid = false;
  }
  if (!document.getElementById('terms-conditions').checked) valid = false;
  if (!window.captchaOk) valid = false;
  document.getElementById('register-btn').disabled = !valid;
}


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

// Xử lý submit form
window.addEventListener('DOMContentLoaded', function() {
  document.getElementById('formAuthentication').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Khi submit, đánh dấu touched tất cả để hiện báo lỗi ngay
    let valid = true;
    fields.forEach(field => {
      touched[field] = true;
      showError(field);
      const input = document.getElementById(field);
      if (input.classList.contains('is-invalid') || !input.value) valid = false;
    });

    if (!valid) {
      updateRegisterBtn();
      return;
    }

    const captchaToken = document.querySelector('.cf-turnstile input[name="cf-turnstile-response"]').value;
    const formData = {};
    fields.forEach(field => formData[field] = document.getElementById(field).value);
    formData['cf-turnstile-response'] = captchaToken;

    document.getElementById('register-btn').disabled = true;

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('form-message').innerText = "🎉 Đăng ký thành công!";
        setTimeout(() => window.location.href = '/overview', 500);
      } else {
        document.getElementById('form-message').innerHTML = `<span style="color:red; font-size:1.3em; font-weight:bold;">❗️ ${data.message || "Có lỗi xảy ra, thử lại!"}</span>`;
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
});

document.getElementById("username").addEventListener("input", function(e) {
  this.value = this.value.toLowerCase();
});
document.getElementById("email").addEventListener("input", function(e) {
  this.value = this.value.toLowerCase();
});


const input = document.querySelector("#phone");
const phoneInput = window.intlTelInput(input, {
  initialCountry: "auto",
  geoIpLookup: function (callback) {
    fetch('https://ipinfo.io/json')
      .then(resp => resp.json())
      .then(resp => callback(resp.country ? resp.country : "vn"))
      .catch(() => callback("vn"));
  },
  nationalMode: false,
  formatOnDisplay: true,
  utilsScript: "{{ domain }}/js/utils.js"
});

window.phoneInput = phoneInput;

// Sau khi geoIpLookup hoàn thành, nếu input rỗng thì điền luôn mã vùng
input.addEventListener('countrychange', function () {
  if (!input.value) {
    const dialCode = phoneInput.getSelectedCountryData().dialCode;
    if (dialCode) input.value = '+' + dialCode + ' ';
  }
});
// Khi khởi tạo, cũng gọi như trên nếu cần:
phoneInput.promise.then(() => {
  if (!input.value) {
    const dialCode = phoneInput.getSelectedCountryData().dialCode;
    if (dialCode) input.value = '+' + dialCode + ' ';
  }
});


input.addEventListener("input", validatePhoneField);
input.addEventListener("blur", validatePhoneField);

function validatePhoneField() {
  const hidden = document.querySelector("#phone_e164");
  if (phoneInput.isValidNumber()) {
    const e164 = phoneInput.getNumber();
    if (hidden) hidden.value = e164;
    input.classList.remove("is-invalid");
    input.closest(".iti")?.classList.remove("is-invalid");
    document.getElementById("error-phone").textContent = "";
  } else {
    if (hidden) hidden.value = "";
    input.classList.add("is-invalid");
    input.closest(".iti")?.classList.add("is-invalid");
    document.getElementById("error-phone").textContent = "Số điện thoại không hợp lệ.";
  }
}
