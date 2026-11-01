(function () {
  "use strict";

  const DB = () => window.NDROW_DB;
  const $ = id => document.getElementById(id);
  const money = n => "Rp" + Math.round(Number(n) || 0).toLocaleString("id-ID");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
  const id = () => "nd_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  const toolNames = ["PROSEGRA", "Hutang", "BEP", "Servis", "Rekening", "Pengaturan"];
  let activeTool = "";

  async function setting(key, fallback) {
    const row = await DB().get("settings", key);
    return row && row.value !== undefined ? row.value : fallback;
  }

  async function saveSetting(key, value) {
    return DB().put("settings", { key, value, updatedAt: new Date().toISOString() });
  }

  function page() {
    let el = $("toolsPage");
    if (!el) {
      el = document.createElement("main");
      el.id = "toolsPage";
      el.className = "nd-tools-page";
      el.hidden = true;
      const nav = document.querySelector(".bottom-nav");
      if (nav) nav.before(el);
      else document.body.append(el);
    }
    return el;
  }

  function open(name) {
    if (!toolNames.includes(name)) return;
    activeTool = name;
    document.querySelectorAll("body > main").forEach(el => { el.hidden = true; });
    const p = page();
    p.hidden = false;
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    window.scrollTo(0, 0);
    render().catch(error => {
      console.error("Menu NDROW:", error);
      p.innerHTML = `<p class="nd-tool-error">Menu gagal dibuka. Periksa database lalu coba lagi.</p>`;
    });
  }

  function backButton() {
    return `<button type="button" class="nd-back" data-action="back">‹ Kembali</button>`;
  }

  function shell(title, subtitle, content) {
    page().innerHTML = `
      <header class="nd-tool-heading">
        ${backButton()}
        <p class="eyebrow">NDROW OJOL · PERALATAN DRIVER</p>
        <h1>${esc(title)}</h1>
        <p class="muted">${esc(subtitle)}</p>
      </header>
      <div class="nd-tool-content">${content}</div>`;
  }

  function notice(text, error) {
    const el = $("ndToolNotice");
    if (!el) return;
    el.textContent = text;
    el.className = error ? "nd-tool-error" : "nd-tool-success";
  }

  async function render() {
    const p = page();
    if (activeTool === "PROSEGRA") return renderProsegra();
    if (activeTool === "Hutang") return renderDebts();
    if (activeTool === "BEP") return renderBep();
    if (activeTool === "Servis") return renderServices();
    if (activeTool === "Rekening") return renderAccounts();
    if (activeTool === "Pengaturan") return renderSettings();
    p.innerHTML = "";
  }

  async function renderProsegra() {
    const target = Number(await setting("dailyTarget", 250000)) || 250000;
    const stats = await window.NDROW_TRANSACTIONS.calculate();
    const percent = target > 0 ? Math.min(100, Math.round(stats.income / target * 100)) : 0;
    shell("PROSEGRA", "Rencanakan target penghasilan harian.",
      `<section class="nd-tool-card">
        <span class="muted">Penghasilan hari ini</span>
        <strong class="nd-big-number">${money(stats.income)}</strong>
        <p>Target: ${money(target)}</p>
        <div class="nd-progress"><span style="width:${percent}%"></span></div>
        <p>${percent}% tercapai · Kurang ${money(Math.max(0, target - stats.income))}</p>
      </section>
      <form class="nd-tool-card" id="targetForm">
        <h2>Atur Target Harian</h2>
        <label for="ndTarget">Target penghasilan (Rp)</label>
        <input id="ndTarget" name="target" type="number" min="1" step="1" value="${target}" required>
        <button class="nd-primary" type="submit">Simpan Target</button>
        <p id="ndToolNotice" role="status"></p>
      </form>`);
    $("targetForm").addEventListener("submit", async e => {
      e.preventDefault();
      const n = Number($("ndTarget").value);
      if (!Number.isSafeInteger(n) || n < 1) return notice("Target minimal Rp1.", true);
      await saveSetting("dailyTarget", n);
      await renderProsegra();
      notice("Target harian berhasil disimpan.");
    });
  }

  async function renderDebts() {
    const items = (await DB().getAll("debts") || []).sort((a,b) =>
      String(a.dueDate || "").localeCompare(String(b.dueDate || "")));
    shell("Hutang", "Catat utang dan pembayaran agar sisa kewajiban terpantau.",
      `<form class="nd-tool-card" id="debtForm">
        <h2>Tambah Catatan Utang</h2>
        <label for="debtName">Nama / keterangan</label>
        <input id="debtName" name="name" maxlength="100" required placeholder="Contoh: Cicilan motor">
        <label for="debtAmount">Jumlah utang (Rp)</label>
        <input id="debtAmount" name="amount" type="number" min="1" step="1" required>
        <label for="debtDue">Tanggal jatuh tempo (opsional)</label>
        <input id="debtDue" name="dueDate" type="date">
        <button class="nd-primary" type="submit">Simpan Utang</button>
        <p id="ndToolNotice" role="status"></p>
      </form>
      <section class="nd-tool-card"><h2>Daftar Utang (${items.length})</h2>
      ${items.length ? items.map(x => {
        const remain = Math.max(0, Number(x.amount) - Number(x.paid || 0));
        return `<article class="nd-record">
          <strong>${esc(x.name)}</strong><p>Total ${money(x.amount)} · Terbayar ${money(x.paid || 0)}</p>
          <p class="nd-record-balance">Sisa: ${money(remain)}</p>
          <small>Jatuh tempo: ${esc(x.dueDate || "Belum ditentukan")}</small>
          ${remain > 0 ? `<form data-pay-debt="${esc(x.id)}" class="nd-inline-form">
            <input name="payment" type="number" min="1" max="${remain}" step="1" required placeholder="Nominal pembayaran">
            <button class="nd-primary" type="submit">Bayar</button></form>` : `<p class="nd-tool-success">Lunas</p>`}
          <button class="nd-danger" data-delete-debt="${esc(x.id)}" type="button">Hapus catatan</button>
        </article>`;
      }).join("") : `<p class="muted">Belum ada catatan utang.</p>`}
      </section>`);
    $("debtForm").addEventListener("submit", async e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const amount = Number(f.get("amount"));
      if (!Number.isSafeInteger(amount) || amount < 1) return notice("Nominal utang tidak valid.", true);
      await DB().add("debts", {
        id: id(), name: String(f.get("name")).trim(), amount, paid: 0,
        dueDate: String(f.get("dueDate") || ""), createdAt: new Date().toISOString()
      });
      await renderDebts();
      notice("Catatan utang berhasil disimpan.");
    });
    page().querySelectorAll("[data-pay-debt]").forEach(form => form.addEventListener("submit", async e => {
      e.preventDefault();
      const item = await DB().get("debts", form.dataset.payDebt);
      const amount = Number(new FormData(form).get("payment"));
      if (!item || !Number.isSafeInteger(amount) || amount < 1 ||
          amount > Number(item.amount) - Number(item.paid || 0)) {
        return alert("Nominal pembayaran melebihi sisa utang atau tidak valid.");
      }
      item.paid = Number(item.paid || 0) + amount;
      item.updatedAt = new Date().toISOString();
      await DB().put("debts", item);
      await renderDebts();
    }));
    page().querySelectorAll("[data-delete-debt]").forEach(btn => btn.addEventListener("click", async () => {
      if (confirm("Hapus catatan utang ini?")) {
        await DB().remove("debts", btn.dataset.deleteDebt);
        await renderDebts();
      }
    }));
  }

  async function renderBep() {
    shell("BEP", "Hitung perkiraan jumlah order untuk menutup biaya operasional.",
      `<form class="nd-tool-card" id="bepForm">
        <label for="bepFixed">Biaya tetap (Rp), misalnya cicilan dan biaya bulanan</label>
        <input id="bepFixed" type="number" min="0" step="1" value="0" required>
        <label for="bepVariable">Biaya operasional per order (Rp)</label>
        <input id="bepVariable" type="number" min="0" step="1" value="5000" required>
        <label for="bepIncome">Rata-rata pendapatan bersih per order (Rp)</label>
        <input id="bepIncome" type="number" min="1" step="1" value="20000" required>
        <button class="nd-primary" type="submit">Hitung BEP</button>
      </form>
      <section class="nd-tool-card" id="bepResult" aria-live="polite">
        <h2>Hasil Perhitungan</h2><p>Masukkan biaya lalu tekan Hitung BEP.</p>
      </section>
      <p class="muted">Perkiraan ini menggunakan angka yang Bos masukkan. BEP tercapai saat pendapatan menutup seluruh biaya.</p>`);
    $("bepForm").addEventListener("submit", e => {
      e.preventDefault();
      const fixed = Number($("bepFixed").value);
      const variable = Number($("bepVariable").value);
      const income = Number($("bepIncome").value);
      const result = $("bepResult");
      if (![fixed, variable, income].every(Number.isFinite) || fixed < 0 ||
          variable < 0 || income <= 0) {
        result.innerHTML = `<p class="nd-tool-error">Periksa kembali nominal yang dimasukkan.</p>`;
      } else if (income <= variable) {
        result.innerHTML = `<h2>BEP belum tercapai</h2><p>Pendapatan per order harus lebih besar daripada biaya per order.</p>`;
      } else {
        const orders = Math.ceil(fixed / (income - variable));
        result.innerHTML = `<h2>Perkiraan Titik Impas</h2>
          <strong class="nd-big-number">${orders.toLocaleString("id-ID")} order</strong>
          <p>Margin per order: ${money(income - variable)}</p>
          <p>Perkiraan biaya tetap tertutup setelah ${orders.toLocaleString("id-ID")} order.</p>`;
      }
    });
  }

  async function renderServices() {
    const items = (await DB().getAll("services") || []).sort((a,b) =>
      String(b.date || "").localeCompare(String(a.date || "")));
    shell("Servis", "Jadwalkan perawatan dan simpan biaya servis kendaraan.",
      `<form class="nd-tool-card" id="serviceForm">
        <h2>Catat Servis</h2>
        <label for="serviceName">Jenis perawatan</label>
        <input id="serviceName" name="name" maxlength="100" required placeholder="Contoh: Ganti oli">
        <label for="serviceDate">Tanggal</label>
        <input id="serviceDate" name="date" type="date" required>
        <label for="serviceCost">Biaya (Rp)</label>
        <input id="serviceCost" name="cost" type="number" min="0" step="1" value="0" required>
        <label for="serviceNote">Catatan (opsional)</label>
        <input id="serviceNote" name="note" maxlength="200" placeholder="Contoh: Odometer 20.000 km">
        <button class="nd-primary" type="submit">Simpan Servis</button>
        <p id="ndToolNotice" role="status"></p>
      </form>
      <section class="nd-tool-card"><h2>Riwayat Servis (${items.length})</h2>
      ${items.length ? items.map(x => `<article class="nd-record">
        <strong>${esc(x.name)}</strong><p>${esc(x.date || "Tanggal tidak tersedia")} · ${money(x.cost)}</p>
        ${x.note ? `<small>${esc(x.note)}</small>` : ""}
        <button class="nd-danger" data-delete-service="${esc(x.id)}" type="button">Hapus</button>
      </article>`).join("") : `<p class="muted">Belum ada catatan servis.</p>`}
      </section>`);
    $("serviceDate").value = new Date().toLocaleDateString("en-CA");
    $("serviceForm").addEventListener("submit", async e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const cost = Number(f.get("cost"));
      if (!Number.isSafeInteger(cost) || cost < 0) return notice("Biaya servis tidak valid.", true);
      await DB().add("services", {
        id: id(), name: String(f.get("name")).trim(), date: String(f.get("date")),
        cost, note: String(f.get("note") || "").trim(), createdAt: new Date().toISOString()
      });
      await renderServices();
      notice("Catatan servis berhasil disimpan.");
    });
    page().querySelectorAll("[data-delete-service]").forEach(btn => btn.addEventListener("click", async () => {
      if (confirm("Hapus catatan servis ini?")) {
        await DB().remove("services", btn.dataset.deleteService);
        await renderServices();
      }
    }));
  }

  async function renderAccounts() {
    const accounts = await setting("ndrowAccounts", []);
    const list = Array.isArray(accounts) ? accounts : [];
    shell("Rekening", "Catat saldo tunai, bank, atau dompet digital secara manual.",
      `<form class="nd-tool-card" id="accountForm">
        <h2>Tambah Rekening</h2>
        <label for="accountName">Nama rekening / dompet</label>
        <input id="accountName" name="name" maxlength="80" required placeholder="Contoh: Tunai, BCA, OVO">
        <label for="accountType">Jenis</label>
        <select id="accountType" name="type"><option>Tunai</option><option>Bank</option><option>Dompet digital</option></select>
        <label for="accountBalance">Saldo awal (Rp)</label>
        <input id="accountBalance" name="balance" type="number" min="0" step="1" value="0" required>
        <button class="nd-primary" type="submit">Simpan Rekening</button>
        <p id="ndToolNotice" role="status"></p>
      </form>
      <section class="nd-tool-card"><h2>Daftar Rekening (${list.length})</h2>
      ${list.length ? list.map(a => `<article class="nd-record">
        <strong>${esc(a.name)}</strong><p>${esc(a.type)} · Saldo ${money(a.balance)}</p>
        <form data-account-move="${esc(a.id)}" class="nd-inline-form">
          <select name="operation"><option value="tambah">Tambah saldo</option><option value="ambil">Kurangi saldo</option></select>
          <input name="amount" type="number" min="1" step="1" required placeholder="Nominal Rp">
          <button class="nd-primary" type="submit">Proses</button>
        </form>
        <button class="nd-danger" data-delete-account="${esc(a.id)}" type="button">Hapus rekening</button>
      </article>`).join("") : `<p class="muted">Belum ada rekening yang dicatat.</p>`}
      </section>
      <p class="muted">Saldo di sini dicatat manual dan tidak otomatis mengubah transaksi pemasukan/pengeluaran.</p>`);
    $("accountForm").addEventListener("submit", async e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const balance = Number(f.get("balance"));
      if (!Number.isSafeInteger(balance) || balance < 0) return notice("Saldo awal tidak valid.", true);
      const current = await setting("ndrowAccounts", []);
      current.push({ id: id(), name: String(f.get("name")).trim(), type: String(f.get("type")), balance });
      await saveSetting("ndrowAccounts", current);
      await renderAccounts();
      notice("Rekening berhasil disimpan.");
    });
    page().querySelectorAll("[data-account-move]").forEach(form => form.addEventListener("submit", async e => {
      e.preventDefault();
      const f = new FormData(form);
      const amount = Number(f.get("amount"));
      const accountsNow = await setting("ndrowAccounts", []);
      const account = accountsNow.find(a => a.id === form.dataset.accountMove);
      if (!account || !Number.isSafeInteger(amount) || amount < 1) return alert("Nominal tidak valid.");
      if (f.get("operation") === "ambil" && amount > account.balance) return alert("Saldo tidak mencukupi.");
      account.balance += f.get("operation") === "tambah" ? amount : -amount;
      await saveSetting("ndrowAccounts", accountsNow);
      await renderAccounts();
    }));
    page().querySelectorAll("[data-delete-account]").forEach(btn => btn.addEventListener("click", async () => {
      if (!confirm("Hapus rekening ini dari daftar?")) return;
      const current = await setting("ndrowAccounts", []);
      await saveSetting("ndrowAccounts", current.filter(a => a.id !== btn.dataset.deleteAccount));
      await renderAccounts();
    }));
  }

  async function renderSettings() {
    const target = Number(await setting("dailyTarget", 250000)) || 250000;
    shell("Pengaturan", "Atur target dan buat cadangan data lokal.",
      `<form class="nd-tool-card" id="settingsForm">
        <h2>Target Harian</h2>
        <label for="settingsTarget">Target penghasilan (Rp)</label>
        <input id="settingsTarget" type="number" min="1" step="1" value="${target}" required>
        <button class="nd-primary" type="submit">Simpan Pengaturan</button>
        <p id="ndToolNotice" role="status"></p>
      </form>
      <section class="nd-tool-card">
        <h2>Cadangan Data</h2>
        <p>Unduh salinan transaksi, utang, servis, dan pengaturan ke berkas JSON.</p>
        <button class="nd-primary" id="exportData" type="button">Ekspor Cadangan</button>
      </section>
      <section class="nd-tool-card">
        <h2>Informasi Aplikasi</h2>
        <p>NDROW OJOL 2.0</p>
        <p class="muted">Data tersimpan lokal pada perangkat/browser aplikasi ini.</p>
      </section>`);
    $("settingsForm").addEventListener("submit", async e => {
      e.preventDefault();
      const n = Number($("settingsTarget").value);
      if (!Number.isSafeInteger(n) || n < 1) return notice("Target minimal Rp1.", true);
      await saveSetting("dailyTarget", n);
      notice("Pengaturan berhasil disimpan.");
    });
    $("exportData").addEventListener("click", async () => {
      try {
        const data = {
          app: "NDROW OJOL",
          version: "2.0.0",
          exportedAt: new Date().toISOString(),
          transactions: await DB().getAll("transactions"),
          debts: await DB().getAll("debts"),
          services: await DB().getAll("services"),
          settings: await DB().getAll("settings")
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ndrow-ojol-cadangan-" + new Date().toISOString().slice(0,10) + ".json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error(error);
        alert("Cadangan gagal dibuat.");
      }
    });
  }

  document.addEventListener("click", event => {
    const back = event.target.closest('[data-action="back"]');
    if (back) {
      if (window.NDROW_SHOW_PAGE) window.NDROW_SHOW_PAGE("Beranda");
      else {
        page().hidden = true;
        document.querySelectorAll("body > main").forEach(el => {
          if (el.id !== "toolsPage") el.hidden = el.id !== "historyPage" &&
            el.id !== "analysisPage" && el.id !== "savingsPage";
        });
        const dashboard = document.querySelector("body > main:not(#historyPage):not(#analysisPage):not(#savingsPage):not(#toolsPage)");
        if (dashboard) dashboard.hidden = false;
      }
    }
  });

  window.NDROW_TOOLS = {
    open,
    isToolPage: name => toolNames.includes(name),
    hide: () => { const p = $("toolsPage"); if (p) p.hidden = true; }
  };
})();
