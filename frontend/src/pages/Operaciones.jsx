import React, { useEffect, useState } from 'react';
import { getEvents, createEvent, deleteEvent, updateEvent, getAvailableAircraft } from '../services/EventService';
import { TIPOS_DE_APOYO } from '../constants/TacticalData';

const Operaciones = () => {
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]); 
    const [searchTerm, setSearchTerm] = useState(""); 
    
    // NORMALIZACIÓN SINCRO JOKER
    const rawRole = localStorage.getItem('role') || 'user';
    const roleNormalizado = rawRole.toUpperCase().replace(/[\s_]/g, '');
    const userUnidad = localStorage.getItem('elemento')?.trim().toUpperCase() || "";

    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [isMobile] = useState(window.innerWidth < 768);

    const [publicarGlobal, setPublicarGlobal] = useState(false);
    const [availableAircraft, setAvailableAircraft] = useState([]);
    const [loadingAircraft, setLoadingAircraft] = useState(false);

    // --- LÓGICA DE ROLES ---
    const rolesGestionUnidad = [
        'ADMIN', 'BOSS', 'OPERACIONES', 'JEFE', 
        'OFICINATECNICA', 'LOGISTICO', 'USER', 'PERSONAL'
    ];
    
    const esMandoSuperior = ['BOSS', 'ADMIN'].includes(roleNormalizado);
    const puedeCrearYEditar = rolesGestionUnidad.includes(roleNormalizado);

    // Estado de Pestañas de Filtrado Táctico
    const [activeTab, setActiveTab] = useState("TODAS");

    // Formulario limpio enfocado únicamente en la Actividad / Apoyo
    const [formData, setFormData] = useState({
        title: "",
        mision: "ENTRENAMIENTO",
        notes: "",
        notasMarginales: "",
        elemento: userUnidad, 
        status: "programado",
        isRealTime: false,
        unidadApoyada: "",
        tipoApoyo: "SOSTENIMIENTO"
    });

    // Carga inicial de datos desde la API centralizada
    const fetchData = async () => {
        try {
            const data = await getEvents();
            setEvents(data);
            setFilteredEvents(data);
        } catch (error) {
            console.error("❌ Falló la sincronización local de eventos:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Consulta de Aeronaves Disponibles (se mantiene de forma segura por el cambio de unidad)
    useEffect(() => {
        const loadAircraft = async () => {
            if (!formData.elemento) {
                setAvailableAircraft([]);
                return;
            }
            setLoadingAircraft(true);
            try {
                const res = await getAvailableAircraft(formData.elemento);
                setAvailableAircraft(Array.isArray(res) ? res : []);
            } catch (err) {
                console.error("⚠️ Error consultando disponibilidad de material aéreo:", err);
                setAvailableAircraft([]);
            } finally {
                setLoadingAircraft(false);
            }
        };

        const delayDebounce = setTimeout(() => {
            loadAircraft();
        }, 400);

        return () => clearTimeout(delayDebounce);
    }, [formData.elemento]);

    // Procesamiento y Filtros en Cascada (Buscador + Pestañas)
    useEffect(() => {
        let result = [...events];

        if (searchTerm.trim() !== "") {
            const term = searchTerm.toLowerCase();
            result = result.filter(e => 
                e.title?.toLowerCase().includes(term) ||
                e.elemento?.toLowerCase().includes(term) ||
                e.mision?.toLowerCase().includes(term)
            );
        }

        if (activeTab === "PROGRAMADAS") {
            result = result.filter(e => e.status === "programado" && !e.isRealTime);
        } else if (activeTab === "EN VUELO") {
            result = result.filter(e => e.isRealTime || e.status === "en_curso");
        } else if (activeTab === "FINALIZADAS") {
            result = result.filter(e => e.status === "finalizado" || e.status === "completado");
        }

        setFilteredEvents(result);
    }, [searchTerm, activeTab, events]);

    // Manejo de cambios simples
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;

        if (name === "isRealTime") {
            setFormData(prev => ({
                ...prev,
                isRealTime: val,
                etapa: val ? 'operativo' : 'recepcion',
                tipoApoyo: val ? 'VUELO' : prev.tipoApoyo
            }));
            return;
        }

        setFormData(prev => ({ ...prev, [name]: val }));
    };

    // Envío del formulario
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!puedeCrearYEditar) return alert("No cuenta con jerarquía de edición.");

        const payload = {
            ...formData,
            esGlobal: esMandoSuperior ? publicarGlobal : false,
            // Asignamos un color por defecto del comando para mantener la estructura del modelo sin input visual
            color: '#1b3a57' 
        };

        try {
            if (isEditing) {
                await updateEvent(selectedId, payload);
            } else {
                await createEvent(payload);
            }
            resetForm();
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || "Error en el procesamiento del registro operativo.");
        }
    };

    // Cargar datos en el formulario para modificación
    const handleEditClick = (event) => {
        setIsEditing(true);
        setSelectedId(event._id);
        setPublicarGlobal(event.esGlobal || false);
        setFormData({
            title: event.title || "",
            mision: event.mision || "ENTRENAMIENTO",
            notes: event.notes || "",
            notasMarginales: event.notasMarginales || event.notes || "",
            elemento: event.elemento || userUnidad,
            status: event.status || "programado",
            isRealTime: event.isRealTime || false,
            unidadApoyada: event.unidadApoyada || "",
            tipoApoyo: event.tipoApoyo || "SOSTENIMIENTO"
        });
    };

    const handleDeleteClick = async (id) => {
        if (!window.confirm("¿Confirma la baja del registro táctico seleccionado?")) return;
        try {
            await deleteEvent(id);
            fetchData();
        } catch (error) {
            alert("Error al eliminar el registro.");
        }
    };

    const resetForm = () => {
        setIsEditing(false);
        setSelectedId(null);
        setPublicarGlobal(false);
        setFormData({
            title: "",
            mision: "ENTRENAMIENTO",
            notes: "",
            notasMarginales: "",
            elemento: userUnidad,
            status: "programado",
            isRealTime: false,
            unidadApoyada: "",
            tipoApoyo: "SOSTENIMIENTO"
        });
    };

    return (
        <div style={styles.dashboard}>
            {/* PANEL DE CONTROL SUPERIOR */}
            <div style={styles.topActions}>
                <input 
                    type="text" 
                    placeholder="🔍 Buscar por Unidad, Misión o Título..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchBar}
                />
                
                <div style={styles.tabContainer}>
                    {["TODAS", "PROGRAMADAS", "EN VUELO", "FINALIZADAS"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                ...styles.tabButton,
                                ...(activeTab === tab ? styles.tabActive : {})
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ ...styles.mainGrid, flexDirection: isMobile ? 'column' : 'row' }}>
                
                {/* COLUMNA FORMULARIO DE CARGA */}
                {puedeCrearYEditar && (
                    <div style={{ ...styles.card, flex: 1.1 }}>
                        <h3 style={styles.cardTitle}>
                            {isEditing ? `📝 MODIFICAR REGISTRO TÁCTICO` : `✈️ NUEVO REGISTRO OPERATIVO`}
                        </h3>
                        <form onSubmit={handleSubmit} style={styles.form}>
                            
                            <div style={styles.group}>
                                <label style={styles.label}>Título de Operación / Evento</label>
                                <input type="text" name="title" value={formData.title} onChange={handleInputChange} required style={styles.input} placeholder="Ej: VUELO DE TRASLADO SANITARIO" />
                            </div>

                            <div style={styles.row}>
                                <div style={styles.group}>
                                    <label style={styles.label}>Misión</label>
                                    <select name="mision" value={formData.mision} onChange={handleInputChange} style={styles.select}>
                                        <option value="ENTRENAMIENTO">ENTRENAMIENTO</option>
                                        <option value="OPERACIONAL">OPERACIONAL</option>
                                        <option value="APOYO_COMUNIDAD">APOYO A LA COMUNIDAD</option>
                                        <option value="MANTENIMIENTO">MANTENIMIENTO / PRUEBA</option>
                                        <option value="OTROS">OTROS</option>
                                    </select>
                                </div>
                                <div style={styles.group}>
                                    <label style={styles.label}>Tipo de Apoyo / Tarea</label>
                                    <select name="tipoApoyo" value={formData.tipoApoyo} onChange={handleInputChange} disabled={formData.isRealTime} style={styles.select}>
                                        {TIPOS_DE_APOYO.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={styles.row}>
                                <div style={styles.group}>
                                    <label style={styles.label}>Unidad / Elemento Responsable</label>
                                    <input 
                                        type="text" 
                                        name="elemento" 
                                        value={formData.elemento} 
                                        onChange={handleInputChange} 
                                        disabled={!esMandoSuperior} 
                                        required 
                                        style={styles.input} 
                                    />
                               </div>
                               <div style={styles.group}>
                                    <label style={styles.label}>Unidad Apoyada</label>
                                    <input type="text" name="unidadApoyada" value={formData.unidadApoyada} onChange={handleInputChange} style={styles.input} placeholder="Ej: RI MEC 7" />
                                </div>
                            </div>

                            {/* ESTADO DEL REGISTRO - TRES BOTONES ORIGINALES */}
                            <div style={styles.group}>
                                <label style={styles.label}>Estado del Registro</label>
                                <div style={styles.statusButtonGroup}>
                                    <button 
                                        type="button" 
                                        onClick={() => setFormData(prev => ({ ...prev, status: 'programado' }))}
                                        style={{
                                            ...styles.statusButton,
                                            ...(formData.status === 'programado' ? styles.btnProgramadoActive : {})
                                        }}
                                    >
                                        PROGRAMADO
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setFormData(prev => ({ ...prev, status: 'en_curso' }))}
                                        style={{
                                            ...styles.statusButton,
                                            ...(formData.status === 'en_curso' ? styles.btnEnCursoActive : {})
                                        }}
                                    >
                                        EN CURSO
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setFormData(prev => ({ ...prev, status: 'finalizado' }))}
                                        style={{
                                            ...styles.statusButton,
                                            ...(formData.status === 'finalizado' ? styles.btnFinalizadoActive : {})
                                        }}
                                    >
                                        FINALIZADO
                                    </button>
                                </div>
                            </div>

                            {/* CHECKBOXES DE TRANSMISIÓN Y DIFUSIÓN */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '5px 0' }}>
                                <label style={styles.checkboxLabel}>
                                    <input type="checkbox" name="isRealTime" checked={formData.isRealTime} onChange={handleInputChange} style={styles.checkbox} />
                                    📡 Transmitir en Tiempo Real (Mapa Táctico / Radar)
                                </label>

                                {esMandoSuperior && (
                                    <label style={styles.checkboxLabel}>
                                        <input type="checkbox" checked={publicarGlobal} onChange={(e) => setPublicarGlobal(e.target.checked)} style={styles.checkbox} />
                                        🌎 Difusión Global (Visible para todas las unidades)
                                    </label>
                                )}
                            </div>

                            <div style={styles.group}>
                                <label style={styles.label}>Notas Marginales / Directivas Comando</label>
                                <textarea name="notasMarginales" value={formData.notasMarginales} onChange={handleInputChange} style={styles.textarea} placeholder="Directivas especiales o restricciones de la operación..." />
                            </div>

                            <button type="submit" style={{ ...styles.btnSave, backgroundColor: isEditing ? '#f39c12' : '#27ae60' }}>
                                {isEditing ? "ACTUALIZAR REGISTRO OPERATIVO" : "ASENTAR OPERACIÓN / EVENTO"}
                            </button>
                            {isEditing && <button type="button" onClick={resetForm} style={{ ...styles.btnSave, backgroundColor: '#7f8c8d', marginTop: '5px' }}>CANCELAR</button>}
                        </form>
                    </div>
                )}

                {/* COLUMNA LOG DE REGISTROS EXISTENTES */}
                <div style={{ ...styles.card, flex: 1.4 }}>
                    <h3 style={styles.cardTitle}>📜 REGISTROS FILTRADOS ({filteredEvents.length})</h3>
                    <div style={styles.scrollList}>
                        {filteredEvents.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#7f8c8d', padding: '20px' }}>No se localizaron registros para los filtros seleccionados.</p>
                        ) : (
                            filteredEvents.map(event => (
                                <div key={event._id} style={{ ...styles.logItem, borderLeft: `5px solid ${event.color || '#1b3a57'}` }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={styles.itemTitle}>{event.title}</span>
                                            {event.isRealTime && <span style={styles.badgeLive}>📡 RADAR LIVE</span>}
                                            {event.esGlobal && <span style={styles.badgeGlobal}>🌎 GLOBAL</span>}
                                        </div>
                                        <div style={styles.metaData}>
                                            <span><b>Unidad:</b> {event.elemento}</span> | 
                                            <span><b>Misión:</b> {event.mision}</span> | 
                                            <span><b>Apoyo:</b> {event.tipoApoyo || 'S/D'}</span>
                                        </div>
                                        {event.unidadApoyada && (
                                            <div style={{ ...styles.metaData, color: '#16a085' }}>
                                                🤝 Apoyando a: {event.unidadApoyada}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {puedeCrearYEditar && (
                                        <div style={styles.itemActions}>
                                            <button onClick={() => handleEditClick(event)} style={styles.btnEdit}>✏️</button>
                                            <button onClick={() => handleDeleteClick(event._id)} style={styles.btnDelete}>🗑️</button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

// --- DISEÑO INTERFAZ LIMPIA ---
const styles = {
    dashboard: { display: 'flex', flexDirection: 'column', gap: '15px', padding: '5px' },
    topActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: '#ffffff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    searchBar: { flex: 1, minWidth: '280px', padding: '10px 15px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '0.9rem', outline: 'none' },
    tabContainer: { display: 'flex', gap: '5px', background: '#f1f3f5', padding: '4px', borderRadius: '6px' },
    tabButton: { border: 'none', background: 'transparent', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', color: '#495057', transition: '0.2s' },
    tabActive: { background: '#1b3a57', color: '#ffffff' },
    mainGrid: { display: 'flex', gap: '20px' },
    card: { background: '#ffffff', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: '15px' },
    cardTitle: { margin: 0, fontSize: '1rem', color: '#1b3a57', borderBottom: '2px solid #f0f2f5', paddingBottom: '10px', fontWeight: 'bold' },
    form: { display: 'flex', flexDirection: 'column', gap: '14px' },
    row: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
    group: { flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '140px' },
    label: { fontSize: '0.8rem', fontWeight: 'bold', color: '#2c3e50' },
    input: { padding: '9px 12px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '0.9rem', outline: 'none', backgroundColor: '#fcfcfc' },
    select: { padding: '9px 12px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '0.9rem', outline: 'none', backgroundColor: '#ffffff' },
    textarea: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '90px', fontSize: '0.9rem', resize: 'none' },
    btnSave: { color: 'white', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem', marginTop: '5px' },
    
    // Grupo de botones de estado idénticos a los originales
    statusButtonGroup: { display: 'flex', gap: '8px', width: '100%' },
    statusButton: { flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '6px', background: '#f8f9fa', color: '#333', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer', transition: '0.2s' },
    btnProgramadoActive: { background: '#2980b9', color: '#ffffff', borderColor: '#2980b9' },
    btnEnCursoActive: { background: '#e67e22', color: '#ffffff', borderColor: '#e67e22' },
    btnFinalizadoActive: { background: '#27ae60', color: '#ffffff', borderColor: '#27ae60' },
    
    checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#2c3e50', fontWeight: '500' },
    checkbox: { width: '16px', height: '16px', cursor: 'pointer' },

    scrollList: { maxHeight: '600px', overflowY: 'auto' },
    logItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid #f0f0f0', background: '#fafafa', borderRadius: '6px', marginBottom: '8px' },
    itemTitle: { fontWeight: 'bold', color: '#2c3e50', fontSize: '0.9rem' },
    metaData: { fontSize: '0.75rem', color: '#7f8c8d', marginTop: '4px' },
    badgeLive: { background: '#e74c3c', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' },
    badgeGlobal: { background: '#2980b9', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' },
    itemActions: { display: 'flex', gap: '5px' },
    btnEdit: { background: '#f39c12', border: 'none', color: 'white', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' },
    btnDelete: { background: '#e74c3c', border: 'none', color: 'white', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }
};

export default Operaciones;