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
 * All data is stored in Firestore — no localStorage usage
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
    // Track pending Firestore writes to avoid onSnapshot overwriting optimistic updates
    this.pendingWrites = 0
  }

  /**
   * Initialize data — start with empty list, Firestore loads on sign-in
   */
  async initialize() {
    if (this.initialized) return this.teamMembers
    this.teamMembers = []
    this.initialized = true
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
      // Clear in-memory data on sign-out
      this.teamMembers = []
      this.notifyListeners()
    }
  }

  /**
   * Start real-time sync with Firestore
   */
  async startFirestoreSync() {
    const uid = this.currentUser.uid
    const teamMembersRef = collection(db, 'users', uid, 'teamMembers')

    // Fetch current data from Firestore immediately
    const snapshot = await getDocs(teamMembersRef)

    // Load team members directly from Firestore (source of truth)
    this.teamMembers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    this.notifyListeners()

    // Start real-time listener for ongoing changes
    this.unsubTeamMembers = onSnapshot(teamMembersRef, (snap) => {
      // Skip snapshot if we have pending writes — our optimistic local state is newer
      if (this.pendingWrites > 0) return
      this.teamMembers = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      this.notifyListeners()
    })
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

    if (this.firestoreEnabled && this.currentUser) {
      // Save to Firestore first (source of truth)
      this.pendingWrites++
      try {
        const ref = doc(db, 'users', this.currentUser.uid, 'teamMembers', newMember.id)
        await setDoc(ref, sanitizeForFirestore(newMember))
      } catch (error) {
        console.error('Failed to save to Firestore:', error)
        throw error
      } finally {
        this.pendingWrites--
      }
    }

    // Update in-memory state after successful Firestore write
    this.teamMembers.push(newMember)
    this.notifyListeners()

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

    if (this.firestoreEnabled && this.currentUser) {
      // Save to Firestore first (source of truth)
      this.pendingWrites++
      try {
        const ref = doc(db, 'users', this.currentUser.uid, 'teamMembers', id)
        await setDoc(ref, sanitizeForFirestore(updated))
      } catch (error) {
        console.error('Failed to save to Firestore:', error)
        throw error
      } finally {
        this.pendingWrites--
      }
    }

    // Update in-memory state after successful Firestore write
    this.teamMembers[index] = updated
    this.notifyListeners()

    return updated
  }

  /**
   * Delete a team member
   */
  async deleteTeamMember(id) {
    const index = this.teamMembers.findIndex((m) => m.id === id)
    if (index === -1) {
      throw new Error(`Team member with id ${id} not found`)
    }

    const deleted = this.teamMembers[index]

    if (this.firestoreEnabled && this.currentUser) {
      // Delete from Firestore first (source of truth)
      this.pendingWrites++
      try {
        const ref = doc(db, 'users', this.currentUser.uid, 'teamMembers', id)
        await deleteDoc(ref)
      } catch (error) {
        console.error('Failed to delete from Firestore:', error)
        throw error
      } finally {
        this.pendingWrites--
      }
    }

    // Update in-memory state after successful Firestore delete
    this.teamMembers.splice(index, 1)
    this.notifyListeners()

    return deleted
  }

  /**
   * Replace all team members (useful for import)
   */
  async replaceAllTeamMembers(newMembers) {
    if (!Array.isArray(newMembers)) {
      throw new Error('Team members must be an array')
    }

    const timestamped = newMembers.map((m) => ({
      ...m,
      updatedAt: new Date().toISOString(),
    }))

    if (this.firestoreEnabled && this.currentUser) {
      // Save to Firestore first (source of truth)
      this.pendingWrites++
      try {
        const uid = this.currentUser.uid
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
      } catch (error) {
        console.error('Failed to replace team members in Firestore:', error)
        throw error
      } finally {
        this.pendingWrites--
      }
    }

    // Update in-memory state after successful Firestore write
    this.teamMembers = timestamped
    this.notifyListeners()

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
