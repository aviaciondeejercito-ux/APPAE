import React, { useState, useEffect, useCallback } from 'react';
import { getActiveOperations, createEvent, updateEvent, deleteEvent, getAircrafts } from '../services/api';
import Swal from 'sweetalert2';

// Constantes de referencia local
const AEROPUERTOS = [
    { nombre: "SADO - CAMPO DE MAYO", lat: -34.528, lng: -58.641 },
    { nombre: "SAZN - NEUQUÉN", lat: -38.949, lng: -68.143 },
    { nombre: "SAWG - RÍO GALLEGOS", lat: -51.608, lng: -69.312 },
    { nombre: "SAZB - BAHÍA BLANCA", lat: -38.718, lng: -62.170 },
    { nombre: "SARC - CORRIENTES", lat: -27.445, lng: -58.761 },
    { nombre: "SAMM - MENDOZA", lat: -32.831, lng: -68.792 },
    { nombre: "SASR - ROSARIO DE LA FRONTERA", lat: -25.828, lng: -64.931 },
    { nombre: "SAST - SALTA", lat: -24.856, lng: -65.482 }
];

const UNIDADES = [
    "B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8", 
    "ESC AV EXPL ATQ 602", "SEC AE 11", "EC AE", "SEC AE MTE 3", 
    "SEC AE DR", "B AB MANT AERON 601", "SEC AE MTE 12", "SEC AE 9"
];

const CLASIFICACION = { 
    'C-212': 'ala_fija', 
    'C-208': 'ala_fija', 
    'UH-1H': 'ala_rotativa', 
    'BELL 212': 'ala_rotativa', 
    'AB-206': 'ala_rotativa' 
};

const CargaTactica = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isMando = ['admin', 'boss', 'director', 'oto', 'otoae'].includes(user.role?.toLowerCase());

    const [misiones, setMisiones] = useState([]);
    const [flota, setFlota] = useState([]); // Este estado ahora viene de MongoDB
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showDestino, setShowDestino] = useState(false);

    const initialState = {
        title: '', elemento: user.elemento || '', notas: '', sda: '', matricula: '', aeronaveId: '',
        latG: 0, latM: 0, latS: 0, latDir: 'S', lngG: 0, lngM: 0, lngS: 0, lngDir: 'W', locNombre: '',
        dLatG: 0, dLatM: 0, dLatS: 0, dLatDir: 'S', dLngG: 0, dLngM: 0, dLngS: 0, dLngDir: 'W', dNombre: ''
    };
    const [form, setForm] = useState(initialState);

    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            const [evRes, airRes] = await Promise.all([getActiveOperations(), getAircrafts()]);
            
            const events = Array.isArray(evRes) ? evRes : evRes.data || [];
            const aircrafts = Array.isArray(airRes) ? airRes : airRes.data || [];

            // Filtrar misiones activas en tiempo real
            setMisiones(events.filter(ev => ev.isRealTime && (isMando || ev.elemento?.includes(user.elemento))));
            
            // FILTRADO DE AERONAVES DE MONGODB (Solo E/S y según permisos)
            setFlota(aircrafts.filter(a => a.estado === 'E/S' && (isMando || a.unidad?.includes(user.elemento))));
            
        } catch (e) { 
            console.error("Error en la carga de datos de red:", e); 
        }
        setLoading(false);
    }, [isMando, user.elemento]);

    useEffect(() => {
        cargarDatos();
        const interval = setInterval(cargarDatos, 15000);
        return () => clearInterval(interval);
    }, [cargarDatos]);

    // Helpers de conversión de coordenadas
    const toDec = (g, m, s, dir) => {
        const d = Math.abs(parseFloat(g)) + (parseFloat(m) / 60) + (parseFloat(s) / 3600);
        return (dir === 'S' || dir === 'W') ? d * -1 : d;
    };

    const fromDec = (dec, type) => {
        const abs = Math.abs(dec || 0);
        const g = Math.floor(abs);
        const m = Math.floor((abs - g) * 60);
        const s = Math.round((abs - g - m / 60) * 3600);
        return { g, m, s, dir: type === 'lat' ? (dec < 0 ? 'S' : 'N') : (dec < 0 ? 'W' : 'E') };
    };

    const handleAptSelect = (e, target) => {
        const apt = AEROPUERTOS.find(p => p.nombre === e.target.value);
        if (!apt) return;
        const la = fromDec(apt.lat, 'lat');
        const lo = fromDec(apt.lng, 'lng');
        const prefix = target === 'pos' ? '' : 'd';
        
        setForm(prev => ({
            ...prev, 
            [`${prefix}Nombre`]: apt.nombre,
            [`${prefix}LatG`]: la.g, [`${prefix}LatM`]: la.m, [`${prefix}LatS`]: la.s, [`${prefix}LatDir`]: la.dir,
            [`${prefix}LngG`]: lo.g, [`${prefix}LngM`]: lo.m, [`${prefix}LngS`]: lo.s, [`${prefix}LngDir`]: lo.dir
        }));
    };

    const handleEdit = (m) => {
        const pos = m.ubicacion?.salida || m;
        const des = m.ubicacion?.llegada || m.destino;
        const pLa = fromDec(pos.lat, 'lat');
        const pLo = fromDec(pos.lng, 'lng');
        
        let desData = {};
        if (des?.lat) {
            const dLa = fromDec(des.lat, 'lat');
            const dLo = fromDec(des.lng, 'lng');
            desData = { 
                dNombre: des.nombre, dLatG: dLa.g, dLatM: dLa.m, dLatS: dLa.s, dLatDir: dLa.dir, 
                dLngG: dLo.g, dLngM: dLo.m, dLngS: dLo.s, dLngDir: dLo.dir 
            };
            setShowDestino(true);
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
            locNombre: pos.nombre || 'POSICIÓN', 
            ...desData 
        });
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const lat = toDec(form.latG, form.latM, form.latS, form.latDir);
        const lng = toDec(form.lngG, form.lngM, form.lngS, form.lngDir);
        const icono = CLASIFICACION[form.sda] || (form.sda.includes('AE') ? 'ala_fija' : 'ala_rotativa');

        const payload = {
            title: form.title.toUpperCase(),
            elemento: form.elemento,
            notes: form.notas.toUpperCase(),
            isRealTime: true,
            status: 'operativo',
            lat,
            lng,
            ubicacion: { 
                nombre: form.locNombre, 
                salida: { nombre: form.locNombre, lat, lng },
                llegada: showDestino ? { 
                    nombre: form.dNombre, 
                    lat: toDec(form.dLatG, form.dLatM, form.dLatS, form.dLatDir), 
                    lng: toDec(form.dLngG, form.dLngM, form.dLngS, form.dLngDir) 
                } : { nombre: "", lat: 0, lng: 0 }
            },
            misionDetalle: { 
                aeronave: form.sda, 
                matricula: form.matricula, 
                tipoIcono: icono, 
                isRealTime: true, 
                lat, 
                lng 
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
        const res = await Swal.fire({ 
            title: '¿Finalizar?', 
            text: "Se eliminará el rastro del radar táctico", 
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonColor: '#d33',
            confirmButtonText: 'ARRIBO / FINALIZAR' 
        });
        if (res.isConfirmed) { 
            try { 
                await deleteEvent(id); 
                cargarDatos(); 
            } catch { 
                Swal.fire('Error', 'Sin permisos para finalizar', 'error'); 
            } 
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.card}>
                    <h2 style={styles.headerTitle}>{editingId ? '📍 RE-POSICIONAR' : '⚡ DESPACHO TÁCTICO'}</h2>
                    <form onSubmit={handleSubmit}>
                        <input 
                            style={styles.input} 
                            value={form.title} 
                            onChange={e => setForm({...form, title: e.target.value})} 
                            placeholder="INDICATIVO DE VUELO" 
                            required 
                        />
                        
                        <div style={styles.formGrid}>
                            <select 
                                style={styles.input} 
                                value={form.aeronaveId} 
                                onChange={e => {
                                    const a = flota.find(x => x._id === e.target.value);
                                    if(a) setForm({...form, aeronaveId: a._id, sda: a.sda, matricula: a.matricula, elemento: a.unidad});
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

                            <select 
                                style={styles.input} 
                                value={form.elemento} 
                                onChange={e => setForm({...form, elemento: e.target.value})} 
                                disabled={!isMando} 
                                required
                            >
                                <option value="">-- Unidad Responsable --</option>
                                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>

                        <div style={styles.geoBox}>
                            <label style={styles.label}>POSICIÓN / ORIGEN</label>
                            <select onChange={e => handleAptSelect(e, 'pos')} style={styles.input} value={form.locNombre}>
                                <option value="">Seleccionar Aeródromo...</option>
                                {AEROPUERTOS.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                            </select>
                            <div style={styles.row}>
                                {['latG', 'latM', 'latS'].map(f => (
                                    <input key={f} type="number" style={styles.inputTriple} value={form[f]} onChange={e => setForm({...form, [f]: e.target.value})} placeholder="00" />
                                ))}
                                <select style={styles.inputShort} value={form.latDir} onChange={e => setForm({...form, latDir: e.target.value})}>
                                    <option>S</option><option>N</option>
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
                            </div>
                        )}

                        <textarea 
                            style={styles.textarea} 
                            value={form.notas} 
                            onChange={e => setForm({...form, notas: e.target.value})} 
                            placeholder="NOTAS MARGINALES / NOVEDADES / PERSONAL" 
                            required 
                        />

                        <button type="submit" style={editingId ? styles.btnUpdate : styles.btn}>
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
                        {misiones.length === 0 ? (
                            <p style={styles.emptyMsg}>No hay operaciones en curso</p>
                        ) : (
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
                        )}
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