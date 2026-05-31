import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import StudentLayout from '../components/student/Layout'
import StudentLogin from '../pages/student/Login'
import StudentHome from '../pages/student/Home'
import StudentTimetable from '../pages/student/Timetable'
import StudentAttendance from '../pages/student/Attendance'
import StudentAnnouncements from '../pages/student/Announcements'
import StudentExams from '../pages/student/Exams'

export default function StudentRoutes() {
    const [student, setStudent] = useState(null)

    function handleLogin(studentData) {
        setStudent(studentData)
    }

    function handleLogout() {
        setStudent(null)
    }

    if (!student) {
        return <StudentLogin onLogin={handleLogin} />
    }

    return (
        <Routes>
            <Route
                path="/*"
                element={<StudentLayout student={student} onLogout={handleLogout} />}
            >
                <Route index element={<StudentHome />} />
                <Route path="timetable" element={<StudentTimetable />} />
                <Route path="attendance" element={<StudentAttendance />} />
                <Route path="exams" element={<StudentExams />} />
                <Route path="announcements" element={<StudentAnnouncements />} />
                <Route path="*" element={<Navigate to="/student" replace />} />
            </Route>
        </Routes>
    )
}
