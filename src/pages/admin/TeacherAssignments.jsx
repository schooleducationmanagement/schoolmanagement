import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import s from '../../components/admin/PageShell.module.css'

const EMPTY_FORM = { teacher_id: '', class_id: '', subject_id: '' }

export default function TeacherAssignments() {
    const [assignments, setAssignments] = useState([])
    const [teachers, setTeachers] = useState([])
    const [classes, setClasses] = useState([])
    const [allSubjects, setAllSubjects] = useState([])   // every subject in db
    const [filteredSubs, setFilteredSubs] = useState([])   // subjects for selected class
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [modal, setModal] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)

    useEffect(() => { fetchAll() }, [])

    async function fetchAll() {
        setLoading(true)
        const [a, t, cls, sub] = await Promise.all([
            supabase
                .from('teacher_subjects')
                .select(`
          id,
          teachers ( id, name ),
          subjects ( id, name, icon, class_id, classes ( name ) )
        `)
                .order('created_at'),
            supabase.from('teachers').select('id, name').order('name'),
            supabase.from('classes').select('id, name').order('grade').order('section'),
            supabase.from('subjects').select('id, name, icon, class_id').order('name'),
        ])
        if (a.error) setError(a.error.message)
        else setAssignments(a.data ?? [])
        if (t.data) setTeachers(t.data)
        if (cls.data) setClasses(cls.data)
        if (sub.data) setAllSubjects(sub.data)
        setLoading(false)
    }

    function openAdd() {
        setForm(EMPTY_FORM)
        setFilteredSubs([])
        setError(null)
        setModal(true)
    }

    function closeModal() {
        setModal(false)
        setError(null)
        setFilteredSubs([])
    }

    function handleTeacherChange(e) {
        setForm(f => ({ ...f, teacher_id: e.target.value }))
    }

    function handleClassChange(e) {
        const classId = e.target.value
        // Filter allSubjects by selected class_id
        const filtered = allSubjects.filter(sub => sub.class_id === classId)
        setFilteredSubs(filtered)
        // Reset subject when class changes
        setForm(f => ({ ...f, class_id: classId, subject_id: '' }))
    }

    function handleSubjectChange(e) {
        setForm(f => ({ ...f, subject_id: e.target.value }))
    }

    async function handleSave() {
        if (!form.teacher_id || !form.subject_id) {
            setError('Please select a teacher and a subject')
            return
        }
        setSaving(true)
        setError(null)

        const { error } = await supabase
            .from('teacher_subjects')
            .insert({ teacher_id: form.teacher_id, subject_id: form.subject_id })

        setSaving(false)
        if (error) {
            if (error.code === '23505') setError('This assignment already exists')
            else setError(error.message)
            return
        }
        closeModal()
        fetchAll()
    }

    async function handleDelete(id) {
        if (!confirm('Remove this assignment?')) return
        const { error } = await supabase.from('teacher_subjects').delete().eq('id', id)
        if (error) setError(error.message)
        else fetchAll()
    }

    return (
        <div>
            <div className={s.header}>
                <div>
                    <div className={s.count}>
                        {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
                        Pick a class to filter its subjects, then assign a teacher
                    </div>
                </div>
                <button className={s.btnPrimary} onClick={openAdd}>
                    + Add Assignment
                </button>
            </div>

            {error && !modal && <div className={s.error}>{error}</div>}

            {loading ? (
                <div className={s.loading}>Loading assignments...</div>
            ) : (
                <div className={s.tableWrap}>
                    <table className={s.table}>
                        <thead>
                            <tr>
                                <th>Teacher</th>
                                <th>Subject</th>
                                <th>Class</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignments.length === 0 ? (
                                <tr>
                                    <td colSpan={4}>
                                        <div className={s.empty}>
                                            <div className={s.emptyIcon}>🔗</div>
                                            <div className={s.emptyText}>
                                                No assignments yet.<br />
                                                Add classes + subjects first, then assign teachers here.
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                assignments.map(a => (
                                    <tr key={a.id}>
                                        <td><strong>{a.teachers?.name}</strong></td>
                                        <td>
                                            <span style={{ marginRight: 6 }}>{a.subjects?.icon}</span>
                                            {a.subjects?.name}
                                        </td>
                                        <td>
                                            <span className={`${s.badge} ${s.badgeBlue}`}>
                                                {a.subjects?.classes?.name}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                className={`${s.btnDanger} ${s.btnSm}`}
                                                onClick={() => handleDelete(a.id)}
                                            >
                                                🗑 Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {modal && (
                <div
                    className={s.overlay}
                    onClick={e => e.target === e.currentTarget && closeModal()}
                >
                    <div className={s.modal}>
                        <h2 className={s.modalTitle}>Add Assignment</h2>

                        {error && <div className={s.error}>{error}</div>}

                        {/* Step 1 — Teacher */}
                        <div className={s.field}>
                            <label className={s.label}>1. Select Teacher</label>
                            <select
                                className={s.select}
                                value={form.teacher_id}
                                onChange={handleTeacherChange}
                            >
                                <option value="">— Select Teacher —</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Step 2 — Class (filter) */}
                        <div className={s.field}>
                            <label className={s.label}>2. Select Class</label>
                            <select
                                className={s.select}
                                value={form.class_id}
                                onChange={handleClassChange}
                            >
                                <option value="">— Select Class —</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Step 3 — Subject (filtered by class) */}
                        <div className={s.field}>
                            <label className={s.label}>3. Select Subject</label>
                            <select
                                className={s.select}
                                value={form.subject_id}
                                onChange={handleSubjectChange}
                                disabled={!form.class_id}
                            >
                                <option value="">
                                    {!form.class_id
                                        ? '— Select a class first —'
                                        : filteredSubs.length === 0
                                            ? '— No subjects found for this class —'
                                            : '— Select Subject —'}
                                </option>
                                {filteredSubs.map(sub => (
                                    <option key={sub.id} value={sub.id}>
                                        {sub.icon} {sub.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={s.modalFooter}>
                            <button className={s.btnGhost} onClick={closeModal}>Cancel</button>
                            <button
                                className={s.btnPrimary}
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Add Assignment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}