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
    // fee fields
    total_amount: '',
    payment_plan: 'Annual',
}

export default function StudentForm() {
    const navigate = useNavigate()
    const { id } = useParams()       // present when editing
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

    // auto-suggest roll number when class changes
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
        if (data != null) {
            setForm(f => ({ ...f, roll_number: data }))
        }
    }

    async function loadStudent() {
        setLoading(true)
        const { data: st } = await supabase
            .from('students_full')
            .select('*')
            .eq('id', id)
            .single()

        const { data: fee } = await supabase
            .from('fees')
            .select('*')
            .eq('student_id', id)
            .eq('academic_year', CURRENT_YEAR)
            .single()

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
        // validate required fields
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
            const { error } = await supabase
                .from('students')
                .update(studentPayload)
                .eq('id', id)
            if (error) { setError(error.message); setSaving(false); return }
        } else {
            // insert with empty student_id — trigger will generate it
            const { data, error } = await supabase
                .from('students')
                .insert({ ...studentPayload, student_id: '' })
                .select()
                .single()
            if (error) { setError(error.message); setSaving(false); return }
            studentId = data.id
        }

        // save fee record if amount provided
        if (form.total_amount) {
            const feePayload = {
                student_id: studentId,
                academic_year: form.academic_year,
                total_amount: parseFloat(form.total_amount),
                payment_plan: form.payment_plan,
            }
            // upsert fee record
            await supabase
                .from('fees')
                .upsert(feePayload, { onConflict: 'student_id,academic_year' })
        }

        setSaving(false)
        navigate(`/admin/students/${studentId}`)
    }

    if (loading) return <div className={s.loading}>Loading student data...</div>

    return (
        <div className={cs.page}>
            <div className={cs.formCard}>

                {error && <div className={s.error}>{error}</div>}

                {/* Personal Details */}
                <div className={cs.section}>
                    <div className={cs.sectionTitle}>Personal Details</div>
                    <div className={cs.grid3}>
                        <div className={s.field} style={{ gridColumn: '1 / -1' }}>
                            <label className={s.label}>Full Name *</label>
                            <input
                                className={s.input}
                                name="full_name"
                                value={form.full_name}
                                onChange={handleChange}
                                placeholder="e.g. Aarav Sharma"
                            />
                        </div>
                        <div className={s.field}>
                            <label className={s.label}>Date of Birth *</label>
                            <input
                                className={s.input}
                                name="dob"
                                type="date"
                                value={form.dob}
                                onChange={handleChange}
                            />
                        </div>
                        <div className={s.field}>
                            <label className={s.label}>Gender</label>
                            <select className={s.select} name="gender" value={form.gender} onChange={handleChange}>
                                <option value="">-- Select --</option>
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div className={s.field}>
                            <label className={s.label}>Blood Group</label>
                            <select className={s.select} name="blood_group" value={form.blood_group} onChange={handleChange}>
                                <option value="">-- Select --</option>
                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                    <option key={bg}>{bg}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Academic Details */}
                <div className={cs.section}>
                    <div className={cs.sectionTitle}>Academic Details</div>
                    <div className={cs.grid3}>
                        <div className={s.field}>
                            <label className={s.label}>Class *</label>
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
                        </div>
                        <div className={s.field}>
                            <label className={s.label}>Roll Number *</label>
                            <input
                                className={s.input}
                                name="roll_number"
                                type="number"
                                min="1"
                                value={form.roll_number}
                                onChange={handleChange}
                                placeholder="Auto-suggested"
                            />
                        </div>
                        <div className={s.field}>
                            <label className={s.label}>Academic Year *</label>
                            <input
                                className={s.input}
                                name="academic_year"
                                value={form.academic_year}
                                onChange={handleChange}
                                placeholder="e.g. 2025-26"
                            />
                        </div>
                        <div className={s.field}>
                            <label className={s.label}>Admission Date *</label>
                            <input
                                className={s.input}
                                name="admission_date"
                                type="date"
                                value={form.admission_date}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Parent Details */}
                <div className={cs.section}>
                    <div className={cs.sectionTitle}>Parent / Guardian Details</div>
                    <div className={cs.grid3}>
                        <div className={s.field}>
                            <label className={s.label}>Parent Name *</label>
                            <input
                                className={s.input}
                                name="parent_name"
                                value={form.parent_name}
                                onChange={handleChange}
                                placeholder="e.g. Ramesh Sharma"
                            />
                        </div>
                        <div className={s.field}>
                            <label className={s.label}>Relation</label>
                            <select className={s.select} name="parent_relation" value={form.parent_relation} onChange={handleChange}>
                                <option>Parent</option>
                                <option>Father</option>
                                <option>Mother</option>
                                <option>Guardian</option>
                            </select>
                        </div>
                        <div className={s.field}>
                            <label className={s.label}>Phone *</label>
                            <input
                                className={s.input}
                                name="parent_phone"
                                value={form.parent_phone}
                                onChange={handleChange}
                                placeholder="e.g. 9876543210"
                            />
                        </div>
                        <div className={s.field}>
                            <label className={s.label}>Email</label>
                            <input
                                className={s.input}
                                name="parent_email"
                                type="email"
                                value={form.parent_email}
                                onChange={handleChange}
                                placeholder="parent@email.com"
                            />
                        </div>
                        <div className={s.field} style={{ gridColumn: 'span 2' }}>
                            <label className={s.label}>Address</label>
                            <input
                                className={s.input}
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                placeholder="Full address"
                            />
                        </div>
                    </div>
                </div>

                {/* Fee Details */}
                <div className={cs.section}>
                    <div className={cs.sectionTitle}>Fee Details</div>
                    <div className={cs.grid3}>
                        <div className={s.field}>
                            <label className={s.label}>Fee Category</label>
                            <select className={s.select} name="fee_category" value={form.fee_category} onChange={handleChange}>
                                <option>General</option>
                                <option>Scholarship</option>
                                <option>Staff Ward</option>
                            </select>
                        </div>
                        <div className={s.field}>
                            <label className={s.label}>Total Fee Amount (Rs)</label>
                            <input
                                className={s.input}
                                name="total_amount"
                                type="number"
                                min="0"
                                value={form.total_amount}
                                onChange={handleChange}
                                placeholder="e.g. 45000"
                            />
                        </div>
                        <div className={s.field}>
                            <label className={s.label}>Payment Plan</label>
                            <select className={s.select} name="payment_plan" value={form.payment_plan} onChange={handleChange}>
                                <option>Annual</option>
                                <option>Quarterly</option>
                                <option>Monthly</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className={cs.actions}>
                    <button
                        className={s.btnGhost}
                        onClick={() => navigate(-1)}
                    >
                        Cancel
                    </button>
                    <button
                        className={s.btnPrimary}
                        onClick={handleSubmit}
                        disabled={saving}
                    >
                        {saving
                            ? 'Saving...'
                            : isEdit ? 'Update Student' : 'Register Student'}
                    </button>
                </div>
            </div>
        </div>
    )
}