import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import s from '../../components/admin/PageShell.module.css'
import st from './Settings.module.css'

const EMPTY_CONFIG = { name: '' }
const EMPTY_PERIOD = { period: '', start_time: '', end_time: '', label: '' }
const EMPTY_BREAK = { after_period: '', start_time: '', end_time: '', label: '' }

export default function Settings() {
    const [configs, setConfigs] = useState([])
    const [selectedCfg, setSelectedCfg] = useState(null)
    const [periods, setPeriods] = useState([])
    const [breaks, setBreaks] = useState([])
    const [classes, setClasses] = useState([])
    const [checkedClasses, setCheckedClasses] = useState([])
    const [loading, setLoading] = useState(true)
    const [savingAssign, setSavingAssign] = useState(false)
    const [pageError, setPageError] = useState(null)
    const [successMsg, setSuccessMsg] = useState(null)

    const [cfgModal, setCfgModal] = useState(false)
    const [cfgForm, setCfgForm] = useState(EMPTY_CONFIG)
    const [editCfgId, setEditCfgId] = useState(null)
    const [savingCfg, setSavingCfg] = useState(false)
    const [cfgError, setCfgError] = useState(null)

    const [periodModal, setPeriodModal] = useState(false)
    const [periodForm, setPeriodForm] = useState(EMPTY_PERIOD)
    const [editPeriodId, setEditPeriodId] = useState(null)
    const [savingPeriod, setSavingPeriod] = useState(false)
    const [periodError, setPeriodError] = useState(null)

    const [breakModal, setBreakModal] = useState(false)
    const [breakForm, setBreakForm] = useState(EMPTY_BREAK)
    const [editBreakId, setEditBreakId] = useState(null)
    const [savingBreak, setSavingBreak] = useState(false)
    const [breakError, setBreakError] = useState(null)

    useEffect(() => { fetchAll() }, [])

    async function fetchAll() {
        console.log("Fetching all")
        setLoading(true)
        const [cfgRes, clsRes] = await Promise.all([
            supabase.from('school_config').select('*').order('created_at'),
            supabase.from('classes').select('id, name, config_id').order('grade').order('section'),
        ])
        const cfgs = cfgRes.data ?? []
        const cls = clsRes.data ?? []
        setConfigs(cfgs)
        setClasses(cls)
        if (cfgs.length > 0) await loadConfig(cfgs[0], cls)
        setLoading(false)
    }

    async function loadConfig(cfg, cls) {
        setSelectedCfg(cfg)
        const [pRes, bRes] = await Promise.all([
            supabase.from('period_config').select('*').eq('config_id', cfg.id).order('period'),
            supabase.from('break_config').select('*').eq('config_id', cfg.id).order('after_period'),
        ])
        setPeriods(pRes.data ?? [])
        setBreaks(bRes.data ?? [])
        const allCls = cls ?? classes
        setCheckedClasses(allCls.filter(c => c.config_id === cfg.id).map(c => c.id))
    }

    // ── Config ─────────────────────────────────────────────────

    function openAddConfig() {
        setCfgForm(EMPTY_CONFIG); setEditCfgId(null); setCfgError(null); setCfgModal(true)
    }

    function openEditConfig(cfg) {
        setCfgForm({ name: cfg.name }); setEditCfgId(cfg.id); setCfgError(null); setCfgModal(true)
    }

    async function saveConfig() {
        if (!cfgForm.name.trim()) { setCfgError('Name is required'); return }
        setSavingCfg(true); setCfgError(null)
        const { error } = editCfgId
            ? await supabase.from('school_config').update({ name: cfgForm.name.trim() }).eq('id', editCfgId)
            : await supabase.from('school_config').insert({ name: cfgForm.name.trim() })
        setSavingCfg(false)
        if (error) { setCfgError(error.message); return }
        setCfgModal(false); fetchAll()
    }

    async function deleteConfig(id) {
        if (!confirm('Delete this schedule? All its periods and breaks will be removed.')) return
        await supabase.from('school_config').delete().eq('id', id)
        fetchAll()
    }

    // ── Periods ────────────────────────────────────────────────

    function openAddPeriod() {
        const next = periods.length > 0 ? Math.max(...periods.map(p => p.period)) + 1 : 1
        setPeriodForm({ period: next, start_time: '', end_time: '', label: `Period ${next}` })
        setEditPeriodId(null); setPeriodError(null); setPeriodModal(true)
    }

    function openEditPeriod(p) {
        setPeriodForm({ period: p.period, start_time: p.start_time.slice(0, 5), end_time: p.end_time.slice(0, 5), label: p.label ?? '' })
        setEditPeriodId(p.id); setPeriodError(null); setPeriodModal(true)
    }

    async function savePeriod() {
        if (!periodForm.start_time || !periodForm.end_time) { setPeriodError('Start and end time are required'); return }
        if (periodForm.start_time >= periodForm.end_time) { setPeriodError('End time must be after start time'); return }
        setSavingPeriod(true); setPeriodError(null)
        const payload = {
            config_id: selectedCfg.id,
            period: parseInt(periodForm.period),
            start_time: periodForm.start_time,
            end_time: periodForm.end_time,
            label: periodForm.label || `Period ${periodForm.period}`,
        }
        const { error } = editPeriodId
            ? await supabase.from('period_config').update(payload).eq('id', editPeriodId)
            : await supabase.from('period_config').insert(payload)
        setSavingPeriod(false)
        if (error) {
            setPeriodError(error.code === '23505' ? 'This period number already exists' : error.message)
            return
        }
        setPeriodModal(false); loadConfig(selectedCfg, classes)
    }

    async function deletePeriod(id) {
        if (!confirm('Delete this period?')) return
        await supabase.from('period_config').delete().eq('id', id)
        loadConfig(selectedCfg, classes)
    }

    // ── Breaks ─────────────────────────────────────────────────

    function openAddBreak() {
        setBreakForm(EMPTY_BREAK); setEditBreakId(null); setBreakError(null); setBreakModal(true)
    }

    function openEditBreak(b) {
        setBreakForm({ after_period: b.after_period, start_time: b.start_time.slice(0, 5), end_time: b.end_time.slice(0, 5), label: b.label })
        setEditBreakId(b.id); setBreakError(null); setBreakModal(true)
    }

    async function saveBreak() {
        if (!breakForm.after_period || !breakForm.start_time || !breakForm.end_time || !breakForm.label.trim()) {
            setBreakError('All fields are required'); return
        }
        if (breakForm.start_time >= breakForm.end_time) { setBreakError('End time must be after start time'); return }
        setSavingBreak(true); setBreakError(null)
        const payload = {
            config_id: selectedCfg.id,
            after_period: parseInt(breakForm.after_period),
            start_time: breakForm.start_time,
            end_time: breakForm.end_time,
            label: breakForm.label.trim(),
        }
        const { error } = editBreakId
            ? await supabase.from('break_config').update(payload).eq('id', editBreakId)
            : await supabase.from('break_config').insert(payload)
        setSavingBreak(false)
        if (error) { setBreakError(error.message); return }
        setBreakModal(false); loadConfig(selectedCfg, classes)
    }

    async function deleteBreak(id) {
        if (!confirm('Delete this break?')) return
        await supabase.from('break_config').delete().eq('id', id)
        loadConfig(selectedCfg, classes)
    }

    // ── Class assignment ───────────────────────────────────────

    function toggleClass(id) {
        setCheckedClasses(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    function toggleAll() {
        setCheckedClasses(checkedClasses.length === classes.length ? [] : classes.map(c => c.id))
    }

    async function saveAssignments() {
        if (!selectedCfg) return
        setSavingAssign(true); setPageError(null); setSuccessMsg(null)

        const updates = classes.map(c => ({
            id: c.id,
            config_id: checkedClasses.includes(c.id) ? selectedCfg.id : null,
        }))
        let saveError = null
        for (const u of updates) {
            const { error } = await supabase.from('classes').update({ config_id: u.config_id }).eq('id', u.id)
            if (error) { saveError = error; break }
        }

        setSavingAssign(false)
        if (saveError) { setPageError(saveError.message); return }
        setSuccessMsg(`Schedule applied to ${checkedClasses.length} class${checkedClasses.length !== 1 ? 'es' : ''}`)
        fetchAll()
        setTimeout(() => setSuccessMsg(null), 3000)
    }

    // ── Render ─────────────────────────────────────────────────

    if (loading) return <div className={s.loading}>Loading settings...</div>

    return (
        <div className={st.page}>
            {pageError && <div className={s.error}>{pageError}</div>}
            {successMsg && <div className={st.success}>{successMsg}</div>}

            <div className={st.layout}>

                {/* Left — schedule list */}
                <div className={st.left}>
                    <div className={st.panelHeader}>
                        <span className={st.panelTitle}>Schedules</span>
                        <button className={s.btnPrimary} onClick={openAddConfig}>+ New</button>
                    </div>
                    {configs.map(cfg => (
                        <div
                            key={cfg.id}
                            className={`${st.cfgItem} ${selectedCfg?.id === cfg.id ? st.cfgActive : ''}`}
                            onClick={() => loadConfig(cfg, classes)}
                        >
                            <span className={st.cfgName}>{cfg.name}</span>
                            <div className={st.cfgBtns} onClick={e => e.stopPropagation()}>
                                <button className={`${s.btnGhost} ${s.btnSm}`} onClick={() => openEditConfig(cfg)}>Edit</button>
                                <button className={`${s.btnDanger} ${s.btnSm}`} onClick={() => deleteConfig(cfg.id)}>Delete</button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right — detail */}
                {selectedCfg ? (
                    <div className={st.right}>
                        <div className={st.detailName}>{selectedCfg.name}</div>

                        {/* Periods table */}
                        <div className={st.block}>
                            <div className={st.blockHeader}>
                                <span className={st.blockTitle}>Periods</span>
                                <button className={s.btnPrimary} onClick={openAddPeriod}>+ Add Period</button>
                            </div>
                            <div className={s.tableWrap}>
                                <table className={s.table}>
                                    <thead>
                                        <tr>
                                            <th>No.</th><th>Label</th><th>Start</th><th>End</th><th>Duration</th><th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {periods.length === 0 ? (
                                            <tr><td colSpan={6}><div className={s.empty}><div className={s.emptyText}>No periods yet.</div></div></td></tr>
                                        ) : periods.map(p => (
                                            <tr key={p.id}>
                                                <td><span className={`${s.badge} ${s.badgeBlue}`}>P{p.period}</span></td>
                                                <td>{p.label}</td>
                                                <td>{p.start_time.slice(0, 5)}</td>
                                                <td>{p.end_time.slice(0, 5)}</td>
                                                <td><span className={`${s.badge} ${s.badgeGray}`}>{diffMins(p.start_time, p.end_time)} min</span></td>
                                                <td>
                                                    <div className={s.actions}>
                                                        <button className={`${s.btnGhost} ${s.btnSm}`} onClick={() => openEditPeriod(p)}>Edit</button>
                                                        <button className={`${s.btnDanger} ${s.btnSm}`} onClick={() => deletePeriod(p.id)}>Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Breaks table */}
                        <div className={st.block}>
                            <div className={st.blockHeader}>
                                <span className={st.blockTitle}>Breaks</span>
                                <button className={s.btnPrimary} onClick={openAddBreak}>+ Add Break</button>
                            </div>
                            <div className={s.tableWrap}>
                                <table className={s.table}>
                                    <thead>
                                        <tr>
                                            <th>After Period</th><th>Label</th><th>Start</th><th>End</th><th>Duration</th><th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {breaks.length === 0 ? (
                                            <tr><td colSpan={6}><div className={s.empty}><div className={s.emptyText}>No breaks yet.</div></div></td></tr>
                                        ) : breaks.map(b => (
                                            <tr key={b.id}>
                                                <td><span className={`${s.badge} ${s.badgeGray}`}>After P{b.after_period}</span></td>
                                                <td>{b.label}</td>
                                                <td>{b.start_time.slice(0, 5)}</td>
                                                <td>{b.end_time.slice(0, 5)}</td>
                                                <td><span className={`${s.badge} ${s.badgeGray}`}>{diffMins(b.start_time, b.end_time)} min</span></td>
                                                <td>
                                                    <div className={s.actions}>
                                                        <button className={`${s.btnGhost} ${s.btnSm}`} onClick={() => openEditBreak(b)}>Edit</button>
                                                        <button className={`${s.btnDanger} ${s.btnSm}`} onClick={() => deleteBreak(b.id)}>Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Apply to classes */}
                        <div className={st.block}>
                            <div className={st.blockHeader}>
                                <span className={st.blockTitle}>Apply to Classes</span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className={s.btnGhost} onClick={toggleAll}>
                                        {checkedClasses.length === classes.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <button className={s.btnPrimary} onClick={saveAssignments} disabled={savingAssign}>
                                        {savingAssign ? 'Saving...' : 'Apply Schedule'}
                                    </button>
                                </div>
                            </div>
                            <div className={st.classGrid}>
                                {classes.map(cls => (
                                    <label key={cls.id} className={st.classCheck}>
                                        <input
                                            type="checkbox"
                                            checked={checkedClasses.includes(cls.id)}
                                            onChange={() => toggleClass(cls.id)}
                                        />
                                        <span className={st.checkLabel}>{cls.name}</span>
                                        {cls.config_id && cls.config_id !== selectedCfg.id && (
                                            <span className={st.otherBadge}>
                                                {configs.find(c => c.id === cls.config_id)?.name ?? 'other'}
                                            </span>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className={st.noConfig}>No schedules yet. Create one.</div>
                )}
            </div>

            {/* Config modal */}
            {cfgModal && (
                <div className={s.overlay} onClick={e => e.target === e.currentTarget && setCfgModal(false)}>
                    <div className={s.modal}>
                        <h2 className={s.modalTitle}>{editCfgId ? 'Edit Schedule' : 'New Schedule'}</h2>
                        {cfgError && <div className={s.error}>{cfgError}</div>}
                        <div className={s.field}>
                            <label className={s.label}>Schedule Name</label>
                            <input className={s.input} value={cfgForm.name} onChange={e => setCfgForm({ name: e.target.value })} placeholder="e.g. Primary Schedule" />
                        </div>
                        <div className={s.modalFooter}>
                            <button className={s.btnGhost} onClick={() => setCfgModal(false)}>Cancel</button>
                            <button className={s.btnPrimary} onClick={saveConfig} disabled={savingCfg}>{savingCfg ? 'Saving...' : editCfgId ? 'Update' : 'Create'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Period modal */}
            {periodModal && (
                <div className={s.overlay} onClick={e => e.target === e.currentTarget && setPeriodModal(false)}>
                    <div className={s.modal}>
                        <h2 className={s.modalTitle}>{editPeriodId ? 'Edit Period' : 'Add Period'}</h2>
                        {periodError && <div className={s.error}>{periodError}</div>}
                        <div className={s.grid2}>
                            <div className={s.field}>
                                <label className={s.label}>Period Number</label>
                                <input className={s.input} type="number" min="1" value={periodForm.period} onChange={e => setPeriodForm(f => ({ ...f, period: e.target.value }))} />
                            </div>
                            <div className={s.field}>
                                <label className={s.label}>Label</label>
                                <input className={s.input} value={periodForm.label} onChange={e => setPeriodForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Period 1" />
                            </div>
                            <div className={s.field}>
                                <label className={s.label}>Start Time</label>
                                <input className={s.input} type="time" value={periodForm.start_time} onChange={e => setPeriodForm(f => ({ ...f, start_time: e.target.value }))} />
                            </div>
                            <div className={s.field}>
                                <label className={s.label}>End Time</label>
                                <input className={s.input} type="time" value={periodForm.end_time} onChange={e => setPeriodForm(f => ({ ...f, end_time: e.target.value }))} />
                            </div>
                        </div>
                        <div className={s.modalFooter}>
                            <button className={s.btnGhost} onClick={() => setPeriodModal(false)}>Cancel</button>
                            <button className={s.btnPrimary} onClick={savePeriod} disabled={savingPeriod}>{savingPeriod ? 'Saving...' : editPeriodId ? 'Update' : 'Add'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Break modal */}
            {breakModal && (
                <div className={s.overlay} onClick={e => e.target === e.currentTarget && setBreakModal(false)}>
                    <div className={s.modal}>
                        <h2 className={s.modalTitle}>{editBreakId ? 'Edit Break' : 'Add Break'}</h2>
                        {breakError && <div className={s.error}>{breakError}</div>}
                        <div className={s.grid2}>
                            <div className={s.field}>
                                <label className={s.label}>After Period</label>
                                <input className={s.input} type="number" min="1" value={breakForm.after_period} onChange={e => setBreakForm(f => ({ ...f, after_period: e.target.value }))} placeholder="e.g. 2" />
                            </div>
                            <div className={s.field}>
                                <label className={s.label}>Break Label</label>
                                <input className={s.input} value={breakForm.label} onChange={e => setBreakForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Lunch Break" />
                            </div>
                            <div className={s.field}>
                                <label className={s.label}>Start Time</label>
                                <input className={s.input} type="time" value={breakForm.start_time} onChange={e => setBreakForm(f => ({ ...f, start_time: e.target.value }))} />
                            </div>
                            <div className={s.field}>
                                <label className={s.label}>End Time</label>
                                <input className={s.input} type="time" value={breakForm.end_time} onChange={e => setBreakForm(f => ({ ...f, end_time: e.target.value }))} />
                            </div>
                        </div>
                        <div className={s.modalFooter}>
                            <button className={s.btnGhost} onClick={() => setBreakModal(false)}>Cancel</button>
                            <button className={s.btnPrimary} onClick={saveBreak} disabled={savingBreak}>{savingBreak ? 'Saving...' : editBreakId ? 'Update' : 'Add'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function diffMins(start, end) {
    if (!start || !end) return 0
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    return (eh * 60 + em) - (sh * 60 + sm)
}