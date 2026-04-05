import { Routes, Route } from 'react-router-dom'
import AdminLayout from '../components/admin/Layout'
import Dashboard from '../pages/admin/Dashboard'
import Classes from '../pages/admin/Classes'
import Teachers from '../pages/admin/Teachers'
import TeacherAssignments from '../pages/admin/TeacherAssignments'
import Timetable from '../pages/admin/Timetable'
import Settings from '../pages/admin/Settings'
import Students from '../pages/admin/Students'
import StudentForm from '../pages/admin/Studentform'
import StudentProfile from '../pages/admin/Studentprofile'


export default function AdminRoutes() {
    return (
        <Routes>
            <Route path="/" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="classes" element={<Classes />} />
                <Route path="teachers" element={<Teachers />} />
                <Route path="assignments" element={<TeacherAssignments />} />
                <Route path="settings" element={<Settings />} />
                <Route path="timetable" element={<Timetable />} />
                <Route path="students" element={<Students />} />
                <Route path="students/add" element={<StudentForm />} />
                <Route path="students/:id" element={<StudentProfile />} />
                <Route path="students/:id/edit" element={<StudentForm />} />
            </Route>
        </Routes>
    )
}