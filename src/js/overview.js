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

    // Hiển thị tên user cho navbar (CHUẨN)
    document.querySelectorAll('.navbar-user-fullname').forEach(el => {
      el.innerText = data.full_name || data.username || 'User';
    });

    // Đồng bộ avatar cho navbar (avatar mặc định đã xử lý ở backend)
    if (data.avatar) {
      document.querySelectorAll('.navbar-user-avatar').forEach(img => {
        img.src = data.avatar;
      });
      document.querySelectorAll('.avatar img').forEach(img => {
        img.src = data.avatar;
      });
    }

    // Hiển thị token list
    const tokenListDiv = document.getElementById('tokenList');
    if (tokenListDiv) {
      tokenListDiv.innerHTML = ""; // Clear old tokens

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
                      <span class="input-group-text cursor-pointer" onclick="toggleToken('apiToken_${type}', this)">
                        <i class="ti ti-eye-off"></i>
                      </span>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <button class="btn btn-primary waves-effect waves-light" type="button" onclick="navigator.clipboard.writeText('${value}')">
                      <i class="fa-regular fa-copy"></i> Sao chép
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
    alert("Lỗi khi tải dữ liệu, vui lòng thử lại!\n" + err);
    window.location.href = "/login";
  });

// Hàm show/hide token
function toggleToken(id, btn) {
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
}
