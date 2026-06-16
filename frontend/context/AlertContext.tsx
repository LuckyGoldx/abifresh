'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import ConfirmModal from '@/components/ConfirmModal';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  isAlert: boolean;
  isLoading: boolean;
}

interface AlertContextType {
  alert: (message: string, title?: string) => Promise<undefined>;
  confirm: (message: string, title?: string) => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType>({} as AlertContextType);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState>({ isOpen: false, title: '', message: '', isAlert: true, isLoading: false });
  const [resolveRef, setResolveRef] = useState<((value: any) => void) | null>(null);

  const alert = useCallback((message: string, title = 'Alert') => {
    return new Promise<undefined>((resolve) => {
      setResolveRef(() => resolve);
      setState({ isOpen: true, title, message, isAlert: true, isLoading: false });
    });
  }, []);

  const confirm = useCallback((message: string, title = 'Confirm') => {
    return new Promise<boolean>((resolve) => {
      setResolveRef(() => resolve);
      setState({ isOpen: true, title, message, isAlert: false, isLoading: false });
    });
  }, []);

  const handleConfirm = () => {
    resolveRef?.(true);
    setState({ isOpen: false, title: '', message: '', isAlert: true, isLoading: false });
    setResolveRef(null);
  };

  const handleCancel = () => {
    resolveRef?.(false);
    setState({ isOpen: false, title: '', message: '', isAlert: true, isLoading: false });
    setResolveRef(null);
  };

  return (
    <AlertContext.Provider value={{ alert, confirm }}>
      {children}
      <ConfirmModal
        isOpen={state.isOpen}
        title={state.title}
        message={state.message}
        isAlert={state.isAlert}
        isLoading={state.isLoading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </AlertContext.Provider>
  );
}

export const useAlert = () => useContext(AlertContext);
