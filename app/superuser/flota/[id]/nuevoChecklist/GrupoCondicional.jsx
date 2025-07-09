import { Checkbox, SimpleGrid, Text, Divider, TextInput, Radio, Group } from '@mantine/core';
import { DatePicker } from '@mantine/dates';

export default function GrupoCondicional({ label, pregunta, instruccion, campos, form, clave, tipo }) {
    if (tipo === 'especialAceite') {
        return (
            <>
                <Divider label={label} labelPosition="center" my="md" />
                <Checkbox
                    label={pregunta}
                    {...form.getInputProps(`${clave}.cambio`, { type: 'checkbox' })}
                    mb="md"
                    onChange={(e) => {
                        const checked = e.currentTarget.checked;
                        form.setFieldValue(`${clave}.cambio`, checked);
                        if (checked) {
                            form.setFieldValue(`${clave}.fechaCambio`, form.values.fecha);
                        } else {
                            form.setFieldValue(`${clave}.realizadoPor`, '');
                            form.setFieldValue(`${clave}.autorizadoPor`, '');
                        }
                    }}
                />

                {form.values[clave].cambio && (
                    <>
                        <Text size="sm" mb="xs">{instruccion}</Text>
                        <SimpleGrid cols={3} spacing="xs">
                            <TextInput
                                label="fecha"
                                disabled
                                {...form.getInputProps(`${clave}.fechaCambio`)}
                            />
                            <TextInput
                                label="Realizado por"
                                {...form.getInputProps(`${clave}.realizadoPor`)}
                            />
                            <TextInput
                                label="Autorizado por"
                                {...form.getInputProps(`${clave}.autorizadoPor`)}
                            />
                        </SimpleGrid>
                    </>
                )}
            </>
        );
    } else if (tipo === 'especialLuces') {
  return (
    <>
      <Divider label={label} labelPosition="center" my="md" />
      <Checkbox
        label={pregunta}
        {...form.getInputProps(`${clave}.necesitaReemplazo`, { type: 'checkbox' })}
        mb="md"
      />

      {form.values[clave].necesitaReemplazo && (
        <>
          <Text size="sm" mb="xs">{instruccion}</Text>
          <SimpleGrid cols={3} spacing="xs">
            {campos.map(([label, key]) => (
              <Checkbox
                key={key}
                label={label}
                {...form.getInputProps(key, { type: 'checkbox' })}
              />
            ))}
          </SimpleGrid>

          <Radio.Group
            label="¿Cuándo se reemplazarán?"
            {...form.getInputProps(`${clave}.reemplazoProgramado`)}
            mt="md"
          >
            <Group>
              <Radio value="hoy" label="Durante esta revisión" />
              <Radio value="futuro" label="Será reemplazado después" />
            </Group>
          </Radio.Group>
        </>
      )}
    </>
  );
} else
        return (
            <>
                <Divider label={label} labelPosition="center" my="md" />

                <Checkbox
                    label={pregunta}
                    {...form.getInputProps(`${clave}TodoOk`, { type: 'checkbox' })}
                    mb="md"
                />

                {form.values[`${clave}TodoOk`] === false && (
                    <>
                        <Text size="sm" mb="xs">
                            {instruccion}
                        </Text>
                        <SimpleGrid cols={3} spacing="xs">
                            {campos.map(([nombre, key]) => (
                                <Checkbox
                                    key={key}
                                    label={nombre}
                                    {...form.getInputProps(key, { type: 'checkbox' })}
                                />
                            ))}
                        </SimpleGrid>
                    </>
                )}
            </>
        );
}