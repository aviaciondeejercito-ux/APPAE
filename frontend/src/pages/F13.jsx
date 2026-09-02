import React, { useState, useEffect } from 'react';
import { Save, Trash2, Clock } from 'lucide-react';
import { getF13s, registrarF13, deleteF13, getAircrafts } from '../services/api'; 

const F13Component = () => {
    const [registrosF13, setRegistrosF13] = useState([]);
    const [aeronaves, setAeronaves] = useState([]); 
    const [unidadesDisponibles, setUnidadesDisponibles] = useState([]); 
    const [unidadNavegacion, setUnidadNavegacion] = useState('');
    const [loading, setLoading] = useState(false);

    // --- DATOS PERSISTIDOS DE SESIÓN ---
    const usuarioSesion = {
        username: localStorage.getItem('username') || "Operador",
        role: (localStorage.getItem('role') || localStorage.getItem('rol') || 'USER').toUpperCase().trim(),
        elemento: (localStorage.getItem('elemento') || '').toUpperCase().trim()
    };

    const isMandoEstrategico = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OTOAE'].includes(usuarioSesion.role) || usuarioSesion.elemento === 'COMANDO';
    const roleNormalizado = usuarioSesion.role;

    const puedeCargarF13 = ['ADMIN', 'OPERACIONES', 'OFICINA_TECNICA', 'OFICINATECNICA', 'USER'].includes(roleNormalizado); 
    const puedeEliminarF13 = ['ADMIN', 'OPERACIONES', 'OFICINA_TECNICA', 'OFICINATECNICA', 'JEFE'].includes(roleNormalizado); 

    // --- ESTADO DEL FORMULARIO ---
    const [formData, setFormData] = useState({
        fecha: new Date().toISOString().split('T')[0],
        aeronave: '', 
        misionVuelo: '',
        horasALaFecha: 0,
        horasDelDia: 0,
        ciclosALaFecha: 0,
        ciclos: 0,
        apu: 0,
        aterrizajes: 1,
        comandante: '', 
        mecanico: '',   
        inspeccionDiaria: '',   
        inspeccionPrevuelo: '', 
        inspeccionPostvuelo: '',
        esHistorico: false
    });

    const misiones = [
        "Entrenamiento", "Transporte de Personal", "Transporte de Carga", 
        "Sanitario", "Rappel", "Fast Rope", "Carga Extterna", "Helibalde", 
        "NVG", "Lanzamiento de Paracaidistas", "Lanzamiento de Carga", 
        "Lanzamiento de Buzos", "Tiro Aereo", "Visual Nocturno", "IFR", 
        "Instruccion", "Calificacion"
    ];

    useEffect(() => {
        fetchF13s();
        fetchAeronaves();
    }, [unidadNavegacion]);

    const fetchF13s = async () => {
        try {
            const res = await getF13s();
            const todosLosF13 = res.data || [];
            
            const filtradosPorUnidad = todosLosF13.filter(r => {
                if (!r.aeronave) return false;
                const unidadAeronave = typeof r.aeronave === 'object' ? r.aeronave.unidad : '';
                return unidadAeronave && unidadAeronave.trim().toUpperCase() === unidadNavegacion.toUpperCase();
            });

            setRegistrosF13(filtradosPorUnidad);
        } catch (error) {
            console.error("Error cargando historial de F-13", error);
        }
    };

    const fetchAeronaves = async () => {
        try {
            const respuesta = await getAircrafts();
            let listaAviones = [];
            
            if (respuesta && respuesta.data && Array.isArray(respuesta.data.data)) {
                listaAviones = respuesta.data.data; 
            } else if (respuesta && Array.isArray(respuesta.data)) {
                listaAviones = respuesta.data;
            } else if (Array.isArray(respuesta)) {
                listaAviones = respuesta;
            }
            
            setAeronaves(listaAviones);

            const unidadesUnicas = [...new Set(listaAviones.map(a => a.unidad?.trim().toUpperCase()).filter(Boolean))];
            setUnidadesDisponibles(unidadesUnicas);

            if (!unidadNavegacion) {
                if (isMandoEstrategico) {
                    const unidadInicialAdmin = unidadesUnicas.includes(usuarioSesion.elemento) ? usuarioSesion.elemento : (unidadesUnicas[0] || 'EC AE');
                    setUnidadNavegacion(unidadInicialAdmin);
                } else {
                    setUnidadNavegacion(usuarioSesion.elemento);
                }
            }
        } catch (error) {
            console.error("❌ Error al inicializar flota en módulo F-13:", error);
        }
    };

    // ⚡ AUTOLENADO DE HORAS Y CICLOS DE LA AERONAVE SELECCIONADA
    const handleAeronaveChange = (idSeleccionado) => {
        const seleccionada = aeronaves.find(a => (a._id?.$oid || a._id) === idSeleccionado);
        if (seleccionada) {
            setFormData(prev => ({
                ...prev,
                aeronave: idSeleccionado,
                horasALaFecha: seleccionada.tgPlaneadorActual || 0,
                ciclosALaFecha: seleccionada.tgPlaneadorLandings || 0
            }));
        } else {
            setFormData(prev => ({ ...prev, aeronave: idSeleccionado, horasALaFecha: 0, ciclosALaFecha: 0 }));
        }
    };

    const aeronavesFiltradas = aeronaves.filter(a => 
        a.unidad && String(a.unidad).trim().toUpperCase() === unidadNavegacion.toUpperCase()
    );

    const aeronavesDisponibles = aeronavesFiltradas.filter(a => a.estadoOperativo === 'E/S').length > 0
        ? aeronavesFiltradas.filter(a => a.estadoOperativo === 'E/S')
        : aeronavesFiltradas;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            ...formData,
            horasALaFecha: Number(formData.horasALaFecha),
            horasDelDia: Number(formData.horasDelDia),
            ciclosALaFecha: Number(formData.ciclosALaFecha),
            ciclos: Number(formData.ciclos || formData.aterrizajes),
            apu: Number(formData.apu),
            aterrizajes: Number(formData.aterrizajes),
            esHistorico: Boolean(formData.esHistorico),
            inspeccionDiaria: { 
                realizada: !!formData.inspeccionDiaria?.trim(), 
                firmaResponsable: formData.inspeccionDiaria?.trim() || "N/C", 
                fechaHora: new Date() 
            },
            inspeccionPrevuelo: { 
                realizada: !!formData.inspeccionPrevuelo?.trim(), 
                firmaResponsable: formData.inspeccionPrevuelo?.trim() || "N/C", 
                fechaHora: new Date() 
            },
            inspeccionPostvuelo: { 
                realizada: !!formData.inspeccionPostvuelo?.trim(), 
                firmaResponsable: formData.inspeccionPostvuelo?.trim() || "N/C", 
                fechaHora: new Date() 
            }
        };

        try {
            await registrarF13(payload);
            
            const msj = formData.esHistorico 
                ? "📜 Formulario F-13 registrado como HISTÓRICO (Sin alteración de totales en aeronave/componentes)."
                : "✅ Formulario F-13 registrado y acumuladores actualizados.";
                
            alert(msj);
            
            setFormData({
                fecha: new Date().toISOString().split('T')[0], aeronave: '', misionVuelo: '',
                horasALaFecha: 0, horasDelDia: 0, ciclosALaFecha: 0, ciclos: 0, apu: 0, aterrizajes: 1,
                comandante: '', mecanico: '',
                inspeccionDiaria: '', inspeccionPrevuelo: '', inspeccionPostvuelo: '',
                esHistorico: false
            });
            fetchF13s();
            fetchAeronaves();
        } catch (error) {
            alert("❌ Error: " + (error.response?.data?.msg || "Fallo al procesar el formulario F-13. Verifique su autenticación."));
        } finally {
            setLoading(false);
        }
    };

    const eliminarRegistro = async (id) => {
        if (!puedeEliminarF13) {
            alert("Acceso Denegado: Su nivel jerárquico o rol no permite anular registros de F-13.");
            return;
        }

        if (window.confirm("¿Seguro desea eliminar este registro? Se reajustarán las horas acumuladas de la aeronave de forma automática.")) {
            try {
                await deleteF13(id);
                alert("✅ Registro de F-13 eliminado y horas reajustadas.");
                fetchF13s();
                fetchAeronaves();
            } catch (error) {
                console.error("Error al eliminar F-13:", error);
                alert("❌ Error: " + (error.response?.data?.msg || "No se pudo eliminar el registro."));
            }
        }
    };

    const formatearFechaLocal = (fechaString) => {
        if (!fechaString) return 'S/D';
        const partes = fechaString.split('T')[0].split('-');
        if (partes.length !== 3) return new Date(fechaString).toLocaleDateString();
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Registro Histórico F-13 - Historial de Aeronaves</h1>
                    <span style={styles.subtitle}>Unidad: {unidadNavegacion || "SIN UNIDAD"} | Acceso: {roleNormalizado}</span>
                </div>
                
                {isMandoEstrategico && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#eef2f5', padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px' }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#444' }}>🛡️ UNIDAD GLOBAL:</label>
                        <select 
                            style={{ padding: '4px 8px', fontSize: '0.8rem', fontWeight: 'bold', outline: 'none', border: '1px solid #ccc', backgroundColor: '#fff' }}
                            value={unidadNavegacion}
                            onChange={(e) => setUnidadNavegacion(e.target.value)}
                        >
                            {unidadesDisponibles.map(un => (
                                <option key={un} value={un}>{un}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div style={styles.mainGrid}>
                {/* FORMULARIO DE CARGA */}
                <div style={{ ...styles.card, display: puedeCargarF13 ? 'block' : 'none' }}>
                    <h2 style={styles.cardTitle}><Save size={18} /> Llenado de Formulario F-13</h2>
                    <form onSubmit={handleSubmit} style={styles.form}>
                        
                        <div style={styles.row}>
                            <div style={styles.group}>
                                <label style={styles.label}>Fecha</label>
                                <input type="date" style={styles.input} value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} required />
                            </div>
                            <div style={styles.group}>
                                <label style={styles.label}>Aeronave en la Unidad</label>
                                <select style={styles.input} value={formData.aeronave} onChange={e => handleAeronaveChange(e.target.value)} required>
                                    <option value="">Seleccionar aeronave...</option>
                                    {aeronavesDisponibles.map(a => {
                                        const idAeronave = a._id?.$oid || a._id;
                                        return (
                                            <option key={idAeronave} value={idAeronave}>
                                                {a.matricula} - {a.sda} ({a.estadoOperativo})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>

                        <div style={styles.row}>
                            <div style={styles.group}>
                                <label style={styles.label}>Misión de Vuelo</label>
                                <select style={styles.input} value={formData.misionVuelo} onChange={e => setFormData({ ...formData, misionVuelo: e.target.value })} required>
                                    <option value="">Seleccionar...</option>
                                    {misiones.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div style={styles.group}>
                                <label style={styles.label}>Aterrizajes (Landings)</label>
                                <input type="number" min="1" style={styles.input} value={formData.aterrizajes} onChange={e => setFormData({ ...formData, aterrizajes: e.target.value, ciclos: e.target.value })} required />
                            </div>
                        </div>

                        <div style={styles.row}>
                            <div style={styles.group}>
                                <label style={styles.label}>Horas Previas (A la fecha)</label>
                                <input type="number" step="0.1" min="0" style={styles.input} value={formData.horasALaFecha} onChange={e => setFormData({ ...formData, horasALaFecha: e.target.value })} required />
                            </div>
                            <div style={styles.group}>
                                <label style={styles.label}>Horas del Día (Vuelo)</label>
                                <input type="number" step="0.1" min="0" style={styles.input} value={formData.horasDelDia} onChange={e => setFormData({ ...formData, horasDelDia: e.target.value })} required />
                            </div>
                        </div>

                        <div style={styles.row}>
                            <div style={styles.group}>
                                <label style={styles.label}>Ciclos / Landings del Día</label>
                                <input type="number" min="0" style={styles.input} value={formData.ciclos} onChange={e => setFormData({ ...formData, ciclos: e.target.value, aterrizajes: e.target.value })} />
                            </div>
                            <div style={styles.group}>
                                <label style={styles.label}>APU (Horas)</label>
                                <input type="number" step="0.1" min="0" style={styles.input} value={formData.apu} onChange={e => setFormData({ ...formData, apu: e.target.value })} />
                            </div>
                        </div>

                        <div style={styles.row}>
                            <div style={styles.group}>
                                <label style={styles.label}>Comandante de Aeronave</label>
                                <input type="text" placeholder="Ej: Cap. Pérez" style={styles.input} value={formData.comandante} onChange={e => setFormData({ ...formData, comandante: e.target.value })} required />
                            </div>
                            <div style={styles.group}>
                                <label style={styles.label}>Mecánico de a bordo</label>
                                <input type="text" placeholder="Ej: Subof. Prado" style={styles.input} value={formData.mecanico} onChange={e => setFormData({ ...formData, mecanico: e.target.value })} required />
                            </div>
                        </div>

                        <div style={styles.inspeccionContainer}>
                            <label style={{ ...styles.label, marginBottom: '8px', display: 'block' }}>Inspecciones Técnicas (Firmas / Observaciones)</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={styles.group}>
                                    <label style={{ ...styles.label, fontSize: '0.6rem', color: '#555' }}>Inspección Pre-vuelo</label>
                                    <input type="text" placeholder="Ingrese firma o novedades pre-vuelo" style={styles.inputSmall} value={formData.inspeccionPrevuelo} onChange={e => setFormData({ ...formData, inspeccionPrevuelo: e.target.value })} />
                                </div>
                                <div style={styles.group}>
                                    <label style={{ ...styles.label, fontSize: '0.6rem', color: '#555' }}>Inspección Diaria</label>
                                    <input type="text" placeholder="Ingrese firma o novedades diarias" style={styles.inputSmall} value={formData.inspeccionDiaria} onChange={e => setFormData({ ...formData, inspeccionDiaria: e.target.value })} />
                                </div>
                                <div style={styles.group}>
                                    <label style={{ ...styles.label, fontSize: '0.6rem', color: '#555' }}>Inspección Post-vuelo</label>
                                    <input type="text" placeholder="Ingrese firma o novedades post-vuelo" style={styles.inputSmall} value={formData.inspeccionPostvuelo} onChange={e => setFormData({ ...formData, inspeccionPostvuelo: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div style={styles.historicoBox}>
                            <input 
                                type="checkbox" 
                                id="esHistorico" 
                                checked={formData.esHistorico} 
                                onChange={e => setFormData({ ...formData, esHistorico: e.target.checked })}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <label htmlFor="esHistorico" style={styles.historicoLabel}>
                                📜 Carga Histórica / Retroactiva 
                                <span style={{ display: 'block', fontWeight: 'normal', color: '#856404', fontSize: '0.68rem', marginTop: '2px' }}>
                                    Guarda la planilla pero <b>NO incrementa</b> las horas/ciclos en la aeronave ni componentes.
                                </span>
                            </label>
                        </div>

                        <button disabled={loading} type="submit" style={styles.btnSave}>
                            {loading ? "REGISTRANDO F-13..." : "GUARDAR FORMULARIO F-13"}
                        </button>
                    </form>
                </div>

                {/* TABLA DE HISTORIAL */}
                <div style={{ ...styles.card, flex: 1 }}>
                    <h2 style={styles.cardTitle}><Clock size={18} /> Libretas F-13 Registradas</h2>
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.thead}>
                                    <th style={styles.th}>Fecha / Misión</th>
                                    <th style={styles.th}>Aeronave</th>
                                    <th style={styles.th}>Tiempos</th>
                                    <th style={styles.th}>Tripulación</th>
                                    <th style={styles.th}>Inspecciones</th>
                                    <th style={styles.th}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registrosF13.map(r => (
                                    <tr key={r._id?.$oid || r._id} style={styles.tr}>
                                        <td style={styles.td}>
                                            <div style={{ fontWeight: 'bold' }}>{formatearFechaLocal(r.fecha)}</div>
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                                                <span style={styles.misionTag}>{r.misionVuelo}</span>
                                                {r.esHistorico && (
                                                    <span style={styles.badgeHistorico}>📜 HISTÓRICO</span>
                                                )}
                                            </div>
                                            {r.creadoPor && (
                                                <div style={styles.operadorTag}>
                                                    <span>Cargó: {r.creadoPor.rango || r.creadoPor.nombre || ''} {r.creadoPor.apellido}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{ fontWeight: 'bold' }}>{r.aeronave?.sda || 'S/D'}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#004a99' }}>{r.aeronave?.matricula || 'S/D'}</div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={styles.hsBadge}>{r.horasDelDia} hs</div>
                                            <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '3px' }}>
                                                Total: {r.horasTotales} hs <br />
                                                Ciclos: {r.ciclos || r.aterrizajes || 0} | APU: {r.apu || 0} hs
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={styles.tripuList}>
                                                <span><strong>CMD:</strong> {r.comandante || 'N/C'}</span>
                                                <span><strong>MEC:</strong> {r.mecanico || 'N/C'}</span>
                                                <span style={{ fontSize: '0.7rem', color: '#666' }}>Aterrizajes: {r.aterrizajes}</span>
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {r.inspeccionPrevuelo?.realizada && r.inspeccionPrevuelo?.firmaResponsable !== "N/C" && (
                                                    <span style={styles.inspeccionOk}>Pre: {r.inspeccionPrevuelo.firmaResponsable}</span>
                                                )}
                                                {r.inspeccionDiaria?.realizada && r.inspeccionDiaria?.firmaResponsable !== "N/C" && (
                                                    <span style={styles.inspeccionOk}>Diaria: {r.inspeccionDiaria.firmaResponsable}</span>
                                                )}
                                                {r.inspeccionPostvuelo?.realizada && r.inspeccionPostvuelo?.firmaResponsable !== "N/C" && (
                                                    <span style={styles.inspeccionOk}>Post: {r.inspeccionPostvuelo.firmaResponsable}</span>
                                                )}
                                                {(!r.inspeccionPrevuelo?.realizada || r.inspeccionPrevuelo?.firmaResponsable === "N/C") && 
                                                 (!r.inspeccionDiaria?.realizada || r.inspeccionDiaria?.firmaResponsable === "N/C") && 
                                                 (!r.inspeccionPostvuelo?.realizada || r.inspeccionPostvuelo?.firmaResponsable === "N/C") && (
                                                    <span style={styles.inspeccionNo}>Sin Inspecciones</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            {puedeEliminarF13 && (
                                                <button onClick={() => eliminarRegistro(r._id?.$oid || r._id)} style={styles.btnDel}>
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {registrosF13.length === 0 && <div style={styles.noData}>No hay formularios F-13 cargados aún para esta unidad.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '20px', backgroundColor: '#f4f7f6', minHeight: 'calc(100vh - 65px)' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    title: { margin: 0, fontSize: '1.4rem', color: '#1b3a57', fontWeight: 'bold' },
    subtitle: { color: '#7f8c8d', fontSize: '0.85rem' },
    mainGrid: { display: 'flex', gap: '20px', alignItems: 'flex-start' },
    card: { backgroundColor: 'white', borderRadius: '8px', padding: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: '420px' },
    cardTitle: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#1b3a57', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px', fontWeight: 'bold', textTransform: 'uppercase' },
    form: { display: 'flex', flexDirection: 'column', gap: '10px' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    group: { display: 'flex', flexDirection: 'column', gap: '3px' },
    label: { fontSize: '0.65rem', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' },
    input: { padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.85rem', outline: 'none' },
    inputSmall: { padding: '6px 8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.75rem', outline: 'none' },
    btnSave: { backgroundColor: '#1b3a57', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '5px' },
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    thead: { backgroundColor: '#f9fafb' },
    th: { padding: '12px 8px', textAlign: 'left', fontSize: '0.65rem', color: '#4b5563', borderBottom: '2px solid #e5e7eb', textTransform: 'uppercase' },
    tr: { borderBottom: '1px solid #f3f4f6' },
    td: { padding: '10px 8px', fontSize: '0.8rem', verticalAlign: 'top' },
    hsBadge: { backgroundColor: '#1b3a57', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', display: 'inline-block', fontWeight: 'bold' },
    tripuList: { display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem' },
    misionTag: { backgroundColor: '#eff6ff', color: '#1e40af', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', display: 'inline-block' },
    badgeHistorico: { backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' },
    operadorTag: { fontSize: '0.68rem', color: '#4b5563', backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px', border: '1px dashed #d1d5db' },
    btnDel: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '4px' },
    noData: { textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '0.9rem' },
    inspeccionContainer: { border: '1px solid #e5e7eb', padding: '10px', borderRadius: '6px', backgroundColor: '#fafafa', marginTop: '5px' },
    inspeccionOk: { fontSize: '0.68rem', fontWeight: 'bold', color: '#166534', backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '3px' },
    inspeccionNo: { fontSize: '0.68rem', color: '#9ca3af', fontStyle: 'italic' },
    historicoBox: { display: 'flex', alignItems: 'flex-start', gap: '10px', backgroundColor: '#fff8e6', padding: '10px', borderRadius: '6px', border: '1px solid #ffe8a1', marginTop: '5px' },
    historicoLabel: { fontSize: '0.75rem', fontWeight: 'bold', color: '#664d03', cursor: 'pointer' }
};

export default F13Component;