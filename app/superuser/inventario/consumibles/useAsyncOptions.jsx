import { useEffect, useState, useMemo } from 'react';
import { notifications } from '@mantine/notifications';
import { fieldConfig, updateSpec } from './fieldConfig';

export function useAsyncOptions(fieldKey, form, tipoActual, onCreateNew) {
    const cfg = fieldConfig[fieldKey];
    const [options, setOptions] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const shouldLoad = !cfg?.dependsOnTipo || (cfg?.shouldLoad?.(tipoActual));

    useEffect(() => {
        let canceled = false;
        async function load() {
            if (!cfg?.get || !shouldLoad) { setOptions([]); return; }
            setLoading(true);
            try {
                const res = await fetch(cfg.get.url);
                const data = await res.json();
                if (canceled) return;
                const arr = cfg.get.toArray(data);
                setOptions(arr);
            } catch (err) {
                notifications.show({ title: 'Error', message: `No se pudo cargar ${fieldKey.toLowerCase()}`, color: 'red' });
            } finally {
                if (!canceled) setLoading(false);
            }
        }
        load();
        return () => { canceled = true; };
    }, [cfg, shouldLoad]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return options.filter(o => o.toLowerCase().includes(q));
    }, [options, search]);

    const canCreate = useMemo(() => {
        const q = search.trim();
        if (!q) return false;
        return !options.some(o => o.toLowerCase() === q.toLowerCase());
    }, [options, search]);

    async function createIfNeeded(value) {
        if (!cfg?.post) return value;
        try {
            const res = await fetch(cfg.post.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cfg.post.body(value)),
            });
            const data = await res.json();
            if (!res.ok || data.success === false) throw new Error(data.error || 'No se pudo crear');
            // refrescar lista de opciones, o simplemente agregar
            setOptions(prev => [...prev, value]);
            notifications.show({ title: 'Éxito', message: `Creado "${value}"`, color: 'green' });
            return value;
        } catch (err) {
            notifications.show({ title: 'Error', message: err.message, color: 'red' });
            return null;
        }
    }

    async function submit(value) {
        if (fieldKey === "Tipo" && canCreate && onCreateNew) {
            onCreateNew(value);
            return;
        }
        const final = canCreate ? await createIfNeeded(value) : value;
        if (final) {
            cfg.write(form, final);
            setSearch("");
        }

    }

    return { loading, search, setSearch, filtered, options, canCreate, submit };
}