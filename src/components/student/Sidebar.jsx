import { NavLink } from 'react-router-dom'
import s from './Sidebar.module.css'

const NAV = [
    {
        section: 'Overview',
        items: [
            { to: '/student', label: 'Dashboard', icon: '🏠' },
            { to: '/student/timetable', label: 'Time Table', icon: '📅' },
        ],
    },
    {
        section: 'Academic',
        items: [
            { to: '/student/attendance', label: 'My Attendance', icon: '✅' },
            { to: '/student/exams', label: 'Exams', icon: '🎓' },
            { to: '/student/announcements', label: 'Announcements', icon: '📢' },
        ],
    },
]

export default function StudentSidebar({ student, onLogout, collapsed, onToggle, onNavClick }) {
    const initials = student?.full_name
        ? student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : 'S'

    return (
        <>
            {!collapsed && (
                <div className={s.backdrop} onClick={onToggle} aria-hidden="true" />
            )}

            <aside className={`${s.sidebar} ${collapsed ? s.collapsed : ''}`}>
                <div className={s.header}>
                    <div className={s.logo}>
                        <span className={s.logoIcon}>E</span>
                        <div className={s.logoText}>
                            <p className={s.logoName}>EduCore</p>
                            <p className={s.logoSub}>Student Portal</p>
                        </div>
                    </div>
                    <button
                        className={s.toggleBtn}
                        onClick={onToggle}
                        aria-label={collapsed ? 'Expand' : 'Collapse'}
                    >
                        {collapsed ? '›' : '‹'}
                    </button>
                </div>

                <div className={s.studentCard}>
                    <div className={s.avatar}>{initials}</div>
                    <div className={s.studentInfo}>
                        <div className={s.studentName}>{student?.full_name ?? 'Student'}</div>
                        <div className={s.studentRole}>
                            {student?.class_name ? `Class ${student.class_name}` : 'Student'}
                        </div>
                    </div>
                </div>

                <nav className={s.nav}>
                    {NAV.map(group => (
                        <div key={group.section}>
                            <div className={s.section}>{group.section}</div>
                            {group.items.map(link => (
                                <NavLink
                                    key={link.to}
                                    to={link.to}
                                    end={link.to === '/student'}
                                    className={({ isActive }) =>
                                        `${s.item} ${isActive ? s.active : ''}`
                                    }
                                    onClick={onNavClick}
                                >
                                    <span className={s.icon}>{link.icon}</span>
                                    <span className={s.label}>{link.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className={s.footer}>
                    <button className={s.logoutBtn} onClick={onLogout}>
                        <span className={s.icon}>🚪</span>
                        <span className={s.label}>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    )
}
