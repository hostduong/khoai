const fields = ["username", "fullname", "email", "password", "confirm_password", "phone", "pin"];
const touched = {};

// Gán mặc định là false (chưa chạm)
fields.forEach(field => touched[field] = false);

// Hàm validate bằng HTML5, riêng confirm_password check logic
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
  // Chỉ hiển thị đỏ khi đã chạm và có lỗi
  if (touched[field] && error) {
    input.classList.add("is-invalid");
    feedback.textContent = error;
  } else {
    input.classList.remove("is-invalid");
    feedback.textContent = "";
  }
}

// Sự kiện "input" sẽ set touched = true và kiểm tra
fields.forEach(field => {
  const input = document.getElementById(field);
  if (!input) return;
  input.addEventListener("input", function () {
    touched[field] = true;
    showError(field);
    updateRegisterBtn();
  });
});

// Đảm bảo khi focus lần đầu cũng set touched = true (nếu cần)
fields.forEach(field => {
  const input = document.getElementById(field);
  if (!input) return;
  input.addEventListener("blur", function () {
    touched[field] = true;
    showError(field);
  });
});

// Enable/disable nút Đăng ký
function updateRegisterBtn() {
  let valid = true;
  for (let field of fields) {
    const input = document.getElementById(field);
    if (!input.value || (field !== "confirm_password" && !input.checkValidity())) valid = false;
    if (field === "confirm_password") {
      const pw = document.getElementById("password").value;
      if (!input.value || input.value !== pw) valid = false;
    }
  }
  if (!document.getElementById('terms-conditions').checked) valid = false;
  if (!window.captchaOk) valid = false;
  document.getElementById('register-btn').disabled = !valid;
}

// Điều khoản và captcha
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

// Khi load lại trang, xóa hết đỏ
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
