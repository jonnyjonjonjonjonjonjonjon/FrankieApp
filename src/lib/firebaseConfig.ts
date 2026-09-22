import type { FirebaseOptions } from 'firebase/app'

/**
 * Firebase web app settings for the "Frankies Diary" project.
 *
 * These values are not secret: access is controlled by Google sign-in and
 * the members list enforced by firestore.rules, not by hiding this.
 *
 * Set to null to switch sync off (app runs on one device only).
 */
export const firebaseConfig: FirebaseOptions | null = {
  apiKey: 'AIzaSyAJTlk3tG9KxhCi8rh9qOvloI3Pwu2CkKs',
  authDomain: 'frankies-diary-ced37.firebaseapp.com',
  projectId: 'frankies-diary-ced37',
  storageBucket: 'frankies-diary-ced37.firebasestorage.app',
  messagingSenderId: '527517728759',
  appId: '1:527517728759:web:7923684396255e55d0b8f2',
}
