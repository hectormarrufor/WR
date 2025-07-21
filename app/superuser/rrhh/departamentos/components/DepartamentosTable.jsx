// app/superuser/rrhh/departamentos/components/DepartamentosTable.jsx
import Link from 'next/link';
import { FaPencilAlt, FaTrash } from 'react-icons/fa';
import EditButton from '../../../../components/EditButton';

export default function DepartamentosTable({ departamentos, onDelete }) {
    if (!departamentos || departamentos.length === 0) {
        return <p>No hay departamentos registrados.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
                <thead>
                    <tr>
                        <th className="py-2 px-4 border-b">Nombre</th>
                        <th className="py-2 px-4 border-b">Código</th>
                        <th className="py-2 px-4 border-b">Descripción</th>
                        <th className="py-2 px-4 border-b">Nº Empleados</th>
                        <th className="py-2 px-4 border-b">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {departamentos.map((depto) => (
                        <tr key={depto.id}>
                            <td className="py-2 px-4 border-b">{depto.nombre}</td>
                            <td className="py-2 px-4 border-b">{depto.codigo || 'N/A'}</td>
                            <td className="py-2 px-4 border-b">{depto.descripcion}</td>
                            <td className="py-2 px-4 border-b text-center">{depto.empleados?.length || 0}</td>
                            <td className="py-2 px-4 border-b">
                                <div className="flex items-center justify-center space-x-2">
                                    <EditButton href={`/superuser/rrhh/departamentos/${depto.id}/editar`} />
                                    <button
                                        onClick={() => onDelete(depto)}
                                        className="text-red-500 hover:text-red-700"
                                        title="Eliminar"
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}