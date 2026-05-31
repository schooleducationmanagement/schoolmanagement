import s from './TopBar.module.css'

export default function StudentTopBar({ onMenuToggle }) {
    const today = new Date().toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short'
    })

    return (
        <header className={s.topbar}>
            <div className={s.left}>
                <button className={s.menuBtn} onClick={onMenuToggle}>
                    ☰
                </button>
                <div className={s.leftText}>
                    <span className={s.crumb}>Student Portal</span>
                    <h1 className={s.title}>Welcome back!</h1>
                </div>
            </div>

            <div className={s.right}>
                <div className={s.dateChip}>
                    📅 {today}
                </div>
            </div>
        </header>
    )
}
