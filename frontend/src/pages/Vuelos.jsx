import React, { useState, useEffect } from 'react';
import { Plane, Users, MapPin, Clock, Save, Trash2, BarChart3, X, ChevronRight } from 'lucide-react';
import API from '../services/api'; // Tu instancia de Axios configurada

const Vuelos = () => {
    const [vuelos, setVuelos] = useState([]);
    const [tripulantes, setTripulantes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showStats, setShowStats] = useState(false);

    // Estado para el usuario logueado (traído de localStorage como en Tripulantes)
    const [user] = useState({
        role: localStorage.getItem('role')?.toLowerCase() || 'user',
        unidad: localStorage.getItem('elemento')?.trim().toUpperCase() || ''
    });

    const [formData, setFormData] = useState({
        fecha: '', aeronave: '', matricula: '',
        instructor: '', piloto: '', copiloto: '', mecanico: '',
        desde: '', hasta: '', horasVoladas: 0,
        condicion: 'Diurno', reglasVuelo: 'VFR', usoNVG: false,
        tipoMision: '', localTravesia: 'Local', elementoApoyado: ''
    });

    const aeronavesAE = ["UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "AB206B3", "T-34C1", "T-6C", "C-207", "EMB-312", "G-120TP-A", "P-2002"];
    const misiones = ["Transporte de Personal", "Transporte de Carga", "Sanitario", "Rappel", "Fast Rope", "Carga Externa", "Helibalde", "NVG", "Lanzamiento de Paracaidistas", "Lanzamiento de Carga", "Lanzamiento de Buzos", "Tiro Aereo", "Visual Nocturno", "IFR"];

    useEffect(() => {
        fetchVuelos();
        fetchTripulantes();
    }, []);

    const fetchVuelos = async () => {
        try {
            const res = await API.get('/vuelos');
            setVuelos(res.data);
        } catch (error) { console.error("Error cargando vuelos", error); }
    };

    const fetchTripulantes = async () => {
        try {
            // Traemos a todo el personal. El backend filtrará por unidad si no es admin.
            const res = await API.get('/tripulantes');
            setTripulantes(res.data);
        } catch (error) { console.error("Error cargando tripulantes", error); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await API.post('/vuelos', formData);
            alert("Vuelo registrado y legajos actualizados correctamente.");
            setFormData({ ...formData, horasVoladas: 0, desde: '', hasta: '', matricula: '' });
            fetchVuelos();
        } catch (error) {
            alert("Error: " + (error.response?.data?.mensaje || "Fallo en la conexión"));
        } finally { setLoading(false); }
    };

    const eliminarVuelo = async (id) => {
        if (window.confirm("¿Seguro desea eliminar este registro? Se descontarán las horas de los legajos.")) {
            try {
                await API.delete(`/vuelos/${id}`);
                fetchVuelos();
            } catch (error) { alert("Error al eliminar"); }
        }
    };

    return (
        <div style={styles.container}>
            {/* HEADER */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Registro de Vuelos</h1>
                    <span style={styles.subtitle}>Unidad: {user.unidad}</span>
                </div>
                <button onClick={() => setShowStats(true)} style={styles.btnStats}>
                    <BarChart3 size={20} /> Estadísticas Trimestrales
                </button>
            </div>

            <div style={styles.mainGrid}>
                {/* FORMULARIO DE CARGA */}
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}><Save size={18} /> Nueva Carga</h2>
                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.row}>
                            <div style={styles.group}><label style={styles.label}>Fecha</label>
                            <input type="date" style={styles.input} onChange={e => setFormData({...formData, fecha: e.target.value})} required/></div>
                            <div style={styles.group}><label style={styles.label}>SdA</label>
                            <select style={styles.input} onChange={e => setFormData({...formData, aeronave: e.target.value})} required>
                                <option value="">Seleccionar...</option>
                                {aeronavesAE.map(a => <option key={a} value={a}>{a}</option>)}
                            </select></div>
                        </div>

                        <div style={styles.group}><label style={styles.label}>Matrícula</label>
                        <input placeholder="Ej: AE-452" style={styles.input} onChange={e => setFormData({...formData, matricula: e.target.value.toUpperCase()})} required/></div>

                        {/* SELECTORES AUTOMÁTICOS DE TRIPULACIÓN */}
                        <div style={styles.group}><label style={styles.label}><Users size={12}/> Piloto</label>
                        <select style={styles.input} onChange={e => setFormData({...formData, piloto: e.target.value})} required>
                            <option value="">Seleccionar de lista...</option>
                            {tripulantes.map(t => <option key={t._id} value={t._id}>{t.grado} {t.apellido}, {t.nombre}</option>)}
                        </select></div>

                        <div style={styles.group}><label style={styles.label}>Copiloto (Opcional)</label>
                        <select style={styles.input} onChange={e => setFormData({...formData, copiloto: e.target.value})}>
                            <option value="">Ninguno</option>
                            {tripulantes.map(t => <option key={t._id} value={t._id}>{t.grado} {t.apellido}, {t.nombre}</option>)}
                        </select></div>

                        <div style={styles.row}>
                            <div style={styles.group}><label style={styles.label}>Desde</label>
                            <input placeholder="SAVE" style={styles.input} onChange={e => setFormData({...formData, desde: e.target.value.toUpperCase()})} required/></div>
                            <div style={styles.group}><label style={styles.label}>Hasta</label>
                            <input placeholder="SADO" style={styles.input} onChange={e => setFormData({...formData, hasta: e.target.value.toUpperCase()})} required/></div>
                        </div>

                        <div style={styles.group}><label style={styles.label}>Horas Voladas</label>
                        <input type="number" step="0.1" style={styles.input} onChange={e => setFormData({...formData, horasVoladas: e.target.value})} required/></div>

                        <div style={styles.row}>
                            <div style={styles.group}><label style={styles.label}>Misión</label>
                            <select style={styles.input} onChange={e => setFormData({...formData, tipoMision: e.target.value})} required>
                                <option value="">Tipo...</option>
                                {misiones.map(m => <option key={m} value={m}>{m}</option>)}
                            </select></div>
                            <div style={styles.group}><label style={styles.label}>NVG</label>
                            <input type="checkbox" onChange={e => setFormData({...formData, usoNVG: e.target.checked})} /></div>
                        </div>

                        <button disabled={loading} type="submit" style={styles.btnSave}>
                            {loading ? "PROCESANDO IMPACTO..." : "REGISTRAR VUELO"}
                        </button>
                    </form>
                </div>

                {/* TABLA DE HISTORIAL */}
                <div style={{...styles.card, flex: 1}}>
                    <h2 style={styles.cardTitle}><Clock size={18} /> Historial de la Unidad</h2>
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.thead}>
                                    <th style={styles.th}>Fecha</th>
                                    <th style={styles.th}>Aeronave</th>
                                    <th style={styles.th}>Piloto</th>
                                    <th style={styles.th}>Horas</th>
                                    <th style={styles.th}>Misión</th>
                                    <th style={styles.th}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vuelos.map(v => (
                                    <tr key={v._id} style={styles.tr}>
                                        <td style={styles.td}>{new Date(v.fecha).toLocaleDateString()}</td>
                                        <td style={styles.td}><strong>{v.aeronave}</strong> <small style={{color:'#7f8c8d'}}>{v.matricula}</small></td>
                                        <td style={styles.td}>{v.piloto?.apellido || 'S/D'}</td>
                                        <td style={styles.td}>{v.horasVoladas} hs</td>
                                        <td style={styles.td}><span style={styles.misionTag}>{v.tipoMision}</span></td>
                                        <td style={styles.td}>
                                            <button onClick={() => eliminarVuelo(v._id)} style={styles.btnDel}><Trash2 size={14}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '30px', backgroundColor: '#f4f7f6', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
    title: { margin: 0, fontSize: '1.8rem', color: '#1b3a57' },
    subtitle: { color: '#7f8c8d', fontWeight: 'bold' },
    btnStats: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#3498db', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    mainGrid: { display: 'flex', gap: '25px', alignItems: 'flex-start' },
    card: { backgroundColor: 'white', borderRadius: '12px', padding: '25px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', minWidth: '380px' },
    cardTitle: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', color: '#1b3a57', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
    group: { display: 'flex', flexDirection: 'column', gap: '5px' },
    label: { fontSize: '0.75rem', fontWeight: 'bold', color: '#7f8c8d' },
    input: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' },
    btnSave: { backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' },
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    thead: { backgroundColor: '#f8f9fa' },
    th: { padding: '12px', textAlign: 'left', fontSize: '0.8rem', color: '#7f8c8d', borderBottom: '2px solid #eee' },
    tr: { borderBottom: '1px solid #eee' },
    td: { padding: '12px', fontSize: '0.9rem' },
    misionTag: { backgroundColor: '#e1f5fe', color: '#0288d1', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' },
    btnDel: { background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer' }
};

export default Vuelos;