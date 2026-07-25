import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './Toast.css';

const ToastContext = React.createContext();

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const timers = useRef(new Map());

  const removeToast = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    nextId.current += 1;
    const id = `toast-${Date.now()}-${nextId.current}`;
    const newToast = { id, message: String(message || ''), type, duration };

    setToasts((current) => [...current.slice(-3), newToast]);

    if (duration > 0) {
      const timer = window.setTimeout(() => removeToast(id), duration);
      timers.current.set(id, timer);
    }

    return id;
  }, [removeToast]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  const value = useMemo(() => ({
    addToast,
    removeToast,
    success: (message, duration) => addToast(message, 'success', duration),
    error: (message, duration) => addToast(message, 'error', duration),
    warning: (message, duration) => addToast(message, 'warning', duration),
    info: (message, duration) => addToast(message, 'info', duration),
    toasts
  }), [addToast, removeToast, toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="toast-container" aria-label="Notifications" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
};

const Toast = ({ toast, removeToast }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    window.setTimeout(() => removeToast(toast.id), 300);
  };

  const isUrgent = toast.type === 'error' || toast.type === 'warning';

  return (
    <div
      className={`toast toast-${toast.type} ${isVisible ? 'toast-visible' : ''}`}
      role={isUrgent ? 'alert' : 'status'}
      aria-atomic="true"
    >
      <div className="toast-content">
        <span className="toast-message">{toast.message}</span>
        <button className="toast-close" onClick={handleClose} type="button" aria-label="Dismiss notification">
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
};

export default ToastProvider;
