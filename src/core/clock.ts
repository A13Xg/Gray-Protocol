let nowProvider: () => number = () => Date.now();

export function nowMs(): number {
  return nowProvider();
}

export function setNowProvider(provider: () => number): void {
  nowProvider = provider;
}

export function resetNowProvider(): void {
  nowProvider = () => Date.now();
}
