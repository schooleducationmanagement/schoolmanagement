import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import cs from './Login.module.css'

export default function TeacherLogin({ onLogin }) {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    async function handleLogin() {
        const trimmed = email.trim().toLowerCase()
        if (!trimmed) { setError('Please enter your email address'); return }

        setLoading(true)
        setError(null)

        const { data, error } = await supabase
            .from('teachers')
            .select(`
        id, name, email, phone,
        class_teacher_of,
        classes ( name )
      `)
            .eq('email', trimmed)
            .single()

        setLoading(false)

        if (error || !data) {
            setError('No teacher account found with this email address.')
            return
        }

        const teacher = {
            ...data,
            class_teacher_of_name: data.classes?.name ?? null,
        }

        onLogin(teacher)
        navigate('/teacher')
    }

    return (
        <div className={cs.page}>
            <div className={cs.card}>
                <div className={cs.logo}>EduCore</div>
                <div className={cs.sub}>Teacher Portal</div>

                <div className={cs.field}>
                    <label className={cs.label}>School Email</label>
                    <input
                        className={cs.input}
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        placeholder="your.name@school.in"
                        autoFocus
                    />
                </div>

                {error && <div className={cs.error}>{error}</div>}

                <button
                    className={cs.btn}
                    onClick={handleLogin}
                    disabled={loading}
                >
                    {loading ? 'Signing in...' : 'Sign In'}
                </button>

                <div className={cs.hint}>
                    Enter your school email to access the teacher portal.
                    Contact admin if you cannot log in.
                </div>
            </div>
        </div>
    )
}