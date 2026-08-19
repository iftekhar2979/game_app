type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export function formatToastMessage(message?: unknown): string | undefined {
  if (message === null || message === undefined) return undefined;

  // Validation failures come back as a string[], and other rejections can carry
  // an object. Coerce before touching string methods — calling .replace on an
  // array throws inside the caller's catch block and surfaces as an unhandled
  // promise rejection rather than a toast.
  const text = Array.isArray(message)
    ? message.filter(Boolean).join('\n')
    : typeof message === 'string'
    ? message
    : typeof message === 'object'
    ? (message as any).message
      ? String((message as any).message)
      : JSON.stringify(message)
    : String(message);

  if (!text) return undefined;

  return text
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
  success: (title: string, message?: unknown) => {
    toastEmitter.show({ type: 'success', title, message: formatToastMessage(message) });
  },
  warning: (title: string, message?: unknown) => {
    toastEmitter.show({ type: 'warning', title, message: formatToastMessage(message) });
  },
  error: (title: string, message?: unknown) => {
    toastEmitter.show({ type: 'error', title, message: formatToastMessage(message) });
  },
  info: (title: string, message?: unknown) => {
    toastEmitter.show({ type: 'info', title, message: formatToastMessage(message) });
  },
};
