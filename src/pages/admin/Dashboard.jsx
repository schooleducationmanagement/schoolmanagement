import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import s from './Dashboard.module.css'

export default function Dashboard() {
    const navigate = useNavigate()
    const [counts, setCounts] = useState({
        classes: 0, subjects: 0, teachers: 0, assignments: 0, slots: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => { fetchCounts() }, [])

    async function fetchCounts() {
        setLoading(true)
        const [cls, sub, tch, asgn, slots] = await Promise.all([
            supabase.from('classes').select('*', { count: 'exact', head: true }),
            supabase.from('subjects').select('*', { count: 'exact', head: true }),
            supabase.from('teachers').select('*', { count: 'exact', head: true }),
            supabase.from('teacher_subjects').select('*', { count: 'exact', head: true }),
            supabase.from('timetable_slots').select('*', { count: 'exact', head: true }),
        ])
        setCounts({
            classes: cls.count ?? 0,
            subjects: sub.count ?? 0,
            teachers: tch.count ?? 0,
            assignments: asgn.count ?? 0,
            slots: slots.count ?? 0,
        })
        setLoading(false)
    }

    const steps = [
        {
            num: 1,
            label: 'Add classes',
            done: counts.classes > 0,
            path: '/admin/classes',
            hint: 'e.g. Class 10 - A, Class 9 - B',
        },
        {
            num: 2,
            label: 'Add subjects',
            done: counts.subjects > 0,
            path: '/admin/subjects',
            hint: 'e.g. Mathematics, Science, English',
        },
        {
            num: 3,
            label: 'Add teachers',
            done: counts.teachers > 0,
            path: '/admin/teachers',
            hint: 'Add teacher names and emails',
        },
        {
            num: 4,
            label: 'Assign teachers to subjects',
            done: counts.assignments > 0,
            path: '/admin/assignments',
            hint: 'Define who teaches what to which class',
        },
        {
            num: 5,
            label: 'Build timetable',
            done: counts.slots > 0,
            path: '/admin/timetable',
            hint: 'Fill all period slots for each class',
        },
    ]

    const allReady = steps.every(st => st.done)
    const nextStep = steps.find(st => !st.done)

    const stats = [
        { label: 'Classes', value: counts.classes, icon: '🏫', path: '/admin/classes' },
        { label: 'Subjects', value: counts.subjects, icon: '📚', path: '/admin/subjects' },
        { label: 'Teachers', value: counts.teachers, icon: '👨‍🏫', path: '/admin/teachers' },
        { label: 'Assignments', value: counts.assignments, icon: '🔗', path: '/admin/assignments' },
        { label: 'Slots', value: counts.slots, icon: '📅', path: '/admin/timetable' },
    ]

    return (
        <div className={s.page}>
            {/* Stat cards */}
            <div className={s.statsGrid}>
                {stats.map(st => (
                    <div
                        key={st.label}
                        className={s.statCard}
                        onClick={() => navigate(st.path)}
                    >
                        <div className={s.statIcon}>{st.icon}</div>
                        <div className={s.statVal}>
                            {loading ? '—' : st.value}
                        </div>
                        <div className={s.statLabel}>{st.label}</div>
                    </div>
                ))}
            </div>

            {/* Setup checklist */}
            <div className={s.card}>
                <div className={s.cardHeader}>
                    <h2 className={s.cardTitle}>Setup Checklist</h2>
                    {allReady && (
                        <span className={s.allDone}>✅ All set — timetable is ready</span>
                    )}
                </div>

                {!allReady && nextStep && (
                    <div className={s.nextBanner}>
                        <span>👉 Next step:</span>
                        <strong>{nextStep.label}</strong>
                        <button
                            className={s.nextBtn}
                            onClick={() => navigate(nextStep.path)}
                        >
                            Go →
                        </button>
                    </div>
                )}

                <div className={s.steps}>
                    {steps.map(st => (
                        <div
                            key={st.num}
                            className={`${s.step} ${st.done ? s.stepDone : s.stepPending}`}
                            onClick={() => navigate(st.path)}
                        >
                            <div className={s.stepNum}>
                                {st.done ? '✓' : st.num}
                            </div>
                            <div className={s.stepBody}>
                                <div className={s.stepLabel}>{st.label}</div>
                                <div className={s.stepHint}>{st.hint}</div>
                            </div>
                            <div className={s.stepArrow}>→</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}