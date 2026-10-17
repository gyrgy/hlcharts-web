/**
 * "Open interest change since your last visit" (plan §3.3), opt-in: nothing
 * is stored until the visitor switches it on (ePrivacy art. 5(3): it is not
 * needed for anything they asked for), and switching it off deletes what was
 * stored. Kept only in this browser's localStorage; blocked storage just
 * means the feature has nothing to compare against.
 */
const ON_KEY = 'hlcharts:oi-memory:on';
const DATA_KEY = 'hlcharts:oi-memory:v1';

export interface OiSnapshot {
  at: number;
  /** Open interest in contracts, by market key. */
  oi: Record<string, number>;
}

export interface OiMemory {
  isOn(): boolean;
  turnOn(): void;
  /** Turns it off and deletes the stored figures. */
  turnOff(): void;
  read(): OiSnapshot | null;
  write(s: OiSnapshot): void;
}

export function oiMemory(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null
): OiMemory {
  const safe = <T>(fn: () => T, fallback: T): T => {
    try {
      return storage ? fn() : fallback;
    } catch {
      return fallback;
    }
  };
  return {
    isOn: () => safe(() => storage!.getItem(ON_KEY) === '1', false),
    turnOn: () => safe(() => storage!.setItem(ON_KEY, '1'), undefined),
    turnOff: () =>
      safe(() => {
        storage!.removeItem(ON_KEY);
        storage!.removeItem(DATA_KEY);
      }, undefined),
    read: () =>
      safe(() => {
        const raw = storage!.getItem(DATA_KEY);
        const s = raw ? (JSON.parse(raw) as OiSnapshot) : null;
        return s && typeof s.at === 'number' && s.oi && typeof s.oi === 'object' ? s : null;
      }, null),
    write: (s) => safe(() => storage!.setItem(DATA_KEY, JSON.stringify(s)), undefined),
  };
}
