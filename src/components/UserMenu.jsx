import { useState } from 'react'
import { signInWithGoogle, signOutUser } from '../services/authService'

export default function UserMenu({ user }) {
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    setError(null)
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      console.error('Sign-in error:', err)
      setError(err.code === 'auth/internal-error'
        ? 'Google Sign-In is not enabled. Enable it in Firebase Console.'
        : err.message || 'Sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOutUser()
    } catch (error) {
      console.error('Sign-out error:', error)
    }
  }

  if (!user) {
    return (
      <div>
        <button
          type="button"
          className="user-menu-signin"
          onClick={handleSignIn}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M9 1C4.58 1 1 4.58 1 9s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 2.4c1.33 0 2.4 1.07 2.4 2.4S10.33 8.2 9 8.2 6.6 7.13 6.6 5.8 7.67 3.4 9 3.4zm0 11.36c-2 0-3.77-.97-4.87-2.47C4.14 10.96 7 10.2 9 10.2s4.86.76 4.87 2.09C12.77 13.79 11 14.76 9 14.76z" fill="currentColor"/>
          </svg>
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>
        {error && <p style={{ color: '#ef4444', fontSize: '12px', margin: '6px 0 0', padding: '0 8px' }}>{error}</p>}
      </div>
    )
  }

  return (
    <div className="user-menu">
      <div className="user-menu-info">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="user-menu-avatar"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="user-menu-avatar user-menu-avatar-fallback">
            {user.displayName?.[0] || user.email?.[0] || '?'}
          </div>
        )}
        <div className="user-menu-details">
          <span className="user-menu-name">{user.displayName || 'User'}</span>
          <span className="user-menu-sync">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <circle cx="5" cy="5" r="4" fill="#22c55e"/>
            </svg>
            Synced
          </span>
        </div>
      </div>
      <button
        type="button"
        className="user-menu-signout"
        onClick={handleSignOut}
      >
        Sign out
      </button>
    </div>
  )
}
