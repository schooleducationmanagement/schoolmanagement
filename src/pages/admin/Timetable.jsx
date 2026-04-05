import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import s from '../../components/admin/PageShell.module.css'
import t from './Timetable.module.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const EMPTY_SLOT = { subject_id: '', teacher_id: '' }

export default function Timetable() {
    const [classes, setClasses] = useState([])
    const [subjects, setSubjects] = useState([])
    const [assignments, setAssignments] = useState([])
    const [slots, setSlots] = useState([])
    const [periods, setPeriods] = useState([])   // from period_config
    const [breaks, setBreaks] = useState([])   // from break_config

    const [classId, setClassId] = useState('')
    const [className, setClassName] = useState('')

    const [loadingGrid, setLoadingGrid] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [error, setError] = useState(null)

    const [modal, setModal] = useState(false)
    const [cell, setCell] = useState(null)
    const [slotForm, setSlotForm] = useState(EMPTY_SLOT)
    const [editSlotId, setEditSlotId] = useState(null)
    const [teachers, setTeachers] = useState([])
    const [conflict, setConflict] = useState(null)
    const [saving, setSaving] = useState(false)
    const [modalError, setModalError] = useState(null)

    useEffect(() => { fetchClasses() }, [])

    // ── Fetch classes ──────────────────────────────────────────

    async function fetchClasses() {
        const { data } = await supabase
            .from('classes')
            .select('id, name, config_id')
            .order('grade')
            .order('section')
        if (data) setClasses(data)
    }

    // ── When class selected, load its config + data ────────────

    async function handleClassChange(e) {
        const id = e.target.value
        setClassId(id)
        setClassName(classes.find(c => c.id === id)?.name ?? '')
        setSlots([])
        setError(null)
        setPeriods([])
        setBreaks([])
        if (!id) return
        loadClassData(id)
    }

    async function loadClassData(id) {
        setLoadingGrid(true)

        // get class config_id
        const cls = classes.find(c => c.id === id)
        const configId = cls?.config_id

        // fetch subjects, slots, and config in parallel
        const [subRes, slotRes] = await Promise.all([
            supabase.from('subjects').select('id, name, short').eq('class_id', id).order('name'),
            supabase
                .from('timetable_slots')
                .select('id, day, period, subject_id, teacher_id, is_published, subjects(name, short), teachers(name)')
                .eq('class_id', id),
        ])

        const subs = subRes.data ?? []
        setSubjects(subs)
        setSlots(slotRes.data ?? [])

        // fetch period + break config for this class
        if (configId) {
            const [pRes, bRes] = await Promise.all([
                supabase.from('period_config').select('*').eq('config_id', configId).order('period'),
                supabase.from('break_config').select('*').eq('config_id', configId).order('after_period'),
            ])
            setPeriods(pRes.data ?? [])
            setBreaks(bRes.data ?? [])
        } else {
            setError('This class has no schedule assigned. Go to Settings and assign a schedule first.')
        }

        // fetch teacher assignments for this class's subjects
        if (subs.length > 0) {
            const { data: asgData } = await supabase
                .from('teacher_subjects')
                .select('teacher_id, subject_id, teachers(id, name)')
                .in('subject_id', subs.map(s => s.id))
            setAssignments(asgData ?? [])
        } else {
            setAssignments([])
        }

        setLoadingGrid(false)
    }

    // ── Grid helpers ───────────────────────────────────────────

    function getSlot(day, period) {
        return slots.find(sl => sl.day === day && sl.period === period) ?? null
    }

    function isBreakAfter(period) {
        return breaks.find(b => b.after_period === period) ?? null
    }

    const totalSlots = DAYS.length * periods.length
    const filledSlots = slots.length
    const allFilled = totalSlots > 0 && filledSlots === totalSlots
    const isPublished = slots.length > 0 && slots.every(sl => sl.is_published)

    // ── Open cell modal ────────────────────────────────────────

    function openCell(day, period) {
        if (!classId) return
        const existing = getSlot(day, period)
        setCell({ day, period })
        setConflict(null)
        setModalError(null)

        if (existing) {
            setSlotForm({ subject_id: existing.subject_id, teacher_id: existing.teacher_id })
            setEditSlotId(existing.id)
            loadTeachersForSubject(existing.subject_id)
        } else {
            setSlotForm(EMPTY_SLOT)
            setEditSlotId(null)
            setTeachers([])
        }
        setModal(true)
    }

    function closeModal() {
        setModal(false)
        setCell(null)
        setSlotForm(EMPTY_SLOT)
        setEditSlotId(null)
        setTeachers([])
        setConflict(null)
        setModalError(null)
    }

    // ── Subject / teacher change ───────────────────────────────

    function loadTeachersForSubject(subjectId) {
        const filtered = assignments
            .filter(a => a.subject_id === subjectId)
            .map(a => a.teachers)
            .filter(Boolean)
        setTeachers(filtered)
    }

    function handleSubjectChange(e) {
        const subjectId = e.target.value
        setSlotForm(f => ({ ...f, subject_id: subjectId, teacher_id: '' }))
        setConflict(null)
        if (subjectId) loadTeachersForSubject(subjectId)
        else setTeachers([])
    }

    async function handleTeacherChange(e) {
        const teacherId = e.target.value
        setSlotForm(f => ({ ...f, teacher_id: teacherId }))
        setConflict(null)
        if (teacherId && cell) checkConflict(teacherId, cell.day, cell.period)
    }

    // ── Conflict check ─────────────────────────────────────────

    async function checkConflict(teacherId, day, period) {
        const { data } = await supabase
            .from('timetable_slots')
            .select('id, class_id, classes(name)')
            .eq('teacher_id', teacherId)
            .eq('day', day)
            .eq('period', period)
            .neq('class_id', classId)

        if (data && data.length > 0) {
            setConflict(
                `Warning: this teacher already has a slot in ${data[0].classes?.name ?? 'another class'} on ${day} Period ${period}. You can still save.`
            )
        } else {
            setConflict(null)
        }
    }

    // ── Save slot ──────────────────────────────────────────────

    async function handleSave() {
        if (!slotForm.subject_id || !slotForm.teacher_id) {
            setModalError('Please select both a subject and a teacher')
            return
        }
        setSaving(true)
        setModalError(null)

        const periodRow = periods.find(p => p.period === cell.period)

        const payload = {
            class_id: classId,
            subject_id: slotForm.subject_id,
            teacher_id: slotForm.teacher_id,
            day: cell.day,
            period: cell.period,
            start_time: periodRow?.start_time ?? '00:00',
            end_time: periodRow?.end_time ?? '00:00',
        }

        let error
        if (editSlotId) {
            ; ({ error } = await supabase
                .from('timetable_slots')
                .update({ subject_id: payload.subject_id, teacher_id: payload.teacher_id })
                .eq('id', editSlotId))
        } else {
            ; ({ error } = await supabase.from('timetable_slots').insert(payload))
        }

        setSaving(false)
        if (error) { setModalError(error.message); return }
        closeModal()
        loadClassData(classId)
    }

    // ── Clear slot ─────────────────────────────────────────────

    async function handleClear() {
        if (!editSlotId) return
        if (!confirm('Remove this slot?')) return
        await supabase.from('timetable_slots').delete().eq('id', editSlotId)
        closeModal()
        loadClassData(classId)
    }

    // ── Publish ────────────────────────────────────────────────

    async function handlePublish() {
        if (!allFilled) return
        if (!confirm(`Publish timetable for ${className}? Teachers will be able to see their schedule.`)) return
        setPublishing(true)
        await supabase
            .from('timetable_slots')
            .update({ is_published: true })
            .eq('class_id', classId)
        setPublishing(false)
        loadClassData(classId)
    }

    // ── Render ─────────────────────────────────────────────────

    return (
        <div>
            {/* Top controls */}
            <div className={t.controls}>
                <div className={t.classSelect}>
                    <label className={s.label}>Select Class</label>
                    <select
                        className={s.select}
                        value={classId}
                        onChange={handleClassChange}
                        style={{ minWidth: 200 }}
                    >
                        <option value="">-- Select a class --</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {classId && !error && (
                    <div className={t.stats}>
                        <span className={t.progress}>
                            {filledSlots} / {totalSlots} slots filled
                        </span>
                        {isPublished ? (
                            <span className={t.publishedBadge}>Published</span>
                        ) : (
                            <button
                                className={`${s.btnPrimary} ${!allFilled ? t.btnDisabled : ''}`}
                                onClick={handlePublish}
                                disabled={!allFilled || publishing}
                                title={!allFilled ? 'Fill all slots before publishing' : ''}
                            >
                                {publishing ? 'Publishing...' : 'Publish Timetable'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {error && <div className={s.error}>{error}</div>}

            {/* Empty — no class selected */}
            {!classId && (
                <div className={t.emptyState}>
                    <div className={t.emptyIcon}>+</div>
                    <div className={t.emptyText}>Select a class to start building its timetable</div>
                </div>
            )}

            {/* Grid */}
            {classId && !error && (
                loadingGrid ? (
                    <div className={s.loading}>Loading timetable...</div>
                ) : subjects.length === 0 ? (
                    <div className={t.emptyState}>
                        <div className={t.emptyText}>No subjects found for {className}. Add subjects to this class first.</div>
                    </div>
                ) : periods.length === 0 ? (
                    <div className={t.emptyState}>
                        <div className={t.emptyText}>No periods configured for this class's schedule. Go to Settings and add periods.</div>
                    </div>
                ) : (
                    <div className={t.gridWrap}>
                        <table className={t.grid}>
                            <thead>
                                <tr>
                                    <th className={t.periodCol}>Period</th>
                                    {DAYS.map(day => (
                                        <th key={day} className={t.dayCol}>{day}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {periods.map(periodRow => (
                                    <React.Fragment key={periodRow.id}>
                                        <tr>
                                            <td className={t.periodLabel}>
                                                <div className={t.periodNum}>{periodRow.label ?? `P${periodRow.period}`}</div>
                                                <div className={t.periodTime}>
                                                    {periodRow.start_time.slice(0, 5)} - {periodRow.end_time.slice(0, 5)}
                                                </div>
                                            </td>
                                            {DAYS.map(day => {
                                                const slot = getSlot(day, periodRow.period)
                                                return (
                                                    <td key={day} className={t.cellTd}>
                                                        <div
                                                            className={`${t.cell} ${slot ? t.cellFilled : t.cellEmpty}`}
                                                            onClick={() => openCell(day, periodRow.period)}
                                                        >
                                                            {slot ? (
                                                                <>
                                                                    <div className={t.cellSubject}>
                                                                        {slot.subjects?.short ?? slot.subjects?.name}
                                                                    </div>
                                                                    <div className={t.cellTeacher}>
                                                                        {slot.teachers?.name}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className={t.cellAdd}>+ Add</div>
                                                            )}
                                                        </div>
                                                    </td>
                                                )
                                            })}
                                        </tr>

                                        {/* Break row if a break exists after this period */}
                                        {isBreakAfter(periodRow.period) && (() => {
                                            const br = isBreakAfter(periodRow.period)
                                            return (
                                                <tr key={`break-${periodRow.period}`} className={t.breakRow}>
                                                    <td colSpan={DAYS.length + 1} className={t.breakCell}>
                                                        {br.label}  {br.start_time.slice(0, 5)} - {br.end_time.slice(0, 5)}
                                                    </td>
                                                </tr>
                                            )
                                        })()}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            )}

            {/* Modal */}
            {modal && cell && (
                <div
                    className={s.overlay}
                    onClick={e => e.target === e.currentTarget && closeModal()}
                >
                    <div className={s.modal}>
                        <div className={t.modalHeader}>
                            <div className={t.modalDay}>{cell.day}</div>
                            <div className={t.modalMeta}>
                                <span>Period {cell.period}</span>
                                <span className={t.modalDot} />
                                <span>
                                    {periods.find(p => p.period === cell.period)?.start_time.slice(0, 5)}
                                    {' - '}
                                    {periods.find(p => p.period === cell.period)?.end_time.slice(0, 5)}
                                </span>
                                <span className={t.modalDot} />
                                <span>{className}</span>
                            </div>
                        </div>

                        {modalError && <div className={s.error}>{modalError}</div>}
                        {conflict && <div className={t.conflictWarning}>{conflict}</div>}

                        <div className={s.field}>
                            <label className={s.label}>Subject</label>
                            <select className={s.select} value={slotForm.subject_id} onChange={handleSubjectChange}>
                                <option value="">-- Select Subject --</option>
                                {subjects.map(sub => (
                                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className={s.field}>
                            <label className={s.label}>Teacher</label>
                            <select
                                className={s.select}
                                value={slotForm.teacher_id}
                                onChange={handleTeacherChange}
                                disabled={!slotForm.subject_id}
                            >
                                <option value="">
                                    {!slotForm.subject_id
                                        ? '-- Select a subject first --'
                                        : teachers.length === 0
                                            ? '-- No teachers assigned to this subject --'
                                            : '-- Select Teacher --'}
                                </option>
                                {teachers.map(tc => (
                                    <option key={tc.id} value={tc.id}>{tc.name}</option>
                                ))}
                            </select>
                            {slotForm.subject_id && teachers.length === 0 && (
                                <div className={t.noTeacherHint}>
                                    Go to Assignments and assign a teacher to this subject first.
                                </div>
                            )}
                        </div>

                        <div className={s.modalFooter}>
                            {editSlotId && (
                                <button className={s.btnDanger} onClick={handleClear} style={{ marginRight: 'auto' }}>
                                    Clear Slot
                                </button>
                            )}
                            <button className={s.btnGhost} onClick={closeModal}>Cancel</button>
                            <button className={s.btnPrimary} onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : editSlotId ? 'Update' : 'Save Slot'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}