// Đảm bảo đã nhúng file này vào dưới cùng trước </body>
// <script src="/js/register.js"></script>

document.addEventListener("DOMContentLoaded", function () {
  // List các trường
  const fields = [
    "username",
    "fullname",
    "email",
    "password",
    "confirm_password",
    "phone",
    "pin"
  ];
  const form = document.getElementById('formAuthentication');
  const registerBtn = document.getElementById('register-btn');

  // Xử lý validate từng trường
  function validateField(field, value) {
    if (!value) return ""; // Không nhập thì không báo lỗi

    if (field === "username" && !/^[a-z0-9_.]{6,30}$/.test(value))
      return "Tên đăng nhập không hợp lệ (6-30 ký tự, a-z, 0-9, _ .)";
    if (field === "fullname" && (value.length < 6 || value.length > 50))
      return "Họ và tên phải từ 6-50 ký tự";
    if (field === "email" && !/^[^@]+@[^@]+\.[^@]+$/.test(value))
      return "Email không hợp lệ!";
    if (field === "password" && !/^[a-zA-Z0-9~!@#$%^&*()_+]{8,30}$/.test(value))
      return "Mật khẩu không hợp lệ (8-30 ký tự)";
    if (field === "confirm_password" && value !== form.password.value)
      return "Mật khẩu nhập lại không khớp!";
    if (field === "phone" && !/^[0-9]{10,15}$/.test(value))
      return "Số điện thoại phải không đúng!";
    if (field === "pin" && !/^[0-9]{8}$/.test(value))
      return "PIN phải đúng 8 số!";
    return "";
  }

  // Cập nhật giao diện lỗi cho 1 trường
  function setError(field, error) {
    const el = form[field];
    const errEl = document.getElementById("error-" + field.replace("_", "-"));
    if (error) {
      el.classList.add("is-invalid");
      errEl.innerText = error;
      errEl.style.display = "block";
    } else {
      el.classList.remove("is-invalid");
      errEl.innerText = "";
      errEl.style.display = "none";
    }
  }

  // Validate tất cả fields, trả về true nếu hợp lệ hết
  function validateAllFields() {
    let valid = true;
    for (const field of fields) {
      const value = form[field].value.trim();
      const error = validateField(field, value);
      setError(field, error);
      if (error) valid = false;
    }
    return valid;
  }

  // Tự động validate khi nhập
  fields.forEach(field => {
    form[field].addEventListener("input", function () {
      const value = form[field].value.trim();
      setError(field, validateField(field, value));
      updateRegisterBtn();
    });
  });

  // Validate lại khi nhập lại mật khẩu hoặc mật khẩu thay đổi
  form["password"].addEventListener("input", function () {
    setError("confirm_password", validateField("confirm_password", form.confirm_password.value));
    updateRegisterBtn();
  });
  form["confirm_password"].addEventListener("input", function () {
    setError("confirm_password", validateField("confirm_password", form.confirm_password.value));
    updateRegisterBtn();
  });

  // --- Xử lý nút Đăng ký enable/disable
  let captchaOk = false;
  window.onCaptchaSuccess = function () {
    captchaOk = true;
    updateRegisterBtn();
  }
  window.onCaptchaExpired = function () {
    captchaOk = false;
    updateRegisterBtn();
  }

  // Check enable/disable Đăng ký
  function updateRegisterBtn() {
    let allValid = true;
    for (const field of fields) {
      const value = form[field].value.trim();
      if (value && validateField(field, value)) allValid = false; // Có lỗi khi nhập
      if (!value) allValid = false; // Thiếu field
    }
    if (!form["terms-conditions"].checked) allValid = false;
    if (!captchaOk) allValid = false;
    registerBtn.disabled = !allValid;
  }

  // Validate lại toàn bộ khi submit
  form.addEventListener("submit", function (e) {
    if (!validateAllFields() || !form["terms-conditions"].checked || !captchaOk) {
      updateRegisterBtn();
      e.preventDefault();
      return false;
    }
    registerBtn.disabled = true;
    document.getElementById('form-message').innerText = "Đang xử lý...";
    // Submit AJAX bạn giữ nguyên như cũ!
  });

  // Khi mới load trang: disable Đăng ký
  updateRegisterBtn();
});
