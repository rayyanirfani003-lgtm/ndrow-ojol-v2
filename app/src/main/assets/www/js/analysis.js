(function () {
  "use strict";

  let period = "harian";

  function money(value) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  function dateKey(date) {
    return date.getFullYear() + "-" +
      String(date.getMonth() + 1).padStart(2, "0") + "-" +
      String(date.getDate()).padStart(2, "0");
  }

  function getPeriod(now) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let end = new Date(start);
    let label = "Hari ini";

    if (period === "mingguan") {
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      label = "Minggu ini";
    } else if (period === "bulanan") {
      start.setDate(1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      label = start.toLocaleDateString("id-ID", {
        month: "long", year: "numeric"
      });
    }

    return { first: dateKey(start), last: dateKey(end), label };
  }

  async function render() {
    const list = document.getElementById("analysisList");
    if (!list || !window.NDROW_TRANSACTIONS) return;

    const range = getPeriod(new Date());
    const items = (await window.NDROW_TRANSACTIONS.getAll()).filter(item => {
      const key = item.localDate || dateKey(new Date(item.date));
      return key >= range.first && key <= range.last;
    });

    const income = items.filter(x => x.type === "pemasukan")
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const expense = items.filter(x => x.type === "pengeluaran")
      .reduce((sum, x) => sum + Number(x.amount || 0), 0);

    document.getElementById("analysisNet").textContent = money(income - expense);
    document.getElementById("analysisIncome").textContent = money(income);
    document.getElementById("analysisExpense").textContent = money(expense);
    document.getElementById("analysisRange").textContent = range.label;
    document.getElementById("analysisCount").textContent = items.length + " transaksi";
    document.getElementById("analysisEmpty").hidden = items.length > 0;
    list.replaceChildren();

    items.forEach(item => {
      const row = document.createElement("div");
      row.className = "transaction-row";

      const detail = document.createElement("div");
      detail.className = "transaction-details";
      const title = document.createElement("strong");
      title.textContent = item.description || item.type;
      const date = document.createElement("small");
      date.textContent = item.localDate || dateKey(new Date(item.date));
      detail.append(title, date);

      const amount = document.createElement("strong");
      amount.textContent = (item.type === "pemasukan" ? "+" : "−") + money(item.amount);
      amount.className = item.type === "pemasukan" ? "income-text" : "expense-text";
      row.append(detail, amount);
      list.append(row);
    });
  }

  function init() {
    document.querySelectorAll("[data-analysis-period]").forEach(button => {
      button.addEventListener("click", () => {
        period = button.dataset.analysisPeriod;
        document.querySelectorAll("[data-analysis-period]").forEach(item =>
          item.classList.toggle("active", item === button)
        );
        render().catch(error => console.error("Analisa:", error));
      });
    });
  }

  window.NDROW_ANALYSIS = { render, init };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
