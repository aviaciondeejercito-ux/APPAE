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
    const userElemento = localStorage.getItem('elemento') || user.elemento || "SIN UNIDAD";

    const isMando = user.role === 'admin' || user.role === 'OTO' || 
                    ['boss', 'director', 'otoae'].includes(user.role?.toLowerCase()) ||
                    !user.role;

    const [misiones, setMisiones] = useState([]);
    const [aeronaves, setAeronaves] = useState([]); 
    const [loading, setLoading] = useState(false);
    
    // Estados del Formulario
    const [editingId, setEditingId] = useState(null); 
    const [title, setTitle] = useState('');
    const [selectedMatricula, setSelectedMatricula] = useState('');
    const [notasMarginales, setNotasMarginales] = useState('');

    const [coordOri, setCoordOri] = useState({ latG: '', latM: '', latS: '', lngG: '', lngM: '', lngS: '', nombre: '' });
    const [coordDes, setCoordDes] = useState({ latG: '', latM: '', latS: '', lngG: '', lngM: '', lngS: '', nombre: '' });

    const fromDecimal = (decimal) => {
        if (!decimal) return { g: '', m: '', s: '' };
        const absVal = Math.abs(decimal);
        const g = Math.floor(absVal);
        const m = Math.floor((absVal - g) * 60);
        const s = Math.round((absVal - g - m / 60) * 3600);
        return { g, m, s };
    };

    const handleSelectLugar = (nombreAero, tipo) => {
        if (!nombreAero) return;
        const aero = AEROPUERTOS.find(a => a.nombre === nombreAero);
        const setter = tipo === 'origen' ? setCoordOri : setCoordDes;

        if (aero) {
            const latGMS = fromDecimal(aero.lat);
            const lngGMS = fromDecimal(aero.lng);
            setter({
                nombre: aero.nombre,
                latG: latGMS.g, latM: latGMS.m, latS: latGMS.s,
                lngG: lngGMS.g, lngM: lngGMS.m, lngS: lngGMS.s
            });
        }
    };

    const toDecimal = (g, m, s) => {
        if (g === '' || g === null) return null;
        const dec = Math.abs(parseFloat(g)) + (parseFloat(m || 0) / 60) + (parseFloat(s || 0) / 3600);
        return dec * -1; 
    };

    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            const evRes = await getActiveOperations();
            const events = Array.isArray(evRes) ? evRes : [];
            
            // MODIFICACIÓN: Filtro inclusivo para asegurar que se vean los vuelos de CargaTactica
            const filtered = events.filter(ev => {
                const perteneceAUnidad = isMando || ev.elemento === userElemento;
                // Mostramos si es RealTime (vuelo activo) o si tiene tipoApoyo VUELO
                const esVueloValido = ev.isRealTime === true || ev.tipoApoyo === 'VUELO' || ev.tipo === 'operativo';
                return perteneceAUnidad && esVueloValido;
            });

            setMisiones(filtered);

            const airRes = await getAircrafts();
            const dataAeronaves = Array.isArray(airRes) ? airRes : airRes.data || [];
            setAeronaves(dataAeronaves);
        } catch (e) { 
            console.error("Error en la carga de datos:", e); 
        }
        setLoading(false);
    }, [isMando, userElemento]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    const prepararEdicion = (m) => {
        setEditingId(m._id);
        setTitle(m.title);
        setSelectedMatricula(m.matricula);
        setNotasMarginales(m.notasMarginales || '');
        
        const latOri = fromDecimal(m.origen?.lat);
        const lngOri = fromDecimal(m.origen?.lng);
        setCoordOri({
            nombre: m.origen?.nombre || '',
            latG: latOri.g, latM: latOri.m, latS: latOri.s,
            lngG: lngOri.g, lngM: lngOri.m, lngS: lngOri.s
        });

        const latDes = fromDecimal(m.destino?.lat);
        const lngDes = fromDecimal(m.destino?.lng);
        setCoordDes({
            nombre: m.destino?.nombre || '',
            latG: latDes.g, latM: latDes.m, latS: latDes.s,
            lngG: lngDes.g, lngM: lngDes.m, lngS: lngDes.s
        });
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setEditingId(null);
        setTitle('');
        setSelectedMatricula('');
        setNotasMarginales('');
        setCoordOri({ latG: '', latM: '', latS: '', lngG: '', lngM: '', lngS: '', nombre: '' });
        setCoordDes({ latG: '', latM: '', latS: '', lngG: '', lngM: '', lngS: '', nombre: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const aeroInfo = aeronaves.find(a => a.matricula === selectedMatricula);

        if (!title.trim() || !selectedMatricula) {
            Swal.fire('Atención', 'Complete los datos básicos', 'warning');
            return;
        }

        const payload = {
            title: title.toUpperCase().trim(),
            elemento: aeroInfo ? (aeroInfo.unidad || aeroInfo.elemento) : userElemento,
            isRealTime: true,
            status: 'operativo', 
            type: 'operativo',
            tipoApoyo: 'VUELO',
            matricula: selectedMatricula,
            aeronave: aeroInfo ? aeroInfo.sda : '',
            tipoIcono: aeroInfo ? aeroInfo.tipoIcono : 'ala_rotativa',
            notasMarginales: notasMarginales.toUpperCase().trim(),
            origen: {
                nombre: (coordOri.nombre || "ORIGEN").toUpperCase(),
                lat: toDecimal(coordOri.latG, coordOri.latM, coordOri.latS),
                lng: toDecimal(coordOri.lngG, coordOri.lngM, coordOri.lngS)
            },
            destino: {
                nombre: (coordDes.nombre || "DESTINO").toUpperCase(),
                lat: toDecimal(coordDes.latG, coordDes.latM, coordDes.latS),
                lng: toDecimal(coordDes.lngG, coordDes.lngM, coordDes.lngS)
            },
            start: new Date().toISOString()
        };

        try {
            if (editingId) {
                await updateEvent(editingId, payload);
                Swal.fire({ title: 'VUELO ACTUALIZADO', icon: 'success', timer: 1500, showConfirmButton: false, background: '#1a1a1a', color: '#fff' });
            } else {
                await createEvent(payload);
                Swal.fire({ title: 'OPERACIÓN LANZADA', icon: 'success', timer: 1500, showConfirmButton: false, background: '#1a1a1a', color: '#fff' });
            }
            resetForm();
            cargarDatos();
        } catch (err) {
            Swal.fire('Error', 'No se pudo procesar la operación.', 'error');
        }
    };

    const handleFinalizar = async (id) => {
        const res = await Swal.fire({ 
            title: '¿Arribo de aeronave?', 
            text: "Se finalizará la operación en el radar",
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonColor: '#c62828', 
            confirmButtonText: 'CONFIRMAR ARRIBO',
            background: '#1a1a1a',
            color: '#fff'
        });

        if (res.isConfirmed) { 
            try { 
                await deleteEvent(id); 
                cargarDatos(); 
            } catch { 
                Swal.fire('Error', 'No se pudo finalizar la operación', 'error'); 
            } 
        }
    };

    const InputGMS = ({ label, values, onChange }) => (
        <div style={styles.gmsContainer}>
            <label style={styles.labelSub}>{label}</label>
            <div style={styles.gmsRow}>
                <input style={styles.inputGMS} type="number" placeholder="G" value={values.g} onChange={e => onChange('G', e.target.value)} />
                <input style={styles.inputGMS} type="number" placeholder="M" value={values.m} onChange={e => onChange('M', e.target.value)} />
                <input style={styles.inputGMS} type="number" placeholder="S" value={values.s} onChange={e => onChange('S', e.target.value)} />
            </div>
        </div>
    );

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.headerDecoration}></div>
                    <h2 style={styles.headerTitle}>{editingId ? '📝 EDITAR VUELO' : '🛩️ CARGA DE VUELOS'}</h2>
                    <p style={styles.subHeader}>OPERACIONES DE VUELO - {userElemento}</p>
                    
                    <form onSubmit={handleSubmit}>
                        <div style={styles.fieldGrid}>
                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>INDICATIVO (CALLSIGN)</label>
                                <input style={styles.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="EJ: HALCON 1" required />
                            </div>

                            <div style={styles.fieldGroup}>
                                <label style={styles.label}>AERONAVE</label>
                                <select style={styles.select} value={selectedMatricula} onChange={e => setSelectedMatricula(e.target.value)} required>
                                    <option value="">-- SELECCIONE --</option>
                                    {aeronaves.filter(a => a.estado === 'E/S' || a.matricula === selectedMatricula).map(a => (
                                        <option key={a._id} value={a.matricula}>{a.matricula} | {a.sda}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={styles.coordGrid}>
                            <div style={styles.coordBox}>
                                <label style={styles.labelBlue}>PUNTO DE ORIGEN</label>
                                <div style={{marginBottom: '10px'}}>
                                    <select 
                                        style={styles.selectSmall} 
                                        onChange={(e) => handleSelectLugar(e.target.value, 'origen')}
                                        value={AEROPUERTOS.some(a => a.nombre === coordOri.nombre) ? coordOri.nombre : ""}
                                    >
                                        <option value="">-- AERÓDROMO PRECARGADO --</option>
                                        {AEROPUERTOS.map(a => <option key={a.nombre} value={a.nombre}>{a.nombre}</option>)}
                                    </select>
                                    <input 
                                        style={styles.inputSmall} 
                                        placeholder="O ESCRIBIR NOMBRE PERSONALIZADO" 
                                        value={coordOri.nombre} 
                                        onChange={(e) => setCoordOri({...coordOri, nombre: e.target.value.toUpperCase()})} 
                                    />
                                </div>
                                <div style={styles.gmsWrapper}>
                                    <InputGMS label="LATITUD (S)" values={{g: coordOri.latG, m: coordOri.latM, s: coordOri.latS}} onChange={(f, v) => setCoordOri({...coordOri, [`lat${f}`]: v})} />
                                    <InputGMS label="LONGITUD (W)" values={{g: coordOri.lngG, m: coordOri.lngM, s: coordOri.lngS}} onChange={(f, v) => setCoordOri({...coordOri, [`lng${f}`]: v})} />
                                </div>
                            </div>

                            <div style={styles.coordBox}>
                                <label style={styles.labelRed}>PUNTO DE DESTINO</label>
                                <div style={{marginBottom: '10px'}}>
                                    <select 
                                        style={styles.selectSmall} 
                                        onChange={(e) => handleSelectLugar(e.target.value, 'destino')}
                                        value={AEROPUERTOS.some(a => a.nombre === coordDes.nombre) ? coordDes.nombre : ""}
                                    >
                                        <option value="">-- AERÓDROMO PRECARGADO --</option>
                                        {AEROPUERTOS.map(a => <option key={a.nombre} value={a.nombre}>{a.nombre}</option>)}
                                    </select>
                                    <input 
                                        style={styles.inputSmall} 
                                        placeholder="O ESCRIBIR NOMBRE PERSONALIZADO" 
                                        value={coordDes.nombre} 
                                        onChange={(e) => setCoordDes({...coordDes, nombre: e.target.value.toUpperCase()})} 
                                    />
                                </div>
                                <div style={styles.gmsWrapper}>
                                    <InputGMS label="LATITUD (S)" values={{g: coordDes.latG, m: coordDes.latM, s: coordDes.latS}} onChange={(f, v) => setCoordDes({...coordDes, [`lat${f}`]: v})} />
                                    <InputGMS label="LONGITUD (W)" values={{g: coordDes.lngG, m: coordDes.lngM, s: coordDes.lngS}} onChange={(f, v) => setCoordDes({...coordDes, [`lng${f}`]: v})} />
                                </div>
                            </div>
                        </div>

                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>NOTAS MARGINALES</label>
                            <input style={styles.input} value={notasMarginales} onChange={e => setNotasMarginales(e.target.value)} placeholder="DATOS ADICIONALES DEL VUELO" />
                        </div>

                        <div style={{display: 'flex', gap: '10px'}}>
                            <button type="submit" style={editingId ? styles.btnUpdate : styles.btnLaunch} disabled={loading}>
                                {loading ? 'PROCESANDO...' : (editingId ? 'GUARDAR CAMBIOS' : 'LANZAR OPERACIÓN')}
                            </button>
                            {editingId && (
                                <button type="button" onClick={resetForm} style={styles.btnCancel}>CANCELAR</button>
                            )}
                        </div>
                    </form>
                </div>

                <div style={styles.logCard}>
                    <div style={styles.logHeader}>
                        <span style={styles.radarText}>📡 MONITOR DE OPERACIONES</span>
                        <button onClick={cargarDatos} style={styles.btnRefresh}>SINCRO</button>
                    </div>
                    <div style={styles.scrollArea}>
                        {misiones.length === 0 ? (
                            <div style={styles.emptyBox}><p style={styles.emptyMsg}>SIN ACTIVIDAD</p></div>
                        ) : (
                            misiones.map(m => (
                                <div key={m._id} style={styles.misionItem}>
                                    <div style={styles.misionHeader}>
                                        <span style={styles.badgeMatricula}>{m.matricula}</span>
                                        <span style={styles.tagElemento}>{m.elemento}</span>
                                    </div>
                                    <div style={styles.misionTitle}>{m.title}</div>
                                    <div style={styles.misionSub}>{m.aeronave}</div>
                                    {m.notasMarginales && <div style={{fontSize: '0.7rem', color: '#8b949e', fontStyle: 'italic', marginBottom: '5px'}}>{m.notasMarginales}</div>}
                                    <div style={styles.routeText}>
                                        {m.origen?.nombre || '---'} ➔ {m.destino?.nombre || '---'}
                                    </div>
                                    <div style={styles.logActionRow}>
                                        <button onClick={() => prepararEdicion(m)} style={styles.btnEditLog}>EDITAR</button>
                                        <button onClick={() => handleFinalizar(m._id)} style={styles.btnFinish}>ARRIBO</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    page: { padding: '30px', backgroundColor: '#0d1117', minHeight: '100vh', color: '#e6edf3', fontFamily: "'Segoe UI', sans-serif" },
    container: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: '25px', maxWidth: '1300px', margin: '0 auto' },
    card: { backgroundColor: '#161b22', padding: '25px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.7)', border: '1px solid #30363d', position: 'relative' },
    headerDecoration: { position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(90deg, #0056b3, #00a8ff)' },
    headerTitle: { margin: '0 0 5px 0', fontSize: '1.4rem', color: '#fff', fontWeight: '800' },
    subHeader: { color: '#58a6ff', fontSize: '0.8rem', margin: '0 0 20px 0', fontWeight: '600' },
    fieldGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '5px' },
    fieldGroup: { marginBottom: '15px' },
    label: { fontSize: '0.7rem', color: '#8b949e', display: 'block', marginBottom: '5px', fontWeight: '700' },
    labelBlue: { fontSize: '0.75rem', color: '#58a6ff', display: 'block', marginBottom: '10px', fontWeight: '800', borderBottom: '1px solid #30363d' },
    labelRed: { fontSize: '0.75rem', color: '#f85149', display: 'block', marginBottom: '10px', fontWeight: '800', borderBottom: '1px solid #30363d' },
    labelSub: { fontSize: '0.65rem', color: '#8b949e', marginBottom: '4px', fontWeight: 'bold' },
    input: { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: '#fff', fontSize: '1rem' },
    inputSmall: { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: '#fff', fontSize: '0.75rem' },
    select: { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #30363d', backgroundColor: '#0d1117', color: '#fff' },
    selectSmall: { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #30363d', backgroundColor: '#161b22', color: '#58a6ff', fontSize: '0.75rem', marginBottom: '5px', fontWeight: 'bold' },
    coordGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' },
    coordBox: { backgroundColor: '#0d1117', padding: '15px', borderRadius: '8px', border: '1px solid #30363d' },
    gmsWrapper: { display: 'flex', flexDirection: 'column', gap: '10px' },
    gmsRow: { display: 'flex', gap: '5px' },
    inputGMS: { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #30363d', backgroundColor: '#161b22', color: '#fff', fontSize: '0.85rem', textAlign: 'center' },
    btnLaunch: { width: '100%', padding: '16px', backgroundColor: '#1f6feb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '800', fontSize: '1rem', marginTop: '10px' },
    btnUpdate: { width: '100%', padding: '16px', backgroundColor: '#238636', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '800', fontSize: '1rem', marginTop: '10px' },
    btnCancel: { padding: '16px', backgroundColor: '#30363d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '800', marginTop: '10px' },
    logCard: { backgroundColor: '#161b22', borderRadius: '12px', display: 'flex', flexDirection: 'column', height: '85vh', border: '1px solid #30363d' },
    logHeader: { padding: '15px', backgroundColor: '#0d1117', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #30363d' },
    radarText: { color: '#fff', fontWeight: '800', fontSize: '0.85rem' },
    btnRefresh: { padding: '5px 12px', fontSize: '0.7rem', backgroundColor: '#30363d', color: '#fff', border: 'none', borderRadius: '20px', cursor: 'pointer' },
    scrollArea: { flex: 1, overflowY: 'auto', padding: '15px' },
    misionItem: { backgroundColor: '#0d1117', padding: '15px', borderRadius: '8px', marginBottom: '12px', borderLeft: '5px solid #58a6ff' },
    misionHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px' },
    badgeMatricula: { backgroundColor: '#30363d', color: '#58a6ff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800' },
    tagElemento: { color: '#8b949e', fontSize: '0.65rem' },
    misionTitle: { fontSize: '1.2rem', fontWeight: '900', color: '#fff' },
    misionSub: { fontSize: '0.75rem', color: '#8b949e', marginBottom: '5px' },
    routeText: { fontSize: '0.7rem', color: '#58a6ff', marginBottom: '10px', fontWeight: 'bold' },
    logActionRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
    btnEditLog: { padding: '8px', fontSize: '0.7rem', backgroundColor: '#1f6feb', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' },
    btnFinish: { padding: '8px', fontSize: '0.7rem', backgroundColor: 'transparent', color: '#f85149', border: '1px solid #f85149', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' },
    emptyBox: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    emptyMsg: { color: '#484f58', fontWeight: 'bold', fontSize: '0.8rem' }
};

export default CargaTactica;