'use client';

import { Modal } from '@mantine/core';
import ConsumibleForm from '@/app/superuser/inventario/components/ConsumibleForm'; // Ajusta la ruta

export default function ConsumibleCreatorModal({ opened, onClose, onSuccess }) {
    return (
        <Modal 
            opened={opened} 
            onClose={onClose} 
            title="Crear Nuevo Repuesto / Consumible" 
            size="lg"
        >
            <ConsumibleForm 
                onSuccess={(newItem) => {
                    if (onSuccess) onSuccess(newItem);
                    onClose(); // Cerramos el modal al terminar
                }}
                onCancel={onClose}
            />
        </Modal>
    );
}