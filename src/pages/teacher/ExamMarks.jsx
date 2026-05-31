import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import s from '../../components/teacher/TPage.module.css'
import cs from './ExamMarks.module.css'

export default function TeacherExamMarks() {
    const { teacher } = useOutletContext()

    const [exams, setExams] = useState([])
    const [mySubjects, setMySubjects] = useState([])
    const [students, setStudents] = useState([])
    const [results, setResults] = useState({}) // { studentId: { marks, absent, grace } }

    const [selectedExam, setSelectedExam] = useState('')
    const [selectedSub, setSelectedSub] = useState('') // exam_subject_id

    const [loading, setLoading] = useState(true)
    const [loadingSubs, setLoadingSubs] = useState(false)
    const [loadingStudents, setLoadingStudents] = useState(false)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchExams()
    }, [])

    async function fetchExams() {
        setLoading(true)
        // Fetch exams that are in 'scheduled' or 'locked' status
        const { data, error: examError } = await supabase
            .from('exams')
            .select('id, name, academic_year, status')
            .in('status', ['scheduled', 'locked', 'draft'])
            .order('created_at', { ascending: false })
        
        if (examError) {
            console.error('Error fetching exams:', examError)
            setError(examError.message)
        }
        setExams(data ?? [])
        setLoading(false)
    }

    async function handleExamChange(examId) {
        setSelectedExam(examId)
        setSelectedSub('')
        setMySubjects([])
        setStudents([])
        setResults({})
        setError(null)
        setSuccess(false)

        if (!examId) return

        setLoadingSubs(true)
        // Fetch exam_subjects for this exam where this teacher is assigned
        console.log('Fetching exam subjects for:', { examId, teacherId: teacher.id })
        const { data, error } = await supabase
            .from('exam_subjects')
            .select(`
                id, subject, class_id, max_marks, passing_marks,
                classes ( name, grade, section )
            `)
            .eq('exam_id', examId)
            .eq('teacher_id', teacher.id)
            .order('subject')

        if (error) {
            console.error('Error fetching exam subjects:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            })
            setError(error.message)
        } else {
            setMySubjects(data ?? [])
        }
        setLoadingSubs(false)
    }

    async function handleSubjectChange(subId) {
        setSelectedSub(subId)
        setStudents([])
        setResults({})
        setError(null)
        setSuccess(false)

        if (!subId) return

        const sub = mySubjects.find(s => s.id === subId)
        if (!sub) return

        setLoadingStudents(true)
        // 1. Get students in this class
        const { data: studs } = await supabase
            .from('students')
            .select('id, full_name, roll_number, student_id')
            .eq('class_id', sub.class_id)
            .order('roll_number')

        const studentList = studs ?? []
        setStudents(studentList)

        // 2. Get existing results for this exam_subject
        const { data: resData } = await supabase
            .from('exam_results')
            .select('*')
            .eq('exam_subject_id', subId)

        const resMap = {}
        resData?.forEach(r => {
            resMap[r.student_id] = {
                id: r.id,
                marks: r.marks_obtained ?? '',
                absent: r.is_absent ?? false,
                grace: r.grace_marks ?? 0,
                locked: r.locked ?? false
            }
        })
        setResults(resMap)
        setLoadingStudents(false)
    }

    function updateResult(studentId, field, value) {
        setResults(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || { marks: '', absent: false, grace: 0 }),
                [field]: value
            }
        }))
        setSuccess(false)
    }

    async function handleSave() {
        if (!selectedSub) return
        setSaving(true)
        setError(null)

        const sub = mySubjects.find(s => s.id === selectedSub)
        const payload = students.map(st => {
            const res = results[st.id] || {}
            return {
                id: res.id, // for upsert
                exam_subject_id: selectedSub,
                student_id: st.id,
                marks_obtained: res.absent ? null : (res.marks === '' ? null : Number(res.marks)),
                is_absent: res.absent || false,
                grace_marks: Number(res.grace) || 0,
                entered_by: teacher.id,
                updated_at: new Date().toISOString()
            }
        })

        const { error } = await supabase
            .from('exam_results')
            .upsert(payload, { onConflict: 'exam_subject_id,student_id' })

        setSaving(false)
        if (error) {
            setError(error.message)
        } else {
            setSuccess(true)
            // Refresh results to get IDs for new records
            handleSubjectChange(selectedSub)
        }
    }

    const currentSub = mySubjects.find(s => s.id === selectedSub)

    if (loading) return <div className={s.loading}>Loading exams...</div>

    return (
        <div>
            <div className={s.pageHeader}>
                <div>
                    <h1 className={s.pageTitle}>Exam Marks Entry</h1>
                    <div className={s.pageSub}>Enter performance results for your subjects</div>
                </div>
            </div>

            <div className={cs.selectors}>
                <div className={s.field} style={{ flex: 1 }}>
                    <label className={s.label}>1. Select Exam</label>
                    <select
                        className={s.select}
                        value={selectedExam}
                        onChange={e => handleExamChange(e.target.value)}
                    >
                        <option value="">-- Select Exam --</option>
                        {exams.map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({e.academic_year})</option>
                        ))}
                    </select>
                </div>

                <div className={s.field} style={{ flex: 1 }}>
                    <label className={s.label}>2. Select Subject - Class</label>
                    <select
                        className={s.select}
                        value={selectedSub}
                        onChange={e => handleSubjectChange(e.target.value)}
                        disabled={!selectedExam || loadingSubs}
                    >
                        <option value="">
                            {loadingSubs ? 'Loading...' : '-- Select Subject --'}
                        </option>
                        {mySubjects.map(sub => (
                            <option key={sub.id} value={sub.id}>
                                {sub.subject} — {sub.classes?.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {error && <div className={s.error}>{error}</div>}
            {success && <div className={s.success}>Marks saved successfully!</div>}

            {!selectedSub && !loadingSubs && (
                <div className={s.empty}>
                    <div className={s.emptyText}>
                        Select an exam and subject to start entering marks
                    </div>
                </div>
            )}

            {selectedSub && (
                <div className={cs.mainCard}>
                    <div className={cs.cardHeader}>
                        <div className={cs.subTitle}>
                            {currentSub?.subject} — {currentSub?.classes?.name}
                        </div>
                        <div className={cs.marksInfo}>
                            Max Marks: <strong>{currentSub?.max_marks}</strong> | 
                            Pass: <strong>{currentSub?.passing_marks}</strong>
                        </div>
                    </div>

                    {loadingStudents ? (
                        <div className={s.loading}>Loading student list...</div>
                    ) : (
                        <>
                            <div className={s.tableWrap}>
                                <table className={s.table}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 60 }}>Roll</th>
                                            <th>Student Name</th>
                                            <th style={{ width: 120 }}>Marks Obtained</th>
                                            <th style={{ width: 80 }}>Absent</th>
                                            <th style={{ width: 100 }}>Grace</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map(st => {
                                            const res = results[st.id] || { marks: '', absent: false, grace: 0 }
                                            const isLocked = res.locked
                                            const isPass = !res.absent && (Number(res.marks) + Number(res.grace)) >= (currentSub?.passing_marks || 0)
                                            const isFail = !res.absent && res.marks !== '' && (Number(res.marks) + Number(res.grace)) < (currentSub?.passing_marks || 0)

                                            return (
                                                <tr key={st.id} className={res.absent ? cs.rowAbsent : ''}>
                                                    <td>{st.roll_number}</td>
                                                    <td>
                                                        <div className={cs.stName}>{st.full_name}</div>
                                                        <div className={cs.stId}>{st.student_id}</div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className={cs.markInput}
                                                            value={res.marks}
                                                            onChange={e => updateResult(st.id, 'marks', e.target.value)}
                                                            disabled={res.absent || isLocked}
                                                            max={currentSub?.max_marks}
                                                            min={0}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            className={cs.checkbox}
                                                            checked={res.absent}
                                                            onChange={e => updateResult(st.id, 'absent', e.target.checked)}
                                                            disabled={isLocked}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className={cs.graceInput}
                                                            value={res.grace}
                                                            onChange={e => updateResult(st.id, 'grace', e.target.value)}
                                                            disabled={res.absent || isLocked}
                                                            min={0}
                                                        />
                                                    </td>
                                                    <td>
                                                        {isLocked ? (
                                                            <span className={`${s.badge} ${s.badgeGray}`}>🔒 Locked</span>
                                                        ) : res.absent ? (
                                                            <span className={`${s.badge} ${s.badgeRed}`}>Absent</span>
                                                        ) : res.marks === '' ? (
                                                            <span className={`${s.badge} ${s.badgeGray}`}>Pending</span>
                                                        ) : isPass ? (
                                                            <span className={`${s.badge} ${s.badgeGreen}`}>Pass</span>
                                                        ) : (
                                                            <span className={`${s.badge} ${s.badgeRed}`}>Fail</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className={cs.footer}>
                                <div className={cs.footerInfo}>
                                    Note: Marks are auto-saved only when you click the button below.
                                </div>
                                <button
                                    className={s.btnPrimary}
                                    onClick={handleSave}
                                    disabled={saving || loadingStudents}
                                    style={{ minWidth: 150 }}
                                >
                                    {saving ? 'Saving...' : 'Save Results'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
