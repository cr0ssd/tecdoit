import { useState, useMemo } from 'react';

export function useOrdenamiento(datos) {
  const [orden, setOrden] = useState({ clave: null, get: null, dir: 'asc' });

  const datosOrdenados = useMemo(() => {
    if (!orden.clave || !orden.get) return datos;
    const copia = [...datos];
    copia.sort((a, b) => {
      const va = orden.get(a);
      const vb = orden.get(b);
      // Los vacíos siempre van al final, sin importar la dirección
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;

      let cmp;
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb), 'es', { sensitivity: 'base', numeric: true });
      }
      return orden.dir === 'asc' ? cmp : -cmp;
    });
    return copia;
  }, [datos, orden]);

  const ordenarPor = (clave, get) => {
    setOrden(prev => ({
      clave,
      get,
      dir: prev.clave === clave && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  return { datosOrdenados, orden, ordenarPor };
}