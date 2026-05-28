import React, { useState, useEffect } from 'react';
import { correctivoAPI, proveedoresAPI, equiposAPI, inventarioAPI } from '../services/api';

const PRIORIDAD_CONFIG = [
  { valor: 0, label: 'Sin definir', color: '#bdc3c7', bg: '#f4f6f7' },
  { valor: 1, label: 'Muy baja',    color: '#27ae60', bg: '#eafaf1' },
  { valor: 2, label: 'Baja',        color: '#2ecc71', bg: '#d5f5e3' },
  { valor: 3, label: 'Media',       color: '#f39c12', bg: '#fef5e7' },
  { valor: 4, label: 'Alta',        color: '#e67e22', bg: '#fdebd0' },
  { valor: 5, label: 'Crítica',     color: '#e74c3c', bg: '#fadbd8' },
];

const ESTATUS_CONFIG = {
  'Abierto':     { clase: 'warning', bg: '#fef5e7', color: '#f39c12' },
  'En progreso': { clase: 'info',    bg: '#e8f4fd', color: '#2980b9' },
  'Completado':  { clase: 'ok',      bg: '#eafaf1', color: '#27ae60' },
};

function formatFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoneda(val) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);
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

export default function Correctivo() {
  const [tickets, setTickets] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [laboratorios, setLaboratorios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [filtroLab, setFiltroLab] = useState('');

  const [form, setForm] = useState({
    clave_activo: '', descripcion: '', causa_falla: '', prioridad: 0,
    id_proveedor: '', fecha_programada: '', costo: '',
  });

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setCargando(true);
    setError(null);
    try {
      const [dataTickets, dataEq, dataProv, dataLabs] = await Promise.all([
        correctivoAPI.obtenerTodos(),
        equiposAPI.obtenerTodos(),
        proveedoresAPI.obtenerTodos(),
        inventarioAPI.obtenerLaboratorios(),
      ]);
      setTickets(dataTickets);
      setEquipos(dataEq);
      setProveedores(dataProv);
      setLaboratorios(dataLabs);
    } catch (err) {
      setError('Error al conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  }

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await correctivoAPI.crear(form);
      setMostrarModal(false);
      setMensajeExito('Ticket correctivo registrado.');
      setTimeout(() => setMensajeExito(null), 3500);
      cargarDatos();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const completar = async (id, clave) => {
    if (!window.confirm('¿Cerrar este ticket?')) return;
    try {
      await correctivoAPI.completar(id, clave);
      cargarDatos();
    } catch (err) {
      alert(err.message);
    }
  };

  const filtrados = tickets.filter(t => {
    const texto = busqueda.toLowerCase();
    const coincideTexto = busqueda === '' || t.clave_activo?.toLowerCase().includes(texto) || t.descripcion?.toLowerCase().includes(texto);
    const coincideEstatus = filtroEstatus === '' || t.estatus === filtroEstatus;
    const coincideLab = filtroLab === '' || t.equipos?.id_laboratorio == filtroLab;
    return coincideTexto && coincideEstatus && coincideLab;
  });

  return (
    <div className="dashboard-container">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1>Mantenimiento Correctivo</h1><p>Gestión de fallas y reparaciones</p></div>
        <button className="btn-primary" onClick={() => { setForm({clave_activo:'', descripcion:'', causa_falla:'', prioridad:0, id_proveedor:'', fecha_programada:'', costo:''}); setMostrarModal(true); }}>+ Nuevo Ticket</button>
      </header>

      {error && !mostrarModal && <div className="alert-error">{error}</div>}
      {mensajeExito && <div className="alert-success">{mensajeExito}</div>}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input type="text" placeholder="Buscar..." className="input-search" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <select className="select-filter" value={filtroLab} onChange={e => setFiltroLab(e.target.value)}>
          <option value="">Todos los laboratorios</option>
          {laboratorios.map(l => <option key={l.id_laboratorio} value={l.id_laboratorio}>{l.nombre}</option>)}
        </select>
        <select className="select-filter" value={filtroEstatus} onChange={e => setFiltroEstatus(e.target.value)}>
          <option value="">Todos los estatus</option>
          <option value="Abierto">Abierto</option>
          <option value="En progreso">En progreso</option>
          <option value="Completado">Completado</option>
        </select>
      </div>

      <section className="table-container">
        <table className="data-table">
          <thead><tr><th>Equipo</th><th>Falla</th><th>Prioridad</th><th>Programado</th><th>Costo</th><th>Estatus</th><th>Acciones</th></tr></thead>
          <tbody>
            {cargando ? <tr><td colSpan="7" style={{textAlign:'center'}}>Cargando...</td></tr> : filtrados.map(t => (
              <tr key={t.id_mantenimiento}>
                <td><strong>{t.clave_activo}</strong><br/><small>{t.equipos?.marca}</small></td>
                <td>{t.descripcion}</td>
                <td><PrioridadBadge value={t.prioridad} /></td>
                <td>{formatFecha(t.fecha_programada)}</td>
                <td>{formatMoneda(t.costo)}</td>
                <td><span className={`badge ${(ESTATUS_CONFIG[t.estatus] || ESTATUS_CONFIG.Abierto).clase}`}>{t.estatus}</span></td>
                <td>{t.estatus !== 'Completado' && <button className="btn-icon" onClick={() => completar(t.id_mantenimiento, t.clave_activo)}>✓</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth:'500px'}}>
            <h2>Nuevo Ticket Correctivo</h2>
            <form onSubmit={guardar}>
              <div className="form-group"><label>Equipo</label>
                <select name="clave_activo" value={form.clave_activo} onChange={handleInput} required>
                  <option value="">-- Seleccionar --</option>
                  {equipos.map(eq => <option key={eq.clave_activo} value={eq.clave_activo}>{eq.clave_activo}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Descripción de falla</label><textarea name="descripcion" value={form.descripcion} onChange={handleInput} required /></div>
              <div className="form-group"><label>Fecha programada</label><input type="date" name="fecha_programada" value={form.fecha_programada} onChange={handleInput} /></div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setMostrarModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={guardando}>Crear Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
