import React, { useState, useEffect } from 'react';
import { Search, User, FileText, ChevronRight, UserPlus, AlertCircle, Clock, ShieldCheck, X, Save, Edit3, Trash2, PlusCircle, Calendar, Award, Star, Eye, Moon, Activity, Navigation, Calculator, Bookmark } from 'lucide-react';
import API, { getTripulantes, createTripulante, updateTripulante, deleteTripulante } from '../services/api';

const Tripulantes = () => {
    const [busqueda, setBusqueda] = useState('');
    const [seleccionado, setSeleccionado] = useState(null);
    const [personal, setPersonal] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [showAltaModal, setShowAltaModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [modalType, setModalType] = useState(''); 
    const [formData, setFormData] = useState({});

    // --- NORMALIZACIÓN SINCRO JOKER v3.6 ---
    const rawRole = localStorage.getItem('role') || localStorage.getItem('rol') || 'user';
    const roleNormalizado = rawRole.toUpperCase().replace(/[\s_-]/g, '');
    const userUnidad = localStorage.getItem('elemento')?.trim().toUpperCase() || localStorage.getItem('unidad')?.trim().toUpperCase() || '';

    const esAdmin = roleNormalizado === 'ADMIN';
    const esGestorOperativo = ['ADMIN', 'OPERACIONES', 'JEFE', 'OFICINATECNICA'].includes(roleNormalizado);
    const puedeEliminarPersonal = ['ADMIN', 'OPERACIONES', 'JEFE'].includes(roleNormalizado);

    const unidadesAE = ["B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8", "ESC AV EXPL ATQ 602", "SEC AE 11", "EC AE", "SEC AE MTE 3", "SEC AE DR", "B AB MANT AERON 601", "SEC AE MTE 12", "SEC AE 9", "SEC AE M 5"];
    const gradosAE = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST', 'SM', 'SP', 'SA', 'SI', 'SG', 'CI', 'CB'];
    const aeronavesAE = ["UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "AB206B3", "T-34C1", "T-6C", "C-207", "EMB-312", "G-120TP-A", "P-2002", "T-41"];
    const rolesVuelo = ['Cursante','Mecánico', 'Copiloto', 'Piloto', 'Instructor', 'Normalizador', 'Inspector'];
    const capacitacionesTacticas = ["Transporte de Personal", "Transporte de Carga", "Sanitario", "Rappel", "Fast Rope", "Carga Externa", "Helibalde", "NVG", "Lanzamiento de Paracaidistas", "Lanzamiento de Carga", "Lanzamiento de Buzos", "Tiro Aereo", "Visual Nocturno", "IFR"];
    const aptitudesAdicionalesOp = ["Curso Radiooperador Restringido", "Capacitacion de Seguridad Operacional", "Capacitacion de Cargas Peligrosas"];

    useEffect(() => { fetchPersonal(); }, []);

    // --- CÓMPUTO DINÁMICO DE HORAS CONSOLIDADAS Y DEBUG ---
    const obtenerTotalesDinamicos = () => {
        const totales = { visual: 0, instrumental: 0, nocturno: 0, nvg: 0 };
        if (!seleccionado) return totales;

        // DEBUG: Imprimir la estructura real en la consola de F12
        console.log("=== DEBUG TRIPULANTE SELECCIONADO ===");
        console.log("Totales Historicos:", seleccionado.totalesHistoricos);
        console.log("Habilitaciones (SdA):", seleccionado.habilitaciones);

        if (Array.isArray(seleccionado.habilitaciones)) {
            const sumaSdA = seleccionado.habilitaciones.reduce((acc, h) => ({
                visual: acc.visual + Number(h.hsVisual || h.vueloDiurno || 0),
                instrumental: acc.instrumental + Number(h.hsInstrumental || h.vueloInstrumental || 0),
                nocturno: acc.nocturno + Number(h.hsNocturno || h.vueloNocturno || 0),
                nvg: acc.nvg + Number(h.hsNVG || h.vueloNVG || 0)
            }), { visual: 0, instrumental: 0, nocturno: 0, nvg: 0 });
            console.log("Suma directa únicamente de SdA:", sumaSdA);
        }

        // 1. Suma dinámica proveniente de las habilitaciones procesadas
        if (Array.isArray(seleccionado.habilitaciones)) {
            seleccionado.habilitaciones.forEach(h => {
                totales.visual += Number(h.hsVisual || h.vueloDiurno || 0);
                totales.instrumental += Number(h.hsInstrumental || h.vueloInstrumental || 0);
                totales.nocturno += Number(h.hsNocturno || h.vueloNocturno || 0);
                totales.nvg += Number(h.hsNVG || h.vueloNVG || 0);
            });
        }

        // 2. Suma de horas base o históricas si existen
        if (seleccionado.totalesHistoricos) {
            totales.visual += Number(seleccionado.totalesHistoricos.vueloDiurno || 0);
            totales.instrumental += Number(seleccionado.totalesHistoricos.vueloInstrumental || 0);
            totales.nocturno += Number(seleccionado.totalesHistoricos.vueloNocturno || 0);
            totales.nvg += Number(seleccionado.totalesHistoricos.vueloNVG || seleccionado.totalesHistoricos.nvg || 0);
        }

        // Redondeo decimal seguro
        totales.visual = Math.round(totales.visual * 10) / 10;
        totales.instrumental = Math.round(totales.instrumental * 10) / 10;
        totales.nocturno = Math.round(totales.nocturno * 10) / 10;
        totales.nvg = Math.round(totales.nvg * 10) / 10;

        console.log("Totales calculados finales para la vista:", totales);

        return totales;
    };

    const horasDinamicas = obtenerTotalesDinamicos();
    const totalGeneralHoras = Math.round((horasDinamicas.visual + horasDinamicas.instrumental + horasDinamicas.nocturno + horasDinamicas.nvg) * 10) / 10;

    const fetchPersonal = async () => {
        try {
            setLoading(true);
            const response = await getTripulantes();
            const dataFinal = response.data || [];
            
            setPersonal(dataFinal);
            
            if (seleccionado) {
                const actualizado = dataFinal.find(p => p._id === seleccionado._id);
                if (actualizado) setSeleccionado(actualizado);
                else setSeleccionado(null);
            }
        } catch (error) { 
            console.error("❌ Error de carga de personal:", error); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleEliminarTripulante = async (id) => {
        if (!window.confirm("¿ESTÁ SEGURO? Esta acción dará de baja el legajo operativo de la unidad.")) return;
        try {
            await deleteTripulante(id);
            alert("Legajo dado de baja correctamente (Historial de vuelos preservado).");
            setSeleccionado(null);
            await fetchPersonal();
        } catch (error) { alert("Error al procesar la baja. Verifique permisos o jurisdicción."); }
    };

    const getEstadoVencimiento = (fecha) => {
        if (!fecha) return { label: 'SIN DATOS', color: '#95a5a6' };
        const hoy = new Date();
        const fVenc = new Date(fecha);
        const difDias = Math.ceil((fVenc - hoy) / (1000 * 60 * 60 * 24));
        if (difDias < 0) return { label: 'VENCIDO', color: '#e74c3c' };
        if (difDias <= 30) return { label: 'PRÓXIMO A VENCER', color: '#f39c12' };
        return { label: 'AL DÍA', color: '#27ae60' };
    };

    const handleOpenEdit = (type) => {
        setModalType(type);
        if (type === 'certificaciones') {
            setFormData({
                psicofisicoUltimaFecha: seleccionado.certificaciones?.psicofisico?.ultimaFecha?.split('T')[0] || '',
                psicofisicoVencimiento: seleccionado.certificaciones?.psicofisico?.vencimiento?.split('T')[0] || '',
                crmUltimaFecha: seleccionado.certificaciones?.crm?.ultimaFecha?.split('T')[0] || '',
                crmVencimiento: seleccionado.certificaciones?.crm?.vencimiento?.split('T')[0] || '',
                simuladorUltimaFecha: seleccionado.certificaciones?.simulador?.ultimaFecha?.split('T')[0] || '',
                simuladorVencimiento: seleccionado.certificaciones?.simulador?.vencimiento?.split('T')[0] || ''
            });
        } else if (type === 'horas') {
            setFormData({
                vueloDiurno: seleccionado.totalesHistoricos?.vueloDiurno || 0,
                vueloNocturno: seleccionado.totalesHistoricos?.vueloNocturno || 0,
                vueloInstrumental: seleccionado.totalesHistoricos?.vueloInstrumental || 0,
                vueloNVG: seleccionado.totalesHistoricos?.vueloNVG || seleccionado.totalesHistoricos?.vueloVisual || 0
            });
        } else if (type === 'habilitacion') {
            setFormData({ 
                aeronave: '', rolActual: '', fechaHabilitacion: '', 
                hsVisual: 0, hsInstrumental: 0, hsNocturno: 0, hsNVG: 0, observaciones: '' 
            });
        } else if (type === 'capacitacion') {
            setFormData({ tipo: '', fechaAdquisicion: '', horasAcreditadas: 0, observaciones: '' });
        } else if (type === 'aptitudAdicional') {
            setFormData({ tipo: '', fechaAdquisicion: '', observaciones: '' });
        }
        setShowEditModal(true);
    };

    const handleAction = async (e) => {
        e.preventDefault();
        try {
            if (showAltaModal) {
                await createTripulante({ ...formData, elemento: formData.unidad });
                alert("Personal incorporado al legajo digital.");
            } else {
                if (modalType === 'certificaciones') {
                    await updateTripulante(seleccionado._id, {
                        certificaciones: {
                            psicofisico: { 
                                ultimaFecha: formData.psicofisicoUltimaFecha || null,
                                vencimiento: formData.psicofisicoVencimiento || null 
                            },
                            crm: { 
                                ultimaFecha: formData.crmUltimaFecha || null,
                                vencimiento: formData.crmVencimiento || null 
                            },
                            simulador: {
                                ultimaFecha: formData.simuladorUltimaFecha || null,
                                vencimiento: formData.simuladorVencimiento || null
                            }
                        }
                    });
                } else if (modalType === 'horas') {
                    await updateTripulante(seleccionado._id, { totalesHistoricos: formData });
                } else if (modalType === 'habilitacion') {
                    await API.post(`/tripulantes/${seleccionado._id}/habilitacion`, { 
                        aeronave: formData.aeronave,
                        fechaHabilitacion: formData.fechaHabilitacion,
                        rolActual: formData.rolActual,
                        hsVisual: Number(formData.hsVisual || 0),
                        hsInstrumental: Number(formData.hsInstrumental || 0),
                        hsNocturno: Number(formData.hsNocturno || 0),
                        hsNVG: Number(formData.hsNVG || 0),
                        observaciones: formData.observaciones || ''
                    });
                } else if (modalType === 'capacitacion') {
                    await API.post(`/tripulantes/${seleccionado._id}/capacitacion`, formData);
                } else if (modalType === 'aptitudAdicional') {
                    await API.post(`/tripulantes/${seleccionado._id}/aptitud-adicional`, formData);
                }
            }
            setShowAltaModal(false);
            setShowEditModal(false);
            await fetchPersonal();
        } catch (error) { 
            console.error(error);
            alert("Error en la operación del legajo. Verifique jurisdicción de unidad."); 
        }
    };

    const deleteSubItem = async (type, itemId) => {
        if (!esGestorOperativo) return;
        if (!window.confirm("¿Desea eliminar este registro del historial?")) return;
        try {
            let updatedData = { ...seleccionado };
            
            if (type === 'habilitacion') {
                updatedData.habilitaciones = seleccionado.habilitaciones.filter(h => h._id !== itemId);
            } else if (type === 'capacitacion') {
                updatedData.capacitacionesEspeciales = seleccionado.capacitacionesEspeciales.filter(c => c._id !== itemId);
            } else if (type === 'aptitudAdicional') {
                updatedData.aptitudesAdicionales = seleccionado.aptitudesAdicionales.filter(a => a._id !== itemId);
            }
            
            await updateTripulante(seleccionado._id, updatedData);
            await fetchPersonal();
        } catch (error) { 
            alert("Error al eliminar registro histórico."); 
        }
    };

    return (
        <div style={styles.dashboardContainer}>
            <div style={styles.sidebar}>
                {esGestorOperativo && (
                    <div style={styles.altaBox}>
                        <button style={styles.btnAlta} onClick={() => { setFormData({ grado: '', apellido: '', nombre: '', unidad: userUnidad }); setShowAltaModal(true); }}>
                            <UserPlus size={18} /> <span>Incorporar Personal</span>
                        </button>
                    </div>
                )}
                <div style={styles.searchBox}>
                    <div style={styles.inputWrapper}>
                        <Search size={18} style={styles.searchIcon} />
                        <input type="text" placeholder="Buscar apellido o legajo..." style={styles.input} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                    </div>
                </div>
                <div style={styles.listContainer}>
                    {personal.filter(p => p.apellido?.toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                        <div key={p._id} onClick={() => setSeleccionado(p)} style={{...styles.personItem, backgroundColor: seleccionado?._id === p._id ? '#e3f2fd' : 'white', borderLeft: seleccionado?._id === p._id ? '4px solid #1b3a57' : '4px solid transparent'}}>
                            <div style={styles.personInfo}>
                                <span style={styles.itemGrado}>{p.grado} - {p.elemento || p.unidad}</span>
                                <span style={styles.itemNombre}>{p.apellido}, {p.nombre}</span>
                            </div>
                            <ChevronRight size={16} color="#bdc3c7" />
                        </div>
                    ))}
                </div>
            </div>

            <div style={styles.mainView}>
                {seleccionado ? (
                    <div style={styles.legajoCard}>
                        <div style={styles.legajoHeader}>
                            <div style={styles.avatar}><User size={35} color="white" /></div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <h2 style={styles.legajoTitle}>{seleccionado.grado} {seleccionado.apellido}, {seleccionado.nombre}</h2>
                                    {puedeEliminarPersonal && (
                                        <button onClick={() => handleEliminarTripulante(seleccionado._id)} style={styles.btnDelete}>
                                            <Trash2 size={22}/>
                                        </button>
                                    )}
                                </div>
                                <span style={styles.legajoSubtitle}>{seleccionado.elemento || seleccionado.unidad}</span>
                            </div>
                        </div>

                        <div style={styles.legajoBody}>
                            <div style={styles.sectionHeader}>
                                <ShieldCheck size={18} /> <span>CERTIFICACIONES TÉCNICAS</span>
                                {esGestorOperativo && <button onClick={() => handleOpenEdit('certificaciones')} style={styles.btnEditSmall}><Edit3 size={14}/></button>}
                            </div>
                            <div style={styles.gridStats}>
                                <div style={styles.statCard}>
                                    <span style={styles.statLabel}>PSICOFÍSICO</span>
                                    <span style={{...styles.statValue, color: getEstadoVencimiento(seleccionado.certificaciones?.psicofisico?.vencimiento).color}}>
                                        {seleccionado.certificaciones?.psicofisico?.vencimiento ? new Date(seleccionado.certificaciones.psicofisico.vencimiento).toLocaleDateString() : 'S/D'}
                                    </span>
                                    <div style={{...styles.statusTag, backgroundColor: getEstadoVencimiento(seleccionado.certificaciones?.psicofisico?.vencimiento).color}}>
                                        {getEstadoVencimiento(seleccionado.certificaciones?.psicofisico?.vencimiento).label}
                                    </div>
                                </div>
                                <div style={styles.statCard}>
                                    <span style={styles.statLabel}>CRM</span>
                                    <span style={{...styles.statValue, color: getEstadoVencimiento(seleccionado.certificaciones?.crm?.vencimiento).color}}>
                                        {seleccionado.certificaciones?.crm?.vencimiento ? new Date(seleccionado.certificaciones.crm.vencimiento).toLocaleDateString() : 'S/D'}
                                    </span>
                                    <div style={{...styles.statusTag, backgroundColor: getEstadoVencimiento(seleccionado.certificaciones?.crm?.vencimiento).color}}>
                                        {getEstadoVencimiento(seleccionado.certificaciones?.crm?.vencimiento).label}
                                    </div>
                                </div>
                                <div style={styles.statCard}>
                                    <span style={styles.statLabel}>SIMULADOR</span>
                                    <span style={{...styles.statValue, color: getEstadoVencimiento(seleccionado.certificaciones?.simulador?.vencimiento).color}}>
                                        {seleccionado.certificaciones?.simulador?.vencimiento ? new Date(seleccionado.certificaciones.simulador.vencimiento).toLocaleDateString() : 'S/D'}
                                    </span>
                                    <div style={{...styles.statusTag, backgroundColor: getEstadoVencimiento(seleccionado.certificaciones?.simulador?.vencimiento).color}}>
                                        {getEstadoVencimiento(seleccionado.certificaciones?.simulador?.vencimiento).label}
                                    </div>
                                </div>
                            </div>

                            {/* TOTALES CONSOLIDADOS DINÁMICOS */}
                            <div style={styles.sectionHeader}>
                                <Clock size={18} /> <span>LIBRETA DE VUELO (TOTALES CONSOLIDADOS DINÁMICOS)</span>
                                {esGestorOperativo && <button onClick={() => handleOpenEdit('horas')} style={styles.btnEditSmall}><Edit3 size={14}/></button>}
                            </div>
                            <div style={styles.gridStats}>
                                <div style={styles.statCard}><span style={styles.statLabel}>VISUAL</span><span style={styles.statValue}>{horasDinamicas.visual.toFixed(1)} hs</span></div>
                                <div style={styles.statCard}><span style={styles.statLabel}>NOCTURNO</span><span style={styles.statValue}>{horasDinamicas.nocturno.toFixed(1)} hs</span></div>
                                <div style={styles.statCard}><span style={styles.statLabel}>INSTRUMENTAL</span><span style={styles.statValue}>{horasDinamicas.instrumental.toFixed(1)} hs</span></div>
                                <div style={styles.statCard}><span style={styles.statLabel}>NVG</span><span style={styles.statValue}>{horasDinamicas.nvg.toFixed(1)} hs</span></div>
                                <div style={{...styles.statCard, backgroundColor: '#eef6fc', borderColor: '#3498db'}}><span style={{...styles.statLabel, color: '#1b3a57'}}>TOTAL GENERAL</span><span style={{...styles.statValue, color: '#2980b9'}}>{totalGeneralHoras.toFixed(1)} hs</span></div>
                            </div>

                            {/* HABILITACIONES POR SISTEMA DE ARMAS (DINÁMICO - CORREGIDO) */}
                            <div style={styles.sectionHeader}>
                                <Award size={18} /> <span>HABILITACIONES POR SISTEMA DE ARMAS</span>
                                {esGestorOperativo && <button onClick={() => handleOpenEdit('habilitacion')} style={styles.btnAddSmall}><PlusCircle size={14}/> AGREGAR SdA</button>}
                            </div>
                            <div style={styles.habilitacionesList}>
                                {seleccionado.habilitaciones?.map((h, i) => {
                                    // Lectura segura con fallback entre nombres de propiedades posibles
                                    const v = Number(h.hsVisual !== undefined ? h.hsVisual : (h.vueloDiurno || 0));
                                    const inst = Number(h.hsInstrumental !== undefined ? h.hsInstrumental : (h.vueloInstrumental || 0));
                                    const noc = Number(h.hsNocturno !== undefined ? h.hsNocturno : (h.vueloNocturno || 0));
                                    const nvg = Number(h.hsNVG !== undefined ? h.hsNVG : (h.vueloNVG || 0));
                                    
                                    // Cálculo exacto en tiempo real del Total por SdA
                                    const totalSdA = (v + inst + noc + nvg).toFixed(1);
                                    
                                    return (
                                        <div key={h._id || i} style={styles.habItem}>
                                            <div style={styles.habInfoMain}>
                                                <div style={styles.habTitleGroup}>
                                                    <strong style={styles.habAeronave}>{h.aeronave}</strong>
                                                    <span style={styles.habRol}>{h.rolActual}</span>
                                                </div>
                                                <div style={styles.habTimeInfo}>
                                                     <div style={styles.habBadge}>
                                                        <Calendar size={12} /> 
                                                        {h.fechaHabilitacion ? Math.floor((new Date() - new Date(h.fechaHabilitacion)) / (1000 * 60 * 60 * 24 * 365.25)) : 0} años
                                                     </div>
                                                     <div style={{...styles.habBadge, backgroundColor: '#1b3a57', color: 'white'}}>
                                                        <Clock size={12} /> {totalSdA} HS TOTAL
                                                     </div>
                                                </div>
                                            </div>
                                            <div style={styles.habDesgloseGrid}>
                                                <div style={styles.desgloseItem} title="Visual (Diurno)">
                                                    <Eye size={12} /> <span>{v.toFixed(1)}</span>
                                                </div>
                                                <div style={styles.desgloseItem} title="Instrumental">
                                                    <Activity size={12} /> <span>{inst.toFixed(1)}</span>
                                                </div>
                                                <div style={styles.desgloseItem} title="Nocturno">
                                                    <Moon size={12} /> <span>{noc.toFixed(1)}</span>
                                                </div>
                                                <div style={styles.desgloseItem} title="NVG">
                                                    <ShieldCheck size={12} /> <span>{nvg.toFixed(1)}</span>
                                                </div>
                                            </div>
                                            {esGestorOperativo && (
                                                <button onClick={() => deleteSubItem('habilitacion', h._id)} style={styles.btnIconDelete}>
                                                    <Trash2 size={16}/>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={styles.sectionHeader}>
                                <Star size={18} /> <span>APTITUDES TÁCTICAS ESPECIALES</span>
                                {esGestorOperativo && <button onClick={() => handleOpenEdit('capacitacion')} style={styles.btnAddSmall}><PlusCircle size={14}/> REGISTRAR</button>}
                            </div>
                            <div style={styles.tacticasContainer}>
                                {seleccionado.capacitacionesEspeciales?.map((c, i) => (
                                    <div key={c._id || i} style={styles.tacticaBadge}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', width: '100%'}}>
                                            <div style={{fontWeight: 'bold', fontSize: '0.75rem'}}>{c.tipo}</div>
                                            {esGestorOperativo && <button onClick={() => deleteSubItem('capacitacion', c._id)} style={styles.btnIconDeleteWhite}><X size={12}/></button>}
                                        </div>
                                        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.65rem', opacity: 0.9}}>
                                            <span>{Number(c.horasAcreditadas || 0).toFixed(1)} hs</span>
                                            <span>{c.fechaAdquisicion ? new Date(c.fechaAdquisicion).toLocaleDateString() : ''}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={styles.sectionHeader}>
                                <Bookmark size={18} /> <span>APTITUDES ADICIONALES</span>
                                {esGestorOperativo && <button onClick={() => handleOpenEdit('aptitudAdicional')} style={styles.btnAddSmall}><PlusCircle size={14}/> REGISTRAR</button>}
                            </div>
                            <div style={styles.tacticasContainer}>
                                {seleccionado.aptitudesAdicionales?.map((a, i) => (
                                    <div key={a._id || i} style={{...styles.tacticaBadge, backgroundColor: '#2c3e50'}}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', width: '100%'}}>
                                            <div style={{fontWeight: 'bold', fontSize: '0.75rem'}}>{a.tipo}</div>
                                            {esGestorOperativo && <button onClick={() => deleteSubItem('aptitudAdicional', a._id)} style={styles.btnIconDeleteWhite}><X size={12}/></button>}
                                        </div>
                                        <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '4px', fontSize: '0.65rem', opacity: 0.9}}>
                                            <span>{a.fechaAdquisicion ? new Date(a.fechaAdquisicion).toLocaleDateString() : ''}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={styles.emptyState}><User size={60} color="#dcdde1" /><h3>Monitor de Legajos Digitales AE</h3></div>
                )}
            </div>

            {(showAltaModal || showEditModal) && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{showAltaModal ? 'Incorporación de Personal' : `Gestión de ${modalType.toUpperCase()}`}</h3>
                            <X size={24} style={{cursor:'pointer', color: '#7f8c8d'}} onClick={() => {setShowAltaModal(false); setShowEditModal(false);}} />
                        </div>
                        
                        <form onSubmit={handleAction} style={styles.formContainerScroll}>
                            <div style={styles.form}>
                                {showAltaModal && (
                                    <div style={styles.formCol}>
                                        <label style={styles.label}>Grado</label>
                                        <select style={styles.formInput} value={formData.grado || ''} onChange={e => setFormData({...formData, grado: e.target.value})} required>
                                            <option value="">Seleccionar...</option>{gradosAE.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                        <label style={styles.label}>Apellido</label>
                                        <input type="text" placeholder="APELLIDO" style={styles.formInput} value={formData.apellido || ''} onChange={e => setFormData({...formData, apellido: e.target.value.toUpperCase()})} required />
                                        <label style={styles.label}>Nombre</label>
                                        <input type="text" placeholder="Nombre" style={styles.formInput} value={formData.nombre || ''} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
                                        <label style={styles.label}>Unidad</label>
                                        <select style={styles.formInput} value={formData.unidad || ''} onChange={e => setFormData({...formData, unidad: e.target.value})} required>
                                            <option value="">Unidad...</option>{unidadesAE.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                )}
                                
                                {modalType === 'certificaciones' && (
                                    <div style={styles.formCol}>
                                        <label style={styles.label}>Última Fecha Psicofísico</label>
                                        <input type="date" style={styles.formInput} value={formData.psicofisicoUltimaFecha || ''} onChange={e => setFormData({...formData, psicofisicoUltimaFecha: e.target.value})} />
                                        <label style={styles.label}>Vencimiento Psicofísico</label>
                                        <input type="date" style={styles.formInput} value={formData.psicofisicoVencimiento || ''} onChange={e => setFormData({...formData, psicofisicoVencimiento: e.target.value})} />
                                        
                                        <label style={styles.label}>Última Fecha CRM</label>
                                        <input type="date" style={styles.formInput} value={formData.crmUltimaFecha || ''} onChange={e => setFormData({...formData, crmUltimaFecha: e.target.value})} />
                                        <label style={styles.label}>Vencimiento CRM</label>
                                        <input type="date" style={styles.formInput} value={formData.crmVencimiento || ''} onChange={e => setFormData({...formData, crmVencimiento: e.target.value})} />
                                        
                                        <label style={styles.label}>Última Fecha Simulador</label>
                                        <input type="date" style={styles.formInput} value={formData.simuladorUltimaFecha || ''} onChange={e => setFormData({...formData, simuladorUltimaFecha: e.target.value})} />
                                        <label style={styles.label}>Vencimiento Simulador</label>
                                        <input type="date" style={styles.formInput} value={formData.simuladorVencimiento || ''} onChange={e => setFormData({...formData, simuladorVencimiento: e.target.value})} />
                                    </div>
                                )}

                                {modalType === 'horas' && (
                                    <div style={styles.formCol}>
                                        <label style={styles.label}>Horas Visual Base (DB)</label>
                                        <input type="number" step="0.1" style={styles.formInput} value={formData.vueloDiurno || 0} onChange={e => setFormData({...formData, vueloDiurno: Number(e.target.value)})} required />
                                        <label style={styles.label}>Horas Nocturno Base (DB)</label>
                                        <input type="number" step="0.1" style={styles.formInput} value={formData.vueloNocturno || 0} onChange={e => setFormData({...formData, vueloNocturno: Number(e.target.value)})} required />
                                        <label style={styles.label}>Horas Instrumental Base (DB)</label>
                                        <input type="number" step="0.1" style={styles.formInput} value={formData.vueloInstrumental || 0} onChange={e => setFormData({...formData, vueloInstrumental: Number(e.target.value)})} required />
                                        <label style={styles.label}>Horas NVG Base (DB)</label>
                                        <input type="number" step="0.1" style={styles.formInput} value={formData.vueloNVG || 0} onChange={e => setFormData({...formData, vueloNVG: Number(e.target.value)})} required />
                                    </div>
                                )}

                                {modalType === 'habilitacion' && (
                                    <div style={styles.formCol}>
                                        <label style={styles.label}>SdA</label>
                                        <select style={styles.formInput} value={formData.aeronave || ''} onChange={e => setFormData({...formData, aeronave: e.target.value})} required>
                                            <option value="">Seleccionar...</option>{aeronavesAE.map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                        <label style={styles.label}>Función</label>
                                        <select style={styles.formInput} value={formData.rolActual || ''} onChange={e => setFormData({...formData, rolActual: e.target.value})} required>
                                            <option value="">Rol...</option>{rolesVuelo.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                        <label style={styles.label}>Hs Visual Base (X)</label>
                                        <input type="number" step="0.1" style={styles.formInput} value={formData.hsVisual || 0} onChange={e => setFormData({...formData, hsVisual: Number(e.target.value)})} required />
                                        <label style={styles.label}>Hs Nocturno Base (X)</label>
                                        <input type="number" step="0.1" style={styles.formInput} value={formData.hsNocturno || 0} onChange={e => setFormData({...formData, hsNocturno: Number(e.target.value)})} required />
                                        <label style={styles.label}>Hs Instrumental Base (X)</label>
                                        <input type="number" step="0.1" style={styles.formInput} value={formData.hsInstrumental || 0} onChange={e => setFormData({...formData, hsInstrumental: Number(e.target.value)})} required />
                                        <label style={styles.label}>Hs NVG Base (X)</label>
                                        <input type="number" step="0.1" style={styles.formInput} value={formData.hsNVG || 0} onChange={e => setFormData({...formData, hsNVG: Number(e.target.value)})} required />
                                        <label style={styles.label}>Fecha Aptitud Inicial</label>
                                        <input type="date" style={styles.formInput} value={formData.fechaHabilitacion || ''} onChange={e => setFormData({...formData, fechaHabilitacion: e.target.value})} required />
                                        <label style={styles.label}>Observaciones / Notas</label>
                                        <input type="text" placeholder="Opcional..." style={styles.formInput} value={formData.observaciones || ''} onChange={e => setFormData({...formData, observaciones: e.target.value})} />
                                    </div>
                                )}

                                {modalType === 'capacitacion' && (
                                    <div style={styles.formCol}>
                                        <label style={styles.label}>Capacitación</label>
                                        <select style={styles.formInput} value={formData.tipo || ''} onChange={e => setFormData({...formData, tipo: e.target.value})} required>
                                            <option value="">Seleccionar...</option>{capacitacionesTacticas.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <label style={styles.label}>Horas Acreditadas Iniciales</label>
                                        <input type="number" step="0.1" style={styles.formInput} value={formData.horasAcreditadas || 0} onChange={e => setFormData({...formData, horasAcreditadas: Number(e.target.value)})} required />
                                        <label style={styles.label}>Fecha Adquisición</label>
                                        <input type="date" style={styles.formInput} value={formData.fechaAdquisicion || ''} onChange={e => setFormData({...formData, fechaAdquisicion: e.target.value})} required />
                                        <label style={styles.label}>Observaciones</label>
                                        <input type="text" placeholder="Opcional..." style={styles.formInput} value={formData.observaciones || ''} onChange={e => setFormData({...formData, observaciones: e.target.value})} />
                                    </div>
                                )}

                                {modalType === 'aptitudAdicional' && (
                                    <div style={styles.formCol}>
                                        <label style={styles.label}>Aptitud Adicional</label>
                                        <select style={styles.formInput} value={formData.tipo || ''} onChange={e => setFormData({...formData, tipo: e.target.value})} required>
                                            <option value="">Seleccionar...</option>{aptitudesAdicionalesOp.map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                        <label style={styles.label}>Fecha Adquisición</label>
                                        <input type="date" style={styles.formInput} value={formData.fechaAdquisicion || ''} onChange={e => setFormData({...formData, fechaAdquisicion: e.target.value})} required />
                                        <label style={styles.label}>Observaciones</label>
                                        <input type="text" placeholder="Opcional..." style={styles.formInput} value={formData.observaciones || ''} onChange={e => setFormData({...formData, observaciones: e.target.value})} />
                                    </div>
                                )}
                            </div>
                            
                            <div style={styles.modalFooter}>
                                <button type="submit" style={styles.btnSave}><Save size={18} /> Confirmar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    dashboardContainer: { display: 'flex', height: 'calc(100vh - 65px)', backgroundColor: '#f5f6fa' },
    sidebar: { width: '350px', backgroundColor: 'white', borderRight: '1px solid #dcdde1', display: 'flex', flexDirection: 'column' },
    altaBox: { padding: '15px', borderBottom: '1px solid #eee' },
    btnAlta: { width: '100%', backgroundColor: '#1b3a57', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold', cursor: 'pointer' },
    searchBox: { padding: '15px', backgroundColor: '#f8f9fa' },
    inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
    searchIcon: { position: 'absolute', left: '10px', color: '#7f8c8d' },
    input: { width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px', border: '1px solid #dcdde1', outline: 'none' },
    listContainer: { flex: 1, overflowY: 'auto' },
    personItem: { padding: '15px', borderBottom: '1px solid #f1f2f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: '0.2s' },
    personInfo: { display: 'flex', flexDirection: 'column' },
    itemGrado: { fontSize: '0.7rem', color: '#7f8c8d', fontWeight: 'bold' },
    itemNombre: { fontSize: '0.9rem', color: '#2f3640', fontWeight: '600' },
    mainView: { flex: 1, padding: '30px', overflowY: 'auto' },
    legajoCard: { backgroundColor: 'white', borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', overflow: 'hidden' },
    legajoHeader: { padding: '25px', backgroundColor: '#1b3a57', color: 'white', display: 'flex', alignItems: 'center', gap: '20px' },
    avatar: { width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.2)' },
    legajoTitle: { margin: 0, fontSize: '1.4rem', fontWeight: 'bold' },
    legajoSubtitle: { opacity: 0.8, fontSize: '0.9rem' },
    legajoBody: { padding: '25px' },
    sectionHeader: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 'bold', color: '#1b3a57', borderBottom: '2px solid #f1f2f6', paddingBottom: '10px', marginBottom: '20px', marginTop: '30px' },
    gridStats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px' },
    statCard: { padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '10px', border: '1px solid #eee', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' },
    statLabel: { fontSize: '0.65rem', color: '#7f8c8d', fontWeight: 'bold', textTransform: 'uppercase' },
    statValue: { fontSize: '1.1rem', fontWeight: 'bold', color: '#1b3a57' },
    statusTag: { fontSize: '0.6rem', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', marginTop: '5px' },
    habilitacionesList: { display: 'flex', flexDirection: 'column', gap: '10px' },
    habItem: { padding: '15px', backgroundColor: '#fcfcfc', borderRadius: '10px', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    habInfoMain: { flex: 1 },
    habTitleGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
    habAeronave: { fontSize: '1rem', color: '#1b3a57' },
    habRol: { fontSize: '0.75rem', background: '#e1e8ed', padding: '2px 8px', borderRadius: '4px', color: '#1b3a57', fontWeight: 'bold' },
    habTimeInfo: { display: 'flex', gap: '10px', marginTop: '5px' },
    habBadge: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.65rem', color: '#7f8c8d', background: '#eee', padding: '2px 6px', borderRadius: '4px' },
    habDesgloseGrid: { display: 'flex', gap: '15px', marginRight: '20px' },
    desgloseItem: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#1b3a57', fontWeight: 'bold' },
    tacticasContainer: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
    tacticaBadge: { background: '#1b3a57', color: 'white', padding: '8px 12px', borderRadius: '8px', minWidth: '140px' },
    btnEditSmall: { background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', marginLeft: '10px' },
    btnAddSmall: { background: '#27ae60', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto' },
    btnDelete: { background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', transition: '0.2s', padding: '5px', borderRadius: '5px' },
    btnIconDelete: { background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', opacity: 0.6 },
    emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#7f8c8d', gap: '10px' },

    overlay: { 
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
        backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', 
        alignItems: 'center', justifyContent: 'center', zIndex: 2000,
        padding: '20px'
    },
    modal: { 
        backgroundColor: 'white', borderRadius: '12px', width: '100%', 
        maxWidth: '500px', display: 'flex', flexDirection: 'column', 
        boxShadow: '0 15px 35px rgba(0,0,0,0.2)', overflow: 'hidden',
        maxHeight: 'calc(100vh - 40px)'
    },
    modalHeader: { 
        padding: '20px', borderBottom: '1px solid #eef0f3', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#fff'
    },
    formContainerScroll: {
        display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1
    },
    form: { 
        padding: '20px', overflowY: 'auto', flex: 1,
        maxHeight: '60vh'
    },
    formCol: { display: 'flex', flexDirection: 'column', gap: '4px' },
    label: { fontSize: '0.8rem', fontWeight: 'bold', color: '#1b3a57', marginTop: '10px', marginBottom: '4px' },
    formInput: { 
        width: '100%', padding: '10px', borderRadius: '6px', 
        border: '1px solid #dcdde1', outline: 'none', fontSize: '0.9rem',
        boxSizing: 'border-box'
    },
    modalFooter: {
        padding: '15px 20px', borderTop: '1px solid #eef0f3',
        backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'flex-end'
    },
    btnSave: { 
        width: '100%', backgroundColor: '#1b3a57', color: 'white', 
        border: 'none', padding: '12px', borderRadius: '8px', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        gap: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' 
    },
    btnIconDeleteWhite: { background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8 }
};

export default Tripulantes;