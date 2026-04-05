import { useEffect, useState } from 'react'
import { useLocation, useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import s from '../../components/teacher/TPage.module.css'
import cs from './ClassroomLog.module.css'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const METHODS = [
    'Lecture',
    'Discussion',
    'Problem Solving',
    'Group Activity',
    'Lab / Practical',
    'Video / Visual',
    'Revision',
]

const REMARKS = [
    'Good — active participation',
    'Excellent participation',
    'Average — needs engagement',
    'Needs improvement',
    'Revision needed',
    'Topic completed',
]

const EMPTY_FORM = {
    chapter: '',
    topic: '',
    method: '',
    notes: '',
    class_remark: '',
    homework: [''],
}

export default function ClassroomLog() {
    const location = useLocation()
    const { teacher } = useOutletContext()
    const preSlot = location.state

    const today = new Date()
    const todayDate = today.toISOString().slice(0, 10)

    const [mySlots, setMySlots] = useState([])
    const [selectedSlot, setSelectedSlot] = useState(null)
    const [date, setDate] = useState(preSlot?.date ?? todayDate)
    const [form, setForm] = useState(EMPTY_FORM)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (teacher?.id) loadSlots()
    }, [teacher])

    async function loadSlots() {
        setLoading(true)
        const { data } = await supabase
            .from('timetable_slots')
            .select(`
        id, day, period,
        subjects ( name ),
        classes  ( id, name )
      `)
            .eq('teacher_id', teacher.id)
            .order('day')
            .order('period')
        setMySlots(data ?? [])

        if (preSlot?.slotId && data) {
            const found = data.find(s => s.id === preSlot.slotId)
            if (found) {
                setSelectedSlot(found)
                await loadLog(found.id, todayDate)
            }
        }
        setLoading(false)
    }

    async function handleSlotChange(slotId) {
        const slot = mySlots.find(s => s.id === slotId) ?? null
        setSelectedSlot(slot)
        setSaved(false)
        setError(null)
        if (slot) await loadLog(slot.id, date)
        else setForm(EMPTY_FORM)
    }

    async function handleDateChange(newDate) {
        setDate(newDate)
        setSaved(false)
        setError(null)
        if (selectedSlot) await loadLog(selectedSlot.id, newDate)
    }

    async function loadLog(slotId, forDate) {
        const { data } = await supabase
            .from('classroom_logs')
            .select('*')
            .eq('slot_id', slotId)
            .eq('date', forDate)
            .single()

        if (data) {
            setForm({
                chapter: data.chapter ?? '',
                topic: data.topic ?? '',
                method: data.method ?? '',
                notes: data.notes ?? '',
                class_remark: data.class_remark ?? '',
                homework: data.homework?.length > 0 ? data.homework : [''],
            })
        } else {
            setForm(EMPTY_FORM)
        }
    }

    function handleChange(e) {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }))
        setSaved(false)
    }

    function setHomework(idx, val) {
        setForm(f => {
            const hw = [...f.homework]
            hw[idx] = val
            return { ...f, homework: hw }
        })
        setSaved(false)
    }

    function addHomework() {
        setForm(f => ({ ...f, homework: [...f.homework, ''] }))
    }

    function removeHomework(idx) {
        setForm(f => ({
            ...f,
            homework: f.homework.filter((_, i) => i !== idx)
        }))
    }

    async function handleSave() {
        if (!selectedSlot) return
        if (!form.topic.trim()) { setError('Topic is required'); return }

        setSaving(true)
        setError(null)

        const payload = {
            slot_id: selectedSlot.id,
            date: date,
            teacher_id: teacher.id,
            chapter: form.chapter.trim() || null,
            topic: form.topic.trim(),
            method: form.method || null,
            notes: form.notes.trim() || null,
            class_remark: form.class_remark || null,
            homework: form.homework.filter(h => h.trim()),
        }

        const { error } = await supabase
            .from('classroom_logs')
            .upsert(payload, { onConflict: 'slot_id,date' })

        setSaving(false)
        if (error) { setError(error.message); return }
        setSaved(true)
    }

    if (loading && mySlots.length === 0) {
        return <div className={s.loading}>Loading your slots...</div>
    }

    return (
        <div>
            {/* Selectors */}
            <div className={cs.controls}>
                <div className={s.field} style={{ flex: 1 }}>
                    <label className={s.label}>Select Period</label>
                    <select
                        className={s.select}
                        value={selectedSlot?.id ?? ''}
                        onChange={e => handleSlotChange(e.target.value)}
                    >
                        <option value="">-- Select a period --</option>
                        {mySlots.map(sl => (
                            <option key={sl.id} value={sl.id}>
                                {sl.day} — P{sl.period} — {sl.subjects?.name} ({sl.classes?.name})
                            </option>
                        ))}
                    </select>
                </div>
                <div className={s.field}>
                    <label className={s.label}>Date</label>
                    <input
                        className={s.input}
                        type="date"
                        value={date}
                        onChange={e => handleDateChange(e.target.value)}
                        style={{ width: 'auto' }}
                    />
                </div>
            </div>

            {error && <div className={s.error}>{error}</div>}
            {saved && <div className={s.success}>Classroom log saved</div>}

            {!selectedSlot && (
                <div className={s.empty}>
                    <div className={s.emptyText}>Select a period above to fill the classroom log</div>
                </div>
            )}

            {selectedSlot && (
                <div className={cs.form}>
                    {/* Slot banner */}
                    <div className={cs.slotBanner}>
                        <span className={cs.bannerSubject}>{selectedSlot.subjects?.name}</span>
                        <span className={cs.bannerDivider}>—</span>
                        <span className={cs.bannerClass}>{selectedSlot.classes?.name}</span>
                        <span className={cs.bannerDivider}>·</span>
                        <span className={cs.bannerPeriod}>{selectedSlot.day}, Period {selectedSlot.period}</span>
                    </div>

                    {/* Section — Lesson */}
                    <div className={cs.section}>
                        <div className={cs.sectionTitle}>Lesson Details</div>

                        <div className={cs.grid2}>
                            <div className={s.field}>
                                <label className={s.label}>Chapter</label>
                                <input
                                    className={s.input}
                                    name="chapter"
                                    value={form.chapter}
                                    onChange={handleChange}
                                    placeholder="e.g. Quadratic Equations"
                                />
                            </div>
                            <div className={s.field}>
                                <label className={s.label}>Topic *</label>
                                <input
                                    className={s.input}
                                    name="topic"
                                    value={form.topic}
                                    onChange={handleChange}
                                    placeholder="e.g. Completing the square"
                                />
                            </div>
                            <div className={s.field}>
                                <label className={s.label}>Teaching Method</label>
                                <select className={s.select} name="method" value={form.method} onChange={handleChange}>
                                    <option value="">-- Select method --</option>
                                    {METHODS.map(m => <option key={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className={s.field}>
                                <label className={s.label}>Class Remark</label>
                                <select className={s.select} name="class_remark" value={form.class_remark} onChange={handleChange}>
                                    <option value="">-- Select remark --</option>
                                    {REMARKS.map(r => <option key={r}>{r}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className={s.field}>
                            <label className={s.label}>Notes</label>
                            <textarea
                                className={s.textarea}
                                name="notes"
                                value={form.notes}
                                onChange={handleChange}
                                placeholder="Observations, what went well, what needs follow-up..."
                            />
                        </div>
                    </div>

                    {/* Section — Homework */}
                    <div className={cs.section}>
                        <div className={cs.sectionHeader}>
                            <div className={cs.sectionTitle}>Homework</div>
                            <button className={cs.addHwBtn} onClick={addHomework}>
                                + Add item
                            </button>
                        </div>

                        {form.homework.map((hw, idx) => (
                            <div key={idx} className={cs.hwRow}>
                                <input
                                    className={s.input}
                                    value={hw}
                                    onChange={e => setHomework(idx, e.target.value)}
                                    placeholder={`Homework item ${idx + 1}`}
                                />
                                {form.homework.length > 1 && (
                                    <button
                                        className={cs.removeHwBtn}
                                        onClick={() => removeHomework(idx)}
                                    >
                                        x
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Save */}
                    <div className={cs.saveRow}>
                        <button
                            className={s.btnPrimary}
                            onClick={handleSave}
                            disabled={saving}
                            style={{ minWidth: 140 }}
                        >
                            {saving ? 'Saving...' : 'Save Log'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}