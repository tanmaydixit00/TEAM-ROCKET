// ============================================================
//  Firebase Storage Manager
//
//  Replaces the old Supabase storage layer.
//  Uses firebase.storage() from the compat CDN already loaded
//  in index.html / login.html.
// ============================================================

export class StorageManager {
  constructor() {
    this.storage = null;
  }

  async ensureReady() {
    if (this.storage) return;
    if (typeof firebase === 'undefined' || !firebase.storage) {
      throw new Error('Firebase Storage SDK not loaded.');
    }
    this.storage = firebase.storage();

    // Pre-flight check: verify the storage bucket is initialized
    try {
      await this.storage.ref('__ping__').getMetadata();
    } catch (err) {
      // 'object-not-found' is expected and means the bucket is reachable
      if (err.code !== 'storage/object-not-found') {
        if (err.code === 'storage/bucket-not-found') {
          throw new Error('Firebase Storage is not set up. Open Firebase Console > Storage > Get started.');
        }
        if (err.code === 'storage/unauthorized') {
          throw new Error('Storage access denied. Check Firebase Storage rules.');
        }
      }
    }
  }

  /** Sanitise filename for safe storage paths */
  sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  /**
   * Upload a file to Firebase Storage
   * @param {File}     file       - The file to upload
   * @param {string}   userId     - UID used as folder segment
   * @param {Function} onProgress - Called with 0–100 progress
   * @returns {Promise<{path: string, url: string}>}
   */
  async uploadFile(file, userId, onProgress) {
    await this.ensureReady();

    const safeName  = this.sanitizeFilename(file.name);
    const filePath  = `files/${userId}/${Date.now()}_${safeName}`;
    const ref       = this.storage.ref(filePath);

    return new Promise((resolve, reject) => {
      const task = ref.put(file);

      // 30-second timeout — prevents silent hangs
      const timeoutId = setTimeout(() => {
        try { task.cancel(); } catch (_) {}
        const err = new Error('Upload timed out after 30s. Check your connection and try again.');
        err.code = 'storage/retry-limit-exceeded';
        reject(err);
      }, 30000);

      task.on(
        'state_changed',
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          if (onProgress) onProgress(pct);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        async () => {
          clearTimeout(timeoutId);
          try {
            const url = await task.snapshot.ref.getDownloadURL();
            resolve({ path: filePath, url });
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }

  /**
   * Permanently delete a file from Firebase Storage.
   * Call this only when emptying trash, NOT when moving to trash.
   * @param {string} filePath
   */
  async deleteFile(filePath) {
    await this.ensureReady();
    try {
      await this.storage.ref(filePath).delete();
    } catch (error) {
      if (error.code !== 'storage/object-not-found') {
        throw error;
      }
    }
  }

  /**
   * Download a file as a Blob
   * @param {string} filePath
   * @returns {Promise<Blob>}
   */
  async downloadFile(filePath) {
    await this.ensureReady();
    const url      = await this.storage.ref(filePath).getDownloadURL();
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    return response.blob();
  }

  // ── Icon helpers ──────────────────────────────────────────
  getFileIcon(filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const map = {
      pdf: 'pdf',
      doc: 'doc', docx: 'doc',
      xls: 'excel', xlsx: 'excel', csv: 'excel',
      ppt: 'ppt', pptx: 'ppt',
      jpg: 'image', jpeg: 'image', png: 'image',
      gif: 'image', svg: 'image', webp: 'image',
      mp4: 'video', avi: 'video', mov: 'video', mkv: 'video',
      mp3: 'audio', wav: 'audio', ogg: 'audio',
      zip: 'archive', rar: 'archive', '7z': 'archive',
      txt: 'text',
    };
    return map[ext] || 'file';
  }

  getFontAwesomeIcon(filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const map = {
      pdf: 'fa-file-pdf',
      doc: 'fa-file-word',   docx: 'fa-file-word',
      xls: 'fa-file-excel',  xlsx: 'fa-file-excel', csv: 'fa-file-csv',
      ppt: 'fa-file-powerpoint', pptx: 'fa-file-powerpoint',
      jpg: 'fa-file-image',  jpeg: 'fa-file-image', png: 'fa-file-image',
      gif: 'fa-file-image',  svg: 'fa-file-image',  webp: 'fa-file-image',
      mp4: 'fa-file-video',  avi: 'fa-file-video',  mov: 'fa-file-video', mkv: 'fa-file-video',
      mp3: 'fa-file-audio',  wav: 'fa-file-audio',  ogg: 'fa-file-audio',
      zip: 'fa-file-zipper', rar: 'fa-file-zipper', '7z': 'fa-file-zipper',
      txt: 'fa-file-lines',
      js:  'fa-file-code',   ts: 'fa-file-code',    html: 'fa-file-code',
      css: 'fa-file-code',   json: 'fa-file-code',  py: 'fa-file-code',
    };
    return map[ext] || 'fa-file';
  }
}
