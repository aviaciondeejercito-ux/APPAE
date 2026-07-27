import React, { useState, useEffect } from 'react';
import { getTripulantes, guardarCamadaActiva, getCamadaActiva } from '../services/api';

const GestionAlumnos = ({ onGuardarCamada }) => {
    const [tripulantesECAE, setTripulantesECAE] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [alumnosCamada, setAlumnosCamada] = useState([]);
    const [cursoNombre, setCursoNombre] = useState('Curso Básico de Aviación de Ejército 2026');
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        const cargarDatosECAE = async () => {
            try {
                setCargando(true);
                
                // 1. Obtener la nómina general de personal
                const resTripulantes = await getTripulantes();
                const todos = resTripulantes.data?.data || resTripulantes.data || [];
                
                // Filtramos por la unidad / elemento EC AE
                const deEscuela = todos.filter(t => {
                    const uni = (t.unidad || '').toUpperCase().trim();
                    const ele = (t.elemento || '').toUpperCase().trim();
                    return uni === 'EC AE' || ele === 'EC AE' || uni.includes('ESCUELA') || ele.includes('ESCUELA');
                });

                setTripulantesECAE(deEscuela);

                // 2. Cargar camada previamente activa guardada en el servidor
                try {
                    const resCamada = await getCamadaActiva();
                    const camadaServidor = resCamada.data?.data || resCamada.data;
                    
                    if (camadaServidor) {
                        if (camadaServidor.curso) {
                            setCursoNombre(camadaServidor.curso);
                        }
                        
                        if (camadaServidor.alumnos && Array.isArray(camadaServidor.alumnos)) {
                            // Sincronizamos los alumnos seleccionados mapeando los IDs recibidos
                            const idsAlumnos = camadaServidor.alumnos.map(a => typeof a === 'object' ? a._id : a);
                            const seleccionados = deEscuela.filter(t => idsAlumnos.includes(t._id));
                            setAlumnosCamada(seleccionados);
                        }
                    }
                } catch (errCamada) {
                    console.log("ℹ️ No hay camada previa configurada en el servidor o se creará una nueva.");
                }

            } catch (error) {
                console.error("❌ Error al recuperar tripulantes EC AE:", error);
            } finally {
                setCargando(false);
            }
        };

        cargarDatosECAE();
    }, []);

    const tripulantesFiltrados = tripulantesECAE.filter(t => {
        const q = busqueda.toLowerCase();
        const nombre = `${t.grado || ''} ${t.apellido || ''} ${t.nombre || ''}`.toLowerCase();
        return nombre.includes(q) || (t.dni && String(t.dni).includes(q));
    });

    const toggleAlumno = (tripulante) => {
        const existe = alumnosCamada.some(a => a._id === tripulante._id);
        if (existe) {
            setAlumnosCamada(alumnosCamada.filter(a => a._id !== tripulante._id));
        } else {
            setAlumnosCamada([...alumnosCamada, tripulante]);
        }
    };

    const handleConfirmarCamada = async (e) => {
        e.preventDefault();
        if (alumnosCamada.length === 0) {
            alert("⚠️ Seleccione al menos un tripulante para conformar la camada.");
            return;
        }

        try {
            setGuardando(true);

            // Estructuramos el payload enviando los IDs de los alumnos seleccionados
            const payload = {
                curso: cursoNombre,
                alumnos: alumnosCamada.map(a => a._id)
            };

            // 🌐 Persistencia compartida en base de datos mediante la API
            await guardarCamadaActiva(payload);

            if (onGuardarCamada) {
                onGuardarCamada(alumnosCamada, cursoNombre);
            }

            alert(`✅ Camada "${cursoNombre}" guardada y sincronizada globalmente con ${alumnosCamada.length} alumnos.`);
        } catch (error) {
            console.error("❌ Error al guardar la camada en el servidor:", error);
            alert("⚠️ Hubo un error al guardar la camada en el servidor. Revisa tu conexión.");
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>📋 GESTIÓN DE ALTAS Y MATRÍCULA DE ALUMNOS (EC AE)</h2>
            </div>

            <form onSubmit={handleConfirmarCamada} style={styles.card}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={styles.label}>Nombre del Curso / Camada:</label>
                    <input 
                        type="text" 
                        style={styles.input} 
                        value={cursoNombre} 
                        onChange={(e) => setCursoNombre(e.target.value)} 
                        required 
                    />
                </div>

                <h3 style={styles.subTitle}>🔎 Buscador y Selección de Personal de la Escuela</h3>
                <input 
                    type="text" 
                    style={styles.searchInput}
                    placeholder="🔍 Filtrar por apellido, nombre, grado o DNI..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />

                <div style={styles.listContainer}>
                    {cargando ? (
                        <div style={styles.emptyText}>Cargando tripulantes y camada activa de la EC AE...</div>
                    ) : tripulantesFiltrados.length > 0 ? (
                        tripulantesFiltrados.map(t => {
                            const isChecked = alumnosCamada.some(a => a._id === t._id);
                            return (
                                <label key={t._id} style={{
                                    ...styles.checkItem,
                                    backgroundColor: isChecked ? '#e8f4f8' : '#fff',
                                    borderColor: isChecked ? '#1b2a4a' : '#cbd5e1'
                                }}>
                                    <input 
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleAlumno(t)}
                                        style={{ marginRight: '10px' }}
                                    />
                                    <div>
                                        <strong>{t.grado} {t.apellido}, {t.nombre}</strong>
                                        <span style={styles.subText}> | {t.elemento || t.unidad} {t.dni ? `| DNI: ${t.dni}` : ''}</span>
                                    </div>
                                </label>
                            );
                        })
                    ) : (
                        <div style={styles.emptyText}>No se encontraron tripulantes en la base de datos.</div>
                    )}
                </div>

                <div style={styles.summaryRow}>
                    <span>Alumnos tildados para la camada: <strong>{alumnosCamada.length}</strong></span>
                    <button 
                        type="submit" 
                        style={{
                            ...styles.btnSubmit,
                            opacity: guardando ? 0.7 : 1,
                            cursor: guardando ? 'not-allowed' : 'pointer'
                        }}
                        disabled={guardando}
                    >
                        {guardando ? '💾 GUARDANDO...' : '💾 GUARDAR Y CONFIRMAR NOMINA DEL CURSO'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const styles = {
    container: { padding: '15px 25px', fontFamily: 'monospace, sans-serif', backgroundColor: '#f4f6f9', minHeight: '100vh' },
    header: { backgroundColor: '#1b2a4a', padding: '12px 20px', borderRadius: '4px', marginBottom: '15px' },
    title: { color: '#fff', fontSize: '1rem', margin: 0, fontWeight: 'bold' },
    card: { background: '#fff', padding: '20px', borderRadius: '4px', border: '1px solid #dcdfe6' },
    label: { fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#1b2a4a' },
    subTitle: { margin: '15px 0 10px 0', fontSize: '0.85rem', color: '#1b2a4a', fontWeight: 'bold' },
    input: { width: '100%', padding: '8px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' },
    searchInput: { width: '100%', padding: '8px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '10px', boxSizing: 'border-box' },
    listContainer: { maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '5px', backgroundColor: '#fafafa' },
    checkItem: { display: 'flex', alignItems: 'center', padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0', marginBottom: '4px', cursor: 'pointer', fontSize: '0.85rem' },
    subText: { color: '#64748b', fontSize: '0.75rem' },
    emptyText: { padding: '15px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' },
    summaryRow: { marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '15px' },
    btnSubmit: { backgroundColor: '#1b2a4a', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem' }
};

export default GestionAlumnos;