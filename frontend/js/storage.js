// Firebase Storage
// Uses the global `firebase` object loaded via CDN in the HTML

export class StorageManager {
  constructor() {
    this.storage = firebase.storage();
    this._storageReadyPromise = null;
  }

  async ensureStorageReady() {
    if (this._storageReadyPromise) return this._storageReadyPromise;

    // Probe the configured bucket once. If Storage is initialized, this returns
    // object-not-found for a fake file; if not initialized, it returns bucket errors.
    this._storageReadyPromise = this.storage
      .ref('__storage_probe__/missing-file.txt')
      .getMetadata()
      .then(() => true)
      .catch((error) => {
        if (error?.code === 'storage/object-not-found') return true;

        if (error?.code === 'storage/bucket-not-found') {
          const err = new Error('Firebase Storage is not set up for this project. Open Firebase Console > Storage > Get started.');
          err.code = 'storage/bucket-not-found';
          throw err;
        }

        if (error?.code === 'storage/unauthorized') {
          const err = new Error('No permission to access Firebase Storage. Check Storage rules and sign in again.');
          err.code = 'storage/unauthorized';
          throw err;
        }

        const err = new Error(error?.message || 'Firebase Storage is unavailable.');
        err.code = error?.code || 'storage/unknown';
        throw err;
      });

    return this._storageReadyPromise;
  }

  sanitizeFilename(filename) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  // Upload a file to Firebase Storage
  // Returns { path, url }
  async uploadFile(file, userId, onProgress, timeoutMs = 120000) {
    await this.ensureStorageReady();

    const safeName = this.sanitizeFilename(file.name);
    const filePath = `files/${userId}/${Date.now()}_${safeName}`;
    const storageRef = this.storage.ref(filePath);

    return new Promise((resolve, reject) => {
      const uploadTask = storageRef.put(file, {
        contentType: file.type || 'application/octet-stream',
      });
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) return;
        try {
          uploadTask.cancel();
        } catch (_e) {
          // Ignore cancellation errors; we still reject below.
        }
        settled = true;
        const err = new Error('Upload timed out. Please try again.');
        err.code = 'storage/retry-limit-exceeded';
        reject(err);
      }, timeoutMs);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (settled) return;
          if (onProgress) {
            const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(Math.round(pct));
          }
        },
        (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          console.error('Firebase Storage upload error:', error);
          const err = new Error(error.message || 'Failed to upload file.');
          err.code = error.code;
          reject(err);
        },
        async () => {
          if (settled) return;
          try {
            const url = await uploadTask.snapshot.ref.getDownloadURL();
            settled = true;
            clearTimeout(timeoutId);
            resolve({ path: filePath, url });
          } catch (err) {
            settled = true;
            clearTimeout(timeoutId);
            const out = new Error(err.message || 'Failed to get download URL.');
            out.code = err?.code || 'storage/unknown';
            reject(out);
          }
        }
      );
    });
  }

  // Delete a file from Firebase Storage
  async deleteFile(filePath) {
    try {
      await this.storage.ref(filePath).delete();
    } catch (error) {
      // Ignore "object not found" errors (file already deleted)
      if (error.code !== 'storage/object-not-found') {
        console.error('Firebase Storage delete error:', error);
        throw new Error(error.message || 'Failed to delete file.');
      }
    }
  }

  // Download a file — fetches the blob via the public download URL
  async downloadFile(filePath) {
    try {
      const url = await this.storage.ref(filePath).getDownloadURL();
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed.');
      return response.blob();
    } catch (error) {
      console.error('Firebase Storage download error:', error);
      throw new Error(error.message || 'Failed to download file.');
    }
  }

  // ── Icon helpers (unchanged) ────────────────────────────
  getFileIcon(filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const iconMap = {
      pdf: 'pdf', doc: 'doc', docx: 'doc',
      xls: 'excel', xlsx: 'excel',
      ppt: 'ppt', pptx: 'ppt',
      jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', svg: 'image', webp: 'image',
      mp4: 'video', avi: 'video', mov: 'video', mkv: 'video',
      mp3: 'audio', wav: 'audio', ogg: 'audio',
      zip: 'archive', rar: 'archive', '7z': 'archive',
      txt: 'text', csv: 'excel',
    };
    return iconMap[ext] || 'file';
  }

  getFontAwesomeIcon(filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const iconMap = {
      pdf: 'fa-file-pdf',
      doc: 'fa-file-word', docx: 'fa-file-word',
      xls: 'fa-file-excel', xlsx: 'fa-file-excel',
      ppt: 'fa-file-powerpoint', pptx: 'fa-file-powerpoint',
      jpg: 'fa-file-image', jpeg: 'fa-file-image', png: 'fa-file-image',
      gif: 'fa-file-image', svg: 'fa-file-image', webp: 'fa-file-image',
      mp4: 'fa-file-video', avi: 'fa-file-video', mov: 'fa-file-video', mkv: 'fa-file-video',
      mp3: 'fa-file-audio', wav: 'fa-file-audio', ogg: 'fa-file-audio',
      zip: 'fa-file-zipper', rar: 'fa-file-zipper', '7z': 'fa-file-zipper',
      txt: 'fa-file-lines', csv: 'fa-file-csv',
      js: 'fa-file-code', html: 'fa-file-code', css: 'fa-file-code', json: 'fa-file-code',
      py: 'fa-file-code', ts: 'fa-file-code',
    };
    return iconMap[ext] || 'fa-file';
  }
}
