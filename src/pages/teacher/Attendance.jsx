import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import s from '../../components/teacher/TPage.module.css'
import cs from './Attendance.module.css'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const STATUS = ['P', 'A', 'L']
const STATUS_LABEL = { P: 'Present', A: 'Absent', L: 'Late' }

export default function TeacherAttendance() {
    const navigate = useNavigate()
    const location = useLocation()
    const { teacher } = useOutletContext()

    // if navigated from home with a pre-selected slot + date
    const preSlot = location.state

    const today = new Date()
    const todayName = DAYS[today.getDay()]
    const todayDate = today.toISOString().slice(0, 10)

    // slot selection
    const [mySlots, setMySlots] = useState([])
    const [selectedSlot, setSelectedSlot] = useState(null)

    // students + attendance state
    const [students, setStudents] = useState([])
    const [attState, setAttState] = useState({})   // { studentId: 'P'|'A'|'L' }

    // date (default today, or date passed from home)
    const [date, setDate] = useState(preSlot?.date ?? todayDate)

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
        id, day, period, start_time, end_time,
        subjects ( name, short ),
        classes  ( id, name )
      `)
            .eq('teacher_id', teacher.id)
            .order('day')
            .order('period')
        setMySlots(data ?? [])

        // auto-select pre-selected slot from navigation
        if (preSlot?.slotId && data) {
            const found = data.find(s => s.id === preSlot.slotId)
            if (found) {
                setSelectedSlot(found)
                await loadAttendance(found, todayDate)
            }
        }
        setLoading(false)
    }

    async function handleSlotChange(slotId) {
        const slot = mySlots.find(s => s.id === slotId)
        setSelectedSlot(slot)
        setSaved(false)
        setError(null)
        if (slot) await loadAttendance(slot, date)
    }

    async function handleDateChange(newDate) {
        setDate(newDate)
        setSaved(false)
        setError(null)
        if (selectedSlot) await loadAttendance(selectedSlot, newDate)
    }

    async function loadAttendance(slot, forDate) {
        setLoading(true)

        // load students in this class
        const { data: studs } = await supabase
            .from('students')
            .select('id, full_name, roll_number, student_id')
            .eq('class_id', slot.classes.id)
            .order('roll_number')
        setStudents(studs ?? [])

        // load existing attendance for this slot+date
        const { data: att } = await supabase
            .from('attendance')
            .select('student_id, status')
            .eq('slot_id', slot.id)
            .eq('date', forDate)

        const state = {}
        if (att) att.forEach(a => { state[a.student_id] = a.status })
        setAttState(state)
        setLoading(false)
    }

    function setStatus(studentId, status) {
        setAttState(prev => ({ ...prev, [studentId]: status }))
        setSaved(false)
    }

    function markAll(status) {
        const newState = {}
        students.forEach(st => { newState[st.id] = status })
        setAttState(newState)
        setSaved(false)
    }

    async function handleSave() {
        if (!selectedSlot) return
        const unmarked = students.filter(st => !attState[st.id])
        if (unmarked.length > 0) {
            if (!confirm(`${unmarked.length} student(s) are unmarked. Save anyway?`)) return
        }

        setSaving(true)
        setError(null)

        // upsert all attendance records
        const records = students
            .filter(st => attState[st.id])
            .map(st => ({
                student_id: st.id,
                slot_id: selectedSlot.id,
                date: date,
                status: attState[st.id],
                marked_by: teacher.id,
            }))

        const { error } = await supabase
            .from('attendance')
            .upsert(records, { onConflict: 'student_id,slot_id,date' })

        setSaving(false)
        if (error) { setError(error.message); return }
        setSaved(true)
    }

    // Stats
    const present = Object.values(attState).filter(s => s === 'P').length
    const absent = Object.values(attState).filter(s => s === 'A').length
    const late = Object.values(attState).filter(s => s === 'L').length
    const unmarked = students.length - present - absent - late

    if (loading && mySlots.length === 0) {
        return <div className={s.loading}>Loading your slots...</div>
    }

    return (
        <div>
            {/* Slot + date selector */}
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
            {saved && <div className={s.success}>Attendance saved successfully</div>}

            {/* No slot selected */}
            {!selectedSlot && (
                <div className={s.empty}>
                    <div className={s.emptyText}>Select a period above to mark attendance</div>
                </div>
            )}

            {/* Attendance table */}
            {selectedSlot && (
                <>
                    {/* Slot info + stats */}
                    <div className={cs.slotInfo}>
                        <div className={cs.slotInfoLeft}>
                            <div className={cs.slotName}>
                                {selectedSlot.subjects?.name} — {selectedSlot.classes?.name}
                            </div>
                            <div className={cs.slotMeta}>
                                {selectedSlot.day} · Period {selectedSlot.period}
                            </div>
                        </div>
                        <div className={cs.stats}>
                            <div className={cs.stat}>
                                <span className={cs.statVal} style={{ color: '#10b981' }}>{present}</span>
                                <span className={cs.statLabel}>Present</span>
                            </div>
                            <div className={cs.stat}>
                                <span className={cs.statVal} style={{ color: '#ef4444' }}>{absent}</span>
                                <span className={cs.statLabel}>Absent</span>
                            </div>
                            <div className={cs.stat}>
                                <span className={cs.statVal} style={{ color: '#f59e0b' }}>{late}</span>
                                <span className={cs.statLabel}>Late</span>
                            </div>
                            <div className={cs.stat}>
                                <span className={cs.statVal} style={{ color: '#6b7280' }}>{unmarked}</span>
                                <span className={cs.statLabel}>Unmarked</span>
                            </div>
                        </div>
                    </div>

                    {/* Bulk actions */}
                    <div className={cs.bulkActions}>
                        <span className={cs.bulkLabel}>Mark all as:</span>
                        <button className={cs.bulkBtn} style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}
                            onClick={() => markAll('P')}>Present</button>
                        <button className={cs.bulkBtn} style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                            onClick={() => markAll('A')}>Absent</button>
                        <button className={cs.bulkBtn} style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}
                            onClick={() => markAll('L')}>Late</button>
                    </div>

                    {/* Student list */}
                    {loading ? (
                        <div className={s.loading}>Loading students...</div>
                    ) : students.length === 0 ? (
                        <div className={s.empty}>
                            <div className={s.emptyText}>No students found in this class</div>
                        </div>
                    ) : (
                        <div className={cs.studentList}>
                            {students.map(st => {
                                const current = attState[st.id]
                                return (
                                    <div key={st.id} className={`${cs.studentRow} ${current ? cs[`row_${current}`] : ''}`}>
                                        <div className={cs.studentLeft}>
                                            <div className={cs.rollNo}>{st.roll_number}</div>
                                            <div>
                                                <div className={cs.studentName}>{st.full_name}</div>
                                                <div className={cs.studentId}>{st.student_id}</div>
                                            </div>
                                        </div>
                                        <div className={cs.statusBtns}>
                                            {STATUS.map(st_code => (
                                                <button
                                                    key={st_code}
                                                    className={`${cs.statusBtn} ${current === st_code ? cs[`active_${st_code}`] : ''}`}
                                                    onClick={() => setStatus(st.id, st_code)}
                                                >
                                                    {STATUS_LABEL[st_code]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Save button */}
                    {students.length > 0 && (
                        <div className={cs.saveRow}>
                            <button
                                className={s.btnPrimary}
                                onClick={handleSave}
                                disabled={saving}
                                style={{ minWidth: 140 }}
                            >
                                {saving ? 'Saving...' : 'Save Attendance'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}