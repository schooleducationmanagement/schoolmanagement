import { NavLink } from 'react-router-dom'
import s from './Sidebar.module.css'

const NAV = [
    {
        section: 'Overview',
        items: [
            { to: '/teacher', label: 'Home & Timetable', icon: '🏠' },
            { to: '/teacher/profile', label: 'My Profile', icon: '👤' },
        ],
    },
    {
        section: 'Classroom',
        items: [
            { to: '/teacher/attendance', label: 'Attendance', icon: '✅' },
            { to: '/teacher/log', label: 'Classroom Log', icon: '📝' },
        ],
    },
]

export default function TeacherSidebar({ teacher, onLogout, collapsed, onToggle, onNavClick }) {
    const initials = teacher?.name
        ? teacher.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : 'T'

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
                            <p className={s.logoSub}>Teacher Portal</p>
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

                {/* Teacher info card */}
                <div className={s.teacherCard}>
                    <div className={s.avatar}>{initials}</div>
                    <div className={s.teacherInfo}>
                        <div className={s.teacherName}>{teacher?.name ?? 'Teacher'}</div>
                        <div className={s.teacherRole}>
                            {teacher?.class_teacher_of_name
                                ? `Class Teacher — ${teacher.class_teacher_of_name}`
                                : 'Subject Teacher'}
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
                                    end={link.to === '/teacher'}
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
                    <button
                        className={s.logoutBtn}
                        onClick={onLogout}
                        title={collapsed ? 'Logout' : undefined}
                    >
                        <span className={s.icon}>🚪</span>
                        <span className={s.label}>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    )
}