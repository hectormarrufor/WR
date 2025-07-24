'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from './ActivosTable.module.css'; // Usaremos este nuevo módulo de estilos

// Un pequeño componente para el icono de ordenamiento
const SortIcon = ({ direction }) => {
  if (!direction) return null;
  return direction === 'ascending' ? ' ▲' : ' ▼';
};

export default function ActivosTable({ grupoFiltro }) {
  // --- ESTADOS ---
  const [activos, setActivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'codigo', direction: 'ascending' });

  // --- EFECTO PARA CARGAR DATOS ---
  useEffect(() => {
    const fetchActivos = async () => {
      setLoading(true);
      setError('');
      const url = grupoFiltro
        ? `/api/gestionMantenimiento/activos?grupo=${grupoFiltro}`
        : '/api/gestionMantenimiento/activos';
      
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('No se pudo conectar con el servidor.');
        const data = await res.json();
        setActivos(data);
      } catch (err) {
        setError('Error al cargar los activos. Por favor, intente de nuevo.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivos();
  }, [grupoFiltro]);

  // --- LÓGICA DE FILTRADO Y ORDENAMIENTO (MEMOIZADA) ---
  const filteredAndSortedActivos = useMemo(() => {
    let sortableActivos = [...activos];

    // 1. Filtrado
    if (searchTerm) {
      sortableActivos = sortableActivos.filter(activo =>
        activo.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activo.categoria?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 2. Ordenamiento
    if (sortConfig.key) {
      sortableActivos.sort((a, b) => {
        // Acceder a valores anidados como 'categoria.nombre'
        const getNestedValue = (obj, path) => path.split('.').reduce((o, k) => (o && o[k] != null) ? o[k] : '', obj);

        const aValue = getNestedValue(a, sortConfig.key);
        const bValue = getNestedValue(b, sortConfig.key);

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableActivos;
  }, [activos, searchTerm, sortConfig]);

  // --- MANEJADOR PARA CAMBIAR EL ORDEN ---
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <div className={styles.tableContainer}>
      <div className={styles.toolbar}>
        <input
          type="text"
          placeholder="Buscar por código, nombre, categoría..."
          className={styles.searchInput}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Link href="/superuser/flota/crear" className={styles.createButton}>
          Registrar Nuevo Activo
        </Link>
      </div>

      {loading && <p>Cargando activos...</p>}
      {error && <p className={styles.error}>{error}</p>}
      
      {!loading && !error && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th onClick={() => requestSort('codigo')}>
                  Código<SortIcon direction={sortConfig.key === 'codigo' ? sortConfig.direction : null} />
                </th>
                <th onClick={() => requestSort('nombre')}>
                  Nombre<SortIcon direction={sortConfig.key === 'nombre' ? sortConfig.direction : null} />
                </th>
                <th onClick={() => requestSort('categoria.nombre')}>
                  Categoría<SortIcon direction={sortConfig.key === 'categoria.nombre' ? sortConfig.direction : null} />
                </th>
                <th onClick={() => requestSort('status')}>
                  Status<SortIcon direction={sortConfig.key === 'status' ? sortConfig.direction : null} />
                </th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedActivos.length > 0 ? (
                filteredAndSortedActivos.map(activo => (
                  <tr key={activo.id}>
                    <td>{activo.codigo}</td>
                    <td>{activo.nombre}</td>
                    <td>{activo.categoria?.nombre || 'N/A'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[activo.status.toLowerCase()]}`}>
                        {activo.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <Link href={`/superuser/flota/${activo.id}`} className={styles.detailsButton}>
                        Ver Detalle
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">No se encontraron activos que coincidan con la búsqueda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}