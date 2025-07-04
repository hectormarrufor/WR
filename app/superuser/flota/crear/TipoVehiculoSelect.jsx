import { useEffect, useState } from 'react';
import {
    Combobox,
    useCombobox,
    ComboboxTarget,
    ComboboxOptions,
    ComboboxOption,
    TextInput,
    InputBase,
    Modal,
    Title,
    Button,
} from '@mantine/core';
import { httpGet, httpPost } from '../../../ApiFunctions/httpServices';


export function TipoVehiculoSelect({ form, peso }) {

    const selected = form.values.tipo;
    const combobox = useCombobox({
        onDropdownClose: () => combobox.resetSelectedOption(),
    });
    const [createConfirmModal, setCreateConfirmModal] = useState(false)
    const [data, setData] = useState([]);
    const [value, setValue] = useState(null);
    const [search, setSearch] = useState('');

    const exactOptionMatch = data.some((item) => item === search);
    const filteredOptions = exactOptionMatch
        ? data
        : data?.filter((item) => item?.toLowerCase().includes(search?.toLowerCase().trim()));

    const options = filteredOptions.map((item) => (
        <Combobox.Option value={item} key={item}>
            {item}
        </Combobox.Option>
    ));

    useEffect(() => {
        const fetch = async () => {
            const tipos = await httpGet('/api/vehiculos/tipo')
            console.log(tipos);
            setData(tipos.map(tipo => tipo.label));
        }
        fetch();
    }, []);

    const crearTipo = async (label, peso) => {
        console.log(label, value, peso);

        const res = await httpPost('/api/vehiculos/tipo', { label: label, peso: peso });
        console.log(res);

    };


    //   const handleCreate = (label) => {
    //     const value = label.toLowerCase().replace(/\s+/g, '-');
    //     const nuevo = { label, value };
    //     setOptions((prev) => [...prev, nuevo]);
    //     form.setFieldValue('tipo', value);
    //   };



    return (
        <>
            <Modal
                opened={createConfirmModal}
                centered
                onClose={() => setCreateConfirmModal(false)}
                align="center"
            >
                <Title order={2} centered>Esta seguro que desea crear el tipo de vehiculo "{search}"? </Title>
                <Button>Confirmar</Button>
            </Modal>
            <Combobox
                store={combobox}
                label="Tipo"
                required
                size='xs'
                withinPortal={false}
                onOptionSubmit={(val) => {
                    if (val === '$create') {
                        setCreateConfirmModal(true)
                        setData((current) => [...current, search]);
                        crearTipo(search, 'pesado')
                        setValue(search);
                    } else {
                        setValue(val);
                        setSearch(val);
                    }

                    combobox.closeDropdown();
                }}
            >
                <Combobox.Target>
                    <InputBase
                        rightSection={<Combobox.Chevron />}
                        size='xs'
                        value={search}
                        onChange={(event) => {
                            combobox.openDropdown();
                            combobox.updateSelectedOptionIndex();
                            setSearch(event.currentTarget.value);
                        }}
                        onClick={() => combobox.openDropdown()}
                        onFocus={() => combobox.openDropdown()}
                        onBlur={() => {
                            combobox.closeDropdown();
                            setSearch(value || '');
                        }}
                        placeholder="Elige o crea el tipo de vehiculo"
                        rightSectionPointerEvents="none"
                    />
                </Combobox.Target>

                <Combobox.Dropdown>
                    <Combobox.Options>
                        {options}
                        {!exactOptionMatch && search.trim().length > 0 && (
                            <Combobox.Option value="$create">+ Create {search}</Combobox.Option>
                        )}
                    </Combobox.Options>
                </Combobox.Dropdown>
            </Combobox>
        </>
    );
}