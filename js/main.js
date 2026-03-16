import { firebaseConfig } from "./config.js";
import { StorageManager } from "./storage.js";
import { FileManager } from "./fileManager.js";

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

let storageManager;
let fileManager;

let currentRoute = "my-files";
let unsubscribeListener = null;

auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  storageManager = new StorageManager();
  fileManager = new FileManager(user.uid);

  // hydrate header
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

  setupEventListeners();

  // default tab
  switchRoute("my-files");
});

function setupEventListeners() {
  // logout
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    if (unsubscribeListener) unsubscribeListener();
    await auth.signOut();
  });

  // sidebar tabs
  document.querySelectorAll(".nav-item[data-route]").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      switchRoute(item.dataset.route);
    });
  });

  // view toggle (grid/list) still works
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const view = btn.dataset.view;
      const filesList = document.getElementById("filesList");
      if (!filesList) return;

      if (view === "list") {
        filesList.classList.remove("files-grid");
        filesList.classList.add("files-list");
      } else {
        filesList.classList.remove("files-list");
        filesList.classList.add("files-grid");
      }
    });
  });

  // upload handlers (only make sense on my-files, but harmless)
  document.getElementById("fileInput")?.addEventListener("change", (e) => handleFiles(e.target.files));

  const uploadZone = document.getElementById("uploadZone");
  uploadZone?.addEventListener("dragover", (e) => e.preventDefault());
  uploadZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  });
}

function switchRoute(route) {
  currentRoute = route;

  // active UI state
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  document.querySelector(`.nav-item[data-route="${route}"]`)?.classList.add("active");

  // show upload only on my-files
  const uploadZone = document.getElementById("uploadZone");
  if (uploadZone) uploadZone.style.display = route === "my-files" ? "" : "none";

  // stop old listener
  if (unsubscribeListener) unsubscribeListener();
  unsubscribeListener = null;

  // attach new listener
  const cb = (files) => renderIfNonEmpty(files);

  if (route === "my-files") unsubscribeListener = fileManager.listenMyFiles(cb);
  else if (route === "shared") unsubscribeListener = fileManager.listenSharedWithMe(cb);
  else if (route === "starred") unsubscribeListener = fileManager.listenStarred(cb);
  else if (route === "recent") unsubscribeListener = fileManager.listenRecent(cb);
  else if (route === "trash") unsubscribeListener = fileManager.listenTrash(cb);
}

function renderIfNonEmpty(files) {
  // If Firestore returns empty, keep existing sample HTML.
  // Once you upload real files, it will switch to real rendering.
  if (!files || files.length === 0) return;

  const filesList = document.getElementById("filesList");
  if (!filesList) return;

  filesList.innerHTML = files
    .map(
      (file) => `
      <div class="file-card" data-file-id="${file.id}">
        <div class="file-icon ${storageManager.getFileIcon(file.name)}">
          <i class="fas ${storageManager.getFontAwesomeIcon(file.name)}"></i>
        </div>
        <div class="file-details">
          <h3 title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</h3>
          <p class="file-meta">
            <span>${formatFileSize(file.size)}</span>
            <span>•</span>
            <span>${formatDate(file.createdAt)}</span>
          </p>
        </div>
        <div class="file-actions">
          <button class="action-btn" onclick="window.open('${file.storageUrl}', '_blank')" title="View">
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
    `
    )
    .join("");
}

// Minimal upload functions (keep your existing upload logic if you already have it)
async function handleFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  const user = auth.currentUser;

  for (const file of files) {
    const { path, url } = await storageManager.uploadFile(file, user.uid);
    await fileManager.addFileMetadata({
      name: file.name,
      size: file.size,
      type: file.type,
      storagePath: path,
      storageUrl: url,
      ownerEmail: user.email
    });
  }

  const input = document.getElementById("fileInput");
  if (input) input.value = "";
}

// Share modal (uses your existing share modal HTML)
let shareFileId = null;

window.openShareModal = (fileId) => {
  shareFileId = fileId;
  const modal = document.getElementById("shareModal");
  if (modal) modal.style.display = "block";
};

document.getElementById("shareFileBtn")?.addEventListener("click", async () => {
  const email = document.getElementById("shareEmail")?.value?.trim();
  if (!email) return alert("Enter email");

  await fileManager.shareFile(shareFileId, email);

  document.getElementById("shareEmail").value = "";
  const modal = document.getElementById("shareModal");
  if (modal) modal.style.display = "none";
});

// Download + delete for rendered cards
window.downloadFile = async (storagePath, fileName) => {
  const blob = await storageManager.downloadFile(storagePath);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
};

window.deleteFile = async (fileId, storagePath) => {
  if (!confirm("Delete permanently?")) return;
  await storageManager.deleteFile(storagePath);
  await fileManager.deleteFile(fileId);
};

// Utils
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
