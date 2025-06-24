const regForm = document.getElementById('registerForm');
const regAlert = document.getElementById('regAlert');
regForm.onsubmit = async function(e) {
  e.preventDefault();
  regAlert.classList.add('d-none');
  regAlert.innerText = '';
  const data = {
    fullname: regForm.fullname.value.trim(),
    email: regForm.email.value.trim(),
    password: regForm.password.value,
    phone: regForm.phone.value.trim(),
    pin: regForm.pin.value.trim()
  };
  // Validate frontend
  if(!/^\d{6}$/.test(data.pin)) {
    regAlert.innerText = "Mã PIN phải gồm đúng 6 số.";
    regAlert.classList.remove('d-none');
    return;
  }
  if(data.password.length < 8) {
    regAlert.innerText = "Mật khẩu tối thiểu 8 ký tự.";
    regAlert.classList.remove('d-none');
    return;
  }
  // Gửi API
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if(result.ok) {
      regAlert.classList.remove('alert-danger');
      regAlert.classList.add('alert-success');
      regAlert.innerText = "Tạo tài khoản thành công! Bạn sẽ được chuyển tới trang đăng nhập...";
      regAlert.classList.remove('d-none');
      setTimeout(() => window.location.href = '/login', 2000);
    } else {
      regAlert.innerText = result.message || 'Có lỗi xảy ra, thử lại sau!';
      regAlert.classList.remove('d-none');
      regAlert.classList.add('alert-danger');
    }
  } catch(err) {
    regAlert.innerText = "Không kết nối được máy chủ. Vui lòng thử lại.";
    regAlert.classList.remove('d-none');
  }
}
