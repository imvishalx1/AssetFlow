import { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

let listeners: Array<(items: ToastItem[]) => void> = [];
let items: ToastItem[] = [];
let counter = 0;

function emit() {
  listeners.forEach((l) => l(items));
}

export const toast = {
  show(type: ToastType, message: string) {
    const item: ToastItem = { id: ++counter, type, message };
    items = [...items, item];
    emit();
    setTimeout(() => {
      items = items.filter((i) => i.id !== item.id);
      emit();
    }, 3500);
  },
  success: (m: string) => toast.show('success', m),
  error: (m: string) => toast.show('error', m),
  info: (m: string) => toast.show('info', m),
  warning: (m: string) => toast.show('warning', m),
};

export function ToastViewport() {
  const [list, setList] = useState<ToastItem[]>(items);
  useEffect(() => {
    const l = (t: ToastItem[]) => setList(t);
    listeners.push(l);
    return () => {
      listeners = listeners.filter((x) => x !== l);
    };
  }, []);
  return (
    <div className="toast-stack">
      {list.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
