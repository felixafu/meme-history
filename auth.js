(() => {
  const PASS_HASH = "988f573b349d8d7c537cc03489a0bed43f03e07fb75fafac7d121f77599ca7bc";

  async function hash(str) {
    const data = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  if (sessionStorage.getItem("meme-auth") === "1") {
    document.body.classList.add("authed");
    return;
  }

  document.body.classList.add("locked");

  const overlay = document.createElement("div");
  overlay.id = "auth-overlay";
  overlay.innerHTML = `
    <div class="auth-box">
      <h2>The UK Memes Collection</h2>
      <p>Enter the password to view the exhibition</p>
      <input type="password" id="auth-input" placeholder="Password" autocomplete="off">
      <button id="auth-submit">Enter</button>
      <p id="auth-error"></p>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = document.getElementById("auth-input");
  const btn = document.getElementById("auth-submit");
  const error = document.getElementById("auth-error");

  async function attempt() {
    const h = await hash(input.value);
    if (h === PASS_HASH) {
      sessionStorage.setItem("meme-auth", "1");
      document.body.classList.remove("locked");
      document.body.classList.add("authed");
      overlay.remove();
    } else {
      error.textContent = "Wrong password";
      input.value = "";
      input.focus();
    }
  }

  btn.addEventListener("click", attempt);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") attempt();
  });
  input.focus();
})();
