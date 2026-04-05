import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import s from '../../components/admin/PageShell.module.css'
import cs from './Studentform.module.css'

export default function StudentProfile() {
    const navigate = useNavigate()
    const { id } = useParams()

    const [student, setStudent] = useState(null)
    const [feeSummary, setFeeSummary] = useState(null)
    const [payments, setPayments] = useState([])
    const [attSummary, setAttSummary] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [payModal, setPayModal] = useState(false)
    const [payForm, setPayForm] = useState({ amount_paid: '', payment_mode: 'Cash', receipt_number: '', notes: '' })
    const [savingPay, setSavingPay] = useState(false)
    const [payError, setPayError] = useState(null)
    const [feeId, setFeeId] = useState(null)

    useEffect(() => { loadAll() }, [id])

    async function loadAll() {
        setLoading(true)
        setError(null)
        await Promise.all([loadStudent(), loadFeeSummary(), loadAttSummary()])
        setLoading(false)
    }

    async function loadStudent() {
        const { data, error } = await supabase
            .from('students_full').select('*').eq('id', id).single()
        if (error) setError(error.message)
        else setStudent(data)
    }

    async function loadFeeSummary() {
        const { data: fee } = await supabase
            .from('fee_summary').select('*').eq('student_id', id).single()
        if (fee) {
            setFeeSummary(fee)
            setFeeId(fee.fee_id)
            const { data: pays } = await supabase
                .from('fee_payments').select('*').eq('fee_id', fee.fee_id)
                .order('payment_date', { ascending: false })
            setPayments(pays ?? [])
        }
    }

    async function loadAttSummary() {
        const { data } = await supabase
            .from('attendance_summary').select('*').eq('student_id', id).single()
        setAttSummary(data)
    }

    async function handlePayment() {
        if (!payForm.amount_paid || parseFloat(payForm.amount_paid) <= 0) {
            setPayError('Enter a valid amount'); return
        }
        if (!feeId) { setPayError('No fee record found for this student'); return }

        setSavingPay(true)
        setPayError(null)

        const { error } = await supabase.from('fee_payments').insert({
            fee_id: feeId,
            amount_paid: parseFloat(payForm.amount_paid),
            payment_mode: payForm.payment_mode,
            receipt_number: payForm.receipt_number || null,
            notes: payForm.notes || null,
            payment_date: new Date().toISOString().slice(0, 10),
        })

        setSavingPay(false)
        if (error) { setPayError(error.message); return }
        setPayModal(false)
        setPayForm({ amount_paid: '', payment_mode: 'Cash', receipt_number: '', notes: '' })
        loadFeeSummary()
    }

    if (loading) return <div className={s.loading}>Loading student profile…</div>
    if (error) return <div className={s.error}>{error}</div>
    if (!student) return <div className={s.error}>Student not found</div>

    const attPct = attSummary?.attendance_pct ?? null
    const attColor = attPct === null ? '#94a3b8'
        : attPct >= 75 ? '#16a34a'
            : attPct >= 50 ? '#d97706'
                : '#dc2626'

    const paidPct = feeSummary
        ? Math.min((feeSummary.total_paid / feeSummary.total_amount) * 100, 100)
        : 0

    return (
        <div className={cs.page}>

            {/* Back */}
            <button
                className={s.btnGhost}
                onClick={() => navigate(-1)}
                style={{ marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
                ← Back to Students
            </button>

            {/* ── Header card ── */}
            <div className={cs.headerCard}>
                <div className={cs.avatar}>
                    {student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>

                <div className={cs.headerInfo}>
                    <div className={cs.studentName}>{student.full_name}</div>
                    <div className={cs.studentId}>{student.student_id}</div>
                    <div className={cs.headerMeta}>
                        <span className={`${s.badge} ${s.badgeBlue}`}>{student.class_name}</span>
                        <span className={`${s.badge} ${s.badgeGray}`}>Roll {student.roll_number}</span>
                        <span className={`${s.badge} ${s.badgeGray}`}>{student.gender ?? '—'}</span>
                        {student.blood_group && (
                            <span className={`${s.badge} ${s.badgePurple}`}>{student.blood_group}</span>
                        )}
                    </div>
                </div>

                <div className={cs.headerActions}>
                    <button
                        className={s.btnGhost}
                        onClick={() => navigate(`/admin/students/${id}/edit`)}
                        style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}
                    >
                        Edit Student
                    </button>
                </div>
            </div>

            {/* ── Main grid ── */}
            <div className={cs.grid}>

                {/* Personal details */}
                <div className={cs.card}>
                    <div className={cs.cardTitle}>Personal Details</div>
                    <div className={cs.detailList}>
                        {[
                            ['Date of Birth', new Date(student.dob).toLocaleDateString('en-IN')],
                            ['Admission Date', new Date(student.admission_date).toLocaleDateString('en-IN')],
                            ['Academic Year', student.academic_year],
                        ].map(([label, val]) => (
                            <div className={cs.detailRow} key={label}>
                                <span className={cs.detailLabel}>{label}</span>
                                <span>{val}</span>
                            </div>
                        ))}
                        <div className={cs.detailRow}>
                            <span className={cs.detailLabel}>Fee Category</span>
                            <span className={`${s.badge} ${student.fee_category === 'Scholarship' ? s.badgeGreen :
                                    student.fee_category === 'Staff Ward' ? s.badgePurple :
                                        s.badgeGray}`}>
                                {student.fee_category}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Parent details */}
                <div className={cs.card}>
                    <div className={cs.cardTitle}>Parent / Guardian</div>
                    <div className={cs.detailList}>
                        {[
                            ['Name', student.parent_name],
                            ['Relation', student.parent_relation],
                            ['Phone', student.parent_phone],
                            student.parent_email && ['Email', student.parent_email],
                            student.address && ['Address', student.address],
                        ].filter(Boolean).map(([label, val]) => (
                            <div className={cs.detailRow} key={label}>
                                <span className={cs.detailLabel}>{label}</span>
                                <span>{val}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Attendance */}
                <div className={cs.card}>
                    <div className={cs.cardTitle}>Attendance Summary</div>
                    {!attSummary ? (
                        <div className={cs.noData}>No attendance records yet</div>
                    ) : (
                        <>
                            <div className={cs.attPct} style={{ color: attColor }}>
                                {attPct}%
                            </div>
                            <div className={cs.attBar}>
                                <div className={cs.attBarFill}
                                    style={{ width: `${attPct}%`, background: attColor }} />
                            </div>
                            <div className={cs.attStats}>
                                {[
                                    ['Present', attSummary.present, '#16a34a'],
                                    ['Absent', attSummary.absent, '#dc2626'],
                                    ['Late', attSummary.late, '#d97706'],
                                    ['Total', attSummary.total_classes, '#475569'],
                                ].map(([label, val, color]) => (
                                    <div className={cs.attStat} key={label}>
                                        <span className={cs.attStatVal} style={{ color }}>{val}</span>
                                        <span className={cs.attStatLabel}>{label}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Fee summary */}
                <div className={`${cs.card} ${cs.feeCard}`}>
                    <div className={cs.cardHeader}>
                        <div className={cs.cardTitle}>Fee Details</div>
                        {feeSummary?.balance > 0 && (
                            <button
                                className={s.btnPrimary}
                                onClick={() => setPayModal(true)}
                                style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                            >
                                + Record Payment
                            </button>
                        )}
                    </div>

                    {!feeSummary ? (
                        <div className={cs.noData}>No fee record found for this student</div>
                    ) : (
                        <>
                            <div className={cs.feeStats}>
                                <div className={cs.feeStat}>
                                    <div className={cs.feeStatLabel}>Total Fee</div>
                                    <div className={cs.feeStatVal}>
                                        ₹{Number(feeSummary.total_amount).toLocaleString('en-IN')}
                                    </div>
                                </div>
                                <div className={cs.feeStat}>
                                    <div className={cs.feeStatLabel}>Paid</div>
                                    <div className={cs.feeStatVal} style={{ color: '#16a34a' }}>
                                        ₹{Number(feeSummary.total_paid).toLocaleString('en-IN')}
                                    </div>
                                </div>
                                <div className={cs.feeStat}>
                                    <div className={cs.feeStatLabel}>Balance</div>
                                    <div className={cs.feeStatVal}
                                        style={{ color: feeSummary.balance > 0 ? '#dc2626' : '#16a34a' }}>
                                        ₹{Number(feeSummary.balance).toLocaleString('en-IN')}
                                    </div>
                                </div>
                                <div className={cs.feeStat}>
                                    <div className={cs.feeStatLabel}>Status</div>
                                    <span className={`${s.badge} ${feeSummary.payment_status === 'Paid' ? s.badgeGreen :
                                            feeSummary.payment_status === 'Partial' ? s.badgePurple :
                                                s.badgeGray}`}>
                                        {feeSummary.payment_status}
                                    </span>
                                </div>
                            </div>

                            <div className={cs.feeBar}>
                                <div className={cs.feeBarFill} style={{ width: `${paidPct}%` }} />
                            </div>

                            {payments.length > 0 && (
                                <div className={cs.payHistory}>
                                    <div className={cs.payHistoryTitle}>Payment History</div>
                                    <table className={s.table} style={{ marginTop: 8 }}>
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Amount</th>
                                                <th>Mode</th>
                                                <th>Receipt</th>
                                                <th>Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.map(p => (
                                                <tr key={p.id}>
                                                    <td>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                                                    <td style={{ color: '#16a34a', fontWeight: 600 }}>
                                                        ₹{Number(p.amount_paid).toLocaleString('en-IN')}
                                                    </td>
                                                    <td>{p.payment_mode}</td>
                                                    <td>{p.receipt_number ?? '—'}</td>
                                                    <td style={{ color: '#94a3b8' }}>{p.notes ?? '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Payment modal ── */}
            {payModal && (
                <div
                    className={s.overlay}
                    onClick={e => e.target === e.currentTarget && setPayModal(false)}
                >
                    <div className={s.modal}>
                        <h2 className={s.modalTitle}>Record Payment</h2>

                        {payError && <div className={s.error}>{payError}</div>}

                        {feeSummary && (
                            <div className={cs.payBalance}>
                                Balance due: <strong>
                                    ₹{Number(feeSummary.balance).toLocaleString('en-IN')}
                                </strong>
                            </div>
                        )}

                        <div className={s.field}>
                            <label className={s.label}>Amount (₹) *</label>
                            <input
                                className={s.input}
                                type="number"
                                min="1"
                                value={payForm.amount_paid}
                                onChange={e => setPayForm(f => ({ ...f, amount_paid: e.target.value }))}
                                placeholder="Enter amount"
                            />
                        </div>

                        <div className={s.grid2}>
                            <div className={s.field}>
                                <label className={s.label}>Payment Mode</label>
                                <select
                                    className={s.select}
                                    value={payForm.payment_mode}
                                    onChange={e => setPayForm(f => ({ ...f, payment_mode: e.target.value }))}
                                >
                                    <option>Cash</option>
                                    <option>Online</option>
                                    <option>Cheque</option>
                                    <option>DD</option>
                                </select>
                            </div>
                            <div className={s.field}>
                                <label className={s.label}>Receipt Number</label>
                                <input
                                    className={s.input}
                                    value={payForm.receipt_number}
                                    onChange={e => setPayForm(f => ({ ...f, receipt_number: e.target.value }))}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        <div className={s.field}>
                            <label className={s.label}>Notes</label>
                            <input
                                className={s.input}
                                value={payForm.notes}
                                onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder="Optional notes"
                            />
                        </div>

                        <div className={s.modalFooter}>
                            <button className={s.btnGhost} onClick={() => setPayModal(false)}>
                                Cancel
                            </button>
                            <button
                                className={s.btnPrimary}
                                onClick={handlePayment}
                                disabled={savingPay}
                            >
                                {savingPay ? 'Saving…' : 'Save Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}