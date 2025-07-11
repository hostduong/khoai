$(document).ready(function () {
  // Gọi API lấy overview, render lên trang
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

      // Avatar
      if (data.avatar) {
        document.querySelectorAll('.navbar-user-avatar').forEach(img => {
          img.src = data.avatar;
        });
        document.querySelectorAll('.avatar img').forEach(img => {
          img.src = data.avatar;
        });
      }

      // Render danh sách token
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
                <form class="card-body changeApiToken" action="/api/change_token?type=${type}" method="POST" autocomplete="off">
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
                      <button type="submit" class="btn btn-success waves-effect">
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

  // Toggle show/hide token (global để inline gọi được)
  window.toggleToken = function (id, btn) {
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

  // SweetAlert2 + Toastr khi submit form đổi token
  $(document).on('submit', 'form.changeApiToken', function (e) {
    e.preventDefault();
    const $form = $(this);
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
        let btn = $form.find('button[type=submit]');
        btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...');
        $.ajax({
          type: "POST",
          url: $form.attr("action"),
          data: $form.serialize(),
          success: function (data) {
            btn.prop('disabled', false).html('<i class="fa-solid fa-rotate-right"></i> Làm mới Token');
            if (data.success && data.token) {
              $form.find('input[id^="apiToken_"]').val(data.token);
              toastr.success('Làm mới token thành công!');
            } else {
              toastr.error(data.message || 'Có lỗi xảy ra!');
            }
          },
          error: function () {
            btn.prop('disabled', false).html('<i class="fa-solid fa-rotate-right"></i> Làm mới Token');
            toastr.error('Lỗi hệ thống!');
          }
        });
      }
    });
  });
});
