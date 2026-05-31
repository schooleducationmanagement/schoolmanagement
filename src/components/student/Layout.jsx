import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import StudentSidebar from './Sidebar'
import StudentTopBar from './TopBar'
import s from './Layout.module.css'

export default function StudentLayout({ student, onLogout }) {
    const isMobile = () => window.innerWidth <= 768
    const [collapsed, setCollapsed] = useState(() => isMobile())

    const handleToggle = useCallback(() => {
        setCollapsed(prev => !prev)
    }, [])

    const handleNavClick = useCallback(() => {
        if (window.innerWidth <= 768) {
            setCollapsed(true)
        }
    }, [])

    return (
        <div className={s.shell}>
            <StudentSidebar
                student={student}
                onLogout={onLogout}
                collapsed={collapsed}
                onToggle={handleToggle}
                onNavClick={handleNavClick}
            />
            <div className={s.main}>
                <StudentTopBar onMenuToggle={handleToggle} />
                <div className={s.content}>
                    <Outlet context={{ student }} />
                </div>
            </div>
        </div>
    )
}
