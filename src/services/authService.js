import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth, googleProvider } from './firebase'

export async function signInWithGoogle() {
  try {
    return await signInWithPopup(auth, googleProvider)
  } catch (error) {
    // Fallback to redirect if popup fails
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/popup-closed-by-user' ||
      error.code === 'auth/cancelled-popup-request'
    ) {
      return signInWithRedirect(auth, googleProvider)
    }
    throw error
  }
}

export function handleRedirectResult() {
  return getRedirectResult(auth)
}

export function signOutUser() {
  return signOut(auth)
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}
