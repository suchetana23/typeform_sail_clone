'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 left-5 z-[100] flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="flex items-center gap-2.5 bg-[#262627] text-white text-sm font-medium pl-3.5 pr-5 py-3 rounded-lg shadow-lg toast-slide-in max-w-sm"
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] ${
                toast.type === 'success' ? 'bg-[#044663]' : 'bg-[#C31F1F]'
              }`}
            >
              {toast.type === 'success' ? '✓' : '!'}
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
