(function () {
  "use strict";

  const KEY = "ndrow_ojol_pin_v1";
  const SPLASH_DURATION = 5000;
  const $ = id => document.getElementById(id);

  async function hashPin(pin, salt) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error("Fitur keamanan PIN tidak tersedia di browser ini.");
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits({
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 120000,
      hash: "SHA-256"
    }, key, 256);

    return Array.from(new Uint8Array(bits))
      .map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function randomSalt() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function showMessage(message) {
    $("authMessage").textContent = message;
  }

  async function submitPin() {
    const pin = $("authPin").value;
    const confirm = $("authConfirm").value;
    const firstTime = !localStorage.getItem(KEY);

    if (!/^\d{6}$/.test(pin)) {
      showMessage("PIN harus terdiri dari 6 angka.");
      return;
    }

    try {
      if (firstTime) {
        if (pin !== confirm) {
          showMessage("Konfirmasi PIN belum cocok.");
          return;
        }

        const salt = randomSalt();
        const hash = await hashPin(pin, salt);
        localStorage.setItem(KEY, JSON.stringify({ salt, hash }));
        unlock();
        return;
      }

      const saved = JSON.parse(localStorage.getItem(KEY));
      const hash = await hashPin(pin, saved.salt);

      if (hash !== saved.hash) {
        $("authPin").value = "";
        showMessage("PIN salah. Silakan coba lagi.");
        return;
      }

      unlock();
    } catch (error) {
      console.error("Autentikasi:", error);
      showMessage(error.message || "Gagal memproses PIN.");
    }
  }

  function unlock() {
    $("authScreen").classList.add("auth-exit");

    setTimeout(() => {
      $("authScreen").hidden = true;
      document.body.classList.remove("auth-locked");
    }, 450);
  }

  function showWelcomeAfterSplash() {
    const splash = $("splashScreen");
    const welcome = $("welcomeScreen");

    if (splash) splash.classList.add("splash-exit");

    setTimeout(() => {
      if (splash) splash.hidden = true;
      welcome.hidden = false;
    }, splash ? 450 : 0);
  }

  function openPinScreen() {
    const welcome = $("welcomeScreen");
    const screen = $("authScreen");

    welcome.hidden = true;
    screen.hidden = false;
    $("authPin").focus();
  }

  function init() {
    const screen = $("authScreen");
    if (!screen) return;

    const firstTime = !localStorage.getItem(KEY);

    $("authHeading").textContent = firstTime
      ? "Buat PIN Keamanan"
      : "Selamat Datang Kembali";

    $("authDescription").textContent = firstTime
      ? "Buat PIN 6 digit untuk melindungi aplikasi."
      : "Masukkan PIN untuk membuka NDROW OJOL.";

    $("authConfirmGroup").hidden = !firstTime;
    $("authSubmit").textContent = firstTime ? "Simpan PIN" : "Masuk";

    $("authForm").addEventListener("submit", event => {
      event.preventDefault();
      submitPin();
    });

    $("welcomeStart").addEventListener("click", openPinScreen);

    document.body.classList.add("auth-locked");
    setTimeout(showWelcomeAfterSplash, SPLASH_DURATION);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
