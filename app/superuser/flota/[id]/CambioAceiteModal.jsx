import {
    Modal,
    Button,
    Select,
    TextInput,
    NumberInput,
    Group,
    Stack,
    Divider,
    Box,
    Radio,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useForm } from '@mantine/form';

export default function CambioAceiteModal({ opened, onClose, vehiculo }) {
    const aceitesInventario = [
        { marca: 'Shell Helix', viscosidad: '10W-40', disponible: 8 },
        { marca: 'Total Quartz', viscosidad: '10W-40', disponible: 5 },
        { marca: 'Valvoline MaxLife', viscosidad: '5W-30', disponible: 6 },
    ];

    const filtrosInventario = [
        { numero: 'PH3614', marcas: ['Fram', 'Bosch'], total: 3 },
        { numero: 'R1234', marcas: ['ACDelco', 'Mann'], total: 5 },
    ];

    const aceitesCompatibles = aceitesInventario.filter(
        (a) => a.viscosidad === vehiculo?.motor?.aceite?.viscosidad
    );

    const aceiteOptions = aceitesCompatibles.map((a) => ({
        label: `${a.marca} (${a.viscosidad}) — ${a.disponible}L disponibles`,
        value: a.marca,
    }));

    const filtroOptions = filtrosInventario.map((f) => ({
        label: `${f.numero} — ${f.marcas.join(', ')} (${f.total} disponibles)`,
        value: f.numero,
    }));

    const form = useForm({
        initialValues: {
            fechaModo: 'hoy',
            tipoAceite: '',
            realizadoPor: '',
            autorizadoPor: '',
            fechaCambio: new Date(),
            aceiteSeleccionado: '',
            cantidadLitros: 0,
            filtroSeleccionado: '',
        },

        validate: {
            tipoAceite: (value) => (value ? null : 'Selecciona un tipo de aceite'),
            realizadoPor: (value) => (value ? null : 'Indica quién lo realizó'),
            autorizadoPor: (value) => (value ? null : 'Indica quién autorizó'),
            fechaCambio: (value) => (value ? null : 'Fecha requerida'),
            aceiteSeleccionado: (value) => (value ? null : 'Selecciona una marca de aceite'),
            cantidadLitros: (value) =>
                value > 0 ? null : 'Debe ingresar cantidad válida de litros',
        },
    });

    const handleSubmit = (values) => {
        const payload = {
            ...values,
            vehiculoId: vehiculo?.id,
        };
        console.log('Cambio de aceite registrado:', payload);
        onClose();
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Registrar cambio de aceite" size="80%" centered
            styles={{
                content: {
                    height: "80vh", // altura en px
                    marginTop: "13vh"
                },
            }}

        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <Radio.Group
                        label="Fecha"
                        {...form.getInputProps('fechaModo')}
                    >
                        <Group>
                            <Radio value="hoy" label="Fecha actual" />
                            <Radio value="personalizada" label="Personalizada" />
                        </Group>
                    </Radio.Group>

                    {form.values.fechaModo === 'personalizada' && (
                        <DatePickerInput
                            label="Seleccione la fecha"
                            {...form.getInputProps('fechaCambio')}

                        />
                    )}

                    <Select
                        label="Tipo de aceite a cambiar"
                        placeholder="Selecciona una opción"
                        data={['Motor', 'Transmisión', 'Dirección', 'Frenos']}
                        {...form.getInputProps('tipoAceite')}
                    />

                    <Group grow>
                        <TextInput
                            label="Realizado por"
                            placeholder="Nombre del técnico"
                            {...form.getInputProps('realizadoPor')}
                        />
                        <TextInput
                            label="Autorizado por"
                            placeholder="Responsable del mantenimiento"
                            {...form.getInputProps('autorizadoPor')}
                        />
                    </Group>



                    <Divider label="Aceite utilizado" labelPosition="center" />

                    <Select
                        label="Marca del aceite"
                        placeholder="Marca compatible"
                        data={aceiteOptions}
                        {...form.getInputProps('aceiteSeleccionado')}
                    />

                    <NumberInput
                        label="Cantidad de litros"
                        min={0.5}
                        step={0.5}
                        {...form.getInputProps('cantidadLitros')}
                    />

                    <Divider label="Filtro de aceite (opcional)" labelPosition="center" />

                    <Select
                        label="Filtro utilizado"
                        placeholder="Selecciona si se cambió"
                        data={filtroOptions}
                        {...form.getInputProps('filtroSeleccionado')}
                        clearable
                    />

                    <Group position="right" mt="md">
                        <Button variant="default" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" color="blue">Guardar</Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}