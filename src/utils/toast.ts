type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

type ToastListener = (options: ToastOptions) => void;

class ToastEmitter {
  private listener: ToastListener | null = null;

  subscribe(listener: ToastListener) {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }

  show(options: ToastOptions) {
    if (this.listener) {
      this.listener(options);
    }
  }
}

export const toastEmitter = new ToastEmitter();

export const showToast = {
  success: (title: string, message?: string) => {
    toastEmitter.show({ type: 'success', title, message });
  },
  error: (title: string, message?: string) => {
    toastEmitter.show({ type: 'error', title, message });
  },
  info: (title: string, message?: string) => {
    toastEmitter.show({ type: 'info', title, message });
  },
};
