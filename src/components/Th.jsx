import React from 'react';

function Th({ children, col, get, orden, ordenarPor, style }) {
  const activo = orden.clave === col;
  const flecha = activo ? (orden.dir === 'asc' ? '▲' : '▼') : '↕';
  return (
    <th
      onClick={() => ordenarPor(col, get)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', ...style }}
    >
      {children}
      <span style={{ marginLeft: 6, fontSize: 11, opacity: activo ? 1 : 0.35 }}>{flecha}</span>
    </th>
  );
}

export default Th;