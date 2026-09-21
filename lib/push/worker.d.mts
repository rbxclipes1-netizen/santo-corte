export function pushConfigured(): boolean;
export function dispatchPush(): Promise<{
  configured: boolean;
  sent: number;
  failed: number;
}>;
