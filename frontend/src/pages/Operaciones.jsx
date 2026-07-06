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

    // --- LÓGICA DE ROLES ACTUALIZADA ---
    const rolesGestionUnidad = [
        'ADMIN', 'BOSS', 'OPERACIONES', 'JEFE', 
        'OFICINATECNICA', 'LOGISTICO', 'USER', 'PERSONAL'
    ];
    
    const esMandoSuperior = ['BOSS', 'ADMIN'].includes(roleNormalizado);
    const puedeCrearYEditar = rolesGestionUnidad.includes(roleNormalizado);

    // Estado de Pestañas de Filtrado Táctico
    const [activeTab, setActiveTab] = useState("TODAS");

    // Formulario unificado adaptado a la persistencia atómica del backend
    const [formData, setFormData] = useState({
        title: "",
        mision: "ENTRENAMIENTO",
        notes: "",
        notasMarginales: "",
        color: "#1b3a57",
        elemento: userUnidad, 
        status: "programado",
        isRealTime: false,
        matricula: "",
        aeronave: "",
        tipoIcono: "ala_rotativa",
        origen: { nombre: "", lat: "", lng: "" },
        destino: { nombre: "", lat: "", lng: "" },
        unidadApoyada: "",
        pntoContactoNom: "",
        pntoContactoTel: "",
        responsableNom: "",
        responsableTel: "",
        tipoApoyo: "SOSTENIMIENTO",
        sdaListado: []
    });

    const [currentSda, setCurrentSda] = useState("");

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

    // ✈️ DISPONIBILIDAD DE AERONAVES EN TIEMPO REAL (CORRECCIÓN SINCRO JOKER PARA EVITAR EL 403)
    useEffect(() => {
        const loadAircraft = async () => {
            if (!formData.elemento) {
                setAvailableAircraft([]);
                return;
            }
            setLoadingAircraft(true);
            try {
                // Ahora viaja de forma segura por la ruta unificada de eventos mitigando el error 403
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
                e.matricula?.toLowerCase().includes(term) ||
                e.aeronave?.toLowerCase().includes(term) ||
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

    // Manejo de cambios en campos planos y anidados
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

        if (name.startsWith("origen.") || name.startsWith("destino.")) {
            const [objectKey, fieldKey] = name.split(".");
            setFormData(prev => ({
                ...prev,
                [objectKey]: {
                    ...prev[objectKey],
                    [fieldKey]: val
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: val }));
        }
    };

    // Auto-completado al seleccionar una aeronave en servicio de la unidad
    const handleAircraftSelect = (e) => {
        const mat = e.target.value;
        if (!mat) {
            setFormData(prev => ({ ...prev, matricula: "", aeronave: "" }));
            return;
        }
        const match = availableAircraft.find(a => a.matricula === mat);
        if (match) {
            setFormData(prev => ({
                ...prev,
                matricula: match.matricula,
                aeronave: match.sda || match.modelo || ""
            }));
        }
    };

    // Gestión de Listado de Sistemas de Armas involucrados (Tags)
    const addSdaTag = () => {
        if (!currentSda.trim()) return;
        const up = currentSda.trim().toUpperCase();
        if (!formData.sdaListado.includes(up)) {
            setFormData(prev => ({ ...prev, sdaListado: [...prev.sdaListado, up] }));
        }
        setCurrentSda("");
    };

    const removeSdaTag = (tag) => {
        setFormData(prev => ({ ...prev, sdaListado: prev.sdaListado.filter(t => t !== tag) }));
    };

    // Envío y persistsencia atómica del formulario
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!puedeCrearYEditar) return alert("No cuenta con jerarquía de edición.");

        const payload = {
            ...formData,
            esGlobal: esMandoSuperior ? publicarGlobal : false
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
            color: event.color || "#1b3a57",
            elemento: event.elemento || userUnidad,
            status: event.status || "programado",
            isRealTime: event.isRealTime || false,
            matricula: event.matricula || "",
            aeronave: event.aeronave || "",
            tipoIcono: event.tipoIcono || "ala_rotativa",
            origen: {
                nombre: event.origen?.nombre || "",
                lat: event.origen?.lat || "",
                lng: event.origen?.lng || ""
            },
            destino: {
                nombre: event.destino?.nombre || "",
                lat: event.destino?.lat || "",
                lng: event.destino?.lng || ""
            },
            unidadApoyada: event.unidadApoyada || "",
            pntoContactoNom: event.pntoContactoNom || "",
            pntoContactoTel: event.pntoContactoTel || "",
            responsableNom: event.responsableNom || "",
            responsableTel: event.responsableTel || "",
            tipoApoyo: event.tipoApoyo || "SOSTENIMIENTO",
            sdaListado: event.sdaListado || []
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
            color: "#1b3a57",
            elemento: userUnidad,
            status: "programado",
            isRealTime: false,
            matricula: "",
            aeronave: "",
            tipoIcono: "ala_rotativa",
            origen: { nombre: "", lat: "", lng: "" },
            destino: { nombre: "", lat: "", lng: "" },
            unidadApoyada: "",
            pntoContactoNom: "",
            pntoContactoTel: "",
            responsableNom: "",
            responsableTel: "",
            tipoApoyo: "SOSTENIMIENTO",
            sdaListado: []
        });
    };

    return (
        <div style={styles.dashboard}>
            {/* PANEL DE CONTROL SUPERIOR */}
            <div style={styles.topActions}>
                <input 
                    type="text" 
                    placeholder="🔍 Buscar por Unidad, Matrícula, Misión o Título..." 
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
                    <div style={{ ...styles.card, flex: 1.2 }}>
                        <h3 style={styles.cardTitle}>
                            {isEditing ? `📝 MODIFICAR REGISTRO TÁCTICO` : `✈️ NUEVO REGISTRO OPERATIVO`}
                        </h3>
                        <form onSubmit={handleSubmit} style={styles.form}>
                            
                            <div style={styles.row}>
                                <div style={styles.group}>
                                    <label style={styles.label}>Título de Operación / Evento</label>
                                    <input type="text" name="title" value={formData.title} onChange={handleInputChange} required style={styles.input} placeholder="Ej: VUELO DE TRASLADO SANITARIO" />
                                </div>
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
                                    <label style={styles.label}>Tipo de Apoyo / Tarea</label>
                                    <select name="tipoApoyo" value={formData.tipoApoyo} onChange={handleInputChange} disabled={formData.isRealTime} style={styles.select}>
                                        {TIPOS_DE_APOYO.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* MATERIAL AÉREO INTEGRADO */}
                            <div style={styles.row}>
                                <div style={styles.group}>
                                    <label style={styles.label}>
                                        Aeronaves Disponibles en Unidad {loadingAircraft && "⏳"}
                                    </label>
                                    <select onChange={handleAircraftSelect} value={formData.matricula} style={styles.select}>
                                        <option value="">-- SELECCIONAR MATERIAL E/S --</option>
                                        {availableAircraft.map(a => (
                                            <option key={a._id} value={a.matricula}>
                                                {a.matricula} ({a.sda})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div style={styles.group}>
                                    <label style={styles.label}>Matrícula</label>
                                    <input type="text" name="matricula" value={formData.matricula} onChange={handleInputChange} style={styles.input} placeholder="Ej: AE-460" />
                                </div>
                                <div style={styles.group}>
                                    <label style={styles.label}>Sistema de Armas (SdA)</label>
                                    <input type="text" name="aeronave" value={formData.aeronave} onChange={handleInputChange} style={styles.input} placeholder="Ej: UH-1H" />
                                </div>
                            </div>

                            {/* TRAZA DE NAVEGACIÓN (ORIGEN Y DESTINO COORDENADAS) */}
                            <fieldset style={styles.fieldset}>
                                <legend style={styles.legend}>Traza de Vuelo / Ejes de Navegación</legend>
                                <div style={styles.row}>
                                    <div style={styles.group}>
                                        <label style={styles.label}>Origen (OACI / Lugar)</label>
                                        <input type="text" name="origen.nombre" value={formData.origen.nombre} onChange={handleInputChange} style={styles.input} placeholder="Ej: SABE" />
                                    </div>
                                    <div style={styles.group}>
                                        <label style={styles.label}>Latitud</label>
                                        <input type="number" step="any" name="origen.lat" value={formData.origen.lat} onChange={handleInputChange} style={styles.input} placeholder="-34.613" />
                                    </div>
                                    <div style={styles.group}>
                                        <label style={styles.label}>Longitud</label>
                                        <input type="number" step="any" name="origen.lng" value={formData.origen.lng} onChange={handleInputChange} style={styles.input} placeholder="-58.377" />
                                    </div>
                                </div>
                                <div style={styles.row}>
                                    <div style={styles.group}>
                                        <label style={styles.label}>Destino (OACI / Lugar)</label>
                                        <input type="text" name="destino.nombre" value={formData.destino.nombre} onChange={handleInputChange} style={styles.input} placeholder="Ej: SACO" />
                                    </div>
                                    <div style={styles.group}>
                                        <label style={styles.label}>Latitud</label>
                                        <input type="number" step="any" name="destino.lat" value={formData.destino.lat} onChange={handleInputChange} style={styles.input} placeholder="-31.312" />
                                    </div>
                                    <div style={styles.group}>
                                        <label style={styles.label}>Longitud</label>
                                        <input type="number" step="any" name="destino.lng" value={formData.destino.lng} onChange={handleInputChange} style={styles.input} placeholder="-64.209" />
                                    </div>
                                </div>
                            </fieldset>

                            {/* ENLACES Y CONTACTOS DE LA MISIÓN */}
                            <div style={styles.row}>
                                <div style={styles.group}>
                                    <label style={styles.label}>Unidad Apoyada</label>
                                    <input type="text" name="unidadApoyada" value={formData.unidadApoyada} onChange={handleInputChange} style={styles.input} placeholder="Ej: RI MEC 7" />
                                </div>
                                <div style={styles.group}>
                                    <label style={styles.label}>Icono Radar</label>
                                    <select name="tipoIcono" value={formData.tipoIcono} onChange={handleInputChange} style={styles.select}>
                                        <option value="ala_rotativa">Ala Rotativa (Helicóptero)</option>
                                        <option value="ala_fija">Ala Fija (Avión)</option>
                                        <option value="base">Puesto de Comando (Base)</option>
                                    </select>
                                </div>
                            </div>

                            <div style={styles.row}>
                                <div style={styles.group}>
                                    <label style={styles.label}>Contacto Punto de Control (Nombre)</label>
                                    <input type="text" name="pntoContactoNom" value={formData.pntoContactoNom} onChange={handleInputChange} style={styles.input} />
                                </div>
                                <div style={styles.group}>
                                    <label style={styles.label}>Contacto Teléfono</label>
                                    <input type="text" name="pntoContactoTel" value={formData.pntoContactoTel} onChange={handleInputChange} style={styles.input} />
                                </div>
                            </div>

                            <div style={styles.row}>
                                <div style={styles.group}>
                                    <label style={styles.label}>Responsable de Carga / Operador</label>
                                    <input type="text" name="responsableNom" value={formData.responsableNom} onChange={handleInputChange} style={styles.input} />
                                </div>
                                <div style={styles.group}>
                                    <label style={styles.label}>Responsable Teléfono</label>
                                    <input type="text" name="responsableTel" value={formData.responsableTel} onChange={handleInputChange} style={styles.input} />
                                </div>
                            </div>

                            {/* COMPLEMENTOS TÁCTICOS */}
                            <div style={styles.row}>
                                <div style={styles.group}>
                                    <label style={styles.label}>Sistemas Complementarios Involucrados</label>
                                    <div style={styles.sdaBox}>
                                        <input type="text" value={currentSda} onChange={(e) => setCurrentSda(e.target.value)} placeholder="Ej: AB-206" style={styles.input} />
                                        <button type="button" onClick={addSdaTag} style={styles.btnAdd}>+</button>
                                    </div>
                                    <div style={styles.tagWrap}>
                                        {formData.sdaListado.map(t => (
                                            <span key={t} style={styles.tag}>
                                                {t} <button type="button" onClick={() => removeSdaTag(t)} style={styles.btnTagX}>×</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div style={styles.row}>
                                <div style={styles.group}>
                                    <label style={styles.label}>Estado del Registro</label>
                                    <select name="status" value={formData.status} onChange={handleInputChange} style={styles.select}>
                                        <option value="programado">PROGRAMADO / PLANIFICADO</option>
                                        <option value="en_curso">EN CURSO / EN VUELO</option>
                                        <option value="finalizado">FINALIZADO / ARCHIVADO</option>
                                    </select>
                                </div>
                                <div style={styles.group}>
                                    <label style={styles.label}>Color Asignado (Calendario)</label>
                                    <input type="color" name="color" value={formData.color} onChange={handleInputChange} style={{ ...styles.input, height: '40px', padding: '2px' }} />
                                </div>
                            </div>

                            <div style={{ ...styles.row, alignItems: 'center', gap: '20px', padding: '10px 0' }}>
                                <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input type="checkbox" name="isRealTime" checked={formData.isRealTime} onChange={handleInputChange} />
                                    📡 Transmitir en Tiempo Real (Mapa Táctico / Radar)
                                </label>

                                {esMandoSuperior && (
                                    <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={publicarGlobal} onChange={(e) => setPublicarGlobal(e.target.checked)} />
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
                <div style={{ ...styles.card, flex: 1.5 }}>
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
                                        {event.matricula && (
                                            <div style={styles.metaData}>
                                                <span><b>Aeronave:</b> {event.aeronave} [{event.matricula}]</span>
                                            </div>
                                        )}
                                        {(event.origen?.nombre || event.destino?.nombre) && (
                                            <div style={{ ...styles.metaData, color: '#16a085' }}>
                                                📍 {event.origen?.nombre || 'S/D'} ➔ {event.destino?.nombre || 'S/D'}
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

// --- DISEÑO INTERFAZ DE COMANDO ---
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
    form: { display: 'flex', flexDirection: 'column', gap: '12px' },
    row: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
    group: { flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '140px' },
    label: { fontSize: '0.8rem', fontWeight: 'bold', color: '#2c3e50' },
    input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '0.9rem', outline: 'none', backgroundColor: '#fcfcfc' },
    select: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '0.9rem', outline: 'none', backgroundColor: '#ffffff' },
    fieldset: { border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '12px 15px', display: 'flex', flexDirection: 'column', gap: '8px', margin: '5px 0' },
    legend: { fontSize: '0.75rem', fontWeight: 'bold', color: '#16a085', padding: '0 5px' },
    textarea: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '80px', fontSize: '0.9rem', resize: 'none' },
    sdaBox: { display: 'flex', gap: '10px' },
    btnAdd: { background: '#1b3a57', color: 'white', border: 'none', borderRadius: '8px', width: '40px', cursor: 'pointer' },
    tagWrap: { display: 'flex', flexWrap: 'wrap', gap: '5px' },
    tag: { background: '#e1e8ed', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', color: '#1b3a57', display: 'flex', alignItems: 'center' },
    btnTagX: { background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', marginLeft: '5px', fontSize: '1rem' },
    btnSave: { color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', marginTop: '10px' },
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