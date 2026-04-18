type EventCallback = (data: unknown) => void;

export interface EventBus {
  emit(event: string, data?: unknown): void;
  on(event: string, callback: EventCallback): () => void;
}

export function createEventBus(): EventBus {
  const listeners = new Map<string, Set<EventCallback>>();

  function emit(event: string, data?: unknown): void {
    const set = listeners.get(event);
    if (!set) return;
    set.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error(`[PluginHub] event listener error (${event})`, e);
      }
    });
  }

  function on(event: string, callback: EventCallback): () => void {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(callback);
    return () => {
      listeners.get(event)?.delete(callback);
    };
  }

  return { emit, on };
}
