import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Add a new toast (types: 'success', 'error', 'info')
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 3 seconds
    setTimeout(() => removeToast(id), 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      
      {/* Toast Container - Fixed to Top Right */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`
              pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-lg border transition-all animate-in slide-in-from-right-5 fade-in duration-300
              ${toast.type === 'success' ? 'bg-white border-green-200 text-green-800' : ''}
              ${toast.type === 'error' ? 'bg-white border-red-200 text-red-800' : ''}
              ${toast.type === 'info' ? 'bg-white border-blue-200 text-slate-800' : ''}
            `}
          >
            <div className="mt-0.5">
              {toast.type === 'success' && <CheckCircle size={18} className="text-green-600" />}
              {toast.type === 'error' && <AlertCircle size={18} className="text-red-600" />}
              {toast.type === 'info' && <Info size={18} className="text-blue-600" />}
            </div>
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};