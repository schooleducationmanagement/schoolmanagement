import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import cs from './Login.module.css'

export default function TeacherLogin({ onLogin }) {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    async function handleLogin() {
        const trimmedEmail = email.trim().toLowerCase()
        const trimmedPass = password.trim()
        
        if (!trimmedEmail) { setError('Please enter your email address'); return }
        if (!trimmedPass) { setError('Please enter your password'); return }

        setLoading(true)
        setError(null)

        const { data, error } = await supabase
            .from('teachers')
            .select(`
                id, name, email, phone, password,
                class_teacher_of,
                classes ( name )
            `)
            .eq('email', trimmedEmail)
            .single()

        setLoading(false)

        if (error || !data) {
            setError('No teacher account found with this email address.')
            return
        }

        if (data.password !== trimmedPass) {
            setError('Incorrect password. Please try again.')
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

                <div className={cs.field}>
                    <label className={cs.label}>Password</label>
                    <input
                        className={cs.input}
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        placeholder="Enter your password"
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