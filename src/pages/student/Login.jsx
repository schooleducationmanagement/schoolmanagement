import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function StudentLogin({ onLogin }) {
    const [studentId, setStudentId] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    async function handleSubmit(e) {
        e.preventDefault()
        if (!studentId.trim()) return

        setLoading(true)
        setError(null)

        try {
            const { data, error: fetchError } = await supabase
                .from('students_full')
                .select('*')
                .eq('student_id', studentId.trim())
                .maybeSingle()

            if (fetchError) throw fetchError
            if (!data) {
                setError('Student ID not found. Please check and try again.')
            } else {
                onLogin(data)
            }
        } catch (err) {
            console.error('Login error:', err)
            setError('An error occurred during login.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8fafc',
            color: '#1e293b',
            fontFamily: 'system-ui'
        }}>
            <form onSubmit={handleSubmit} style={{
                background: '#ffffff',
                padding: '40px',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '400px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
            }}>
                <h2 style={{ marginBottom: '24px', color: '#3b82f6' }}>Student Login</h2>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#64748b' }}>Student ID</label>
                    <input
                        type="text"
                        value={studentId}
                        onChange={e => setStudentId(e.target.value)}
                        placeholder="e.g. S1001"
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            color: '#1e293b',
                            outline: 'none'
                        }}
                    />
                </div>

                {error && (
                    <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '16px', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '13px',
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        transition: 'background 0.2s'
                    }}
                >
                    {loading ? 'Verifying...' : 'Login'}
                </button>

                <p style={{ marginTop: '24px', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                    EduCore School Management System
                </p>
            </form>
        </div>
    )
}
