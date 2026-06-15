import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Navigate } from 'react-router-dom'

// ⭐ 통합 사인업 (NEW)
import Signup from '@/lib/auth/signup/index'

// Admin
import AdminLayout from '@/pages/admin/_layout/Layout'
import AdminLogin from '@/pages/admin/_pages/login/Login'
import Dashboard from '@/pages/admin/_pages/dashboard/Dashboard'
import Students from '@/pages/admin/_pages/students/Students'
import StudentDetail from '@/pages/admin/_pages/students/detail/StudentDetail'
import Academy from '@/pages/admin/_pages/academy/Academy'
import Billing from '@/pages/admin/_pages/billing/Billing'
import Settings from '@/pages/admin/_pages/settings/Settings'
import Teachers from '@/pages/admin/_pages/teachers/Teachers'
import StudentApproval from '@/pages/admin/_pages/student-approval/StudentApproval'
import SuhaengManage from '@/pages/admin/_pages/suhaeng/SuhaengManage'
import Reports from '@/pages/admin/_pages/reports/Reports'

// High Student
import StudentLayout from '@/pages/high-student/_layout/Layout'
import StudentLogin from '@/pages/high-student/_pages/login/Login'
import Roadmap from '@/pages/high-student/_pages/roadmap/Roadmap'
import TopicList from '@/pages/high-student/_pages/topic/TopicList'
import BookList from '@/pages/high-student/_pages/book/BookList'
import Connect from '@/pages/high-student/_pages/connect/Connect'
import HighSuhaeng from '@/pages/high-student/_pages/suhaeng/Suhaeng'
import HighPending from '@/pages/high-student/_pages/pending/Pending'
import Expect from '@/pages/high-student/_pages/expect/Expect'
import Past from '@/pages/high-student/_pages/past/Past'
import Simulation from '@/pages/high-student/_pages/simulation/Simulation'
import Presentation from '@/pages/high-student/_pages/presentation/Presentation'
import Major from '@/pages/high-student/_pages/major/Major'
import Record from '@/pages/high-student/_pages/record/record'
import MockExam from '@/pages/high-student/_pages/mockexam/mockexam'
import CareerConcept from '@/pages/high-student/_pages/concept/CareerConcept'
import Basic from '@/pages/high-student/_pages/basic/Basic'

// Middle Student
import MiddleLayout from '@/pages/middle-student/_layout/Layout'
import MiddleLogin from '@/pages/middle-student/_pages/login/Login'
import MiddleConnect from '@/pages/middle-student/_pages/connect/Connect'
import MiddlePending from '@/pages/middle-student/_pages/pending/Pending'
import MiddleRoadmap from '@/pages/middle-student/_pages/roadmap/Roadmap'
import MiddleLesson from '@/pages/middle-student/_pages/lesson/Lesson'
import MiddleHomework from '@/pages/middle-student/_pages/homework/Homework'
import MiddleBookList from '@/pages/middle-student/_pages/book/BookList'
import MiddleExpect from '@/pages/middle-student/_pages/expect/Expect'
import MiddlePast from '@/pages/middle-student/_pages/past/Past'
import MiddleBasic from '@/pages/middle-student/_pages/basic/MiddleBasic'
import MiddleRecordExpect from '@/pages/middle-student/_pages/record-expect/RecordExpect'   // 🔥 추가
import MiddleSimulation from '@/pages/middle-student/_pages/simulation/Simulation'
import MiddlePresentation from '@/pages/middle-student/_pages/presentation/Presentation'
import MiddleSuhaeng from '@/pages/middle-student/_pages/suhaeng/Suhaeng'
import MiddleDebate from '@/pages/middle-student/_pages/debate/MiddleDebate'
import MiddleRecord from '@/pages/middle-student/_pages/record/Record'
import MiddleCareerConcept from '@/pages/middle-student/_pages/concept/CareerConcept'

// Master
import MasterLayout from '@/pages/master/_layout/Layout'
import MasterLogin from '@/pages/master/_pages/login/Login'
import MasterDashboard from '@/pages/master/_pages/dashboard/Dashboard'
import MasterAcademies from '@/pages/master/_pages/academies/Academies'
import MasterAcademyDetail from '@/pages/master/_pages/academies/detail/AcademyDetail'
import MasterBilling from '@/pages/master/_pages/billing/Billing'
import MasterNotices from '@/pages/master/_pages/notices/Notices'
import MasterData from '@/pages/master/_pages/data/Data'
import MasterAudit from '@/pages/master/_pages/audit/Audit'
import MasterStaff from '@/pages/master/_pages/staff/Staff'
import MasterLessons from '@/pages/master/_pages/lessons/Lessons'
import MasterQuestions from '@/pages/master/_pages/questions/Questions'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/admin/login" replace />,
  },

  // ⭐ 통합 사인업 (모든 사용자 공통)
  {
    path: 'signup',
    element: <Signup />,
  },

  {
    path: 'admin',
    children: [
      { path: 'login', element: <AdminLogin /> },
      { path: 'signup', element: <Navigate to="/signup" replace /> },
      {
        path: '',
        element: <AdminLayout />,
        children: [
          { path: '', element: <Dashboard /> },
          { path: 'students', element: <Students /> },
          { path: 'students/:id', element: <StudentDetail /> },
          { path: 'middle-students', element: <Students /> },
          { path: 'middle-students/:id', element: <StudentDetail /> },
          { path: 'middle-suhaeng', element: <SuhaengManage /> },
          { path: 'reports', element: <Reports /> },
          { path: 'student-approval', element: <StudentApproval /> },
          { path: 'teachers', element: <Teachers /> },
          { path: 'academy', element: <Academy /> },
          { path: 'billing', element: <Billing /> },
          { path: 'settings', element: <Settings /> },
        ]
      }
    ]
  },

  {
    path: 'high-student',
    children: [
      { path: 'login', element: <StudentLogin /> },
      { path: 'signup', element: <Navigate to="/signup" replace /> },
      { path: 'pending', element: <HighPending /> },
      {
        path: '',
        element: <StudentLayout />,
        children: [
          { path: 'roadmap', element: <Roadmap /> },
          { path: 'concept', element: <CareerConcept /> },
          { path: 'topic', element: <TopicList /> },
          { path: 'book', element: <BookList /> },
          { path: 'record', element: <Record /> },
          { path: 'mockexam', element: <MockExam /> },
          { path: 'connect', element: <Connect /> },
          { path: 'expect', element: <Expect /> },
          { path: 'past', element: <Past /> },
          { path: 'basic', element: <Basic /> },
          { path: 'simulation', element: <Simulation /> },
          { path: 'presentation', element: <Presentation /> },
          { path: 'major', element: <Major /> },
          { path: 'major/grade', element: <Major /> },
          { path: 'major/chapter', element: <Major /> },
          { path: 'suhaeng', element: <HighSuhaeng /> },
        ]
      }
    ]
  },

  {
    path: 'middle-student',
    children: [
      { path: 'login', element: <MiddleLogin /> },
      { path: 'signup', element: <Navigate to="/signup" replace /> },
      { path: 'pending', element: <MiddlePending /> },
      {
        path: '',
        element: <MiddleLayout />,
        children: [
          { path: 'roadmap', element: <MiddleRoadmap /> },
          { path: 'concept', element: <MiddleCareerConcept /> },
          { path: 'lesson', element: <MiddleLesson /> },
          { path: 'homework', element: <MiddleHomework /> },
          { path: 'suhaeng', element: <MiddleSuhaeng /> },
          { path: 'record', element: <MiddleRecord /> },
          { path: 'connect', element: <MiddleConnect /> },
          { path: 'book', element: <MiddleBookList /> },
          { path: 'expect', element: <MiddleExpect /> },
          { path: 'record-expect', element: <MiddleRecordExpect /> },   // 🔥 추가 (생기부 예상질문)
          { path: 'past', element: <MiddlePast /> },
          { path: 'basic', element: <MiddleBasic /> },
          { path: 'simulation', element: <MiddleSimulation /> },
          { path: 'presentation', element: <MiddlePresentation /> },
          { path: 'debate', element: <MiddleDebate /> },
        ]
      }
    ]
  },

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
          { path: 'questions', element: <MasterQuestions /> },
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