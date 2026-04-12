# MiniCloud

A cloud file-storage application built with Firebase (Auth + Firestore) and Supabase Storage, with a vanilla HTML/CSS/JS frontend.

---

## Project Structure

```
MiniCloud/
├── frontend/                 # Static HTML/CSS/JS frontend
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── main.js           # Dashboard app logic
│   │   ├── FileManager.js    # Firestore file/folder metadata manager
│   │   ├── supabase-storage.js # Supabase file-storage manager
│   │   ├── auth.js           # Login / register logic
│   │   ├── config.js         # Firebase & Supabase configuration
│   │   ├── config.example.js # Configuration template
│   │   ├── errorHandler.js   # Error display helpers
│   │   └── supabase-config.js
│   ├── index.html            # Dashboard page
│   └── login.html            # Login / Sign-up page
├── firebase.json
├── firestore.rules
└── storage.rules
```

---

## Frontend Setup

The frontend is static HTML — no build step required.

### 1. Configure Firebase credentials

```bash
cp frontend/js/config.example.js frontend/js/config.js
```

Edit `frontend/js/config.js` and replace the placeholder values with your Firebase project credentials.

> **Where to find these values**: Firebase Console → Project Settings → General → "Your apps" → Web app → Config snippet.

### 2. Serve the frontend

```bash
npx http-server frontend/
# or open frontend/login.html directly in your browser
```

---

## Features

### Folder Navigation

- **Create folders**: Click the **New Folder** button and enter a name.
- **Open a folder**: Click on any folder card to navigate into it and see its contents.
- **Breadcrumb navigation**: A breadcrumb trail appears at the top when you are inside a folder. Click any segment to jump back to that level.
- **Back to root**: Click the first breadcrumb item (e.g. "My Files") to return to the root.
- Folder navigation is scoped to the **My Files** view.

### Upload Files into a Folder

- **Root upload**: While viewing **My Files** at the root level, drag & drop files onto the upload zone or click **Upload**.
- **Upload into a folder**: Navigate into a folder first (click it), then use the same **Upload** button or drag & drop. Files are automatically associated with the currently open folder.
- Validation: files exceeding **100 MB** or with blocked extensions (`.exe`, `.bat`, etc.) are rejected before upload.
- Progress feedback is shown in the upload zone while uploading.

### Sharing

- **Share a file or folder**: Hover over any file or folder card to reveal its action buttons, then click the **share** button (share icon).
- A modal will appear asking for the recipient's email address.
- Click **Next** to add the recipient to the item's `sharedWith` list in Firestore and proceed to the confirmation screen.
- The confirmation screen shows:
  - For **files**: the direct download link, with a copy-to-clipboard button.
  - For **folders**: a confirmation message (no direct link, as folders are containers).
- Use **Open in Gmail** or **Open in Outlook** to compose a share notification email.
- Recipients can find shared items under the **Shared** sidebar section after signing in.

---

## Security

- Authentication via **Firebase Auth** (Google Sign-in or email/password as configured).
- Firestore security rules (`firestore.rules`) restrict reads/writes to authenticated owners.
- Storage rules (`storage.rules`) restrict uploads to the owning user.
- Files over 100 MB and potentially dangerous file extensions are blocked client-side.
- The `.env` / `config.js` files are excluded from version control.

---

## License

MIT
