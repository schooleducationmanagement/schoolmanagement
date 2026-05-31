import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import s from '../../components/teacher/TPage.module.css'
import cs from './Students.module.css'

export default function TeacherStudents() {
    const [students, setStudents] = useState([])
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(true)

    const [search, setSearch] = useState('')
    const [classFilter, setClassFilter] = useState('')
    const [selected, setSelected] = useState(null)

    useEffect(() => { fetchData() }, [])

    async function fetchData() {
        setLoading(true)
        const [stuRes, clsRes] = await Promise.all([
            supabase
                .from('students_full')
                .select('*')
                .order('grade')
                .order('section')
                .order('roll_number'),
            supabase.from('classes').select('id, name').order('grade').order('section'),
        ])
        setStudents(stuRes.data ?? [])
        setClasses(clsRes.data ?? [])
        setLoading(false)
    }

    const filtered = students.filter(st => {
        if (classFilter && st.class_id !== classFilter) return false
        if (search) {
            const q = search.toLowerCase()
            return (
                st.full_name?.toLowerCase().includes(q) ||
                st.student_id?.toLowerCase().includes(q) ||
                String(st.roll_number).includes(q)
            )
        }
        return true
    })

    function formatDate(d) {
        if (!d) return '—'
        return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        })
    }

    return (
        <div>
            <div className={s.pageHeader}>
                <div>
                    <h1 className={s.pageTitle}>Students</h1>
                    <div className={s.pageSub}>Search any student by name, ID, or class</div>
                </div>
            </div>

            {/* Filters */}
            <div className={cs.filters}>
                <input
                    className={s.input}
                    type="text"
                    placeholder="Search by name, student ID, or roll number..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, minWidth: 200 }}
                />
                <select
                    className={s.select}
                    value={classFilter}
                    onChange={e => setClassFilter(e.target.value)}
                    style={{ width: 'auto', minWidth: 160 }}
                >
                    <option value="">All Classes</option>
                    {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Count */}
            {!loading && (
                <div className={cs.count}>
                    {filtered.length} student{filtered.length !== 1 ? 's' : ''} found
                </div>
            )}

            {loading ? (
                <div className={s.loading}>Loading students...</div>
            ) : filtered.length === 0 ? (
                <div className={s.empty}>
                    <div className={s.emptyText}>No students match your search</div>
                </div>
            ) : (
                <div className={s.tableWrap}>
                    <table className={s.table}>
                        <thead>
                            <tr>
                                <th>Roll</th>
                                <th>Name</th>
                                <th>Student ID</th>
                                <th>Class</th>
                                <th>Gender</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(st => (
                                <tr key={st.id}>
                                    <td>{st.roll_number}</td>
                                    <td><strong>{st.full_name}</strong></td>
                                    <td style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{st.student_id}</td>
                                    <td>
                                        <span className={`${s.badge} ${s.badgeAmber}`}>
                                            {st.class_name ?? '—'}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.82rem' }}>{st.gender ?? '—'}</td>
                                    <td>
                                        <button
                                            className={s.btnGhost}
                                            style={{ fontSize: '0.78rem', padding: '5px 11px' }}
                                            onClick={() => setSelected(st)}
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Profile modal */}
            {selected && (
                <div className={s.overlay} onClick={e => e.target === e.currentTarget && setSelected(null)}>
                    <div className={s.modal} style={{ maxWidth: 520 }}>
                        <h2 className={s.modalTitle}>Student Profile</h2>

                        <div className={cs.profileHeader}>
                            <div className={cs.avatar}>
                                {selected.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <div className={cs.profileName}>{selected.full_name}</div>
                                <div className={cs.profileId}>{selected.student_id}</div>
                            </div>
                        </div>

                        <div className={cs.section}>
                            <div className={cs.sectionTitle}>Academic Info</div>
                            <div className={cs.detailGrid}>
                                <DetailRow label="Class" value={selected.class_name} />
                                <DetailRow label="Grade" value={selected.grade} />
                                <DetailRow label="Section" value={selected.section} />
                                <DetailRow label="Roll Number" value={selected.roll_number} />
                                <DetailRow label="Academic Year" value={selected.academic_year} />
                                <DetailRow label="Admission Date" value={formatDate(selected.admission_date)} />
                            </div>
                        </div>

                        <div className={cs.section}>
                            <div className={cs.sectionTitle}>Personal Info</div>
                            <div className={cs.detailGrid}>
                                <DetailRow label="Date of Birth" value={formatDate(selected.dob)} />
                                <DetailRow label="Gender" value={selected.gender} />
                                <DetailRow label="Blood Group" value={selected.blood_group} />
                                <DetailRow label="Address" value={selected.address} />
                            </div>
                        </div>

                        <div className={cs.section}>
                            <div className={cs.sectionTitle}>Parent / Guardian</div>
                            <div className={cs.detailGrid}>
                                <DetailRow label="Name" value={selected.parent_name} />
                                <DetailRow label="Relation" value={selected.parent_relation} />
                                <DetailRow label="Phone" value={selected.parent_phone} />
                                <DetailRow label="Email" value={selected.parent_email} />
                            </div>
                        </div>

                        <div className={s.modalFooter}>
                            <button className={s.btnGhost} onClick={() => setSelected(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function DetailRow({ label, value }) {
    return (
        <div className="detail-row">
            <span style={{ fontSize: '0.74rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                {label}
            </span>
            <span style={{ fontSize: '0.855rem', color: '#e5e7eb' }}>
                {value ?? '—'}
            </span>
        </div>
    )
}
