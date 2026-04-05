import { useLocation } from 'react-router-dom'
import s from './TopBar.module.css'

const PAGE_META = {
    '/teacher': { crumb: 'Overview', title: 'Home & Timetable' },
    '/teacher/profile': { crumb: 'Overview', title: 'My Profile' },
    '/teacher/attendance': { crumb: 'Classroom', title: 'Attendance' },
    '/teacher/log': { crumb: 'Classroom', title: 'Classroom Log' },
}

export default function TeacherTopBar({ onMenuToggle }) {
    const { pathname } = useLocation()
    const meta = PAGE_META[pathname] ?? { crumb: 'Teacher', title: 'Page' }

    const today = new Date().toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })

    return (
        <header className={s.topbar}>
            <div className={s.left}>
                <button
                    className={s.menuBtn}
                    onClick={onMenuToggle}
                    aria-label="Open menu"
                >
                    ☰
                </button>
                <span className={s.crumb}>{meta.crumb}</span>
                <h1 className={s.title}>{meta.title}</h1>
            </div>
            <div className={s.right}>
                <div className={s.chip}>
                    <div className={s.dot} />
                    Online
                </div>
                <div className={s.dateChip}>{today}</div>
            </div>
        </header>
    )
}