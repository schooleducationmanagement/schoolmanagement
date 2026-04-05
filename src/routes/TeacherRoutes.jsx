import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import TeacherLayout from '../components/teacher/Layout'
import TeacherLogin from '../pages/teacher/Login'
import TeacherHome from '../pages/teacher/Home'
import Attendance from '../pages/teacher/Attendance'
import ClassroomLog from '../pages/teacher/ClassroomLog'
import Profile from '../pages/teacher/Profile'

export default function TeacherRoutes() {
    const [teacher, setTeacher] = useState(null)

    function handleLogin(teacherData) {
        setTeacher(teacherData)
    }

    function handleLogout() {
        setTeacher(null)
    }

    if (!teacher) {
        return <TeacherLogin onLogin={handleLogin} />
    }

    return (
        <Routes>
            <Route
                path="/"
                element={<TeacherLayout teacher={teacher} onLogout={handleLogout} />}
            >
                <Route index element={<TeacherHome />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="log" element={<ClassroomLog />} />
                <Route path="profile" element={<Profile />} />
            </Route>
        </Routes>
    )
}