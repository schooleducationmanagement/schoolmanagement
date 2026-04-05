import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import s from '../../components/admin/PageShell.module.css'

const EMPTY_FORM = { name: '', short: '', icon: '' }

export default function Subjects() {
    const [subjects, setSubjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [modal, setModal] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [editId, setEditId] = useState(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => { fetchSubjects() }, [])

    async function fetchSubjects() {
        setLoading(true)
        const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .order('name')
        if (error) setError(error.message)
        else setSubjects(data)
        setLoading(false)
    }

    function openAdd() {
        setForm(EMPTY_FORM)
        setEditId(null)
        setModal(true)
    }

    function openEdit(sub) {
        setForm({ name: sub.name, short: sub.short, icon: sub.icon ?? '' })
        setEditId(sub.id)
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
        if (!form.name.trim() || !form.short.trim()) {
            setError('Name and short name are required')
            return
        }
        setSaving(true)
        setError(null)

        const payload = {
            name: form.name.trim(),
            short: form.short.trim(),
            icon: form.icon.trim() || null,
        }

        const { error } = editId
            ? await supabase.from('subjects').update(payload).eq('id', editId)
            : await supabase.from('subjects').insert(payload)

        setSaving(false)
        if (error) { setError(error.message); return }
        closeModal()
        fetchSubjects()
    }

    async function handleDelete(id) {
        if (!confirm('Delete this subject?')) return
        const { error } = await supabase.from('subjects').delete().eq('id', id)
        if (error) setError(error.message)
        else fetchSubjects()
    }

    return (
        <div>
            <div className={s.header}>
                <div className={s.count}>{subjects.length} subject{subjects.length !== 1 ? 's' : ''}</div>
                <button className={s.btnPrimary} onClick={openAdd}>
                    + Add Subject
                </button>
            </div>

            {error && !modal && <div className={s.error}>{error}</div>}

            {loading ? (
                <div className={s.loading}>Loading subjects...</div>
            ) : (
                <div className={s.tableWrap}>
                    <table className={s.table}>
                        <thead>
                            <tr>
                                <th>Icon</th>
                                <th>Name</th>
                                <th>Short Name</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjects.length === 0 ? (
                                <tr>
                                    <td colSpan={4}>
                                        <div className={s.empty}>
                                            <div className={s.emptyIcon}>📚</div>
                                            <div className={s.emptyText}>No subjects yet. Add your first subject.</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                subjects.map(sub => (
                                    <tr key={sub.id}>
                                        <td style={{ fontSize: '1.3rem' }}>{sub.icon ?? '—'}</td>
                                        <td><strong>{sub.name}</strong></td>
                                        <td>
                                            <span className={`${s.badge} ${s.badgePurple}`}>
                                                {sub.short}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={s.actions}>
                                                <button className={`${s.btnGhost} ${s.btnSm}`} onClick={() => openEdit(sub)}>
                                                    ✏️ Edit
                                                </button>
                                                <button className={`${s.btnDanger} ${s.btnSm}`} onClick={() => handleDelete(sub.id)}>
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
                        <h2 className={s.modalTitle}>{editId ? 'Edit Subject' : 'Add Subject'}</h2>

                        {error && <div className={s.error}>{error}</div>}

                        <div className={s.field}>
                            <label className={s.label}>Subject Name</label>
                            <input
                                className={s.input}
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="e.g. Mathematics"
                            />
                        </div>

                        <div className={s.grid2}>
                            <div className={s.field}>
                                <label className={s.label}>Short Name</label>
                                <input
                                    className={s.input}
                                    name="short"
                                    value={form.short}
                                    onChange={handleChange}
                                    placeholder="e.g. Math"
                                    maxLength={8}
                                />
                            </div>
                            <div className={s.field}>
                                <label className={s.label}>Icon (emoji)</label>
                                <input
                                    className={s.input}
                                    name="icon"
                                    value={form.icon}
                                    onChange={handleChange}
                                    placeholder="e.g. 📐"
                                />
                            </div>
                        </div>

                        <div className={s.modalFooter}>
                            <button className={s.btnGhost} onClick={closeModal}>Cancel</button>
                            <button className={s.btnPrimary} onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : editId ? 'Update' : 'Add Subject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}