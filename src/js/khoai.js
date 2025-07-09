fetch('/api/overview', { credentials: 'include' })
  .then(res => res.json())
  .then(data => {
    if (!data.success) {
      window.location.href = "/login";
      return;
    }
    const tokenListDiv = document.getElementById('tokenList');
    tokenListDiv.innerHTML = ""; // Clear old tokens

    // Lọc các trường token_
    Object.keys(data).forEach(key => {
      if (key.startsWith("token_")) {
        let type = key.replace("token_", "");
        let value = data[key] || "";
        if (!value) return;
        let status = data["status_" + type] || "";
        let expire = data["extend_time_" + type] || "";

        // Label cho token (có thể format đẹp hơn nếu muốn)
        let label = "Token " + (type.charAt(0).toUpperCase() + type.slice(1));
        let statusBadge = status
          ? `<span class="badge bg-${status === "live" ? "success" : "danger"} ms-2">${status}</span>` : "";
        let expireText = expire ? `<span class="text-muted ms-2">(HSD: ${expire})</span>` : "";

        tokenListDiv.innerHTML += `
          <div class="card mb-3">
            <form class="card-body">
              <div class="row align-items-end">
                <div class="col-md-8 form-password-toggle">
                  <label class="form-label">${label} ${statusBadge} ${expireText}</label>
                  <div class="input-group input-group-merge">
                    <input type="password" readonly class="form-control" value="${value}" placeholder="············" aria-describedby="api-token-${type}">
                    <span class="input-group-text cursor-pointer" onclick="toggleToken('apiToken${type}', this)">
                      <i class="ti ti-eye-off"></i>
                    </span>
                  </div>
                </div>
                <div class="col-md-4">
                  <button class="btn btn-primary waves-effect waves-light" type="button" onclick="navigator.clipboard.writeText('${value}')">
                    <i class="fa-regular fa-copy"></i> Sao chép
                  </button>
                  <!-- Nếu cần nút Làm mới thì thêm ở đây -->
                </div>
              </div>
            </form>
          </div>
        `;
      }
    });
  });
