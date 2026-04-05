import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import s from '../../components/teacher/TPage.module.css'
import cs from './Home.module.css'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Format a Date object → "YYYY-MM-DD"
function toDateStr(d) {
    return d.toISOString().slice(0, 10)
}

// Parse "YYYY-MM-DD" → Date object (local, no timezone shift)
function parseDate(str) {
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d)
}

export default function TeacherHome() {
    const navigate = useNavigate()
    const { teacher } = useOutletContext()

    const todayStr = toDateStr(new Date())

    const [selectedDate, setSelectedDate] = useState(todayStr)
    const [slots, setSlots] = useState([])
    const [periods, setPeriods] = useState([])
    const [breaks, setBreaks] = useState([])
    const [attLog, setAttLog] = useState([])
    const [classLog, setClassLog] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (teacher?.id) loadData(selectedDate)
    }, [teacher, selectedDate])

    async function loadData(dateStr) {
        setLoading(true)

        const dateObj = parseDate(dateStr)
        const dayName = DAYS[dateObj.getDay()]   // e.g. "Mon"

        // 1. Timetable slots for this teacher on this day-of-week
        const { data: slotData } = await supabase
            .from('timetable_slots')
            .select(`
        id, day, period, start_time, end_time, class_id,
        subjects ( id, name, short ),
        classes  ( id, name, grade, section, config_id )
      `)
            .eq('teacher_id', teacher.id)
            .eq('day', dayName)
            .order('period')

        const daySlots = slotData ?? []
        setSlots(daySlots)

        // 2. Period + break config from first slot's class
        if (daySlots.length > 0) {
            const configId = daySlots[0].classes?.config_id
            if (configId) {
                const [pRes, bRes] = await Promise.all([
                    supabase.from('period_config').select('*').eq('config_id', configId).order('period'),
                    supabase.from('break_config').select('*').eq('config_id', configId).order('after_period'),
                ])
                setPeriods(pRes.data ?? [])
                setBreaks(bRes.data ?? [])
            }
        } else {
            setPeriods([])
            setBreaks([])
        }

        // 3. Attendance + classroom log status for this specific date
        if (daySlots.length > 0) {
            const slotIds = daySlots.map(sl => sl.id)
            const [attRes, logRes] = await Promise.all([
                supabase.from('attendance').select('slot_id').in('slot_id', slotIds).eq('date', dateStr),
                supabase.from('classroom_logs').select('slot_id').in('slot_id', slotIds).eq('date', dateStr),
            ])
            setAttLog(attRes.data ?? [])
            setClassLog(logRes.data ?? [])
        } else {
            setAttLog([])
            setClassLog([])
        }

        setLoading(false)
    }

    // ── Date navigation ────────────────────────────────────────

    function goToDate(dateStr) {
        setSelectedDate(dateStr)
    }

    function shiftDay(delta) {
        const d = parseDate(selectedDate)
        d.setDate(d.getDate() + delta)
        setSelectedDate(toDateStr(d))
    }

    function goToToday() {
        setSelectedDate(todayStr)
    }

    // ── Helpers ────────────────────────────────────────────────

    function hasAttendance(slotId) {
        return attLog.some(a => a.slot_id === slotId)
    }

    function hasLog(slotId) {
        return classLog.some(l => l.slot_id === slotId)
    }

    function getBreakAfter(period) {
        return breaks.find(b => b.after_period === period) ?? null
    }

    function getPeriodTime(period) {
        const p = periods.find(p => p.period === period)
        if (!p) return ''
        return `${p.start_time.slice(0, 5)} – ${p.end_time.slice(0, 5)}`
    }

    function slotStatus(slotId) {
        const att = hasAttendance(slotId)
        const log = hasLog(slotId)
        if (att && log) return 'done'
        if (att) return 'att'
        if (log) return 'log'
        return 'pending'
    }

    const selectedDateObj = parseDate(selectedDate)
    const isToday = selectedDate === todayStr
    const isSunday = selectedDateObj.getDay() === 0

    const formattedDate = selectedDateObj.toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

    return (
        <div>
            {/* ── Date picker bar ── */}
            <div className={cs.datebar}>
                <div className={cs.datebarLeft}>
                    {/* Prev day */}
                    <button className={cs.navBtn} onClick={() => shiftDay(-1)}>
                        &larr;
                    </button>

                    {/* Date input */}
                    <div className={cs.dateInputWrap}>
                        <input
                            className={cs.dateInput}
                            type="date"
                            value={selectedDate}
                            onChange={e => goToDate(e.target.value)}
                        />
                    </div>

                    {/* Next day */}
                    <button className={cs.navBtn} onClick={() => shiftDay(1)}>
                        &rarr;
                    </button>

                    {/* Today shortcut */}
                    {!isToday && (
                        <button className={cs.todayBtn} onClick={goToToday}>
                            Today
                        </button>
                    )}
                </div>

                {/* Progress chips */}
                {slots.length > 0 && !loading && (
                    <div className={cs.chips}>
                        <div className={cs.chip}>
                            <div className={cs.chipDot} style={{ background: '#10b981' }} />
                            {attLog.length} / {slots.length} attendance
                        </div>
                        <div className={cs.chip}>
                            <div className={cs.chipDot} style={{ background: '#f59e0b' }} />
                            {classLog.length} / {slots.length} logs
                        </div>
                    </div>
                )}
            </div>

            {/* ── Date heading ── */}
            <div className={cs.header}>
                <div className={cs.dateLabel}>
                    {formattedDate}
                    {isToday && <span className={cs.todayBadge}>Today</span>}
                </div>
                <div className={cs.subtitle}>
                    {loading
                        ? 'Loading...'
                        : isSunday
                            ? 'Sunday — no classes'
                            : slots.length > 0
                                ? `${slots.length} period${slots.length !== 1 ? 's' : ''} scheduled`
                                : 'No classes scheduled'}
                </div>
            </div>

            {/* ── Loading ── */}
            {loading && (
                <div className={s.loading}>Loading schedule...</div>
            )}

            {/* ── Sunday notice ── */}
            {!loading && isSunday && (
                <div className={cs.emptyDay}>
                    <div className={cs.emptyText}>Sunday — no classes scheduled</div>
                </div>
            )}

            {/* ── No slots for this day ── */}
            {!loading && !isSunday && slots.length === 0 && (
                <div className={cs.emptyDay}>
                    <div className={cs.emptyText}>
                        No classes assigned on{' '}
                        {DAY_NAMES[selectedDateObj.getDay()]}s
                    </div>
                </div>
            )}

            {/* ── Timetable slots ── */}
            {!loading && slots.length > 0 && (
                <div className={cs.timeline}>
                    {slots.map((slot, idx) => {
                        const status = slotStatus(slot.id)
                        const prevSlot = idx > 0 ? slots[idx - 1] : null
                        const brk = prevSlot ? getBreakAfter(prevSlot.period) : null

                        return (
                            <div key={slot.id}>
                                {/* Break separator */}
                                {brk && (
                                    <div className={cs.break}>
                                        <div className={cs.breakLine} />
                                        <div className={cs.breakLabel}>
                                            {brk.label}&nbsp;&nbsp;
                                            {brk.start_time.slice(0, 5)} – {brk.end_time.slice(0, 5)}
                                        </div>
                                        <div className={cs.breakLine} />
                                    </div>
                                )}

                                {/* Slot card */}
                                <div className={`${cs.slotCard} ${cs[`slot_${status}`]}`}>

                                    {/* Left — period */}
                                    <div className={cs.slotLeft}>
                                        <div className={cs.periodBadge}>P{slot.period}</div>
                                        <div className={cs.slotTime}>{getPeriodTime(slot.period)}</div>
                                    </div>

                                    {/* Center — subject + class */}
                                    <div className={cs.slotCenter}>
                                        <div className={cs.slotSubject}>{slot.subjects?.name}</div>
                                        <div className={cs.slotClass}>{slot.classes?.name}</div>
                                    </div>

                                    {/* Right — status dots + action buttons */}
                                    <div className={cs.slotRight}>
                                        <div className={cs.statusRow}>
                                            <span className={`${cs.statusDot} ${hasAttendance(slot.id) ? cs.dotGreen : cs.dotGray}`} />
                                            <span className={cs.statusLabel}>Attendance</span>
                                        </div>
                                        <div className={cs.statusRow}>
                                            <span className={`${cs.statusDot} ${hasLog(slot.id) ? cs.dotAmber : cs.dotGray}`} />
                                            <span className={cs.statusLabel}>Class log</span>
                                        </div>
                                        <div className={cs.slotActions}>
                                            <button
                                                className={cs.actionBtn}
                                                onClick={() => navigate('/teacher/attendance', {
                                                    state: {
                                                        slotId: slot.id,
                                                        slotDay: slot.day,
                                                        slotPeriod: slot.period,
                                                        date: selectedDate,
                                                    }
                                                })}
                                            >
                                                Attendance
                                            </button>
                                            <button
                                                className={cs.actionBtnSecondary}
                                                onClick={() => navigate('/teacher/log', {
                                                    state: {
                                                        slotId: slot.id,
                                                        slotDay: slot.day,
                                                        slotPeriod: slot.period,
                                                        date: selectedDate,
                                                    }
                                                })}
                                            >
                                                Log
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}