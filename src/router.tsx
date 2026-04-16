import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Navigate } from 'react-router-dom'

// Admin
import AdminLayout from './pages/admin/_layout/Layout'
import AdminLogin from './pages/admin/_pages/login/Login'
import Dashboard from './pages/admin/_pages/dashboard/Dashboard'
import Students from './pages/admin/_pages/students/Students'
import StudentDetail from './pages/admin/_pages/students/detail/StudentDetail'
import Academy from './pages/admin/_pages/academy/Academy'
import Billing from './pages/admin/_pages/billing/Billing'
import Settings from './pages/admin/_pages/settings/Settings'

// Student
import StudentLayout from './pages/student/_layout/Layout'
import StudentLogin from './pages/student/_pages/login/Login'
import StudentSignup from './pages/student/_pages/signup/index'
import Roadmap from './pages/student/_pages/roadmap/Roadmap'
import TopicList from './pages/student/_pages/topic/TopicList'
import BookList from './pages/student/_pages/book/BookList'
import Connect from './pages/student/_pages/connect/Connect'
import Expect from './pages/student/_pages/expect/Expect'
import Past from './pages/student/_pages/past/Past'
import Simulation from './pages/student/_pages/simulation/Simulation'
import Presentation from './pages/student/_pages/presentation/Presentation'
import Major from './pages/student/_pages/major/Major'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/admin/login" replace />,
  },
  {
    path: 'admin',
    children: [
      { path: 'login', element: <AdminLogin /> },
      {
        path: '',
        element: <AdminLayout />,
        children: [
          { path: '', element: <Dashboard /> },
          { path: 'students', element: <Students /> },
          { path: 'students/:id', element: <StudentDetail /> },
          { path: 'academy', element: <Academy /> },
          { path: 'billing', element: <Billing /> },
          { path: 'settings', element: <Settings /> },
        ]
      }
    ]
  },
  {
    path: 'student',
    children: [
      { path: 'login', element: <StudentLogin /> },
      { path: 'signup', element: <StudentSignup /> },
      {
        path: '',
        element: <StudentLayout />,
        children: [
          { path: 'roadmap', element: <Roadmap /> },
          { path: 'topic', element: <TopicList /> },
          { path: 'book', element: <BookList /> },
          { path: 'connect', element: <Connect /> },
          { path: 'expect', element: <Expect /> },
          { path: 'past', element: <Past /> },
          { path: 'simulation', element: <Simulation /> },
          { path: 'presentation', element: <Presentation /> },
          { path: 'major', element: <Major /> },
          { path: 'major/grade', element: <Major /> },
          { path: 'major/chapter', element: <Major /> },
        ]
      }
    ]
  }
])

export const Router = () => <RouterProvider router={router} />