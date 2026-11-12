(function () {
  "use strict";

  let period = "harian";
  let filter = "semua";
  let anchor = new Date();

  const money = n => "Rp" + Number(n || 0).toLocaleString("id-ID");

  function keyDate(item) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(item.localDate || "")) {
      return item.localDate;
    }
    const d = new Date(item.date);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function showDate(key, options) {
    const [y,m,d] = key.split("-").map(Number);
    return new Date(y,m-1,d).toLocaleDateString("id-ID", options);
  }

  function ensurePage() {
    let page = document.getElementById("detailHistoryPage");
    if (page) return page;

    page = document.createElement("section");
    page.id = "detailHistoryPage";
    page.hidden = true;
    page.className = "detail-history-page";

    page.innerHTML = `
      <style>
        .detail-history-page {
          width:100%;max-width:620px;min-height:70vh;
          margin:0 auto;padding:18px 17px 110px;
          color:#17201A;
        }
        .detail-history-page[hidden]{display:none!important}
        .detail-back {
          border:0;background:#E9F5EC;color:#15803D;
          border-radius:12px;padding:10px 15px;font-weight:700;
          margin-bottom:18px;
        }
        .detail-heading h2{font-size:23px;margin:5px 0}
        .detail-heading p{font-size:13px;color:#718078;margin:0 0 18px}
        .detail-tabs {
          display:grid;grid-template-columns:repeat(4,1fr);
          gap:5px;background:#EDEFEE;padding:5px;border-radius:13px;
        }
        .detail-tabs button,.detail-filters button {
          border:0;border-radius:9px;padding:10px 3px;
          background:transparent;color:#647067;font-weight:600;
          font-size:12px;
        }
        .detail-tabs button.active,.detail-filters button.active {
          background:#16A34A;color:white;
        }
        .detail-period-nav {
          display:flex;justify-content:space-between;
          align-items:center;gap:10px;margin:17px 0;
        }
        .detail-period-nav button {
          border:0;background:#E9F5EC;color:#15803D;
          border-radius:10px;width:40px;height:38px;font-size:23px;
        }
        #detailPeriodLabel{text-align:center;font-weight:700;font-size:13px}
        .detail-summary {
          display:grid;grid-template-columns:repeat(3,minmax(0,1fr));
          gap:8px;margin-bottom:17px;
        }
        .detail-summary div {
          background:white;border:1px solid #E8ECE9;
          border-radius:13px;padding:12px 9px;min-width:0;
        }
        .detail-summary small{display:block;color:#718078;font-size:10px}
        .detail-summary strong{display:block;font-size:12px;margin-top:7px;overflow-wrap:anywhere}
        .detail-income{color:#15803D}
        .detail-expense{color:#DC5555}
        .detail-filters{display:flex;gap:7px;margin:15px 0}
        .detail-filters button{background:#EEF1EF;padding:9px 15px}
        .detail-history-group {
          display:flex;justify-content:space-between;gap:8px;
          padding:14px 2px 9px;border-bottom:1px solid #E8ECE9;
          font-size:12px;
        }
        .detail-history-group small{color:#718078}
        .detail-history-row {
          display:flex;align-items:center;gap:10px;
          padding:13px 2px;border-bottom:1px solid #F0F2F0;
        }
        .detail-history-icon {
          width:35px;height:35px;border-radius:11px;
          display:grid;place-items:center;background:#E9F5EC;
          color:#15803D;font-weight:800;flex-shrink:0;
        }
        .detail-history-icon.out{background:#FCEEEE;color:#DC5555}
        .detail-history-info{flex:1;min-width:0}
        .detail-history-info strong{display:block;font-size:13px;overflow-wrap:anywhere}
        .detail-history-info small{display:block;color:#87918A;font-size:10px;margin-top:4px}
        .detail-history-amount{font-size:12px;white-space:nowrap}
        .detail-history-delete {
          border:0;background:#FCEEEE;color:#D34B4B;
          border-radius:8px;padding:7px;font-size:10px;
        }
        .detail-empty{text-align:center;color:#87918A;padding:35px 10px;font-size:13px}
        #detailHistoryNotice{font-size:12px;color:#15803D;margin:8px 0}
        @media(max-width:360px){
          .detail-summary{gap:5px}
          .detail-summary div{padding:9px 6px}
          .detail-summary strong{font-size:10px}
        }
      </style>

      <button type="button" class="detail-back" id="detailHistoryBack">← Kembali ke Riwayat</button>
      <div class="detail-heading">
        <h2>Rincian Riwayat</h2>
        <p>Seluruh catatan pemasukan dan pengeluaranmu.</p>
      </div>

      <div class="detail-tabs">
        <button class="active" data-detail-period="harian">Harian</button>
        <button data-detail-period="mingguan">Mingguan</button>
        <button data-detail-period="bulanan">Bulanan</button>
        <button data-detail-period="tahunan">Tahunan</button>
      </div>

      <div class="detail-period-nav">
        <button id="detailPrev" aria-label="Periode sebelumnya">‹</button>
        <strong id="detailPeriodLabel">Hari ini</strong>
        <button id="detailNext" aria-label="Periode berikutnya">›</button>
      </div>

      <div class="detail-summary">
        <div><small>Pemasukan</small><strong class="detail-income" id="detailIncome">Rp0</strong></div>
        <div><small>Pengeluaran</small><strong class="detail-expense" id="detailExpense">Rp0</strong></div>
        <div><small>Bersih</small><strong id="detailNet">Rp0</strong></div>
      </div>

      <div class="detail-filters">
        <button class="active" data-detail-filter="semua">Semua</button>
        <button data-detail-filter="pemasukan">Masuk</button>
        <button data-detail-filter="pengeluaran">Keluar</button>
      </div>

      <p id="detailHistoryNotice" role="status"></p>
      <div id="detailHistoryList"></div>
      <div id="detailHistoryEmpty" class="detail-empty" hidden>
        Belum ada transaksi pada periode ini.
      </div>
    `;

    const nav = document.querySelector(".bottom-nav");
    if (nav) nav.before(page);
    else document.body.appendChild(page);

    page.querySelector("#detailHistoryBack").addEventListener("click", () => {
      window.NDROW_SHOW_PAGE("Riwayat");
    });

    page.querySelectorAll("[data-detail-period]").forEach(button => {
      button.addEventListener("click", () => {
        period = button.dataset.detailPeriod;
        page.querySelectorAll("[data-detail-period]").forEach(b =>
          b.classList.toggle("active", b === button)
        );
        render();
      });
    });

    page.querySelectorAll("[data-detail-filter]").forEach(button => {
      button.addEventListener("click", () => {
        filter = button.dataset.detailFilter;
        page.querySelectorAll("[data-detail-filter]").forEach(b =>
          b.classList.toggle("active", b === button)
        );
        render();
      });
    });

    page.querySelector("#detailPrev").addEventListener("click", () => move(-1));
    page.querySelector("#detailNext").addEventListener("click", () => move(1));

    return page;
  }

  function move(direction) {
    if (period === "harian") anchor.setDate(anchor.getDate() + direction);
    if (period === "mingguan") anchor.setDate(anchor.getDate() + direction * 7);
    if (period === "bulanan") anchor.setMonth(anchor.getMonth() + direction);
    if (period === "tahunan") anchor.setFullYear(anchor.getFullYear() + direction);
    render();
  }

  async function render() {
    const page = ensurePage();
    const list = page.querySelector("#detailHistoryList");
    const empty = page.querySelector("#detailHistoryEmpty");
    const notice = page.querySelector("#detailHistoryNotice");
    if (!window.NDROW_TRANSACTIONS) return;

    try {
      const all = await window.NDROW_TRANSACTIONS.getAll();
      let start = new Date(anchor);
      let end = new Date(anchor);
      let label = "";

      if (period === "mingguan") {
        start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        label = showDate(dateKey(start), {day:"numeric",month:"short"}) +
          " – " + showDate(dateKey(end), {day:"numeric",month:"long",year:"numeric"});
      } else if (period === "bulanan") {
        start.setDate(1);
        end = new Date(start.getFullYear(), start.getMonth()+1, 0);
        label = start.toLocaleDateString("id-ID",{month:"long",year:"numeric"});
      } else if (period === "tahunan") {
        start = new Date(start.getFullYear(),0,1);
        end = new Date(start.getFullYear(),11,31);
        label = String(start.getFullYear());
      } else {
        label = showDate(dateKey(start), {
          weekday:"long",day:"numeric",month:"long",year:"numeric"
        });
      }

      const startKey = dateKey(start);
      const endKey = dateKey(end);
      page.querySelector("#detailPeriodLabel").textContent = label;

      const periodItems = all.filter(item => {
        const key = keyDate(item);
        return key && key >= startKey && key <= endKey;
      });

      const income = periodItems
        .filter(x => x.type === "pemasukan")
        .reduce((sum,x) => sum + Number(x.amount || 0),0);
      const expense = periodItems
        .filter(x => x.type === "pengeluaran")
        .reduce((sum,x) => sum + Number(x.amount || 0),0);

      page.querySelector("#detailIncome").textContent = money(income);
      page.querySelector("#detailExpense").textContent = money(expense);
      page.querySelector("#detailNet").textContent = money(income-expense);

      const filtered = filter === "semua" ? periodItems :
        periodItems.filter(x => x.type === filter);

      list.replaceChildren();
      empty.hidden = filtered.length > 0;

      const groups = new Map();
      filtered.forEach(item => {
        const key = keyDate(item);
        const group = period === "tahunan" ? key.slice(0,7) : key;
        if (!groups.has(group)) groups.set(group,[]);
        groups.get(group).push(item);
      });

      [...groups.entries()].sort((a,b) => b[0].localeCompare(a[0]))
        .forEach(([group,items]) => {
          const heading = document.createElement("div");
          heading.className = "detail-history-group";
          const title = document.createElement("strong");
          title.textContent = period === "tahunan"
            ? showDate(group + "-01",{month:"long",year:"numeric"})
            : showDate(group,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
          const net = items.reduce((sum,x) =>
            sum + (x.type === "pemasukan" ? 1 : -1) * Number(x.amount || 0),0);
          const total = document.createElement("small");
          total.textContent = "Bersih " + money(net);
          heading.append(title,total);
          list.appendChild(heading);

          items.forEach(item => {
            const row = document.createElement("article");
            row.className = "detail-history-row";

            const icon = document.createElement("span");
            icon.className = "detail-history-icon" +
              (item.type === "pengeluaran" ? " out" : "");
            icon.textContent = item.type === "pemasukan" ? "+" : "−";

            const info = document.createElement("div");
            info.className = "detail-history-info";
            const name = document.createElement("strong");
            name.textContent = item.description || "Transaksi";
            const meta = document.createElement("small");
            const date = new Date(item.date);
            const time = Number.isNaN(date.getTime()) ? "" :
              date.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});
            meta.textContent = [time,item.platform,item.service,item.payment]
              .filter(Boolean).join(" · ");
            info.append(name,meta);

            const amount = document.createElement("strong");
            amount.className = "detail-history-amount " +
              (item.type === "pemasukan" ? "detail-income" : "detail-expense");
            amount.textContent = (item.type === "pemasukan" ? "+" : "−") +
              money(item.amount);

            const del = document.createElement("button");
            del.type = "button";
            del.className = "detail-history-delete";
            del.textContent = "Hapus";
            del.addEventListener("click", async () => {
              if (!confirm("Hapus transaksi " +
                (item.description || "ini") + " sebesar " +
                money(item.amount) + "?")) return;
              try {
                await window.NDROW_TRANSACTIONS.remove(item.id);
                if (window.NDROW_REFRESH_DASHBOARD) {
                  await window.NDROW_REFRESH_DASHBOARD();
                }
                notice.textContent = "Transaksi berhasil dihapus.";
                await render();
              } catch (error) {
                console.error(error);
                notice.textContent = "Transaksi gagal dihapus.";
              }
            });

            row.append(icon,info,amount,del);
            list.appendChild(row);
          });
        });
    } catch (error) {
      console.error("Rincian riwayat:",error);
      notice.textContent = "Rincian riwayat gagal dimuat.";
    }
  }

  document.addEventListener("click", event => {
    const button = event.target.closest?.("#openDetailHistory");
    if (!button) return;
    ensurePage();
    window.NDROW_SHOW_PAGE("Rincian Riwayat");
  });

  window.NDROW_RENDER_DETAIL_HISTORY = render;
})();
