import { db } from './firebase'
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore'

const STORAGE_KEY = 'pm-team-members'

/**
 * Sanitize an object for Firestore — replace undefined with null recursively
 */
function sanitizeForFirestore(obj) {
  if (obj === undefined) return null
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore)
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = sanitizeForFirestore(value)
  }
  return result
}

/**
 * Team members service for managing global team members list
 * Supports localStorage (offline/default) and Firestore (when signed in)
 */
class TeamService {
  constructor() {
    this.teamMembers = []
    this.listeners = []
    this.initialized = false
    // Firestore state
    this.currentUser = null
    this.firestoreEnabled = false
    this.unsubTeamMembers = null
  }

  /**
   * Initialize data - load from localStorage
   */
  async initialize() {
    if (this.initialized) return this.teamMembers

    try {
      // Try to load from localStorage
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          this.teamMembers = parsed
          this.initialized = true
          this.notifyListeners()
          return this.teamMembers
        }
      }
    } catch (error) {
      console.warn('Failed to load team members from localStorage:', error)
    }

    // Initialize with empty array
    this.teamMembers = []
    this.initialized = true
    this.saveToStorage()
    this.notifyListeners()
    return this.teamMembers
  }

  /**
   * Called when auth state changes (sign in / sign out)
   */
  async setUser(user) {
    if (user) {
      this.currentUser = user
      this.firestoreEnabled = true
      await this.startFirestoreSync()
    } else {
      this.currentUser = null
      this.firestoreEnabled = false
      // Unsubscribe from Firestore listeners
      if (this.unsubTeamMembers) {
        this.unsubTeamMembers()
        this.unsubTeamMembers = null
      }
      // Reload from localStorage cache
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          this.teamMembers = JSON.parse(stored)
        } catch {
          // keep current team members
        }
      }
      this.notifyListeners()
    }
  }

  /**
   * Start real-time sync with Firestore
   */
  async startFirestoreSync() {
    const uid = this.currentUser.uid
    const teamMembersRef = collection(db, 'users', uid, 'teamMembers')

    // Check if user has any data in Firestore
    const snapshot = await getDocs(teamMembersRef)
    if (snapshot.empty && this.teamMembers.length > 0) {
      // First sign-in: migrate current localStorage data to Firestore
      await this.migrateToFirestore()
    }

    // Start real-time listener for team members
    this.unsubTeamMembers = onSnapshot(teamMembersRef, (snap) => {
      this.teamMembers = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      this.saveToStorage() // cache locally
      this.notifyListeners()
    })
  }

  /**
   * Migrate current localStorage data to Firestore (first sign-in)
   */
  async migrateToFirestore() {
    const uid = this.currentUser.uid
    const batch = writeBatch(db)

    this.teamMembers.forEach((member) => {
      const ref = doc(db, 'users', uid, 'teamMembers', member.id)
      batch.set(ref, sanitizeForFirestore(member))
    })

    await batch.commit()
  }

  /**
   * Save team members to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.teamMembers))
    } catch (error) {
      console.error('Failed to save team members to localStorage:', error)
      throw error
    }
  }

  /**
   * Get all team members
   */
  getAllTeamMembers() {
    return [...this.teamMembers].sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Get a team member by ID
   */
  getTeamMemberById(id) {
    return this.teamMembers.find((m) => m.id === id) || null
  }

  /**
   * Create a new team member
   */
  async createTeamMember(memberData) {
    if (!memberData.name || !memberData.name.trim()) {
      throw new Error('Team member name is required')
    }

    const newMember = {
      id: `tm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: memberData.name.trim(),
      email: memberData.email?.trim() || '',
      role: memberData.role?.trim() || '',
      department: memberData.department?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Update local state immediately for instant UI feedback
    this.teamMembers.push(newMember)
    this.saveToStorage()
    this.notifyListeners()

    // If Firestore is enabled, sync in the background (don't await)
    if (this.firestoreEnabled && this.currentUser) {
      const ref = doc(db, 'users', this.currentUser.uid, 'teamMembers', newMember.id)
      setDoc(ref, sanitizeForFirestore(newMember)).catch((error) => {
        console.error('Failed to sync to Firestore:', error)
      })
    }

    return newMember
  }

  /**
   * Update an existing team member
   */
  async updateTeamMember(id, memberData) {
    const index = this.teamMembers.findIndex((m) => m.id === id)
    if (index === -1) {
      throw new Error(`Team member with id ${id} not found`)
    }

    if (!memberData.name || !memberData.name.trim()) {
      throw new Error('Team member name is required')
    }

    const existing = this.teamMembers[index]
    const updated = {
      ...existing,
      ...memberData,
      name: memberData.name.trim(),
      email: memberData.email?.trim() || '',
      role: memberData.role?.trim() || '',
      department: memberData.department?.trim() || '',
      updatedAt: new Date().toISOString(),
    }

    // Update local state immediately for instant UI feedback
    this.teamMembers[index] = updated
    this.saveToStorage()
    this.notifyListeners()

    // If Firestore is enabled, sync in the background (don't await)
    if (this.firestoreEnabled && this.currentUser) {
      const ref = doc(db, 'users', this.currentUser.uid, 'teamMembers', id)
      setDoc(ref, sanitizeForFirestore(updated)).catch((error) => {
        console.error('Failed to sync to Firestore:', error)
      })
    }

    return updated
  }

  /**
   * Delete a team member
   */
  deleteTeamMember(id) {
    const index = this.teamMembers.findIndex((m) => m.id === id)
    if (index === -1) {
      throw new Error(`Team member with id ${id} not found`)
    }

    const deleted = this.teamMembers[index]

    // Update local state immediately for instant UI feedback
    this.teamMembers.splice(index, 1)
    this.saveToStorage()
    this.notifyListeners()

    // If Firestore is enabled, sync in the background (don't await)
    if (this.firestoreEnabled && this.currentUser) {
      const ref = doc(db, 'users', this.currentUser.uid, 'teamMembers', id)
      deleteDoc(ref).catch((error) => {
        console.error('Failed to sync deletion to Firestore:', error)
      })
    }

    return deleted
  }

  /**
   * Replace all team members (useful for import)
   */
  replaceAllTeamMembers(newMembers) {
    if (!Array.isArray(newMembers)) {
      throw new Error('Team members must be an array')
    }

    const timestamped = newMembers.map((m) => ({
      ...m,
      updatedAt: new Date().toISOString(),
    }))

    if (this.firestoreEnabled && this.currentUser) {
      // Batch: delete all existing, then set all new
      const uid = this.currentUser.uid
      const batchOp = async () => {
        // Delete existing
        const existing = await getDocs(collection(db, 'users', uid, 'teamMembers'))
        const batch1 = writeBatch(db)
        existing.docs.forEach((d) => batch1.delete(d.ref))
        await batch1.commit()
        // Add new
        const batch2 = writeBatch(db)
        timestamped.forEach((m) => {
          const ref = doc(db, 'users', uid, 'teamMembers', m.id)
          batch2.set(ref, sanitizeForFirestore(m))
        })
        await batch2.commit()
      }
      batchOp()
    } else {
      this.teamMembers = timestamped
      this.saveToStorage()
      this.notifyListeners()
    }

    return timestamped
  }

  /**
   * Subscribe to data changes
   */
  subscribe(listener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  /**
   * Notify all listeners of data changes
   */
  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.teamMembers)
      } catch (error) {
        console.error('Error in team listener:', error)
      }
    })
  }
}

// Export singleton instance
export default new TeamService()
