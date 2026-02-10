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

const STORAGE_KEY = 'pm-projects'
const ORDER_STORAGE_KEY = 'pm-projects-order'

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
 * Migrate project data from old structure to new releases array
 */
function migrateProjectData(projects) {
  return projects.map((project) => {
    // Check if migration needed (has old structure without releases array)
    if (
      project.development &&
      !project.development.releases &&
      (project.development.targetReleaseDate || project.development.actualReleaseDate)
    ) {
      // Create releases array from old structure
      const releases = []
      if (project.development.targetReleaseDate || project.development.actualReleaseDate) {
        releases.push({
          id: `rel-migrated-${project.id}`,
          name: 'Initial Release',
          startDate: project.development.startDate || null,
          endDate: project.development.targetReleaseDate || null,
          actualEndDate: project.development.actualReleaseDate || null,
          notes: '',
        })
      }

      return {
        ...project,
        development: {
          startDate: project.development.startDate || null,
          releases,
        },
      }
    }
    // Ensure releases array exists even if empty
    if (project.development && !project.development.releases) {
      return {
        ...project,
        development: {
          ...project.development,
          releases: [],
        },
      }
    }
    return project
  })
}

/**
 * Data service for managing projects
 * Supports localStorage (offline/default) and Firestore (when signed in)
 */
class DataService {
  constructor() {
    this.projects = []
    this.listeners = []
    this.initialized = false
    // Firestore state
    this.currentUser = null
    this.firestoreEnabled = false
    this.unsubProjects = null
    this.unsubSettings = null
    // Track pending Firestore writes to avoid onSnapshot overwriting optimistic updates
    this.pendingWrites = 0
  }

  /**
   * Initialize data - load from localStorage or fallback to JSON file
   */
  async initialize() {
    if (this.initialized) return this.projects

    try {
      // First, try to load from localStorage
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          // Use localStorage data even if empty (user may have deleted all projects)
          // Migrate old data structure to new releases array
          this.projects = migrateProjectData(parsed)
          this.initialized = true
          this.saveToStorage() // Save migrated data
          this.notifyListeners()
          return this.projects
        }
      }
    } catch (error) {
      console.warn('Failed to load from localStorage:', error)
    }

    // No stored data — start with an empty project list
    this.projects = []
    this.initialized = true
    this.saveToStorage()
    this.notifyListeners()
    return this.projects
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
      if (this.unsubProjects) {
        this.unsubProjects()
        this.unsubProjects = null
      }
      if (this.unsubSettings) {
        this.unsubSettings()
        this.unsubSettings = null
      }
      // Clear local data on sign-out — Firestore is the source of truth
      this.projects = []
      this.saveToStorage()
      this.notifyListeners()
    }
  }

  /**
   * Start real-time sync with Firestore
   */
  async startFirestoreSync() {
    const uid = this.currentUser.uid
    const projectsRef = collection(db, 'users', uid, 'projects')

    // Fetch current data from Firestore immediately
    const snapshot = await getDocs(projectsRef)

    if (snapshot.empty && this.projects.length > 0) {
      // First sign-in: migrate current localStorage data to Firestore
      await this.migrateToFirestore()
    } else {
      // Load projects directly from Firestore (source of truth)
      this.projects = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      this.saveToStorage() // cache locally
      this.notifyListeners()
    }

    // Load project order from Firestore
    const settingsRef = doc(db, 'users', uid, 'meta', 'settings')
    try {
      const settingsSnap = await getDocs(collection(db, 'users', uid, 'meta'))
      const settingsDoc = settingsSnap.docs.find((d) => d.id === 'settings')
      if (settingsDoc) {
        const order = settingsDoc.data().projectOrder
        if (order) {
          this.saveProjectOrder(order)
          this.notifyListeners()
        }
      }
    } catch (error) {
      console.warn('Failed to load project order from Firestore:', error)
    }

    // Start real-time listener for ongoing changes
    this.unsubProjects = onSnapshot(projectsRef, (snap) => {
      // Skip snapshot if we have pending writes — our optimistic local state is newer
      if (this.pendingWrites > 0) return
      this.projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      this.saveToStorage() // cache locally
      this.notifyListeners()
    })

    // Listen for project order changes
    this.unsubSettings = onSnapshot(settingsRef, (snap) => {
      if (this.pendingWrites > 0) return
      if (snap.exists()) {
        const order = snap.data().projectOrder
        if (order) {
          this.saveProjectOrder(order) // cache locally
          this.notifyListeners()
        }
      }
    })
  }

  /**
   * Migrate current localStorage data to Firestore (first sign-in)
   */
  async migrateToFirestore() {
    const uid = this.currentUser.uid
    const batch = writeBatch(db)

    this.projects.forEach((project) => {
      const ref = doc(db, 'users', uid, 'projects', project.id)
      batch.set(ref, sanitizeForFirestore(project))
    })

    const order = this.getProjectOrder()
    if (order) {
      const settingsRef = doc(db, 'users', uid, 'meta', 'settings')
      batch.set(settingsRef, { projectOrder: order })
    }

    await batch.commit()
  }

  /**
   * Save projects to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.projects))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
      throw error
    }
  }

  /**
   * Get custom project order from localStorage
   */
  getProjectOrder() {
    try {
      const stored = localStorage.getItem(ORDER_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          return parsed
        }
      }
    } catch (error) {
      console.warn('Failed to load project order:', error)
    }
    return null
  }

  /**
   * Save custom project order to localStorage
   */
  saveProjectOrder(order) {
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order))
    } catch (error) {
      console.error('Failed to save project order:', error)
      throw error
    }
  }

  /**
   * Update project order
   */
  async updateProjectOrder(newOrder) {
    if (!Array.isArray(newOrder)) {
      throw new Error('Order must be an array')
    }
    this.saveProjectOrder(newOrder)

    if (this.firestoreEnabled && this.currentUser) {
      const settingsRef = doc(db, 'users', this.currentUser.uid, 'meta', 'settings')
      await setDoc(settingsRef, { projectOrder: newOrder }, { merge: true })
    }

    this.notifyListeners()
  }

  /**
   * Get all projects, optionally sorted by custom order
   */
  getAllProjects(useCustomOrder = false) {
    const projects = [...this.projects]

    if (useCustomOrder) {
      const order = this.getProjectOrder()
      if (order && order.length > 0) {
        // Create a map for quick lookup
        const projectMap = new Map(projects.map(p => [p.id, p]))

        // Sort by custom order, then append any projects not in the order
        const ordered = []
        const unordered = []

        order.forEach(id => {
          const project = projectMap.get(id)
          if (project) {
            ordered.push(project)
            projectMap.delete(id)
          }
        })

        // Add any projects not in the custom order
        projectMap.forEach(project => unordered.push(project))

        return [...ordered, ...unordered]
      }
    }

    return projects
  }

  /**
   * Get a project by ID
   */
  getProjectById(id) {
    return this.projects.find((p) => p.id === id) || null
  }

  /**
   * Create a new project
   */
  async createProject(projectData) {
    if (!projectData.name || !projectData.name.trim()) {
      throw new Error('Project name is required')
    }

    const newProject = {
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: projectData.name.trim(),
      client: projectData.client?.trim() || '',
      status: projectData.status || 'discovery',
      priority: projectData.priority || 'medium',
      onHoldReason: projectData.onHoldReason?.trim() || '',
      notes: projectData.notes?.trim() || '',
      discovery: projectData.discovery || {},
      development: projectData.development || {},
      teamMembers: projectData.teamMembers || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (this.firestoreEnabled && this.currentUser) {
      // Save to Firestore first (source of truth)
      this.pendingWrites++
      try {
        const ref = doc(db, 'users', this.currentUser.uid, 'projects', newProject.id)
        await setDoc(ref, sanitizeForFirestore(newProject))
        const order = this.getProjectOrder() || []
        order.push(newProject.id)
        await this.updateProjectOrder(order)
      } catch (error) {
        console.error('Failed to save to Firestore:', error)
        throw error
      } finally {
        this.pendingWrites--
      }
    }

    // Update local state after successful Firestore write
    this.projects.push(newProject)
    this.saveToStorage()
    const order = this.getProjectOrder() || []
    if (!order.includes(newProject.id)) {
      order.push(newProject.id)
      this.saveProjectOrder(order)
    }
    this.notifyListeners()

    return newProject
  }

  /**
   * Update an existing project
   */
  async updateProject(id, projectData) {
    const index = this.projects.findIndex((p) => p.id === id)
    if (index === -1) {
      throw new Error(`Project with id ${id} not found`)
    }

    if (!projectData.name || !projectData.name.trim()) {
      throw new Error('Project name is required')
    }

    const existing = this.projects[index]
    const updated = {
      ...existing,
      ...projectData,
      name: projectData.name.trim(),
      client: projectData.client?.trim() || '',
      onHoldReason: projectData.onHoldReason?.trim() || '',
      notes: projectData.notes?.trim() || '',
      updatedAt: new Date().toISOString(),
    }

    if (this.firestoreEnabled && this.currentUser) {
      // Save to Firestore first (source of truth)
      this.pendingWrites++
      try {
        const ref = doc(db, 'users', this.currentUser.uid, 'projects', id)
        await setDoc(ref, sanitizeForFirestore(updated))
      } catch (error) {
        console.error('Failed to save to Firestore:', error)
        throw error
      } finally {
        this.pendingWrites--
      }
    }

    // Update local state after successful Firestore write
    this.projects[index] = updated
    this.saveToStorage()
    this.notifyListeners()

    return updated
  }

  /**
   * Delete a project
   */
  async deleteProject(id) {
    const index = this.projects.findIndex((p) => p.id === id)
    if (index === -1) {
      throw new Error(`Project with id ${id} not found`)
    }

    const deleted = this.projects[index]

    if (this.firestoreEnabled && this.currentUser) {
      // Delete from Firestore first (source of truth)
      this.pendingWrites++
      try {
        const ref = doc(db, 'users', this.currentUser.uid, 'projects', id)
        await deleteDoc(ref)
        const order = this.getProjectOrder()
        if (order) {
          const orderIndex = order.indexOf(deleted.id)
          if (orderIndex !== -1) {
            order.splice(orderIndex, 1)
            await this.updateProjectOrder(order)
          }
        }
      } catch (error) {
        console.error('Failed to delete from Firestore:', error)
        throw error
      } finally {
        this.pendingWrites--
      }
    }

    // Update local state after successful Firestore delete
    this.projects.splice(index, 1)
    this.saveToStorage()

    // Remove from custom order locally
    const order = this.getProjectOrder()
    if (order) {
      const orderIndex = order.indexOf(deleted.id)
      if (orderIndex !== -1) {
        order.splice(orderIndex, 1)
        this.saveProjectOrder(order)
      }
    }

    this.notifyListeners()

    return deleted
  }

  /**
   * Replace all projects (useful for import)
   */
  async replaceAllProjects(newProjects) {
    if (!Array.isArray(newProjects)) {
      throw new Error('Projects must be an array')
    }

    const timestamped = newProjects.map((p) => ({
      ...p,
      updatedAt: new Date().toISOString(),
    }))

    if (this.firestoreEnabled && this.currentUser) {
      // Save to Firestore first (source of truth)
      this.pendingWrites++
      try {
        const uid = this.currentUser.uid
        // Delete existing
        const existing = await getDocs(collection(db, 'users', uid, 'projects'))
        const batch1 = writeBatch(db)
        existing.docs.forEach((d) => batch1.delete(d.ref))
        await batch1.commit()
        // Add new
        const batch2 = writeBatch(db)
        timestamped.forEach((p) => {
          const ref = doc(db, 'users', uid, 'projects', p.id)
          batch2.set(ref, sanitizeForFirestore(p))
        })
        await batch2.commit()
      } catch (error) {
        console.error('Failed to replace projects in Firestore:', error)
        throw error
      } finally {
        this.pendingWrites--
      }
    }

    // Update local state after successful Firestore write
    this.projects = timestamped
    this.saveToStorage()
    this.notifyListeners()

    return timestamped
  }

  /**
   * Export projects as JSON string
   */
  exportToJSON() {
    return JSON.stringify(this.projects, null, 2)
  }

  /**
   * Import projects from JSON string
   */
  importFromJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString)
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid format: expected an array of projects')
      }
      return this.replaceAllProjects(parsed)
    } catch (error) {
      throw new Error(`Failed to import: ${error.message}`)
    }
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
        listener(this.projects)
      } catch (error) {
        console.error('Error in data listener:', error)
      }
    })
  }
}

// Export singleton instance
export default new DataService()
