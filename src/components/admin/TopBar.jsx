import { useLocation } from 'react-router-dom'
import s from './TopBar.module.css'

const pageMeta = {
    '/admin': { crumb: 'Overview', title: 'Dashboard' },
    '/admin/classes': { crumb: 'Setup', title: 'Classes' },
    '/admin/subjects': { crumb: 'Setup', title: 'Subjects' },
    '/admin/teachers': { crumb: 'Setup', title: 'Teachers' },
    '/admin/assignments': { crumb: 'Setup', title: 'Teacher Assignments' },
    '/admin/timetable': { crumb: 'Timetable', title: 'Timetable Builder' },
}

export default function TopBar({ onMenuToggle }) {
    const { pathname } = useLocation()
    const meta = pageMeta[pathname] ?? { crumb: 'Admin', title: 'Page' }

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
                    Connected
                </div>
                <div className={s.chip}>Term 2 — 2025–26</div>
            </div>
        </header>
    )
}