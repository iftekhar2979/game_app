type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export function formatToastMessage(message?: string): string | undefined {
  if (!message) return undefined;
  return message
    .replace(
      /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?\b/g,
      (match) => {
        try {
          const d = new Date(match);
          if (isNaN(d.getTime())) return match;
          return d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
        } catch {
          return match;
        }
      }
    )
    .replace(/^LOCKED:\s*/i, 'Locked: ');
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
    const formattedOptions = {
      ...options,
      message: formatToastMessage(options.message),
    };
    if (this.listener) {
      this.listener(formattedOptions);
    }
  }
}

export const toastEmitter = new ToastEmitter();

export const showToast = {
  success: (title: string, message?: string) => {
    toastEmitter.show({ type: 'success', title, message: formatToastMessage(message) });
  },
  warning: (title: string, message?: string) => {
    toastEmitter.show({ type: 'warning', title, message: formatToastMessage(message) });
  },
  error: (title: string, message?: string) => {
    toastEmitter.show({ type: 'error', title, message: formatToastMessage(message) });
  },
  info: (title: string, message?: string) => {
    toastEmitter.show({ type: 'info', title, message: formatToastMessage(message) });
  },
};
