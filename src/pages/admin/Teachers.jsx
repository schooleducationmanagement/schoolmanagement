import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import s from '../../components/admin/PageShell.module.css'

const EMPTY_FORM = { name: '', email: '', phone: '', class_teacher_of: '' }

export default function Teachers() {
    const [teachers, setTeachers] = useState([])
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [modal, setModal] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [editId, setEditId] = useState(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchTeachers()
        fetchClasses()
    }, [])

    async function fetchTeachers() {
        setLoading(true)
        const { data, error } = await supabase
            .from('teachers')
            .select(`*, classes(name)`)
            .order('name')
        if (error) setError(error.message)
        else setTeachers(data)
        setLoading(false)
    }

    async function fetchClasses() {
        const { data } = await supabase
            .from('classes')
            .select('id, name')
            .order('grade')
            .order('section')
        if (data) setClasses(data)
    }

    function openAdd() {
        setForm(EMPTY_FORM)
        setEditId(null)
        setModal(true)
    }

    function openEdit(t) {
        setForm({
            name: t.name,
            email: t.email,
            phone: t.phone ?? '',
            class_teacher_of: t.class_teacher_of ?? '',
        })
        setEditId(t.id)
        setModal(true)
    }

    function closeModal() {
        setModal(false)
        setError(null)
    }

    function handleChange(e) {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    }

    async function handleSave() {
        if (!form.name.trim() || !form.email.trim()) {
            setError('Name and email are required')
            return
        }
        setSaving(true)
        setError(null)

        const payload = {
            name: form.name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim() || null,
            class_teacher_of: form.class_teacher_of || null,
        }

        const { error } = editId
            ? await supabase.from('teachers').update(payload).eq('id', editId)
            : await supabase.from('teachers').insert(payload)

        setSaving(false)
        if (error) { setError(error.message); return }
        closeModal()
        fetchTeachers()
    }

    async function handleDelete(id) {
        if (!confirm('Delete this teacher? All their timetable slots will also be removed.')) return
        const { error } = await supabase.from('teachers').delete().eq('id', id)
        if (error) setError(error.message)
        else fetchTeachers()
    }

    return (
        <div>
            <div className={s.header}>
                <div className={s.count}>{teachers.length} teacher{teachers.length !== 1 ? 's' : ''}</div>
                <button className={s.btnPrimary} onClick={openAdd}>+ Add Teacher</button>
            </div>

            {error && !modal && <div className={s.error}>{error}</div>}

            {loading ? (
                <div className={s.loading}>Loading teachers...</div>
            ) : (
                <div className={s.tableWrap}>
                    <table className={s.table}>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Class Teacher Of</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teachers.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>
                                        <div className={s.empty}>
                                            <div className={s.emptyIcon}>👨‍🏫</div>
                                            <div className={s.emptyText}>No teachers yet. Add your first teacher.</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                teachers.map(t => (
                                    <tr key={t.id}>
                                        <td><strong>{t.name}</strong></td>
                                        <td style={{ fontSize: '0.82rem', color: '#6b7280' }}>{t.email}</td>
                                        <td style={{ fontSize: '0.82rem' }}>{t.phone ?? '—'}</td>
                                        <td>
                                            {t.classes
                                                ? <span className={`${s.badge} ${s.badgeGreen}`}>{t.classes.name}</span>
                                                : <span style={{ color: '#9ca3af', fontSize: '0.82rem' }}>Not assigned</span>
                                            }
                                        </td>
                                        <td>
                                            <div className={s.actions}>
                                                <button className={`${s.btnGhost} ${s.btnSm}`} onClick={() => openEdit(t)}>
                                                    ✏️ Edit
                                                </button>
                                                <button className={`${s.btnDanger} ${s.btnSm}`} onClick={() => handleDelete(t.id)}>
                                                    🗑 Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {modal && (
                <div className={s.overlay} onClick={e => e.target === e.currentTarget && closeModal()}>
                    <div className={s.modal}>
                        <h2 className={s.modalTitle}>{editId ? 'Edit Teacher' : 'Add Teacher'}</h2>

                        {error && <div className={s.error}>{error}</div>}

                        <div className={s.field}>
                            <label className={s.label}>Full Name</label>
                            <input
                                className={s.input}
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="e.g. Ravi Kumar"
                            />
                        </div>

                        <div className={s.field}>
                            <label className={s.label}>Email</label>
                            <input
                                className={s.input}
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="e.g. ravi@school.in"
                            />
                        </div>

                        <div className={s.grid2}>
                            <div className={s.field}>
                                <label className={s.label}>Phone</label>
                                <input
                                    className={s.input}
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="e.g. 9876543210"
                                />
                            </div>
                            <div className={s.field}>
                                <label className={s.label}>Class Teacher Of</label>
                                <select
                                    className={s.select}
                                    name="class_teacher_of"
                                    value={form.class_teacher_of}
                                    onChange={handleChange}
                                >
                                    <option value="">— None —</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className={s.modalFooter}>
                            <button className={s.btnGhost} onClick={closeModal}>Cancel</button>
                            <button className={s.btnPrimary} onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : editId ? 'Update' : 'Add Teacher'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}