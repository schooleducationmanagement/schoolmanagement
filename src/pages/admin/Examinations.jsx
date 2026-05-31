import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import styles from './Examinations.module.css'

const EXAM_TYPES = ['Unit Test', 'Mid-Term', 'Annual', 'Quarterly', 'Other']

const STATUS_META = {
    draft: { label: 'Draft', cls: 'statusDraft' },
    scheduled: { label: 'Scheduled', cls: 'statusScheduled' },
    ongoing: { label: 'Ongoing', cls: 'statusOngoing' },
    marks_entry: { label: 'Marks Entry', cls: 'statusMarksEntry' },
    completed: { label: 'Completed', cls: 'statusCompleted' },
    locked: { label: 'Locked', cls: 'statusLocked' },
}

const STATUS_TABS = ['all', 'draft', 'scheduled', 'ongoing', 'marks_entry', 'completed', 'locked']

export default function Examinations() {
    const navigate = useNavigate()

    const [exams, setExams] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('all')
    const [showModal, setShowModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [deleteId, setDeleteId] = useState(null)

    const [form, setForm] = useState({
        name: '', type: 'Mid-Term', academic_year: ''
    })

    useEffect(() => { fetchExams() }, [])

    async function fetchExams() {
        setLoading(true)
        const { data, error } = await supabase
            .from('exams')
            .select(`
        *,
        exam_subjects (
          id,
          class_id,
          subject
        )
      `)
            .order('created_at', { ascending: false })

        if (!error) setExams(data || [])
        setLoading(false)
    }

    async function handleCreate(e) {
        e.preventDefault()
        if (!form.name.trim() || !form.academic_year.trim()) return
        setSubmitting(true)

        const { error } = await supabase.from('exams').insert([{
            name: form.name.trim(),
            type: form.type,
            academic_year: form.academic_year.trim(),
            status: 'draft',
        }])

        if (!error) {
            setShowModal(false)
            setForm({ name: '', type: 'Mid-Term', academic_year: '' })
            fetchExams()
        }
        setSubmitting(false)
    }

    async function handleDelete(id) {
        const { error } = await supabase.from('exams').delete().eq('id', id)
        if (!error) {
            setDeleteId(null)
            fetchExams()
        }
    }

    const filtered = activeTab === 'all'
        ? exams
        : exams.filter(e => e.status === activeTab)

    function subjectCount(exam) {
        return exam.exam_subjects?.length ?? 0
    }

    function classCount(exam) {
        const ids = new Set(exam.exam_subjects?.map(s => s.class_id))
        return ids.size
    }

    return (
        <div className={styles.page}>

            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Examinations</h1>
                    <p className={styles.subtitle}>Manage exams, subjects, and results</p>
                </div>
                <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
                    + New Exam
                </button>
            </div>

            {/* Status tabs */}
            <div className={styles.tabs}>
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab}
                        className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'all' ? 'All' : STATUS_META[tab].label}
                        <span className={styles.tabCount}>
                            {tab === 'all' ? exams.length : exams.filter(e => e.status === tab).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className={styles.tableWrap}>
                {loading ? (
                    <div className={styles.empty}>Loading…</div>
                ) : filtered.length === 0 ? (
                    <div className={styles.empty}>
                        No exams found.{activeTab === 'all' && ' Click "+ New Exam" to get started.'}
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Exam Name</th>
                                <th>Type</th>
                                <th>Academic Year</th>
                                <th>Classes</th>
                                <th>Subjects</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(exam => {
                                const meta = STATUS_META[exam.status]
                                return (
                                    <tr key={exam.id} className={styles.row}>
                                        <td className={styles.examName}>{exam.name}</td>
                                        <td className={styles.typeTag}>{exam.type}</td>
                                        <td>{exam.academic_year}</td>
                                        <td>{classCount(exam)}</td>
                                        <td>{subjectCount(exam)}</td>
                                        <td>
                                            <span className={`${styles.badge} ${styles[meta.cls]}`}>
                                                {meta.label}
                                            </span>
                                        </td>
                                        <td className={styles.actions}>
                                            <button
                                                className={styles.btnView}
                                                onClick={() => navigate(`/admin/examinations/${exam.id}`)}
                                            >
                                                Open
                                            </button>
                                            {exam.status === 'draft' && (
                                                <button
                                                    className={styles.btnDelete}
                                                    onClick={() => setDeleteId(exam.id)}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Create Exam Modal ── */}
            {showModal && (
                <div className={styles.overlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Create New Exam</h2>
                            <button className={styles.close} onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreate} className={styles.form}>
                            <div className={styles.field}>
                                <label>Exam Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Mid-Term 2025"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className={styles.fieldRow}>
                                <div className={styles.field}>
                                    <label>Type</label>
                                    <select
                                        value={form.type}
                                        onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                    >
                                        {EXAM_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className={styles.field}>
                                    <label>Academic Year</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 2024-25"
                                        value={form.academic_year}
                                        onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
                                        required
                                    />
                                </div>
                            </div>
                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.btnCancel} onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className={styles.btnPrimary} disabled={submitting}>
                                    {submitting ? 'Creating…' : 'Create Exam'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm Modal ── */}
            {deleteId && (
                <div className={styles.overlay} onClick={() => setDeleteId(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Delete Exam?</h2>
                            <button className={styles.close} onClick={() => setDeleteId(null)}>✕</button>
                        </div>
                        <p className={styles.deleteMsg}>
                            This will permanently delete the exam and all its subjects and results. This cannot be undone.
                        </p>
                        <div className={styles.modalFooter}>
                            <button className={styles.btnCancel} onClick={() => setDeleteId(null)}>Cancel</button>
                            <button className={styles.btnDanger} onClick={() => handleDelete(deleteId)}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}