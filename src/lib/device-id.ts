const DEVICE_ID_KEY = 'shyraq_admin_device_id';

export function getDeviceId(): string {
  try {
    const stored = localStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;

    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
