import { firebaseConfig } from './config.js';
import { StorageManager } from './firebase-storage.js';
import { FileManager }    from './FileManager.js';
import { showError, showSuccess, logError, friendlyFirebaseError } from './errorHandler.js';

// ── Firebase init ──────────────────────────────────────────
let firebaseReady = false;
let auth;
try {
  if (!firebase.apps.length) {
    console.log('[Firebase] Initializing project:', firebaseConfig.projectId);
    firebase.initializeApp(firebaseConfig);
  }
  auth = firebase.auth();
  firebaseReady = true;
  console.log('[Firebase] OK');
} catch (e) {
  showFatalError('Firebase init failed. Check js/config.js.<br><code>' + e.message + '</code>');
}

let storageManager;
let fileManager;
let currentRoute = 'my-files';
let allItems     = [];           // cache for search

// ── Folder navigation state ────────────────────────────────
// Stack entries: { id: string|null, name: string }
let folderStack = [{ id: null, name: 'My Files' }];
const currentFolderId = () => folderStack[folderStack.length - 1].id;

let unsubscribeListener  = null;
const permissionRetrySet = new Set();

// ── Wire static UI ────────────────────────────────────────
setupNavListeners();

// ── Auth gate ──────────────────────────────────────────────
if (firebaseReady) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      // Use absolute path + replace() to avoid back-button redirect loops
      window.location.replace('/login.html');
      return;
    }
    initAuthedUI(user);
  }, (err) => showFatalError('Auth error: ' + err.message));
}

// ── Authenticated bootstrap ────────────────────────────────
async function initAuthedUI(user) {
  try {
    storageManager = new StorageManager();
    await storageManager.ensureReady();
    fileManager    = new FileManager(user.uid, user.email);

    const profile = resolveUserProfile(user);
    const nameEl  = document.querySelector('.user-name');
    const emailEl = document.querySelector('.user-email');
    const imgEl   = document.querySelector('.user-profile img');
    if (nameEl)  nameEl.textContent  = profile.name;
    if (emailEl) emailEl.textContent = user.email || '';
    if (imgEl)   { imgEl.src = profile.photoUrl; imgEl.alt = profile.name + ' avatar'; }

    setupAuthListeners();
    switchRoute('my-files');
  } catch (err) {
    logError('Bootstrap', err);
    showFatalError('Failed to initialize: ' + err.message);
  }
}

// ── Static nav listeners (no auth needed) ─────────────────
function setupNavListeners() {
  document.querySelectorAll('.nav-item[data-route]').forEach((el) => {
    el.addEventListener('click', (e) => { e.preventDefault(); switchRoute(el.dataset.route); });
  });

  // Modal backdrop close
  ['shareModal', 'folderModal'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
    });
  });

  // Folder name input — submit on Enter
  document.getElementById('folderName')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('createFolderBtn')?.click();
  });
  document.getElementById('shareEmail')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('shareFileBtn')?.click();
  });
}

// ── Auth-dependent listeners ───────────────────────────────
function setupAuthListeners() {
  // Sign out
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (unsubscribeListener) unsubscribeListener();
    await auth.signOut();
  });

  // Upload button
  document.getElementById('uploadBtn')?.addEventListener('click', () =>
    document.getElementById('fileInput')?.click()
  );

  // Upload zone click
  document.getElementById('uploadZone')?.addEventListener('click', (e) => {
    if (e.target !== document.getElementById('fileInput'))
      document.getElementById('fileInput')?.click();
  });

  // File input
  document.getElementById('fileInput')?.addEventListener('change', (e) =>
    handleFiles(e.target.files)
  );

  // Drag & drop
  const zone = document.getElementById('uploadZone');
  zone?.addEventListener('dragover',  (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone?.addEventListener('dragleave', ()  => zone.classList.remove('drag-over'));
  zone?.addEventListener('drop',      (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  // Search
  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    renderItems(q ? allItems.filter((item) => item.name.toLowerCase().includes(q)) : allItems);
  });

  // Share confirm
  document.getElementById('shareFileBtn')?.addEventListener('click', shareHandler);

  // New Folder
  document.getElementById('newFolderBtn')?.addEventListener('click', () => {
    const input = document.getElementById('folderName');
    if (input) input.value = '';
    const modal = document.getElementById('folderModal');
    if (modal) { modal.style.display = 'flex'; setTimeout(() => input?.focus(), 50); }
  });

  document.getElementById('createFolderBtn')?.addEventListener('click', handleCreateFolder);
}

// ── Routing ────────────────────────────────────────────────
function switchRoute(route) {
  currentRoute = route;

  // Reset folder navigation when changing top-level route
  folderStack = [{ id: null, name: routeLabel(route) }];

  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-route="${route}"]`)?.classList.add('active');

  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = routeLabel(route);

  // Upload & New Folder only on My Files
  const actionBtns = document.getElementById('actionBtns');
  if (actionBtns) actionBtns.style.display = route === 'my-files' ? '' : 'none';

  const uploadZone = document.getElementById('uploadZone');
  if (uploadZone) uploadZone.style.display = route === 'my-files' ? '' : 'none';

  // Clear search
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  renderBreadcrumbs();

  if (!fileManager) return;
  loadCurrentView();
}

function routeLabel(route) {
  return ({ 'my-files': 'My Files', shared: 'Shared with Me', starred: 'Starred', recent: 'Recent', trash: 'Trash' })[route] || 'Files';
}

// ── Folder navigation ──────────────────────────────────────
function navigateToFolder(folderId, folderName) {
  folderStack.push({ id: folderId, name: folderName });
  renderBreadcrumbs();
  loadCurrentView();
}

window.navigateBreadcrumb = (index) => {
  folderStack = folderStack.slice(0, index + 1);
  renderBreadcrumbs();
  loadCurrentView();
};

function renderBreadcrumbs() {
  const el = document.getElementById('breadcrumbs');
  if (!el) return;

  if (currentRoute !== 'my-files' || folderStack.length <= 1) {
    el.innerHTML = '';
    return;
  }

  el.innerHTML = folderStack.map((crumb, i) => {
    const isLast = i === folderStack.length - 1;
    if (isLast) {
      return `<span class="breadcrumb-item"><span class="breadcrumb-current">${escapeHtml(crumb.name)}</span></span>`;
    }
    return `<span class="breadcrumb-item">
      <span class="breadcrumb-link" onclick="navigateBreadcrumb(${i})">${escapeHtml(crumb.name)}</span>
      <i class="fas fa-chevron-right breadcrumb-sep"></i>
    </span>`;
  }).join('');
}

// ── Load / Subscribe ───────────────────────────────────────
function loadCurrentView() {
  if (unsubscribeListener) unsubscribeListener();
  unsubscribeListener = null;
  renderLoading();

  const cb = (items) => {
    allItems = items;
    const q  = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
    renderItems(q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items);
  };

  const onErr = async (error) => {
    const key = currentRoute + ':' + (currentFolderId() ?? 'root');
    if (error?.code === 'permission-denied' && !permissionRetrySet.has(key) && auth.currentUser) {
      permissionRetrySet.add(key);
      try { await auth.currentUser.getIdToken(true); loadCurrentView(); return; }
      catch (e) { logError('Token refresh', e); }
    }
    logError(`Load ${currentRoute}`, error);
    renderRouteError(error);
  };

  if      (currentRoute === 'my-files') unsubscribeListener = fileManager.listenMyFiles(cb, onErr, currentFolderId());
  else if (currentRoute === 'shared')   unsubscribeListener = fileManager.listenSharedWithMe(cb, onErr);
  else if (currentRoute === 'starred')  unsubscribeListener = fileManager.listenStarred(cb, onErr);
  else if (currentRoute === 'recent')   unsubscribeListener = fileManager.listenRecent(cb, onErr);
  else if (currentRoute === 'trash')    unsubscribeListener = fileManager.listenTrash(cb, onErr);
}

// ── Render ─────────────────────────────────────────────────
function renderLoading() {
  const el = document.getElementById('filesList');
  if (el) el.innerHTML = `<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading…</p></div>`;
}

function renderItems(items) {
  const el = document.getElementById('filesList');
  if (!el) return;

  permissionRetrySet.delete(currentRoute);

  if (!items || items.length === 0) {
    const isTrash = currentRoute === 'trash';
    el.innerHTML = `<div class="empty-state">
      <i class="fas ${isTrash ? 'fa-trash' : 'fa-folder-open'}"></i>
      <p>${isTrash ? 'Trash is empty' : 'No files or folders here yet'}</p>
    </div>`;
    return;
  }

  const isTrash  = currentRoute === 'trash';

  el.innerHTML = items.map((item) => {
    const isFolder = item.type === 'folder';
    const cardClass = isFolder ? 'file-card folder-card' : 'file-card';

    const folderClick = isFolder
      ? `onclick="window.openFolder('${item.id}','${escapeAttr(item.name)}')" `
      : '';

    const iconHtml = isFolder
      ? `<div class="file-icon folder-icon"><i class="fas fa-folder"></i></div>`
      : `<div class="file-icon ${storageManager.getFileIcon(item.name)}">
           <i class="fas ${storageManager.getFontAwesomeIcon(item.name)}"></i>
         </div>`;

    const metaHtml = isFolder
      ? `<p class="file-meta"><span>Folder</span></p>`
      : `<p class="file-meta">
           <span>${formatFileSize(item.size)}</span>
           <span>•</span>
           <span>${formatDate(item.createdAt?.toDate ? item.createdAt.toDate() : item.createdAt)}</span>
         </p>`;

    let actionsHtml = '';
    if (isTrash) {
      actionsHtml = `
        <button class="action-btn restore" onclick="restoreFile('${item.id}')" title="Restore">
          <i class="fas fa-rotate-left"></i>
        </button>
        <button class="action-btn delete" onclick="permanentDeleteFile('${item.id}','${escapeAttr(item.storagePath || '')}')" title="Delete permanently">
          <i class="fas fa-trash"></i>
        </button>`;
    } else if (!isFolder) {
      actionsHtml = `
        <button class="action-btn" onclick="toggleStar('${item.id}',${!item.starred})" title="${item.starred ? 'Unstar' : 'Star'}">
          <i class="fas fa-star ${item.starred ? 'starred' : ''}"></i>
        </button>
        <button class="action-btn" onclick="window.open('${item.storageUrl}','_blank')" title="View">
          <i class="fas fa-eye"></i>
        </button>
        <button class="action-btn" onclick="openShareModal('${item.id}')" title="Share">
          <i class="fas fa-share-nodes"></i>
        </button>
        <button class="action-btn" onclick="downloadFile('${escapeAttr(item.storagePath)}','${escapeAttr(item.name)}')" title="Download">
          <i class="fas fa-download"></i>
        </button>
        <button class="action-btn delete" onclick="moveToTrash('${item.id}')" title="Move to Trash">
          <i class="fas fa-trash"></i>
        </button>`;
    } else {
      // Folder (not trash) — just star + trash
      actionsHtml = `
        <button class="action-btn" onclick="toggleStar('${item.id}',${!item.starred})" title="${item.starred ? 'Unstar' : 'Star'}">
          <i class="fas fa-star ${item.starred ? 'starred' : ''}"></i>
        </button>
        <button class="action-btn delete" onclick="moveToTrash('${item.id}')" title="Move to Trash">
          <i class="fas fa-trash"></i>
        </button>`;
    }

    return `
      <div class="${cardClass}" data-id="${item.id}" ${folderClick}>
        ${iconHtml}
        <div class="file-details">
          <h3 title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</h3>
          ${metaHtml}
        </div>
        <div class="file-actions">${actionsHtml}</div>
      </div>`;
  }).join('');
}

// ── Open folder ────────────────────────────────────────────
window.openFolder = (folderId, folderName) => {
  if (currentRoute !== 'my-files') return;
  navigateToFolder(folderId, folderName);
};

function renderRouteError(error) {
  const el = document.getElementById('filesList');
  if (!el) return;
  const msg = friendlyFirebaseError(error);
  el.innerHTML = `<div class="empty-state" style="color:#ffb4b4;">
    <i class="fas fa-triangle-exclamation"></i>
    <p>${escapeHtml(msg)}</p>
  </div>`;
  showError(msg);
}

function resolveUserProfile(user) {
  const pp = Array.isArray(user?.providerData) ? user.providerData : [];
  const name = String(user?.displayName || pp.find((p) => p?.displayName)?.displayName
    || (user?.email?.split('@')[0]) || 'User').trim();
  const photoUrl = String(user?.photoURL || pp.find((p) => p?.photoURL)?.photoURL || '').trim()
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0062ff&color=fff`;
  return { name, photoUrl };
}

// ── Create Folder ──────────────────────────────────────────
async function handleCreateFolder() {
  const input = document.getElementById('folderName');
  const name  = input?.value?.trim();
  if (!name) { showError('Please enter a folder name.'); return; }

  const btn = document.getElementById('createFolderBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating…'; }

  try {
    await fileManager.createFolder(name, currentFolderId());
    document.getElementById('folderModal').style.display = 'none';
    if (input) input.value = '';
    showSuccess(`Folder "${name}" created.`);
  } catch (err) {
    logError('Create folder', err);
    showError(`Could not create folder: ${friendlyFirebaseError(err)}`);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = 'Create'; }
  }
}

// ── Upload ─────────────────────────────────────────────────
async function handleFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  const user = auth.currentUser;
  if (!user) { showError('Not authenticated.'); return; }
  if (!storageManager || !fileManager) { showError('Not ready — refresh page.'); return; }

  const zone    = document.getElementById('uploadZone');
  const text    = zone?.querySelector('p');
  const uploadBtn = document.getElementById('uploadBtn');
  if (uploadBtn) uploadBtn.disabled = true;

  try {
    for (const file of files) {
      try {
        if (text) text.textContent = `Preparing ${file.name}…`;
        const { path, url } = await storageManager.uploadFile(file, user.uid, (pct) => {
          if (text) text.textContent = `Uploading ${file.name} (${pct}%)…`;
        });
        await fileManager.addFileMetadata(
          { name: file.name, size: file.size, type: file.type, storagePath: path, storageUrl: url, ownerEmail: user.email },
          currentFolderId()
        );
        showSuccess(`${file.name} uploaded.`);
      } catch (err) {
        logError('Upload', err);
        showError(`Failed to upload ${file.name}: ${friendlyFirebaseError(err)}`);
        if (err?.code === 'storage/bucket-not-found') break;
      }
    }
  } finally {
    if (uploadBtn) uploadBtn.disabled = false;
    if (text) text.innerHTML = 'Drag &amp; drop files or <span>browse</span>';
    const input = document.getElementById('fileInput');
    if (input) input.value = '';
  }
}

// ── Share ──────────────────────────────────────────────────
let _shareFileId = null;

window.openShareModal = (fileId) => {
  _shareFileId = fileId;
  const modal = document.getElementById('shareModal');
  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('shareEmail')?.focus(), 50);
  }
};

async function shareHandler() {
  const email = document.getElementById('shareEmail')?.value?.trim();
  if (!email) return showError('Please enter an email.');
  try {
    await fileManager.shareFile(_shareFileId, email);
    document.getElementById('shareEmail').value = '';
    document.getElementById('shareModal').style.display = 'none';
    showSuccess('File shared successfully.');
  } catch (err) {
    logError('Share', err);
    showError(`Share failed: ${friendlyFirebaseError(err)}`);
  }
}

// ── Star ───────────────────────────────────────────────────
window.toggleStar = async (id, starred) => {
  try {
    await fileManager.toggleStar(id, starred);
    showSuccess(starred ? 'Starred.' : 'Unstarred.');
  } catch (err) {
    logError('Star', err);
    showError(friendlyFirebaseError(err));
  }
};

// ── Download ───────────────────────────────────────────────
window.downloadFile = async (storagePath, fileName) => {
  try {
    const blob = await storageManager.downloadFile(storagePath);
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: fileName });
    document.body.appendChild(a); a.click();
    URL.revokeObjectURL(url); a.remove();
  } catch (err) {
    logError('Download', err);
    showError(`Download failed: ${friendlyFirebaseError(err)}`);
  }
};

// ── Move to Trash (Firestore only — keeps Storage file) ───
window.moveToTrash = async (id) => {
  if (!confirm('Move to trash?')) return;
  try {
    await fileManager.deleteFile(id);
    showSuccess('Moved to trash.');
  } catch (err) {
    logError('Trash', err);
    showError(friendlyFirebaseError(err));
  }
};

// ── Restore ────────────────────────────────────────────────
window.restoreFile = async (id) => {
  try {
    await fileManager.restoreFile(id);
    showSuccess('Restored.');
  } catch (err) {
    logError('Restore', err);
    showError(friendlyFirebaseError(err));
  }
};

// ── Permanently Delete ─────────────────────────────────────
window.permanentDeleteFile = async (id, storagePath) => {
  if (!confirm('Permanently delete? This cannot be undone.')) return;
  try {
    if (storagePath) await storageManager.deleteFile(storagePath);
    await fileManager.permanentlyDeleteFile(id);
    showSuccess('Deleted permanently.');
  } catch (err) {
    logError('Perm delete', err);
    showError(friendlyFirebaseError(err));
  }
};

// ── Fatal error ────────────────────────────────────────────
function showFatalError(html) {
  const el = document.getElementById('filesList');
  if (el) el.innerHTML = `<div class="empty-state" style="color:#ff6b6b;">
    <i class="fas fa-triangle-exclamation"></i><p>${html}</p></div>`;
  console.error('[MiniCloud Fatal]', html);
}

// ── Utils ──────────────────────────────────────────────────
function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes === 0) return '0 B';
  const k = 1024, sz = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (Math.round((bytes / k ** i) * 10) / 10) + ' ' + sz[i];
}

function formatDate(date) {
  if (!date) return 'Unknown';
  const d = date instanceof Date ? date : new Date(date);
  const days = Math.floor(Math.abs(new Date() - d) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function escapeHtml(s) {
  return String(s || '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

function escapeAttr(s) { return String(s || '').replaceAll("'", "\\'"); }
