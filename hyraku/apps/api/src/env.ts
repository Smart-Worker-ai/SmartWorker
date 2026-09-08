export const env = {
  port: Number(process.env.PORT ?? 4000),

  /** simulator | cloud — the single switch between demo and live. */
  channel: (process.env.CHANNEL ?? 'simulator') as 'simulator' | 'cloud',

  adminPassword: process.env.ADMIN_PASSWORD ?? 'hyraku',

  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? '',
    appSecret: process.env.WHATSAPP_APP_SECRET ?? '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? 'hyraku-verify',
    apiVersion: process.env.WHATSAPP_API_VERSION ?? 'v21.0',
  },
};

export function assertCloudConfigured(): void {
  if (env.channel !== 'cloud') return;
  const missing = (['phoneNumberId', 'accessToken', 'appSecret'] as const).filter(
    (k) => !env.whatsapp[k]
  );
  if (missing.length) {
    throw new Error(
      `CHANNEL=cloud but missing: ${missing.map((m) => `WHATSAPP_${snake(m)}`).join(', ')}`
    );
  }
}

function snake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase();
}
