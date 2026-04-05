import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import s from './Layout.module.css'

export default function AdminLayout() {
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
            <Sidebar
                collapsed={collapsed}
                onToggle={handleToggle}
                onNavClick={handleNavClick}
            />
            <div className={s.main}>
                <TopBar onMenuToggle={handleToggle} />
                <div className={s.content}>
                    <Outlet />
                </div>
            </div>
        </div>
    )
}