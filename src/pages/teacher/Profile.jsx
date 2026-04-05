import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import s from '../../components/teacher/TPage.module.css'
import cs from './Profile.module.css'

export default function TeacherProfile() {
    const { teacher } = useOutletContext()
    const [subjects, setSubjects] = useState([])
    const [slotCount, setSlotCount] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (teacher?.id) loadData()
    }, [teacher])

    async function loadData() {
        setLoading(true)
        const [subRes, slotRes] = await Promise.all([
            // subjects this teacher teaches (via teacher_subjects)
            supabase
                .from('teacher_subjects')
                .select('subjects ( id, name, short, icon, classes ( name ) )')
                .eq('teacher_id', teacher.id),
            // total timetable slots
            supabase
                .from('timetable_slots')
                .select('id', { count: 'exact', head: true })
                .eq('teacher_id', teacher.id),
        ])
        setSubjects(subRes.data?.map(r => r.subjects) ?? [])
        setSlotCount(slotRes.count ?? 0)
        setLoading(false)
    }

    const initials = teacher?.name
        ? teacher.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : 'T'

    if (loading) return <div className={s.loading}>Loading profile...</div>

    return (
        <div className={cs.page}>
            {/* Header */}
            <div className={cs.headerCard}>
                <div className={cs.avatar}>{initials}</div>
                <div className={cs.headerInfo}>
                    <div className={cs.name}>{teacher?.name}</div>
                    <div className={cs.email}>{teacher?.email}</div>
                    {teacher?.class_teacher_of_name && (
                        <div className={cs.ctBadge}>
                            Class Teacher — {teacher.class_teacher_of_name}
                        </div>
                    )}
                </div>
                <div className={cs.headerStats}>
                    <div className={cs.headerStat}>
                        <div className={cs.headerStatVal}>{slotCount}</div>
                        <div className={cs.headerStatLabel}>Total Slots</div>
                    </div>
                    <div className={cs.headerStat}>
                        <div className={cs.headerStatVal}>{subjects.length}</div>
                        <div className={cs.headerStatLabel}>Subjects</div>
                    </div>
                </div>
            </div>

            {/* Details grid */}
            <div className={cs.grid}>
                {/* Contact info */}
                <div className={cs.card}>
                    <div className={s.cardTitle}>Contact Details</div>
                    <div className={cs.detailList}>
                        <div className={cs.detailRow}>
                            <span className={cs.detailLabel}>Email</span>
                            <span className={cs.detailVal}>{teacher?.email ?? '—'}</span>
                        </div>
                        <div className={cs.detailRow}>
                            <span className={cs.detailLabel}>Phone</span>
                            <span className={cs.detailVal}>{teacher?.phone ?? '—'}</span>
                        </div>
                        <div className={cs.detailRow}>
                            <span className={cs.detailLabel}>Class Teacher</span>
                            <span className={cs.detailVal}>
                                {teacher?.class_teacher_of_name ?? 'Not assigned'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Subjects taught */}
                <div className={cs.card}>
                    <div className={s.cardTitle}>Subjects I Teach</div>
                    {subjects.length === 0 ? (
                        <div className={cs.noData}>No subjects assigned yet</div>
                    ) : (
                        <div className={cs.subjectList}>
                            {subjects.map((sub, idx) => (
                                <div key={idx} className={cs.subjectItem}>
                                    <div className={cs.subjectIcon}>{sub?.icon ?? '?'}</div>
                                    <div>
                                        <div className={cs.subjectName}>{sub?.name}</div>
                                        <div className={cs.subjectClass}>{sub?.classes?.name}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}