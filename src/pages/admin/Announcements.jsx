import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import s from './Announcements.module.css'
import ps from '../../components/admin/PageShell.module.css'

const EMPTY_FORM = { title: '', description: '', startDate: '', endDate: '' }

// ── helpers ──────────────────────────────────────────────────────────────────

/** Formats a 'YYYY-MM-DD' string as 'DD-MM-YYYY'. */
function formatDate(str) {
    if (!str) return '—'
    const [y, m, d] = str.split('-')
    return `${d}-${m}-${y}`
}

/** Parses a 'YYYY-MM-DD' string into a local-midnight Date. */
function parseLocalDate(str) {
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d)
}

/** Finds the announcement whose [start_date, end_date] range includes `dateStr`. */
function findAnnouncementForDate(announcements, dateStr) {
    return announcements.find(ann => dateStr >= ann.start_date && dateStr <= ann.end_date) || null
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Announcements() {
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [modal, setModal] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [editId, setEditId] = useState(null)
    const [saving, setSaving] = useState(false)

    // Hero state: which announcement is shown (null = latest)
    const [selectedAnnIdx, setSelectedAnnIdx] = useState(0)

    // Calendar navigation
    const today = new Date()
    const [calYear, setCalYear] = useState(today.getFullYear())
    const [calMonth, setCalMonth] = useState(today.getMonth()) // 0-indexed

    useEffect(() => { fetchAnnouncements() }, [])

    // Reset hero to latest whenever announcements reload
    useEffect(() => { setSelectedAnnIdx(0) }, [announcements])

    async function fetchAnnouncements() {
        setLoading(true)
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .order('start_date', { ascending: false })

        if (error) setError(error.message)
        else setAnnouncements(data)
        setLoading(false)
    }

    const toggleModal = () => {
        setModal(!modal)
        if (modal) {
            setForm(EMPTY_FORM)
            setEditId(null)
            setError(null)
        }
    }

    const handleEdit = (ann) => {
        setForm({
            title: ann.title,
            description: ann.description,
            startDate: ann.start_date,
            endDate: ann.end_date,
        })
        setEditId(ann.id)
        setModal(true)
    }

    const handleSave = async () => {
        if (!form.title.trim() || !form.description.trim() || !form.startDate || !form.endDate) {
            setError('All fields are required')
            return
        }
        setSaving(true)
        setError(null)
        const payload = {
            title: form.title.trim(),
            description: form.description.trim(),
            start_date: form.startDate,
            end_date: form.endDate,
        }
        const { error: saveError } = editId
            ? await supabase.from('announcements').update(payload).eq('id', editId)
            : await supabase.from('announcements').insert(payload)

        setSaving(false)
        if (saveError) {
            setError(saveError.message)
        } else {
            toggleModal()
            fetchAnnouncements()
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this announcement?')) return
        const { error: delError } = await supabase.from('announcements').delete().eq('id', id)
        if (delError) alert(delError.message)
        else fetchAnnouncements()
    }

    // ── Calendar helpers ──────────────────────────────────────────────────────

    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ]

    /** How many days in the current calendar month */
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()

    /**
     * Day-of-week of the 1st (0=Sun … 6=Sat).
     * We display Mon-Sun, so we convert: Mon=0, Tue=1 … Sun=6
     */
    const firstDayRaw = new Date(calYear, calMonth, 1).getDay() // 0=Sun
    const firstDayMon = (firstDayRaw + 6) % 7 // shift so Mon=0

    /** Build a flat grid: nulls for leading empty cells + day numbers */
    const calCells = [
        ...Array(firstDayMon).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]

    /**
     * For a given day number, return the dateStr 'YYYY-MM-DD'.
     */
    function dayToDateStr(day) {
        return `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }

    /**
     * Determine if `day` falls within any announcement range.
     * Returns: 'start' | 'end' | 'range' | 'both' | null
     */
    function getDayHighlight(day) {
        if (!day) return null
        const dateStr = dayToDateStr(day)
        let isStart = false, isEnd = false, isRange = false
        for (const ann of announcements) {
            if (dateStr === ann.start_date) isStart = true
            if (dateStr === ann.end_date) isEnd = true
            if (dateStr > ann.start_date && dateStr < ann.end_date) isRange = true
        }
        if (isStart && isEnd) return 'both'
        if (isStart) return 'start'
        if (isEnd) return 'end'
        if (isRange) return 'range'
        return null
    }

    const [selectedDate, setSelectedDate] = useState(null) // 'YYYY-MM-DD' or null

    function handleDayClick(day) {
        if (!day) return
        const dateStr = dayToDateStr(day)
        setSelectedDate(dateStr)
        const ann = findAnnouncementForDate(announcements, dateStr)
        if (ann) {
            const idx = announcements.findIndex(a => a.id === ann.id)
            if (idx !== -1) setSelectedAnnIdx(idx)
        } else {
            setSelectedAnnIdx(-1) // no announcement on this date
        }
    }

    // ── Previous / Next month navigation ─────────────────────────────────────

    function prevMonth() {
        if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
        else setCalMonth(m => m - 1)
    }

    function nextMonth() {
        if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
        else setCalMonth(m => m + 1)
    }

    // ── Derive calendar footer: start/end of the currently-shown announcement ─

    // const displayedAnn = announcements[selectedAnnIdx] || null
    const displayedAnn = selectedAnnIdx === -1 ? null : (announcements[selectedAnnIdx] || null)
    const heroTitle = displayedAnn?.title || (selectedDate ? 'No Announcement' : 'No Announcements')
    const heroDesc = displayedAnn?.description || (selectedDate
        ? `No announcement found for ${formatDate(selectedDate)}.`
        : 'All announcements will appear here. Click the button below to add your first one.')

    const calFooterStart = displayedAnn ? formatDate(displayedAnn.start_date) : '—'
    const calFooterEnd = displayedAnn ? formatDate(displayedAnn.end_date) : '—'

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className={s.page}>
            {/* ── Top Section (Hero + Calendar) ── */}
            <div className={s.topSection}>

                {/* Hero card */}
                <div className={s.heroCard}>
                    <div className={s.heroContent}>
                        <div className={s.heroSubtitle}>Latest Announcement</div>

                        <h1 className={s.heroTitle}>{heroTitle}</h1>
                        <p className={s.heroDesc}>{heroDesc}</p>

                        <button
                            className={ps.btnPrimary}
                            style={{ background: '#000', borderRadius: '8px', padding: '12px 24px' }}
                            onClick={() => { setEditId(null); setForm(EMPTY_FORM); setModal(true) }}
                        >
                            Add Announcement
                        </button>
                    </div>
                </div>

                {/* Calendar widget */}
                <div className={s.calendarWidget}>
                    <div className={s.calendarHeader}>
                        {/* <div className={s.calendarTitle}>Announcement Schedule</div> */}
                        <div className={s.calendarMonthRow}>
                            <button className={s.navBtn} onClick={prevMonth}>‹</button>
                            <div className={s.calendarMonth}>{MONTH_NAMES[calMonth]} {calYear}</div>
                            <button className={s.navBtn} onClick={nextMonth}>›</button>
                        </div>
                    </div>

                    <div className={s.calendarGrid}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                            <div key={day} className={s.dayLabel}>{day}</div>
                        ))}

                        {calCells.map((day, idx) => {
                            const highlight = getDayHighlight(day)
                            const isSunday = day !== null && (idx % 7 === 6) // last column = Sunday
                            const isToday =
                                day !== null &&
                                calYear === today.getFullYear() &&
                                calMonth === today.getMonth() &&
                                day === today.getDate()

                            return (
                                <div
                                    key={idx}
                                    onClick={() => handleDayClick(day)}
                                    className={[
                                        s.day,
                                        !day ? s.dayEmpty : '',
                                        isSunday ? s.daySun : '',
                                        isToday && !highlight ? s.dayToday : '',
                                        highlight && dayToDateStr(day) !== selectedDate ? s.dayLight : '',
                                        dayToDateStr(day) === selectedDate ? s.daySelected : '',
                                        day ? s.dayClickable : '',
                                    ].filter(Boolean).join(' ')}
                                >
                                    {day}
                                </div>
                            )
                        })}
                    </div>

                    {/* Footer: shows date range of the currently-displayed announcement */}
                    <div className={s.calendarFooter}>
                        <span>{calFooterStart}</span>
                        <div className={s.footerLine} />
                        <span>{calFooterEnd}</span>
                    </div>
                </div>
            </div>

            {/* ── Announcement List ── */}
            <div className={s.listSection}>
                <div className={s.listHeader}>
                    <h2 className={s.listTitle}>Announcement List</h2>
                </div>

                <div className={s.tableCard}>
                    <div className={s.filterBar}>
                        <select className={s.monthSelect}>
                            <option>All-Time</option>
                        </select>
                    </div>

                    <div className={ps.tableWrap}>
                        <table className={s.table}>
                            <thead>
                                <tr>
                                    <th>Announcement Title</th>
                                    <th>Description</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" className={s.loading}>Loading...</td></tr>
                                ) : announcements.length === 0 ? (
                                    <tr><td colSpan="5" className={ps.empty}>No announcements found.</td></tr>
                                ) : announcements.map(ann => (
                                    <tr key={ann.id}>
                                        <td><strong>{ann.title}</strong></td>
                                        <td className={s.descCell}>{ann.description}</td>
                                        <td>{formatDate(ann.start_date)}</td>
                                        <td>{formatDate(ann.end_date)}</td>
                                        <td>
                                            <div className={s.actions}>
                                                <button
                                                    className={`${s.actionBtn} ${s.viewBtn}`}
                                                    title="Edit"
                                                    onClick={() => handleEdit(ann)}
                                                >✏️</button>
                                                <button
                                                    className={`${s.actionBtn} ${s.deleteBtn}`}
                                                    title="Delete"
                                                    onClick={() => handleDelete(ann.id)}
                                                >🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className={s.pagination}>
                        <div className={s.pageInfo}>Showing {announcements.length} records</div>
                    </div>
                </div>
            </div>

            {/* ── Add/Edit Announcement Modal ── */}
            {modal && (
                <div className={ps.overlay} onClick={e => e.target === e.currentTarget && toggleModal()}>
                    <div className={ps.modal} style={{ maxWidth: '600px' }}>
                        <h2 className={ps.modalTitle}>{editId ? 'Edit Announcement' : 'Add New Announcement'}</h2>

                        {error && <div className={ps.error}>{error}</div>}

                        <div className={ps.field}>
                            <label className={ps.label}>Announcement Title</label>
                            <input
                                className={ps.input}
                                placeholder="Enter title"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                            />
                        </div>

                        <div className={ps.field}>
                            <label className={ps.label}>Description</label>
                            <textarea
                                className={ps.input}
                                style={{ minHeight: '100px', resize: 'vertical' }}
                                placeholder="Enter description"
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                            />
                        </div>

                        <div className={ps.grid2}>
                            <div className={ps.field}>
                                <label className={ps.label}>Start Date</label>
                                <input
                                    type="date"
                                    className={ps.input}
                                    value={form.startDate}
                                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                                />
                            </div>
                            <div className={ps.field}>
                                <label className={ps.label}>End Date</label>
                                <input
                                    type="date"
                                    className={ps.input}
                                    value={form.endDate}
                                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className={ps.modalFooter}>
                            <button className={ps.btnGhost} onClick={toggleModal} disabled={saving}>Cancel</button>
                            <button className={ps.btnPrimary} onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : editId ? 'Update Announcement' : 'Save Announcement'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}