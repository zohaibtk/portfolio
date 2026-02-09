import projectsData from '../data/projects.json'

const STORAGE_KEY = 'pm-projects'
const ORDER_STORAGE_KEY = 'pm-projects-order'

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
 * Data service for managing projects with JSON file as source of truth
 * and localStorage for runtime persistence
 */
class DataService {
  constructor() {
    this.projects = []
    this.listeners = []
    this.initialized = false
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

    // Fallback to bundled JSON file
    try {
      const data = Array.isArray(projectsData) ? [...projectsData] : []
      this.projects = migrateProjectData(data)
      this.initialized = true
      this.saveToStorage()
      this.notifyListeners()
      return this.projects
    } catch (error) {
      console.error('Failed to load initial data:', error)
      this.projects = []
      this.initialized = true
      this.notifyListeners()
      return this.projects
    }
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
  updateProjectOrder(newOrder) {
    if (!Array.isArray(newOrder)) {
      throw new Error('Order must be an array')
    }
    this.saveProjectOrder(newOrder)
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
  createProject(projectData) {
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.projects.push(newProject)
    this.saveToStorage()
    
    // Add new project to the end of custom order if it exists
    const order = this.getProjectOrder()
    if (order) {
      order.push(newProject.id)
      this.saveProjectOrder(order)
    }
    
    this.notifyListeners()
    return newProject
  }

  /**
   * Update an existing project
   */
  updateProject(id, projectData) {
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

    this.projects[index] = updated
    this.saveToStorage()
    this.notifyListeners()
    return updated
  }

  /**
   * Delete a project
   */
  deleteProject(id) {
    const index = this.projects.findIndex((p) => p.id === id)
    if (index === -1) {
      throw new Error(`Project with id ${id} not found`)
    }

    const deleted = this.projects.splice(index, 1)[0]
    this.saveToStorage()
    
    // Remove from custom order if it exists
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
  replaceAllProjects(newProjects) {
    if (!Array.isArray(newProjects)) {
      throw new Error('Projects must be an array')
    }

    this.projects = newProjects.map((p) => ({
      ...p,
      updatedAt: new Date().toISOString(),
    }))
    this.saveToStorage()
    this.notifyListeners()
    return this.projects
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
