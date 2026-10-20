import React from 'react';
import { useToastStore } from '../../store/toastStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let bgStyle = 'bg-surface-container-lowest text-on-surface border-outline-variant';
        let iconName = 'info';
        let iconColor = 'text-primary';

        if (toast.type === 'success') {
          bgStyle = 'bg-emerald-50 text-emerald-950 border-emerald-200';
          iconName = 'check_circle';
          iconColor = 'text-emerald-600';
        } else if (toast.type === 'error') {
          bgStyle = 'bg-rose-50 text-rose-950 border-rose-200';
          iconName = 'error';
          iconColor = 'text-rose-600';
        } else if (toast.type === 'warning') {
          bgStyle = 'bg-amber-50 text-amber-950 border-amber-200';
          iconName = 'warning';
          iconColor = 'text-amber-600';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-lg transition-all transform animate-in fade-in slide-in-from-bottom-2 ${bgStyle}`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`material-symbols-outlined text-xl ${iconColor}`}>
                {iconName}
              </span>
              <p className="text-body-sm font-body-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-black/5 text-outline transition-colors"
              title="بستن"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};
