import { FormEvent, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../lib/api/client';
import { CalendarShell } from '../components/CalendarShell';

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
  response?: {
    data?: {
      error?: {
        code?: string;
        message?: string;
        requested?: { start: string; end: string };
        conflicting?: { start: string; end: string };
      };
    };
  };
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

  const { data: bookings } = useQuery({
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

  const baseEvents = (bookings ?? []).map((b) => ({
    title: `${b.resourceId?.tag ?? ''} · ${b.title}`,
    start: b.startTime,
    end: b.endTime,
    backgroundColor: b.status === 'Cancelled' ? '#64748b' : '#38bdf8',
  }));

  // BOOKING_OVERLAP must render as a red block on FullCalendar.
  const overlapEvents =
    overlap?.requested.start && overlap?.requested.end
      ? [
          {
            title: '⚠ Overlap (requested)',
            start: overlap.requested.start,
            end: overlap.requested.end,
            classNames: ['overlap'],
            backgroundColor: '#ef4444',
          },
        ]
      : [];

  const upcoming = (bookings ?? [])
    .filter((b) => new Date(b.startTime).getTime() >= Date.now())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 6);

  return (
    <div className="grid" style={{ gap: 24 }}>
      <div>
        <h2 style={{ marginTop: 0 }}>Resource Bookings</h2>
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
      </div>

      <div className="grid grid-calendar">
        <div className="card" style={{ padding: 16 }}>
          <CalendarShell
            events={[...baseEvents, ...overlapEvents]}
            initialView="timeGridWeek"
          />
        </div>

        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>New Booking</h3>
          <form onSubmit={onSubmit} className="form-grid">
            <div className="field full">
              <label>Resource ID</label>
              <input placeholder="Resource ID (e.g. 665f…)" value={resourceId} onChange={(e) => setResourceId(e.target.value)} required />
            </div>
            <div className="field full">
              <label>Title</label>
              <input placeholder="Booking title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="field full">
              <label>Start</label>
              <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div className="field full">
              <label>End</label>
              <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
            <div className="field full">
              <button className="btn" type="submit" disabled={bookingMutation.isPending}>
                {bookingMutation.isPending ? 'Booking…' : 'Book Resource'}
              </button>
              {error && <p className="error">{error}</p>}
            </div>
          </form>

          <h3>Upcoming</h3>
          {upcoming.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No upcoming bookings.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {upcoming.map((b) => (
                <li key={b._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <strong>{b.title}</strong>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {new Date(b.startTime).toLocaleString()} → {new Date(b.endTime).toLocaleTimeString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
