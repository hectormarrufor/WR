'use client';
import ConsumibleFormManager from '@/app/superuser/inventario/consumibles/nuevo/ConsumibleFormManager';
import { Modal } from '@mantine/core';

export default function ModalCrearConsumible({ opened, onClose, onSuccess }) {
    return (
        <Modal 
            opened={opened} 
            onClose={onClose} 
            title="Registrar Nuevo Consumible en Inventario" 
            size="xl" 
            centered
        >
            <ConsumibleFormManager
                onSuccess={(newItem) => {
                    onSuccess(newItem);
                    onClose();
                }}
                onCancel={onClose}
            />
        </Modal>
    );
}