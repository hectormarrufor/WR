// Ruta: components/guardias/CalendarioGuardias.jsx

'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';

// NOTA MUY IMPORTANTE:
// Los estilos de FullCalendar deben ser importados en un componente raíz,
// como tu `app/layout.js`. Si no lo haces, el calendario se verá sin estilos.
// Asegúrate de tener estas líneas en `app/layout.js`:
// import '@fullcalendar/core/main.css';
// import '@fullcalendar/daygrid/main.css';

export default function CalendarioGuardias({ eventos, onDateClick }) {
  return (
    // El zIndex es importante para que los popovers del calendario no queden por debajo de otros elementos
    <div style={{ position: 'relative', zIndex: 0 }}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek'
        }}
        events={eventos}
        locale={esLocale} // Pone el calendario en español
        selectable={true}
        dateClick={onDateClick} // Llama a la función del padre cuando se hace clic en una fecha
        dayMaxEvents={true} // Para no saturar la vista, muestra "+n más" si hay muchos eventos
        eventDisplay="block"
        height="auto" // Ajusta la altura automáticamente
      />
    </div>
  );
}