import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import AdminRoutes from './routes/AdminRoutes'
import TeacherRoutes from './routes/TeacherRoutes'
import StudentRoutes from './routes/StudentRoutes'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default → admin for now */}
        <Route path="/" element={<Navigate to="/admin" replace />} />

        {/* Portals */}
        <Route path="/admin/*" element={<AdminRoutes />} />
        <Route path="/teacher/*" element={<TeacherRoutes />} />
        <Route path="/student/*" element={<StudentRoutes />} />
      </Routes>
    </BrowserRouter>
  )
}


// import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
// import AdminRoutes   from './routes/AdminRoutes'
// import TeacherRoutes from './routes/TeacherRoutes'

// export default function App() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/"          element={<Navigate to="/admin" replace />} />
//         <Route path="/admin/*"   element={<AdminRoutes />} />
//         <Route path="/teacher/*" element={<TeacherRoutes />} />
//       </Routes>
//     </BrowserRouter>
//   )
// }