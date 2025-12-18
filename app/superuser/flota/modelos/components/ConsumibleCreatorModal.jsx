'use client';

import ConsumibleFormManager from '@/app/superuser/inventario/consumibles/nuevo/ConsumibleFormManager';
import { Modal } from '@mantine/core';

export default function ConsumibleCreatorModal({ opened, onClose, onSuccess }) {
    return (
        <Modal 
            opened={opened} 
            onClose={onClose} 
            centered
            title="Registrar Nuevo Repuesto" 
            size="lg"
            // Mantine 7 recomienda trapFocus para formularios dentro de modales
            trapFocus 
        >
            <ConsumibleFormManager 
                onSuccess={(newItem) => {
                    // Lógica específica del MODAL: Avisar al padre y cerrar
                    if (onSuccess) onSuccess(newItem);
                    onClose();
                }}
                onCancel={onClose}
            />
        </Modal>
    );
}