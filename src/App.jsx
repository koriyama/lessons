import { Routes, Route } from 'react-router-dom'
import TeacherDashboard from './pages/TeacherDashboard'
import LessonBuilder from './pages/LessonBuilder'
import StudentLesson from './pages/StudentLesson'
import LessonResults from './pages/LessonResults'

function App() {
  return (
    <Routes>
      <Route path="/" element={<TeacherDashboard />} />
      <Route path="/builder" element={<LessonBuilder />} />
      <Route path="/builder/:id" element={<LessonBuilder />} />
      <Route path="/lesson/:slug" element={<StudentLesson />} />
      <Route path="/results/:lessonId" element={<LessonResults />} />
      <Route path="*" element={<div className="p-8 text-center text-gray-500">Page not found</div>} />
    </Routes>
  )
}

export default App