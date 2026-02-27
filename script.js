(() => {
  let memes = [];
  let currentSort = "date";

  const gallery = document.getElementById("gallery");
  const sortButtons = document.querySelectorAll(".sort-btn");

  sortButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      sortButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentSort = btn.dataset.sort;
      renderGallery();
    });
  });

  function sortMemes() {
    const sorted = [...memes];
    if (currentSort === "reactions") {
      sorted.sort((a, b) => b.reactions - a.reactions);
    } else {
      sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return sorted;
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function renderGallery() {
    gallery.innerHTML = "";
    const sorted = sortMemes();

    if (sorted.length === 0) {
      gallery.innerHTML =
        '<p style="text-align:center;color:#777;padding:4rem 0;">No memes found. Run <code>node fetch-memes.js</code> to populate the gallery.</p>';
      return;
    }

    sorted.forEach((meme) => {
      const frame = document.createElement("div");
      frame.className = "meme-frame";
      frame.innerHTML = `
        <div class="meme-frame-mid">
          <div class="meme-frame-inner">
            <div class="meme-mat">
              <div class="meme-card">
                <img src="${meme.imageUrl}" alt="Meme by ${meme.artist}" loading="lazy">
              </div>
            </div>
            <div class="meme-info">
              <div class="meme-artist">${meme.artist}</div>
              <div class="meme-meta">
                <span class="meme-reactions">${meme.reactions} reactions</span>
                <span class="meme-date">${formatDate(meme.date)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
      gallery.appendChild(frame);
    });
  }

  fetch("memes.json")
    .then((res) => {
      if (!res.ok) throw new Error("Could not load memes.json");
      return res.json();
    })
    .then((data) => {
      memes = data;
      renderGallery();
    })
    .catch(() => {
      gallery.innerHTML =
        '<p style="text-align:center;color:#777;padding:4rem 0;">No memes found. Run <code>node fetch-memes.js</code> to populate the gallery.</p>';
    });
})();
