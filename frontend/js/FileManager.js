// Firestore file metadata manager
// Uses the global `firebase` object loaded via CDN in the HTML

export class FileManager {
  constructor(userId) {
    this.userId = userId;
    // Lazy-init: Firestore is accessed only after firebase.initializeApp() has run
    this.db = firebase.firestore();
    this.filesCollection = this.db.collection('files');
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

  listenMyFiles(callback) {
    return this.filesCollection
      .where('ownerId', '==', this.userId)
      .where('trashed', '==', false)
      .orderBy('createdAt', 'desc')
      .onSnapshot((snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }

  listenSharedWithMe(callback) {
    return this.filesCollection
      .where('sharedWith', 'array-contains', this.userId)
      .where('trashed', '==', false)
      .orderBy('createdAt', 'desc')
      .onSnapshot((snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }

  listenStarred(callback) {
    return this.filesCollection
      .where('ownerId', '==', this.userId)
      .where('starred', '==', true)
      .where('trashed', '==', false)
      .orderBy('createdAt', 'desc')
      .onSnapshot((snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }

  listenRecent(callback) {
    return this.filesCollection
      .where('ownerId', '==', this.userId)
      .where('trashed', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .onSnapshot((snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }

  listenTrash(callback) {
    return this.filesCollection
      .where('ownerId', '==', this.userId)
      .where('trashed', '==', true)
      .orderBy('createdAt', 'desc')
      .onSnapshot((snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }

  async shareFile(fileId, email) {
    await this.filesCollection.doc(fileId).update({
      sharedWith: firebase.firestore.FieldValue.arrayUnion(email),
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
