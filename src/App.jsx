import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import './App.css'
import dataService from './services/dataService'
import { onAuthChange, handleRedirectResult, signInWithGoogle } from './services/authService'
import { computeProjectDerived } from './utils/projectUtils.js'
import Sidebar from './components/Sidebar.jsx'
import ProjectCard from './components/ProjectCard.jsx'
import ProjectEditor from './components/ProjectEditor.jsx'
import MeetingMinutesPanel from './components/MeetingMinutesPanel.jsx'
import OverviewView from './views/OverviewView.jsx'
import StatusView from './views/StatusView.jsx'
import TimelineView from './views/TimelineView.jsx'
import ProjectListView from './views/ProjectListView.jsx'
import ProjectDetailsView from './views/ProjectDetailsView.jsx'
import SettingsView from './views/SettingsView.jsx'
import TeamAllocationView from './views/TeamAllocationView.jsx'

function App() {
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState({
    status: 'all',
    risk: 'all',
  })
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [momOpen, setMomOpen] = useState(false)
  const [momProject, setMomProject] = useState(null)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Drag and drop sensors with improved settings
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Reduced distance for more responsive feel
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      onActivation: (event) => {
        // Announce to screen readers
        const target = event.target.closest('[data-sortable-id]')
        if (target) {
          const projectName = target.querySelector('.project-card__title')?.textContent || 'project'
          // You could use a live region here for better accessibility
        }
      },
    })
  )

  // Initialize data service and load projects
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const loadedProjects = await dataService.initialize()
        setProjects(loadedProjects)
      } catch (error) {
        console.error('Failed to load projects:', error)
        setProjects([])
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    // Subscribe to data changes
    const unsubscribe = dataService.subscribe((updatedProjects) => {
      setProjects([...updatedProjects])
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    handleRedirectResult().catch(() => {})
    const unsub = onAuthChange((firebaseUser) => {
      setUser(firebaseUser)
      dataService.setUser(firebaseUser)
      setAuthLoading(false)
    })
    return unsub
  }, [])

  const projectsWithDerived = useMemo(
    () =>
      projects.map((p) => ({
        ...p,
        derived: computeProjectDerived(p),
      })),
    [projects],
  )

  // Get ordered projects for overview page
  const orderedProjects = useMemo(() => {
    // Create a map of current projects for quick lookup
    const projectMap = new Map(projects.map(p => [p.id, p]))

    // Get the custom order
    const order = dataService.getProjectOrder()
    if (order && order.length > 0) {
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

    return projects
  }, [projects])

  const orderedProjectsWithDerived = useMemo(
    () =>
      orderedProjects.map((p) => ({
        ...p,
        derived: computeProjectDerived(p),
      })),
    [orderedProjects],
  )

  // Filtered ordered projects for overview page (maintains custom order)
  const filteredOrdered = useMemo(() => {
    const orderedIds = orderedProjectsWithDerived.map((p) => p.id)
    const orderedMap = new Map(orderedProjectsWithDerived.map((p) => [p.id, p]))

    return orderedIds
      .map((id) => orderedMap.get(id))
      .filter((p) => {
        if (!p) return false
        if (filter.status !== 'all' && p.status !== filter.status) return false
        if (filter.risk !== 'all' && p.derived.overallRisk !== filter.risk) return false
        return true
      })
  }, [orderedProjectsWithDerived, filter])

  function handleDragStart(event) {
    setActiveId(event.active.id)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      // Get current order from dataService
      const currentOrder = dataService.getProjectOrder()
      const orderedIds = currentOrder || orderedProjects.map((p) => p.id)

      // Find indices in the full ordered list
      const oldIndex = orderedIds.indexOf(active.id)
      const newIndex = orderedIds.indexOf(over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(orderedIds, oldIndex, newIndex)

        // Update the order in dataService
        dataService.updateProjectOrder(reordered)
      }
    }
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  // Get the active project for drag overlay
  const activeProject = activeId
    ? orderedProjectsWithDerived.find((p) => p.id === activeId)
    : null

  function handleEdit(project) {
    setEditingProject(project)
    setEditorOpen(true)
  }

  function handleAddNew() {
    setEditingProject(null)
    setEditorOpen(true)
  }

  function handleDelete(project) {
    if (!window.confirm(`Delete project "${project.name}"? This action cannot be undone.`)) {
      return
    }
    try {
      dataService.deleteProject(project.id)
      setEditorOpen(false)
    } catch (error) {
      console.error('Delete failed:', error)
      alert(`Failed to delete project: ${error.message}`)
    }
  }

  async function handleSave(projectInput) {
    try {
      if (projectInput.id) {
        // Update existing project
        await dataService.updateProject(projectInput.id, projectInput)
      } else {
        // Create new project
        await dataService.createProject(projectInput)
      }
      setEditorOpen(false)
      setEditingProject(null)
    } catch (error) {
      console.error('Save failed:', error)
      alert(`Failed to save project: ${error.message}`)
    }
  }

  function handleMom(project) {
    setMomProject(project)
    setMomOpen(true)
  }

  async function handleSaveMom(projectId, meetingMinutes) {
    const project = projects.find((p) => p.id === projectId)
    if (project) {
      await dataService.updateProject(projectId, { ...project, meetingMinutes })
    }
    setMomOpen(false)
  }

  if (authLoading) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="brand-mark">PM</div>
          <p className="auth-loading-text">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="brand-mark">PM</div>
          <h1 className="auth-title">Project Control</h1>
          <p className="auth-subtitle">Sign in to manage your portfolio</p>
          <button
            type="button"
            className="auth-google-btn"
            onClick={() => signInWithGoogle().catch((err) => {
              if (err.code !== 'auth/popup-closed-by-user') {
                console.error('Sign-in error:', err)
                alert(err.message || 'Sign-in failed. Please try again.')
              }
            })}
          >
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-layout">
        <Sidebar user={user} />

        <main className="app-main">
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p className="muted">Loading projects...</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <Routes>
                <Route path="/" element={<Navigate to="/overview" replace />} />
                <Route
                  path="/overview"
                  element={
                    <OverviewView
                      filter={filter}
                      onFilterChange={setFilter}
                      projects={projects}
                      orderedProjectsWithDerived={orderedProjectsWithDerived}
                      filteredOrdered={filteredOrdered}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onMom={handleMom}
                    />
                  }
                />
                <Route
                  path="/discovery"
                  element={
                    <StatusView
                      status="discovery"
                      title="Discovery pipeline"
                      subtitle="Projects currently in discovery, with artifact readiness and delays."
                      emptyMessage="No projects in discovery."
                      orderedProjectsWithDerived={orderedProjectsWithDerived}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onMom={handleMom}
                    />
                  }
                />
                <Route
                  path="/development"
                  element={
                    <StatusView
                      status="development"
                      title="Development"
                      subtitle="Active build and release work, with focus on upcoming target dates."
                      emptyMessage="No projects in development."
                      orderedProjectsWithDerived={orderedProjectsWithDerived}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onMom={handleMom}
                    />
                  }
                />
                <Route
                  path="/on-hold"
                  element={
                    <StatusView
                      status="on_hold"
                      title="On-hold projects"
                      subtitle="Initiatives paused due to client priority or missing inputs."
                      emptyMessage="No projects currently on hold."
                      orderedProjectsWithDerived={orderedProjectsWithDerived}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onMom={handleMom}
                    />
                  }
                />
                <Route
                  path="/completed"
                  element={
                    <StatusView
                      status="completed"
                      title="Completed projects"
                      subtitle="Successfully completed projects and delivered initiatives."
                      emptyMessage="No completed projects yet."
                      orderedProjectsWithDerived={orderedProjectsWithDerived}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onMom={handleMom}
                    />
                  }
                />
                <Route
                  path="/timeline"
                  element={<TimelineView projects={projectsWithDerived} />}
                />
                <Route
                  path="/team-allocation"
                  element={<TeamAllocationView projects={projectsWithDerived} />}
                />
                <Route
                  path="/projects"
                  element={
                    <ProjectListView
                      orderedProjectsWithDerived={orderedProjectsWithDerived}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onAddNew={handleAddNew}
                    />
                  }
                />
                <Route
                  path="/projects/:id"
                  element={<ProjectDetailsView projects={projects} onEdit={handleEdit} onDelete={handleDelete} onMom={handleMom} />}
                />
                <Route
                  path="/settings"
                  element={<SettingsView />}
                />
              </Routes>

              <DragOverlay>
                {activeProject ? (
                  <div className="drag-overlay-card">
                    <ProjectCard
                      project={activeProject}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onMom={handleMom}
                      isDragging={true}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

          <ProjectEditor
            open={editorOpen}
            initialProject={editingProject}
            onSave={handleSave}
            onCancel={() => setEditorOpen(false)}
            onDelete={handleDelete}
          />

          <MeetingMinutesPanel
            open={momOpen}
            project={momProject}
            onSave={handleSaveMom}
            onCancel={() => setMomOpen(false)}
          />
        </main>
      </div>
    </div>
  )
}

export default App
