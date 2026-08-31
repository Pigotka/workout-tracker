export type HeartRateStatus = "off" | "connecting" | "on" | "error";

export type HeartRateState = {
  supported: boolean;
  status: HeartRateStatus;
  bpm: number | null;
};

type BtCharacteristic = {
  value?: DataView;
  startNotifications: () => Promise<unknown>;
  stopNotifications: () => Promise<unknown>;
  addEventListener: (type: string, fn: (event: Event) => void) => void;
  removeEventListener: (type: string, fn: (event: Event) => void) => void;
};

type BtDevice = {
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: (type: string, fn: () => void) => void;
  gatt?: {
    connect: () => Promise<{
      getPrimaryService: (id: string) => Promise<{
        getCharacteristic: (id: string) => Promise<BtCharacteristic>;
      }>;
    }>;
    disconnect: () => void;
  };
};

function bluetooth():
  | { requestDevice: (opts: unknown) => Promise<BtDevice> }
  | undefined {
  if (typeof navigator === "undefined") return undefined;
  const nav = navigator as Navigator & {
    bluetooth?: { requestDevice: (opts: unknown) => Promise<BtDevice> };
  };
  return nav.bluetooth;
}

export function parseHeartRate(data: DataView): number {
  const flags = data.getUint8(0);
  return flags & 0x1 ? data.getUint16(1, true) : data.getUint8(1);
}

export function heartRateSupported(): boolean {
  return bluetooth() != null;
}

let status: HeartRateStatus = "off";
let bpm: number | null = null;
let device: BtDevice | null = null;
let characteristic: BtCharacteristic | null = null;
let snapshot: HeartRateState = { supported: false, status: "off", bpm: null };
const listeners = new Set<() => void>();

function syncSnapshot(): HeartRateState {
  const next: HeartRateState = { supported: heartRateSupported(), status, bpm };
  if (
    snapshot.supported === next.supported &&
    snapshot.status === next.status &&
    snapshot.bpm === next.bpm
  ) {
    return snapshot;
  }
  snapshot = next;
  return snapshot;
}

function emit(): void {
  syncSnapshot();
  for (const listener of listeners) listener();
}

export function heartRateSnapshot(): HeartRateState {
  return syncSnapshot();
}

export function subscribeHeartRate(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function onValue(event: Event): void {
  const value = (event.target as BtCharacteristic | null)?.value;
  if (!value) return;
  bpm = parseHeartRate(value);
  status = "on";
  emit();
}

function onDisconnected(): void {
  characteristic = null;
  device = null;
  bpm = null;
  status = "off";
  emit();
}

export async function connectHeartRate(): Promise<void> {
  const api = bluetooth();
  if (!api) {
    status = "error";
    emit();
    return;
  }
  status = "connecting";
  bpm = null;
  emit();
  try {
    device = await api.requestDevice({
      filters: [{ services: ["heart_rate"] }, { namePrefix: "HRM" }, { namePrefix: "Garmin" }],
      optionalServices: ["heart_rate"],
    });
    device.addEventListener("gattserverdisconnected", onDisconnected);
    const server = await device.gatt?.connect();
    if (!server) throw new Error("no gatt");
    const service = await server.getPrimaryService("heart_rate");
    characteristic = await service.getCharacteristic("heart_rate_measurement");
    characteristic.addEventListener("characteristicvaluechanged", onValue);
    await characteristic.startNotifications();
    status = "on";
    emit();
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    status = name === "NotFoundError" || name === "AbortError" ? "off" : "error";
    device = null;
    characteristic = null;
    bpm = null;
    emit();
  }
}

export async function disconnectHeartRate(): Promise<void> {
  try {
    characteristic?.removeEventListener("characteristicvaluechanged", onValue);
    await characteristic?.stopNotifications();
  } catch {
    /* already gone */
  }
  try {
    device?.removeEventListener("gattserverdisconnected", onDisconnected);
    device?.gatt?.disconnect();
  } catch {
    /* already gone */
  }
  characteristic = null;
  device = null;
  bpm = null;
  status = "off";
  emit();
}

export function toggleHeartRate(): void {
  if (status === "on" || status === "connecting") {
    void disconnectHeartRate();
    return;
  }
  void connectHeartRate();
}
