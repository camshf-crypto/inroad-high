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

// High Student
import StudentLayout from './pages/high-student/_layout/Layout'
import StudentLogin from './pages/high-student/_pages/login/Login'
import StudentSignup from './pages/high-student/_pages/signup/index'
import Roadmap from './pages/high-student/_pages/roadmap/Roadmap'
import TopicList from './pages/high-student/_pages/topic/TopicList'
import BookList from './pages/high-student/_pages/book/BookList'
import Connect from './pages/high-student/_pages/connect/Connect'
import Expect from './pages/high-student/_pages/expect/Expect'
import Past from './pages/high-student/_pages/past/Past'
import Simulation from './pages/high-student/_pages/simulation/Simulation'
import Presentation from './pages/high-student/_pages/presentation/Presentation'
import Major from './pages/high-student/_pages/major/Major'
import Record from './pages/high-student/_pages/record/record'
import MockExam from './pages/high-student/_pages/mockexam/mockexam'

// Middle Student
import MiddleLayout from './pages/middle-student/_layout/Layout'
import MiddleLogin from './pages/middle-student/_pages/login/Login'
import MiddleSignup from './pages/middle-student/_pages/signup/index'
import MiddleRoadmap from './pages/middle-student/_pages/roadmap/Roadmap'
import MiddleLesson from './pages/middle-student/_pages/lesson/Lesson'
import MiddleHomework from './pages/middle-student/_pages/homework/Homework'
import MiddleBookList from './pages/middle-student/_pages/book/BookList'
import MiddleExpect from './pages/middle-student/_pages/expect/Expect'
import MiddlePast from './pages/middle-student/_pages/past/Past'
import MiddleSimulation from './pages/middle-student/_pages/simulation/Simulation'
import MiddlePresentation from './pages/middle-student/_pages/presentation/Presentation'

// Master
import MasterLayout from './pages/master/_layout/Layout'
import MasterLogin from './pages/master/_pages/login/Login'
import MasterDashboard from './pages/master/_pages/dashboard/Dashboard'
import MasterAcademies from './pages/master/_pages/academies/Academies'
import MasterAcademyDetail from './pages/master/_pages/academies/detail/AcademyDetail'
import MasterBilling from './pages/master/_pages/billing/Billing'
import MasterNotices from './pages/master/_pages/notices/Notices'
import MasterData from './pages/master/_pages/data/Data'
import MasterAudit from './pages/master/_pages/audit/Audit'
import MasterStaff from './pages/master/_pages/staff/Staff'
import MasterLessons from './pages/master/_pages/lessons/Lessons'

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
          { path: 'middle-students', element: <Students /> },
          { path: 'middle-students/:id', element: <StudentDetail /> },
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
          { path: 'record', element: <Record /> },
          { path: 'mockexam', element: <MockExam /> },
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
  },
  {
    path: 'middle-student',
    children: [
      { path: 'login', element: <MiddleLogin /> },
      { path: 'signup', element: <MiddleSignup /> },
      {
        path: '',
        element: <MiddleLayout />,
        children: [
          { path: 'roadmap', element: <MiddleRoadmap /> },
          { path: 'lesson', element: <MiddleLesson /> },
          { path: 'homework', element: <MiddleHomework /> },
          { path: 'book', element: <MiddleBookList /> },
          { path: 'expect', element: <MiddleExpect /> },
          { path: 'past', element: <MiddlePast /> },
          { path: 'simulation', element: <MiddleSimulation /> },
          { path: 'presentation', element: <MiddlePresentation /> },
        ]
      }
    ]
  },
  // 🏢 Master (본사)
  {
    path: 'master',
    children: [
      { path: 'login', element: <MasterLogin /> },
      {
        path: '',
        element: <MasterLayout />,
        children: [
          { path: '', element: <MasterDashboard /> },
          { path: 'academies', element: <MasterAcademies /> },
          { path: 'academies/:id', element: <MasterAcademyDetail /> },
          { path: 'lessons', element: <MasterLessons /> },
          { path: 'billing', element: <MasterBilling /> },
          { path: 'notices', element: <MasterNotices /> },
          { path: 'data', element: <MasterData /> },
          { path: 'audit', element: <MasterAudit /> },
          { path: 'staff', element: <MasterStaff /> },
        ]
      }
    ]
  }
])

export const Router = () => <RouterProvider router={router} />