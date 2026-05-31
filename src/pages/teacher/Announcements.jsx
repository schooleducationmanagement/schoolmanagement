import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import s from '../../components/teacher/TPage.module.css'
import cs from './Announcements.module.css'

export default function TeacherAnnouncements() {
    const { teacher } = useOutletContext()
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)

    const today = new Date().toISOString().slice(0, 10)

    useEffect(() => { fetchAnnouncements() }, [])

    async function fetchAnnouncements() {
        setLoading(true)
        const { data } = await supabase
            .from('announcements')
            .select('*')
            .or(`audience_type.eq.all,audience_type.eq.teachers`)
            .order('start_date', { ascending: false })

        // JS Filtering for specific targets
        const filtered = (data ?? []).filter(ann => {
            if (ann.audience_type === 'all') return true
            if (ann.audience_type === 'teachers') {
                if (ann.audience_scope === 'everyone') return true
                if (ann.audience_scope === 'specific') {
                    return ann.target_ids?.includes(teacher.id)
                }
            }
            return false
        })

        setAnnouncements(filtered)
        setLoading(false)
    }

    function getStatus(ann) {
        if (today < ann.start_date) return 'upcoming'
        if (today > ann.end_date) return 'expired'
        return 'active'
    }

    const STATUS_META = {
        active:   { label: 'Active',   cls: 'badgeGreen' },
        upcoming: { label: 'Upcoming', cls: 'badgeAmber' },
        expired:  { label: 'Expired',  cls: 'badgeGray' },
    }

    function formatDate(d) {
        return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        })
    }

    if (loading) return <div className={s.loading}>Loading announcements...</div>

    return (
        <div>
            <div className={s.pageHeader}>
                <div>
                    <h1 className={s.pageTitle}>Announcements</h1>
                    <div className={s.pageSub}>{announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</div>
                </div>
            </div>

            {announcements.length === 0 ? (
                <div className={s.empty}>
                    <div className={s.emptyText}>No announcements yet</div>
                </div>
            ) : (
                <div className={cs.list}>
                    {announcements.map(ann => {
                        const status = getStatus(ann)
                        const meta = STATUS_META[status]
                        return (
                            <div key={ann.id} className={`${cs.card} ${cs[status]}`}>
                                <div className={cs.cardTop}>
                                    <h3 className={cs.title}>{ann.title}</h3>
                                    <span className={`${s.badge} ${s[meta.cls]}`}>{meta.label}</span>
                                </div>
                                <p className={cs.desc}>{ann.description}</p>
                                <div className={cs.dates}>
                                    <span>{formatDate(ann.start_date)}</span>
                                    <span className={cs.dateSep}>→</span>
                                    <span>{formatDate(ann.end_date)}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
