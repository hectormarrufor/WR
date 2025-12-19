'use client';

import { Modal } from '@mantine/core';
// IMPORTAMOS EL FORMULARIO MAESTRO DIRECTAMENTE
import ConsumibleForm from '@/app/superuser/inventario/components/ConsumibleForm';

export default function ConsumibleCreatorModal({ opened, onClose, onSuccess }) {
    return (
        <Modal 
            opened={opened} 
            fullScreen
            onClose={onClose} 
            title="Crear Nuevo Repuesto / Consumible" 
            size="lg" // Un poco más ancho para los inputs serializados
            trapFocus
        >
            {/* Renderizamos el formulario único que ya tiene toda la lógica */}
            <ConsumibleForm 
                onSuccess={(newItem) => {
                    // newItem trae toda la data, incluyendo itemsSerializados si aplicó
                    if (onSuccess) onSuccess(newItem);
                    onClose();
                }}
                onCancel={onClose}
            />
        </Modal>
    );
}