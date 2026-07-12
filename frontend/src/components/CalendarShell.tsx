import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';

export interface CalEvent {
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  classNames?: string[];
}

export function CalendarShell({
  events,
  initialView = 'timeGridWeek',
}: {
  events: CalEvent[];
  initialView?: string;
}) {
  return (
    <div className="calendar-wrap">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin]}
        initialView={initialView}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={events}
        height="auto"
      />
    </div>
  );
}
