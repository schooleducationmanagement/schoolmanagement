import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import s from '../../components/teacher/TPage.module.css'
import cs from './Timetable.module.css'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function TeacherTimetable() {
    const { teacher } = useOutletContext()
    const [slots, setSlots] = useState([])
    const [periods, setPeriods] = useState([])
    const [breaks, setBreaks] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (teacher?.id) loadData()
    }, [teacher])

    async function loadData() {
        setLoading(true)

        const { data: slotData } = await supabase
            .from('timetable_slots')
            .select(`
                id, day, period, start_time, end_time,
                subjects ( name ),
                classes  ( id, name, config_id )
            `)
            .eq('teacher_id', teacher.id)
            .order('period')

        const allSlots = slotData ?? []
        setSlots(allSlots)

        // Load period + break config from first slot's class config
        if (allSlots.length > 0) {
            const configId = allSlots[0].classes?.config_id
            if (configId) {
                const [pRes, bRes] = await Promise.all([
                    supabase.from('period_config').select('*').eq('config_id', configId).order('period'),
                    supabase.from('break_config').select('*').eq('config_id', configId).order('after_period'),
                ])
                setPeriods(pRes.data ?? [])
                setBreaks(bRes.data ?? [])
            }
        }

        setLoading(false)
    }

    function getSlot(day, period) {
        return slots.find(sl => sl.day === day && sl.period === period) ?? null
    }

    function getBreakAfter(period) {
        return breaks.find(b => b.after_period === period) ?? null
    }

    // Figure out max periods
    const maxPeriod = periods.length > 0
        ? Math.max(...periods.map(p => p.period))
        : slots.length > 0
            ? Math.max(...slots.map(sl => sl.period))
            : 0

    const periodList = []
    for (let i = 1; i <= maxPeriod; i++) periodList.push(i)

    function getPeriodTime(num) {
        const p = periods.find(pr => pr.period === num)
        if (!p) return ''
        return `${p.start_time.slice(0, 5)} – ${p.end_time.slice(0, 5)}`
    }

    if (loading) return <div className={s.loading}>Loading timetable...</div>

    if (slots.length === 0) {
        return (
            <div>
                <div className={s.pageHeader}>
                    <div>
                        <h1 className={s.pageTitle}>My Timetable</h1>
                        <div className={s.pageSub}>Weekly schedule overview</div>
                    </div>
                </div>
                <div className={s.empty}>
                    <div className={s.emptyText}>No timetable slots assigned to you yet</div>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className={s.pageHeader}>
                <div>
                    <h1 className={s.pageTitle}>My Timetable</h1>
                    <div className={s.pageSub}>
                        {slots.length} slot{slots.length !== 1 ? 's' : ''} across the week
                    </div>
                </div>
            </div>

            <div className={cs.gridWrap}>
                <table className={cs.grid}>
                    <thead>
                        <tr>
                            <th className={cs.cornerCell}>Period</th>
                            {WEEKDAYS.map(day => (
                                <th key={day} className={cs.dayHeader}>{day}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {periodList.map(pNum => {
                            const brk = getBreakAfter(pNum)
                            return (
                                <Fragment key={pNum}>
                                    <tr>
                                        <td className={cs.periodCell}>
                                            <div className={cs.periodNum}>P{pNum}</div>
                                            <div className={cs.periodTime}>{getPeriodTime(pNum)}</div>
                                        </td>
                                        {WEEKDAYS.map(day => {
                                            const slot = getSlot(day, pNum)
                                            return (
                                                <td key={day} className={cs.slotCell}>
                                                    {slot ? (
                                                        <div className={cs.slotFilled}>
                                                            <div className={cs.slotSubject}>{slot.subjects?.name}</div>
                                                            <div className={cs.slotClass}>{slot.classes?.name}</div>
                                                        </div>
                                                    ) : (
                                                        <div className={cs.slotEmpty}>—</div>
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                    {brk && (
                                        <tr className={cs.breakRow}>
                                            <td colSpan={WEEKDAYS.length + 1} className={cs.breakCell}>
                                                {brk.label}&nbsp;&nbsp;
                                                {brk.start_time.slice(0, 5)} – {brk.end_time.slice(0, 5)}
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

import { Fragment } from 'react'
