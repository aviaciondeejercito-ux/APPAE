import React, { useState, useEffect, useCallback } from 'react';
import { getActiveOperations, createEvent, updateEvent, deleteEvent, getAircrafts } from '../services/api';
import { AEROPUERTOS } from '../constants/TacticalData';
import Swal from 'sweetalert2';

const CargaTactica = () => {
    const getUser = () => {
        try {
            const u = localStorage.getItem('user');
            return u ? JSON.parse(u) : {};
        } catch { return {}; }
    };

    const user = getUser();
    const isMando = user.role === 'admin' || user.role === 'OTO' || 
                    ['boss', 'director', 'otoae'].includes(user.role?.toLowerCase()) ||
                    !user.role;

    const [misiones, setMisiones] = useState([]);
    const [flota, setFlota] = useState([]); 
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showDestino, setShowDestino] = useState(false);

    const initialState = {
        title: '', 
        elemento: user.elemento || '', 
        notas: '', 
        sda: '', 
        matricula: '', 
        aeronaveId: '',
        locNombre: '',
        latG: 0, latM: 0, latS: 0, latDir: 'S',
        lngG: 0, lngM: 0, lngS: 0, lngDir: 'W',
        dNombre: '',
        dLatG: 0, dLatM: 0, dLatS: 0, dLatDir: 'S',
        dLngG: 0, dLngM: 0, dLngS: 0, dLngDir: 'W'
    };
    const [form, setForm] = useState(initialState);

    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            const [evRes, airRes] = await Promise.all([getActiveOperations(), getAircrafts()]);
            const events = Array.isArray(evRes) ? evRes : evRes.data || [];
            const aircrafts = Array.isArray(airRes) ? airRes : airRes.data || [];

            setMisiones(events.filter(ev => ev.isRealTime && (isMando || ev.elemento === user.elemento)));
            
            const filtradas = aircrafts.filter(a => {
                const enServicio = a.estado === 'E/S';
                const tieneAcceso = isMando || (user.elemento && a.unidad === user.elemento);
                return enServicio && tieneAcceso;
            });
            setFlota(filtradas);
        } catch (e) { 
            console.error("Error en la carga de datos:", e); 
        }
        setLoading(false);
    }, [isMando, user.elemento]);

    useEffect(() => {
        cargarDatos();
        const interval = setInterval(cargarDatos, 15000);
        return () => clearInterval(interval);
    }, [cargarDatos]);

    const toDec = (g, m, s, dir) => {
        const deg = Math.abs(parseFloat(g) || 0);
        const min = (parseFloat(m) || 0) / 60;
        const sec = (parseFloat(s) || 0) / 3600;
        let dec = deg + min + sec;
        if (dir === 'S' || dir === 'W') dec = dec * -1;
        return parseFloat(dec.toFixed(6));
    };

    const fromDec = (dec, type) => {
        const abs = Math.abs(dec || 0);
        const g = Math.floor(abs);
        const m = Math.floor((abs - g) * 60);
        const s = Math.round((abs - g - m / 60) * 3600);
        return { g, m, s, dir: type === 'lat' ? (dec < 0 ? 'S' : 'N') : (dec < 0 ? 'W' : 'E') };
    };

    const handleAptSelect = (e, target) => {
        const nombreSel = e.target.value;
        const apt = AEROPUERTOS.find(p => p.nombre === nombreSel);
        
        if (target === 'pos') {
            if (!apt) {
                setForm(prev => ({ ...prev, locNombre: '' }));
                return;
            }
            const la = fromDec(apt.lat, 'lat');
            const lo = fromDec(apt.lng, 'lng');
            setForm(prev => ({
                ...prev, locNombre: apt.nombre,
                latG: la.g, latM: la.m, latS: la.s, latDir: la.dir,
                lngG: lo.g, lngM: lo.m, lngS: lo.s, lngDir: lo.dir
            }));
        } else {
            if (!apt) {
                setForm(prev => ({ ...prev, dNombre: '' }));
                return;
            }
            const la = fromDec(apt.lat, 'lat');
            const lo = fromDec(apt.lng, 'lng');
            setForm(prev => ({
                ...prev, dNombre: apt.nombre,
                dLatG: la.g, dLatM: la.m, dLatS: la.s, dLatDir: la.dir,
                dLngG: lo.g, dLngM: lo.m, dLngS: lo.s, dLngDir: lo.dir
            }));
        }
    };

    const handleEdit = (m) => {
        const pos = m.ubicacion?.salida || { lat: m.lat, lng: m.lng, nombre: m.ubicacion?.nombre };
        const des = m.ubicacion?.llegada;
        const pLa = fromDec(pos.lat, 'lat');
        const pLo = fromDec(pos.lng, 'lng');
        
        let desData = {};
        if (des && (des.lat !== 0 || des.lng !== 0)) {
            const dLa = fromDec(des.lat, 'lat');
            const dLo = fromDec(des.lng, 'lng');
            desData = { 
                dNombre: des.nombre || '', 
                dLatG: dLa.g, dLatM: dLa.m, dLatS: dLa.s, dLatDir: dLa.dir, 
                dLngG: dLo.g, dLngM: dLo.m, dLngS: dLo.s, dLngDir: dLo.dir 
            };
            setShowDestino(true);
        } else {
            setShowDestino(false);
        }

        setEditingId(m._id);
        setForm({ 
            ...initialState, 
            title: m.title, 
            elemento: m.elemento, 
            notas: m.notes || m.notasMarginales || '', 
            sda: m.misionDetalle?.aeronave || m.aeronave, 
            matricula: m.misionDetalle?.matricula || m.matricula, 
            aeronaveId: 'EDIT', 
            latG: pLa.g, latM: pLa.m, latS: pLa.s, latDir: pLa.dir, 
            lngG: pLo.g, lngM: pLo.m, lngS: pLo.s, lngDir: pLo.dir, 
            locNombre: pos.nombre || 'POSICIÓN MANUAL',
            ...desData 
        });
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // 1. OBTENEMOS LOS VALORES DIRECTOS DEL FORMULARIO
        const latSalida = toDec(form.latG, form.latM, form.latS, form.latDir);
        const lngSalida = toDec(form.lngG, form.lngM, form.lngS, form.lngDir);
        
        // 2. SI SHOWDESTINO ES FALSE, USAMOS LOS MISMOS DE SALIDA
        const latLlegada = showDestino ? toDec(form.dLatG, form.dLatM, form.dLatS, form.dLatDir) : latSalida;
        const lngLlegada = showDestino ? toDec(form.dLngG, form.dLngM, form.dLngS, form.dLngDir) : lngSalida;
        
        const icono = form.sda?.includes('AE') ? 'ala_fija' : 'ala_rotativa';

        const payload = {
            title: form.title.toUpperCase(),
            elemento: form.elemento,
            notes: form.notas.toUpperCase(),
            isRealTime: true,
            status: 'operativo',
            lat: latSalida, 
            lng: lngSalida,
            ubicacion: { 
                nombre: (form.locNombre || "POSICIÓN MANUAL").toUpperCase(), 
                salida: { 
                    nombre: (form.locNombre || "ORIGEN").toUpperCase(), 
                    lat: latSalida, 
                    lng: lngSalida 
                },
                llegada: { 
                    nombre: showDestino ? (form.dNombre || "DESTINO").toUpperCase() : (form.locNombre || "ORIGEN").toUpperCase(), 
                    lat: latLlegada, 
                    lng: lngLlegada 
                },
                lat: latSalida,
                lng: lngSalida
            },
            misionDetalle: { 
                aeronave: form.sda, 
                matricula: form.matricula, 
                tipoIcono: icono, 
                isRealTime: true, 
                lat: latSalida, 
                lng: lngSalida 
            }
        };

        try {
            editingId ? await updateEvent(editingId, payload) : await createEvent(payload);
            Swal.fire('ÉXITO', editingId ? 'Vector actualizado' : 'Operación lanzada', 'success');
            setForm(initialState); 
            setEditingId(null); 
            setShowDestino(false); 
            cargarDatos();
        } catch (err) { 
            Swal.fire('Error', 'Falla en el envío del despacho', 'error'); 
        }
    };

    const handleFinalizar = async (id) => {
        const res = await Swal.fire({ title: '¿Finalizar?', text: "Se eliminará el rastro del radar táctico", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ARRIBO / FINALIZAR' });
        if (res.isConfirmed) { try { await deleteEvent(id); cargarDatos(); } catch { Swal.fire('Error', 'Sin permisos para finalizar', 'error'); } }
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.card}>
                    <h2 style={styles.headerTitle}>{editingId ? '📍 RE-POSICIONAR' : '⚡ DESPACHO TÁCTICO'}</h2>
                    <form onSubmit={handleSubmit}>
                        <input style={styles.input} value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="INDICATIVO DE VUELO" required />
                        
                        <div style={styles.formGrid}>
                            <select 
                                style={{...styles.input, gridColumn: 'span 2'}} 
                                value={form.aeronaveId} 
                                onChange={e => {
                                    const a = flota.find(x => x._id === e.target.value);
                                    if(a) setForm({ ...form, aeronaveId: a._id, sda: a.sda, matricula: a.matricula, elemento: a.unidad });
                                }} 
                                required 
                                disabled={!!editingId}
                            >
                                <option value="">-- Seleccionar Aeronave (E/S) --</option>
                                {editingId ? (
                                    <option value="EDIT">{form.sda} - {form.matricula}</option>
                                ) : (
                                    flota.map(a => (
                                        <option key={a._id} value={a._id}>{a.sda} - {a.matricula} ({a.unidad})</option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div style={{marginBottom: '15px', padding: '10px', backgroundColor: '#363636', borderRadius: '4px', borderLeft: '4px solid #ffd700'}}>
                            <span style={{fontSize: '0.75rem', color: '#aaa', display: 'block'}}>UNIDAD RESPONSABLE:</span>
                            <span style={{color: '#ffd700', fontWeight: 'bold'}}>{form.elemento || '---'}</span>
                        </div>

                        <div style={styles.geoBox}>
                            <label style={styles.label}>POSICIÓN / ORIGEN</label>
                            <select onChange={e => handleAptSelect(e, 'pos')} style={styles.input} value={form.locNombre}>
                                <option value="">Seleccionar Aeródromo...</option>
                                {AEROPUERTOS.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                            </select>
                            <div style={styles.row}>
                                <input type="number" step="any" style={styles.inputTriple} value={form.latG} onChange={e => setForm({...form, latG: e.target.value})} placeholder="G" />
                                <input type="number" step="any" style={styles.inputTriple} value={form.latM} onChange={e => setForm({...form, latM: e.target.value})} placeholder="M" />
                                <input type="number" step="any" style={styles.inputTriple} value={form.latS} onChange={e => setForm({...form, latS: e.target.value})} placeholder="S" />
                                <select style={styles.inputShort} value={form.latDir} onChange={e => setForm({...form, latDir: e.target.value})}>
                                    <option>S</option><option>N</option>
                                </select>
                            </div>
                            <div style={{...styles.row, marginTop: '5px'}}>
                                <input type="number" step="any" style={styles.inputTriple} value={form.lngG} onChange={e => setForm({...form, lngG: e.target.value})} placeholder="G" />
                                <input type="number" step="any" style={styles.inputTriple} value={form.lngM} onChange={e => setForm({...form, lngM: e.target.value})} placeholder="M" />
                                <input type="number" step="any" style={styles.inputTriple} value={form.lngS} onChange={e => setForm({...form, lngS: e.target.value})} placeholder="S" />
                                <select style={styles.inputShort} value={form.lngDir} onChange={e => setForm({...form, lngDir: e.target.value})}>
                                    <option>W</option><option>E</option>
                                </select>
                            </div>
                        </div>

                        <button type="button" onClick={() => setShowDestino(!showDestino)} style={styles.btnDestino}>
                            {showDestino ? '❌ QUITAR DESTINO' : '➕ AGREGAR DESTINO'}
                        </button>

                        {showDestino && (
                            <div style={styles.geoBox}>
                                <label style={styles.label}>DESTINO PREVISTO</label>
                                <select onChange={e => handleAptSelect(e, 'des')} style={styles.input} value={form.dNombre}>
                                    <option value="">Seleccionar Aeródromo...</option>
                                    {AEROPUERTOS.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                                </select>
                                <div style={styles.row}>
                                    <input type="number" step="any" style={styles.inputTriple} value={form.dLatG} onChange={e => setForm({...form, dLatG: e.target.value})} placeholder="G" />
                                    <input type="number" step="any" style={styles.inputTriple} value={form.dLatM} onChange={e => setForm({...form, dLatM: e.target.value})} placeholder="M" />
                                    <input type="number" step="any" style={styles.inputTriple} value={form.dLatS} onChange={e => setForm({...form, dLatS: e.target.value})} placeholder="S" />
                                    <select style={styles.inputShort} value={form.dLatDir} onChange={e => setForm({...form, dLatDir: e.target.value})}>
                                        <option>S</option><option>N</option>
                                    </select>
                                </div>
                                <div style={{...styles.row, marginTop: '5px'}}>
                                    <input type="number" step="any" style={styles.inputTriple} value={form.dLngG} onChange={e => setForm({...form, dLngG: e.target.value})} placeholder="G" />
                                    <input type="number" step="any" style={styles.inputTriple} value={form.dLngM} onChange={e => setForm({...form, dLngM: e.target.value})} placeholder="M" />
                                    <input type="number" step="any" style={styles.inputTriple} value={form.dLngS} onChange={e => setForm({...form, dLngS: e.target.value})} placeholder="S" />
                                    <select style={styles.inputShort} value={form.dLngDir} onChange={e => setForm({...form, dLngDir: e.target.value})}>
                                        <option>W</option><option>E</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <textarea style={styles.textarea} value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} placeholder="NOTAS / PERSONAL" required />

                        <button type="submit" style={editingId ? styles.btnUpdate : styles.btn} disabled={flota.length === 0 && !editingId}>
                            {editingId ? 'ACTUALIZAR POSICIÓN' : 'LANZAR OPERACIÓN'}
                        </button>
                    </form>
                </div>

                <div style={styles.logCard}>
                    <div style={styles.logHeader}>
                        <span>📡 RADAR TÁCTICO</span>
                        <button onClick={cargarDatos} style={styles.btnRefresh}>REFRESCAR</button>
                    </div>
                    <div style={styles.scrollArea}>
                        {misiones.length === 0 ? <p style={styles.emptyMsg}>No hay operaciones</p> : 
                            misiones.map(m => (
                                <div key={m._id} style={styles.misionItem}>
                                    <div style={styles.misionHeader}>
                                        <span style={styles.badge}>{m.misionDetalle?.aeronave}</span> 
                                        <span style={styles.matriculaText}>{m.misionDetalle?.matricula}</span>
                                    </div>
                                    <div style={styles.misionTitle}>{m.title}</div>
                                    <div style={styles.btnRow}>
                                        <button onClick={() => handleEdit(m)} style={styles.btnSmall}>EDITAR</button>
                                        <button onClick={() => handleFinalizar(m._id)} style={styles.btnSmallRed}>ARRIBO</button>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    page: { padding: '20px', backgroundColor: '#1a1a1a', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' },
    container: { display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px', maxWidth: '1200px', margin: '0 auto' },
    card: { backgroundColor: '#2d2d2d', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' },
    logCard: { backgroundColor: '#2d2d2d', borderRadius: '8px', display: 'flex', flexDirection: 'column', height: 'fit-content' },
    headerTitle: { margin: '0 0 20px 0', fontSize: '1.5rem', color: '#ffd700', borderBottom: '1px solid #444', paddingBottom: '10px' },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' },
    input: { width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#3d3d3d', color: '#fff', boxSizing: 'border-box' },
    inputTriple: { width: '28%', padding: '10px', marginRight: '2%', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#3d3d3d', color: '#fff' },
    inputShort: { width: '12%', padding: '10px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#3d3d3d', color: '#fff' },
    textarea: { width: '100%', height: '80px', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#3d3d3d', color: '#fff', resize: 'none', boxSizing: 'border-box' },
    geoBox: { backgroundColor: '#363636', padding: '10px', borderRadius: '4px', marginBottom: '10px' },
    label: { fontSize: '0.8rem', color: '#aaa', display: 'block', marginBottom: '5px' },
    row: { display: 'flex', alignItems: 'center' },
    btn: { width: '100%', padding: '12px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
    btnUpdate: { width: '100%', padding: '12px', backgroundColor: '#0277bd', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
    btnDestino: { width: '100%', padding: '8px', backgroundColor: '#444', color: '#ddd', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '10px', fontSize: '0.8rem' },
    logHeader: { padding: '15px', backgroundColor: '#1e1e1e', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.9rem' },
    scrollArea: { maxHeight: '600px', overflowY: 'auto', padding: '10px' },
    misionItem: { backgroundColor: '#3d3d3d', padding: '12px', borderRadius: '6px', marginBottom: '10px', borderLeft: '4px solid #ffd700' },
    misionHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px' },
    badge: { backgroundColor: '#ffd700', color: '#000', padding: '2px 6px', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 'bold' },
    matriculaText: { color: '#00e5ff', fontWeight: 'bold', fontSize: '0.9rem' },
    misionTitle: { fontSize: '1.1rem', fontWeight: 'bold', margin: '5px 0' },
    btnRow: { display: 'flex', gap: '5px', marginTop: '10px' },
    btnSmall: { flex: 1, padding: '6px', fontSize: '0.75rem', backgroundColor: '#555', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' },
    btnSmallRed: { flex: 1, padding: '6px', fontSize: '0.75rem', backgroundColor: '#c62828', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' },
    btnRefresh: { padding: '2px 8px', fontSize: '0.7rem', backgroundColor: '#0277bd', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' },
    emptyMsg: { textAlign: 'center', color: '#888', marginTop: '20px', fontSize: '0.9rem' }
};

export default CargaTactica;