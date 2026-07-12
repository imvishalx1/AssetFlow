import { FormEvent, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { client } from '../lib/api/client';

interface Booking {
  _id: string;
  resourceId?: { tag: string; name: string };
  title: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface OverlapInfo {
  requested: { start: string; end: string };
  conflicting: { start: string; end: string };
  message: string;
}

interface ApiError {
  response?: { data?: { error?: { code?: string; message?: string; requested?: { start: string; end: string }; conflicting?: { start: string; end: string } } } };
}

const fmt = (v: string | Date) => new Date(v).toLocaleString();

export function Bookings() {
  const qc = useQueryClient();
  const [resourceId, setResourceId] = useState('');
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [overlap, setOverlap] = useState<OverlapInfo | null>(null);
  const [error, setError] = useState('');

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const res = await client.get('/bookings');
      return (res as unknown as { bookings: Booking[] }).bookings;
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (body: { resourceId: string; title: string; startTime: string; endTime: string }) =>
      client.post('/bookings', body),
    onSuccess: () => {
      setResourceId('');
      setTitle('');
      setStart('');
      setEnd('');
      setError('');
      setOverlap(null);
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      if (e.response?.data?.error?.code === 'BOOKING_OVERLAP') {
        const errData = e.response.data.error;
        setOverlap({
          requested: errData.requested ?? { start, end },
          conflicting: errData.conflicting ?? { start: '', end: '' },
          message: errData.message ?? 'Time slot overlaps an existing booking.',
        });
        setError('');
        return;
      }
      setOverlap(null);
      setError(e.response?.data?.error?.message ?? 'Booking failed');
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setOverlap(null);
    bookingMutation.mutate({ resourceId, title, startTime: start, endTime: end });
  };

  const events = (bookings ?? []).map((b) => ({
    title: `${b.resourceId?.tag ?? ''} · ${b.title}`,
    start: b.startTime,
    end: b.endTime,
    backgroundColor: b.status === 'Cancelled' ? '#64748b' : '#38bdf8',
  }));

  return (
    <div className="placeholder">
      <h2>Resource Bookings</h2>

      {overlap && (
        <div className="overlap-warning">
          <strong>⚠ Booking overlap</strong>
          <p>{overlap.message}</p>
          <p>
            Requested: <code>{fmt(overlap.requested.start)}</code> → <code>{fmt(overlap.requested.end)}</code>
          </p>
          <p>
            Conflicts with: <code>{fmt(overlap.conflicting.start)}</code> →{' '}
            <code>{fmt(overlap.conflicting.end)}</code>
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8, maxWidth: 460, margin: '12px 0' }}>
        <input placeholder="Resource ID (e.g. 665f...)" value={resourceId} onChange={(e) => setResourceId(e.target.value)} required />
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
        <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
        <button className="btn" type="submit" disabled={bookingMutation.isPending}>
          {bookingMutation.isPending ? 'Booking…' : 'Book Resource'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>

      {isLoading ? (
        <p>Loading calendar…</p>
      ) : (
        <div className="calendar-wrap">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
            events={events}
            height="auto"
          />
        </div>
      )}
    </div>
  );
}
