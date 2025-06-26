document.addEventListener("DOMContentLoaded", function () {
  const fields = [
    "username", "fullname", "email", "password",
    "confirm_password", "phone", "pin"
  ];
  const form = document.getElementById('formAuthentication');
  const registerBtn = document.getElementById('register-btn');
  const touched = {};

  // Khởi tạo trạng thái chưa từng nhập
  fields.forEach(f => touched[f] = false);

  // Validate từng trường
  function validateField(field, value) {
    if (!value) return ""; // Không báo lỗi nếu rỗng
    switch (field) {
      case "username":
        if (!/^[a-z0-9_.]{6,30}$/.test(value)) return "Tên đăng nhập không hợp lệ (6-30 ký tự, a-z, 0-9, _ .)";
        break;
      case "fullname":
        if (value.length < 6 || value.length > 50) return "Họ và tên phải từ 6-50 ký tự";
        break;
      case "email":
        if (!/^[^@]+@[^@]+\.[^@]+$/.test(value)) return "Email không hợp lệ!";
        break;
      case "password":
        if (!/^[a-zA-Z0-9~!@#$%^&*()_+]{8,30}$/.test(value)) return "Mật khẩu không hợp lệ (8-30 ký tự)";
        break;
      case "confirm_password":
        if (value !== form.password.value) return "Mật khẩu nhập lại không khớp!";
        break;
      case "phone":
        if (!/^[0-9]{10,15}$/.test(value)) return "Số điện thoại phải không đúng!";
        break;
      case "pin":
        if (!/^[0-9]{8}$/.test(value)) return "PIN phải đúng 8 số!";
        break;
    }
    return "";
  }

  // Set error cho từng trường, chỉ hiện khi đã nhập/touched và value sai
  function setError(field) {
    const el = form[field];
    const errEl = document.getElementById("error-" + field.replace("_", "-"));
    const value = el.value.trim();
    const error = validateField(field, value);

    if (touched[field] && value && error) {
      el.classList.add("is-invalid");
      errEl.innerText = error;
      errEl.style.display = "block";
    } else {
      el.classList.remove("is-invalid");
      errEl.innerText = "";
      errEl.style.display = "none";
    }
  }

  // Gán sự kiện cho tất cả trường
  fields.forEach(field => {
    form[field].addEventListener("input", function () {
      touched[field] = true;
      setError(field);
      if (field === "password" || field === "confirm_password") setError("confirm_password");
      updateRegisterBtn();
    });
    form[field].addEventListener("blur", function () {
      touched[field] = true;
      setError(field);
      if (field === "password" || field === "confirm_password") setError("confirm_password");
      updateRegisterBtn();
    });
  });

  // Captcha callback
  let captchaOk = false;
  window.onCaptchaSuccess = function () {
    captchaOk = true;
    updateRegisterBtn();
  }
  window.onCaptchaExpired = function () {
    captchaOk = false;
    updateRegisterBtn();
  }

  // Chỉ khi tất cả hợp lệ mới enable Đăng ký
  function updateRegisterBtn() {
    let allValid = true;
    for (const field of fields) {
      const value = form[field].value.trim();
      if (!value || validateField(field, value)) allValid = false;
    }
    if (!form["terms-conditions"].checked) allValid = false;
    if (!captchaOk) allValid = false;
    registerBtn.disabled = !allValid;
  }

  // KHÔNG tự động hiện lỗi khi vừa load
  updateRegisterBtn();

  // --- Submit AJAX giữ nguyên như cũ ---
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    registerBtn.disabled = true;
    document.getElementById('form-message').innerText = "Đang xử lý...";

    // Lấy token captcha
    const captchaToken = document.querySelector('.cf-turnstile input[name="cf-turnstile-response"]')?.value || "";

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
        registerBtn.disabled = false;
      }
    } catch (err) {
      document.getElementById('form-message').innerText = "Không kết nối được server!";
      registerBtn.disabled = false;
    }
  });
});
