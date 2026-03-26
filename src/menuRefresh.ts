const listeners = new Set<() => void>();

export function registerMenuRefreshListener(listener: () => void): void {
  listeners.add(listener);
}

export function refreshMenus(): void {
  for (const listener of listeners) {
    listener();
  }
}
