/**
 * 레시피 페이지 (recipes.html)
 *   - recipes 컬렉션: title, videoUrl(선택), content(본문), createdAt
 *   - 댓글 기능 없음 (동영상 페이지에서만 사용)
 */
(function () {
  const listEl = document.getElementById("items-list");
  const { escapeHtml, formatTimestamp, youtubeEmbedHtml } = BakingApp;

  function renderList(docs) {
    if (!docs.length) {
      listEl.innerHTML = '<p class="empty">아직 등록된 레시피가 없습니다.</p>';
      return;
    }

    listEl.innerHTML = docs
      .map((doc) => {
        const d = doc.data();
        const videoHtml = d.videoUrl ? youtubeEmbedHtml(d.videoUrl, d.title) : "";
        const contentHtml = d.content
          ? `<div class="item-content">${escapeHtml(d.content)}</div>`
          : "";
        return `
          <article class="item-card" data-id="${doc.id}">
            <div class="item-meta item-meta-top">
              <h3 class="item-title">${escapeHtml(d.title || "제목 없음")}</h3>
              <div class="item-date">${formatTimestamp(d.createdAt)}</div>
            </div>
            ${videoHtml}
            ${contentHtml}
          </article>`;
      })
      .join("");
  }

  db.collection("recipes")
    .orderBy("createdAt", "desc")
    .onSnapshot(
      (snap) => renderList(snap.docs),
      (err) => {
        console.error("recipes load error:", err);
        listEl.innerHTML =
          '<p class="error">레시피를 불러오지 못했습니다. (' +
          escapeHtml(err.message) +
          ")</p>";
      }
    );
})();
