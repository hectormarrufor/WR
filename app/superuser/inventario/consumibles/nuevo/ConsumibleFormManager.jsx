'use client';

import { useState } from 'react';
import { Select, Stack, Text, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

// Importa TUS componentes existentes (ajusta las rutas si es necesario)
import FiltroForm from './FiltroForm'; 
import AceiteMotorForm from './AceiteMotorForm';
import AceiteHidraulicoForm from './AceiteHidraulicoForm';
import NeumaticoForm from './NeumaticoForm';
import BateriaForm from './BateriaForm';
import SensorForm from './SensorForm';


export default function ConsumibleFormManager({ 
    onSuccess, // Callback cuando un hijo termina exitosamente
    onCancel,  // Callback para cancelar
    defaultType = null // Por si queremos forzar un tipo desde fuera
}) {
    const [tipo, setTipo] = useState(defaultType);

    // Mapeo de valores a Componentes
    const renderForm = () => {
        // Importante: Pasa onSuccess a los hijos para que avisen cuando terminen
        const commonProps = { onSuccess, onCancel }; 

        switch (tipo) {
            case 'aceiteMotor':
                return <AceiteMotorForm {...commonProps} />;
            case 'aceiteHidraulico':
                 return <AceiteHidraulicoForm {...commonProps} />;
            case 'neumatico':
                 return <NeumaticoForm {...commonProps} />;
            case 'bateria':
                 return <BateriaForm {...commonProps} />;
            case 'filtro':
                return <FiltroForm {...commonProps} />;
            case 'sensor':
                 return <SensorForm {...commonProps} />;
            default:
                return (
                    <Alert icon={<IconInfoCircle size={16}/>} title="Seleccione un Tipo" color="blue" variant="light">
                        Selecciona el tipo de repuesto arriba para ver el formulario específico.
                    </Alert>
                );
        }
    };

    return (
        <Stack>
            <Select
                label="Tipo de Repuesto / Consumible"
                data={[
                    { value: 'aceiteMotor', label: 'Aceite de Motor' },
                    { value: 'aceiteHidraulico', label: 'Aceite Hidráulico' },
                    { value: 'neumatico', label: 'Neumático' },
                    { value: 'bateria', label: 'Batería' },
                    { value: 'filtro', label: 'Filtro' },
                    { value: 'sensor', label: 'Sensor' },
                ]}
                placeholder="Selecciona tipo..."
                value={tipo}
                onChange={setTipo}
                clearable
                searchable
                allowDeselect={false}
            />

            {renderForm()}
        </Stack>
    );
}