import type { FirebaseOptions } from 'firebase/app'

/**
 * Firebase web app settings, pasted from the Firebase console
 * (Project settings → Your apps → SDK setup and configuration → Config).
 *
 * These values are not secret: access is controlled by the sign-in and the
 * security rules in firestore.rules / storage.rules, not by hiding this.
 *
 * null = sync switched off; the app runs on this device only.
 */
export const firebaseConfig: FirebaseOptions | null = null
