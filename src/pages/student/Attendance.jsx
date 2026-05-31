import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function StudentAttendance() {
    const { student } = useOutletContext()
    const [attendance, setAttendance] = useState([])
    const [summary, setSummary] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (student?.id) {
            loadAttendance()
        }
    }, [student])

    async function loadAttendance() {
        setLoading(true)

        // Fetch detailed attendance records
        const { data: recordsData, error: recordsError } = await supabase
            .from('attendance')
            .select(`
                id, date, status,
                timetable_slots ( period, subjects ( name ) )
            `)
            .eq('student_id', student.id)
            .order('date', { ascending: false })
            .limit(50)

        // Fetch aggregation from attendance_summary if available
        const { data: summaryData, error: summaryError } = await supabase
            .from('attendance_summary')
            .select('*')
            .eq('student_id', student.id)
            .maybeSingle()

        if (recordsError) console.error('Error fetching attendance records:', recordsError)

        setAttendance(recordsData || [])
        setSummary(summaryData)
        setLoading(false)
    }

    if (loading) return <div style={{ color: '#64748b', padding: '20px' }}>Loading attendance data...</div>

    return (
        <div style={{ color: '#1e293b' }}>
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px' }}>My Attendance</h2>
                <p style={{ color: '#64748b' }}>ID: {student?.student_id}</p>
            </div>

            {/* Summary Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '40px'
            }}>
                <StatCard label="Attendance %" value={`${summary?.attendance_pct || 0}%`} color="#3b82f6" />
                <StatCard label="Total Classes" value={summary?.total_classes || 0} color="#64748b" />
                <StatCard label="Present" value={summary?.present || 0} color="#10b981" />
                <StatCard label="Absent" value={summary?.absent || 0} color="#ef4444" />
            </div>

            {/* Recent Records */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', fontWeight: '600', color: '#1e293b' }}>Recent Attendance Activity</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', textAlign: 'left', fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                            <th style={{ padding: '12px 20px' }}>Date</th>
                            <th style={{ padding: '12px 20px' }}>Subject</th>
                            <th style={{ padding: '12px 20px' }}>Period</th>
                            <th style={{ padding: '12px 20px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendance.map(record => (
                            <tr key={record.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px 20px', color: '#1e293b' }}>{new Date(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                <td style={{ padding: '12px 20px', color: '#475569', fontWeight: '500' }}>{record.timetable_slots?.subjects?.name || 'N/A'}</td>
                                <td style={{ padding: '12px 20px', color: '#64748b' }}>P{record.timetable_slots?.period || '-'}</td>
                                <td style={{ padding: '12px 20px' }}>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        background: record.status === 'Present' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                        color: record.status === 'Present' ? '#ef4444' : '#10b981'
                                    }}>{record.status}</span>
                                </td>
                            </tr>
                        ))}
                        {attendance.length === 0 && (
                            <tr>
                                <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No attendance records found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function StatCard({ label, value, color }) {
    return (
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: color }}>{value}</div>
        </div>
    )
}
