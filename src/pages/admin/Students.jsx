import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import s from '../../components/admin/PageShell.module.css'
import cs from './Students.module.css'

export default function Students() {
    const navigate = useNavigate()

    const [classes, setClasses] = useState([])
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // filters
    const [classId, setClassId] = useState('')
    const [search, setSearch] = useState('')

    useEffect(() => { fetchClasses() }, [])
    useEffect(() => { if (classId) fetchStudents() }, [classId])

    async function fetchClasses() {
        const { data } = await supabase
            .from('classes')
            .select('id, name, grade, section')
            .order('grade')
            .order('section')
        setClasses(data ?? [])
    }

    async function fetchStudents() {
        setLoading(true)
        setError(null)
        const { data, error } = await supabase
            .from('students_full')
            .select('*')
            .eq('class_id', classId)
            .order('roll_number')
        if (error) setError(error.message)
        else setStudents(data ?? [])
        setLoading(false)
    }

    const filtered = students.filter(st =>
        st.full_name.toLowerCase().includes(search.toLowerCase()) ||
        st.student_id.toLowerCase().includes(search.toLowerCase()) ||
        String(st.roll_number).includes(search)
    )

    async function handleDelete(id, name) {
        if (!confirm(`Delete student ${name}? This cannot be undone.`)) return
        const { error } = await supabase.from('students').delete().eq('id', id)
        if (error) setError(error.message)
        else fetchStudents()
    }

    return (
        <div>
            {/* Controls */}
            <div className={cs.controls}>
                <div className={cs.filters}>
                    <div>
                        <label className={s.label}>Class</label>
                        <select
                            className={s.select}
                            value={classId}
                            onChange={e => { setClassId(e.target.value); setSearch('') }}
                            style={{ minWidth: 180 }}
                        >
                            <option value="">-- Select Class --</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {classId && (
                        <div>
                            <label className={s.label}>Search</label>
                            <input
                                className={s.input}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Name, student ID or roll number"
                                style={{ minWidth: 240 }}
                            />
                        </div>
                    )}
                </div>

                <button
                    className={s.btnPrimary}
                    onClick={() => navigate('/admin/students/add')}
                >
                    + Add Student
                </button>
            </div>

            {error && <div className={s.error}>{error}</div>}

            {/* No class selected */}
            {!classId && (
                <div className={cs.emptyState}>
                    <div className={cs.emptyIcon}>graduation</div>
                    <div className={cs.emptyText}>Select a class to view its students</div>
                </div>
            )}

            {/* Loading */}
            {classId && loading && (
                <div className={s.loading}>Loading students...</div>
            )}

            {/* Table */}
            {classId && !loading && (
                <>
                    <div className={cs.countRow}>
                        <span className={cs.count}>
                            {filtered.length} student{filtered.length !== 1 ? 's' : ''}
                            {search && ` matching "${search}"`}
                        </span>
                    </div>

                    {filtered.length === 0 ? (
                        <div className={s.tableWrap}>
                            <div className={s.empty}>
                                <div className={s.emptyIcon}>-</div>
                                <div className={s.emptyText}>
                                    {search
                                        ? 'No students match your search'
                                        : 'No students in this class yet. Add the first student.'}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={s.tableWrap}>
                            <table className={s.table}>
                                <thead>
                                    <tr>
                                        <th>Roll</th>
                                        <th>Student ID</th>
                                        <th>Name</th>
                                        <th>Gender</th>
                                        <th>Parent</th>
                                        <th>Phone</th>
                                        <th>Fee Category</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(st => (
                                        <tr key={st.id}>
                                            <td>
                                                <span className={`${s.badge} ${s.badgeGray}`}>
                                                    {st.roll_number}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`${s.badge} ${s.badgeBlue}`}>
                                                    {st.student_id}
                                                </span>
                                            </td>
                                            <td>
                                                <div className={cs.studentName}>{st.full_name}</div>
                                                <div className={cs.studentDob}>
                                                    DOB: {new Date(st.dob).toLocaleDateString('en-IN')}
                                                </div>
                                            </td>
                                            <td>{st.gender ?? '-'}</td>
                                            <td>
                                                <div>{st.parent_name}</div>
                                                <div className={cs.parentRel}>{st.parent_relation}</div>
                                            </td>
                                            <td>{st.parent_phone}</td>
                                            <td>
                                                <span className={`${s.badge} ${st.fee_category === 'Scholarship' ? s.badgeGreen :
                                                        st.fee_category === 'Staff Ward' ? s.badgePurple :
                                                            s.badgeGray
                                                    }`}>
                                                    {st.fee_category}
                                                </span>
                                            </td>
                                            <td>
                                                <div className={s.actions}>
                                                    <button
                                                        className={`${s.btnGhost} ${s.btnSm}`}
                                                        onClick={() => navigate(`/admin/students/${st.id}`)}
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        className={`${s.btnGhost} ${s.btnSm}`}
                                                        onClick={() => navigate(`/admin/students/${st.id}/edit`)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className={`${s.btnDanger} ${s.btnSm}`}
                                                        onClick={() => handleDelete(st.id, st.full_name)}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}