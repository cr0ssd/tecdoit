import React, { useState, useEffect } from 'react';
import { preventivoAPI, proveedoresAPI, equiposAPI, inventarioAPI } from '../services/api';

const TIPOS_REQUERIMIENTO = [
  'Limpieza general',
  'Calibración',
  'Cambio de baterías',
  'Revisión eléctrica',
  'Lubricación',
  'Actualización de firmware',
  'Otro',
];

const PRIORIDAD_CONFIG = [
  { valor: 0, label: 'Sin definir', color: '#bdc3c7', bg: '#f4f6f7' },
  { valor: 1, label: 'Muy baja',    color: '#27ae60', bg: '#eafaf1' },
  { valor: 2, label: 'Baja',        color: '#2ecc71', bg: '#d5f5e3' },
  { valor: 3, label: 'Media',       color: '#f39c12', bg: '#fef5e7' },
  { valor: 4, label: 'Alta',        color: '#e67e22', bg: '#fdebd0' },
  { valor: 5, label: 'Crítica',     color: '#e74c3c', bg: '#fadbd8' },
];

function formatFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatMoneda(val) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
}

function diasHasta(fecha) {
  if (!fecha) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const target = new Date(fecha); target.setHours(0,0,0,0);
  return Math.ceil((target - hoy) / (1000 * 60 * 60 * 24));
}

function estadoBadge(dias) {
  if (dias === null) return { clase: 'ok', texto: 'Sin fecha' };
  if (dias < 0)  return { clase: 'danger',  texto: `Vencido hace ${Math.abs(dias)} días` };
  if (dias === 0) return { clase: 'danger',  texto: 'Vence hoy' };
  if (dias <= 7)  return { clase: 'warning', texto: `En ${dias} días` };
  return { clase: 'ok', texto: `En ${dias} días` };
}

function PrioridadBadge({ value }) {
  const p = PRIORIDAD_CONFIG.find(c => c.valor === value) || PRIORIDAD_CONFIG[0];
  return (
    <span style={{
      padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700',
      backgroundColor: p.bg, color: p.color, whiteSpace: 'nowrap',
    }}>
      {p.valor} {p.label}
    </span>
  );
}

function PrioridadSelector({ value, onChange }) {
  return (
    <div className="form-group">
      <label>Prioridad</label>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
        {PRIORIDAD_CONFIG.map(p => (
          <button key={p.valor} type="button" onClick={() => onChange(p.valor)}
            style={{
              padding: '6px 12px', borderRadius: '20px', cursor: 'pointer',
              border: `2px solid ${value === p.valor ? p.color : '#ecf0f1'}`,
              backgroundColor: value === p.valor ? p.bg : 'transparent',
              color: value === p.valor ? p.color : '#7f8c8d',
              fontSize: '12px', fontWeight: value === p.valor ? '700' : '400',
              transition: 'all 0.15s ease',
            }}>
            {p.valor} — {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Preventivo() {
  const [registros, setRegistros] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [laboratorios, setLaboratorios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [paginaModal, setPaginaModal] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [filtroLab, setFiltroLab] = useState('');

  const [form, setForm] = useState({
    clave_activo: '', tipo_requerimiento: '', descripcion_custom: '',
    descripcion_problema: '', solucion_esperada: '', prioridad: 0,
    id_proveedor: '', fecha_programada: '', costo: '',
  });

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const [dataPrev, dataEq, dataProv, dataLabs] = await Promise.all([
        preventivoAPI.obtenerTodos(),
        equiposAPI.obtenerTodos(),
        proveedoresAPI.obtenerTodos(),
        inventarioAPI.obtenerLaboratorios(),
      ]);
      setRegistros(dataPrev);
      setEquipos(dataEq);
      setProveedores(dataProv);
      setLaboratorios(dataLabs);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar la información. Verifica la conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  }

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const abrirModal = () => {
    setForm({ clave_activo: '', tipo_requerimiento: '', descripcion_custom: '', descripcion_problema: '', solucion_esperada: '', prioridad: 0, id_proveedor: '', fecha_programada: '', costo: '' });
    setPaginaModal(1);
    setError(null);
    setMostrarModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const descFinal = form.tipo_requerimiento === 'Otro' ? form.descripcion_custom : form.tipo_requerimiento;
    try {
      await preventivoAPI.crear({
        clave_activo: form.clave_activo,
        descripcion: descFinal,
        descripcion_problema: form.descripcion_problema || null,
        solucion_esperada: form.solucion_esperada || null,
        prioridad: form.prioridad || 0,
        id_proveedor: form.id_proveedor || null,
        fecha_programada: form.fecha_programada || null,
        costo: form.costo || 0,
      });
      setMostrarModal(false);
      setMensajeExito('Mantenimiento preventivo registrado correctamente.');
      setTimeout(() => setMensajeExito(null), 3500);
      cargarDatos();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const completar = async (id, clave_activo) => {
    if (!window.confirm('¿Confirmas que este servicio ha sido finalizado?')) return;
    try {
      await preventivoAPI.completar(id, clave_activo);
      setMensajeExito('Mantenimiento completado correctamente.');
      setTimeout(() => setMensajeExito(null), 3000);
      cargarDatos();
    } catch (err) {
      alert(err.message);
    }
  };

  const filtrados = registros.filter(r => {
    const texto = (busqueda || '').toLowerCase();
    const coincideTexto = busqueda === '' || r.clave_activo?.toLowerCase().includes(texto) || r.descripcion?.toLowerCase().includes(texto);
    const coincideEstatus = filtroEstatus === '' || r.estatus === filtroEstatus;
    const coincideLab = filtroLab === '' || r.equipos?.id_laboratorio == filtroLab;
    return coincideTexto && coincideEstatus && coincideLab;
  });

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Mantenimiento Preventivo</h1><p>Programación y seguimiento de servicios preventivos</p></div>
        <button className="btn-primary" onClick={abrirModal}>+ Registrar Preventivo</button>
      </header>

      {error && !mostrarModal && <div className="alert-error" style={{ marginBottom: '15px' }}>{error}</div>}
      {mensajeExito && <div className="alert-success" style={{ marginBottom: '15px' }}>{mensajeExito}</div>}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Buscar por equipo o descripción..." className="input-search" value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ minWidth: '260px' }} />
        <select className="select-filter" value={filtroLab} onChange={e => setFiltroLab(e.target.value)}>
          <option value="">Todos los laboratorios</option>
          {laboratorios.map(l => <option key={l.id_laboratorio} value={l.id_laboratorio}>{l.nombre}</option>)}
        </select>
        <select className="select-filter" value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}>
          <option value="">Todos los estatus</option>
          <option value="Abierto">Abierto</option>
          <option value="Completado">Completado</option>
        </select>
      </div>

      <section className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Equipo</th>
              <th>Servicio / Detalle</th>
              <th>Proveedor</th>
              <th>Fecha Programada</th>
              <th>Costo</th>
              <th>Prioridad</th>
              <th>Estatus</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>Sincronizando información...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>No se encontraron registros.</td></tr>
            ) : filtrados.map(r => {
              const dias = diasHasta(r.fecha_programada);
              const badge = r.estatus === 'Completado' ? { clase: 'ok', texto: 'Completado' } : estadoBadge(dias);
              return (
                <tr key={r.id_mantenimiento}>
                  <td><strong>{r.clave_activo}</strong><br/><small style={{ color: '#7f8c8d' }}>{r.equipos?.marca} {r.equipos?.modelo}</small></td>
                  <td style={{ maxWidth: '200px' }}>
                    <div style={{ fontWeight: '600' }}>{r.descripcion}</div>
                    {r.descripcion_problema && <div style={{ fontSize: '11px', color: '#7f8c8d' }}>{r.descripcion_problema}</div>}
                  </td>
                  <td>{r.proveedores?.nombre || 'Interna'}</td>
                  <td>{formatFecha(r.fecha_programada)}</td>
                  <td><strong>{formatMoneda(r.costo)}</strong></td>
                  <td><PrioridadBadge value={r.prioridad || 0} /></td>
                  <td><span className={`badge ${badge.clase}`}>{badge.texto}</span></td>
                  <td>
                    {r.estatus !== 'Completado' && (
                      <button className="btn-icon" onClick={() => completar(r.id_mantenimiento, r.clave_activo)} style={{ color: '#27ae60', borderColor: '#27ae60' }}>
                        ✓ Completar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '20px' }}>Nuevo Registro Preventivo</h2>
            
            {error && <div className="alert-error" style={{ marginBottom: '15px' }}>{error}</div>}

            <form onSubmit={guardar}>
              <div className="form-group">
                <label>Equipo</label>
                <select name="clave_activo" value={form.clave_activo} onChange={handleInput} required>
                  <option value="">-- Seleccionar equipo --</option>
                  {equipos.map(eq => <option key={eq.clave_activo} value={eq.clave_activo}>{eq.clave_activo} — {eq.marca} {eq.modelo}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Tipo de requerimiento</label>
                <select name="tipo_requerimiento" value={form.tipo_requerimiento} onChange={handleInput} required>
                  <option value="">-- Seleccionar --</option>
                  {TIPOS_REQUERIMIENTO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {form.tipo_requerimiento === 'Otro' && (
                <div className="form-group">
                  <label>Descripción personalizada</label>
                  <input type="text" name="descripcion_custom" value={form.descripcion_custom} onChange={handleInput} placeholder="Especifique..." required />
                </div>
              )}

              <PrioridadSelector value={form.prioridad} onChange={val => setForm(p => ({...p, prioridad: val}))} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Fecha programada</label>
                  <input type="date" name="fecha_programada" value={form.fecha_programada} onChange={handleInput} required />
                </div>
                <div className="form-group">
                  <label>Costo estimado</label>
                  <input type="number" name="costo" value={form.costo} onChange={handleInput} placeholder="0.00" step="0.01" />
                </div>
              </div>

              <div className="modal-actions" style={{ borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setMostrarModal(false)} disabled={guardando}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Registrar Mantenimiento'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
