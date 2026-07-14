import React, { useState, useEffect } from 'react';
import { Plane, Users, Clock, Save, Trash2, Calendar, ClipboardCheck, Eye } from 'lucide-react';
import API from '../services/api'; // Si tu carpeta 'services' está al mismo nivel que 'pages' dentro de 'src'[cite: 6]

const F13Component = () => {
    const [registrosF13, setRegistrosF13] = useState([]);
    const [aeronavesDisponibles, setAeronavesDisponibles] = useState([]);
    const [tripulantes, setTripulantes] = useState([]);
    const [loading, setLoading] = useState(false);

    // --- NORMALIZACIÓN DE ROLES (Adaptado para Oficina Técnica) ---
    const rawRole = localStorage.getItem('role') || 'user';
    const roleNormalizado = rawRole.toUpperCase().replace(/[\s_]/g, ''); // Remueve espacios y guiones bajos (ej: "OFICINA_TECNICA" -> "OFICINATECNICA")[cite: 6]
    const userUnidad = localStorage.getItem('elemento')?.trim().toUpperCase() || '';

    // 🌟 Oficina Técnica ("OFICINATECNICA") ahora está explícitamente autorizada para cargar y eliminar
    const puedeCargarF13 = ['ADMIN', 'OPERACIONES', 'OFICINATECNICA', 'USER'].includes(roleNormalizado);
    const puedeEliminarF13 = ['ADMIN', 'OPERACIONES', 'OFICINATECNICA', 'JEFE'].includes(roleNormalizado);

    // --- ESTADO DEL FORMULARIO ---
    const [formData, setFormData] = useState({
        fecha: '',
        aeronave: '', // Será un ObjectId de la Aeronave seleccionada[cite: 6]
        misionVuelo: '',
        horasALaFecha: 0,
        horasDelDia: 0,
        ciclos: 0,
        apu: 0,
        aterrizajes: 1,
        comandante: '', // ObjectId de Piloto[cite: 6]
        mecanico: '',   // ObjectId de Mecánico[cite: 6]
        // Inspecciones
        inspeccionDiaria: false,
        inspeccionPrevuelo: false,
        inspeccionPostvuelo: false
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
        fetchTripulantes();
    }, [userUnidad]);

    const fetchF13s = async () => {
        try {
            const res = await API.get('/f13');
            setRegistrosF13(res.data);
        } catch (error) {
            console.error("Error cargando historial de F-13", error);
        }
    };

    const fetchAeronaves = async () => {
        try {
            const res = await API.get('/f13/aeronaves-disponibles');
            setAeronavesDisponibles(res.data.aeronaves || []);
        } catch (error) {
            console.error("Error cargando aeronaves en servicio", error);
        }
    };

    const fetchTripulantes = async () => {
        try {
            const res = await API.get('/tripulantes');
            setTripulantes(res.data);
        } catch (error) {
            console.error("Error cargando tripulantes", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            ...formData,
            horasALaFecha: Number(formData.horasALaFecha),
            horasDelDia: Number(formData.horasDelDia),
            ciclos: Number(formData.ciclos),
            apu: Number(formData.apu),
            aterrizajes: Number(formData.aterrizajes),
            inspeccionDiaria: { realizada: formData.inspeccionDiaria, fechaHora: new Date() },
            inspeccionPrevuelo: { realizada: formData.inspeccionPrevuelo, fechaHora: new Date() },
            inspeccionPostvuelo: { realizada: formData.inspeccionPostvuelo, fechaHora: new Date() }
        };

        try {
            await API.post('/f13/nuevo', payload);
            alert("✅ Formulario F-13 registrado y acumuladores actualizados.");
            
            setFormData({
                fecha: '', aeronave: '', misionVuelo: '',
                horasALaFecha: 0, horasDelDia: 0, ciclos: 0, apu: 0, aterrizajes: 1,
                comandante: '', mecanico: '',
                inspeccionDiaria: false, inspeccionPrevuelo: false, inspeccionPostvuelo: false
            });
            fetchF13s();
        } catch (error) {
            alert("❌ Error: " + (error.response?.data?.msg || "Fallo al procesar el formulario F-13"));
        } finally {
            setLoading(false);
        }
    };

    const eliminarRegistro = async (id) => {
        if (!puedeEliminarF13) {
            alert("Acceso Denegado: Su nivel jerárquico o rol no permite anular registros de F-13.");
            return;
        }

        if (window.confirm("¿Seguro desea eliminar este registro? Se reajustarán las horas acumuladas de la aeronave de forma automática en el sistema.")) {
            try {
                await API.delete(`/f13/eliminar/${id}`);
                alert("✅ Registro de F-13 eliminado y horas reajustadas correctamente.");
                fetchF13s();
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
                    <h1 style={styles.title}>Registro Histórico F-13 - Historial de Aeronave</h1>
                    <span style={styles.subtitle}>Unidad: {userUnidad || "SIN UNIDAD"} | Acceso: {roleNormalizado}</span>
                </div>
            </div>

            <div style={styles.mainGrid}>
                {/* FORMULARIO DE CARGA (IZQUIERDA) */}
                <div style={{ ...styles.card, display: puedeCargarF13 ? 'block' : 'none' }}>
                    <h2 style={styles.cardTitle}><Save size={18} /> Llenado de Formulario F-13</h2>
                    <form onSubmit={handleSubmit} style={styles.form}>
                        
                        <div style={styles.row}>
                            <div style={styles.group}>
                                <label style={styles.label}>Fecha</label>
                                <input type="date" style={styles.input} value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} required />
                            </div>
                            <div style={styles.group}>
                                <label style={styles.label}>Aeronave en Servicio</label>
                                <select style={styles.input} value={formData.aeronave} onChange={e => setFormData({ ...formData, aeronave: e.target.value })} required>
                                    <option value="">Seleccionar aeronave...</option>
                                    {aeronavesDisponibles.map(a => (
                                        <option key={a._id} value={a._id}>{a.modelo} ({a.matricula})</option>
                                    ))}
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
                                <label style={styles.label}>Aterrizajes</label>
                                <input type="number" min="1" style={styles.input} value={formData.aterrizajes} onChange={e => setFormData({ ...formData, aterrizajes: e.target.value })} required />
                            </div>
                        </div>

                        <div style={styles.row}>
                            <div style={styles.group}>
                                <label style={styles.label}>Horas a la Fecha (Anteriores)</label>
                                <input type="number" step="0.1" min="0" style={styles.input} value={formData.horasALaFecha} onChange={e => setFormData({ ...formData, horasALaFecha: e.target.value })} required />
                            </div>
                            <div style={styles.group}>
                                <label style={styles.label}>Horas del Día (Vuelo)</label>
                                <input type="number" step="0.1" min="0" style={styles.input} value={formData.horasDelDia} onChange={e => setFormData({ ...formData, horasDelDia: e.target.value })} required />
                            </div>
                        </div>

                        <div style={styles.row}>
                            <div style={styles.group}>
                                <label style={styles.label}>Ciclos</label>
                                <input type="number" min="0" style={styles.input} value={formData.ciclos} onChange={e => setFormData({ ...formData, ciclos: e.target.value })} />
                            </div>
                            <div style={styles.group}>
                                <label style={styles.label}>APU</label>
                                <input type="number" step="0.1" min="0" style={styles.input} value={formData.apu} onChange={e => setFormData({ ...formData, apu: e.target.value })} />
                            </div>
                        </div>

                        <div style={styles.row}>
                            <div style={styles.group}>
                                <label style={styles.label}>Comandante</label>
                                <select style={styles.input} value={formData.comandante} onChange={e => setFormData({ ...formData, comandante: e.target.value })} required>
                                    <option value="">Seleccionar comandante...</option>
                                    {tripulantes.filter(t => t.rolActual === 'Piloto').map(t => (
                                        <option key={t._id} value={t._id}>{t.grado} {t.apellido}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.group}>
                                <label style={styles.label}>Mecánico de a bordo</label>
                                <select style={styles.input} value={formData.mecanico} onChange={e => setFormData({ ...formData, mecanico: e.target.value })} required>
                                    <option value="">Seleccionar mecánico...</option>
                                    {tripulantes.filter(t => t.rolActual === 'Mecanico' || t.rolActual === 'Suboficial').map(t => (
                                        <option key={t._id} value={t._id}>{t.grado} {t.apellido}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* SECCIÓN INSPECCIONES */}
                        <div style={styles.inspeccionContainer}>
                            <label style={{ ...styles.label, marginBottom: '8px', display: 'block' }}>Inspecciones Técnicas Realizadas</label>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <label style={styles.checkboxLabel}>
                                    <input type="checkbox" checked={formData.inspeccionPrevuelo} onChange={e => setFormData({ ...formData, inspeccionPrevuelo: e.target.checked })} /> Pre-vuelo
                                </label>
                                <label style={styles.checkboxLabel}>
                                    <input type="checkbox" checked={formData.inspeccionDiaria} onChange={e => setFormData({ ...formData, inspeccionDiaria: e.target.checked })} /> Diaria
                                </label>
                                <label style={styles.checkboxLabel}>
                                    <input type="checkbox" checked={formData.inspeccionPostvuelo} onChange={e => setFormData({ ...formData, inspeccionPostvuelo: e.target.checked })} /> Post-vuelo
                                </label>
                            </div>
                        </div>

                        <button disabled={loading} type="submit" style={styles.btnSave}>
                            {loading ? "REGISTRANDO F-13..." : "GUARDAR FORMULARIO F-13"}
                        </button>
                    </form>
                </div>

                {/* TABLA DE HISTORIAL (DERECHA) */}
                <div style={{ ...styles.card, flex: 1 }}>
                    <h2 style={styles.cardTitle}><Clock size={18} /> Libretas F-13 Registradas</h2>
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.thead}>
                                    <th style={styles.th}>Fecha / Misión</th>
                                    <th style={styles.th}>Aeronave</th>
                                    <th style={styles.th}>Tiempos del Motor</th>
                                    <th style={styles.th}>Tripulación</th>
                                    <th style={styles.th}>Inspecciones</th>
                                    <th style={styles.th}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registrosF13.map(r => (
                                    <tr key={r._id} style={styles.tr}>
                                        <td style={styles.td}>
                                            <div style={{ fontWeight: 'bold' }}>{formatearFechaLocal(r.fecha)}</div>
                                            <span style={styles.misionTag}>{r.misionVuelo}</span>
                                            {r.creadoPor && (
                                                <div style={styles.operadorTag}>
                                                    <span>Cargó: {r.creadoPor.rango || r.creadoPor.nombre || ''} {r.creadoPor.apellido}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{ fontWeight: 'bold' }}>{r.aeronave?.modelo || 'S/D'}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#004a99' }}>{r.aeronave?.matricula || 'S/D'}</div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={styles.hsBadge}>{r.horasDelDia} hs (Día)</div>
                                            <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '3px' }}>
                                                Total: {r.horasTotales} hs <br />
                                                Ciclos: {r.ciclos || 0} | APU: {r.apu || 0} hs
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={styles.tripuList}>
                                                <span><Users size={10} /> <strong>CMD:</strong> {r.comandante?.apellido || 'N/C'}</span>
                                                <span><Users size={10} /> <strong>MEC:</strong> {r.mecanico?.apellido || 'N/C'}</span>
                                                <span style={{ fontSize: '0.7rem', color: '#666' }}>Aterrizajes: {r.aterrizajes}</span>
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={r.inspeccionPrevuelo?.realizada ? styles.inspeccionOk : styles.inspeccionNo}>Pre: ✔</span>
                                                <span style={r.inspeccionDiaria?.realizada ? styles.inspeccionOk : styles.inspeccionNo}>Diaria: ✔</span>
                                                <span style={r.inspeccionPostvuelo?.realizada ? styles.inspeccionOk : styles.inspeccionNo}>Post: ✔</span>
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            {puedeEliminarF13 && (
                                                <button onClick={() => eliminarRegistro(r._id)} style={styles.btnDel}>
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {registrosF13.length === 0 && <div style={styles.noData}>No hay formularios F-13 cargados aún.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Los estilos heredados y adaptados para que matcheen perfecto con tu UI original
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
    btnSave: { backgroundColor: '#1b3a57', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px', transition: '0.2s' },
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    thead: { backgroundColor: '#f9fafb' },
    th: { padding: '12px 8px', textAlign: 'left', fontSize: '0.65rem', color: '#4b5563', borderBottom: '2px solid #e5e7eb', textTransform: 'uppercase' },
    tr: { borderBottom: '1px solid #f3f4f6', transition: '0.2s' },
    td: { padding: '10px 8px', fontSize: '0.8rem', verticalAlign: 'top' },
    hsBadge: { backgroundColor: '#1b3a57', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', display: 'inline-block', fontWeight: 'bold' },
    tripuList: { display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem' },
    misionTag: { backgroundColor: '#eff6ff', color: '#1e40af', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', display: 'inline-block', marginTop: '4px' },
    operadorTag: { fontSize: '0.68rem', color: '#4b5563', backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '6px', border: '1px dashed #d1d5db' },
    btnDel: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '4px' },
    noData: { textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '0.9rem' },
    inspeccionContainer: { border: '1px solid #e5e7eb', padding: '10px', borderRadius: '6px', backgroundColor: '#fafafa', marginTop: '5px' },
    checkboxLabel: { fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: '500' },
    inspeccionOk: { fontSize: '0.65rem', fontWeight: 'bold', color: '#166534', backgroundColor: '#dcfce7', padding: '1px 5px', borderRadius: '3px', width: 'fit-content' },
    inspeccionNo: { fontSize: '0.65rem', fontWeight: 'bold', color: '#991b1b', backgroundColor: '#fee2e2', padding: '1px 5px', borderRadius: '3px', width: 'fit-content' }
};

export default F13Component;