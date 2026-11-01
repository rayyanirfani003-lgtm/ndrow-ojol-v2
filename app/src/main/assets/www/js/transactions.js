(function () {
  "use strict";

  const DB = window.NDROW_DB;
  const STORE = "transactions";

  function makeId() {
    return "tx_" + Date.now() + "_" +
      Math.random().toString(36).slice(2, 9);
  }

  function localDate(date) {
    const d = date || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  async function save(data) {
    if (!DB) throw new Error("Database belum siap.");

    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Nominal harus lebih dari nol.");
    }

    const item = {
      id: makeId(),
      type: data.type,
      amount: Math.round(amount),
      description: String(data.description || "").trim(),
      date: new Date().toISOString(),
      localDate: localDate(),
      platform: data.platform || "",
      service: data.service || "",
      payment: data.payment || "",
      tip: Number(data.tip) || 0
    };

    await DB.add(STORE, item);
    return item;
  }

  async function getAll() {
    const items = await DB.getAll(STORE);
    return (items || []).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async function remove(id) {
    return DB.remove(STORE, id);
  }

  async function calculate() {
    const items = await getAll();
    const today = localDate();
    const todayItems = items.filter(item =>
      (item.localDate || localDate(new Date(item.date))) === today
    );

    const income = todayItems
      .filter(item => item.type === "pemasukan")
      .reduce((sum, item) => sum + item.amount, 0);

    const expense = todayItems
      .filter(item => item.type === "pengeluaran")
      .reduce((sum, item) => sum + item.amount, 0);

    return {
      income,
      expense,
      net: income - expense,
      orders: todayItems.filter(item => item.type === "pemasukan").length,
      transactions: todayItems.length,
      all: items
    };
  }

  window.NDROW_TRANSACTIONS = { save, getAll, remove, calculate };
})();
