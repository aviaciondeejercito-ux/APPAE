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
    const [formData, setFormData] = useState({
        title: '', elemento: '', notasMarginales: '', 
        aeronaveId: '', sda: '', matricula: '', 
        latG: 34, latM: 31, latS: 40, latDir: 'S',
        lngG: 58, lngM: 38, lngS: 29, lngDir: 'W',
        locNombre: ''
    });

    const cargarDatos = async () => {
        try {
            const [evRes, airRes] = await Promise.all([getEvents(), getAircrafts()]);
            
            // Logica del Radar: Misiones operativas en tiempo real
            const dataEvents = Array.isArray(evRes) ? evRes : evRes.data || [];
            const activas = dataEvents.filter(ev => ev.isRealTime === true);
            setMisionesActivas(activas);

            // Flota: Solo Aeronaves En Servicio (E/S)
            const dataAir = Array.isArray(airRes.data) ? airRes.data : [];
            setFlotaES(dataAir.filter(a => a.estado === 'E/S'));
        } catch (error) {
            console.error("Error en sincronización:", error);
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
        const latGMS = fromDecimal(mision.ubicacion.lat, 'lat');
        const lngGMS = fromDecimal(mision.ubicacion.lng, 'lng');
        setEditingId(mision._id);
        setFormData({
            title: mision.title,
            elemento: mision.elemento,
            notasMarginales: mision.notasMarginales,
            sda: mision.aeronave,
            matricula: mision.matricula,
            latG: latGMS.g, latM: latGMS.m, latS: latGMS.s, latDir: latGMS.dir,
            lngG: lngGMS.g, lngM: lngGMS.m, lngS: lngGMS.s, lngDir: lngGMS.dir,
            locNombre: mision.ubicacion.nombre
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const payload = {
            title: formData.title.toUpperCase(),
            aeronave: formData.sda.toUpperCase(),
            matricula: formData.matricula.toUpperCase(),
            elemento: formData.elemento.toUpperCase(),
            notasMarginales: formData.notasMarginales.toUpperCase(),
            isRealTime: true,
            etapa: 'operativo',
            status: 'en_curso',
            tipoIcono: formData.sda.includes('C-') || formData.sda.includes('AE') ? 'ala_fija' : 'ala_rotativa',
            ubicacion: {
                nombre: (formData.locNombre || 'POSICIÓN TÁCTICA').toUpperCase(),
                lat: toDecimal(formData.latG, formData.latM, formData.latS, formData.latDir),
                lng: toDecimal(formData.lngG, formData.lngM, formData.lngS, formData.lngDir)
            }
        };

        try {
            if (editingId) {
                await updateEvent(editingId, payload);
                Swal.fire('Actualizado', 'Vector reposicionado en radar', 'success');
            } else {
                await createEvent(payload);
                Swal.fire('Desplegado', 'Operación iniciada con éxito', 'success');
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
            Swal.fire('Error', 'Fallo en la comunicación táctica', 'error');
        }
    };

    const handleFinalizar = async (id) => {
        const result = await Swal.fire({
            title: '¿FINALIZAR MISIÓN?',
            text: "El vector será removido del radar activo.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'SÍ, FINALIZAR'
        });

        if (result.isConfirmed) {
            try {
                await deleteEvent(id);
                Swal.fire('Finalizado', 'Misión archivada', 'success');
                cargarDatos();
            } catch (error) {
                Swal.fire('Error', 'No se pudo cerrar la operación', 'error');
            }
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.card}>
                    <h2 style={styles.title}>{editingId ? '📍 RE-POSICIONAR VECTOR' : '⚡ NUEVO VUELO'}</h2>
                    <p style={styles.subtitle}>SISTEMA DE GESTIÓN TÁCTICA - CONEXIÓN ACTIVA</p>
                    
                    <form onSubmit={handleSubmit}>
                        <label style={styles.label}>Indicativo de Vuelo / Misión:</label>
                        <input style={styles.input} value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required placeholder="Ej: VUELO DE INSTRUCCION" />

                        <div style={styles.row}>
                            <div style={{ width: '100%' }}>
                                <label style={styles.label}>Seleccionar Aeronave (E/S):</label>
                                <select style={styles.input} value={formData.aeronaveId} onChange={handleAeronaveSelect} required={!editingId}>
                                    <option value="">-- Flota Disponible --</option>
                                    {flotaES.map(a => <option key={a._id} value={a._id}>{a.sda} | {a.matricula} ({a.unidad})</option>)}
                                </select>
                            </div>
                        </div>

                        <label style={styles.label}>Unidad Responsable:</label>
                        <select style={styles.input} value={formData.elemento} onChange={(e) => setFormData({...formData, elemento: e.target.value})} required>
                            <option value="">Seleccione Unidad...</option>
                            {UNIDADES_AE.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>

                        <div style={styles.geoBox}>
                            <label style={styles.label}>Referencia de Aeródromo:</label>
                            <select onChange={handleAeropuerto} style={styles.input} value={formData.locNombre}>
                                <option value="">Carga rápida por Aeródromo...</option>
                                {AEROPUERTOS_ESTANDAR.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                            </select>
                            
                            <label style={styles.label}>Coordenadas Actuales (GMS):</label>
                            <div style={styles.row}>
                                <input type="number" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, latG: e.target.value})} value={formData.latG}/>
                                <input type="number" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, latM: e.target.value})} value={formData.latM}/>
                                <input type="number" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, latS: e.target.value})} value={formData.latS}/>
                                <select style={styles.inputShort} onChange={(e)=>setFormData({...formData, latDir: e.target.value})} value={formData.latDir}>
                                    <option value="S">S</option><option value="N">N</option>
                                </select>
                            </div>
                            <div style={styles.row}>
                                <input type="number" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, lngG: e.target.value})} value={formData.lngG}/>
                                <input type="number" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, lngM: e.target.value})} value={formData.lngM}/>
                                <input type="number" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, lngS: e.target.value})} value={formData.lngS}/>
                                <select style={styles.inputShort} onChange={(e)=>setFormData({...formData, lngDir: e.target.value})} value={formData.lngDir}>
                                    <option value="W">W</option><option value="E">E</option>
                                </select>
                            </div>
                        </div>

                        <label style={styles.label}>NOTAS / TRIPULACIÓN / COMBUSTIBLE:</label>
                        <textarea style={styles.textarea} value={formData.notasMarginales} onChange={(e) => setFormData({...formData, notasMarginales: e.target.value})} required />

                        <button type="submit" style={editingId ? styles.btnUpdate : styles.btn}>
                            {editingId ? '💾 GUARDAR CAMBIOS' : '🚀 LANZAR VUELO'}
                        </button>
                        {editingId && <button type="button" onClick={() => setEditingId(null)} style={styles.btnCancel}>CANCELAR</button>}
                    </form>
                </div>

                <div style={styles.logCard}>
                    <h3 style={{ color: '#f39c12', borderBottom: '1px solid #f39c12', paddingBottom: '10px' }}>🛰️ OPERACIONES EN RADAR</h3>
                    <div style={styles.scrollArea}>
                        {misionesActivas.length === 0 ? <p style={{color: '#7f8c8d'}}>No hay vuelos activos en tiempo real.</p> : 
                        misionesActivas.map(m => (
                            <div key={m._id} style={styles.misionItem}>
                                <div style={{fontWeight: 'bold', color: '#ecf0f1'}}>{m.aeronave} - {m.matricula}</div>
                                <div style={{fontSize: '0.8rem', color: '#bdc3c7'}}>{m.title}</div>
                                <div style={{fontSize: '0.7rem', color: '#f39c12'}}>{m.elemento}</div>
                                <div style={styles.btnRow}>
                                    <button onClick={() => handleEdit(m)} style={styles.btnSmall}>RE-POSICIONAR</button>
                                    <button onClick={() => handleFinalizar(m._id)} style={styles.btnSmallRed}>FINALIZAR</button>
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
    container: { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', maxWidth: '1400px', margin: '0 auto' },
    card: { backgroundColor: '#1e272e', color: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #f39c12' },
    logCard: { backgroundColor: '#1e272e', color: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #7f8c8d' },
    scrollArea: { maxHeight: '600px', overflowY: 'auto', marginTop: '15px' },
    misionItem: { backgroundColor: '#2f3542', padding: '12px', borderRadius: '8px', marginBottom: '10px', borderLeft: '4px solid #f39c12' },
    title: { color: '#f39c12', margin: '0', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '2px' },
    subtitle: { textAlign: 'center', fontSize: '0.75rem', marginBottom: '20px', letterSpacing: '2px', color: '#7f8c8d' },
    label: { display: 'block', marginBottom: '5px', fontSize: '0.8rem', fontWeight: 'bold', color: '#bdc3c7' },
    input: { width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: 'none', backgroundColor: '#2f3542', color: 'white', fontFamily: 'monospace' },
    inputTriple: { width: '23%', padding: '8px', marginBottom: '5px', borderRadius: '4px', border: 'none', backgroundColor: '#3d4451', color: 'white', textAlign: 'center' },
    inputShort: { width: '20%', padding: '8px', marginBottom: '5px', borderRadius: '4px', border: 'none', backgroundColor: '#f39c12', color: 'black', fontWeight: 'bold' },
    row: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px' },
    geoBox: { padding: '15px', backgroundColor: '#3d4451', borderRadius: '8px', marginBottom: '15px' },
    textarea: { width: '100%', height: '80px', padding: '10px', borderRadius: '6px', backgroundColor: '#2f3542', color: 'white', border: 'none', resize: 'none', marginBottom: '10px', fontFamily: 'monospace' },
    btn: { width: '100%', padding: '15px', backgroundColor: '#d35400', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '2px' },
    btnUpdate: { width: '100%', padding: '15px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
    btnCancel: { width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#bdc3c7', border: 'none', cursor: 'pointer', marginTop: '5px' },
    btnRow: { display: 'flex', gap: '10px', marginTop: '10px' },
    btnSmall: { padding: '5px 10px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' },
    btnSmallRed: { padding: '5px 10px', backgroundColor: '#c0393b', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }
};

export default CargaTactica;