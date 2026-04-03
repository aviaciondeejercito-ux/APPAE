import React, { useState, useEffect, useCallback } from 'react';
import { getActiveOperations, createEvent, updateEvent, deleteEvent, getAircrafts } from '../services/api';
import Swal from 'sweetalert2';

// Constantes simplificadas (Idealmente mover a un archivo de constantes)
const AEROPUERTOS = [{ nombre: "SADO - CAMPO DE MAYO", lat: -34.528, lng: -58.641 }, /* ... resto de la lista */];
const UNIDADES = ["B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8", "ESC AV EXPL ATQ 602", "SEC AE 11", "EC AE", "SEC AE MTE 3", "SEC AE DR", "B AB MANT AERON 601", "SEC AE MTE 12", "SEC AE 9"];
const CLASIFICACION = { 'C-212': 'ala_fija', 'C-208': 'ala_fija', 'UH-1H': 'ala_rotativa' }; // ... etc

const CargaTactica = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isMando = ['admin', 'boss', 'director', 'oto', 'otoae'].includes(user.role?.toLowerCase());

    const [misiones, setMisiones] = useState([]);
    const [flota, setFlota] = useState([]);
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

            setMisiones(events.filter(ev => ev.isRealTime && (isMando || ev.elemento?.includes(user.elemento))));
            setFlota(aircrafts.filter(a => a.estado === 'E/S' && (isMando || a.unidad?.includes(user.elemento))));
        } catch (e) { console.error("Error enlace:", e); }
        setLoading(false);
    }, [isMando, user.elemento]);

    useEffect(() => {
        cargarDatos();
        const interval = setInterval(cargarDatos, 15000);
        return () => clearInterval(interval);
    }, [cargarDatos]);

    // Helpers de conversión
    const toDec = (g, m, s, dir) => {
        const d = Math.abs(g) + (m / 60) + (s / 3600);
        return (dir === 'S' || dir === 'W') ? d * -1 : d;
    };

    const fromDec = (dec, type) => {
        const abs = Math.abs(dec || 0);
        const g = Math.floor(abs), m = Math.floor((abs - g) * 60), s = Math.round((abs - g - m / 60) * 3600);
        return { g, m, s, dir: type === 'lat' ? (dec < 0 ? 'S' : 'N') : (dec < 0 ? 'W' : 'E') };
    };

    const handleAptSelect = (e, target) => {
        const apt = AEROPUERTOS.find(p => p.nombre === e.target.value);
        if (!apt) return;
        const la = fromDec(apt.lat, 'lat'), lo = fromDec(apt.lng, 'lng');
        const prefix = target === 'pos' ? '' : 'd';
        setForm(prev => ({
            ...prev, [`${prefix}Nombre`]: apt.nombre,
            [`${prefix}LatG`]: la.g, [`${prefix}LatM`]: la.m, [`${prefix}LatS`]: la.s, [`${prefix}LatDir`]: la.dir,
            [`${prefix}LngG`]: lo.g, [`${prefix}LngM`]: lo.m, [`${prefix}LngS`]: lo.s, [`${prefix}LngDir`]: lo.dir
        }));
    };

    const handleEdit = (m) => {
        const pos = m.ubicacion?.salida || m;
        const des = m.ubicacion?.llegada || m.destino;
        const pLa = fromDec(pos.lat, 'lat'), pLo = fromDec(pos.lng, 'lng');
        
        let desData = {};
        if (des?.lat) {
            const dLa = fromDec(des.lat, 'lat'), dLo = fromDec(des.lng, 'lng');
            desData = { dNombre: des.nombre, dLatG: dLa.g, dLatM: dLa.m, dLatS: dLa.s, dLatDir: dLa.dir, dLngG: dLo.g, dLngM: dLo.m, dLngS: dLo.s, dLngDir: dLo.dir };
            setShowDestino(true);
        }

        setEditingId(m._id);
        setForm({ ...initialState, title: m.title, elemento: m.elemento, notas: m.notes || m.notasMarginales, sda: m.misionDetalle?.aeronave || m.aeronave, matricula: m.misionDetalle?.matricula || m.matricula, aeronaveId: 'EDIT', latG: pLa.g, latM: pLa.m, latS: pLa.s, latDir: pLa.dir, lngG: pLo.g, lngM: pLo.m, lngS: pLo.s, lngDir: pLo.dir, locNombre: pos.nombre || 'POSICIÓN', ...desData });
        window.scrollTo(0, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const lat = toDec(form.latG, form.latM, form.latS, form.latDir);
        const lng = toDec(form.lngG, form.lngM, form.lngS, form.lngDir);
        const icono = CLASIFICACION[form.sda] || (form.sda.includes('AE') ? 'ala_fija' : 'ala_rotativa');

        const payload = {
            title: form.title.toUpperCase(), elemento: form.elemento, notes: form.notas.toUpperCase(), isRealTime: true, status: 'operativo', lat, lng,
            ubicacion: { 
                nombre: form.locNombre, 
                salida: { nombre: form.locNombre, lat, lng },
                llegada: showDestino ? { nombre: form.dNombre, lat: toDec(form.dLatG, form.dLatM, form.dLatS, form.dLatDir), lng: toDec(form.dLngG, form.dLngM, form.dLngS, form.dLngDir) } : { nombre: "", lat: 0, lng: 0 }
            },
            misionDetalle: { aeronave: form.sda, matricula: form.matricula, tipoIcono: icono, isRealTime: true, lat, lng }
        };

        try {
            editingId ? await updateEvent(editingId, payload) : await createEvent(payload);
            Swal.fire('ÉXITO', editingId ? 'Vector actualizado' : 'Operación lanzada', 'success');
            setForm(initialState); setEditingId(null); setShowDestino(false); cargarDatos();
        } catch (err) { Swal.fire('Error', 'Falla en el envío', 'error'); }
    };

    const handleFinalizar = async (id) => {
        const res = await Swal.fire({ title: '¿Finalizar?', text: "Elimina rastro del radar", icon: 'warning', showCancelButton: true, confirmButtonText: 'ARRIBO' });
        if (res.isConfirmed) { try { await deleteEvent(id); cargarDatos(); } catch { Swal.fire('Error', 'Sin permisos', 'error'); } }
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.card}>
                    <h2 style={styles.headerTitle}>{editingId ? '📍 RE-POSICIONAR' : '⚡ DESPACHO'}</h2>
                    <form onSubmit={handleSubmit}>
                        <input style={styles.input} value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="INDICATIVO" required />
                        
                        <div style={styles.formGrid}>
                            <select style={styles.input} value={form.aeronaveId} onChange={e => {
                                const a = flota.find(x => x._id === e.target.value);
                                if(a) setForm({...form, aeronaveId: a._id, sda: a.sda, matricula: a.matricula, elemento: a.unidad});
                            }} required disabled={!!editingId}>
                                <option value="">-- Aeronave --</option>
                                {editingId ? <option value="EDIT">{form.sda} - {form.matricula}</option> : flota.map(a => <option key={a._id} value={a._id}>{a.sda} - {a.matricula}</option>)}
                            </select>

                            <select style={styles.input} value={form.elemento} onChange={e => setForm({...form, elemento: e.target.value})} disabled={!isMando} required>
                                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>

                        <div style={styles.geoBox}>
                            <select onChange={e => handleAptSelect(e, 'pos')} style={styles.input} value={form.locNombre}>
                                <option value="">Origen...</option>
                                {AEROPUERTOS.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                            </select>
                            <div style={styles.row}>
                                {['latG', 'latM', 'latS'].map(f => <input key={f} type="number" style={styles.inputTriple} value={form[f]} onChange={e => setForm({...form, [f]: e.target.value})} />)}
                                <select style={styles.inputShort} value={form.latDir} onChange={e => setForm({...form, latDir: e.target.value})}><option>S</option><option>N</option></select>
                            </div>
                        </div>

                        <button type="button" onClick={() => setShowDestino(!showDestino)} style={styles.btnDestino}>{showDestino ? '❌ QUITAR DESTINO' : '➕ AGREGAR DESTINO'}</button>

                        <textarea style={styles.textarea} value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} placeholder="PERSONAL / NOVEDADES" required />

                        <button type="submit" style={editingId ? styles.btnUpdate : styles.btn}>{editingId ? 'ACTUALIZAR' : 'LANZAR'}</button>
                    </form>
                </div>

                <div style={styles.logCard}>
                    <div style={styles.logHeader}>📡 RADAR <button onClick={cargarDatos} style={styles.btnRefresh}>ACTUALIZAR</button></div>
                    <div style={styles.scrollArea}>
                        {misiones.map(m => (
                            <div key={m._id} style={styles.misionItem}>
                                <div style={styles.misionHeader}><span>{m.misionDetalle?.aeronave}</span> <span>{m.misionDetalle?.matricula}</span></div>
                                <div style={styles.misionTitle}>{m.title}</div>
                                <div style={styles.btnRow}>
                                    <button onClick={() => handleEdit(m)} style={styles.btnSmall}>EDITAR</button>
                                    <button onClick={() => handleFinalizar(m._id)} style={styles.btnSmallRed}>ARRIBO</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = { /* Mantén tus estilos aquí o simplifícalos con una librería de CSS */ };
export default CargaTactica;