import React, { useState, useEffect } from 'react';
import { Plane, Users, Clock, Save, Trash2 } from 'lucide-react';
import API from '../services/api';

const Vuelos = () => {
    const [vuelos, setVuelos] = useState([]);
    const [tripulantes, setTripulantes] = useState([]);
    const [loading, setLoading] = useState(false);

    // Estado para el usuario logueado
    const [user] = useState({
        role: localStorage.getItem('role')?.toLowerCase() || 'user',
        unidad: localStorage.getItem('elemento')?.trim().toUpperCase() || ''
    });

    const [formData, setFormData] = useState({
        fecha: '', aeronave: '', matricula: '',
        instructor: '', piloto: '', copiloto: '', 
        mecanico: '', segundoMecanico: '', // Agregado segundo mecánico
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
            const res = await API.get('/tripulantes');
            setTripulantes(res.data);
        } catch (error) { console.error("Error cargando tripulantes", error); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // LIMPIEZA DE DATOS: Convertir strings vacíos en null para no romper el ObjectId de MongoDB
        const payload = {
            ...formData,
            instructor: formData.instructor || null,
            copiloto: formData.copiloto || null,
            mecanico: formData.mecanico || null,
            segundoMecanico: formData.segundoMecanico || null,
            horasVoladas: Number(formData.horasVoladas)
        };

        try {
            await API.post('/vuelos', payload);
            alert("Vuelo registrado e impacto en legajos correctamente.");
            setFormData({ 
                ...formData, 
                horasVoladas: 0, desde: '', hasta: '', matricula: '',
                instructor: '', piloto: '', copiloto: '', mecanico: '', segundoMecanico: ''
            });
            fetchVuelos();
        } catch (error) {
            alert("Error: " + (error.response?.data?.mensaje || error.response?.data?.detalles || "Fallo en la conexión"));
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
            {/* HEADER SIMPLIFICADO */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Registro de Vuelos</h1>
                    <span style={styles.subtitle}>Unidad: {user.unidad}</span>
                </div>
            </div>

            <div style={styles.mainGrid}>
                {/* FORMULARIO DE CARGA */}
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}><Save size={18} /> Nueva Carga - Formulario -12</h2>
                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.row}>
                            <div style={styles.group}><label style={styles.label}>Fecha</label>
                            <input type="date" style={styles.input} onChange={e => setFormData({...formData, fecha: e.target.value})} required/></div>
                            <div style={styles.group}><label style={styles.label}>SdA</label>
                            <select style={styles.input} value={formData.aeronave} onChange={e => setFormData({...formData, aeronave: e.target.value})} required>
                                <option value="">Seleccionar...</option>
                                {aeronavesAE.map(a => <option key={a} value={a}>{a}</option>)}
                            </select></div>
                        </div>

                        <div style={styles.group}><label style={styles.label}>Matrícula</label>
                        <input placeholder="Ej: AE-452" style={styles.input} value={formData.matricula} onChange={e => setFormData({...formData, matricula: e.target.value.toUpperCase()})} required/></div>

                        <div style={styles.row}>
                            <div style={styles.group}><label style={styles.label}>Instructor (Opt)</label>
                            <select style={styles.input} value={formData.instructor} onChange={e => setFormData({...formData, instructor: e.target.value})}>
                                <option value="">Ninguno</option>
                                {tripulantes.map(t => <option key={t._id} value={t._id}>{t.grado} {t.apellido}</option>)}
                            </select></div>
                            <div style={styles.group}><label style={styles.label}>Piloto</label>
                            <select style={styles.input} value={formData.piloto} onChange={e => setFormData({...formData, piloto: e.target.value})} required>
                                <option value="">Seleccionar...</option>
                                {tripulantes.map(t => <option key={t._id} value={t._id}>{t.grado} {t.apellido}</option>)}
                            </select></div>
                        </div>

                        <div style={styles.group}><label style={styles.label}>Copiloto (Opt)</label>
                        <select style={styles.input} value={formData.copiloto} onChange={e => setFormData({...formData, copiloto: e.target.value})}>
                            <option value="">Ninguno</option>
                            {tripulantes.map(t => <option key={t._id} value={t._id}>{t.grado} {t.apellido}</option>)}
                        </select></div>

                        {/* SECCIÓN MECÁNICOS */}
                        <div style={styles.row}>
                            <div style={styles.group}><label style={styles.label}>Mecánico 1</label>
                            <select style={styles.input} value={formData.mecanico} onChange={e => setFormData({...formData, mecanico: e.target.value})}>
                                <option value="">Ninguno</option>
                                {tripulantes.map(t => <option key={t._id} value={t._id}>{t.grado} {t.apellido}</option>)}
                            </select></div>
                            <div style={styles.group}><label style={styles.label}>Mecánico 2</label>
                            <select style={styles.input} value={formData.segundoMecanico} onChange={e => setFormData({...formData, segundoMecanico: e.target.value})}>
                                <option value="">Ninguno</option>
                                {tripulantes.map(t => <option key={t._id} value={t._id}>{t.grado} {t.apellido}</option>)}
                            </select></div>
                        </div>

                        <div style={styles.row}>
                            <div style={styles.group}><label style={styles.label}>Desde</label>
                            <input placeholder="ORIGEN" style={styles.input} value={formData.desde} onChange={e => setFormData({...formData, desde: e.target.value.toUpperCase()})} required/></div>
                            <div style={styles.group}><label style={styles.label}>Hasta</label>
                            <input placeholder="DESTINO" style={styles.input} value={formData.hasta} onChange={e => setFormData({...formData, hasta: e.target.value.toUpperCase()})} required/></div>
                        </div>

                        <div style={styles.row}>
                            <div style={styles.group}><label style={styles.label}>Horas</label>
                            <input type="number" step="0.1" style={styles.input} value={formData.horasVoladas} onChange={e => setFormData({...formData, horasVoladas: e.target.value})} required/></div>
                            <div style={styles.group}><label style={styles.label}>Condición</label>
                            <select style={styles.input} value={formData.condicion} onChange={e => setFormData({...formData, condicion: e.target.value})}>
                                <option value="Diurno">Diurno</option>
                                <option value="Nocturno">Nocturno</option>
                            </select></div>
                        </div>

                        <div style={styles.group}><label style={styles.label}>Misión</label>
                        <select style={styles.input} value={formData.tipoMision} onChange={e => setFormData({...formData, tipoMision: e.target.value})} required>
                            <option value="">Seleccionar misión...</option>
                            {misiones.map(m => <option key={m} value={m}>{m}</option>)}
                        </select></div>

                        <button disabled={loading} type="submit" style={styles.btnSave}>
                            {loading ? "SINCRONIZANDO LEGAJOS..." : "REGISTRAR VUELO"}
                        </button>
                    </form>
                </div>

                {/* TABLA DE HISTORIAL */}
                <div style={{...styles.card, flex: 1}}>
                    <h2 style={styles.cardTitle}><Clock size={18} /> Historial Operativo</h2>
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.thead}>
                                    <th style={styles.th}>Fecha</th>
                                    <th style={styles.th}>SdA</th>
                                    <th style={styles.th}>Piloto / Cop</th>
                                    <th style={styles.th}>Hs</th>
                                    <th style={styles.th}>Misión</th>
                                    <th style={styles.th}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vuelos.map(v => (
                                    <tr key={v._id} style={styles.tr}>
                                        <td style={styles.td}>{new Date(v.fecha).toLocaleDateString()}</td>
                                        <td style={styles.td}><strong>{v.aeronave}</strong><br/><small>{v.matricula}</small></td>
                                        <td style={styles.td}>{v.piloto?.apellido} {v.copiloto ? `/ ${v.copiloto.apellido}` : ''}</td>
                                        <td style={styles.td}>{v.horasVoladas}</td>
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
    title: { margin: 0, fontSize: '1.6rem', color: '#1b3a57' },
    subtitle: { color: '#7f8c8d', fontSize: '0.9rem' },
    mainGrid: { display: 'flex', gap: '20px', alignItems: 'flex-start' },
    card: { backgroundColor: 'white', borderRadius: '10px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', minWidth: '400px' },
    cardTitle: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1rem', color: '#1b3a57', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' },
    form: { display: 'flex', flexDirection: 'column', gap: '12px' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    group: { display: 'flex', flexDirection: 'column', gap: '4px' },
    label: { fontSize: '0.7rem', fontWeight: 'bold', color: '#7f8c8d', textTransform: 'uppercase' },
    input: { padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '0.9rem' },
    btnSave: { backgroundColor: '#1b3a57', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' },
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    thead: { backgroundColor: '#f8f9fa' },
    th: { padding: '10px', textAlign: 'left', fontSize: '0.75rem', color: '#7f8c8d', borderBottom: '2px solid #eee' },
    tr: { borderBottom: '1px solid #eee' },
    td: { padding: '10px', fontSize: '0.85rem' },
    misionTag: { backgroundColor: '#e8f4fd', color: '#1b3a57', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' },
    btnDel: { background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer' }
};

export default Vuelos;