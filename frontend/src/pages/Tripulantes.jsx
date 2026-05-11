import React, { useState, useEffect } from 'react';
import { Search, User, FileText, ChevronRight, UserPlus, AlertCircle, Clock, ShieldCheck, X, Save, Edit3, Trash2, PlusCircle, Calendar, Award, Star, Eye, Moon, Activity } from 'lucide-react';
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

    const [user] = useState({
        role: localStorage.getItem('role')?.toLowerCase() || 'user',
        unidad: localStorage.getItem('elemento')?.trim().toUpperCase() || '' 
    });

    const unidadesAE = ["B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8", "ESC AV EXPL ATQ 602", "SEC AE 11", "EC AE", "SEC AE MTE 3", "SEC AE DR", "B AB MANT AERON 601", "SEC AE MTE 12", "SEC AE 9", "SEC AE M 5"];
    const gradosAE = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST', 'SM', 'SP', 'SA', 'SI', 'SG', 'CI', 'CB'];
    const aeronavesAE = ["UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "AB206B3", "T-34C1", "T-6C", "C-207", "EMB-312", "G-120TP-A", "P-2002"];
    const rolesVuelo = ['Cursante','Mecánico', 'Copiloto', 'Piloto', 'Instructor', 'Normalizador', 'Inspector'];
    const capacitacionesTacticas = ["Transporte de Personal", "Transporte de Carga", "Sanitario", "Rappel", "Fast Rope", "Carga Externa", "Helibalde", "NVG", "Lanzamiento de Paracaidistas", "Lanzamiento de Carga", "Lanzamiento de Buzos", "Tiro Aereo", "Visual Nocturno", "IFR"];

    useEffect(() => { fetchPersonal(); }, []);

    const fetchPersonal = async () => {
        try {
            setLoading(true);
            const response = await getTripulantes();
            setPersonal(response.data || []);
            if (seleccionado) {
                const actualizado = response.data.find(p => p._id === seleccionado._id);
                if (actualizado) setSeleccionado(actualizado);
            }
        } catch (error) { console.error("❌ Error de carga:", error); } finally { setLoading(false); }
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
                psicofisicoVencimiento: seleccionado.certificaciones?.psicofisico?.vencimiento?.split('T')[0] || '',
                crmVencimiento: seleccionado.certificaciones?.crm?.vencimiento?.split('T')[0] || ''
            });
        } else if (type === 'horas') {
            setFormData({
                vueloDiurno: seleccionado.totalesHistoricos?.vueloDiurno || 0,
                vueloNocturno: seleccionado.totalesHistoricos?.vueloNocturno || 0,
                vueloInstrumental: seleccionado.totalesHistoricos?.vueloInstrumental || 0,
                vueloVisual: seleccionado.totalesHistoricos?.vueloVisual || 0
            });
        } else if (type === 'habilitacion') {
            setFormData({ 
                aeronave: '', rolActual: '', fechaHabilitacion: '', 
                hsVisual: 0, hsInstrumental: 0, hsNocturno: 0, hsNVG: 0 
            });
        } else if (type === 'capacitacion') {
            setFormData({ tipo: '', fechaAdquisicion: '', horasAcreditadas: 0 });
        }
        setShowEditModal(true);
    };

    const handleAction = async (e) => {
        e.preventDefault();
        try {
            if (showAltaModal) {
                await createTripulante(formData);
            } else {
                if (modalType === 'certificaciones') {
                    await updateTripulante(seleccionado._id, {
                        certificaciones: {
                            psicofisico: { vencimiento: formData.psicofisicoVencimiento },
                            crm: { vencimiento: formData.crmVencimiento }
                        }
                    });
                } else if (modalType === 'horas') {
                    await updateTripulante(seleccionado._id, { totalesHistoricos: formData });
                } else if (modalType === 'habilitacion') {
                    const totalSdA = Number(formData.hsVisual) + Number(formData.hsInstrumental) + Number(formData.hsNocturno) + Number(formData.hsNVG);
                    
                    const nuevosTotales = {
                        vueloDiurno: (seleccionado.totalesHistoricos?.vueloDiurno || 0) + Number(formData.hsVisual || 0),
                        vueloNocturno: (seleccionado.totalesHistoricos?.vueloNocturno || 0) + Number(formData.hsNocturno || 0),
                        vueloInstrumental: (seleccionado.totalesHistoricos?.vueloInstrumental || 0) + Number(formData.hsInstrumental || 0),
                        vueloVisual: (seleccionado.totalesHistoricos?.vueloVisual || 0) + Number(formData.hsNVG || 0)
                    };

                    await updateTripulante(seleccionado._id, { totalesHistoricos: nuevosTotales });
                    await API.post(`/tripulantes/${seleccionado._id}/habilitacion`, {
                        ...formData,
                        totalHorasSistema: totalSdA
                    });
                } else if (modalType === 'capacitacion') {
                    const nuevasHorasVisual = (seleccionado.totalesHistoricos?.vueloDiurno || 0) + Number(formData.horasAcreditadas || 0);
                    await updateTripulante(seleccionado._id, { 
                        totalesHistoricos: { ...seleccionado.totalesHistoricos, vueloDiurno: nuevasHorasVisual } 
                    });
                    await API.post(`/tripulantes/${seleccionado._id}/capacitacion`, formData);
                }
            }
            setShowAltaModal(false);
            setShowEditModal(false);
            await fetchPersonal();
        } catch (error) { alert("Fallo en la operación táctica."); }
    };

    const deleteSubItem = async (type, itemId) => {
        if (!window.confirm("¿Seguro desea eliminar este registro específico?")) return;
        try {
            let updatedData = { ...seleccionado };
            if (type === 'habilitacion') {
                updatedData.habilitaciones = seleccionado.habilitaciones.filter(h => h._id !== itemId);
            } else if (type === 'capacitacion') {
                updatedData.capacitacionesEspeciales = seleccionado.capacitacionesEspeciales.filter(c => c._id !== itemId);
            }
            await updateTripulante(seleccionado._id, updatedData);
            await fetchPersonal();
        } catch (error) { alert("Error al eliminar sub-item."); }
    };

    return (
        <div style={styles.dashboardContainer}>
            <div style={styles.sidebar}>
                <div style={styles.altaBox}>
                    <button style={styles.btnAlta} onClick={() => { setFormData({ grado: '', apellido: '', nombre: '', unidad: user.unidad }); setShowAltaModal(true); }}>
                        <UserPlus size={18} /> <span>Dar de Alta Personal</span>
                    </button>
                </div>
                <div style={styles.searchBox}>
                    <div style={styles.inputWrapper}>
                        <Search size={18} style={styles.searchIcon} />
                        <input type="text" placeholder="Buscar legajo..." style={styles.input} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                    </div>
                </div>
                <div style={styles.listContainer}>
                    {personal.filter(p => p.apellido?.toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                        <div key={p._id} onClick={() => setSeleccionado(p)} style={{...styles.personItem, backgroundColor: seleccionado?._id === p._id ? '#e3f2fd' : 'white', borderLeft: seleccionado?._id === p._id ? '4px solid #1b3a57' : '4px solid transparent'}}>
                            <div style={styles.personInfo}>
                                <span style={styles.itemGrado}>{p.grado} - {p.unidad}</span>
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
                                    {user.role === 'admin' && <button onClick={() => deleteTripulante(seleccionado._id)} style={styles.btnDelete}><Trash2 size={18}/></button>}
                                </div>
                                <span style={styles.legajoSubtitle}>{seleccionado.unidad}</span>
                            </div>
                        </div>

                        <div style={styles.legajoBody}>
                            {/* CERTIFICACIONES */}
                            <div style={styles.sectionHeader}>
                                <ShieldCheck size={18} /> <span>CERTIFICACIONES PERIÓDICAS</span>
                                <button onClick={() => handleOpenEdit('certificaciones')} style={styles.btnEditSmall}><Edit3 size={14}/></button>
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
                            </div>

                            {/* HORAS TOTALES */}
                            <div style={styles.sectionHeader}>
                                <Clock size={18} /> <span>LIBRETA DE VUELO (TOTALES GENERALES)</span>
                                <button onClick={() => handleOpenEdit('horas')} style={styles.btnEditSmall}><Edit3 size={14}/></button>
                            </div>
                            <div style={styles.gridStats}>
                                <div style={styles.statCard}><span style={styles.statLabel}>VISUAL</span><span style={styles.statValue}>{seleccionado.totalesHistoricos?.vueloDiurno || 0} hs</span></div>
                                <div style={styles.statCard}><span style={styles.statLabel}>NOCTURNO</span><span style={styles.statValue}>{seleccionado.totalesHistoricos?.vueloNocturno || 0} hs</span></div>
                                <div style={styles.statCard}><span style={styles.statLabel}>INSTRUMENTAL</span><span style={styles.statValue}>{seleccionado.totalesHistoricos?.vueloInstrumental || 0} hs</span></div>
                                <div style={styles.statCard}><span style={styles.statLabel}>NVG</span><span style={styles.statValue}>{seleccionado.totalesHistoricos?.vueloVisual || 0} hs</span></div>
                            </div>

                            {/* EXPERIENCIA POR SdA DESGLOSADA */}
                            <div style={styles.sectionHeader}>
                                <Award size={18} /> <span>EXPERIENCIA POR SISTEMA DE ARMAS</span>
                                <button onClick={() => handleOpenEdit('habilitacion')} style={styles.btnAddSmall}><PlusCircle size={14}/> AGREGAR SdA</button>
                            </div>
                            <div style={styles.habilitacionesList}>
                                {seleccionado.habilitaciones?.map((h, i) => (
                                    <div key={i} style={styles.habItem}>
                                        <div style={styles.habInfoMain}>
                                            <div style={styles.habTitleGroup}>
                                                <strong style={styles.habAeronave}>{h.aeronave}</strong>
                                                <span style={styles.habRol}>{h.rolActual}</span>
                                            </div>
                                            <div style={styles.habTimeInfo}>
                                                 <div style={styles.habBadge}><Calendar size={12} /> {h.fechaHabilitacion ? Math.floor((new Date() - new Date(h.fechaHabilitacion)) / (1000 * 60 * 60 * 24 * 365.25)) : 0} años</div>
                                                 <div style={{...styles.habBadge, backgroundColor: '#1b3a57', color: 'white'}}><Clock size={12} /> {h.totalHorasSistema || 0} HS TOTALES</div>
                                            </div>
                                        </div>
                                        
                                        <div style={styles.habDesgloseGrid}>
                                            <div style={styles.desgloseItem}><Eye size={12} /> <span style={styles.desgloseLabel}>V:</span> <strong>{h.hsVisual || 0}</strong></div>
                                            <div style={styles.desgloseItem}><Activity size={12} /> <span style={styles.desgloseLabel}>I:</span> <strong>{h.hsInstrumental || 0}</strong></div>
                                            <div style={styles.desgloseItem}><Moon size={12} /> <span style={styles.desgloseLabel}>N:</span> <strong>{h.hsNocturno || 0}</strong></div>
                                            <div style={styles.desgloseItem}><ShieldCheck size={12} /> <span style={styles.desgloseLabel}>NVG:</span> <strong>{h.hsNVG || 0}</strong></div>
                                        </div>

                                        <button onClick={() => deleteSubItem('habilitacion', h._id)} style={styles.btnIconDelete}><Trash2 size={16}/></button>
                                    </div>
                                ))}
                            </div>

                            {/* CAPACITACIONES */}
                            <div style={styles.sectionHeader}>
                                <Star size={18} /> <span>CAPACITACIONES TÁCTICAS</span>
                                <button onClick={() => handleOpenEdit('capacitacion')} style={styles.btnAddSmall}><PlusCircle size={14}/> REGISTRAR</button>
                            </div>
                            <div style={styles.tacticasContainer}>
                                {seleccionado.capacitacionesEspeciales?.map((c, i) => (
                                    <div key={i} style={styles.tacticaBadge}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', width: '100%'}}>
                                            <div style={{fontWeight: 'bold', fontSize: '0.75rem'}}>{c.tipo}</div>
                                            <button onClick={() => deleteSubItem('capacitacion', c._id)} style={styles.btnIconDeleteWhite}><X size={12}/></button>
                                        </div>
                                        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.65rem', opacity: 0.9}}>
                                            <span>{c.horasAcreditadas || 0} hs</span>
                                            <span>{c.fechaAdquisicion ? new Date(c.fechaAdquisicion).toLocaleDateString() : ''}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={styles.emptyState}><User size={60} color="#dcdde1" /><h3>Monitor de Legajos Digitales</h3></div>
                )}
            </div>

            {/* MODALES */}
            {(showAltaModal || showEditModal) && (
                <div style={styles.overlay}>
                    <div style={styles.modal}>
                        <div style={styles.modalHeader}>
                            <h3>{showAltaModal ? 'Dar de Alta Personal' : `Gestión de ${modalType.toUpperCase()}`}</h3>
                            <X size={24} style={{cursor:'pointer'}} onClick={() => {setShowAltaModal(false); setShowEditModal(false);}} />
                        </div>
                        <form onSubmit={handleAction} style={styles.form}>
                            {showAltaModal && (
                                <div style={styles.formCol}>
                                    <label style={styles.label}>Grado</label>
                                    <select style={styles.formInput} value={formData.grado} onChange={e => setFormData({...formData, grado: e.target.value})} required>
                                        <option value="">Seleccionar...</option>{gradosAE.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                    <label style={styles.label}>Apellido</label>
                                    <input type="text" placeholder="APELLIDO" style={styles.formInput} value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value.toUpperCase()})} required />
                                    <label style={styles.label}>Nombre</label>
                                    <input type="text" placeholder="Nombre" style={styles.formInput} value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
                                    <label style={styles.label}>Unidad</label>
                                    <select style={styles.formInput} value={formData.unidad} onChange={e => setFormData({...formData, unidad: e.target.value})} required>
                                        <option value="">Unidad...</option>{unidadesAE.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                            )}
                            {modalType === 'certificaciones' && (
                                <div style={styles.formCol}>
                                    <label style={styles.label}>Vencimiento Psicofísico</label>
                                    <input type="date" style={styles.formInput} value={formData.psicofisicoVencimiento} onChange={e => setFormData({...formData, psicofisicoVencimiento: e.target.value})} />
                                    <label style={styles.label}>Vencimiento CRM</label>
                                    <input type="date" style={styles.formInput} value={formData.crmVencimiento} onChange={e => setFormData({...formData, crmVencimiento: e.target.value})} />
                                </div>
                            )}
                            {modalType === 'horas' && (
                                <div style={styles.modalGrid2}>
                                    <div style={styles.formGroup}><label style={styles.label}>Visual (Total)</label>
                                    <input type="number" style={styles.formInput} value={formData.vueloDiurno} onChange={e => setFormData({...formData, vueloDiurno: e.target.value})} /></div>
                                    <div style={styles.formGroup}><label style={styles.label}>Nocturno (Total)</label>
                                    <input type="number" style={styles.formInput} value={formData.vueloNocturno} onChange={e => setFormData({...formData, vueloNocturno: e.target.value})} /></div>
                                    <div style={styles.formGroup}><label style={styles.label}>Instrumental (Total)</label>
                                    <input type="number" style={styles.formInput} value={formData.vueloInstrumental} onChange={e => setFormData({...formData, vueloInstrumental: e.target.value})} /></div>
                                    <div style={styles.formGroup}><label style={styles.label}>NVG (Total)</label>
                                    <input type="number" style={styles.formInput} value={formData.vueloVisual} onChange={e => setFormData({...formData, vueloVisual: e.target.value})} /></div>
                                </div>
                            )}
                            {modalType === 'habilitacion' && (
                                <div style={styles.formCol}>
                                    <label style={styles.label}>Sistema de Armas</label>
                                    <select style={styles.formInput} onChange={e => setFormData({...formData, aeronave: e.target.value})} required>
                                        <option value="">Seleccionar SdA...</option>{aeronavesAE.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                    <label style={styles.label}>Función Actual</label>
                                    <select style={styles.formInput} onChange={e => setFormData({...formData, rolActual: e.target.value})} required>
                                        <option value="">Seleccionar Rol...</option>{rolesVuelo.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <div style={styles.modalGrid2}>
                                        <div style={styles.formGroup}><label style={styles.label}>Hs Visual SdA</label>
                                        <input type="number" style={styles.formInput} value={formData.hsVisual} onChange={e => setFormData({...formData, hsVisual: e.target.value})} required /></div>
                                        <div style={styles.formGroup}><label style={styles.label}>Hs Nocturno SdA</label>
                                        <input type="number" style={styles.formInput} value={formData.hsNocturno} onChange={e => setFormData({...formData, hsNocturno: e.target.value})} required /></div>
                                        <div style={styles.formGroup}><label style={styles.label}>Hs Instrumental SdA</label>
                                        <input type="number" style={styles.formInput} value={formData.hsInstrumental} onChange={e => setFormData({...formData, hsInstrumental: e.target.value})} required /></div>
                                        <div style={styles.formGroup}><label style={styles.label}>Hs NVG SdA</label>
                                        <input type="number" style={styles.formInput} value={formData.hsNVG} onChange={e => setFormData({...formData, hsNVG: e.target.value})} required /></div>
                                    </div>
                                    <label style={styles.label}>Fecha Aptitud Inicial en SdA</label>
                                    <input type="date" style={styles.formInput} onChange={e => setFormData({...formData, fechaHabilitacion: e.target.value})} required />
                                </div>
                            )}
                            {modalType === 'capacitacion' && (
                                <div style={styles.formCol}>
                                    <label style={styles.label}>Capacitación</label>
                                    <select style={styles.formInput} onChange={e => setFormData({...formData, tipo: e.target.value})} required>
                                        <option value="">Seleccionar...</option>{capacitacionesTacticas.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <label style={styles.label}>Horas Acumuladas</label>
                                    <input type="number" style={styles.formInput} value={formData.horasAcreditadas} onChange={e => setFormData({...formData, horasAcreditadas: e.target.value})} required />
                                    <label style={styles.label}>Fecha Adquisición</label>
                                    <input type="date" style={styles.formInput} onChange={e => setFormData({...formData, fechaAdquisicion: e.target.value})} required />
                                </div>
                            )}
                            <button type="submit" style={styles.btnSave}><Save size={18} /> Guardar Cambios</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    dashboardContainer: { display: 'flex', height: '100vh', width: '100%', backgroundColor: '#f4f7f6', overflow: 'hidden' },
    sidebar: { width: '380px', borderRight: '1px solid #dcdde1', display: 'flex', flexDirection: 'column', backgroundColor: '#fff' },
    altaBox: { padding: '20px' },
    btnAlta: { width: '100%', backgroundColor: '#1b3a57', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold' },
    searchBox: { padding: '0 20px 20px 20px' },
    inputWrapper: { display: 'flex', alignItems: 'center', backgroundColor: '#f1f3f4', padding: '10px', borderRadius: '10px' },
    searchIcon: { color: '#7f8c8d', marginRight: '10px' },
    input: { border: 'none', backgroundColor: 'transparent', outline: 'none', width: '100%', fontSize: '0.9rem' },
    listContainer: { flex: 1, overflowY: 'auto' },
    personItem: { padding: '15px 20px', borderBottom: '1px solid #f1f2f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    personInfo: { display: 'flex', flexDirection: 'column' },
    itemGrado: { fontSize: '0.65rem', color: '#1b3a57', fontWeight: 'bold' },
    itemNombre: { fontSize: '0.95rem', color: '#2f3640', fontWeight: '600' },
    mainView: { flex: 1, padding: '25px', overflowY: 'auto' },
    legajoCard: { backgroundColor: '#fff', borderRadius: '15px', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' },
    legajoHeader: { padding: '25px', display: 'flex', alignItems: 'center', gap: '20px', backgroundColor: '#1b3a57', color: 'white', borderRadius: '15px 15px 0 0' },
    avatar: { width: '50px', height: '50px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    legajoTitle: { margin: 0, fontSize: '1.4rem', fontWeight: 'bold' },
    legajoSubtitle: { opacity: 0.8, fontSize: '0.9rem' },
    legajoBody: { padding: '25px' },
    sectionHeader: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 'bold', color: '#1b3a57', marginBottom: '15px', marginTop: '20px', borderBottom: '1px solid #eee', paddingBottom: '5px' },
    gridStats: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' },
    statCard: { padding: '12px', border: '1px solid #f1f2f6', borderRadius: '10px', display: 'flex', flexDirection: 'column', backgroundColor: '#fafbfc', position: 'relative' },
    statLabel: { fontSize: '0.55rem', color: '#7f8c8d', fontWeight: 'bold', textTransform: 'uppercase' },
    statValue: { fontSize: '1.1rem', fontWeight: 'bold', color: '#1b3a57' },
    statusTag: { fontSize: '0.5rem', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', marginTop: '5px', alignSelf: 'flex-start', textAlign: 'center' },
    habilitacionesList: { display: 'flex', flexDirection: 'column', gap: '10px' },
    habItem: { padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between' },
    habInfoMain: { flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '5px' },
    habTitleGroup: { display: 'flex', alignItems: 'baseline', gap: '10px' },
    habAeronave: { fontSize: '1.1rem', color: '#1b3a57' },
    habRol: { fontSize: '0.75rem', fontWeight: 'bold', color: '#636e72', textTransform: 'uppercase' },
    habTimeInfo: { display: 'flex', gap: '10px' },
    habBadge: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.65rem', backgroundColor: '#e8f5e9', color: '#27ae60', padding: '3px 8px', borderRadius: '5px', fontWeight: 'bold' },
    habDesgloseGrid: { flex: '2 1 350px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', backgroundColor: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #f1f2f6' },
    desgloseItem: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: '#1b3a57' },
    desgloseLabel: { color: '#95a5a6', fontSize: '0.65rem', fontWeight: 'bold' },
    tacticasContainer: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
    tacticaBadge: { padding: '8px 14px', backgroundColor: '#1b3a57', color: 'white', borderRadius: '8px', display: 'flex', flexDirection: 'column', minWidth: '140px' },
    btnEditSmall: { background: 'none', border: 'none', cursor: 'pointer', color: '#3498db', marginLeft: 'auto' },
    btnAddSmall: { background: '#27ae60', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' },
    btnIconDelete: { background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', opacity: 0.7, padding: '5px' },
    btnIconDeleteWhite: { background: 'none', border: 'none', cursor: 'pointer', color: 'white', opacity: 0.8, display: 'flex', alignItems: 'center' },
    btnDelete: { background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: '#ff7675', padding: '8px', borderRadius: '8px' },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 5000 },
    modal: { backgroundColor: 'white', width: '450px', borderRadius: '15px', padding: '25px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
    formCol: { display: 'flex', flexDirection: 'column', gap: '12px' },
    modalGrid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
    formInput: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', width: '100%' },
    label: { fontSize: '0.7rem', fontWeight: 'bold', color: '#7f8c8d' },
    btnSave: { backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
    emptyState: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#bdc3c7', textAlign: 'center' }
};

export default Tripulantes;