import { useOutletContext } from 'react-router-dom'

export default function StudentHome() {
    const { student } = useOutletContext()

    return (
        <div style={{ color: '#1e293b' }}>
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px' }}>
                    Student Dashboard
                </h2>
                <p style={{ color: '#64748b' }}>
                    Welcome to your personal portal, {student?.full_name}.
                </p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px'
            }}>
                <Card title="Quick Overview" icon="📊">
                    <p style={{ fontSize: '0.9rem', color: '#475569' }}>
                        You're currently in class <strong>{student?.class_name}</strong>.
                        Check your timetable or announcements for updates.
                    </p>
                </Card>

                <Card title="Recent Announcements" icon="📢">
                    <p style={{ fontSize: '0.9rem', color: '#475569' }}>
                        No new announcements at this time.
                    </p>
                </Card>

                <Card title="Upcoming Exams" icon="✍️">
                    <p style={{ fontSize: '0.9rem', color: '#475569' }}>
                        Examination schedule will be posted here when available.
                    </p>
                </Card>
            </div>
        </div>
    )
}

function Card({ title, icon, children }) {
    return (
        <div style={{
            background: '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '1.5rem' }}>{icon}</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0, color: '#1e293b' }}>{title}</h3>
            </div>
            {children}
        </div>
    )
}
