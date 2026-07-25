import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    FaPlus, 
    FaTrash, 
    FaSave, 
    FaPlane, 
    FaCog, 
    FaFan, 
    FaClock, 
    FaCalendarAlt, 
    FaSearch, 
    FaCheckCircle, 
    FaExclamationTriangle 
} from 'react-icons/fa';

const ProgramaMantenimiento = ({ aeronaveId }) => {
    // ----------------------------------------------------
    // ESTADOS
    // ----------------------------------------------------
    const [loading, setLoading] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const [tabActivo, setTabActivo] = useState('programaPlaneador');

    // Datos del Programa
    const [programa, setPrograma] = useState({
        tgPlaneadorActual: "0.0",
        tgMotorActual: "0.0",
        tgMotor2Actual: "0.0",
        tgHeliceActual: "0.0",
        tgHelice2Actual: "0.0",
        programaPlaneador: [],
        programaMotor: [],
        programaMotor2: [],
        programaHelice: [],
        programaHelice2: []
    });

    // Componentes de la BD (Solo Lectura)
    const [listaComponentes, setListaComponentes] = useState([]);
    const [sistemaFiltro, setSistemaFiltro] = useState('Planeador');
    const [componenteSeleccionadoId, setComponenteSeleccionadoId] = useState('');
    const [componenteDetalle, setComponenteDetalle] = useState(null);

    // ----------------------------------------------------
    // CARGA INICIAL DE DATOS
    // ----------------------------------------------------
    useEffect(() => {
        if (aeronaveId) {
            cargarPrograma();
            cargarComponentesAeronave();
        }
    }, [aeronaveId]);

    const cargarPrograma = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/programa-mantenimiento/${aeronaveId}`);
            if (res.data && res.data.data) {
                setPrograma(res.data.data);
            }
        } catch (err) {
            console.error("Error al cargar programa:", err);
            mostrarNotificacion("error", "Error al cargar el programa de mantenimiento.");
        } finally {
            setLoading(false);
        }
    };

    const cargarComponentesAeronave = async () => {
        try {
            const res = await axios.get(`/api/aeronaves/${aeronaveId}/componentes`);
            if (res.data && Array.isArray(res.data)) {
                setListaComponentes(res.data);
            }
        } catch (err) {
            console.error("Error al cargar componentes:", err);
        }
    };

    // ----------------------------------------------------
    // LÓGICA DE VISOR DE COMPONENTES (SOLO LECTURA)
    // ----------------------------------------------------
    const componentesFiltradosVisor = listaComponentes.filter(c => {
        if (!c.sistema) return sistemaFiltro === 'Planeador';
        return c.sistema.toLowerCase() === sistemaFiltro.toLowerCase();
    });

    useEffect(() => {
        if (!componenteSeleccionadoId) {
            setComponenteDetalle(null);
            return;
        }
        const comp = listaComponentes.find(c => (c._id || c.id) === componenteSeleccionadoId);
        setComponenteDetalle(comp || null);
    }, [componenteSeleccionadoId, listaComponentes]);

    // Helper para formatear decimales de forma segura
    const parseNum = (val) => {
        if (!val) return 0;
        const clean = String(val).replace(',', '.');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    };

    // ----------------------------------------------------
    // RECALCULO AUTOMÁTICO DE RENGLÓN
    // ----------------------------------------------------
    const calcularRenglon = (renglon, tgActual) => {
        let r = { ...renglon };

        if (r.tipoCriterio === 'HORAS') {
            const ultHs = parseNum(r.ultHs);
            const intHs = parseNum(r.intervaloHs);
            const tg = parseNum(tgActual);

            if (intHs > 0) {
                const proxHsCalc = ultHs + intHs;
                r.proxHs = proxHsCalc.toFixed(1);
                
                const dispCalc = proxHsCalc - tg;
                r.disp = dispCalc.toFixed(1);
            }
        } else if (r.tipoCriterio === 'MESES') {
            const intMeses = parseInt(r.intervaloMeses) || 0;
            if (r.ultFecha && intMeses > 0) {
                const fechaBase = new Date(r.ultFecha);
                if (!isNaN(fechaBase.getTime())) {
                    fechaBase.setMonth(fechaBase.getMonth() + intMeses);
                    r.proxFecha = fechaBase.toISOString().split('T')[0];
                }
            }
        }

        return r;
    };

    // ----------------------------------------------------
    // MANEJO DE RENGLONES EN LA TABLA
    // ----------------------------------------------------
    const handleRenglonChange = (index, campo, valor) => {
        setPrograma(prev => {
            const nuevosRenglones = [...prev[tabActivo]];
            const tgActual = getTgActualTab().val;

            let renglonModificado = {
                ...nuevosRenglones[index],
                [campo]: valor
            };

            // Recalcular automáticamente vencimiento/disponible
            renglonModificado = calcularRenglon(renglonModificado, tgActual);
            nuevosRenglones[index] = renglonModificado;

            return { ...prev, [tabActivo]: nuevosRenglones };
        });
    };

    const handleSelectComponenteEnFila = (index, compId) => {
        const comp = listaComponentes.find(c => (c._id || c.id) === compId);

        setPrograma(prev => {
            const nuevosRenglones = [...prev[tabActivo]];
            const tgActual = getTgActualTab().val;

            if (comp) {
                let nuevoRenglon = {
                    ...nuevosRenglones[index],
                    componenteRef: comp._id || comp.id,
                    componenteNombre: `${comp.nombre || 'COMPONENTE'} (P/N: ${comp.pn || 'S/D'})`,
                    tgComponente: comp.tgInstalacion || comp.tgAcumulado || "0.0",
                    limiteComponente: `${comp.limiteValor || ''} ${comp.limiteUnidad || ''} ${comp.limiteTipo ? `(${comp.limiteTipo})` : ''}`.trim(),
                    dispComponente: comp.disponibleReal || comp.disponible || "0.0",
                    descripcion: nuevosRenglones[index].descripcion || `INSPECCIÓN DE ${comp.nombre?.toUpperCase() || 'COMPONENTE'}`
                };

                nuevosRenglones[index] = calcularRenglon(nuevoRenglon, tgActual);
            } else {
                nuevosRenglones[index] = {
                    ...nuevosRenglones[index],
                    componenteRef: "",
                    componenteNombre: "",
                    tgComponente: "",
                    limiteComponente: "",
                    dispComponente: ""
                };
            }
            return { ...prev, [tabActivo]: nuevosRenglones };
        });
    };

    const agregarRenglon = () => {
        const nuevoRenglon = {
            id: `temp-${Date.now()}`,
            componenteRef: "",
            componenteNombre: "",
            tgComponente: "",
            limiteComponente: "",
            dispComponente: "",
            descripcion: "",
            tipoCriterio: "HORAS",
            intervaloHs: "",
            intervaloMeses: 0,
            intervaloLandings: 0,
            intervaloCiclos: 0,
            ultHs: "",
            ultFecha: "",
            ultLandings: "",
            ultCiclos: "",
            ultOt: "",
            proxHs: "",
            proxFecha: "",
            proxLandings: "",
            proxCiclos: "",
            responsable: "Ec AE",
            disp: ""
        };

        setPrograma(prev => ({
            ...prev,
            [tabActivo]: [...prev[tabActivo], nuevoRenglon]
        }));
    };

    const eliminarRenglon = (index) => {
        setPrograma(prev => {
            const nuevosRenglones = [...prev[tabActivo]];
            nuevosRenglones.splice(index, 1);
            return { ...prev, [tabActivo]: nuevosRenglones };
        });
    };

    // ----------------------------------------------------
    // PERSISTENCIA (GUARDAR EN PROGRAMA)
    // ----------------------------------------------------
    const guardarPrograma = async () => {
        setLoading(true);
        try {
            const payload = {
                aeronaveId,
                ...programa
            };

            const res = await axios.post('/api/programa-mantenimiento/guardar', payload);
            if (res.data && res.data.status === 'success') {
                mostrarNotificacion("success", "Programa de mantenimiento guardado correctamente.");
                if (res.data.data) {
                    setPrograma(res.data.data);
                }
            }
        } catch (err) {
            console.error("Error al guardar programa:", err);
            mostrarNotificacion("error", "Error al guardar el programa de mantenimiento.");
        } finally {
            setLoading(false);
        }
    };

    const mostrarNotificacion = (tipo, text) => {
        setMensaje({ tipo, text });
        setTimeout(() => setMensaje(null), 4000);
    };

    // Helper para etiqueta de TG según el Tab activo
    const getTgActualTab = () => {
        switch (tabActivo) {
            case 'programaPlaneador': return { label: 'TOTAL PLANEADOR ACTUAL', val: programa.tgPlaneadorActual, key: 'tgPlaneadorActual' };
            case 'programaMotor': return { label: 'TOTAL MOTOR 1 ACTUAL', val: programa.tgMotorActual, key: 'tgMotorActual' };
            case 'programaMotor2': return { label: 'TOTAL MOTOR 2 ACTUAL', val: programa.tgMotor2Actual, key: 'tgMotor2Actual' };
            case 'programaHelice': return { label: 'TOTAL HÉLICE 1 ACTUAL', val: programa.tgHeliceActual, key: 'tgHeliceActual' };
            case 'programaHelice2': return { label: 'TOTAL HÉLICE 2 ACTUAL', val: programa.tgHelice2Actual, key: 'tgHelice2Actual' };
            default: return { label: 'TOTAL ACTUAL', val: '0.0', key: '' };
        }
    };

    const currentTg = getTgActualTab();

    return (
        <div className="p-4 bg-slate-900 min-h-screen text-slate-100 font-sans">
            
            {/* NOTIFICACIÓN FLOTANTE */}
            {mensaje && (
                <div className={`mb-4 p-3 rounded flex items-center gap-2 text-sm font-semibold border ${
                    mensaje.tipo === 'success' 
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200' 
                        : 'bg-rose-950/80 border-rose-500 text-rose-200'
                }`}>
                    {mensaje.tipo === 'success' ? <FaCheckCircle className="text-emerald-400" /> : <FaExclamationTriangle className="text-rose-400" />}
                    <span>{mensaje.text}</span>
                </div>
            )}

            {/* 1. VISOR DE COMPONENTES / FICHA TÉCNICA (SOLO LECTURA) */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 mb-6 shadow-md">
                <div className="flex items-center gap-2 mb-3 text-amber-400 font-bold text-sm tracking-wider uppercase">
                    <FaSearch /> VISOR DE COMPONENTES / FICHA TÉCNICA (SOLO LECTURA)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">SISTEMA / GRUPO</label>
                        <select 
                            value={sistemaFiltro} 
                            onChange={(e) => {
                                setSistemaFiltro(e.target.value);
                                setComponenteSeleccionadoId('');
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                        >
                            <option value="Planeador">Planeador</option>
                            <option value="Motor 1">Motor 1</option>
                            <option value="Motor 2">Motor 2</option>
                            <option value="Hélice 1">Hélice 1</option>
                            <option value="Hélice 2">Hélice 2</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">SELECCIONAR COMPONENTE A CONSULTAR</label>
                        <select 
                            value={componenteSeleccionadoId} 
                            onChange={(e) => setComponenteSeleccionadoId(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                        >
                            <option value="">-- Seleccionar para ver detalle completo --</option>
                            {componentesFiltradosVisor.map((comp) => (
                                <option key={comp._id || comp.id} value={comp._id || comp.id}>
                                    {comp.nombre} | P/N: {comp.pn || 'N/A'} | S/N: {comp.sn || 'N/A'}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* RESUMEN ESTÁTICO DE INFORMACIÓN DE LA BD */}
                {componenteDetalle ? (
                    <div className="bg-slate-950/80 border border-slate-700/80 rounded p-3 grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
                        <div>
                            <span className="block text-slate-500 uppercase font-semibold">ATA</span>
                            <span className="text-slate-200 font-mono text-sm">{componenteDetalle.ata || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-500 uppercase font-semibold">P/N (Part Number)</span>
                            <span className="text-slate-200 font-mono text-sm">{componenteDetalle.pn || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-500 uppercase font-semibold">S/N (Serial Number)</span>
                            <span className="text-slate-200 font-mono text-sm">{componenteDetalle.sn || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-500 uppercase font-semibold">TG Instalación</span>
                            <span className="text-amber-400 font-mono text-sm">{componenteDetalle.tgInstalacion || componenteDetalle.tgAcumulado || '0.0'}</span>
                        </div>
                        <div>
                            <span className="block text-slate-500 uppercase font-semibold">Límite BD</span>
                            <span className="text-slate-200 font-mono text-sm">
                                {componenteDetalle.limiteValor || '-'} {componenteDetalle.limiteUnidad || ''}
                            </span>
                        </div>
                        <div>
                            <span className="block text-slate-500 uppercase font-semibold">Disponible BD</span>
                            <span className="text-emerald-400 font-bold font-mono text-sm">
                                {componenteDetalle.disponibleReal || componenteDetalle.disponible || 'N/A'}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-slate-500 italic text-center py-2 border border-dashed border-slate-700/60 rounded">
                        Seleccione un componente del desplegable para consultar su ficha técnica grabada en la base de datos sin alterar registros.
                    </div>
                )}
            </div>

            {/* 2. BARRA DE NAVEGACIÓN DE TABS DEL PROGRAMA */}
            <div className="flex flex-wrap gap-2 mb-4 border-b border-slate-700 pb-2">
                {[
                    { key: 'programaPlaneador', label: 'PLANEADOR', icon: FaPlane },
                    { key: 'programaMotor', label: 'MOTOR 1', icon: FaCog },
                    { key: 'programaMotor2', label: 'MOTOR 2', icon: FaCog },
                    { key: 'programaHelice', label: 'HÉLICE 1', icon: FaFan },
                    { key: 'programaHelice2', label: 'HÉLICE 2', icon: FaFan },
                ].map(tab => {
                    const IconComponent = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setTabActivo(tab.key)}
                            className={`px-4 py-2 rounded-t font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
                                tabActivo === tab.key 
                                    ? 'bg-amber-500 text-slate-950 shadow' 
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                            }`}
                        >
                            <IconComponent /> {tab.label} ({programa[tab.key]?.length || 0})
                        </button>
                    );
                })}
            </div>

            {/* CABECERA DE TABLA CON TG Y BOTÓN AGREGAR */}
            <div className="flex flex-wrap justify-between items-center bg-slate-800 p-3 rounded-t border border-slate-700 gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300 uppercase">{currentTg.label}:</span>
                    <input 
                        type="text" 
                        value={currentTg.val}
                        onChange={(e) => setPrograma(prev => ({ ...prev, [currentTg.key]: e.target.value }))}
                        className="bg-sky-950 border border-sky-500 text-sky-200 font-mono font-bold text-sm px-3 py-1 rounded w-28 text-center"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={agregarRenglon}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 transition shadow"
                    >
                        <FaPlus /> AGREGAR INSPECCIÓN
                    </button>
                    <button 
                        onClick={guardarPrograma}
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded flex items-center gap-1.5 transition shadow disabled:opacity-50"
                    >
                        <FaSave /> {loading ? "GUARDANDO..." : "GUARDAR PROGRAMA"}
                    </button>
                </div>
            </div>

            {/* 3. TABLA DEL PROGRAMA DE MANTENIMIENTO */}
            <div className="overflow-x-auto border-x border-b border-slate-700 rounded-b bg-slate-900 shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="bg-slate-950 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-700">
                            <th className="p-2 border-r border-slate-800 min-w-[240px]">Componente (BD) / Descripción Inspección</th>
                            <th className="p-2 border-r border-slate-800 w-32">Criterio Alerta</th>
                            <th className="p-2 border-r border-slate-800 w-28">Intervalo</th>
                            <th className="p-2 border-r border-slate-800 w-28">Últ. Cumplimiento</th>
                            <th className="p-2 border-r border-slate-800 w-24">Últ. Fecha</th>
                            <th className="p-2 border-r border-slate-800 w-24">O.T.</th>
                            <th className="p-2 border-r border-slate-800 w-28">Próx. Vencimiento</th>
                            <th className="p-2 border-r border-slate-800 w-24">Próx. Fecha</th>
                            <th className="p-2 border-r border-slate-800 w-24">Resp.</th>
                            <th className="p-2 border-r border-slate-800 w-24">Disp / Rem.</th>
                            <th className="p-2 text-center w-12">Acc</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                        {programa[tabActivo]?.length === 0 ? (
                            <tr>
                                <td colSpan="11" className="p-8 text-center text-slate-500 italic">
                                    No hay inspecciones registradas en esta sección. Presione "Agregar Inspección" para crear una nueva alerta.
                                </td>
                            </tr>
                        ) : (
                            programa[tabActivo]?.map((renglon, idx) => (
                                <tr key={renglon.id || renglon._id || idx} className="hover:bg-slate-800/50 transition">
                                    
                                    {/* COMPONENTE BD + DESCRIPCIÓN */}
                                    <td className="p-2 border-r border-slate-800 align-top">
                                        <select 
                                            value={renglon.componenteRef || ""}
                                            onChange={(e) => handleSelectComponenteEnFila(idx, e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded text-xs p-1 text-slate-300 mb-1 focus:border-amber-500"
                                        >
                                            <option value="">-- Sin Componente BD Vinculado --</option>
                                            {listaComponentes.map(c => (
                                                <option key={c._id || c.id} value={c._id || c.id}>
                                                    {c.nombre} (P/N: {c.pn || 'N/A'})
                                                </option>
                                            ))}
                                        </select>

                                        <input 
                                            type="text" 
                                            value={renglon.descripcion || ''}
                                            onChange={(e) => handleRenglonChange(idx, 'descripcion', e.target.value)}
                                            placeholder="Escriba la descripción de la inspección..."
                                            className="w-full bg-slate-950 border border-slate-700 rounded text-xs p-1 font-semibold text-amber-300 uppercase focus:border-amber-500"
                                        />

                                        {/* SNAPSHOT DE LA BD (SOLO LECTURA EN LA FILA) */}
                                        {renglon.componenteRef && (
                                            <div className="mt-1 p-1 bg-slate-950/70 border border-slate-800 rounded text-[10px] space-y-0.5 font-mono">
                                                <div className="flex justify-between text-slate-400">
                                                    <span>TG Acum:</span>
                                                    <span className="text-amber-400 font-bold">{renglon.tgComponente || '0.0'}</span>
                                                </div>
                                                <div className="flex justify-between text-slate-400">
                                                    <span>Límite BD:</span>
                                                    <span className="text-slate-300">{renglon.limiteComponente || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between text-slate-400">
                                                    <span>Disponible BD:</span>
                                                    <span className="text-emerald-400 font-bold">{renglon.dispComponente || 'N/A'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </td>

                                    {/* TIPO DE CRITERIO */}
                                    <td className="p-2 border-r border-slate-800 align-top">
                                        <select 
                                            value={renglon.tipoCriterio || 'HORAS'}
                                            onChange={(e) => handleRenglonChange(idx, 'tipoCriterio', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded text-xs p-1 text-slate-200 font-medium"
                                        >
                                            <option value="HORAS">Horas (Hs)</option>
                                            <option value="FECHA">Fecha Fija</option>
                                            <option value="MESES">Meses</option>
                                            <option value="LANDINGS">Landings</option>
                                            <option value="CICLOS">Ciclos</option>
                                        </select>
                                    </td>

                                    {/* INTERVALO SEGÚN CRITERIO */}
                                    <td className="p-2 border-r border-slate-800 align-top">
                                        {renglon.tipoCriterio === 'HORAS' && (
                                            <input 
                                                type="text" 
                                                placeholder="Ej: 200" 
                                                value={renglon.intervaloHs || ''}
                                                onChange={(e) => handleRenglonChange(idx, 'intervaloHs', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs font-mono text-center text-slate-100"
                                            />
                                        )}
                                        {renglon.tipoCriterio === 'MESES' && (
                                            <input 
                                                type="number" 
                                                placeholder="Meses" 
                                                value={renglon.intervaloMeses || 0}
                                                onChange={(e) => handleRenglonChange(idx, 'intervaloMeses', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs font-mono text-center text-slate-100"
                                            />
                                        )}
                                        {renglon.tipoCriterio === 'LANDINGS' && (
                                            <input 
                                                type="number" 
                                                placeholder="Aterrizajes" 
                                                value={renglon.intervaloLandings || 0}
                                                onChange={(e) => handleRenglonChange(idx, 'intervaloLandings', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs font-mono text-center text-slate-100"
                                            />
                                        )}
                                        {renglon.tipoCriterio === 'CICLOS' && (
                                            <input 
                                                type="number" 
                                                placeholder="Ciclos" 
                                                value={renglon.intervaloCiclos || 0}
                                                onChange={(e) => handleRenglonChange(idx, 'intervaloCiclos', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs font-mono text-center text-slate-100"
                                            />
                                        )}
                                        {renglon.tipoCriterio === 'FECHA' && (
                                            <span className="block text-[10px] text-slate-500 text-center italic mt-1">Fijo por Calendario</span>
                                        )}
                                    </td>

                                    {/* ÚLTIMO CUMPLIMIENTO */}
                                    <td className="p-2 border-r border-slate-800 align-top">
                                        {renglon.tipoCriterio === 'HORAS' && (
                                            <input 
                                                type="text" 
                                                placeholder="Últ. Hs" 
                                                value={renglon.ultHs || ''}
                                                onChange={(e) => handleRenglonChange(idx, 'ultHs', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs font-mono text-center text-slate-200"
                                            />
                                        )}
                                        {renglon.tipoCriterio === 'LANDINGS' && (
                                            <input 
                                                type="text" 
                                                placeholder="Últ. Landings" 
                                                value={renglon.ultLandings || ''}
                                                onChange={(e) => handleRenglonChange(idx, 'ultLandings', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs font-mono text-center text-slate-200"
                                            />
                                        )}
                                        {renglon.tipoCriterio === 'CICLOS' && (
                                            <input 
                                                type="text" 
                                                placeholder="Últ. Ciclos" 
                                                value={renglon.ultCiclos || ''}
                                                onChange={(e) => handleRenglonChange(idx, 'ultCiclos', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs font-mono text-center text-slate-200"
                                            />
                                        )}
                                        {(renglon.tipoCriterio === 'FECHA' || renglon.tipoCriterio === 'MESES') && (
                                            <span className="block text-[10px] text-slate-500 text-center italic mt-1">N/A</span>
                                        )}
                                    </td>

                                    {/* ÚLTIMA FECHA */}
                                    <td className="p-2 border-r border-slate-800 align-top">
                                        <input 
                                            type="date" 
                                            value={renglon.ultFecha || ''}
                                            onChange={(e) => handleRenglonChange(idx, 'ultFecha', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs font-mono text-slate-200 text-center"
                                        />
                                    </td>

                                    {/* ORDEN DE TRABAJO (OT) */}
                                    <td className="p-2 border-r border-slate-800 align-top">
                                        <input 
                                            type="text" 
                                            placeholder="OT-000" 
                                            value={renglon.ultOt || ''}
                                            onChange={(e) => handleRenglonChange(idx, 'ultOt', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs font-mono text-center text-slate-200 uppercase"
                                        />
                                    </td>

                                    {/* PRÓXIMO VENCIMIENTO */}
                                    <td className="p-2 border-r border-slate-800 align-top">
                                        {renglon.tipoCriterio === 'HORAS' && (
                                            <input 
                                                type="text" 
                                                placeholder="Próx. Hs" 
                                                value={renglon.proxHs || ''}
                                                onChange={(e) => handleRenglonChange(idx, 'proxHs', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs font-mono text-center text-amber-300 font-bold"
                                            />
                                        )}
                                        {renglon.tipoCriterio === 'LANDINGS' && (
                                            <input 
                                                type="text" 
                                                placeholder="Próx. Landings" 
                                                value={renglon.proxLandings || ''}
                                                onChange={(e) => handleRenglonChange(idx, 'proxLandings', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs font-mono text-center text-amber-300 font-bold"
                                            />
                                        )}
                                        {renglon.tipoCriterio === 'CICLOS' && (
                                            <input 
                                                type="text" 
                                                placeholder="Próx. Ciclos" 
                                                value={renglon.proxCiclos || ''}
                                                onChange={(e) => handleRenglonChange(idx, 'proxCiclos', e.target.value)}
                                                className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs font-mono text-center text-amber-300 font-bold"
                                            />
                                        )}
                                        {(renglon.tipoCriterio === 'FECHA' || renglon.tipoCriterio === 'MESES') && (
                                            <span className="block text-[10px] text-slate-500 text-center italic mt-1">Ver Fecha</span>
                                        )}
                                    </td>

                                    {/* PRÓXIMA FECHA */}
                                    <td className="p-2 border-r border-slate-800 align-top">
                                        <input 
                                            type="date" 
                                            value={renglon.proxFecha || ''}
                                            onChange={(e) => handleRenglonChange(idx, 'proxFecha', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs font-mono text-amber-300 text-center font-bold"
                                        />
                                    </td>

                                    {/* RESPONSABLE */}
                                    <td className="p-2 border-r border-slate-800 align-top">
                                        <input 
                                            type="text" 
                                            value={renglon.responsable || 'Ec AE'}
                                            onChange={(e) => handleRenglonChange(idx, 'responsable', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-center text-slate-300"
                                        />
                                    </td>

                                    {/* DISPONIBLE / REMANENTE DE LA INSPECCIÓN */}
                                    <td className="p-2 border-r border-slate-800 align-top text-center font-mono font-bold">
                                        <input 
                                            type="text" 
                                            placeholder="Disp." 
                                            value={renglon.disp || ''}
                                            onChange={(e) => handleRenglonChange(idx, 'disp', e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-center text-emerald-400 font-mono font-bold"
                                        />
                                    </td>

                                    {/* ACCIONES (ELIMINAR) */}
                                    <td className="p-2 align-top text-center">
                                        <button 
                                            onClick={() => eliminarRenglon(idx)}
                                            title="Eliminar inspección"
                                            className="p-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded transition flex items-center justify-center m-auto"
                                        >
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* BOTÓN INFERIOR DE GUARDADO */}
            <div className="mt-4 flex justify-end">
                <button 
                    onClick={guardarPrograma}
                    disabled={loading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2 rounded flex items-center gap-2 shadow-lg transition disabled:opacity-50 text-xs uppercase tracking-wider"
                >
                    <FaSave /> {loading ? "GUARDANDO CAMBIOS..." : "GUARDAR Y SINCRONIZAR PROGRAMA"}
                </button>
            </div>
        </div>
    );
};

export default ProgramaMantenimiento;