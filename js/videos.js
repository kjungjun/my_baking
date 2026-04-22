/**
 * 동영상 페이지 (index.html)
 *   - videos 컬렉션의 각 문서를 카드로 렌더
 *   - 각 카드 하단에 해당 영상의 comments 서브컬렉션 위젯 마운트
 */
(function () {
  const listEl = document.getElementById("items-list");
  const { escapeHtml, formatTimestamp, youtubeEmbedHtml, mountComments } = BakingApp;

  const commentUnsubs = new Map(); // id → unsub

  function renderVideos(docs) {
    // 기존 구독 해제
    for (const unsub of commentUnsubs.values()) unsub();
    commentUnsubs.clear();

    if (!docs.length) {
      listEl.innerHTML = '<p class="empty">아직 등록된 동영상이 없습니다.</p>';
      return;
    }

    listEl.innerHTML = docs
      .map((doc) => {
        const d = doc.data();
        return `
          <article class="item-card" data-id="${doc.id}">
            ${youtubeEmbedHtml(d.url, d.title)}
            <div class="item-meta">
              <h3 class="item-title">${escapeHtml(d.title || "제목 없음")}</h3>
              <div class="item-date">${formatTimestamp(d.createdAt)}</div>
            </div>
            <div class="comments-slot"></div>
          </article>`;
      })
      .join("");

    // 각 카드에 댓글 위젯 마운트
    docs.forEach((doc) => {
      const article = listEl.querySelector(
        `.item-card[data-id="${CSS.escape(doc.id)}"]`
      );
      if (!article) return;
      const slot = article.querySelector(".comments-slot");
      const commentsRef = db.collection("videos").doc(doc.id).collection("comments");
      const unsub = mountComments(slot, commentsRef);
      commentUnsubs.set(doc.id, unsub);
    });
  }

  db.collection("videos")
    .orderBy("createdAt", "desc")
    .onSnapshot(
      (snap) => renderVideos(snap.docs),
      (err) => {
        console.error("videos load error:", err);
        listEl.innerHTML =
          '<p class="error">동영상을 불러오지 못했습니다. (' +
          escapeHtml(err.message) +
          ")</p>";
      }
    );
})();
