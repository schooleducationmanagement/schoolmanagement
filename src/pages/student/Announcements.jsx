import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function StudentAnnouncements() {
    const { student } = useOutletContext()
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadAnnouncements()
    }, [])

    async function loadAnnouncements() {
        setLoading(true)
        // Fetch announcements where audience is 'all' or 'student'
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .or("audience_type.eq.all,audience_type.eq.student")
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching announcements:', error)
        } else {
            setAnnouncements(data || [])
        }
        setLoading(false)
    }

    if (loading) return <div style={{ color: '#64748b', padding: '20px' }}>Loading announcements...</div>

    return (
        <div style={{ color: '#1e293b' }}>
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px' }}>Announcements</h2>
                <p style={{ color: '#64748b' }}>Latest updates and news from school.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {announcements.map(item => (
                    <div key={item.id} style={{
                        background: '#ffffff',
                        padding: '24px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        position: 'relative'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#3b82f6' }}>{item.title}</h3>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                        <p style={{ color: '#475569', lineHeight: '1.6', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                            {item.description}
                        </p>
                        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                            <span style={{
                                padding: '4px 8px',
                                background: 'rgba(59, 130, 246, 0.08)',
                                color: '#3b82f6',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                {item.audience_scope}
                            </span>
                        </div>
                    </div>
                ))}
                {announcements.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                        No announcements found.
                    </div>
                )}
            </div>
        </div>
    )
}
