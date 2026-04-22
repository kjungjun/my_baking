/**
 * 공통 유틸리티 & 댓글 위젯
 *   - 모든 페이지에서 공유되는 함수
 *   - BakingApp 네임스페이스로 노출
 */
window.BakingApp = (function () {
  /** HTML 이스케이프 (XSS 방지) */
  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * YouTube URL → video ID
   * 지원: watch?v=, youtu.be, /embed/, /shorts/
   */
  function extractYoutubeId(url) {
    if (!url) return null;
    try {
      const u = new URL(url);
      if (u.hostname === "youtu.be") return u.pathname.slice(1);
      if (u.hostname.includes("youtube.com")) {
        if (u.pathname === "/watch") return u.searchParams.get("v");
        const parts = u.pathname.split("/").filter(Boolean);
        if (parts[0] === "embed" || parts[0] === "shorts") return parts[1] || null;
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  /** Firestore Timestamp → "YYYY-MM-DD HH:mm" */
  function formatTimestamp(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const pad = (n) => String(n).padStart(2, "0");
    return (
      d.getFullYear() +
      "-" +
      pad(d.getMonth() + 1) +
      "-" +
      pad(d.getDate()) +
      " " +
      pad(d.getHours()) +
      ":" +
      pad(d.getMinutes())
    );
  }

  /** YouTube 임베드 HTML 생성 */
  function youtubeEmbedHtml(url, title) {
    const videoId = extractYoutubeId(url);
    if (!videoId) return "";
    return `
      <div class="video-embed">
        <iframe
          src="https://www.youtube.com/embed/${videoId}"
          title="${escapeHtml(title || "")}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          loading="lazy"></iframe>
      </div>`;
  }

  /**
   * 댓글 위젯을 특정 컨테이너에 마운트
   * @param {HTMLElement} container  댓글 영역 컨테이너
   * @param {firebase.firestore.CollectionReference} commentsRef  해당 항목의 comments 서브컬렉션
   * @returns {function} 해제 함수
   */
  function mountComments(container, commentsRef) {
    container.classList.add("comments-wrap");
    container.innerHTML = `
      <h4 class="comments-title">댓글</h4>
      <form class="comment-form">
        <div class="form-row">
          <input type="text" class="comment-name" placeholder="이름" maxlength="20" required />
        </div>
        <div class="form-row">
          <textarea class="comment-content" placeholder="의견을 남겨주세요" maxlength="500" rows="2" required></textarea>
        </div>
        <div class="form-row form-row-right">
          <button type="submit" class="btn btn-primary btn-small">등록</button>
        </div>
      </form>
      <ul class="comments-list">
        <li class="loading">불러오는 중…</li>
      </ul>
    `;

    const form = container.querySelector(".comment-form");
    const nameInput = container.querySelector(".comment-name");
    const contentInput = container.querySelector(".comment-content");
    const listEl = container.querySelector(".comments-list");

    // 구독
    const unsubscribe = commentsRef
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snap) => {
          if (snap.empty) {
            listEl.innerHTML = '<li class="empty">첫 댓글을 남겨주세요.</li>';
            return;
          }
          listEl.innerHTML = snap.docs
            .map((doc) => {
              const c = doc.data();
              return `
                <li class="comment-item">
                  <div class="comment-head">
                    <span class="comment-name-text">${escapeHtml(c.name || "익명")}</span>
                    <span class="comment-time">${formatTimestamp(c.createdAt)}</span>
                  </div>
                  <div class="comment-body">${escapeHtml(c.content || "")}</div>
                </li>`;
            })
            .join("");
        },
        (err) => {
          console.error("comments error:", err);
          listEl.innerHTML =
            '<li class="error">댓글을 불러오지 못했습니다. (' + escapeHtml(err.message) + ")</li>";
        }
      );

    // 폼 제출
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      const content = contentInput.value.trim();
      if (!name || !content) return;

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "등록 중…";

      try {
        await commentsRef.add({
          name: name.slice(0, 20),
          content: content.slice(0, 500),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        contentInput.value = "";
      } catch (err) {
        console.error("comment add error:", err);
        alert("댓글 등록 실패: " + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "등록";
      }
    });

    return unsubscribe;
  }

  return {
    escapeHtml,
    extractYoutubeId,
    formatTimestamp,
    youtubeEmbedHtml,
    mountComments,
  };
})();
