import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LabelList
} from 'recharts/umd/Recharts'
import s from './Dashboard.module.css'

const COLORS = ['#6366f1', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b']
const FEE_COLORS = ['#10b981', '#f97316', '#ef4444']

export default function Dashboard() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [counts, setCounts] = useState({
        classes: 0, subjects: 0, teachers: 0, students: 0, exams: 0
    })
    const [studentsPerClass, setStudentsPerClass] = useState([])
    const [feeStatusData, setFeeStatusData] = useState([])
    const [feeByClass, setFeeByClass] = useState([])

    useEffect(() => { fetchAll() }, [])

    async function fetchAll() {
        setLoading(true)
        const [cls, sub, tch, stu, exm] = await Promise.all([
            supabase.from('classes').select('*', { count: 'exact', head: true }),
            supabase.from('subjects').select('*', { count: 'exact', head: true }),
            supabase.from('teachers').select('*', { count: 'exact', head: true }),
            supabase.from('students').select('*', { count: 'exact', head: true }),
            supabase.from('exams').select('*', { count: 'exact', head: true }),
        ])
        setCounts({
            classes: cls.count ?? 0,
            subjects: sub.count ?? 0,
            teachers: tch.count ?? 0,
            students: stu.count ?? 0,
            exams: exm.count ?? 0,
        })

        // Students per class
        const { data: stuFull } = await supabase
            .from('students_full')
            .select('class_name, grade, section')
        if (stuFull) {
            const classMap = {}
            stuFull.forEach(st => {
                const key = st.class_name || `Grade ${st.grade} - ${st.section}`
                classMap[key] = (classMap[key] || 0) + 1
            })
            setStudentsPerClass(
                Object.entries(classMap)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => a.name.localeCompare(b.name))
            )
        }

        // Fee data
        const { data: feeSummary } = await supabase.from('fee_summary').select('*')
        if (feeSummary && feeSummary.length > 0) {
            // Fee status donut
            const statusMap = {}
            feeSummary.forEach(f => {
                const st = f.payment_status || 'Unknown'
                statusMap[st] = (statusMap[st] || 0) + 1
            })
            setFeeStatusData(
                Object.entries(statusMap).map(([name, value]) => ({ name, value }))
            )

            // Fee by class
            const { data: stuList } = await supabase
                .from('students_full')
                .select('id, class_name, grade, section')
            if (stuList) {
                const stuClassMap = {}
                stuList.forEach(st => {
                    stuClassMap[st.id] = st.class_name || `Grade ${st.grade} - ${st.section}`
                })
                const classFeeMap = {}
                feeSummary.forEach(f => {
                    const className = stuClassMap[f.student_id] || 'Unknown'
                    if (!classFeeMap[className]) classFeeMap[className] = { collected: 0, pending: 0 }
                    classFeeMap[className].collected += Number(f.total_paid || 0)
                    classFeeMap[className].pending += Number(f.balance || 0)
                })
                setFeeByClass(
                    Object.entries(classFeeMap)
                        .map(([name, v]) => ({ name, collected: v.collected, pending: v.pending }))
                        .sort((a, b) => a.name.localeCompare(b.name))
                )
            }
        }

        setLoading(false)
    }

    // Compute fee totals
    const totalCollected = feeByClass.reduce((s, c) => s + c.collected, 0)
    const totalPending = feeByClass.reduce((s, c) => s + c.pending, 0)
    const totalFees = totalCollected + totalPending
    const collectionPct = totalFees > 0 ? Math.round((totalCollected / totalFees) * 100) : 0

    const stats = [
        { label: 'Students', value: counts.students, icon: '👥', color: '#6366f1', path: '/admin/students' },
        { label: 'Classes', value: counts.classes, icon: '🏫', color: '#10b981', path: '/admin/classes' },
        { label: 'Teachers', value: counts.teachers, icon: '👨‍🏫', color: '#f97316', path: '/admin/teachers' },
        { label: 'Subjects', value: counts.subjects, icon: '📚', color: '#8b5cf6', path: '/admin/classes' },
        { label: 'Exams', value: counts.exams, icon: '📝', color: '#ef4444', path: '/admin/examinations' },
    ]

    const formatCurrency = (val) => {
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`
        if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`
        return `₹${val}`
    }

    const CustomFeeTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null
        return (
            <div className={s.customTooltip}>
                <div className={s.tooltipTitle}>{label}</div>
                {payload.map((p, i) => (
                    <div key={i} className={s.tooltipRow}>
                        <span className={s.tooltipDot} style={{ background: p.fill || p.color }} />
                        <span>{p.name}: {formatCurrency(p.value)}</span>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className={s.page}>
            {/* ── Greeting ── */}
            <div className={s.greeting}>
                <h1 className={s.greetTitle}>Welcome back, Admin 👋</h1>
                <p className={s.greetSub}>Here's what's happening at your school today</p>
            </div>

            {/* ── Stat cards ── */}
            <div className={s.statsGrid}>
                {stats.map(st => (
                    <div
                        key={st.label}
                        className={s.statCard}
                        onClick={() => navigate(st.path)}
                    >
                        <div className={s.statIconWrap} style={{ background: `${st.color}18` }}>
                            <span className={s.statIcon}>{st.icon}</span>
                        </div>
                        <div className={s.statInfo}>
                            <div className={s.statVal}>
                                {loading ? '—' : st.value}
                            </div>
                            <div className={s.statLabel}>{st.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Students per Class (full width) ── */}
            <div className={s.chartCard}>
                <div className={s.chartHeader}>
                    <h3 className={s.chartTitle}>Students per Class</h3>
                    <span className={s.chartBadge}>{counts.students} total</span>
                </div>
                <div className={s.chartBody}>
                    {studentsPerClass.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={studentsPerClass} margin={{ top: 25, right: 20, bottom: 20, left: 0 }}>
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
                                    axisLine={{ stroke: '#e5e7eb' }}
                                    tickLine={false}
                                    interval={0}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                                    allowDecimals={false}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.1)' }}
                                    cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                                />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={56}>
                                    {studentsPerClass.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                    <LabelList
                                        dataKey="count"
                                        position="top"
                                        style={{ fontSize: 13, fontWeight: 700, fill: '#111827' }}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className={s.emptyChart}>No student data yet</div>
                    )}
                </div>
            </div>

            {/* ── Fee Section ── */}
            <div className={s.chartsRow}>
                <div className={s.chartCard}>
                    <div className={s.chartHeader}>
                        <h3 className={s.chartTitle}>Fee Collection Status</h3>
                        {totalFees > 0 && (
                            <span className={s.chartBadge}>{collectionPct}% collected</span>
                        )}
                    </div>
                    <div className={s.chartBody}>
                        {feeStatusData.length > 0 ? (
                            <div className={s.feeDonutWrap}>
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie
                                            data={feeStatusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={90}
                                            paddingAngle={3}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {feeStatusData.map((_, i) => (
                                                <Cell key={i} fill={FEE_COLORS[i % FEE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className={s.feeSummaryStats}>
                                    <div className={s.feeStat}>
                                        <span className={s.feeStatDot} style={{ background: '#1010b9ff' }} />
                                        <div>
                                            <div className={s.feeStatVal}>{formatCurrency(totalCollected + totalPending)}</div>
                                            <div className={s.feeStatLabel}>Total</div>
                                        </div>
                                    </div>
                                    <div className={s.feeStat}>
                                        <span className={s.feeStatDot} style={{ background: '#10b981' }} />
                                        <div>
                                            <div className={s.feeStatVal}>{formatCurrency(totalCollected)}</div>
                                            <div className={s.feeStatLabel}>Collected</div>
                                        </div>
                                    </div>
                                    <div className={s.feeStat}>
                                        <span className={s.feeStatDot} style={{ background: '#f97316' }} />
                                        <div>
                                            <div className={s.feeStatVal}>{formatCurrency(totalPending)}</div>
                                            <div className={s.feeStatLabel}>Pending</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={s.emptyChart}>No fee data yet</div>
                        )}
                    </div>
                </div>

                <div className={s.chartCard}>
                    <div className={s.chartHeader}>
                        <h3 className={s.chartTitle}>Fee Collection by Class</h3>
                    </div>
                    <div className={s.chartBody}>
                        {feeByClass.length > 0 ? (
                            <ResponsiveContainer width="100%" height={feeByClass.length * 60 + 40}>
                                <BarChart
                                    data={feeByClass}
                                    layout="vertical"
                                    margin={{ top: 10, right: 60, bottom: 10, left: 10 }}
                                >
                                    <XAxis
                                        type="number"
                                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                                        tickFormatter={formatCurrency}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        tick={({ x, y, payload }) => {
                                            const item = feeByClass.find(f => f.name === payload.value)
                                            return (
                                                <g transform={`translate(${x},${y})`}>
                                                    <text x={-10} y={-4} dy={0} textAnchor="end" fill="#374151" fontSize={12} fontWeight={600}>
                                                        {payload.value}
                                                    </text>
                                                    <text x={-10} y={12} dy={0} textAnchor="end" fill="#9ca3af" fontSize={10}>
                                                        Total: {formatCurrency((item?.collected || 0) + (item?.pending || 0))}
                                                    </text>
                                                </g>
                                            )
                                        }}
                                        width={100}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<CustomFeeTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                                    <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[0, 6, 6, 0]} maxBarSize={22}>
                                        <LabelList
                                            dataKey="collected"
                                            position="right"
                                            formatter={formatCurrency}
                                            style={{ fontSize: 11, fontWeight: 600, fill: '#10b981' }}
                                        />
                                    </Bar>
                                    <Bar dataKey="pending" name="Pending" fill="#f97316" radius={[0, 6, 6, 0]} maxBarSize={22}>
                                        <LabelList
                                            dataKey="pending"
                                            position="right"
                                            formatter={formatCurrency}
                                            style={{ fontSize: 11, fontWeight: 600, fill: '#f97316' }}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className={s.emptyChart}>No fee data yet</div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Redirect Buttons ── */}
            <div className={s.redirectRow}>
                <button className={s.redirectBtn} onClick={() => navigate("/teacher")}>
                    <span className={s.redirectIcon}>👨‍🏫</span>
                    Teacher Portal
                </button>
                <button className={s.redirectBtn} onClick={() => navigate("/student")}>
                    <span className={s.redirectIcon}>🎓</span>
                    Student Portal
                </button>
            </div>
        </div>
    )
}