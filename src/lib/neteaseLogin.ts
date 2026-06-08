import {
  checkLoginQR,
  createLoginQR,
  type LoginQRStatus,
} from './neteaseApi';

export interface QrLoginSession {
  cancel: () => void;
}

interface QrLoginSessionCallbacks {
  onLoading?: (loading: boolean) => void;
  onQr: (qrimg: string) => void;
  onStatus: (status: LoginQRStatus) => void;
  onSuccess: (cookie: string) => void;
  onError: () => void;
}

export function startQrLoginSession(
  callbacks: QrLoginSessionCallbacks,
  pollInterval = 2500,
): QrLoginSession {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cancel = () => {
    cancelled = true;
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const schedulePoll = (key: string) => {
    if (cancelled) return;
    timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const status = await checkLoginQR(key);
        if (cancelled) return;

        callbacks.onStatus(status);

        if (status.code === 803) {
          callbacks.onSuccess(status.cookie);
          return;
        }

        if (status.code === 800 || status.code === -1) {
          return;
        }

        schedulePoll(key);
      } catch {
        if (!cancelled) callbacks.onError();
      }
    }, pollInterval);
  };

  const begin = async () => {
    callbacks.onLoading?.(true);
    try {
      const { key, qrimg } = await createLoginQR();
      if (cancelled) return;
      callbacks.onQr(qrimg);
      callbacks.onLoading?.(false);
      callbacks.onStatus({ code: 801, message: 'waiting' });
      schedulePoll(key);
    } catch {
      if (!cancelled) {
        callbacks.onLoading?.(false);
        callbacks.onError();
      }
    }
  };

  begin();

  return { cancel };
}
