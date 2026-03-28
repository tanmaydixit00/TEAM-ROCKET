import { firebaseConfig } from './config.js';
import { StorageManager } from './storage.js';
import { FileManager } from './FileManager.js';
import { showError, showSuccess, logError, friendlyFirebaseError } from './errorHandler.js';

// ── Firebase init ─────────────────────────────────────────
let firebaseReady = false;
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  firebaseReady = true;
} catch (e) {
  showFatalError('Firebase initialization failed. Check your credentials in js/config.js.<br><code>' + e.message + '</code>');
}

const auth = firebase.auth();

let storageManager;
let fileManager;
let currentRoute = 'my-files';
let unsubscribeListener = null;
const permissionRetryByRoute = new Set();

// ── Wire up UI immediately (no auth needed for navigation) ─
setupNavListeners();

// ── Auth gate ─────────────────────────────────────────────
if (firebaseReady) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    initAuthedUI(user);
  }, (err) => {
    showFatalError('Authentication error: ' + err.message);
  });
}

// ── Authenticated init ────────────────────────────────────
function initAuthedUI(user) {
  storageManager = new StorageManager();
  fileManager = new FileManager(user.uid, user.email);

  const profile = resolveUserProfile(user);

  // Hydrate header
  const userEmailEl = document.querySelector('.user-email');
  const userNameEl  = document.querySelector('.user-name');
  const userAvatarEl = document.querySelector('.user-profile img');

  if (userEmailEl) userEmailEl.textContent = user.email || '';
  if (userNameEl)  userNameEl.textContent  = profile.name;
  if (userAvatarEl) {
    userAvatarEl.src = profile.photoUrl;
    userAvatarEl.alt = `${profile.name} avatar`;
  }

  setupAuthListeners();
  switchRoute('my-files');
}

// ── Nav & view listeners (no auth required) ───────────────
function setupNavListeners() {
  // Sidebar tabs
  document.querySelectorAll('.nav-item[data-route]').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchRoute(item.dataset.route);
    });
  });

  // Grid / List view toggle
  document.querySelectorAll('.view-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const filesList = document.getElementById('filesList');
      if (!filesList) return;
      if (btn.dataset.view === 'list') {
        filesList.classList.replace('files-grid', 'files-list');
      } else {
        filesList.classList.replace('files-list', 'files-grid');
      }
    });
  });

  // Share modal close on backdrop click
  document.getElementById('shareModal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
  });
}

// ── Auth-dependent listeners ──────────────────────────────
function setupAuthListeners() {
  // Logout / Sign Out
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (unsubscribeListener) unsubscribeListener();
    await auth.signOut();
    // onAuthStateChanged fires with null → redirect to login.html
  });

  // Upload button → open file picker
  document.getElementById('uploadBtn')?.addEventListener('click', () => {
    document.getElementById('fileInput')?.click();
  });

  // File input change
  document.getElementById('fileInput')?.addEventListener('change', (e) =>
    handleFiles(e.target.files)
  );

  // Drag & drop
  const uploadZone = document.getElementById('uploadZone');
  uploadZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  // Share confirm button
  document.getElementById('shareFileBtn')?.addEventListener('click', shareHandler);
}

// ── Routing ───────────────────────────────────────────────
function switchRoute(route) {
  // Don't switch if file manager isn't ready yet
  if (!fileManager && route !== currentRoute) {
    // Still update active state in sidebar
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-route="${route}"]`)?.classList.add('active');
    return;
  }

  currentRoute = route;

  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-route="${route}"]`)?.classList.add('active');

  const titleMap = {
    'my-files': 'My Files',
    shared:     'Shared with Me',
    starred:    'Starred',
    recent:     'Recent',
    trash:      'Trash',
  };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titleMap[route] || 'Files';

  // Upload zone only on my-files
  const uploadZone = document.getElementById('uploadZone');
  if (uploadZone) uploadZone.style.display = route === 'my-files' ? '' : 'none';

  if (!fileManager) return;

  // Tear down old real-time listener
  if (unsubscribeListener) unsubscribeListener();
  unsubscribeListener = null;

  renderLoading();

  const cb = (files) => renderFiles(files);
  const onRouteError = async (error) => {
    if (error?.code === 'permission-denied' && !permissionRetryByRoute.has(route) && auth.currentUser) {
      permissionRetryByRoute.add(route);
      try {
        await auth.currentUser.getIdToken(true);
        switchRoute(route);
        return;
      } catch (refreshErr) {
        logError('Auth token refresh', refreshErr);
      }
    }

    logError(`Load ${route} files`, error);
    renderRouteError(error);
  };

  if (route === 'my-files')  unsubscribeListener = fileManager.listenMyFiles(cb, onRouteError);
  else if (route === 'shared')   unsubscribeListener = fileManager.listenSharedWithMe(cb, onRouteError);
  else if (route === 'starred')  unsubscribeListener = fileManager.listenStarred(cb, onRouteError);
  else if (route === 'recent')   unsubscribeListener = fileManager.listenRecent(cb, onRouteError);
  else if (route === 'trash')    unsubscribeListener = fileManager.listenTrash(cb, onRouteError);
}

// ── Render helpers ────────────────────────────────────────
function renderLoading() {
  const el = document.getElementById('filesList');
  if (el) el.innerHTML = `<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading files…</p></div>`;
}

function renderFiles(files) {
  const el = document.getElementById('filesList');
  if (!el) return;

  permissionRetryByRoute.delete(currentRoute);

  if (!files || files.length === 0) {
    el.innerHTML = `<div class="empty-state"><i class="fas fa-folder-open"></i><p>No files here yet</p></div>`;
    return;
  }

  el.innerHTML = files.map((file) => `
    <div class="file-card" data-file-id="${file.id}">
      <div class="file-icon ${storageManager.getFileIcon(file.name)}">
        <i class="fas ${storageManager.getFontAwesomeIcon(file.name)}"></i>
      </div>
      <div class="file-details">
        <h3 title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</h3>
        <p class="file-meta">
          <span>${formatFileSize(file.size)}</span>
          <span>•</span>
          <span>${formatDate(file.createdAt?.toDate ? file.createdAt.toDate() : file.createdAt)}</span>
        </p>
      </div>
      <div class="file-actions">
        <button class="action-btn" onclick="window.open('${file.storageUrl}','_blank')" title="View">
          <i class="fas fa-eye"></i>
        </button>
        <button class="action-btn" onclick="openShareModal('${file.id}')" title="Share">
          <i class="fas fa-share-nodes"></i>
        </button>
        <button class="action-btn" onclick="downloadFile('${file.storagePath}','${escapeAttr(file.name)}')" title="Download">
          <i class="fas fa-download"></i>
        </button>
        <button class="action-btn delete" onclick="deleteFile('${file.id}','${file.storagePath}')" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>`).join('');
}

function renderRouteError(error) {
  const el = document.getElementById('filesList');
  if (!el) return;

  const message = friendlyFirebaseError(error);
  el.innerHTML = `
    <div class="empty-state" style="color:#ffb4b4;">
      <i class="fas fa-triangle-exclamation"></i>
      <p>${escapeHtml(message)}</p>
    </div>`;

  showError(message);
}

function resolveUserProfile(user) {
  const providerProfiles = Array.isArray(user?.providerData) ? user.providerData : [];
  const providerName = providerProfiles.find((item) => item?.displayName)?.displayName || '';
  const providerPhoto = providerProfiles.find((item) => item?.photoURL)?.photoURL || '';

  const email = String(user?.email || '').trim();
  const emailAlias = email.includes('@') ? email.split('@')[0] : '';

  const name = String(user?.displayName || providerName || emailAlias || 'User').trim();
  const photoUrl = String(user?.photoURL || providerPhoto || '').trim() ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff`;

  return { name, photoUrl };
}

// ── Upload ────────────────────────────────────────────────
async function handleFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  const user = auth.currentUser;
  if (!user) return;

  const uploadZone = document.getElementById('uploadZone');
  const uploadText = uploadZone?.querySelector('p');
  const uploadBtn = document.getElementById('uploadBtn');

  if (uploadBtn) uploadBtn.disabled = true;

  try {
    for (const file of files) {
      try {
        if (uploadText) uploadText.textContent = `Preparing upload for ${file.name}…`;
        const { path, url } = await storageManager.uploadFile(
          file,
          user.uid,
          (pct) => {
            if (uploadText) uploadText.textContent = `Uploading ${file.name} (${pct}%)…`;
          }
        );
        await fileManager.addFileMetadata({
          name: file.name, size: file.size, type: file.type,
          storagePath: path, storageUrl: url, ownerEmail: user.email,
        });
        showSuccess(`${file.name} uploaded successfully.`);
      } catch (err) {
        logError('Upload', err);
        const message = friendlyFirebaseError(err);
        showError(`Failed to upload ${file.name}: ${message}`);
        if (uploadText) uploadText.textContent = `Upload failed for ${file.name}: ${message}`;

        // Stop processing more files if project storage itself is unavailable.
        if (err?.code === 'storage/bucket-not-found') {
          break;
        }
      }
    }
  } finally {
    if (uploadBtn) uploadBtn.disabled = false;
    if (uploadText) uploadText.innerHTML = 'Drag &amp; drop files or <span>browse</span>';
  }

  const input = document.getElementById('fileInput');
  if (input) input.value = '';
}

// ── Share ─────────────────────────────────────────────────
let shareFileId = null;

window.openShareModal = (fileId) => {
  shareFileId = fileId;
  const modal = document.getElementById('shareModal');
  if (modal) modal.style.display = 'flex';
};

async function shareHandler() {
  const email = document.getElementById('shareEmail')?.value?.trim();
  if (!email) return showError('Please enter an email address.');
  try {
    await fileManager.shareFile(shareFileId, email);
    document.getElementById('shareEmail').value = '';
    document.getElementById('shareModal').style.display = 'none';
    showSuccess('File shared successfully.');
  } catch (err) {
    logError('Share', err);
    showError(`Share failed: ${friendlyFirebaseError(err)}`);
  }
}

// ── Download ──────────────────────────────────────────────
window.downloadFile = async (storagePath, fileName) => {
  try {
    const blob = await storageManager.downloadFile(storagePath);
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  } catch (err) {
    logError('Download', err);
    showError(`Download failed: ${friendlyFirebaseError(err)}`);
  }
};

// ── Delete ────────────────────────────────────────────────
window.deleteFile = async (fileId, storagePath) => {
  if (!confirm('Move this file to trash?')) return;
  try {
    await storageManager.deleteFile(storagePath);
    await fileManager.deleteFile(fileId);
  } catch (err) {
    logError('Delete', err);
    showError(`Delete failed: ${friendlyFirebaseError(err)}`);
  }
};

// ── Fatal error display ───────────────────────────────────
function showFatalError(html) {
  const el = document.getElementById('filesList');
  if (el) {
    el.innerHTML = `
      <div class="empty-state" style="color:#ff6b6b;">
        <i class="fas fa-triangle-exclamation"></i>
        <p>${html}</p>
      </div>`;
  }
  console.error('MiniCloud:', html);
}

// ── Utils ─────────────────────────────────────────────────
function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes === 0) return '0 Bytes';
  const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
}

function formatDate(date) {
  if (!date) return 'Unknown';
  const d = date instanceof Date ? date : new Date(date);
  const diffDays = Math.floor(Math.abs(new Date() - d) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)   return `${diffDays} days ago`;
  if (diffDays < 30)  return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

function escapeAttr(str) {
  return String(str || '').replaceAll("'", "\\'");
}
