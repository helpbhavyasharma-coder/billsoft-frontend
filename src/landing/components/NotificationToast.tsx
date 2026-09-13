import React, { useEffect } from 'react';
import { CheckCircle2, ShieldCheck, X, MessageSquare, ExternalLink } from 'lucide-react';

export interface ToastData {
  id: string;
  type: 'login' | 'whatsapp' | 'info';
  title: string;
  message: string;
}

interface NotificationToastProps {
  toast: ToastData | null;
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full p-4 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0 mt-0.5">
          {toast.type === 'login' && <ShieldCheck className="w-5 h-5 text-emerald-400" />}
          {toast.type === 'whatsapp' && <MessageSquare className="w-5 h-5 text-emerald-400" />}
          {toast.type === 'info' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
        </div>

        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              {toast.title}
            </h4>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {toast.message}
          </p>
          {toast.type === 'login' && (
            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-emerald-400">
              <span>Target: Bhauu Auth Managed Route</span>
              <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">/</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
