// Firestore file metadata manager
// Uses the global `firebase` object loaded via CDN in the HTML

export class FileManager {
  constructor(userId, userEmail = '') {
    this.userId = userId;
    this.userEmail = String(userEmail || '').trim().toLowerCase();
    // Lazy-init: Firestore is accessed only after firebase.initializeApp() has run
    this.db = firebase.firestore();
    this.filesCollection = this.db.collection('files');
  }

  getCreatedAtMs(file) {
    const value = file?.createdAt;
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  mapAndSortDocs(snapshot) {
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => this.getCreatedAtMs(b) - this.getCreatedAtMs(a));
  }

  isIndexOrOrderError(error) {
    const message = String(error?.message || '').toLowerCase();
    return error?.code === 'failed-precondition' || message.includes('index') || message.includes('order by');
  }

  listenWithFallback(primaryQueryFactory, fallbackQueryFactory, callback, onError, options = {}) {
    const emit = (snapshot) => {
      let files = this.mapAndSortDocs(snapshot);
      if (typeof options.limit === 'number') {
        files = files.slice(0, options.limit);
      }
      callback(files);
    };

    let fallbackUnsubscribe = null;
    const primaryUnsubscribe = primaryQueryFactory().onSnapshot(
      emit,
      (error) => {
        if (fallbackQueryFactory && this.isIndexOrOrderError(error)) {
          fallbackUnsubscribe = fallbackQueryFactory().onSnapshot(
            emit,
            (fallbackError) => {
              if (onError) onError(fallbackError);
            }
          );
          return;
        }
        if (onError) onError(error);
      }
    );

    return () => {
      if (typeof primaryUnsubscribe === 'function') primaryUnsubscribe();
      if (typeof fallbackUnsubscribe === 'function') fallbackUnsubscribe();
    };
  }

  async addFileMetadata(fileData) {
    const metadata = {
      name: fileData.name,
      size: fileData.size,
      type: fileData.type || 'application/octet-stream',
      storagePath: fileData.storagePath,
      storageUrl: fileData.storageUrl,
      ownerId: this.userId,
      ownerEmail: fileData.ownerEmail || '',
      sharedWith: [],
      starred: false,
      trashed: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await this.filesCollection.add(metadata);
    return docRef.id;
  }

  listenMyFiles(callback, onError) {
    return this.listenWithFallback(
      () => this.filesCollection
        .where('ownerId', '==', this.userId)
        .where('trashed', '==', false)
        .orderBy('createdAt', 'desc'),
      () => this.filesCollection
        .where('ownerId', '==', this.userId)
        .where('trashed', '==', false),
      callback,
      onError
    );
  }

  listenSharedWithMe(callback, onError) {
    const sharedIdentity = this.userEmail || this.userId;
    return this.listenWithFallback(
      () => this.filesCollection
        .where('sharedWith', 'array-contains', sharedIdentity)
        .where('trashed', '==', false)
        .orderBy('createdAt', 'desc'),
      () => this.filesCollection
        .where('sharedWith', 'array-contains', sharedIdentity)
        .where('trashed', '==', false),
      callback,
      onError
    );
  }

  listenStarred(callback, onError) {
    return this.listenWithFallback(
      () => this.filesCollection
        .where('ownerId', '==', this.userId)
        .where('starred', '==', true)
        .where('trashed', '==', false)
        .orderBy('createdAt', 'desc'),
      () => this.filesCollection
        .where('ownerId', '==', this.userId)
        .where('starred', '==', true)
        .where('trashed', '==', false),
      callback,
      onError
    );
  }

  listenRecent(callback, onError) {
    return this.listenWithFallback(
      () => this.filesCollection
        .where('ownerId', '==', this.userId)
        .where('trashed', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(10),
      () => this.filesCollection
        .where('ownerId', '==', this.userId)
        .where('trashed', '==', false),
      callback,
      onError,
      { limit: 10 }
    );
  }

  listenTrash(callback, onError) {
    return this.listenWithFallback(
      () => this.filesCollection
        .where('ownerId', '==', this.userId)
        .where('trashed', '==', true)
        .orderBy('createdAt', 'desc'),
      () => this.filesCollection
        .where('ownerId', '==', this.userId)
        .where('trashed', '==', true),
      callback,
      onError
    );
  }

  async shareFile(fileId, email) {
    await this.filesCollection.doc(fileId).update({
      sharedWith: firebase.firestore.FieldValue.arrayUnion(String(email || '').trim().toLowerCase()),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  async deleteFile(fileId) {
    await this.filesCollection.doc(fileId).update({
      trashed: true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  async permanentlyDeleteFile(fileId) {
    await this.filesCollection.doc(fileId).delete();
  }

  async toggleStar(fileId, starred) {
    await this.filesCollection.doc(fileId).update({
      starred,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
}
