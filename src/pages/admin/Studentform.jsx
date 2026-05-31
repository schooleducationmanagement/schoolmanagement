import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import s from '../../components/admin/PageShell.module.css'
import cs from './Studentform.module.css'

const CURRENT_YEAR = '2025-26'

const EMPTY_FORM = {
    full_name: '',
    dob: '',
    gender: '',
    blood_group: '',
    class_id: '',
    roll_number: '',
    admission_date: new Date().toISOString().slice(0, 10),
    academic_year: CURRENT_YEAR,
    parent_name: '',
    parent_relation: 'Parent',
    parent_phone: '',
    parent_email: '',
    address: '',
    fee_category: 'General',
    total_amount: '',
    payment_plan: 'Annual',
}

/* ── tiny icon components (inline svg, no external dep) ── */
function Icon({ d, size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d={d} />
        </svg>
    )
}

const ICONS = {
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    rupee: 'M18 7H9.5a4.5 4.5 0 0 0 0 9H12M6 7h12M6 11h12M12 16l4 5',
    alert: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
}

/* ── field wrapper ── */
function Field({ label, required, children, span }) {
    const style = span ? { gridColumn: span } : undefined
    return (
        <div className={s.field} style={style}>
            <label className={s.label}>
                {label}
                {required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
            </label>
            {children}
        </div>
    )
}

export default function StudentForm() {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = Boolean(id)

    const [form, setForm] = useState(EMPTY_FORM)
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchClasses()
        if (isEdit) loadStudent()
    }, [])

    useEffect(() => {
        if (form.class_id && !isEdit) suggestRollNumber(form.class_id)
    }, [form.class_id])

    async function fetchClasses() {
        const { data } = await supabase
            .from('classes')
            .select('id, name, grade, section')
            .order('grade')
            .order('section')
        setClasses(data ?? [])
    }

    async function suggestRollNumber(classId) {
        const { data } = await supabase
            .rpc('next_roll_number', { p_class_id: classId })
        if (data != null) setForm(f => ({ ...f, roll_number: data }))
    }

    async function loadStudent() {
        setLoading(true)
        const { data: st } = await supabase
            .from('students_full').select('*').eq('id', id).single()
        const { data: fee } = await supabase
            .from('fees').select('*')
            .eq('student_id', id).eq('academic_year', CURRENT_YEAR).single()
        if (st) {
            setForm({
                full_name: st.full_name,
                dob: st.dob,
                gender: st.gender ?? '',
                blood_group: st.blood_group ?? '',
                class_id: st.class_id,
                roll_number: st.roll_number,
                admission_date: st.admission_date,
                academic_year: st.academic_year,
                parent_name: st.parent_name,
                parent_relation: st.parent_relation ?? 'Parent',
                parent_phone: st.parent_phone,
                parent_email: st.parent_email ?? '',
                address: st.address ?? '',
                fee_category: st.fee_category ?? 'General',
                total_amount: fee?.total_amount ?? '',
                payment_plan: fee?.payment_plan ?? 'Annual',
            })
        }
        setLoading(false)
    }

    function handleChange(e) {
        const { name, value } = e.target
        setForm(f => ({ ...f, [name]: value }))
    }

    async function handleSubmit() {
        const required = ['full_name', 'dob', 'class_id', 'roll_number',
            'admission_date', 'academic_year', 'parent_name', 'parent_phone']
        const missing = required.filter(k => !form[k])
        if (missing.length > 0) {
            setError('Please fill in all required fields: ' + missing.join(', '))
            return
        }
        setSaving(true)
        setError(null)

        const studentPayload = {
            full_name: form.full_name.trim(),
            dob: form.dob,
            gender: form.gender || null,
            blood_group: form.blood_group || null,
            class_id: form.class_id,
            roll_number: parseInt(form.roll_number),
            admission_date: form.admission_date,
            academic_year: form.academic_year,
            parent_name: form.parent_name.trim(),
            parent_relation: form.parent_relation,
            parent_phone: form.parent_phone.trim(),
            parent_email: form.parent_email.trim() || null,
            address: form.address.trim() || null,
            fee_category: form.fee_category,
        }

        let studentId = id
        if (isEdit) {
            const { error } = await supabase.from('students').update(studentPayload).eq('id', id)
            if (error) { setError(error.message); setSaving(false); return }
        } else {
            const { data, error } = await supabase
                .from('students')
                .insert({ ...studentPayload, student_id: '' })
                .select().single()
            if (error) { setError(error.message); setSaving(false); return }
            studentId = data.id
        }

        if (form.total_amount) {
            await supabase.from('fees').upsert({
                student_id: studentId,
                academic_year: form.academic_year,
                total_amount: parseFloat(form.total_amount),
                payment_plan: form.payment_plan,
            }, { onConflict: 'student_id,academic_year' })
        }

        setSaving(false)
        navigate(`/admin/students/${studentId}`)
    }

    if (loading) return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 320, color: '#64748b', gap: 10, fontSize: '0.9rem'
        }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Loading student data…
        </div>
    )

    return (
        <div className={cs.page}>

            {/* ── Page header ── */}
            <div className={cs.pageHeader}>
                <h1 className={cs.pageTitle}>
                    {isEdit ? 'Edit Student' : 'Register New Student'}
                </h1>
                <p className={cs.pageSubtitle}>
                    {isEdit
                        ? 'Update student information and fee details'
                        : 'Fill in the details below to add a new student'}
                </p>
            </div>

            <div className={cs.formCard}>

                {/* ── Error banner ── */}
                {error && (
                    <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        margin: '0', padding: '14px 32px',
                        background: '#fef2f2', borderBottom: '1px solid #fecaca',
                        color: '#b91c1c', fontSize: '0.85rem', fontWeight: 500,
                    }}>
                        <Icon d={ICONS.alert} size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {/* ══ Personal Details ══ */}
                <div className={cs.section}>
                    <div className={cs.sectionTitle}>
                        <Icon d={ICONS.user} size={13} />
                        Personal Details
                    </div>
                    <div className={cs.grid3}>
                        <Field label="Full Name" required span="1 / -1">
                            <input
                                className={s.input}
                                name="full_name"
                                value={form.full_name}
                                onChange={handleChange}
                                placeholder="e.g. Aarav Sharma"
                            />
                        </Field>
                        <Field label="Date of Birth" required>
                            <input
                                className={s.input}
                                name="dob"
                                type="date"
                                value={form.dob}
                                onChange={handleChange}
                            />
                        </Field>
                        <Field label="Gender">
                            <select className={s.select} name="gender" value={form.gender} onChange={handleChange}>
                                <option value="">-- Select --</option>
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </Field>
                        <Field label="Blood Group">
                            <select className={s.select} name="blood_group" value={form.blood_group} onChange={handleChange}>
                                <option value="">-- Select --</option>
                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                    <option key={bg}>{bg}</option>
                                ))}
                            </select>
                        </Field>
                    </div>
                </div>

                {/* ══ Academic Details ══ */}
                <div className={cs.section}>
                    <div className={cs.sectionTitle}>
                        <Icon d={ICONS.book} size={13} />
                        Academic Details
                    </div>
                    <div className={cs.grid3}>
                        <Field label="Class" required>
                            <select
                                className={s.select}
                                name="class_id"
                                value={form.class_id}
                                onChange={handleChange}
                            >
                                <option value="">-- Select Class --</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Roll Number" required>
                            <input
                                className={s.input}
                                name="roll_number"
                                type="number"
                                min="1"
                                value={form.roll_number}
                                onChange={handleChange}
                                placeholder="Auto-suggested"
                            />
                        </Field>
                        <Field label="Academic Year" required>
                            <input
                                className={s.input}
                                name="academic_year"
                                value={form.academic_year}
                                onChange={handleChange}
                                placeholder="e.g. 2025-26"
                            />
                        </Field>
                        <Field label="Admission Date" required>
                            <input
                                className={s.input}
                                name="admission_date"
                                type="date"
                                value={form.admission_date}
                                onChange={handleChange}
                            />
                        </Field>
                    </div>
                </div>

                {/* ══ Parent / Guardian Details ══ */}
                <div className={cs.section}>
                    <div className={cs.sectionTitle}>
                        <Icon d={ICONS.users} size={13} />
                        Parent / Guardian Details
                    </div>
                    <div className={cs.grid3}>
                        <Field label="Parent Name" required>
                            <input
                                className={s.input}
                                name="parent_name"
                                value={form.parent_name}
                                onChange={handleChange}
                                placeholder="e.g. Ramesh Sharma"
                            />
                        </Field>
                        <Field label="Relation">
                            <select className={s.select} name="parent_relation" value={form.parent_relation} onChange={handleChange}>
                                <option>Parent</option>
                                <option>Father</option>
                                <option>Mother</option>
                                <option>Guardian</option>
                            </select>
                        </Field>
                        <Field label="Phone" required>
                            <input
                                className={s.input}
                                name="parent_phone"
                                value={form.parent_phone}
                                onChange={handleChange}
                                placeholder="e.g. 9876543210"
                            />
                        </Field>
                        <Field label="Email">
                            <input
                                className={s.input}
                                name="parent_email"
                                type="email"
                                value={form.parent_email}
                                onChange={handleChange}
                                placeholder="parent@email.com"
                            />
                        </Field>
                        <Field label="Address" span="span 2">
                            <input
                                className={s.input}
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                placeholder="Full address"
                            />
                        </Field>
                    </div>
                </div>

                {/* ══ Fee Details ══ */}
                <div className={cs.section}>
                    <div className={cs.sectionTitle}>
                        <Icon d={ICONS.rupee} size={13} />
                        Fee Details
                    </div>
                    <div className={cs.grid3}>
                        <Field label="Fee Category">
                            <select className={s.select} name="fee_category" value={form.fee_category} onChange={handleChange}>
                                <option>General</option>
                                <option>Scholarship</option>
                                <option>Staff Ward</option>
                            </select>
                        </Field>
                        <Field label="Total Fee Amount (₹)">
                            <input
                                className={s.input}
                                name="total_amount"
                                type="number"
                                min="0"
                                value={form.total_amount}
                                onChange={handleChange}
                                placeholder="e.g. 45000"
                            />
                        </Field>
                        <Field label="Payment Plan">
                            <select className={s.select} name="payment_plan" value={form.payment_plan} onChange={handleChange}>
                                <option>Annual</option>
                                <option>Quarterly</option>
                                <option>Monthly</option>
                            </select>
                        </Field>
                    </div>
                </div>

                {/* ══ Actions ══ */}
                <div className={cs.actions}>
                    <button
                        className={s.btnGhost}
                        onClick={() => navigate(-1)}
                        style={{ minWidth: 96 }}
                    >
                        Cancel
                    </button>
                    <button
                        className={s.btnPrimary}
                        onClick={handleSubmit}
                        disabled={saving}
                        style={{ minWidth: 160, display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center' }}
                    >
                        {saving ? (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                    style={{ animation: 'spin 1s linear infinite' }}>
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                </svg>
                                Saving…
                            </>
                        ) : (
                            isEdit ? 'Update Student' : 'Register Student'
                        )}
                    </button>
                </div>

            </div>
        </div>
    )
}