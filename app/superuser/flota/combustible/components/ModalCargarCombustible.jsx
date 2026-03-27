'use client';

import { useState, useEffect } from 'react';
import { Modal, LoadingOverlay } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';
import CargaCombustibleForm from './CargaCombustibleForm';

export default function ModalCargarCombustible({ 
    opened, 
    onClose, 
    onSuccess, 
    activoPredeterminadoId = null 
}) {
    const [activos, setActivos] = useState([]);
    const [tanques, setTanques] = useState([]);
    const [loadingInfo, setLoadingInfo] = useState(false);

    useEffect(() => {
        if (opened) {
            cargarDatosPrevios();
        }
    }, [opened]);

    const cargarDatosPrevios = async () => {
        setLoadingInfo(true);
        try {
            const [resActivos, resTanques] = await Promise.all([
                fetch('/api/gestionMantenimiento/activos'), 
                // IMPORTANTE: Verifica que esta ruta coincida con la estructura de tus carpetas
                fetch('/api/inventario/consumibles?tipo=gasoil') 
            ]);
            
            // Validación robusta: Si el endpoint no responde 200 OK, lanzamos error antes de hacer .json()
            if (!resTanques.ok) {
                throw new Error(`Error en API de consumibles: ${resTanques.status} - Verifica la ruta del fetch`);
            }
            if (!resActivos.ok) {
                throw new Error(`Error en API de activos: ${resActivos.status}`);
            }

            const dataActivos = await resActivos.json();
            const dataTanques = await resTanques.json();

            if (dataActivos.success) {
                setActivos(dataActivos.data);
            }
            
            if (dataTanques.items) {
                setTanques(dataTanques.items);
            }

        } catch (error) {
            console.error("Error cargando datos para el formulario:", error);
            notifications.show({
                title: 'Error de Conexión',
                message: error.message,
                color: 'red',
                icon: <IconAlertCircle size={18} />
            });
        } finally {
            setLoadingInfo(false);
        }
    };

    return (
        <Modal 
            opened={opened} 
            onClose={onClose} 
            title={null}
            size="lg" 
            centered
            withCloseButton={false}
            padding={0}
        >
            <LoadingOverlay visible={loadingInfo} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
            
            {!loadingInfo && (
                <CargaCombustibleForm 
                    activos={activos}
                    tanquesInventario={tanques}
                    activoPredeterminadoId={activoPredeterminadoId}
                    onSuccess={(data) => {
                        onSuccess(data);
                        onClose();
                    }}
                    onCancel={onClose}
                />
            )}
        </Modal>
    );
}