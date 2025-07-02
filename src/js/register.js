const fields = ["username", "fullname", "email", "password", "confirm_password", "phone", "pin"];
const touched = {};

fields.forEach(f => touched[f] = false);

// Hàm validate các trường
function validateUsername(val) {
  return val.length >= 6 && val.length <= 30 && /^[a-zA-Z0-9_.]+$/.test(val);
}
function validateEmail(val) {
  // Chấp nhận cả chữ hoa/thường
  return val.length >= 6 && val.length <= 100 && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val);
}
function validatePassword(val) {
  // Độ dài 8-30, cấm ' " < > ` và dấu cách, cấm Unicode
  return val.length >= 8 && val.length <= 30
    && !/['"<>\s`]/.test(val)
    && /^[\x21-\x7E]+$/.test(val);
}
function validateName(val) {
  // 6-50 ký tự, không số, không ký tự đặc biệt
  return val.length >= 6 && val.length <= 50 && /^[^0-9!@#$%^&*()_=+\[\]{};:"'<>?/\\|,~`]+$/.test(val);
}
function validatePin(val) {
  return /^[0-9]{8}$/.test(val);
}
const pinInput = document.getElementById('pin');
pinInput.addEventListener('input', function () {
  let value = pinInput.value.replace(/[^0-9]/g, '');
  if (value.length > 8) value = value.slice(0, 8);
  if (pinInput.value !== value) pinInput.value = value;
});

function validatePhone(val) {
  if (!window.phoneInput) return false;
  return phoneInput.isValidNumber();
}

// ✅ Hàm kiểm tra lỗi và show message
function showError(field) {
  const input = document.getElementById(field);
  const feedback = document.getElementById(`error-${field.replace("_", "-")}`);
  if (!input || !feedback) return;
  let error = "";
  const val = input.value || "";

  // FOCUS: chỉ báo lỗi nếu ký tự không cho phép, KHÔNG báo thiếu ký tự
  if (document.activeElement === input) {
    if (field === "username" && val && /[^a-zA-Z0-9_.]/.test(val)) {
      error = "Tên đăng nhập chỉ gồm chữ, số, dấu _ và dấu .";
    }
    else if (field === "fullname" && val && /[0-9!@#$%^&*()_=+\[\]{};:\"'<>?/\\|,~`]/.test(val)) {
      error = "Họ tên không được chứa số hoặc ký tự đặc biệt.";
    }
    else if (field === "email" && val && (/[^a-zA-Z0-9._\-+%@]/.test(val) || /\s/.test(val))) {
      error = "Email chỉ được chứa chữ, số, dấu . _ - + % @, không dấu cách hoặc ký tự lạ.";
    }
    else if (field === "phone" && val && /[^\d+\s]/.test(val)) {
      error = "Số điện thoại chỉ gồm số, +, khoảng trắng.";
    }
    else if (field === "password" && val) {
      if (/['"<>\s`]/.test(val)) {
        error = "Mật khẩu không được chứa ', \", <, >, dấu cách hoặc ký tự lạ.";
      } else if (!/^[\x21-\x7E]+$/.test(val)) {
        error = "Mật khẩu chỉ cho phép ký tự tiếng Anh và ký tự đặc biệt thông dụng.";
      }
    }
    else if (field === "confirm_password" && val) {
      const pw = document.getElementById("password").value;
      if (val !== pw) error = "Mật khẩu nhập lại không khớp!";
    }
    else if (field === "pin" && val && /[^\d]/.test(val)) {
      error = "PIN chỉ gồm 8 chữ số.";
    }
    // Không báo thiếu ký tự khi focus
  }
  // BLUR hoặc đã touched: báo thiếu ký tự hoặc sai ký tự/format
  else if (touched[field]) {
    if (val) {
      if (field === "username") {
        if (val.length < 6 || val.length > 30)
          error = "Tên đăng nhập phải từ 6-30 ký tự.";
        else if (!/^[a-zA-Z0-9_.]+$/.test(val))
          error = "Tên đăng nhập chỉ gồm chữ, số, dấu _ và dấu .";
      }
      else if (field === "fullname") {
        if (val.length < 6 || val.length > 50)
          error = "Họ tên từ 6-50 ký tự, không số, không ký tự đặc biệt.";
        else if (/[0-9!@#$%^&*()_=+\[\]{};:\"'<>?/\\|,~`]/.test(val))
          error = "Họ tên không được chứa số hoặc ký tự đặc biệt.";
      }
      else if (field === "email") {
        if (val.length < 6 || val.length > 100)
          error = "Email phải từ 6-100 ký tự.";
        else if (/[^a-zA-Z0-9._\-+%@]/.test(val) || /\s/.test(val))
          error = "Email chỉ được chứa chữ, số, dấu . _ - + % @, không dấu cách hoặc ký tự lạ.";
        else if (!validateEmail(val))
          error = "Email không hợp lệ.";
      }
      else if (field === "phone") {
        if (/[^\d+\s]/.test(val)) {
          error = "Số điện thoại chỉ gồm số, +, khoảng trắng.";
        }
        else if (!validatePhone(val)) {
          error = "Số điện thoại phải đủ 8–15 số, đúng định dạng quốc tế hoặc Việt Nam.";
        }
      }
      else if (field === "password") {
        if (val.length < 8 || val.length > 30)
          error = "Mật khẩu phải từ 8–30 ký tự.";
        else if (/['"<>\s`]/.test(val) || !/^[\x21-\x7E]+$/.test(val))
          error = "Mật khẩu không được chứa ', \", <, >, dấu cách, emoji hoặc ký tự lạ.";
      }
      else if (field === "confirm_password") {
        const pw = document.getElementById("password").value;
        if (val !== pw)
          error = "Mật khẩu nhập lại không khớp!";
      }
      else if (field === "pin") {
        if (val.length !== 8)
          error = "PIN phải đúng 8 số.";
        else if (/[^\d]/.test(val))
          error = "PIN chỉ gồm các số.";
      }
    }
    // Nếu chưa nhập thì không báo lỗi gì cả
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

// ✅ Cập nhật nút đăng ký
function updateRegisterBtn() {
  let valid = true;
  for (let field of fields) {
    const input = document.getElementById(field);
    if (!input.value) {
      // Không bắt buộc với fullname, phone
      if (field === "fullname" || field === "phone") continue;
      valid = false;
    } else if (field === "username" && !validateUsername(input.value)) valid = false;
    else if (field === "confirm_password") {
      const pw = document.getElementById("password").value;
      if (input.value !== pw) valid = false;
    } else if (field === "email" && !validateEmail(input.value)) valid = false;
    else if (field === "password" && !validatePassword(input.value)) valid = false;
    // Chỉ check nếu field có nhập
    else if (field === "phone" && input.value && !validatePhone(input.value)) valid = false;
    else if (field === "fullname" && input.value && !validateName(input.value)) valid = false;
    else if (field === "pin" && !validatePin(input.value)) valid = false;
    else if (!input.checkValidity()) valid = false;
  }
  if (!document.getElementById('terms-conditions').checked) valid = false;
  if (!window.captchaOk) valid = false;
  document.getElementById('register-btn').disabled = !valid;
}


// Gắn sự kiện
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

// ✅ Xử lý số điện thoại theo quốc gia
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
  utilsScript: window.location.origin + "/js/utils.js"
});
window.phoneInput = phoneInput;

// Hàm lấy mã vùng
function getDialCode() {
  return "+" + phoneInput.getSelectedCountryData().dialCode;
}

// Luôn đảm bảo input bắt đầu bằng mã vùng
input.addEventListener('input', function () {
  let dialCode = getDialCode();
  let value = input.value;

  // Nếu không bắt đầu bằng mã vùng, auto thêm lại
  if (!value.startsWith(dialCode)) {
    value = value.replace(/^\+?\d{1,}/, '');
    value = dialCode + (value.startsWith(' ') ? '' : ' ') + value.replace(/[^0-9 ]/g, '');
  } else {
    let numberPart = value.slice(dialCode.length).replace(/[^0-9 ]/g, '');
    value = dialCode + numberPart;
  }
  // Đảm bảo duy nhất một dấu + đầu
  value = value.replace(/(?!^)\+/g, "");

  // Loại bỏ khoảng trắng thừa ở đầu sau mã vùng
  let afterDial = value.slice(dialCode.length);
  afterDial = afterDial.replace(/^\s+/, '').replace(/ {2,}/g, ' ');
  value = dialCode + afterDial;

  if (input.value !== value) input.value = value;
  validatePhoneField(false);
});

input.addEventListener('countrychange', function () {
  let dialCode = getDialCode();
  if (!input.value.startsWith(dialCode)) {
    input.value = dialCode + ' ';
  }
  validatePhoneField(false);
});

input.addEventListener('blur', function () {
  let dialCode = getDialCode();
  if (!input.value || !input.value.startsWith(dialCode)) {
    input.value = dialCode + ' ';
  }
  validatePhoneField(true);
});

// Hàm validate phone
function validatePhoneField(isBlur = false) {
  const hidden = document.querySelector("#phone_e164");
  let value = input.value;
  let dialCode = getDialCode();

  if (/[^0-9+ ]/.test(value)) {
    input.classList.add("is-invalid");
    input.closest(".iti")?.classList.add("is-invalid");
    document.getElementById("error-phone").textContent = "Số điện thoại chỉ được chứa số và dấu +.";
    if (hidden) hidden.value = "";
    return;
  }

  let justNumber = value.replace(/[+\s]/g, "");
  let regionCode = dialCode.replace(/[+\s]/g, "");
  let numberLength = justNumber.length - regionCode.length;

  if (isBlur) {
    if (numberLength === 0) {
      input.classList.remove("is-invalid");
      input.closest(".iti")?.classList.remove("is-invalid");
      document.getElementById("error-phone").textContent = "";
      if (hidden) hidden.value = "";
    } else if (numberLength < 8) {
      input.classList.add("is-invalid");
      input.closest(".iti")?.classList.add("is-invalid");
      document.getElementById("error-phone").textContent = "Số điện thoại quá ngắn.";
      if (hidden) hidden.value = "";
    } else if (!phoneInput.isValidNumber()) {
      input.classList.add("is-invalid");
      input.closest(".iti")?.classList.add("is-invalid");
      document.getElementById("error-phone").textContent = "Số điện thoại không hợp lệ.";
      if (hidden) hidden.value = "";
    } else {
      input.classList.remove("is-invalid");
      input.closest(".iti")?.classList.remove("is-invalid");
      document.getElementById("error-phone").textContent = "";
      if (hidden) hidden.value = phoneInput.getNumber();
    }
  } else {
    input.classList.remove("is-invalid");
    input.closest(".iti")?.classList.remove("is-invalid");
    document.getElementById("error-phone").textContent = "";
    if (hidden) hidden.value = "";
  }
}
