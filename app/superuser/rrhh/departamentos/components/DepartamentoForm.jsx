// app/superuser/rrhh/departamentos/components/DepartamentoForm.jsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '../../../../components/BackButton';

export default function DepartamentoForm({ initialData = {}, isEdit = false }) {
    const [departamento, setDepartamento] = useState({
        nombre: '',
        descripcion: '',
        codigo: '',
    });
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (isEdit && initialData) {
            setDepartamento({
                nombre: initialData.nombre || '',
                descripcion: initialData.descripcion || '',
                codigo: initialData.codigo || '',
            });
        }
    }, [isEdit, initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDepartamento((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const apiUrl = isEdit ? `/api/rrhh/departamentos/${initialData.id}` : '/api/rrhh/departamentos';
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const response = await fetch(apiUrl, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(departamento),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Algo salió mal');
            }

            // Aquí puedes añadir una notificación de éxito
            router.push('/superuser/rrhh/departamentos');
            router.refresh(); // Actualiza los datos en la página de lista
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-md">
            {error && <p className="text-red-500">{error}</p>}
            
            <div className="form-group">
                <label htmlFor="nombre">Nombre del Departamento</label>
                <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={departamento.nombre}
                    onChange={handleChange}
                    required
                    className="form-input"
                />
            </div>

            <div className="form-group">
                <label htmlFor="codigo">Código (Opcional)</label>
                <input
                    type="text"
                    id="codigo"
                    name="codigo"
                    value={departamento.codigo}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Ej: OPS, MANT, RRHH"
                />
            </div>
            
            <div className="form-group">
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                    id="descripcion"
                    name="descripcion"
                    value={departamento.descripcion}
                    onChange={handleChange}
                    rows="3"
                    className="form-input"
                ></textarea>
            </div>

            <div className="flex justify-between items-center mt-6">
                <BackButton href="/superuser/rrhh/departamentos" />
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : (isEdit ? 'Actualizar Departamento' : 'Crear Departamento')}
                </button>
            </div>
        </form>
    );
}