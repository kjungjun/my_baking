/**
 * 관리자 페이지 로직
 *   - Firebase Auth 로 로그인/로그아웃
 *   - 동영상 / 레시피 / 베이킹도구 3개 컬렉션 관리
 */
(function () {
  const auth = firebase.auth();
  const { escapeHtml, extractYoutubeId } = BakingApp;

  // ============ DOM ============
  const loginSection = document.getElementById("login-section");
  const adminSection = document.getElementById("admin-section");
  const loginForm = document.getElementById("login-form");
  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");
  const loginError = document.getElementById("login-error");
  const userEmailSpan = document.getElementById("user-email");
  const logoutBtn = document.getElementById("logout-btn");

  function showError(el, msg) {
    el.textContent = msg;
    el.style.display = msg ? "block" : "none";
  }

  // ============ 로그인 / 로그아웃 ============
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError(loginError, "");
    try {
      await auth.signInWithEmailAndPassword(
        loginEmail.value.trim(),
        loginPassword.value
      );
    } catch (err) {
      console.error("login error:", err);
      const map = {
        "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않습니다.",
        "auth/wrong-password": "이메일 또는 비밀번호가 올바르지 않습니다.",
        "auth/user-not-found": "등록되지 않은 계정입니다.",
        "auth/too-many-requests": "시도가 너무 많습니다. 잠시 후 다시 시도하세요.",
      };
      showError(loginError, map[err.code] || "로그인에 실패했습니다. (" + err.code + ")");
    }
  });

  logoutBtn.addEventListener("click", () => auth.signOut());

  // ============ 탭 전환 ============
  const tabButtons = document.querySelectorAll(".admin-tab");
  const tabPanes = document.querySelectorAll(".admin-tab-pane");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target");
      tabButtons.forEach((b) => b.classList.toggle("active", b === btn));
      tabPanes.forEach((p) => p.classList.toggle("active", p.id === target));
    });
  });

  // ============ 섹션(컬렉션) 공통 처리 ============
  const sections = []; // {collection, form, listEl, unsub, config}
  let active = false;

  /**
   * @param {object} cfg
   * @param {string} cfg.collection   Firestore 컬렉션 이름
   * @param {string} cfg.formId       등록 폼 id
   * @param {string} cfg.listId       목록 ul id
   * @param {string[]} cfg.fields     폼 필드(dataset key) 목록
   * @param {string} cfg.youtubeField YouTube URL이 들어있는 필드명 (검증용)
   * @param {boolean} cfg.youtubeRequired  YouTube URL 필수 여부
   */
  function setupSection(cfg) {
    const form = document.getElementById(cfg.formId);
    const listEl = document.getElementById(cfg.listId);
    const errorEl = form.querySelector("[data-error]");

    // 폼 제출: 문서 추가
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      showError(errorEl, "");

      const data = {};
      for (const f of cfg.fields) {
        const input = form.querySelector(`[data-field="${f}"]`);
        const val = (input.value || "").trim();
        data[f] = val;
      }

      if (!data.title) {
        showError(errorEl, "제목을 입력해주세요.");
        return;
      }

      // YouTube URL 검증
      const ytUrl = data[cfg.youtubeField];
      let videoId = null;
      if (ytUrl) {
        videoId = extractYoutubeId(ytUrl);
        if (!videoId) {
          showError(errorEl, "올바른 YouTube 링크가 아닙니다.");
          return;
        }
      } else if (cfg.youtubeRequired) {
        showError(errorEl, "YouTube URL을 입력해주세요.");
        return;
      }

      const docData = {
        ...data,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      if (videoId) docData.videoId = videoId;

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "등록 중…";
      try {
        await db.collection(cfg.collection).add(docData);
        form.reset();
      } catch (err) {
        console.error(`${cfg.collection} add error:`, err);
        showError(errorEl, "등록 실패: " + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "등록";
      }
    });

    sections.push({ cfg, form, listEl, unsub: null });
  }

  function renderAdminList(cfg, listEl, docs) {
    if (!docs.length) {
      listEl.innerHTML = '<li class="empty">등록된 항목이 없습니다.</li>';
      return;
    }
    listEl.innerHTML = docs
      .map((doc) => {
        const d = doc.data();
        const urlShown = d.url || d.videoUrl || "";
        return `
          <li class="admin-video-item">
            <div class="admin-video-info">
              <div class="admin-video-title">${escapeHtml(d.title || "")}</div>
              ${urlShown ? `<div class="admin-video-url">${escapeHtml(urlShown)}</div>` : ""}
            </div>
            <button class="btn btn-danger" data-id="${doc.id}">삭제</button>
          </li>`;
      })
      .join("");

    listEl.querySelectorAll("button[data-id]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (!confirm("정말 삭제하시겠습니까? (하위 댓글은 보안규칙상 삭제되지 않을 수 있습니다.)")) return;
        btn.disabled = true;
        try {
          await db.collection(cfg.collection).doc(id).delete();
        } catch (err) {
          console.error("delete error:", err);
          alert("삭제 실패: " + err.message);
          btn.disabled = false;
        }
      });
    });
  }

  function subscribeAll() {
    for (const s of sections) {
      s.unsub = db
        .collection(s.cfg.collection)
        .orderBy("createdAt", "desc")
        .onSnapshot(
          (snap) => renderAdminList(s.cfg, s.listEl, snap.docs),
          (err) => {
            console.error(`${s.cfg.collection} load error:`, err);
            s.listEl.innerHTML =
              '<li class="error">불러오지 못했습니다. (' +
              escapeHtml(err.message) +
              ")</li>";
          }
        );
    }
  }

  function unsubscribeAll() {
    for (const s of sections) {
      if (s.unsub) {
        s.unsub();
        s.unsub = null;
      }
    }
  }

  // 3개 섹션 설정
  setupSection({
    collection: "videos",
    formId: "video-form",
    listId: "video-list",
    fields: ["title", "url"],
    youtubeField: "url",
    youtubeRequired: true,
  });
  setupSection({
    collection: "recipes",
    formId: "recipe-form",
    listId: "recipe-list",
    fields: ["title", "videoUrl", "content"],
    youtubeField: "videoUrl",
    youtubeRequired: false,
  });
  setupSection({
    collection: "tools",
    formId: "tool-form",
    listId: "tool-list",
    fields: ["title", "videoUrl", "content"],
    youtubeField: "videoUrl",
    youtubeRequired: false,
  });

  // ============ 로그인 상태 ============
  auth.onAuthStateChanged((user) => {
    if (user) {
      loginSection.style.display = "none";
      adminSection.style.display = "block";
      userEmailSpan.textContent = user.email;
      if (!active) {
        subscribeAll();
        active = true;
      }
    } else {
      loginSection.style.display = "block";
      adminSection.style.display = "none";
      if (active) {
        unsubscribeAll();
        active = false;
      }
    }
  });
})();
