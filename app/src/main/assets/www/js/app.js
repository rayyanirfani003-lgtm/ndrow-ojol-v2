(function () {
  "use strict";

  const $ = id => document.getElementById(id);
  let currentType = "pemasukan";
  let selectedTip = 0;

  const money = value => "Rp" + Math.round(value || 0).toLocaleString("id-ID");

  function localDate() {
    const d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function toast(message) {
    const el = $("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove("show"), 2400);
  }

  function updateServices() {
    const platform = $("platform");
    const service = $("service");
    if (!platform || !service) return;

    const choices = platform.value === "inDrive"
      ? ["Motor", "Kurir"]
      : ["GrabBike", "GrabFood", "Grab Express", "GrabMart"];

    const previous = service.value;
    service.replaceChildren();

    choices.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      service.appendChild(option);
    });

    if (choices.includes(previous)) service.value = previous;
  }

  function openModal(type) {
    currentType = type;
    selectedTip = 0;

    const backdrop = $("modalBackdrop");
    if (!backdrop) return;

    $("modalTitle").textContent =
      type === "pemasukan" ? "Catat Pemasukan" : "Catat Pengeluaran";

    $("incomeFields").hidden = type !== "pemasukan";
    $("amount").value = "";
    $("description").value = "";
    $("formError").textContent = "";

    document.querySelectorAll(".tip-button").forEach(button => {
      button.classList.remove("selected");
    });

    updateServices();
    backdrop.hidden = false;
    document.body.classList.add("modal-open");
    setTimeout(() => $("amount").focus(), 100);
  }

  function closeModal() {
    const backdrop = $("modalBackdrop");
    if (backdrop) backdrop.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function closeQuickMenu() {
    const menu = document.querySelector(".quick-menu-backdrop");
    if (menu) menu.remove();
  }

  function openQuickMenu() {
    if (document.querySelector(".quick-menu-backdrop")) return;

    const backdrop = document.createElement("div");
    backdrop.className = "quick-menu-backdrop";
    backdrop.innerHTML = `
      <section class="quick-menu" role="dialog" aria-modal="true"
        aria-label="Tambah transaksi">
        <div class="modal-handle"></div>
        <h2>Mau catat apa, Bos?</h2>
        <p>Pilih jenis transaksi yang ingin dicatat.</p>
        <button type="button" class="quick-choice income-choice">
          <span class="choice-icon choice-grab" aria-hidden="true">Grab</span>
          <span><strong>Pemasukan</strong><small>Order, bonus, dan tip</small></span>
          <span class="choice-arrow">›</span>
        </button>
        <button type="button" class="quick-choice expense-choice">
          <span class="choice-icon choice-wallet" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M4 7a3 3 0 0 1 3-3h12v4H7a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h13V9H7" />
              <path d="M15 12h6v4h-6a2 2 0 0 1 0-4Z" />
              <circle cx="16.5" cy="14" r=".7" />
            </svg>
          </span>
          <span><strong>Pengeluaran</strong><small>Bensin, makan, dan servis</small></span>
          <span class="choice-arrow">›</span>
        </button>
        <button type="button" class="quick-cancel">Batal</button>
      </section>`;

    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) closeQuickMenu();
    });

    backdrop.querySelector(".income-choice").addEventListener("click", () => {
      closeQuickMenu();
      openModal("pemasukan");
    });

    backdrop.querySelector(".expense-choice").addEventListener("click", () => {
      closeQuickMenu();
      openModal("pengeluaran");
    });

    backdrop.querySelector(".quick-cancel").addEventListener("click", closeQuickMenu);
  }

  function renderRecent(items) {
    const list = $("recentList");
    const empty = document.querySelector(".empty-state");

    if (empty) empty.hidden = items.length > 0;
    if (!list) return;

    list.replaceChildren();

    items.slice(0, 8).forEach(item => {
      const row = document.createElement("article");
      row.className = "transaction-row";

      const icon = document.createElement("span");
      icon.className = "transaction-icon " +
        (item.type === "pemasukan" ? "income-symbol" : "expense-symbol");
      icon.textContent = item.type === "pemasukan" ? "+" : "−";

      const details = document.createElement("div");
      details.className = "transaction-details";

      const title = document.createElement("strong");
      title.textContent = item.description || "Transaksi";

      const subtitle = document.createElement("small");
      subtitle.textContent = [
        item.platform,
        item.service,
        item.payment
      ].filter(Boolean).join(" · ") || item.type;

      const amount = document.createElement("strong");
      amount.className = item.type === "pemasukan"
        ? "transaction-income" : "transaction-expense";
      amount.textContent =
        (item.type === "pemasukan" ? "+" : "−") + money(item.amount);

      const content = document.createElement("div");
      content.className = "transaction-content";
      details.append(title, subtitle);
      content.append(details, amount);
      row.append(icon, content);
      list.appendChild(row);
    });
  }

  async function refreshDashboard() {
    try {
      const result = await window.NDROW_TRANSACTIONS.calculate();
      const targetSetting = await window.NDROW_DB.get("settings", "dailyTarget");
      const target = Number(targetSetting?.value) > 0
        ? Number(targetSetting.value) : 250000;
      const income = result.income;
      const expense = result.expense;
      const percent = Math.min(100, Math.round(income / target * 100));

      if ($("todayIncome")) $("todayIncome").textContent = money(income);
      if ($("dailyTargetAmount")) $("dailyTargetAmount").textContent = money(target);
      if ($("targetPercent")) $("targetPercent").textContent = percent + "%";
      if ($("progressFill")) $("progressFill").style.width = percent + "%";
      if ($("targetCaption")) {
        $("targetCaption").textContent =
          money(Math.max(0, target - income)) + " lagi untuk mencapai target";
      }
      if ($("incomeTotal")) $("incomeTotal").textContent = money(income);
      if ($("expenseTotal")) $("expenseTotal").textContent = money(expense);
      if ($("netTotal")) $("netTotal").textContent = money(income - expense);
      if ($("orderTotal")) $("orderTotal").textContent = result.orders;

      const today = localDate();
      const recentToday = result.all.filter(item =>
        (item.localDate || new Date(item.date).toLocaleDateString("sv-SE")) === today
      );

      renderRecent(recentToday);
    } catch (error) {
      console.error("Gagal memuat dashboard:", error);
      toast("Database belum dapat dibuka.");
    }
  }

  async function submitTransaction(event) {
    event.preventDefault();

    const amount = Number($("amount").value);
    const description = $("description").value.trim();
    const error = $("formError");

    if (!Number.isFinite(amount) || amount <= 0) {
      error.textContent = "Masukkan nominal yang benar.";
      return;
    }
    if (!description) {
      error.textContent = "Isi keterangan transaksi dulu, Bos.";
      return;
    }

    const data = {
      type: currentType,
      amount: amount + selectedTip,
      description,
      platform: currentType === "pemasukan" ? $("platform").value : "",
      service: currentType === "pemasukan" ? $("service").value : "",
      payment: currentType === "pemasukan" ? $("payment").value : "",
      tip: selectedTip
    };

    try {
      await window.NDROW_TRANSACTIONS.save(data);
      closeModal();
      await refreshDashboard();
      toast("Transaksi berhasil disimpan!");
    } catch (err) {
      console.error(err);
      error.textContent = "Gagal menyimpan. Coba lagi.";
    }
  }


  let currentPage = "Beranda";
  let currentHistoryFilter = "semua";
  let currentHistoryPeriod = "harian";
  let historyAnchor = new Date();

  function ensureHistoryPage() {
    let page = $("historyPage");
    if (page) return page;

    page = document.createElement("main");
    page.id = "historyPage";
    page.className = "history-page";
    page.hidden = true;
    page.innerHTML = `
      <div class="history-top">
        <p class="eyebrow">NDROW OJOL · CATATAN KEUANGAN</p>
        <h1>Riwayat Transaksi</h1>
        <p class="history-subtitle">Pantau pemasukan dan pengeluaranmu.</p>
      </div>

      <div class="history-period-tabs" role="group" aria-label="Periode riwayat">
        <button type="button" class="history-period active" data-period="harian">Harian</button>
        <button type="button" class="history-period" data-period="bulanan">Bulanan</button>
        <button type="button" class="history-period" data-period="tahunan">Tahunan</button>
      </div>

      <div class="history-period-nav">
        <button type="button" id="historyPrev" aria-label="Periode sebelumnya">‹</button>
        <strong id="historyPeriodLabel">Hari ini</strong>
        <button type="button" id="historyNext" aria-label="Periode berikutnya">›</button>
      </div>

      <section class="history-summary">
        <div class="history-income-card">
          <small>Total Pemasukan</small>
          <strong id="historyIncome">Rp0</strong>
        </div>
        <div class="history-expense-card">
          <small>Total Pengeluaran</small>
          <strong id="historyExpense">Rp0</strong>
        </div>
        <div class="history-net-card">
          <small>Selisih Bersih</small>
          <strong id="historyNet">Rp0</strong>
        </div>
      </section>

      <div class="history-filters" role="group" aria-label="Filter transaksi">
        <button type="button" data-history-filter="semua" class="history-filter active">Semua</button>
        <button type="button" data-history-filter="pemasukan" class="history-filter">Pemasukan</button>
        <button type="button" data-history-filter="pengeluaran" class="history-filter">Pengeluaran</button>
      </div>

      <button type="button" id="openDetailHistory" class="history-detail-button">
        Lihat Rincian Riwayat
      </button>

      <section id="historyList" class="history-list" aria-live="polite"></section>
      <section id="historyEmpty" class="empty-state" hidden>
        <div class="empty-icon">▤</div>
        <strong>Belum ada transaksi</strong>
        <p>Transaksi pada periode ini akan muncul di sini.</p>
      </section>
    `;

    const nav = document.querySelector(".bottom-nav");
    if (nav) nav.before(page);
    else document.body.appendChild(page);

    page.querySelectorAll("[data-period]").forEach(button => {
      button.addEventListener("click", () => {
        currentHistoryPeriod = button.dataset.period;
        page.querySelectorAll("[data-period]").forEach(item =>
          item.classList.toggle("active", item === button)
        );
        renderHistory();
      });
    });

    page.querySelector("#historyPrev").addEventListener("click", () => {
      if (currentHistoryPeriod === "harian") {
        historyAnchor.setDate(historyAnchor.getDate() - 1);
      } else if (currentHistoryPeriod === "bulanan") {
        historyAnchor.setDate(1);
        historyAnchor.setMonth(historyAnchor.getMonth() - 1);
      } else {
        historyAnchor.setDate(1);
        historyAnchor.setMonth(0);
        historyAnchor.setFullYear(historyAnchor.getFullYear() - 1);
      }
      renderHistory();
    });

    page.querySelector("#historyNext").addEventListener("click", () => {
      if (currentHistoryPeriod === "harian") {
        historyAnchor.setDate(historyAnchor.getDate() + 1);
      } else if (currentHistoryPeriod === "bulanan") {
        historyAnchor.setDate(1);
        historyAnchor.setMonth(historyAnchor.getMonth() + 1);
      } else {
        historyAnchor.setDate(1);
        historyAnchor.setMonth(0);
        historyAnchor.setFullYear(historyAnchor.getFullYear() + 1);
      }
      renderHistory();
    });

    page.querySelectorAll("[data-history-filter]").forEach(button => {
      button.addEventListener("click", () => {
        currentHistoryFilter = button.dataset.historyFilter;
        page.querySelectorAll("[data-history-filter]").forEach(item =>
          item.classList.toggle("active", item === button)
        );
        renderHistory();
      });
    });

    page.querySelector("#openDetailHistory").addEventListener("click", () => {
      showPage("Rincian Riwayat");
    });

    return page;
  }

  async function renderSavings() {
    const display = $("savingsTotalDisplay");
    const message = $("savingsMessage");
    const list = $("savingsHistoryList");
    const empty = $("savingsHistoryEmpty");
    if (!display || !window.NDROW_DB) return;

    try {
      const record = await window.NDROW_DB.get("settings", "savingsTotal");
      const balance = Math.max(0, Math.round(Number(record?.value) || 0));
      display.textContent = "Rp" + balance.toLocaleString("id-ID");
      if (!list) return;
      list.replaceChildren();

      const saved = await window.NDROW_DB.get("settings", "savingsHistory");
      const history = Array.isArray(saved?.value) ? saved.value : [];
      if (empty) empty.hidden = history.length > 0;

      history.forEach(item => {
        const row = document.createElement("article");
        row.className = "savings-history-item";
        const details = document.createElement("div");
        details.className = "savings-history-details";
        const title = document.createElement("strong");
        title.textContent = item.type === "tambah"
          ? "Tambah Tabungan" : "Ambil Tabungan";
        const info = document.createElement("small");
        const date = new Date(item.date);
        info.textContent =
          (Number.isNaN(date.getTime()) ? "" : date.toLocaleString("id-ID")) +
          (item.description ? " · " + item.description : "");
        const amount = document.createElement("strong");
        amount.className = item.type === "tambah" ? "savings-in" : "savings-out";
        amount.textContent = (item.type === "tambah" ? "+" : "−") +
          "Rp" + Number(item.amount || 0).toLocaleString("id-ID");
        details.append(title, info);
        row.append(details, amount);
        list.appendChild(row);
      });
    } catch (error) {
      console.error("Tabungan:", error);
      if (message) message.textContent = "Tabungan gagal dimuat. Coba lagi.";
    }
  }

  function showPage(name) {
    currentPage = name;
    const history = ensureHistoryPage();
    const analysis = document.getElementById("analysisPage");
    const dashboard = document.querySelector("body > main:not(#historyPage):not(#analysisPage):not(#savingsPage)");

    if (dashboard) dashboard.hidden = name !== "Beranda";
    history.hidden = name !== "Riwayat";
    const detailHistory = document.getElementById("detailHistoryPage");
    if (detailHistory) detailHistory.hidden = name !== "Rincian Riwayat";
    if (analysis) analysis.hidden = name !== "Analisa";
    const savings = document.getElementById("savingsPage");
    const toolPage = document.getElementById("toolsPage");
    if (toolPage) toolPage.hidden = !window.NDROW_TOOLS?.isToolPage(name);
    if (savings) savings.hidden = name !== "Tabungan";

    document.querySelectorAll(".nav-item").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === (name === "Rincian Riwayat" ? "Riwayat" : name)
      );
    });

    if (name === "Riwayat") renderHistory();
    if (name === "Rincian Riwayat") window.NDROW_RENDER_DETAIL_HISTORY?.();
    if (name === "Tabungan") renderSavings();
    window.scrollTo(0, 0);
  }

  async function renderHistory() {
    ensureHistoryPage();

    const list = $("historyList");
    const empty = $("historyEmpty");
    if (!list || !window.NDROW_TRANSACTIONS) return;

    try {
      const items = await window.NDROW_TRANSACTIONS.getAll();

      const makeDateKey = item => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(item.localDate || "")) {
          return item.localDate;
        }
        const date = new Date(item.date);
        if (Number.isNaN(date.getTime())) return "";
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      };

      const selectedYear = historyAnchor.getFullYear();
      const selectedMonth = historyAnchor.getMonth();
      const yearText = String(selectedYear);
      const monthText = String(selectedMonth + 1).padStart(2, "0");
      const dayText = String(historyAnchor.getDate()).padStart(2, "0");

      let startKey;
      let endKey;
      let periodLabel;

      if (currentHistoryPeriod === "harian") {
        startKey = `${yearText}-${monthText}-${dayText}`;
        endKey = startKey;
        periodLabel = historyAnchor.toLocaleDateString("id-ID", {
          weekday: "long", day: "numeric", month: "long", year: "numeric"
        });
      } else if (currentHistoryPeriod === "bulanan") {
        startKey = `${yearText}-${monthText}-01`;
        endKey = `${yearText}-${monthText}-31`;
        periodLabel = historyAnchor.toLocaleDateString("id-ID", {
          month: "long", year: "numeric"
        });
      } else {
        startKey = `${yearText}-01-01`;
        endKey = `${yearText}-12-31`;
        periodLabel = yearText;
      }

      $("historyPeriodLabel").textContent = periodLabel;

      const periodItems = items.filter(item => {
        const key = makeDateKey(item);
        return key && key >= startKey && key <= endKey;
      });

      const income = periodItems
        .filter(item => item.type === "pemasukan")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const expense = periodItems
        .filter(item => item.type === "pengeluaran")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      $("historyIncome").textContent = money(income);
      $("historyExpense").textContent = money(expense);
      $("historyNet").textContent = money(income - expense);

      const filtered = currentHistoryFilter === "semua"
        ? periodItems
        : periodItems.filter(item => item.type === currentHistoryFilter);

      list.replaceChildren();
      if (empty) empty.hidden = filtered.length > 0;

      const groups = new Map();

      filtered.forEach(item => {
        const dateKey = makeDateKey(item);
        const groupKey = currentHistoryPeriod === "tahunan"
          ? dateKey.slice(0, 7)
          : dateKey;

        if (!groups.has(groupKey)) groups.set(groupKey, []);
        groups.get(groupKey).push(item);
      });

      const sortedGroups = [...groups.entries()].sort((a, b) =>
        b[0].localeCompare(a[0])
      );

      sortedGroups.forEach(([groupKey, groupItems]) => {
        const heading = document.createElement("div");
        heading.className = "history-group-heading";

        const headingTitle = document.createElement("strong");
        if (currentHistoryPeriod === "tahunan") {
          const [y, m] = groupKey.split("-").map(Number);
          headingTitle.textContent = new Date(y, m - 1, 1)
            .toLocaleDateString("id-ID", { month: "long", year: "numeric" });
        } else {
          const [y, m, d] = groupKey.split("-").map(Number);
          headingTitle.textContent = new Date(y, m - 1, d)
            .toLocaleDateString("id-ID", {
              weekday: "long", day: "numeric", month: "long", year: "numeric"
            });
        }

        const groupNet = groupItems.reduce((sum, item) =>
          sum + (item.type === "pemasukan" ? 1 : -1) * Number(item.amount || 0), 0
        );

        const headingNet = document.createElement("small");
        headingNet.textContent = "Bersih " + money(groupNet);
        heading.append(headingTitle, headingNet);
        list.appendChild(heading);

        groupItems.forEach(item => {
          const row = document.createElement("article");
          row.className = "history-row";

          const icon = document.createElement("span");
          icon.className = "transaction-icon " +
            (item.type === "pemasukan" ? "income-symbol" : "expense-symbol");
          icon.textContent = item.type === "pemasukan" ? "+" : "−";

          const details = document.createElement("div");
          details.className = "history-details";

          const title = document.createElement("strong");
          title.textContent = item.description || "Transaksi";

          const meta = document.createElement("small");
          const date = new Date(item.date);
          const timeText = !Number.isNaN(date.getTime())
            ? date.toLocaleTimeString("id-ID", {
                hour: "2-digit", minute: "2-digit"
              })
            : "";

          meta.textContent = [
            timeText, item.platform, item.service, item.payment
          ].filter(Boolean).join(" · ");

          details.append(title, meta);

          const amount = document.createElement("strong");
          amount.className = item.type === "pemasukan"
            ? "transaction-income"
            : "transaction-expense";
          amount.textContent =
            (item.type === "pemasukan" ? "+" : "−") + money(item.amount);

          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "history-delete";
          remove.textContent = "Hapus";
          remove.setAttribute(
            "aria-label",
            "Hapus transaksi " + (item.description || "")
          );

          remove.addEventListener("click", async () => {
            if (!window.confirm(
              "Hapus transaksi " + (item.description || "ini") +
              " sebesar " + money(item.amount) + "?"
            )) return;

            try {
              await window.NDROW_TRANSACTIONS.remove(item.id);
              await refreshDashboard();
              await renderHistory();
              toast("Transaksi berhasil dihapus.");
            } catch (error) {
              console.error(error);
              toast("Transaksi gagal dihapus.");
            }
          });

          row.append(icon, details, amount, remove);
          list.appendChild(row);
        });
      });
    } catch (error) {
      console.error("Gagal memuat riwayat:", error);
      toast("Riwayat belum dapat dimuat.");
    }
  }

  window.NDROW_SHOW_PAGE = showPage;
  window.NDROW_REFRESH_DASHBOARD = refreshDashboard;

  function init() {
    $("addTransaction")?.addEventListener("click", openQuickMenu);
    $("addIncome")?.addEventListener("click", () => openModal("pemasukan"));
    $("addExpense")?.addEventListener("click", () => openModal("pengeluaran"));
    $("closeModal")?.addEventListener("click", closeModal);
    $("transactionForm")?.addEventListener("submit", submitTransaction);

    $("modalBackdrop")?.addEventListener("click", event => {
      if (event.target === $("modalBackdrop")) closeModal();
    });

    $("platform")?.addEventListener("change", updateServices);

    document.querySelectorAll(".tip-button").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".tip-button").forEach(item =>
          item.classList.remove("selected")
        );
        button.classList.add("selected");
        selectedTip = Number(button.dataset.tip) || 0;
      });
    });

    document.querySelectorAll(".nav-item").forEach(button => {
      button.addEventListener("click", () => {
        const page = button.dataset.page;
        if (page === "Beranda") {
          showPage("Beranda");
        } else if (page === "Riwayat") {
          showPage("Riwayat");
        } else if (page === "Analisa") {
          showPage("Analisa");
          window.NDROW_ANALYSIS?.render().catch(error => console.error("Analisa:", error));
        } else if (page === "Tabungan") {
          showPage("Tabungan");
        } else {
          toast("Halaman " + page + " kita aktifkan pada tahap berikutnya.");
        }
      });
    });

    $("viewHistory")?.addEventListener("click", () => showPage("Riwayat"));

    document.querySelectorAll(".tool-card").forEach(button => {
      button.addEventListener("click", () => {
        if (window.NDROW_TOOLS) window.NDROW_TOOLS.open(button.dataset.tool);
        else toast("Modul menu belum berhasil dimuat.");
      });
    });

    $("savingsForm")?.addEventListener("submit", async event => {
      event.preventDefault();
      const type = $("savingsType")?.value;
      const input = $("savingsAmount");
      const description = $("savingsDescription")?.value.trim() || "";
      const message = $("savingsMessage");
      const raw = input?.value.trim() || "";
      const amount = Number(raw);

      if (!["tambah", "ambil"].includes(type) ||
          raw === "" || !Number.isSafeInteger(amount) || amount < 1) {
        message.classList.remove("is-success");
        message.classList.add("is-error");
        message.textContent = "Masukkan nominal rupiah bulat minimal Rp1.";
        return;
      }

      try {
        const db = window.NDROW_DB;
        if (!db) throw new Error("Database belum tersedia.");
        const saved = await db.get("settings", "savingsTotal");
        const balance = Math.max(0, Math.round(Number(saved?.value) || 0));

        if (type === "ambil" && amount > balance) {
          message.classList.remove("is-success");
          message.classList.add("is-error");
          message.textContent = "Saldo tabungan tidak mencukupi.";
          return;
        }

        const next = type === "tambah" ? balance + amount : balance - amount;
        if (!Number.isSafeInteger(next) || next < 0) {
          message.classList.remove("is-success");
          message.classList.add("is-error");
          message.textContent = "Nominal melewati batas yang diizinkan.";
          return;
        }

        const oldHistory = await db.get("settings", "savingsHistory");
        const history = Array.isArray(oldHistory?.value) ? oldHistory.value : [];
        history.unshift({
          id: Date.now(),
          type,
          amount,
          description,
          date: new Date().toISOString()
        });

        await db.put("settings", {
          key: "savingsTotal", value: next,
          updatedAt: new Date().toISOString()
        });
        await db.put("settings", {
          key: "savingsHistory", value: history,
          updatedAt: new Date().toISOString()
        });

        input.value = "";
        if ($("savingsDescription")) $("savingsDescription").value = "";
        message.textContent = type === "tambah"
          ? "Tabungan berhasil ditambahkan." : "Tabungan berhasil diambil.";
          message.classList.remove("is-error");
          message.classList.add("is-success");
        await renderSavings();
      } catch (error) {
        console.error("Mutasi tabungan:", error);
        message.classList.remove("is-success");
        message.classList.add("is-error");
        message.textContent = "Gagal menyimpan mutasi. Periksa kembali saldo.";
      }
    });

    updateServices();
    refreshDashboard();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
