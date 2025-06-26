document.addEventListener("DOMContentLoaded", function () {
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

  // Đánh dấu đã nhập (touched) cho từng trường
  const touched = {};
  fields.forEach(f => touched[f] = false);

  function validateField(field, value) {
    if (!value) return ""; // Không báo lỗi khi chưa nhập!
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

  function setError(field, error) {
    const el = form[field];
    const errEl = document.getElementById("error-" + field.replace("_", "-"));
    if (error && touched[field]) {
      el.classList.add("is-invalid");
      errEl.innerText = error;
      errEl.style.display = "block";
    } else {
      el.classList.remove("is-invalid");
      errEl.innerText = "";
      errEl.style.display = "none";
    }
  }

  // Khi nhập/chạm vào trường thì đánh dấu touched
  fields.forEach(field => {
    form[field].addEventListener("input", function () {
      touched[field] = true;
      const value = form[field].value.trim();
      setError(field, validateField(field, value));
      updateRegisterBtn();
    });
    form[field].addEventListener("blur", function () {
      touched[field] = true;
      const value = form[field].value.trim();
      setError(field, validateField(field, value));
      updateRegisterBtn();
    });
  });

  form["password"].addEventListener("input", function () {
    setError("confirm_password", validateField("confirm_password", form.confirm_password.value));
    updateRegisterBtn();
  });
  form["confirm_password"].addEventListener("input", function () {
    setError("confirm_password", validateField("confirm_password", form.confirm_password.value));
    updateRegisterBtn();
  });

  let captchaOk = false;
  window.onCaptchaSuccess = function () {
    captchaOk = true;
    updateRegisterBtn();
  }
  window.onCaptchaExpired = function () {
    captchaOk = false;
    updateRegisterBtn();
  }

  function updateRegisterBtn() {
    let allValid = true;
    for (const field of fields) {
      const value = form[field].value.trim();
      // Nếu có value nhưng lỗi => không hợp lệ
      if (value && validateField(field, value)) allValid = false;
      // Nếu rỗng => không hợp lệ
      if (!value) allValid = false;
    }
    if (!form["terms-conditions"].checked) allValid = false;
    if (!captchaOk) allValid = false;
    registerBtn.disabled = !allValid;
  }

  // Submit AJAX giữ nguyên như cũ
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!updateRegisterBtn()) return false;

    registerBtn.disabled = true;
    document.getElementById('form-message').innerText = "Đang xử lý...";

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

  updateRegisterBtn();
});
