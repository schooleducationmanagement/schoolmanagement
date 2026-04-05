import { NavLink, useNavigate } from 'react-router-dom'
import s from './Sidebar.module.css'

const links = [
    {
        section: 'Overview',
        items: [
            { to: '/admin', label: 'Dashboard', icon: '⊞' },
        ],
    },
    {
        section: 'Setup',
        items: [
            { to: '/admin/classes', label: 'Classes & Subjects', icon: '🎓' },
            { to: '/admin/teachers', label: 'Teachers', icon: '👤' },
            { to: '/admin/assignments', label: 'Assignments', icon: '📋' },
        ],
    },
    {
        section: 'Students',
        items: [
            { to: '/admin/students', label: 'All Students', icon: '👥' },
        ],
    },
    {
        section: 'Timetable',
        items: [
            { to: '/admin/settings', label: 'Schedule Settings', icon: '⚙️' },
            { to: '/admin/timetable', label: 'Timetable Builder', icon: '📅' },
        ],
    },
]

export default function Sidebar({ collapsed, onToggle, onNavClick }) {
    return (
        <>
            {/* Mobile backdrop */}
            {!collapsed && (
                <div className={s.backdrop} onClick={onToggle} aria-hidden="true" />
            )}

            <aside className={`${s.sidebar} ${collapsed ? s.collapsed : ''}`}>
                {/* Header: logo + toggle */}
                <div className={s.header}>
                    <div className={s.logo}>
                        <span className={s.logoIcon}>E</span>
                        <div className={s.logoText}>
                            <p className={s.logoName}>EduCore</p>
                            <p className={s.logoSub}>Admin Portal</p>
                        </div>
                    </div>
                    <button
                        className={s.toggleBtn}
                        onClick={onToggle}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed ? '›' : '‹'}
                    </button>
                </div>

                <nav className={s.nav}>
                    {links.map(group => (
                        <div key={group.section}>
                            <div className={s.section}>{group.section}</div>
                            {group.items.map(link => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    end={link.to === '/admin'}
                                    className={({ isActive }) =>
                                        `${s.item} ${isActive ? s.active : ''}`
                                    }
                                    onClick={onNavClick}
                                    title={collapsed ? link.label : undefined}
                                >
                                    <span className={s.icon}>{link.icon}</span>
                                    <span className={s.label}>{link.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className={s.footer}>
                    <div className={s.item} title={collapsed ? 'Logout' : undefined}>
                        <span className={s.icon}>🚪</span>
                        <span className={s.label}>Logout</span>
                    </div>
                </div>
            </aside>
        </>
    )
}