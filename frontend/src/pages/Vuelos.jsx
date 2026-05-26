import React, { useState, useEffect } from 'react';
import { Plane, Users, Clock, Save, Trash2, Map, Luggage, UserPlus, Info } from 'lucide-react';
import API from '../services/api';

const Vuelos = () => {
    const [vuelos, setVuelos] = useState([]);
    const [tripulantes, setTripulantes] = useState([]);
    const [loading, setLoading] = useState(false);

    // --- NORMALIZACIÓN SINCRO JOKER ---
    const rawRole = localStorage.getItem('role') || 'user';
    const roleNormalizado = rawRole.toUpperCase().replace(/[\s_]/g, '');
    const userUnidad = localStorage.getItem('elemento')?.trim().toUpperCase() || '';

    // --- REGLAS DE ACCESO ---
    const esAdmin = roleNormalizado === 'ADMIN';
    const esOperaciones = roleNormalizado === 'OPERACIONES';
    const esJefe = roleNormalizado === 'JEFE';
    
    // Solo Admin, Operaciones y el usuario base pueden cargar
    const puedeCargarVuelos = ['ADMIN', 'OPERACIONES', 'USER'].includes(roleNormalizado);
    // Definimos quiénes pueden anular registros (Admin + Operaciones + Jefe)
    const puedeEliminarVuelo = ['ADMIN', 'OPERACIONES', 'JEFE'].includes(roleNormalizado);
    // Mandos superiores ven todo el historial
    const esMandoEstrategico = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleNormalizado);

    const [formData, setFormData] = useState({
        fecha: '', aeronave: '', matricula: '',
        instructor: '', piloto: '', copiloto: '', 
        mecanico: '', segundoMecanico: '',
        desde: '', hasta: '', horasVoladas: 0,
        condicion: 'Diurno', reglasVuelo: 'VFR', usoNVG: false,
        tipoMision: '', localTravesia: 'Local', 
        elementoApoyado: '', cantidadPasajeros: 0, pesoCarga: 0
    });

    const aeronavesAE = ["UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "AB206B3", "T-34C1", "T-6C", "C-207", "EMB-312", "G-120TP-A", "P-2002"];
    const misiones = ["Entrenamiento","Transporte de Personal", "Transporte de Carga", "Sanitario", "Rappel", "Fast Rope", "Carga Externa", "Helibalde", "NVG", "Lanzamiento de Paracaidistas", "Lanzamiento de Carga", "Lanzamiento de Buzos", "Tiro Aereo", "Visual Nocturno", "IFR", "Instruccion", "Calificacion"];

    useEffect(() => {
        fetchVuelos();
        fetchTripulantes();
    }, [userUnidad]);

   const fetchVuelos = async () => {
        try {
            const res = await API.get('/vuelos');
            
            // LOGICA DE VISIBILIDAD TOTAL PARA MANDOS
            if (esMandoEstrategico) {
                // Si es ADMIN, BOSS, DIRECTOR u OTO, no filtramos nada.
                setVuelos(res.data);
            } else {
                // Para OPERACIONES, JEFE o USER, filtramos por su unidad
                const dataFiltrada = res.data.filter(v => {
                    const unidadVuelo = (v.unidadResponsable || "").toUpperCase();
                    const matriculaVuelo = (v.matricula || "").toUpperCase();
                    const miUnidad = userUnidad.toUpperCase();

                    return unidadVuelo === miUnidad || matriculaVuelo.includes(miUnidad);
                });
                setVuelos(dataFiltrada);
            }
        } catch (error) { 
            console.error("Error cargando historial de vuelos", error); 
        }
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

        const payload = {
            ...formData,
            unidadResponsable: userUnidad, // Inyectamos la unidad del operador
            instructor: formData.instructor || null,
            piloto: formData.piloto || null,
            copiloto: formData.copiloto || null,
            mecanico: formData.mecanico || null,
            segundoMecanico: formData.segundoMecanico || null,
            horasVoladas: Number(formData.horasVoladas),
            cantidadPasajeros: Number(formData.cantidadPasajeros),
            pesoCarga: Number(formData.pesoCarga)
        };

        try {
            await API.post('/vuelos', payload);
            alert("✅ Vuelo registrado y horas computadas correctamente.");
            setFormData({ 
                fecha: '', aeronave: '', matricula: '',
                instructor: '', piloto: '', copiloto: '', mecanico: '', segundoMecanico: '',
                desde: '', hasta: '', horasVoladas: 0,
                condicion: 'Diurno', reglasVuelo: 'VFR', usoNVG: false,
                tipoMision: '', localTravesia: 'Local', 
                elementoApoyado: '', cantidadPasajeros: 0, pesoCarga: 0
            });
            fetchVuelos();
        } catch (error) {
            alert("❌ Error: " + (error.response?.data?.mensaje || "Fallo en la validación de carga"));
        } finally { setLoading(false); }
    };

    const eliminarVuelo = async (id) => {
        if (!puedeEliminarVuelo) {
            alert("Acceso Denegado: Su nivel jerárquico no permite anular registros de vuelo.");
            return;
        }

        if (window.confirm("¿Seguro desea eliminar este registro? Esta acción es irreversible, afectará el cómputo de horas de la aeronave y el legajo de los pilotos.")) {
            try {
                await API.delete(`/vuelos/${id}`);
                alert("✅ Registro eliminado correctamente.");
                fetchVuelos();
            } catch (error) { 
                console.error("Error al eliminar:", error);
                alert("❌ Error: " + (error.response?.data?.mensaje || "No se pudo eliminar el registro. Verifique permisos del servidor.")); 
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
                    <h1 style={styles.title}>Libro de Vuelo Digital - Sistema AE</h1>
                    <span style={styles.subtitle}>Unidad: {userUnidad || "SIN UNIDAD"} | Nivel de Acceso: {roleNormalizado}</span>
                </div>
            </div>

            <div style={styles.mainGrid}>
                {/* FORMULARIO DE CARGA */}
                <div style={{...styles.card, display: puedeCargarVuelos ? 'block' : 'none'}}>
                    <h2 style={styles.cardTitle}><Save size={18} /> Nueva Carga - Formulario -12</h2>
                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.row}>
                            <div style={styles.group}><label style={styles.label}>Fecha</label>
                            <input type="date" style={styles.input} value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} required/></div>
                            <div style={styles.group}><label style={styles.label}>Aeronave (SdA)</label>
                            <select style={styles.input} value={formData.aeronave} onChange={e => setFormData({...formData, aeronave: e.target.value})} required>
                                <option value="">Seleccionar...</option>
                                {aeronavesAE.map(a => <option key={a} value={a}>{a}</option>)}
                            </select></div>
                        </div>

                        <div style={styles.row}>
                            <div style={styles.group}><label style={styles.label}>Matrícula</label>
                            <input placeholder="AE-XXX" style={styles.input} value={formData.matricula} onChange={e => setFormData({...formData, matricula: e.target.value.toUpperCase()})} required/></div>
                            <div style={styles.group}><label style={styles.label}>Elemento Apoyado</label>
                            <input placeholder="Ej: DIR AE" style={styles.input} value={formData.elementoApoyado} onChange={e => setFormData({...formData, elementoApoyado: e.target.value.toUpperCase()})} required/></div>
                        </div>

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

                        <div style={styles.row}>
                            <div style={styles.group}><label style={styles.label}>Copiloto (Opt)</label>
                            <select style={styles.input} value={formData.copiloto} onChange={e => setFormData({...formData, copiloto: e.target.value})}>
                                <option value="">Ninguno</option>
                                {tripulantes.map(t => <option key={t._id} value={t._id}>{t.grado} {t.apellido}</option>)}
                            </select></div>
                            <div style={styles.group}><label style={styles.label}>Mecánico 1 (Opt)</label>
                            <select style={styles.input} value={formData.mecanico} onChange={e => setFormData({...formData, mecanico: e.target.value})}>
                                <option value="">Ninguno</option>
                                {tripulantes.map(t => <option key={t._id} value={t._id}>{t.grado} {t.apellido}</option>)}
                            </select></div>
                        </div>

                        <div style={styles.row}>
                            <div style={styles.group}><label style={styles.label}>Mecánico 2 (Opt)</label>
                            <select style={styles.input} value={formData.segundoMecanico} onChange={e => setFormData({...formData, segundoMecanico: e.target.value})}>
                                <option value="">Ninguno</option>
                                {tripulantes.map(t => <option key={t._id} value={t._id}>{t.grado} {t.apellido}</option>)}
                            </select></div>
                            <div style={styles.group}><label style={styles.label}>Hs Voladas</label>
                            <input type="number" step="0.1" style={styles.input} value={formData.horasVoladas} onChange={e => setFormData({...formData, horasVoladas: e.target.value})} required/></div>
                        </div>

                        <div style={styles.row}>
                            <div style={styles.group}><label style={styles.label}>Desde</label>
                            <input placeholder="ORIGEN" style={styles.input} value={formData.desde} onChange={e => setFormData({...formData, desde: e.target.value.toUpperCase()})} required/></div>
                            <div style={styles.group}><label style={styles.label}>Hasta</label>
                            <input placeholder="DESTINO" style={styles.input} value={formData.hasta} onChange={e => setFormData({...formData, hasta: e.target.value.toUpperCase()})} required/></div>
                        </div>

                        <div style={styles.row}>
                            <div style={styles.group}><label style={styles.label}>Misión</label>
                            <select style={styles.input} value={formData.tipoMision} onChange={e => setFormData({...formData, tipoMision: e.target.value})} required>
                                <option value="">Seleccionar...</option>
                                {misiones.map(m => <option key={m} value={m}>{m}</option>)}
                            </select></div>
                            <div style={styles.group}><label style={styles.label}>Navegación</label>
                            <select style={styles.input} value={formData.localTravesia} onChange={e => setFormData({...formData, localTravesia: e.target.value})}>
                                <option value="Local">Local</option>
                                <option value="Travesia">Travesía</option>
                            </select></div>
                        </div>

                        <div style={styles.row}>
                            <div style={styles.group}><label style={styles.label}>Condición</label>
                            <select style={styles.input} value={formData.condicion} onChange={e => setFormData({...formData, condicion: e.target.value})}>
                                <option value="Diurno">Diurno</option>
                                <option value="Nocturno">Nocturno</option>
                            </select></div>
                            <div style={styles.group}><label style={styles.label}>Reglas de Vuelo</label>
                            <select style={styles.input} value={formData.reglasVuelo} onChange={e => setFormData({...formData, reglasVuelo: e.target.value})}>
                                <option value="VFR">VFR (Visual)</option>
                                <option value="IFR">IFR (Instrumental)</option>
                            </select></div>
                        </div>

                        <div style={styles.row}>
                            <div style={styles.group}><label style={styles.label}>Pasajeros</label>
                            <input type="number" style={styles.input} value={formData.cantidadPasajeros} onChange={e => setFormData({...formData, cantidadPasajeros: e.target.value})}/></div>
                            <div style={styles.group}><label style={styles.label}>Carga (Kg)</label>
                            <input type="number" style={styles.input} value={formData.pesoCarga} onChange={e => setFormData({...formData, pesoCarga: e.target.value})}/></div>
                        </div>

                        <div style={{ ...styles.group, flexDirection: 'row', alignItems: 'center', gap: '8px', padding: '5px 0' }}>
                            <input type="checkbox" id="usoNVG" checked={formData.usoNVG} onChange={e => setFormData({...formData, usoNVG: e.target.checked})}/>
                            <label htmlFor="usoNVG" style={{...styles.label, cursor: 'pointer', marginTop: '2px'}}>¿Utilizó visores nocturnos (NVG)?</label>
                        </div>

                        <button disabled={loading} type="submit" style={styles.btnSave}>
                            {loading ? "SINCRONIZANDO CON BASE DE DATOS..." : "REGISTRAR VUELO"}
                        </button>
                    </form>
                </div>

                {!puedeCargarVuelos && (
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}><Info size={18} /> Información de Acceso</h2>
                        <p style={{fontSize: '0.85rem', color: '#666'}}>Su nivel jerárquico actual es de <strong>SOLO CONSULTA</strong> para el historial de vuelos.</p>
                    </div>
                )}

                {/* TABLA DE HISTORIAL */}
                <div style={{...styles.card, flex: 1}}>
                    <h2 style={styles.cardTitle}><Clock size={18} /> Historial Operativo Detallado</h2>
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr style={styles.thead}>
                                    <th style={styles.th}>Fecha / Ruta</th>
                                    <th style={styles.th}>Aeronave</th>
                                    <th style={styles.th}>Tripulación</th>
                                    <th style={styles.th}>Carga / Pax</th>
                                    <th style={styles.th}>Condiciones</th>
                                    <th style={styles.th}>Misión</th>
                                    <th style={styles.th}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vuelos.map(v => (
                                    <tr key={v._id} style={styles.tr}>
                                        <td style={styles.td}>
                                            <div style={{fontWeight: 'bold'}}>{formatearFechaLocal(v.fecha)}</div>
                                            <div style={{fontSize: '0.7rem', color: '#666'}}>{v.desde} ➔ {v.hasta}</div>
                                            <div style={styles.hsBadge}>{v.horasVoladas} hs</div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{fontWeight: 'bold'}}>{v.aeronave}</div>
                                            <div style={{fontSize: '0.75rem', color: '#004a99'}}>{v.matricula}</div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={styles.tripuList}>
                                                {v.instructor && <span style={{color: '#b45309'}}><Users size={10} /> IN: {v.instructor.apellido}</span>}
                                                <span><Users size={10} /> P: {v.piloto?.apellido || 'S/D'}</span>
                                                {v.copiloto && <span><Users size={10} /> C: {v.copiloto.apellido}</span>}
                                                {v.mecanico && <span style={{color: '#4b5563'}}><Users size={10} /> M1: {v.mecanico.apellido}</span>}
                                                {v.segundoMecanico && <span style={{color: '#4b5563'}}><Users size={10} /> M2: {v.segundoMecanico.apellido}</span>}
                                            </div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={styles.dataRow}>< Luggage size={12} /> {v.pesoCarga || 0} kg</div>
                                            <div style={styles.dataRow}><Users size={12} /> {v.cantidadPasajeros || 0} pax</div>
                                        </td>
                                        <td style={styles.td}>
                                            <div style={styles.miniTag}>{v.reglasVuelo}</div>
                                            <div style={styles.miniTag}>{v.condicion}</div>
                                            {v.usoNVG && <div style={{...styles.miniTag, backgroundColor: '#dcfce7', color: '#166534'}}>NVG</div>}
                                            <div style={styles.miniTag}>{v.localTravesia}</div>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={styles.misionTag}>{v.tipoMision}</span>
                                            <div style={{fontSize: '0.7rem', marginTop: '4px', color: '#444'}}>APOYO: {v.elementoApoyado}</div>
                                        </td>
                                        <td style={styles.td}>
                                            {puedeEliminarVuelo && (
                                                <button onClick={() => eliminarVuelo(v._id)} style={styles.btnDel}>
                                                    <Trash2 size={16}/>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {vuelos.length === 0 && <div style={styles.noData}>No hay vuelos registrados bajo esta jurisdicción.</div>}
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
    btnSave: { backgroundColor: '#1b3a57', color: 'white', border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px', transition: '0.2s' },
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
    thead: { backgroundColor: '#f9fafb' },
    th: { padding: '12px 8px', textAlign: 'left', fontSize: '0.65rem', color: '#4b5563', borderBottom: '2px solid #e5e7eb', textTransform: 'uppercase' },
    tr: { borderBottom: '1px solid #f3f4f6', transition: '0.2s' },
    td: { padding: '10px 8px', fontSize: '0.8rem', verticalAlign: 'top' },
    hsBadge: { backgroundColor: '#1b3a57', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', display: 'inline-block', marginTop: '4px', fontWeight: 'bold' },
    tripuList: { display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem' },
    dataRow: { display: 'flex', alignItems: 'center', gap: '4px', color: '#444', marginBottom: '2px' },
    miniTag: { display: 'inline-block', backgroundColor: '#f3f4f6', color: '#374151', padding: '1px 5px', borderRadius: '3px', fontSize: '0.65rem', marginRight: '3px', marginBottom: '3px', fontWeight: '600' },
    misionTag: { backgroundColor: '#eff6ff', color: '#1e40af', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', display: 'inline-block' },
    btnDel: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '4px' },
    noData: { textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '0.9rem' }
};

export default Vuelos;