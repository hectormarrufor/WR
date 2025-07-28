import { useState } from 'react';
import { randomId } from '@mantine/hooks';

export default function useAtributosBuilder(initial = []) {
  const [atributos, setAtributos] = useState(initial);

  const addAtributo = (mode = 'inline') => {
    setAtributos((prev) => [
      ...prev,
      {
        id: randomId(),
        label: '',
        dataType: 'string',
        inputType: 'text',
        defaultValue: '',
        selectOptions: [],
        mode,
        refId: null,
        definicion: [],
        subGrupo: mode === 'define' ? { key: randomId(), nombre: '', definicion: [] } : null,
      },
    ]);
  };

  const updateAtributo = (id, changes) => {
    setAtributos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...changes } : a))
    );
  };

  const removeAtributo = (id) => {
    setAtributos((prev) => prev.filter((a) => a.id !== id));
  };

  const updateSubGrupo = (id, changes) => {
    setAtributos((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              subGrupo: {
                ...a.subGrupo,
                ...changes,
              },
            }
          : a
      )
    );
  };

  return {
    atributos,
    addAtributo,
    updateAtributo,
    removeAtributo,
    updateSubGrupo,
    setAtributos,
  };
}
