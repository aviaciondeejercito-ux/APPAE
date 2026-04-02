import React, { useState, useEffect } from 'react';
import { getActiveOperations, createEvent, updateEvent, deleteEvent, getAircrafts } from '../services/api';
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
    { nombre: "SANU - SAN JUAN", lat: -31.571, lng: -68.418 },
    { nombre: "SARE - RESISTENCIA", lat: -27.449, lng: -59.056 },
    { nombre: "SARL - PASO DE LOS LIBRES", lat: -29.691, lng: -57.152 },
    { nombre: "SAAJ - JUNÍN", lat: -34.545, lng: -60.923 },
    { nombre: "SAOU - GENERAL PICO", lat: -35.696, lng: -63.758 },
    { nombre: "SAAR - ROSARIO (AD)", lat: -32.904, lng: -60.785 },
    { nombre: "SAXG - GUALEGUAYCHÚ", lat: -33.012, lng: -58.613 },
    { nombre: "SAVV - VIEDMA", lat: -40.869, lng: -63.003 },
    { nombre: "SAVT - TRELEW", lat: -43.211, lng: -65.270 },
    { nombre: "SAWC - EL CALAFATE", lat: -50.280, lng: -72.053 },
    { nombre: "SAWO - USHUAIA", lat: -54.843, lng: -68.295 },
    { nombre: "SAJU - JUJUY", lat: -24.392, lng: -64.914 },
    { nombre: "SANL - SAN LUIS", lat: -33.273, lng: -66.355 },
    { nombre: "SANC - RÍO HONDO", lat: -27.508, lng: -64.935 },
    { nombre: "SAAG - GUALEGUAY", lat: -33.155, lng: -59.387 },
    { nombre: "SAAL - ALVEAR", lat: -33.004, lng: -60.627 },
    { nombre: "LAD - BATERÍAS (IMARA)", lat: -38.991, lng: -62.115 },
    { nombre: "LAD - ARROYO DULCE", lat: -34.148, lng: -60.395 },
    { nombre: "LAD - LA MEZQUITA (CBA)", lat: -31.428, lng: -64.312 },
    { nombre: "LAD - MONTE CASEROS", lat: -30.244, lng: -57.643 },
    { nombre: "LAD - PRIMAVERA (ANTÁRTIDA)", lat: -64.155, lng: -60.895 },
    { nombre: "LAD - PULMARÍ", lat: -39.117, lng: -71.083 },
    { nombre: "LAD - RÍO MAYO", lat: -45.688, lng: -70.252 },
    { nombre: "LAD - UMBE", lat: -34.883, lng: -58.483 },
    { nombre: "AEROCLUB - SAN MIGUEL", lat: -34.542, lng: -58.712 },
    { nombre: "AEROCLUB - LUJÁN", lat: -34.582, lng: -59.191 },
    { nombre: "AEROCLUB - MERCEDES", lat: -34.693, lng: -59.418 }
];

const UNIDADES_AE = [
    "B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8",
    "ESC AV EXPL ATQ 602", "SEC AE 11", "EC AE", "SEC AE MTE 3",
    "SEC AE DR", "B AB MANT AERON 601", "SEC AE MTE 12", "SEC AE 9"
];

const CargaTactica = () => {
    const rawUser = localStorage.getItem('user');
    const user = rawUser ? JSON.parse(rawUser) : { elemento: '', role: '', id: '', name: 'OPERADOR_DESCONOCIDO' };
    const isMandoTotal = ['admin', 'boss', 'director', 'oto', 'otoae'].includes(user.role?.toLowerCase());

    const [misionesActivas, setMisionesActivas] = useState([]);
    const [flotaES, setFlotaES] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showDestino, setShowDestino] = useState(false);
    
    const initialState = {
        title: '', 
        elemento: user.elemento || '', 
        notasMarginales: '', 
        aeronaveId: '', 
        sda: '', 
        matricula: '', 
        latG: 34, latM: 31, latS: 40, latDir: 'S',
        lngG: 58, lngM: 38, lngS: 29, lngDir: 'W',
        locNombre: '',
        destLatG: 34, destLatM: 31, destLatS: 40, destLatDir: 'S',
        destLngG: 58, destLngM: 38, destLngS: 29, destLngDir: 'W',
        destNombre: '',
        etapa: 'operativo',
        createdBy: user.id || user._id || '',
        userName: user.name || user.username || 'S/N'
    };

    const [formData, setFormData] = useState(initialState);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const [evRes, airRes] = await Promise.all([getActiveOperations(), getAircrafts()]);
            const dataEvents = Array.isArray(evRes) ? evRes : (evRes.data || []);
            const dataAir = Array.isArray(airRes) ? airRes : (airRes.data || []);

            const activas = dataEvents.filter(ev => {
                const esVueloActivo = ev.isRealTime === true;
                if (!isMandoTotal && user.elemento) {
                    return esVueloActivo && ev.elemento?.toUpperCase().includes(user.elemento.toUpperCase());
                }
                return esVueloActivo;
            });
            setMisionesActivas(activas);
            
            const flotaFiltrada = dataAir.filter(a => {
                const enServicio = a.estado === 'E/S';
                if (!isMandoTotal && user.elemento) {
                    return enServicio && a.unidad?.toUpperCase().includes(user.elemento.toUpperCase());
                }
                return enServicio;
            });
            setFlotaES(flotaFiltrada);
        } catch (error) {
            console.error("Error de enlace:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
        const interval = setInterval(cargarDatos, 15000);
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
        const s = Math.round((abs - g - (m / 60)) * 3600);
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

    const handleAeropuerto = (e, target = 'posicion') => {
        const apto = AEROPUERTOS_ESTANDAR.find(p => p.nombre === e.target.value);
        if (apto) {
            const latGMS = fromDecimal(apto.lat, 'lat');
            const lngGMS = fromDecimal(apto.lng, 'lng');
            
            if (target === 'posicion') {
                setFormData({ 
                    ...formData, 
                    locNombre: apto.nombre,
                    latG: latGMS.g, latM: latGMS.m, latS: latGMS.s, latDir: latGMS.dir,
                    lngG: lngGMS.g, lngM: lngGMS.m, lngS: lngGMS.s, lngDir: lngGMS.dir
                });
            } else {
                setFormData({ 
                    ...formData, 
                    destNombre: apto.nombre,
                    destLatG: latGMS.g, destLatM: latGMS.m, destLatS: latGMS.s, destLatDir: latGMS.dir,
                    destLngG: lngGMS.g, destLngM: lngGMS.m, destLngS: lngGMS.s, destLngDir: lngGMS.dir
                });
            }
        }
    };

    const handleEdit = (mision) => {
        const latVal = mision.lat ?? mision.misionDetalle?.lat ?? 0;
        const lngVal = mision.lng ?? mision.misionDetalle?.lng ?? 0;
        
        const latGMS = fromDecimal(latVal, 'lat');
        const lngGMS = fromDecimal(lngVal, 'lng');

        let destData = { destNombre: '', destLatG: 34, destLatM: 31, destLatS: 40, destLatDir: 'S', destLngG: 58, destLngM: 38, destLngS: 29, destLngDir: 'W' };
        
        if (mision.destino && mision.destino.lat) {
            const dLatGMS = fromDecimal(mision.destino.lat, 'lat');
            const dLngGMS = fromDecimal(mision.destino.lng, 'lng');
            destData = {
                destNombre: mision.destino.nombre || 'DESTINO TÁCTICO',
                destLatG: dLatGMS.g, destLatM: dLatGMS.m, destLatS: dLatGMS.s, destLatDir: dLatGMS.dir,
                destLngG: dLngGMS.g, destLngM: dLngGMS.m, destLngS: dLngGMS.s, destLngDir: dLngGMS.dir
            };
            setShowDestino(true);
        } else {
            setShowDestino(false);
        }
        
        setEditingId(mision._id);
        setFormData({
            ...formData,
            title: mision.title || '',
            elemento: mision.elemento || '',
            notasMarginales: mision.notasMarginales || mision.notes || '',
            aeronaveId: 'EDIT_MODE',
            sda: mision.misionDetalle?.aeronave || mision.aeronave || '',
            matricula: mision.misionDetalle?.matricula || mision.matricula || '',
            latG: latGMS.g, latM: latGMS.m, latS: latGMS.s, latDir: latGMS.dir,
            lngG: lngGMS.g, lngM: lngGMS.m, lngS: lngGMS.s, lngDir: lngGMS.dir,
            locNombre: mision.ubicacion?.nombre || 'POSICIÓN TÁCTICA',
            ...destData
        });
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const latDec = toDecimal(formData.latG, formData.latM, formData.latS, formData.latDir);
        const lngDec = toDecimal(formData.lngG, formData.lngM, formData.lngS, formData.lngDir);

        const payload = {
            title: formData.title.toUpperCase(),
            elemento: formData.elemento.toUpperCase(),
            notes: formData.notasMarginales.toUpperCase(),
            notasMarginales: formData.notasMarginales.toUpperCase(),
            isRealTime: true,
            status: 'operativo',
            tipoApoyo: 'VUELO',
            etapa: formData.etapa || 'operativo',
            createdBy: formData.createdBy,
            userName: formData.userName,
            lat: latDec, 
            lng: lngDec,
            ubicacion: {
                nombre: (formData.locNombre || 'POSICIÓN TÁCTICA').toUpperCase(),
                lat: latDec,
                lng: lngDec
            },
            misionDetalle: {
                aeronave: formData.sda.toUpperCase(),
                matricula: formData.matricula.toUpperCase(),
                tipoIcono: (formData.sda.includes('AE') || formData.sda.includes('C-')) ? 'ala_fija' : 'ala_rotativa',
                isRealTime: true,
                lat: latDec,
                lng: lngDec,
                comandante: 'S/D', 
                copiloto: 'S/D',
                mecanico: 'S/D',
                pax: '0',
                carga: '0'
            }
        };

        // Lógica de dos puntos: si showDestino está activo, se añade al payload
        if (showDestino && (formData.destNombre || formData.destLatG)) {
            const dLatDec = toDecimal(formData.destLatG, formData.destLatM, formData.destLatS, formData.destLatDir);
            const dLngDec = toDecimal(formData.destLngG, formData.destLngM, formData.destLngS, formData.destLngDir);
            payload.destino = {
                nombre: (formData.destNombre || 'DESTINO TÁCTICO').toUpperCase(),
                lat: dLatDec,
                lng: dLngDec
            };
        } else {
            payload.destino = null; // Para misiones estáticas
        }

        try {
            if (editingId) {
                await updateEvent(editingId, payload);
                Swal.fire({ title: 'ACTUALIZADO', text: 'Vector reposicionado correctamente', icon: 'success', background: '#1e272e', color: '#fff' });
            } else {
                await createEvent(payload);
                Swal.fire({ title: 'LANZADO', text: 'Misión activa en radar', icon: 'success', background: '#1e272e', color: '#fff' });
            }
            
            setFormData(initialState);
            setEditingId(null);
            setShowDestino(false);
            cargarDatos();
        } catch (error) {
            console.error("Detalle del Error:", error.response?.data);
            Swal.fire({ 
                title: 'ERROR DE VALIDACIÓN', 
                text: error.response?.data?.message || 'Error en la estructura del vector.', 
                icon: 'error', 
                background: '#1e272e', 
                color: '#fff' 
            });
        }
    };

    const handleFinalizar = async (id) => {
        const result = await Swal.fire({
            title: '¿FINALIZAR MISIÓN?',
            text: "Se eliminará la aeronave del Mapa",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'BORRAR',
            background: '#1e272e',
            color: '#fff'
        });

        if (result.isConfirmed) {
            try {
                await deleteEvent(id);
                cargarDatos();
            } catch (error) {
                Swal.fire('ERROR', 'No tiene permisos para dar de baja este vuelo', 'error');
            }
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <div style={styles.card}>
                    <h2 style={styles.headerTitle}>
                        {editingId ? '📍 RE-POSICIONAR AERONAVE' : '⚡ NUEVA OPERACIÓN EN TIEMPO REAL'}
                    </h2>
                    <form onSubmit={handleSubmit}>
                        <div style={styles.formGrid}>
                            <div style={{gridColumn: 'span 2'}}>
                                <label style={styles.label}>MISIÓN / INDICATIVO</label>
                                <input style={styles.input} value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required placeholder="EJ: TRASLADO SANITARIO" />
                            </div>

                            <div>
                                <label style={styles.label}>AERONAVE SELECCIONADA</label>
                                <select style={styles.input} value={formData.aeronaveId} onChange={handleAeronaveSelect} required disabled={!!editingId}>
                                    {editingId ? (
                                        <option value="EDIT_MODE">{formData.sda} - {formData.matricula}</option>
                                    ) : (
                                        <>
                                            <option value="">-- Seleccionar SdA --</option>
                                            {flotaES.map(a => <option key={a._id} value={a._id}>{a.sda} - {a.matricula}</option>)}
                                        </>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label style={styles.label}>UNIDAD RESPONSABLE</label>
                                <select style={styles.input} value={formData.elemento} onChange={(e) => setFormData({...formData, elemento: e.target.value})} disabled={!isMandoTotal} required>
                                    <option value="">-- Unidad --</option>
                                    {UNIDADES_AE.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={styles.geoBox}>
                            <label style={styles.label}>COORDENADAS Y REFERENCIA DE POSICIÓN ACTUAL (INICIO)</label>
                            <select onChange={(e) => handleAeropuerto(e, 'posicion')} style={{...styles.input, marginBottom: '15px'}} value={formData.locNombre}>
                                <option value="">Cargar desde Aeródromo...</option>
                                {AEROPUERTOS_ESTANDAR.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                            </select>
                            
                            <div style={styles.row}>
                                <div style={styles.coordGroup}>
                                    <input type="number" step="any" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, latG: e.target.value})} value={formData.latG} placeholder="G"/>
                                    <input type="number" step="any" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, latM: e.target.value})} value={formData.latM} placeholder="M"/>
                                    <input type="number" step="any" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, latS: e.target.value})} value={formData.latS} placeholder="S"/>
                                    <select style={styles.inputShort} onChange={(e)=>setFormData({...formData, latDir: e.target.value})} value={formData.latDir}><option value="S">S</option><option value="N">N</option></select>
                                </div>
                                <div style={styles.coordGroup}>
                                    <input type="number" step="any" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, lngG: e.target.value})} value={formData.lngG} placeholder="G"/>
                                    <input type="number" step="any" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, lngM: e.target.value})} value={formData.lngM} placeholder="M"/>
                                    <input type="number" step="any" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, lngS: e.target.value})} value={formData.lngS} placeholder="S"/>
                                    <select style={styles.inputShort} onChange={(e)=>setFormData({...formData, lngDir: e.target.value})} value={formData.lngDir}><option value="W">W</option><option value="E">E</option></select>
                                </div>
                            </div>
                        </div>

                        <button type="button" onClick={() => setShowDestino(!showDestino)} style={styles.btnDestino}>
                            {showDestino ? '❌ QUITAR DESTINO' : '➕ AGREGAR DESTINO (DESPLAZAMIENTO)'}
                        </button>

                        {showDestino && (
                            <div style={{...styles.geoBox, borderColor: '#f39c12', marginTop: '10px'}}>
                                <label style={styles.label}>COORDENADAS Y REFERENCIA DE DESTINO (FIN)</label>
                                <select onChange={(e) => handleAeropuerto(e, 'destino')} style={{...styles.input, marginBottom: '15px'}} value={formData.destNombre}>
                                    <option value="">Cargar Aeródromo de Destino...</option>
                                    {AEROPUERTOS_ESTANDAR.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                                </select>
                                
                                <div style={styles.row}>
                                    <div style={styles.coordGroup}>
                                        <input type="number" step="any" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, destLatG: e.target.value})} value={formData.destLatG} placeholder="G"/>
                                        <input type="number" step="any" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, destLatM: e.target.value})} value={formData.destLatM} placeholder="M"/>
                                        <input type="number" step="any" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, destLatS: e.target.value})} value={formData.destLatS} placeholder="S"/>
                                        <select style={styles.inputShort} onChange={(e)=>setFormData({...formData, destLatDir: e.target.value})} value={formData.destLatDir}><option value="S">S</option><option value="N">N</option></select>
                                    </div>
                                    <div style={styles.coordGroup}>
                                        <input type="number" step="any" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, destLngG: e.target.value})} value={formData.destLngG} placeholder="G"/>
                                        <input type="number" step="any" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, destLngM: e.target.value})} value={formData.destLngM} placeholder="M"/>
                                        <input type="number" step="any" style={styles.inputTriple} onChange={(e)=>setFormData({...formData, destLngS: e.target.value})} value={formData.destLngS} placeholder="S"/>
                                        <select style={styles.inputShort} onChange={(e)=>setFormData({...formData, destLngDir: e.target.value})} value={formData.destLngDir}><option value="W">W</option><option value="E">E</option></select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <label style={{...styles.label, marginTop: '20px'}}>NOTAS / TRIPULACIÓN / NOVEDADES</label>
                        <textarea style={styles.textarea} value={formData.notasMarginales} onChange={(e) => setFormData({...formData, notasMarginales: e.target.value})} required />

                        <button type="submit" style={editingId ? styles.btnUpdate : styles.btn}>
                            {editingId ? 'GUARDAR CAMBIOS / REPOSICIONAR' : 'LANZAR OPERACIÓN'}
                        </button>
                        {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData(initialState); setShowDestino(false)}} style={styles.btnCancel}>CANCELAR EDICIÓN</button>}
                    </form>
                </div>

                <div style={styles.logCard}>
                    <div style={styles.logHeader}>
                        <h3 style={{ margin: 0, fontSize: '1rem' }}>📡 Operaciones en Desarrollo</h3>
                        <button onClick={cargarDatos} style={styles.btnRefresh}>{loading ? '...' : 'SINCRO'}</button>
                    </div>
                    <div style={styles.scrollArea}>
                        {misionesActivas.length === 0 ? (
                            <div style={styles.emptyMsg}>NO SE DETECTAN AERONAVES ACTIVAS</div>
                        ) : (
                            misionesActivas.map(m => (
                                <div key={m._id} style={styles.misionItem}>
                                    <div style={styles.misionHeader}>
                                        <span style={{color: '#f39c12'}}>{m.misionDetalle?.aeronave || m.aeronave}</span>
                                        <span style={{backgroundColor: '#1e272e', padding: '2px 6px', borderRadius: '4px'}}>{m.misionDetalle?.matricula || m.matricula}</span>
                                    </div>
                                    <div style={styles.misionTitle}>{m.title}</div>
                                    <div style={styles.misionSub}>Unidad: {m.elemento}</div>
                                    <div style={styles.btnRow}>
                                        <button onClick={() => handleEdit(m)} style={styles.btnSmall}>RE-POSICIONAR</button>
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
    page: { padding: '30px', backgroundColor: '#0f1418', minHeight: '100vh', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
    container: { display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '30px', maxWidth: '1450px', margin: '0 auto' },
    card: { backgroundColor: '#1a1f25', padding: '25px', borderRadius: '12px', border: '1px solid #2c3e50', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
    logCard: { backgroundColor: '#1a1f25', borderRadius: '12px', border: '1px solid #2c3e50', display: 'flex', flexDirection: 'column', height: 'fit-content', maxHeight: '85vh' },
    logHeader: { padding: '20px', borderBottom: '1px solid #2c3e50', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#f39c12' },
    headerTitle: { color: '#f39c12', fontSize: '1.2rem', marginBottom: '25px', borderLeft: '4px solid #f39c12', paddingLeft: '15px' },
    scrollArea: { padding: '20px', overflowY: 'auto' },
    misionItem: { backgroundColor: '#252c35', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #34495e', transition: 'all 0.3s' },
    misionHeader: { display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '8px' },
    misionTitle: { fontSize: '0.85rem', color: '#ecf0f1', marginBottom: '5px' },
    misionSub: { fontSize: '0.75rem', color: '#7f8c8d' },
    emptyMsg: { textAlign: 'center', color: '#576574', marginTop: '50px', fontSize: '0.8rem', letterSpacing: '2px' },
    label: { display: 'block', fontSize: '0.7rem', fontWeight: 'bold', color: '#95a5a6', marginBottom: '8px', letterSpacing: '1px' },
    input: { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #2c3e50', backgroundColor: '#0f1418', color: 'white', fontSize: '0.9rem' },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' },
    geoBox: { padding: '20px', backgroundColor: '#0f1418', borderRadius: '8px', marginBottom: '10px', border: '1px solid #2c3e50' },
    row: { display: 'flex', gap: '20px' },
    coordGroup: { flex: 1, display: 'flex', gap: '5px' },
    inputTriple: { width: '30%', padding: '10px', borderRadius: '4px', border: '1px solid #2c3e50', backgroundColor: '#1a1f25', color: 'white', textAlign: 'center' },
    inputShort: { width: '25%', padding: '10px', borderRadius: '4px', border: 'none', backgroundColor: '#f39c12', color: '#000', fontWeight: 'bold' },
    textarea: { width: '100%', height: '100px', padding: '12px', borderRadius: '6px', backgroundColor: '#0f1418', color: 'white', border: '1px solid #2c3e50', resize: 'none', marginBottom: '25px' },
    btn: { width: '100%', padding: '16px', backgroundColor: '#d35400', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' },
    btnUpdate: { width: '100%', padding: '16px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
    btnDestino: { width: '100%', padding: '10px', backgroundColor: '#1e272e', color: '#f39c12', border: '1px dashed #f39c12', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' },
    btnCancel: { width: '100%', marginTop: '10px', padding: '10px', backgroundColor: 'transparent', color: '#bdc3c7', border: '1px solid #34495e', borderRadius: '6px', cursor: 'pointer' },
    btnRefresh: { padding: '6px 12px', backgroundColor: 'transparent', color: '#f39c12', border: '1px solid #f39c12', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem' },
    btnRow: { display: 'flex', gap: '10px', marginTop: '15px' },
    btnSmall: { flex: 1, padding: '8px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' },
    btnSmallRed: { flex: 1, padding: '8px', backgroundColor: '#c0392b', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }
};

export default CargaTactica;