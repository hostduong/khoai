fetch('/api/overview', { credentials: 'include' })
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      window.location.href = "/login";
      return;
    }

    // Hiển thị số dư coin và email đã mua
    const coinEl = document.getElementById('overviewCoin');
    if (coinEl) coinEl.innerText = (data.available_coin || 0) + ' coin';

    const mailEl = document.getElementById('overviewMailSave');
    if (mailEl) mailEl.innerText = data.mail_total_save || 0;

    // Hiển thị tên user cho navbar
    document.querySelectorAll('.navbar-user-fullname').forEach(el => {
      el.innerText = data.full_name || data.username || 'User';
    });

    // Đồng bộ avatar cho navbar
    if (data.avatar) {
      document.querySelectorAll('.navbar-user-avatar').forEach(img => {
        img.src = data.avatar;
      });
      document.querySelectorAll('.avatar img').forEach(img => {
        img.src = data.avatar;
      });
    }

    // Hiển thị danh sách token
    const tokenListDiv = document.getElementById('tokenList');
    if (tokenListDiv) {
      tokenListDiv.innerHTML = "";

      Object.keys(data).forEach(key => {
        if (key.startsWith("token_")) {
          let type = key.replace("token_", "");
          let value = data[key] || "";
          if (!value) return;
          let status = data["status_" + type] || "";
          let expire = data["extend_time_" + type] || "";

          let label = "Token " + (type.charAt(0).toUpperCase() + type.slice(1));
          let statusBadge = status
            ? `<span class="badge bg-${status === "live" ? "success" : "danger"} ms-2">${status}</span>` : "";
          let expireText = expire ? `<span class="text-muted ms-2">(HSD: ${expire})</span>` : "";

          tokenListDiv.innerHTML += `
            <div class="card mb-3">
              <form class="card-body" onsubmit="return false;">
                <div class="row align-items-end">
                  <div class="col-md-8 form-password-toggle">
                    <label class="form-label">${label} ${statusBadge} ${expireText}</label>
                    <div class="input-group input-group-merge">
                      <input type="password" readonly class="form-control" value="${value}" id="apiToken_${type}" placeholder="············">
                      <span class="input-group-text cursor-pointer" onclick="window.toggleToken('apiToken_${type}', this)">
                        <i class="ti ti-eye-off"></i>
                      </span>
                    </div>
                  </div>
                  <div class="col-md-4 d-flex gap-2">
                    <button type="button" class="btn btn-primary waves-effect waves-light"
                      onclick="navigator.clipboard.writeText('${value}').then(()=>toastr.success('Đã sao chép token thành công!'))">
                      <i class="fa-regular fa-copy"></i> Sao chép
                    </button>
                    <button type="button"
                      class="btn btn-success waves-effect"
                      data-token-type="${type}"
                      onclick="window.refreshToken(this)">
                      <i class="fa-solid fa-rotate-right"></i> Làm mới Token
                    </button>
                  </div>
                </div>
              </form>
            </div>
          `;
        }
      });
    }
  })
  .catch(err => {
    toastr.error("Lỗi khi tải dữ liệu, vui lòng thử lại!");
    window.location.href = "/login";
  });

// Toggle show/hide token
window.toggleToken = function(id, btn) {
  const input = document.getElementById(id);
  if (!input) return;
  const icon = btn.querySelector('i');
  if (input.type === "password") {
    input.type = "text";
    if (icon) icon.className = "ti ti-eye";
  } else {
    input.type = "password";
    if (icon) icon.className = "ti ti-eye-off";
  }
};

// Làm mới token chuẩn SweetAlert2 + toastr
window.refreshToken = function(btn) {
  const type = btn.getAttribute('data-token-type') || 'master';
  Swal.fire({
    title: 'Xác nhận thay đổi token?',
    text: "Bạn sẽ không thể huỷ sau khi đồng ý!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#27ae60',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Đồng ý',
    cancelButtonText: 'Huỷ'
  }).then((result) => {
    if (result.isConfirmed) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...`;

      fetch(`/api/change_token?type=${type}`, { method: 'POST', credentials: 'include' })
        .then(res => res.json()).then(data => {
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-rotate-right"></i> Làm mới Token`;
          if (data.success && data.token) {
            // Cập nhật giá trị mới ngay
            const input = document.getElementById(`apiToken_${type}`);
            if (input) input.value = data.token;
            toastr.success('Làm mới token thành công!');
          } else {
            toastr.error(data.message || "Có lỗi xảy ra!");
          }
        }).catch(() => {
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-rotate-right"></i> Làm mới Token`;
          toastr.error("Lỗi hệ thống, thử lại sau!");
        });
    }
  });
};
