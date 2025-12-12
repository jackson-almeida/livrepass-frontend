import { generatedEnv } from './generated-env';

const getValue = (value: string | undefined, fallback: string) => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  return fallback;
};

export const environment = {
  apiUrl: getValue(generatedEnv.NG_APP_API_URL, 'http://localhost:3000/api'),
  mercadoPagoPublicKey: getValue(generatedEnv.NG_APP_MP_PUBLIC_KEY, ''),
};
