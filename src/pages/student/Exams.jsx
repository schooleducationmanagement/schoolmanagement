import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function StudentExams() {
    const { student } = useOutletContext()
    const [exams, setExams] = useState([])
    const [selectedExamId, setSelectedExamId] = useState('')
    const [marks, setMarks] = useState([])
    const [loading, setLoading] = useState(true)
    const [marksLoading, setMarksLoading] = useState(false)

    useEffect(() => {
        if (student?.class_id) {
            loadExams()
        }
    }, [student])

    async function loadExams() {
        setLoading(true)
        const { data, error } = await supabase
            .from('exams')
            .select(`
                id, name, status,
                exam_subjects!inner ( class_id )
            `)
            .eq('exam_subjects.class_id', student.class_id)
            .in('status', ['scheduled', 'locked'])

        if (error) {
            console.error('Error fetching exams:', error)
        } else {
            // Deduplicate exams
            const uniqueExams = Array.from(new Set(data.map(e => e.id)))
                .map(id => data.find(e => e.id === id))
            setExams(uniqueExams || [])
        }
        setLoading(false)
    }

    async function handleExamChange(examId) {
        setSelectedExamId(examId)
        if (!examId) {
            setMarks([])
            return
        }

        setMarksLoading(true)

        // Step 1: Get exam_subject IDs for this exam + student's class
        const { data: examSubjects, error: esError } = await supabase
            .from('exam_subjects')
            .select('id')
            .eq('exam_id', examId)
            .eq('class_id', student.class_id)

        if (esError || !examSubjects?.length) {
            console.error('No exam subjects found for:', { examId, classId: student.class_id, studentId: student.id })
            setMarks([])
            setMarksLoading(false)
            return
        }

        const examSubjectIds = examSubjects.map(es => es.id)

        // Step 2: Fetch results using exam_subject_id directly
        const { data, error } = await supabase
            .from('exam_results')
            .select(`
                id, marks_obtained, is_absent, grace_marks,
                exam_subjects (
                    subject, max_marks, passing_marks
                )
            `)
            .eq('student_id', student.id)
            .in('exam_subject_id', examSubjectIds)

        if (error) {
            console.error('Error fetching marks:', error)
        } else {
            setMarks(data || [])
        }
        setMarksLoading(false)
    }

    if (loading) return <div style={{ color: '#64748b', padding: '20px' }}>Loading exams...</div>

    return (
        <div style={{ color: '#1e293b' }}>
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px' }}>Exam Results</h2>
                <p style={{ color: '#64748b' }}>Select an exam term to view your performance.</p>
            </div>

            <div style={{ marginBottom: '24px' }}>
                <select
                    value={selectedExamId}
                    onChange={e => handleExamChange(e.target.value)}
                    style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: '#fff',
                        fontSize: '1rem',
                        color: '#1e293b',
                        width: '100%',
                        maxWidth: '300px',
                        outline: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <option value="">Select Exam</option>
                    {exams.map(exam => (
                        <option key={exam.id} value={exam.id}>{exam.name}</option>
                    ))}
                </select>
            </div>

            {marksLoading ? (
                <div style={{ color: '#64748b', padding: '20px' }}>Loading results...</div>
            ) : selectedExamId ? (
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Subject-wise Performance</span>
                        {marks.length > 0 && (
                            <span style={{ color: '#3b82f6' }}>
                                Total: {marks.reduce((acc, current) => acc + (current.marks_obtained || 0), 0)} /
                                {marks.reduce((acc, current) => acc + (current.exam_subjects?.max_marks || 0), 0)}
                            </span>
                        )}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', textAlign: 'left', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                                <th style={{ padding: '12px 20px' }}>Subject</th>
                                <th style={{ padding: '12px 20px' }}>Max Marks</th>
                                <th style={{ padding: '12px 20px' }}>Passing</th>
                                <th style={{ padding: '12px 20px' }}>Obtained</th>
                                <th style={{ padding: '12px 20px' }}>Grade</th>
                                <th style={{ padding: '12px 20px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {marks.map(m => {
                                const totalObtained = (m.marks_obtained || 0) + (m.grace_marks || 0)
                                const status = m.is_absent ? 'Absent' : m.status || (totalObtained >= m.exam_subjects?.passing_marks ? 'Pass' : 'Fail')

                                return (
                                    <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '16px 20px', fontWeight: '600', color: '#1e293b' }}>{m.exam_subjects?.subject}</td>
                                        <td style={{ padding: '16px 20px', color: '#64748b' }}>{m.exam_subjects?.max_marks}</td>
                                        <td style={{ padding: '16px 20px', color: '#64748b' }}>{m.exam_subjects?.passing_marks}</td>
                                        <td style={{ padding: '16px 20px', color: status === 'Pass' ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                                            {m.is_absent ? 'A' : m.marks_obtained}
                                            {m.grace_marks > 0 && <span style={{ fontSize: '0.7rem', color: '#3b82f6', marginLeft: '4px' }}>+{m.grace_marks}</span>}
                                        </td>
                                        <td style={{ padding: '16px 20px', fontWeight: '600' }}>{m.grade || '-'}</td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                background: status === 'Pass' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: status === 'Pass' ? '#10b981' : '#ef4444'
                                            }}>{status}</span>
                                        </td>
                                    </tr>
                                )
                            })}
                            {marks.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No records found for this exam.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '60px', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0', color: '#94a3b8' }}>
                    Please select an exam from the list above to view your marks.
                </div>
            )}
        </div>
    )
}
