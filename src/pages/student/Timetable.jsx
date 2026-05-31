import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function StudentTimetable() {
    const { student } = useOutletContext()
    const [slots, setSlots] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (student?.class_id) {
            loadTimetable()
        }
    }, [student])

    async function loadTimetable() {
        setLoading(true)
        const { data, error } = await supabase
            .from('timetable_slots')
            .select(`
                id, day, period, start_time, end_time,
                subjects ( name ),
                teachers ( name )
            `)
            .eq('class_id', student.class_id)
            .order('period')

        if (error) {
            console.error('Error fetching timetable:', error)
        } else {
            setSlots(data || [])
        }
        setLoading(false)
    }

    if (loading) return <div style={{ color: '#64748b', padding: '20px' }}>Loading timetable...</div>

    const activeDays = DAYS.filter(day => slots.some(s => s.day === day))
    const activePeriods = [1, 2, 3, 4, 5, 6, 7, 8].filter(period => slots.some(s => s.period === period))

    if (slots.length === 0) {
        return (
            <div style={{ color: '#64748b', padding: '40px', textAlign: 'center' }}>
                <h2 style={{ color: '#1e293b', marginBottom: '12px' }}>No Classes Found</h2>
                <p>There are no classes scheduled for your class ({student?.class_name || 'N/A'}).</p>
            </div>
        )
    }

    return (
        <div style={{ color: '#1e293b' }}>
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px' }}>Weekly Time Table</h2>
                <p style={{ color: '#64748b' }}>Class: {student?.class_name || 'N/A'}</p>
            </div>

            <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                            <th style={{ padding: '16px' }}>Period</th>
                            {activeDays.map(day => <th key={day} style={{ padding: '16px' }}>{day}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {activePeriods.map(period => (
                            <tr key={period} style={{ borderBottom: '1px solid #f8fafc' }}>
                                <td style={{ padding: '20px 16px', fontWeight: '700', color: '#3b82f6', background: '#f8fafc', width: '80px' }}>P{period}</td>
                                {activeDays.map(day => {
                                    const slot = slots.find(s => s.day === day && s.period === period)
                                    return (
                                        <td key={day} style={{ padding: '20px 16px' }}>
                                            {slot ? (
                                                <div>
                                                    <div style={{ fontWeight: '600', marginBottom: '4px', color: '#1e293b' }}>{slot.subjects?.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{slot.teachers?.name}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
                                                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>—</span>
                                            )}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
