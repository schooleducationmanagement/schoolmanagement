import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import s from '../../components/admin/PageShell.module.css'
import cs from './Classes.module.css'

const EMPTY_CLASS = { name: '', grade: '', section: '' }
const EMPTY_SUBJECT = { name: '', short: '', icon: '' }

export default function Classes() {
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [classModal, setClassModal] = useState(false)
    const [classForm, setClassForm] = useState(EMPTY_CLASS)
    const [editClassId, setEditClassId] = useState(null)
    const [savingClass, setSavingClass] = useState(false)
    const [expandedId, setExpandedId] = useState(null)
    const [subjects, setSubjects] = useState([])
    const [subLoading, setSubLoading] = useState(false)
    const [subModal, setSubModal] = useState(false)
    const [subForm, setSubForm] = useState(EMPTY_SUBJECT)
    const [editSubId, setEditSubId] = useState(null)
    const [savingSub, setSavingSub] = useState(false)

    useEffect(() => { fetchClasses() }, [])

    async function fetchClasses() {
        setLoading(true)
        const { data, error } = await supabase
            .from('classes')
            .select('*, subjects(count)')
            .order('grade').order('section')
        if (error) setError(error.message)
        else setClasses(data)
        setLoading(false)
    }

    function openAddClass() {
        setClassForm(EMPTY_CLASS); setEditClassId(null); setError(null); setClassModal(true)
    }
    function openEditClass(cls) {
        setClassForm({ name: cls.name, grade: cls.grade, section: cls.section })
        setEditClassId(cls.id); setError(null); setClassModal(true)
    }
    function closeClassModal() { setClassModal(false); setError(null) }

    async function saveClass() {
        if (!classForm.name.trim() || !classForm.grade || !classForm.section.trim()) {
            setError('All fields are required'); return
        }
        setSavingClass(true); setError(null)
        const payload = { name: classForm.name.trim(), grade: parseInt(classForm.grade), section: classForm.section.trim().toUpperCase() }
        const { error } = editClassId
            ? await supabase.from('classes').update(payload).eq('id', editClassId)
            : await supabase.from('classes').insert(payload)
        setSavingClass(false)
        if (error) { setError(error.message); return }
        closeClassModal(); fetchClasses()
    }

    async function deleteClass(id) {
        if (!confirm('Delete this class? All subjects and timetable slots will also be removed.')) return
        const { error } = await supabase.from('classes').delete().eq('id', id)
        if (error) setError(error.message)
        else { if (expandedId === id) { setExpandedId(null); setSubjects([]) }; fetchClasses() }
    }

    async function toggleExpand(cls) {
        if (expandedId === cls.id) { setExpandedId(null); setSubjects([]); return }
        setExpandedId(cls.id); await fetchSubjects(cls.id)
    }

    async function fetchSubjects(classId) {
        setSubLoading(true)
        const { data } = await supabase.from('subjects').select('*').eq('class_id', classId).order('name')
        if (data) setSubjects(data)
        setSubLoading(false)
    }

    function openAddSubject() { setSubForm(EMPTY_SUBJECT); setEditSubId(null); setError(null); setSubModal(true) }
    function openEditSubject(sub) {
        setSubForm({ name: sub.name, short: sub.short, icon: sub.icon ?? '' })
        setEditSubId(sub.id); setError(null); setSubModal(true)
    }
    function closeSubModal() { setSubModal(false); setError(null) }

    async function saveSubject() {
        if (!subForm.name.trim() || !subForm.short.trim()) { setError('Name and short name required'); return }
        setSavingSub(true); setError(null)
        const payload = { class_id: expandedId, name: subForm.name.trim(), short: subForm.short.trim(), icon: subForm.icon.trim() || null }
        const { error } = editSubId
            ? await supabase.from('subjects').update(payload).eq('id', editSubId)
            : await supabase.from('subjects').insert(payload)
        setSavingSub(false)
        if (error) { setError(error.code === '23505' ? 'Subject already exists in this class' : error.message); return }
        closeSubModal(); fetchSubjects(expandedId); fetchClasses()
    }

    async function deleteSubject(id) {
        if (!confirm('Delete this subject?')) return
        const { error } = await supabase.from('subjects').delete().eq('id', id)
        if (error) setError(error.message)
        else { fetchSubjects(expandedId); fetchClasses() }
    }

    return (
        <div>
            <div className={s.header}>
                <div className={s.count}>{classes.length} class{classes.length !== 1 ? 'es' : ''}</div>
                <button className={s.btnPrimary} onClick={openAddClass}>+ Add Class</button>
            </div>

            {error && !classModal && !subModal && <div className={s.error}>{error}</div>}

            {loading ? <div className={s.loading}>Loading classes...</div> : (
                <div className={s.tableWrap}>
                    <table className={s.table}>
                        <thead>
                            <tr><th>Class</th><th>Grade</th><th>Section</th><th>Subjects</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {classes.length === 0 ? (
                                <tr><td colSpan={5}>
                                    <div className={s.empty}>
                                        <div className={s.emptyIcon}>🏫</div>
                                        <div className={s.emptyText}>No classes yet. Add your first class.</div>
                                    </div>
                                </td></tr>
                            ) : classes.map(cls => (
                                <>
                                    <tr key={cls.id} className={expandedId === cls.id ? cs.expandedRow : ''}>
                                        <td><strong>{cls.name}</strong></td>
                                        <td><span className={`${s.badge} ${s.badgeBlue}`}>Grade {cls.grade}</span></td>
                                        <td><span className={`${s.badge} ${s.badgeGray}`}>Section {cls.section}</span></td>
                                        <td><span className={`${s.badge} ${s.badgePurple}`}>{cls.subjects?.[0]?.count ?? 0} subjects</span></td>
                                        <td>
                                            <div className={s.actions}>
                                                <button className={`${cs.subBtn} ${expandedId === cls.id ? cs.subBtnActive : ''}`} onClick={() => toggleExpand(cls)}>
                                                    {expandedId === cls.id ? '▲ Hide' : '▼ Subjects'}
                                                </button>
                                                <button className={`${s.btnGhost} ${s.btnSm}`} onClick={() => openEditClass(cls)}>✏️ Edit</button>
                                                <button className={`${s.btnDanger} ${s.btnSm}`} onClick={() => deleteClass(cls.id)}>🗑</button>
                                            </div>
                                        </td>
                                    </tr>

                                    {expandedId === cls.id && (
                                        <tr key={`${cls.id}-sub`}>
                                            <td colSpan={5} className={cs.panelCell}>
                                                <div className={cs.panel}>
                                                    <div className={cs.panelHeader}>
                                                        <span className={cs.panelTitle}>📚 Subjects — <strong>{cls.name}</strong></span>
                                                        <button className={s.btnPrimary} style={{ fontSize: '0.8rem', padding: '6px 14px' }} onClick={openAddSubject}>
                                                            + Add Subject
                                                        </button>
                                                    </div>

                                                    {subLoading ? (
                                                        <div className={cs.panelEmpty}>Loading...</div>
                                                    ) : subjects.length === 0 ? (
                                                        <div className={cs.panelEmpty}>No subjects yet — add the first one above.</div>
                                                    ) : (
                                                        <div className={cs.subGrid}>
                                                            {subjects.map(sub => (
                                                                <div key={sub.id} className={cs.subCard}>
                                                                    <div className={cs.subIcon}>{sub.icon ?? '📘'}</div>
                                                                    <div className={cs.subBody}>
                                                                        <div className={cs.subName}>{sub.name}</div>
                                                                        <div className={cs.subShort}>{sub.short}</div>
                                                                    </div>
                                                                    <div className={cs.subActions}>
                                                                        <button className={`${s.btnGhost} ${s.btnSm}`} onClick={() => openEditSubject(sub)}>✏️</button>
                                                                        <button className={`${s.btnDanger} ${s.btnSm}`} onClick={() => deleteSubject(sub.id)}>🗑</button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Class modal */}
            {classModal && (
                <div className={s.overlay} onClick={e => e.target === e.currentTarget && closeClassModal()}>
                    <div className={s.modal}>
                        <h2 className={s.modalTitle}>{editClassId ? 'Edit Class' : 'Add Class'}</h2>
                        {error && <div className={s.error}>{error}</div>}
                        <div className={s.field}>
                            <label className={s.label}>Class Name</label>
                            <input className={s.input} value={classForm.name} onChange={e => setClassForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Class 10 - A" />
                        </div>
                        <div className={s.grid2}>
                            <div className={s.field}>
                                <label className={s.label}>Grade</label>
                                <input className={s.input} type="number" min="1" max="12" value={classForm.grade} onChange={e => setClassForm(f => ({ ...f, grade: e.target.value }))} placeholder="e.g. 10" />
                            </div>
                            <div className={s.field}>
                                <label className={s.label}>Section</label>
                                <input className={s.input} value={classForm.section} onChange={e => setClassForm(f => ({ ...f, section: e.target.value }))} placeholder="e.g. A" maxLength={3} />
                            </div>
                        </div>
                        <div className={s.modalFooter}>
                            <button className={s.btnGhost} onClick={closeClassModal}>Cancel</button>
                            <button className={s.btnPrimary} onClick={saveClass} disabled={savingClass}>{savingClass ? 'Saving...' : editClassId ? 'Update' : 'Add Class'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Subject modal */}
            {subModal && (
                <div className={s.overlay} onClick={e => e.target === e.currentTarget && closeSubModal()}>
                    <div className={s.modal}>
                        <h2 className={s.modalTitle}>{editSubId ? 'Edit Subject' : 'Add Subject'}</h2>
                        {error && <div className={s.error}>{error}</div>}
                        <div className={s.field}>
                            <label className={s.label}>Subject Name</label>
                            <input className={s.input} value={subForm.name} onChange={e => setSubForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mathematics" />
                        </div>
                        <div className={s.grid2}>
                            <div className={s.field}>
                                <label className={s.label}>Short Name</label>
                                <input className={s.input} value={subForm.short} onChange={e => setSubForm(f => ({ ...f, short: e.target.value }))} placeholder="e.g. Math" maxLength={8} />
                            </div>
                            <div className={s.field}>
                                <label className={s.label}>Icon (emoji)</label>
                                <input className={s.input} value={subForm.icon} onChange={e => setSubForm(f => ({ ...f, icon: e.target.value }))} placeholder="e.g. 📐" />
                            </div>
                        </div>
                        <div className={s.modalFooter}>
                            <button className={s.btnGhost} onClick={closeSubModal}>Cancel</button>
                            <button className={s.btnPrimary} onClick={saveSubject} disabled={savingSub}>{savingSub ? 'Saving...' : editSubId ? 'Update' : 'Add Subject'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}