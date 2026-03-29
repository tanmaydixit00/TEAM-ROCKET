import { firebaseConfig } from './config.js';

// Initialize Firebase exactly once, regardless of how many modules import this file.
// The Firebase SDK (compat) must already be loaded via a <script> tag in the HTML.
if (typeof firebase === 'undefined') {
  throw new Error('[MiniCloud] Firebase SDK not loaded. Ensure the firebase-app-compat.js script is included before this module.');
}

try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('[MiniCloud] Firebase initialized');
  }
} catch (e) {
  console.error('[MiniCloud] Firebase initialization failed:', e);
  throw e;
}

export const auth = firebase.auth();
