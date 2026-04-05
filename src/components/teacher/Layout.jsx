import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import TeacherSidebar from './Sidebar'
import TeacherTopBar from './TopBar'
import s from './Layout.module.css'

export default function TeacherLayout({ teacher, onLogout }) {
    // On mobile (≤768px) default to collapsed (drawer hidden)
    const isMobile = () => window.innerWidth <= 768
    const [collapsed, setCollapsed] = useState(() => isMobile())

    const handleToggle = useCallback(() => {
        setCollapsed(prev => !prev)
    }, [])

    // Auto-close drawer when a nav item is clicked on mobile
    const handleNavClick = useCallback(() => {
        if (window.innerWidth <= 768) {
            setCollapsed(true)
        }
    }, [])

    return (
        <div className={s.shell}>
            <TeacherSidebar
                teacher={teacher}
                onLogout={onLogout}
                collapsed={collapsed}
                onToggle={handleToggle}
                onNavClick={handleNavClick}
            />
            <div className={s.main}>
                <TeacherTopBar onMenuToggle={handleToggle} />
                <div className={s.content}>
                    <Outlet context={{ teacher }} />
                </div>
            </div>
        </div>
    )
}