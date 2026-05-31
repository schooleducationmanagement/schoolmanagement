import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import styles from './ExamDetail.module.css'

const EXAM_TYPES = ['Unit Test', 'Mid-Term', 'Annual', 'Quarterly', 'Other']

const STATUS_META = {
    draft: { label: 'Draft', cls: 'statusDraft' },
    scheduled: { label: 'Scheduled', cls: 'statusScheduled' },
    locked: { label: 'Locked', cls: 'statusLocked' },
}

function fmtTime(t) {
    if (!t) return '—'
    const [h, m] = t.split(':')
    const hr = parseInt(h)
    return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`
}

function classLabel(grade, section, name) {
    return `Grade ${grade}${section} — ${name}`
}

export default function ExamDetail() {
    const { id } = useParams()
    const navigate = useNavigate()

    const [exam, setExam] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('overview')

    // overview
    const [overviewForm, setOverviewForm] = useState({ name: '', type: '', academic_year: '' })
    const [overviewSaving, setOverviewSaving] = useState(false)

    // subjects matrix
    const [subjectMatrix, setSubjectMatrix] = useState([])
    const [teachers, setTeachers] = useState([])
    const [matrixLoading, setMatrixLoading] = useState(false)
    const [matrixSaving, setMatrixSaving] = useState(false)
    const [bulkFill, setBulkFill] = useState({ exam_date: '', start_time: '', end_time: '' })
    const [selectedClassIds, setSelectedClassIds] = useState(new Set())

    // marks
    const [examSubjects, setExamSubjects] = useState([])
    const [selectedSubjectId, setSelectedSubjectId] = useState('')
    const [marksRows, setMarksRows] = useState([])
    const [marksLoading, setMarksLoading] = useState(false)
    const [marksSaving, setMarksSaving] = useState(false)
    const [marksLocked, setMarksLocked] = useState(false)

    // ── LOAD ─────────────────────────────────────────────
    const loadExam = useCallback(async () => {
        const { data } = await supabase.from('exams').select('*').eq('id', id).single()
        if (data) {
            setExam(data)
            setOverviewForm({ name: data.name, type: data.type, academic_year: data.academic_year })
        }
    }, [id])

    const loadTeachers = useCallback(async () => {
        const { data } = await supabase.from('teachers').select('id, name').order('name')
        setTeachers(data || [])
    }, [])

    const loadExamSubjects = useCallback(async () => {
        const { data } = await supabase
            .from('exam_subjects')
            .select('*, classes(name, grade, section)')
            .eq('exam_id', id)
            .order('exam_date')
        setExamSubjects(data || [])
    }, [id])

    const loadMatrix = useCallback(async () => {
        setMatrixLoading(true)
        const [classesRes, subjectsRes, existingRes, timetableRes] = await Promise.all([
            supabase.from('classes').select('id,name,grade,section').order('grade').order('section'),
            supabase.from('subjects').select('id,class_id,name').order('name'),
            supabase.from('exam_subjects').select('*').eq('exam_id', id),
            supabase.from('timetable_full').select('class_id,subject_id,teacher_id,teacher_name'),
        ])

        const classes = classesRes.data || []
        const subjects = subjectsRes.data || []
        const existing = existingRes.data || []
        const timetable = timetableRes.data || []

        // teacher lookup: class_id+subject_id → first assigned teacher
        const teacherLookup = {}
        timetable.forEach(t => {
            const key = `${t.class_id}_${t.subject_id}`
            if (!teacherLookup[key] && t.teacher_id) {
                teacherLookup[key] = { teacher_id: t.teacher_id, teacher_name: t.teacher_name }
            }
        })

        // existing exam_subjects: class_id+subject_name → row
        const existingLookup = {}
        existing.forEach(e => { existingLookup[`${e.class_id}__${e.subject}`] = e })

        const matrix = []
        classes.forEach(cls => {
            const classSubjects = subjects.filter(s => s.class_id === cls.id)
            classSubjects.forEach(sub => {
                const tKey = `${cls.id}_${sub.id}`
                const eKey = `${cls.id}__${sub.name}`
                const ex = existingLookup[eKey]
                const def = teacherLookup[tKey]

                matrix.push({
                    class_id: cls.id,
                    class_name: cls.name,
                    grade: cls.grade,
                    section: cls.section,
                    subject_id: sub.id,
                    subject_name: sub.name,
                    included: !!ex,
                    exam_date: ex?.exam_date || '',
                    start_time: ex?.start_time || '',
                    end_time: ex?.end_time || '',
                    max_marks: ex?.max_marks != null ? String(ex.max_marks) : '100',
                    passing_marks: ex?.passing_marks != null ? String(ex.passing_marks) : '35',
                    teacher_id: ex?.teacher_id || def?.teacher_id || '',
                    teacher_name: ex?.teacher_name || def?.teacher_name || '',
                    existing_id: ex?.id || null,
                })
            })
        })

        setSubjectMatrix(matrix)
        setMatrixLoading(false)
    }, [id])

    useEffect(() => {
        ; (async () => {
            setLoading(true)
            await Promise.all([loadExam(), loadTeachers(), loadExamSubjects(), loadMatrix()])
            setLoading(false)
        })()
    }, [loadExam, loadTeachers, loadExamSubjects, loadMatrix])

    async function refreshAll() {
        await Promise.all([loadMatrix(), loadExamSubjects()])
    }

    // ── OVERVIEW ─────────────────────────────────────────
    async function saveOverview(e) {
        e.preventDefault()
        setOverviewSaving(true)
        await supabase.from('exams').update({
            name: overviewForm.name.trim(),
            type: overviewForm.type,
            academic_year: overviewForm.academic_year.trim(),
        }).eq('id', id)
        await loadExam()
        setOverviewSaving(false)
    }

    async function setStatus(newStatus) {
        await supabase.from('exams').update({ status: newStatus }).eq('id', id)
        await loadExam()
    }

    async function publishResults() {
        await supabase.from('exams').update({ published_at: new Date().toISOString() }).eq('id', id)
        await loadExam()
    }

    // ── MATRIX HELPERS ───────────────────────────────────
    function updateRow(classId, subjectId, field, value) {
        setSubjectMatrix(m => m.map(r =>
            r.class_id === classId && r.subject_id === subjectId ? { ...r, [field]: value } : r
        ))
    }

    function toggleInclude(classId, subjectId, checked) {
        setSubjectMatrix(m => m.map(r =>
            r.class_id === classId && r.subject_id === subjectId ? { ...r, included: checked } : r
        ))
    }

    function toggleClassAll(classId, checked) {
        setSubjectMatrix(m => m.map(r => r.class_id === classId ? { ...r, included: checked } : r))
    }

    function applyBulkFill() {
        setSubjectMatrix(m => m.map(r => {
            if (!r.included || !selectedClassIds.has(r.class_id)) return r
            return {
                ...r,
                ...(bulkFill.exam_date ? { exam_date: bulkFill.exam_date } : {}),
                ...(bulkFill.start_time ? { start_time: bulkFill.start_time } : {}),
                ...(bulkFill.end_time ? { end_time: bulkFill.end_time } : {}),
            }
        }))
    }

    async function saveMatrix() {
        setMatrixSaving(true)
        const included = subjectMatrix.filter(r => r.included)
        const excluded = subjectMatrix.filter(r => !r.included && r.existing_id)

        const invalid = included.filter(r =>
            !r.exam_date || !r.start_time || !r.end_time || r.max_marks === '' || r.passing_marks === ''
        )
        if (invalid.length) {
            alert(`${invalid.length} selected subject(s) are missing date, time, or marks. Please fill them in.`)
            setMatrixSaving(false)
            return
        }

        if (excluded.length) {
            await supabase.from('exam_subjects').delete().in('id', excluded.map(r => r.existing_id))
        }

        if (included.length) {
            const upsertData = included.map(r => ({
                ...(r.existing_id ? { id: r.existing_id } : {}),
                exam_id: id,
                class_id: r.class_id,
                subject: r.subject_name,
                exam_date: r.exam_date,
                start_time: r.start_time,
                end_time: r.end_time,
                max_marks: parseFloat(r.max_marks),
                passing_marks: parseFloat(r.passing_marks),
                teacher_id: r.teacher_id || null,
                teacher_name: r.teacher_name || null,
            }))
            await supabase.from('exam_subjects').upsert(upsertData)
        }

        await refreshAll()
        setMatrixSaving(false)
    }

    // ── MARKS ────────────────────────────────────────────
    useEffect(() => {
        if (!selectedSubjectId) return
        loadMarks(selectedSubjectId)
    }, [selectedSubjectId])

    async function loadMarks(subjectId) {
        setMarksLoading(true)
        const subject = examSubjects.find(s => s.id === subjectId)
        if (!subject) { setMarksLoading(false); return }

        const [studentsRes, resultsRes] = await Promise.all([
            supabase
                .from('students')
                .select('id, full_name, roll_number')
                .eq('class_id', subject.class_id)
                .order('roll_number'),
            supabase
                .from('exam_results')
                .select('*')
                .eq('exam_subject_id', subjectId),
        ])

        const studList = studentsRes.data || []
        const resultMap = {}
            ; (resultsRes.data || []).forEach(r => { resultMap[r.student_id] = r })

        const rows = studList.map(s => {
            const res = resultMap[s.id]
            return {
                student_id: s.id,
                full_name: s.full_name,
                roll_number: s.roll_number,
                is_absent: res?.is_absent ?? false,
                marks: res?.marks_obtained != null ? String(res.marks_obtained) : '',
                grace_marks: res?.grace_marks != null ? String(res.grace_marks) : '0',
                result_id: res?.id ?? null,
                locked: res?.locked ?? false,
            }
        })

        setMarksLocked(rows.some(r => r.locked))
        setMarksRows(rows)
        setMarksLoading(false)
    }

    function updateMarkRow(studentId, field, value) {
        setMarksRows(rows => rows.map(r =>
            r.student_id === studentId ? { ...r, [field]: value } : r
        ))
    }

    async function saveMarks() {
        setMarksSaving(true)
        const upsertData = marksRows.map(r => ({
            exam_subject_id: selectedSubjectId,
            student_id: r.student_id,
            marks_obtained: r.is_absent || r.marks === '' ? null : parseFloat(r.marks),
            is_absent: r.is_absent,
            grace_marks: parseFloat(r.grace_marks) || 0,
        }))
        await supabase
            .from('exam_results')
            .upsert(upsertData, { onConflict: 'exam_subject_id,student_id' })
        await loadMarks(selectedSubjectId)
        setMarksSaving(false)
    }

    async function toggleLockSubject() {
        const newLocked = !marksLocked
        const { data: results } = await supabase
            .from('exam_results').select('id').eq('exam_subject_id', selectedSubjectId)
        if (results?.length) {
            await supabase.from('exam_results').update({ locked: newLocked }).in('id', results.map(r => r.id))
        }
        setMarksLocked(newLocked)
        setMarksRows(rows => rows.map(r => ({ ...r, locked: newLocked })))
    }

    function marksStats(subject) {
        const total = marksRows.length
        const absent = marksRows.filter(r => r.is_absent).length
        const entered = marksRows.filter(r => !r.is_absent && r.marks !== '').length
        const passing = subject?.passing_marks ?? 0
        const passed = marksRows.filter(r =>
            !r.is_absent && r.marks !== '' &&
            (parseFloat(r.marks) + parseFloat(r.grace_marks || 0)) >= passing
        ).length
        return { total, absent, entered, passed, pending: total - absent - entered }
    }

    function rowStatus(row, subject) {
        if (row.is_absent) return { label: 'Absent', cls: 'tagAbsent' }
        if (row.marks === '') return { label: 'Pending', cls: 'tagPending' }
        const total = parseFloat(row.marks) + parseFloat(row.grace_marks || 0)
        return total >= (subject?.passing_marks ?? 0)
            ? { label: 'Pass', cls: 'tagPass' }
            : { label: 'Fail', cls: 'tagFail' }
    }

    // Group matrix by class for render
    const matrixByClass = subjectMatrix.reduce((acc, row) => {
        if (!acc[row.class_id]) {
            acc[row.class_id] = { grade: row.grade, section: row.section, name: row.class_name, rows: [] }
        }
        acc[row.class_id].rows.push(row)
        return acc
    }, {})

    // ── RENDER ───────────────────────────────────────────
    if (loading) return <div className={styles.centerMsg}>Loading…</div>
    if (!exam) return <div className={styles.centerMsg}>Exam not found.</div>

    const meta = STATUS_META[exam.status]
    const selectedSub = examSubjects.find(s => s.id === selectedSubjectId)
    const stats = selectedSubjectId ? marksStats(selectedSub) : null
    const totalIncluded = subjectMatrix.filter(r => r.included).length

    return (
        <div className={styles.page}>

            {/* Top bar */}
            <div className={styles.topBar}>
                <button className={styles.backBtn} onClick={() => navigate('/admin/examinations')}>
                    ← Examinations
                </button>
                <div className={styles.topRight}>
                    <span className={`${styles.badge} ${styles[meta.cls]}`}>{meta.label}</span>

                    {exam.status === 'draft' && (
                        <button className={styles.btnSchedule} onClick={() => setStatus('scheduled')}>
                            Schedule Exam
                        </button>
                    )}
                    {exam.status === 'scheduled' && (
                        <button className={styles.btnLockAll} onClick={() => setStatus('locked')}>
                            🔒 Lock All Results
                        </button>
                    )}
                    {exam.status === 'locked' && (
                        <>
                            <button className={styles.btnUnlockAll} onClick={() => setStatus('scheduled')}>
                                🔓 Unlock
                            </button>
                            {!exam.published_at && (
                                <button className={styles.btnPublish} onClick={publishResults}>
                                    Publish Results
                                </button>
                            )}
                        </>
                    )}
                    {exam.published_at && (
                        <span className={styles.publishedTag}>
                            ✓ Published {new Date(exam.published_at).toLocaleDateString('en-IN')}
                        </span>
                    )}
                </div>
            </div>

            {/* Exam title */}
            <div className={styles.examMeta}>
                <h1 className={styles.examTitle}>{exam.name}</h1>
                <span className={styles.examSub}>{exam.type} · {exam.academic_year}</span>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                {['overview', 'subjects', 'marks'].map(t => (
                    <button
                        key={t}
                        className={`${styles.tab} ${activeTab === t ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab(t)}
                    >
                        {{ overview: 'Overview', subjects: 'Classes', marks: 'Marks Entry' }[t]}
                        {t === 'subjects' && totalIncluded > 0 &&
                            <span className={styles.tabPill}>{totalIncluded}</span>
                        }
                    </button>
                ))}
            </div>

            {/* ══ OVERVIEW ══ */}
            {activeTab === 'overview' && (
                <div className={styles.tabContent}>
                    <div className={styles.statCards}>
                        {[
                            { num: totalIncluded, label: 'Subjects Scheduled' },
                            { num: new Set(subjectMatrix.filter(r => r.included).map(r => r.class_id)).size, label: 'Classes Involved' },
                            { num: subjectMatrix.filter(r => r.included && r.exam_date === new Date().toISOString().slice(0, 10)).length, label: 'Exams Today' },
                        ].map(s => (
                            <div key={s.label} className={styles.statCard}>
                                <div className={styles.statNum}>{s.num}</div>
                                <div className={styles.statLabel}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={saveOverview} className={styles.card}>
                        <h3 className={styles.sectionTitle}>Edit Exam Details</h3>
                        <div className={styles.fieldRow}>
                            <div className={styles.field}>
                                <label>Exam Name</label>
                                <input type="text" value={overviewForm.name}
                                    onChange={e => setOverviewForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div className={styles.field}>
                                <label>Type</label>
                                <select value={overviewForm.type}
                                    onChange={e => setOverviewForm(f => ({ ...f, type: e.target.value }))}>
                                    {EXAM_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className={styles.field}>
                                <label>Academic Year</label>
                                <input type="text" value={overviewForm.academic_year}
                                    onChange={e => setOverviewForm(f => ({ ...f, academic_year: e.target.value }))} />
                            </div>
                        </div>
                        <button type="submit" className={styles.btnPrimary} disabled={overviewSaving}>
                            {overviewSaving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </form>
                </div>
            )}

            {/* ══ SUBJECTS MATRIX ══ */}
            {activeTab === 'subjects' && (
                <div className={styles.tabContent}>

                    {/* Multi-class selector */}
                    <div className={styles.classSelectorBar}>
                        <label className={styles.classSelectorLabel}>Select Classes</label>
                        <div className={styles.classPickerActions}>
                            <button
                                type="button"
                                className={styles.btnSelectAll}
                                onClick={() => {
                                    const allIds = Object.keys(matrixByClass)
                                    if (selectedClassIds.size === allIds.length) {
                                        setSelectedClassIds(new Set())
                                    } else {
                                        setSelectedClassIds(new Set(allIds))
                                    }
                                }}
                            >
                                {selectedClassIds.size === Object.keys(matrixByClass).length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className={styles.classPickerGrid}>
                            {Object.entries(matrixByClass).map(([classId, cls]) => {
                                const isSelected = selectedClassIds.has(classId)
                                const includedCount = cls.rows.filter(r => r.included).length
                                return (
                                    <label
                                        key={classId}
                                        className={`${styles.classPickerItem} ${isSelected ? styles.classPickerItemActive : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            className={styles.classPickerCheck}
                                            checked={isSelected}
                                            onChange={() => {
                                                setSelectedClassIds(prev => {
                                                    const next = new Set(prev)
                                                    if (next.has(classId)) next.delete(classId)
                                                    else next.add(classId)
                                                    return next
                                                })
                                            }}
                                        />
                                        <span className={styles.classPickerName}>{cls.name}</span>
                                        {includedCount > 0 && (
                                            <span className={styles.classPickerBadge}>{includedCount}</span>
                                        )}
                                    </label>
                                )
                            })}
                        </div>
                    </div>

                    {selectedClassIds.size === 0 ? (
                        <div className={styles.emptyState}>
                            Select one or more classes above to view and configure their subjects.
                        </div>
                    ) : (
                        <>
                            {/* Bulk fill bar */}
                            <div className={styles.bulkBar}>
                                <span className={styles.bulkLabel}>Bulk fill checked:</span>
                                <input type="date" className={styles.bulkInput}
                                    value={bulkFill.exam_date}
                                    onChange={e => setBulkFill(f => ({ ...f, exam_date: e.target.value }))} />
                                <input type="time" className={styles.bulkInput}
                                    value={bulkFill.start_time}
                                    onChange={e => setBulkFill(f => ({ ...f, start_time: e.target.value }))} />
                                <span className={styles.bulkSep}>to</span>
                                <input type="time" className={styles.bulkInput}
                                    value={bulkFill.end_time}
                                    onChange={e => setBulkFill(f => ({ ...f, end_time: e.target.value }))} />
                                <button className={styles.btnApply} onClick={applyBulkFill}>Apply</button>
                            </div>

                            {matrixLoading ? (
                                <div className={styles.emptyState}>Loading classes and subjects…</div>
                            ) : (
                                Object.entries(matrixByClass)
                                    .filter(([classId]) => selectedClassIds.has(classId))
                                    .map(([classId, cls]) => {
                                        const allChecked = cls.rows.every(r => r.included)
                                        const someChecked = cls.rows.some(r => r.included)

                                        return (
                                            <div key={classId} className={styles.classBlock}>
                                                <div className={styles.classHeader}>
                                                    <label className={styles.classCheckLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={allChecked}
                                                            ref={el => { if (el) el.indeterminate = someChecked && !allChecked }}
                                                            onChange={e => toggleClassAll(classId, e.target.checked)}
                                                        />
                                                        <span className={styles.classTitle}>
                                                            {classLabel(cls.grade, cls.section, cls.name)}
                                                        </span>
                                                    </label>
                                                    <span className={styles.classCount}>
                                                        {cls.rows.filter(r => r.included).length}/{cls.rows.length} selected
                                                    </span>
                                                </div>

                                                <div className={styles.matrixWrap}>
                                                    <table className={styles.matrixTable}>
                                                        <thead>
                                                            <tr>
                                                                <th style={{ width: 36 }}></th>
                                                                <th style={{ width: 150 }}>Subject</th>
                                                                <th style={{ width: 145 }}>Date</th>
                                                                <th style={{ width: 105 }}>Start</th>
                                                                <th style={{ width: 105 }}>End</th>
                                                                <th style={{ width: 80 }}>Max</th>
                                                                <th style={{ width: 80 }}>Pass</th>
                                                                <th>Teacher</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {cls.rows.map(row => (
                                                                <tr key={row.subject_id}
                                                                    className={`${styles.matrixRow} ${row.included ? styles.rowActive : styles.rowDim}`}>
                                                                    <td>
                                                                        <input type="checkbox" className={styles.rowCheck}
                                                                            checked={row.included}
                                                                            onChange={e => toggleInclude(classId, row.subject_id, e.target.checked)} />
                                                                    </td>
                                                                    <td className={styles.subjectCell}>{row.subject_name}</td>
                                                                    <td>
                                                                        <input type="date" className={styles.cellInput}
                                                                            value={row.exam_date} disabled={!row.included}
                                                                            onChange={e => updateRow(classId, row.subject_id, 'exam_date', e.target.value)} />
                                                                    </td>
                                                                    <td>
                                                                        <input type="time" className={styles.cellInput}
                                                                            value={row.start_time} disabled={!row.included}
                                                                            onChange={e => updateRow(classId, row.subject_id, 'start_time', e.target.value)} />
                                                                    </td>
                                                                    <td>
                                                                        <input type="time" className={styles.cellInput}
                                                                            value={row.end_time} disabled={!row.included}
                                                                            onChange={e => updateRow(classId, row.subject_id, 'end_time', e.target.value)} />
                                                                    </td>
                                                                    <td>
                                                                        <input type="number" className={styles.cellInputSm}
                                                                            min="1" placeholder="100"
                                                                            value={row.max_marks} disabled={!row.included}
                                                                            onChange={e => updateRow(classId, row.subject_id, 'max_marks', e.target.value)} />
                                                                    </td>
                                                                    <td>
                                                                        <input type="number" className={styles.cellInputSm}
                                                                            min="0" placeholder="35"
                                                                            value={row.passing_marks} disabled={!row.included}
                                                                            onChange={e => updateRow(classId, row.subject_id, 'passing_marks', e.target.value)} />
                                                                    </td>
                                                                    <td>
                                                                        <select className={styles.cellSelect}
                                                                            value={row.teacher_id} disabled={!row.included}
                                                                            onChange={e => {
                                                                                const t = teachers.find(t => t.id === e.target.value)
                                                                                updateRow(classId, row.subject_id, 'teacher_id', e.target.value)
                                                                                updateRow(classId, row.subject_id, 'teacher_name', t?.name || '')
                                                                            }}>
                                                                            <option value="">— Unassigned —</option>
                                                                            {teachers.map(t => (
                                                                                <option key={t.id} value={t.id}>{t.name}</option>
                                                                            ))}
                                                                        </select>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )
                                    })
                            )}

                            <div className={styles.saveBar}>
                                <span className={styles.saveHint}>
                                    {totalIncluded} subject{totalIncluded !== 1 ? 's' : ''} across{' '}
                                    {new Set(subjectMatrix.filter(r => r.included).map(r => r.class_id)).size} class(es)
                                </span>
                                <button className={styles.btnPrimary} onClick={saveMatrix} disabled={matrixSaving}>
                                    {matrixSaving ? 'Saving…' : 'Save Subjects'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ══ MARKS ENTRY ══ */}
            {activeTab === 'marks' && (
                <div className={styles.tabContent}>

                    {exam.status === 'draft' ? (
                        <div className={styles.draftNotice}>
                            Schedule the exam first before entering marks.
                        </div>
                    ) : (
                        <>
                            <div className={styles.marksTopBar}>
                                <div className={styles.field} style={{ maxWidth: 420 }}>
                                    <label>Select Subject</label>
                                    <select value={selectedSubjectId}
                                        onChange={e => { setSelectedSubjectId(e.target.value); setMarksRows([]) }}>
                                        <option value="">— choose a subject —</option>
                                        {examSubjects.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {classLabel(s.classes?.grade, s.classes?.section, s.classes?.name)} · {s.subject}
                                                {s.exam_date ? ` · ${new Date(s.exam_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedSubjectId && (
                                    <div className={styles.marksActions}>
                                        <button
                                            className={marksLocked ? styles.btnUnlock : styles.btnLockSub}
                                            onClick={toggleLockSubject}>
                                            {marksLocked ? '🔓 Unlock' : '🔒 Lock'}
                                        </button>
                                        <button className={styles.btnSave} onClick={saveMarks}
                                            disabled={marksSaving || marksLocked}>
                                            {marksSaving ? 'Saving…' : 'Save Progress'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Subject info strip */}
                            {selectedSub && (
                                <div className={styles.subjectInfoStrip}>
                                    <strong>{selectedSub.subject}</strong>
                                    <span className={styles.dot}>·</span>
                                    <span>{classLabel(selectedSub.classes?.grade, selectedSub.classes?.section, selectedSub.classes?.name)}</span>
                                    <span className={styles.dot}>·</span>
                                    <span>
                                        {selectedSub.exam_date
                                            ? new Date(selectedSub.exam_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })
                                            : '—'}
                                    </span>
                                    <span className={styles.dot}>·</span>
                                    <span>{fmtTime(selectedSub.start_time)} – {fmtTime(selectedSub.end_time)}</span>
                                    <span className={styles.dot}>·</span>
                                    <span>Max {selectedSub.max_marks} | Pass {selectedSub.passing_marks}</span>
                                    {selectedSub.teacher_name && (
                                        <><span className={styles.dot}>·</span><span>{selectedSub.teacher_name}</span></>
                                    )}
                                    {marksLocked && <span className={styles.lockedChip}>🔒 Locked</span>}
                                </div>
                            )}

                            {/* Stats strip */}
                            {stats && (
                                <div className={styles.statsStrip}>
                                    {[
                                        { num: stats.total, label: 'Students' },
                                        { num: stats.entered, label: 'Marks Entered' },
                                        { num: stats.absent, label: 'Absent' },
                                        { num: stats.passed, label: 'Passing' },
                                        { num: stats.pending, label: 'Pending' },
                                    ].map(s => (
                                        <div key={s.label} className={styles.stripItem}>
                                            <span className={styles.stripNum}>{s.num}</span>
                                            <span className={styles.stripLabel}>{s.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Marks table */}
                            {selectedSubjectId && (
                                marksLoading ? (
                                    <div className={styles.emptyState}>Loading students…</div>
                                ) : marksRows.length === 0 ? (
                                    <div className={styles.emptyState}>No students found for this class.</div>
                                ) : (
                                    <table className={styles.marksTable}>
                                        <thead>
                                            <tr>
                                                <th style={{ width: 60 }}>Roll</th>
                                                <th>Student Name</th>
                                                <th style={{ width: 100 }}>Absent</th>
                                                <th style={{ width: 130 }}>Marks / {selectedSub?.max_marks}</th>
                                                <th style={{ width: 100 }}>Grace</th>
                                                <th style={{ width: 80 }}>Total</th>
                                                <th style={{ width: 80 }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {marksRows.map(row => {
                                                const st = rowStatus(row, selectedSub)
                                                const total = row.is_absent || row.marks === ''
                                                    ? '—'
                                                    : parseFloat(row.marks) + parseFloat(row.grace_marks || 0)
                                                return (
                                                    <tr key={row.student_id}
                                                        className={`${styles.marksRow} ${row.is_absent ? styles.absentRow : ''}`}>
                                                        <td className={styles.rollCell}>{row.roll_number}</td>
                                                        <td className={styles.nameCell}>{row.full_name}</td>
                                                        <td>
                                                            <label className={styles.absentToggle}>
                                                                <input type="checkbox" checked={row.is_absent} disabled={marksLocked}
                                                                    onChange={e => {
                                                                        updateMarkRow(row.student_id, 'is_absent', e.target.checked)
                                                                        if (e.target.checked) updateMarkRow(row.student_id, 'marks', '')
                                                                    }} />
                                                                Absent
                                                            </label>
                                                        </td>
                                                        <td>
                                                            <input type="number" className={styles.marksInput}
                                                                min="0" max={selectedSub?.max_marks} step="0.5"
                                                                value={row.marks} disabled={row.is_absent || marksLocked}
                                                                placeholder="—"
                                                                onChange={e => updateMarkRow(row.student_id, 'marks', e.target.value)} />
                                                        </td>
                                                        <td>
                                                            <input type="number" className={styles.marksInput}
                                                                min="0" step="0.5"
                                                                value={row.grace_marks} disabled={row.is_absent || marksLocked}
                                                                placeholder="0"
                                                                onChange={e => updateMarkRow(row.student_id, 'grace_marks', e.target.value)} />
                                                        </td>
                                                        <td className={styles.totalCell}>{total}</td>
                                                        <td>
                                                            <span className={`${styles.tag} ${styles[st.cls]}`}>{st.label}</span>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                )
                            )}

                            {!selectedSubjectId && (
                                <div className={styles.emptyState}>
                                    {examSubjects.length === 0
                                        ? 'No subjects saved yet. Go to the Subjects tab to set them up.'
                                        : 'Select a subject above to start entering marks.'}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}