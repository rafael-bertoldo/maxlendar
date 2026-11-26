import { ApiError, readApiError } from './client';

type PushSubscriptionPayload = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
};

export type PushStatus =
  | { kind: 'unsupported'; message: string }
  | { kind: 'unavailable'; message: string }
  | { kind: 'blocked'; message: string }
  | { kind: 'inactive'; message: string }
  | { kind: 'active'; message: string };

function base64UrlToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = `${base64Url}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

export function pushIsSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function unsupportedPushStatus(): PushStatus {
  return {
    kind: 'unsupported',
    message: 'Este navegador não oferece notificações push; os eventos continuam disponíveis na agenda.',
  };
}

export function blockedPushStatus(): PushStatus {
  return {
    kind: 'blocked',
    message: 'Notificações estão bloqueadas neste site. Altere a permissão no navegador para receber lembretes.',
  };
}

export async function readPushStatus(): Promise<PushStatus> {
  if (!pushIsSupported()) return unsupportedPushStatus();
  if (Notification.permission === 'denied') return blockedPushStatus();

  const subscription = await navigator.serviceWorker.ready
    .then((registration) => registration.pushManager.getSubscription())
    .catch(() => null);

  if (subscription) {
    return { kind: 'active', message: 'Lembretes ativos neste dispositivo.' };
  }

  return { kind: 'inactive', message: 'Lembretes não ativados neste dispositivo.' };
}

export async function enablePush(): Promise<PushStatus> {
  if (!pushIsSupported()) return unsupportedPushStatus();
  if (Notification.permission === 'denied') return blockedPushStatus();

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      kind: 'blocked',
      message: 'Sem permissão para notificações. Você pode ativar os lembretes depois, sem perder seus eventos.',
    };
  }

  const keyResponse = await fetch('/api/push/vapid-public-key', { credentials: 'include' });
  if (!keyResponse.ok) {
    if (keyResponse.status === 503) {
      return {
        kind: 'unavailable',
        message: 'Lembretes não estão disponíveis neste servidor; você ainda pode usar a agenda normalmente.',
      };
    }
    const error = await readApiError(keyResponse);
    throw error;
  }

  const { publicKey } = (await keyResponse.json()) as { publicKey: string };
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(publicKey),
  });
  const payload = subscription.toJSON() as PushSubscriptionPayload;

  if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) {
    throw new ApiError(0, 'INVALID_SUBSCRIPTION', undefined, 'A inscrição push está incompleta.');
  }

  const saveResponse = await fetch('/api/push/subscriptions', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!saveResponse.ok) {
    throw await readApiError(saveResponse);
  }

  return { kind: 'active', message: 'Lembretes ativos neste dispositivo: 10 minutos e 1 minuto antes de cada evento.' };
}

export async function removeCurrentPushSubscription(): Promise<void> {
  if (!pushIsSupported()) return;

  const subscription = await navigator.serviceWorker.ready
    .then((registration) => registration.pushManager.getSubscription())
    .catch(() => null);
  if (!subscription) return;

  const payload = subscription.toJSON() as PushSubscriptionPayload;
  try {
    await fetch('/api/push/subscriptions', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    await subscription.unsubscribe().catch(() => false);
    return;
  }
  await subscription.unsubscribe().catch(() => false);
}
