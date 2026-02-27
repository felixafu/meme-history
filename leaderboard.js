(() => {
  const leaderboardTable = document.getElementById("leaderboard-table");

  function buildLeaderboard(memes) {
    const artists = {};
    memes.forEach((m) => {
      if (!artists[m.artist]) {
        artists[m.artist] = { memes: 0, reactions: 0 };
      }
      artists[m.artist].memes++;
      artists[m.artist].reactions += m.reactions;
    });

    const sorted = Object.entries(artists)
      .map(([name, stats]) => ({
        name,
        ...stats,
        rpm: stats.memes > 0 ? (stats.reactions / stats.memes).toFixed(1) : "0.0",
      }))
      .sort((a, b) => b.reactions - a.reactions || b.memes - a.memes);

    let html = `
      <div class="lb-row lb-header">
        <span></span>
        <span>Artist</span>
        <span class="lb-stat">Memes</span>
        <span class="lb-stat">Reactions</span>
        <span class="lb-stat">RPM</span>
      </div>`;

    sorted.forEach((artist, i) => {
      const rankClass = i < 3 ? ` lb-rank-${i + 1}` : "";
      html += `
        <div class="lb-row">
          <span class="lb-rank${rankClass}">${i + 1}</span>
          <span class="lb-name">${artist.name}</span>
          <span class="lb-stat">${artist.memes}</span>
          <span class="lb-stat">${artist.reactions}</span>
          <span class="lb-stat">${artist.rpm}</span>
        </div>`;
    });

    leaderboardTable.innerHTML = html;
  }

  fetch("memes.json")
    .then((res) => {
      if (!res.ok) throw new Error("Could not load memes.json");
      return res.json();
    })
    .then(buildLeaderboard)
    .catch(() => {
      leaderboardTable.innerHTML =
        '<p style="text-align:center;color:#777;padding:4rem 0;">No data found. Run <code>node fetch-memes.js</code> first.</p>';
    });
})();
