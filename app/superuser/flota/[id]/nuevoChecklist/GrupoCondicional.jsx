import { Checkbox, SimpleGrid, Text, Divider, TextInput, Radio, Group, Select } from '@mantine/core';
import { DatePicker } from '@mantine/dates';

export default function GrupoCondicional({ label, pregunta, instruccion, campos, form, clave, tipo }) {
  if (tipo === 'liquidos') {
  return (
    <>
      <Divider label={label} labelPosition="center" my="md" />

      <Checkbox
        label="¿Algún sistema requiere completar líquido/aceite?"
        {...form.getInputProps(`${clave}.requiereRevision`, { type: 'checkbox' })}
        mb="md"
      />

      {form.values[clave]?.requiereRevision && (
        <SimpleGrid cols={3} spacing="xs">
          <Select
            label="Aceite de motor"
            placeholder="Selecciona nivel observado si lo amerita"
            data={[
              { value: 'maximo', label: 'Máximo o alto' },
              { value: 'completar', label: 'Necesita completar' },
              { value: 'minimo', label: 'Mínimo o crítico' },
            ]}
            {...form.getInputProps(`${clave}.nivelMotor`)}
            searchable
            clearable
            size="xs"
          />

          <Select
            label="Aceite de transmisión"
            placeholder="Selecciona nivel observado si lo amerita"
            data={[
              { value: 'maximo', label: 'Máximo o alto' },
              { value: 'completar', label: 'Necesita completar' },
              { value: 'minimo', label: 'Mínimo o crítico' },
            ]}
            {...form.getInputProps(`${clave}.nivelTransmision`)}
            searchable
            clearable
            size="xs"
          />

          <Select
            label="Aceite de dirección"
            placeholder="Selecciona nivel observado si lo amerita"
            data={[
              { value: 'maximo', label: 'Máximo o alto' },
              { value: 'completar', label: 'Necesita completar' },
              { value: 'minimo', label: 'Mínimo o crítico' },
            ]}
            {...form.getInputProps(`${clave}.nivelDireccion`)}
            searchable
            clearable
            size="xs"
          />

          <Select
            label="Liga de frenos"
            placeholder="Selecciona nivel observado si lo amerita"
            data={[
              { value: 'maximo', label: 'Máximo o alto' },
              { value: 'completar', label: 'Necesita completar' },
              { value: 'minimo', label: 'Mínimo o crítico' },
            ]}
            {...form.getInputProps(`${clave}.nivelFrenos`)}
            searchable
            clearable
            size="xs"
          />

          <Select
            label="Refrigerante"
            placeholder="Selecciona nivel observado si lo amerita"
            data={[
              { value: 'maximo', label: 'Máximo o alto' },
              { value: 'completar', label: 'Necesita completar' },
              { value: 'minimo', label: 'Mínimo o crítico' },
            ]}
            {...form.getInputProps(`${clave}.nivelRefrigerante`)}
            searchable
            clearable
            size="xs"
          />
        </SimpleGrid>
      )}
    </>
  );
}

 else if (tipo === 'especialLuces') {
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
            <SimpleGrid cols={4} spacing="xs">
              {campos.map(([label, key]) => (
                <Checkbox
                  key={key}
                  label={label}
                  {...form.getInputProps(key, { type: 'checkbox' })}
                />
              ))}
            </SimpleGrid>

          
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