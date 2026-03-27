import React, { useState, useEffect } from 'react';
import { getEvents, createEvent, updateEvent, deleteEvent, getAircrafts } from '../services/api';
import Swal from 'sweetalert2';

const AEROPUERTOS_ESTANDAR = [
    { nombre: "SADO - CAMPO DE MAYO", lat: -34.528, lng: -58.641 },
    { nombre: "SAZN - NEUQUÉN", lat: -38.949, lng: -68.143 },
    { nombre: "SATU - CURUZÚ CUATIÁ", lat: -29.775, lng: -58.042 },
    { nombre: "SAST - TARTAGAL", lat: -22.516, lng: -63.791 },
    { nombre: "SADF - SAN FERNANDO", lat: -34.453, lng: -58.589 },
    { nombre: "SABE - AEROPARQUE", lat: -34.559, lng: -58.415 },
    { nombre: "SADP - EL PALOMAR", lat: -34.609, lng: -58.602 },
    { nombre: "SACO - CÓRDOBA", lat: -31.310, lng: -64.208 },
    { nombre: "SASA - SALTA", lat: -24.856, lng: -65.486 },
    { nombre: "SAMR - ROSARIO", lat: -32.903, lng: -60.784 },
    { nombre: "SAME - MENDOZA", lat: -32.831, lng: -68.792 },
    { nombre: "SARP - POSADAS", lat: -27.385, lng: -55.970 },
    { nombre: "SAWG - RÍO GALLEGOS", lat: -51.608, lng: -69.312 },
    { nombre: "SAVC - COMODORO RIVADAVIA", lat: -45.785, lng: -67.465 },
    { nombre: "SAOR - RÍO CUARTO", lat: -33.085, lng: -64.261 },
    { nombre: "SAZY - CHAPELCO", lat: -40.075, lng: -71.139 },
    { nombre: "SAZR - SANTA ROSA", lat: -36.588, lng: -64.276 },
    { nombre: "SAHZ - ZAPALA", lat: -38.975, lng: -70.113 },
    { nombre: "SAZS - BARILOCHE", lat: -41.151, lng: -71.157 },
    { nombre: "SAZB - BAHÍA BLANCA", lat: -38.718, lng: -62.169 },
    { nombre: "SAZA - AZUL", lat: -36.840, lng: -59.882 },
    { nombre: "SAZF - OLAVARRÍA", lat: -36.889, lng: -60.226 },
    { nombre: "SAAP - PARANÁ", lat: -31.794, lng: -60.480 },
    { nombre: "SANT - TUCUMÁN", lat: -26.841, lng: -65.104 },
    { nombre: "SARF - FORMOSA", lat: -26.213, lng: -58.228 },
    { nombre: "SAAV - SANTA FE", lat: -31.711, lng: -60.812 },
    { nombre: "SANE - SANTIAGO DEL ESTERO", lat: -27.766, lng: -64.311 },
    { nombre: "SANU - SAN JUAN", lat: -31.571, lng: -68.418 }
];

const UNIDADES_AE = [
    "B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8",
    "ESC AV EXPL ATQ 602", "SEC AE 11", "EC AE", "SEC AE MTE 3",
    "SEC AE DR", "B AB MANT AERON 601", "SEC AE MTE 12", "SEC AE 9"
];

const CargaTactica = () => {
    const [misionesActivas, setMisionesActivas] = useState([]);
    const [flotaES, setFlotaES] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        title: '', elemento: '', notasMarginales: '', 
        aeronaveId: '', sda: '', matricula: '', 
        latG: 34, latM: 31, latS: 40, latDir: 'S',
        lngG: 58, lngM: 38, lngS: 29, lngDir: 'W',
        locNombre: ''
    });

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [evRes, airRes] = await Promise.all([getEvents(), getAircrafts()]);
            
            // Extracción segura de datos
            const dataEvents = Array.isArray(evRes) ? evRes : (evRes.data || []);
            const dataAir = Array.isArray(airRes) ? airRes : (airRes.data || []);

            // FILTRADO SIMPLE: Mostramos todo lo que tenga status 'en_curso'
            const activas = dataEvents.filter(ev => ev.status === 'en_curso' || ev.isRealTime === true);
            setMisionesActivas(activas);
            
            setFlotaES(dataAir.filter(a => a.estado === 'E/S'));
        } catch (error) {
            console.error("Error en sincronización táctica:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
        const interval = setInterval(cargarDatos, 10000);
        return () => clearInterval(interval);
    }, []);

    const toDecimal = (g, m, s, dir) => {
        let dec = parseFloat(g || 0) + parseFloat(m || 0) / 60 + parseFloat(s || 0) / 3600;
        return (dir === 'S' || dir === 'W') ? dec * -1 : dec;
    };

    const fromDecimal = (dec, type) => {
        const abs = Math.abs(dec || 0);
        const g = Math.floor(abs);
        const m = Math.floor((abs - g) * 60);
        const s = Math.round((abs - g - m / 60) * 3600);
        let dir = type === 'lat' ? (dec < 0 ? 'S' : 'N') : (dec < 0 ? 'W' : 'E');
        return { g, m, s, dir };
    };

    const handleAeronaveSelect = (e) => {
        const selected = flotaES.find(a => a._id === e.target.value);
        if (selected) {
            setFormData({
                ...formData,
                aeronaveId: selected._id,
                sda: selected.sda,
                matricula: selected.matricula,
                elemento: selected.unidad
            });
        }
    };

    const handleAeropuerto = (e) => {
        const apto = AEROPUERTOS_ESTANDAR.find(p => p.nombre === e.target.value);
        if (apto) {
            const latGMS = fromDecimal(apto.lat, 'lat');
            const lngGMS = fromDecimal(apto.lng, 'lng');
            setFormData({ 
                ...formData, 
                locNombre: apto.nombre,
                latG: latGMS.g, latM: latGMS.m, latS: latGMS.s, latDir: latGMS.dir,
                lngG: lngGMS.g, lngM: lngGMS.m, lngS: lngGMS.s, lngDir: lngGMS.dir
            });
        }
    };

    const handleEdit = (mision) => {
        const latVal = mision.lat ?? mision.ubicacion?.lat ?? 0;
        const lngVal = mision.lng ?? mision.ubicacion?.lng ?? 0;
        const latGMS = fromDecimal(latVal, 'lat');
        const lngGMS = fromDecimal(lngVal, 'lng');
        
        setEditingId(mision._id);
        setFormData({
            title: mision.title,
            elemento: mision.elemento || '',
            notasMarginales: mision.notasMarginales || '',
            sda: mision.aeronave || '',
            matricula: mision.matricula || '',
            latG: latGMS.g, latM: latGMS.m, latS: latGMS.s, latDir: latGMS.dir,
            lngG: lngGMS.g, lngM: lngGMS.m, lngS: lngGMS.s, lngDir: lngGMS.dir,
            locNombre: mision.ubicacion?.nombre || 'POSICIÓN TÁCTICA'
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const latDec = toDecimal(formData.latG, formData.latM, formData.latS, formData.latDir);
        const lngDec = toDecimal(formData.lngG, formData.lngM, formData.lngS, formData.lngDir);

        const payload = {
            title: formData.title.toUpperCase(),
            aeronave: formData.sda.toUpperCase(),
            matricula: formData.matricula.toUpperCase(),
            elemento: formData.elemento.toUpperCase(),
            notasMarginales: formData.notasMarginales.toUpperCase(),
            isRealTime: true,
            status: 'en_curso',
            tipoIcono: formData.sda.includes('C-') || formData.sda.includes('AE') ? 'ala_fija' : 'ala_rotativa',
            lat: latDec, 
            lng: lngDec,
            ubicacion: {
                nombre: (formData.locNombre || 'POSICIÓN TÁCTICA').toUpperCase(),
                lat: latDec,
                lng: lngDec
            }
        };

        try {
            if (editingId) {
                await updateEvent(editingId, payload);
                Swal.fire('OK', 'Vector Actualizado', 'success');
            } else {
                await createEvent(payload);
                Swal.fire('OK', 'Vuelo Iniciado', 'success');
            }
            
            setFormData({ 
                title: '', elemento: '', notasMarginales: '', 
                aeronaveId: '', sda: '', matricula: '', 
                latG: 34, latM: 31, latS: 40, latDir: 'S', 
                lngG: 58, lngM: 38, lngS: 29, lngDir: 'W', 
                locNombre: '' 
            });
            setEditingId(null);
            cargarDatos();
        } catch (error) {
            Swal.fire('Error', 'Fallo de conexión', 'error');
        }
    };

    const handleFinalizar = async (id) => {
        const result = await Swal.fire({
            title: '¿FINALIZAR?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'SÍ'
        });

        if (result.isConfirmed) {
            try {
                await deleteEvent(id);
                cargarDatos();
            } catch (error) {
                Swal.fire('Error', 'No se pudo borrar', 'error');
            }
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.card}>
                    <h2 style={styles.title}>{editingId ? '📍 RE-POSICIONAR' : '⚡ NUEVO VUELO'}</h2>
                    <form onSubmit={handleSubmit}>
                        <label style={styles.label}>Indicativo:</label>
                        <input style={styles.input} value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />

                        <label style={styles.label}>Aeronave:</label>
                        <select style={styles.input} value={formData.aeronaveId} onChange={handleAeronaveSelect} required={!editingId}>
                            <option value="">-- Seleccionar --</option>
                            {flotaES.map(a => <option key={a._id} value={a._id}>{a.sda} | {a.matricula}</option>)}
                        </select>

                        <label style={styles.label}>Unidad:</label>
                        <select style={styles.input} value={formData.elemento} onChange={(e) => setFormData({...formData, elemento: e.target.value})} required>
                            <option value="">-- Seleccionar --</option>
                            {UNIDADES_AE.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>

                        <div style={styles.geoBox}>
                            <select onChange={handleAeropuerto} style={styles.input} value={formData.locNombre}>
                                <option value="">Aeródromo...</option>
                                {AEROPUERTOS_ESTANDAR.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                            </select>
                            <div style={styles.row}>
                                <input type="number" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, latG: e.target.value})} value={formData.latG}/>
                                <input type="number" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, latM: e.target.value})} value={formData.latM}/>
                                <input type="number" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, latS: e.target.value})} value={formData.latS}/>
                                <select style={styles.inputShort} onChange={(e)=>setFormData({...formData, latDir: e.target.value})} value={formData.latDir}><option value="S">S</option><option value="N">N</option></select>
                            </div>
                            <div style={styles.row}>
                                <input type="number" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, lngG: e.target.value})} value={formData.lngG}/>
                                <input type="number" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, lngM: e.target.value})} value={formData.lngM}/>
                                <input type="number" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, lngS: e.target.value})} value={formData.lngS}/>
                                <select style={styles.inputShort} onChange={(e)=>setFormData({...formData, lngDir: e.target.value})} value={formData.lngDir}><option value="W">W</option><option value="E">E</option></select>
                            </div>
                        </div>

                        <label style={styles.label}>Notas:</label>
                        <textarea style={styles.textarea} value={formData.notasMarginales} onChange={(e) => setFormData({...formData, notasMarginales: e.target.value})} required />

                        <button type="submit" style={editingId ? styles.btnUpdate : styles.btn}>
                            {editingId ? 'GUARDAR' : 'LANZAR'}
                        </button>
                    </form>
                </div>

                <div style={styles.logCard}>
                    <h3 style={{ color: '#f39c12', borderBottom: '1px solid #f39c12' }}>🛰️ LOG DE VUELOS</h3>
                    <div style={styles.scrollArea}>
                        {misionesActivas.map(m => (
                            <div key={m._id} style={styles.misionItem}>
                                <strong>{m.aeronave} - {m.matricula}</strong>
                                <p style={{margin: '5px 0', fontSize: '0.8rem'}}>{m.title}</p>
                                <div style={styles.btnRow}>
                                    <button onClick={() => handleEdit(m)} style={styles.btnSmall}>EDITAR</button>
                                    <button onClick={() => handleFinalizar(m._id)} style={styles.btnSmallRed}>FIN</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    page: { padding: '20px', backgroundColor: '#121212', minHeight: '100vh', fontFamily: 'monospace' },
    container: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '1200px', margin: '0 auto' },
    card: { backgroundColor: '#1e272e', color: 'white', padding: '20px', borderRadius: '10px', border: '1px solid #f39c12' },
    logCard: { backgroundColor: '#1e272e', color: 'white', padding: '20px', borderRadius: '10px' },
    scrollArea: { maxHeight: '500px', overflowY: 'auto' },
    misionItem: { backgroundColor: '#2f3542', padding: '10px', marginBottom: '10px', borderRadius: '5px', borderLeft: '4px solid #f39c12' },
    title: { color: '#f39c12', textAlign: 'center' },
    label: { display: 'block', fontSize: '0.8rem', color: '#bdc3c7' },
    input: { width: '100%', padding: '8px', marginBottom: '10px', backgroundColor: '#2f3542', color: 'white', border: 'none' },
    inputTriple: { width: '22%', padding: '5px', backgroundColor: '#3d4451', color: 'white', border: 'none' },
    inputShort: { width: '20%', padding: '5px' },
    row: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px' },
    geoBox: { padding: '10px', backgroundColor: '#3d4451', marginBottom: '10px' },
    textarea: { width: '100%', height: '60px', backgroundColor: '#2f3542', color: 'white' },
    btn: { width: '100%', padding: '10px', backgroundColor: '#d35400', color: 'white', border: 'none', cursor: 'pointer' },
    btnUpdate: { width: '100%', padding: '10px', backgroundColor: '#27ae60', color: 'white', border: 'none' },
    btnRow: { display: 'flex', gap: '10px' },
    btnSmall: { padding: '3px 8px', backgroundColor: '#2980b9', color: 'white', border: 'none' },
    btnSmallRed: { padding: '3px 8px', backgroundColor: '#c0393b', color: 'white', border: 'none' }
};

export default CargaTactica;