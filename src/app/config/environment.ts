import { generatedEnv } from './generated-env';

type GeneratedEnvWithQueue = typeof generatedEnv & { NG_APP_QUEUE_URL?: string };
const generatedSource = generatedEnv as GeneratedEnvWithQueue;

const getValue = (value: string | undefined, fallback: string) => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  return fallback;
};

export const environment = {
  apiUrl: getValue(generatedEnv.NG_APP_API_URL, 'http://192.168.1.69:3000/api'),
  queueApiUrl: getValue(generatedSource.NG_APP_QUEUE_URL, 'http://192.168.1.69:3000'),
  mercadoPagoPublicKey: getValue(generatedEnv.NG_APP_MP_PUBLIC_KEY, ''),
};
