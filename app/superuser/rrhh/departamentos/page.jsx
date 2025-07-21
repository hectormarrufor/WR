// app/superuser/rrhh/departamentos/page.jsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaPlus } from 'react-icons/fa';
import DepartamentosTable from './components/DepartamentosTable';
import SectionTitle from '../../../components/SectionTitle';
import DeleteModal from '../../DeleteModal'; // Reutilizamos el modal de eliminación

export default function DepartamentosPage() {
    const [departamentos, setDepartamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [departamentoToDelete, setDepartamentoToDelete] = useState(null);

    const fetchDepartamentos = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/rrhh/departamentos');
            if (!response.ok) {
                throw new Error('Error al obtener los departamentos');
            }
            const data = await response.json();
            setDepartamentos(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartamentos();
    }, []);

    const openModal = (departamento) => {
        setDepartamentoToDelete(departamento);
        setModalIsOpen(true);
    };

    const closeModal = () => {
        setDepartamentoToDelete(null);
        setModalIsOpen(false);
    };

    const handleDelete = async () => {
        if (!departamentoToDelete) return;
        try {
            const response = await fetch(`/api/rrhh/departamentos/${departamentoToDelete.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al eliminar el departamento');
            }
            
            // Refrescar la lista de departamentos
            fetchDepartamentos();
            closeModal();
            // Aquí puedes añadir una notificación de éxito (ej. con react-toastify)
        } catch (err) {
            setError(err.message);
            // Puedes mostrar el error en una notificación
            console.error('Error al eliminar:', err.message);
        }
    };

    if (loading) return <p>Cargando departamentos...</p>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div>
            <SectionTitle title="Gestión de Departamentos" />
            <div className="mb-4">
                <Link href="/superuser/rrhh/departamentos/nuevo" className="btn btn-primary">
                    <FaPlus className="mr-2" />
                    Nuevo Departamento
                </Link>
            </div>
            <DepartamentosTable
                departamentos={departamentos}
                onDelete={openModal}
            />
            {departamentoToDelete && (
                <DeleteModal
                    isOpen={modalIsOpen}
                    onClose={closeModal}
                    onConfirm={handleDelete}
                    title="Confirmar Eliminación"
                    message={`¿Estás seguro de que quieres eliminar el departamento "${departamentoToDelete.nombre}"? Esta acción no se puede deshacer.`}
                />
            )}
        </div>
    );
}