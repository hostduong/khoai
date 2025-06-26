document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById('formAuthentication');
  const registerBtn = document.getElementById('register-btn');
  const fields = [
    { name: "username", validate: v => !v ? "" : !/^[a-z0-9_.]{6,30}$/.test(v) ? "Tên đăng nhập không hợp lệ (6-30 ký tự, a-z, 0-9, _ .)" : "" },
    { name: "fullname", validate: v => !v ? "" : (v.length < 6 || v.length > 50) ? "Họ và tên phải từ 6-50 ký tự" : "" },
    { name: "email", validate: v => !v ? "" : !/^[^@]+@[^@]+\.[^@]+$/.test(v) ? "Email không hợp lệ!" : "" },
    { name: "password", validate: v => !v ? "" : !/^[a-zA-Z0-9~!@#$%^&*()_+]{8,30}$/.test(v) ? "Mật khẩu không hợp lệ (8-30 ký tự)" : "" },
    { name: "confirm_password", validate: v => !v ? "" : v !== form.password.value ? "Mật khẩu nhập lại không khớp!" : "" },
    { name: "phone", validate: v => !v ? "" : !/^[0-9]{10,15}$/.test(v) ? "Số điện thoại phải không đúng!" : "" },
    { name: "pin", validate: v => !v ? "" : !/^[0-9]{8}$/.test(v) ? "PIN phải đúng 8 số!" : "" }
  ];
  const touched = {};
  fields.forEach(f => touched[f.name] = false);

  // Validate trường riêng lẻ
  function validateField(field) {
    const el = form[field.name];
    const value = el.value.trim();
    const errorMsg = field.validate(value);
    const errEl = document.getElementById("error-" + field.name.replace("_", "-"));
    if (touched[field.name] && value && errorMsg) {
      el.classList.add("is-invalid");
      errEl.innerText = errorMsg;
      return false;
    } else {
      el.classList.remove("is-invalid");
      errEl.innerText = "";
      return true;
    }
  }

  // Bật/tắt nút đăng ký
  function updateRegisterBtn() {
    let valid = true;
    for (const field of fields) {
      if (!form[field.name].value.trim() || field.validate(form[field.name].value.trim())) {
        valid = false;
      }
    }
    if (!form["terms-conditions"].checked) valid = false;
    if (!window.captchaOk) valid = false;
    registerBtn.disabled = !valid;
  }

  // Gắn sự kiện
  fields.forEach(field => {
    form[field.name].addEventListener("input", function () {
      touched[field.name] = true;
      validateField(field);
      updateRegisterBtn();
    });
    form[field.name].addEventListener("blur", function () {
      touched[field.name] = true;
      validateField(field);
      updateRegisterBtn();
    });
  });
  form["terms-conditions"].addEventListener("change", updateRegisterBtn);

  // Captcha Cloudflare Turnstile callback
  window.captchaOk = false;
  window.onCaptchaSuccess = function () {
    window.captchaOk = true;
    updateRegisterBtn();
  };
  window.onCaptchaExpired = function () {
    window.captchaOk = false;
    updateRegisterBtn();
  };

  // Chỉ validate/red field khi user đã nhập
  // Khi submit
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    registerBtn.disabled = true;
    document.getElementById('form-message').innerText = "Đang xử lý...";

    // Gửi AJAX như code cũ của bạn (không thay đổi)
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
        setTimeout(() => window.location.href = '/overview', 2000);
      } else {
        document.getElementById('form-message').innerText = data.message || "Có lỗi xảy ra, thử lại!";
        registerBtn.disabled = false;
        if (window.turnstile && typeof window.turnstile.reset === "function") {
          const widget = document.querySelector(".cf-turnstile");
          if (widget) window.turnstile.reset(widget);
        }
      }
    } catch (err) {
      document.getElementById('form-message').innerText = "Không kết nối được server!";
      registerBtn.disabled = false;
      if (window.turnstile && typeof window.turnstile.reset === "function") {
        const widget = document.querySelector(".cf-turnstile");
        if (widget) window.turnstile.reset(widget);
      }
    }
  });
});
