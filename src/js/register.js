const fields = ["username", "fullname", "email", "password", "confirm_password", "phone", "pin"];
const touched = {};

fields.forEach(f => touched[f] = false);

// Hàm validate các trường
function validateEmail(val) {
  return val.length <= 500 && /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*$/.test(val);
}
function validatePassword(val) {
  return /^[a-zA-Z0-9!@#$%^&*()\-_\=\+\[\]{};:,.\/?]{8,20}$/.test(val) && !/[\'\"<>;\s]/.test(val);
}
function validatePhone(val) {
  return val === "" || /^\+?\d[\d\s-]{8,16}$/.test(val);
}
function validateName(val) {
  return /^[A-Za-zÀ-ỹà-ỹ\s]+$/u.test(val);
}
function validatePin(val) {
  return /^\d{8}$/.test(val);
}

// Hàm kiểm tra lỗi
function showError(field) {
  const input = document.getElementById(field);
  const feedback = document.getElementById(`error-${field.replace("_", "-")}`);
  if (!input) return;
  let error = "";

  if (input.value) {
    if (field === "confirm_password") {
      const pw = document.getElementById("password").value;
      if (input.value !== pw) error = "Mật khẩu nhập lại không khớp!";
    } else if (field === "email" && !validateEmail(input.value)) {
      error = "Email không hợp lệ.";
    } else if (field === "password" && !validatePassword(input.value)) {
      error = "Mật khẩu không hợp lệ.";
    } else if (field === "phone" && !validatePhone(input.value)) {
      error = "Số điện thoại không hợp lệ.";
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

// Toggle mật khẩu và PIN
window.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.toggle-password, .toggle-pin').forEach(btn => {
    btn.addEventListener('click', function () {
      const input = document.getElementById(this.dataset.target);
      if (input) input.type = (input.type === 'password') ? 'text' : 'password';
    });
  });
});

function togglePassword(id) {
  var input = document.getElementById(id);
  if (!input) return;
  input.type = (input.type === 'password') ? 'text' : 'password';
}

