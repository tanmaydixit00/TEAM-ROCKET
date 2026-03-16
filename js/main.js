Here is your **main.js with all comments removed**:

```javascript
import { firebaseConfig } from "./config.js";
import { StorageManager } from "./storage.js";
import { FileManager } from "./fileManager.js";

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

let storageManager = null;
let fileManager = null;
let currentFileIdForSharing = null;
let unsubscribeListener = null;

auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  initializeApp(user);
});

function initializeApp(user) {
  const userEmailEl = document.querySelector(".user-email");
  const userNameEl = document.querySelector(".user-name");
  const userAvatarEl = document.querySelector(".user-profile img");

  if (userEmailEl) userEmailEl.textContent = user.email || "";
  if (userNameEl) userNameEl.textContent = user.displayName || user.email || "User";
  if (userAvatarEl) {
    userAvatarEl.src =
      user.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email || "User")}&background=667eea&color=fff`;
  }

  storageManager = new StorageManager();
  fileManager = new FileManager(user.uid);

  unsubscribeListener = fileManager.listenToFiles(displayFiles);

  setupEventListeners();
}

function setupEventListeners() {
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try {
      if (unsubscribeListener) unsubscribeListener();
      await auth.signOut();
    } catch (e) {
      console.error(e);
    }
  });

  const fileInput = document.getElementById("fileInput");
  fileInput?.addEventListener("change", (e) => handleFiles(e.target.files));

  const uploadZone = document.getElementById("uploadZone");
  uploadZone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = "var(--primary)";
    uploadZone.style.background = "rgba(102, 126, 234, 0.05)";
  });

  uploadZone?.addEventListener("dragleave", (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = "var(--border-color)";
    uploadZone.style.background = "rgba(26, 26, 46, 0.5)";
  });

  uploadZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = "var(--border-color)";
    uploadZone.style.background = "rgba(26, 26, 46, 0.5)";
    handleFiles(e.dataTransfer.files);
  });

  const searchInput = document.querySelector(".search-bar input");
  let searchTimeout = null;

  searchInput?.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      const term = e.target.value.trim();
      if (!term) {
        const files = await fileManager.getUserFiles();
        displayFiles(files);
      } else {
        const results = await fileManager.searchFiles(term);
        displayFiles(results);
      }
    }, 250);
  });

  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const view = btn.dataset.view;
      const list = document.getElementById("filesList");
      if (!list) return;

      if (view === "list") {
        list.classList.remove("files-grid");
        list.classList.add("files-list");
      } else {
        list.classList.remove("files-list");
        list.classList.add("files-grid");
      }
    });
  });

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const filter = btn.textContent.trim().toLowerCase();
      const files = await fileManager.getUserFiles();

      if (filter === "all") return displayFiles(files);

      const filtered = files.filter((file) => {
        const t = (file.type || "").toLowerCase();
        if (filter === "documents") return t.includes("pdf") || t.includes("word") || t.includes("document") || t.includes("text");
        if (filter === "images") return t.includes("image");
        if (filter === "videos") return t.includes("video");
        return true;
      });

      displayFiles(filtered);
    });
  });

  document.querySelectorAll(".close-modal").forEach((btn) => btn.addEventListener("click", closeShareModal));
  document.querySelector(".modal-overlay")?.addEventListener("click", closeShareModal);

  document.getElementById("shareFileBtn")?.addEventListener("click", handleShareFile);
}

async function handleFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  const progressDiv = document.getElementById("uploadProgress");
  const user = auth.currentUser;

  if (progressDiv) {
    progressDiv.innerHTML = `
      <div style="margin-top: 16px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span>Uploading ${files.length} file(s)...</span>
          <span id="uploadPercent">0%</span>
        </div>
        <div style="height:4px;background:var(--bg-tertiary);border-radius:2px;overflow:hidden;">
          <div id="uploadBar" style="height:100%;width:0%;background:linear-gradient(90deg,var(--primary),var(--accent));transition:width .2s;"></div>
        </div>
      </div>
    `;
  }

  try {
    let completed = 0;

    for (const file of files) {
      const { path, url } = await storageManager.uploadFile(file, user.uid, (p) => {
        const overall = ((completed + p / 100) / files.length) * 100;
        updateUploadProgress(overall);
      });

      await fileManager.addFileMetadata({
        name: file.name,
        size: file.size,
        type: file.type,
        storagePath: path,
        storageUrl: url,
        ownerEmail: user.email
      });

      completed++;
      updateUploadProgress((completed / files.length) * 100);
    }

    if (progressDiv) {
      progressDiv.innerHTML = `
        <div style="margin-top: 16px; padding: 12px; background: rgba(16, 185, 129, 0.15);
          border: 1px solid var(--success); border-radius: var(--radius-sm); color: var(--success);">
          <i class="fas fa-check-circle"></i> Upload complete!
        </div>
      `;
      setTimeout(() => (progressDiv.innerHTML = ""), 2500);
    }

    const fileInput = document.getElementById("fileInput");
    if (fileInput) fileInput.value = "";
  } catch (err) {
    console.error(err);
    if (progressDiv) {
      progressDiv.innerHTML = `
        <div style="margin-top: 16px; padding: 12px; background: rgba(239, 68, 68, 0.15);
          border: 1px solid var(--danger); border-radius: var(--radius-sm); color: var(--danger);">
          <i class="fas fa-exclamation-circle"></i> Upload failed: ${err.message}
        </div>
      `;
    }
  }
}

function updateUploadProgress(percent) {
  const bar = document.getElementById("uploadBar");
  const pct = document.getElementById("uploadPercent");
  if (bar) bar.style.width = percent + "%";
  if (pct) pct.textContent = Math.round(percent) + "%";
}

function displayFiles(files) {
  const filesList = document.getElementById("filesList");
  if (!filesList) return;

  if (!files || files.length === 0) {
    filesList.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding: 60px 20px; color: var(--text-muted);">
        <i class="fas fa-folder-open" style="font-size: 64px; margin-bottom: 16px; opacity: 0.3;"></i>
        <p style="font-size: 18px;">No files yet</p>
        <p style="font-size: 14px; margin-top: 8px;">Upload some files to get started!</p>
      </div>
    `;
    return;
  }

  filesList.innerHTML = files
    .map((file) => {
      const iconClass = storageManager.getFileIcon(file.name);
      const faIcon = storageManager.getFontAwesomeIcon(file.name);

      return `
        <div class="file-card" data-file-id="${file.id}">
          <div class="file-icon ${iconClass}">
            <i class="fas ${faIcon}"></i>
          </div>

          <div class="file-details">
            <h3 title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</h3>
            <p class="file-meta">
              <span>${formatFileSize(file.size)}</span>
              <span>•</span>
              <span>${formatDate(file.createdAt)}</span>
            </p>

            ${
              file.sharedWith && file.sharedWith.length
                ? `
                <div class="shared-badge">
                  <i class="fas fa-users"></i>
                  Shared with ${file.sharedWith.length} ${file.sharedWith.length === 1 ? "person" : "people"}
                </div>`
                : ""
            }
          </div>

          <div class="file-actions">
            <button class="action-btn" onclick="viewFile('${file.storageUrl}')" title="View">
              <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn" onclick="openShareModal('${file.id}')" title="Share">
              <i class="fas fa-share-nodes"></i>
            </button>
            <button class="action-btn" onclick="downloadFile('${file.storagePath}', '${escapeAttr(file.name)}')" title="Download">
              <i class="fas fa-download"></i>
            </button>
            <button class="action-btn delete" onclick="deleteFile('${file.id}', '${file.storagePath}')" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

window.viewFile = (url) => window.open(url, "_blank");

window.downloadFile = async (storagePath, fileName) => {
  try {
    const blob = await storageManager.downloadFile(storagePath);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  } catch (err) {
    console.error(err);
    alert("Download failed: " + err.message);
  }
};

window.deleteFile = async (fileId, storagePath) => {
  if (!confirm("Delete this file permanently?")) return;

  try {
    await storageManager.deleteFile(storagePath);
    await fileManager.deleteFile(fileId);
  } catch (err) {
    console.error(err);
    alert("Delete failed: " + err.message);
  }
};

window.openShareModal = (fileId) => {
  currentFileIdForSharing = fileId;
  const modal = document.getElementById("shareModal");
  if (modal) modal.style.display = "block";
};

function closeShareModal() {
  const modal = document.getElementById("shareModal");
  if (modal) modal.style.display = "none";
  const input = document.getElementById("shareEmail");
  if (input) input.value = "";
  currentFileIdForSharing = null;
}

async function handleShareFile() {
  const email = document.getElementById("shareEmail")?.value?.trim();
  if (!email) return alert("Enter an email address.");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return alert("Enter a valid email.");

  try {
    await fileManager.shareFile(currentFileIdForSharing, email);
    closeShareModal();
  } catch (err) {
    console.error(err);
    alert("Share failed: " + err.message);
  }
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + " " + sizes[i];
}

function formatDate(date) {
  if (!date) return "Unknown";
  const now = new Date();
  const diffDays = Math.ceil(Math.abs(now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(str) {
  return String(str || "").replaceAll("'", "\\'");
}
```

If you want, I can also **clean this code further (remove redundant checks, improve performance, and reduce ~80–100 lines)** while keeping functionality the same.
