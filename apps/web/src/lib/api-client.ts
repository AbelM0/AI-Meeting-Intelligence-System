import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

let getAccessToken: () => Promise<string | null> = () => Promise.resolve(null);

export function configureApiAuthentication(provider: () => Promise<string | null>): void {
  getAccessToken = provider;
}

apiClient.interceptors.request.use(async (request) => {
  const token = await getAccessToken();
  if (token) request.headers.set('Authorization', `Bearer ${token}`);
  else request.headers.delete('Authorization');
  return request;
});

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const data: unknown = error.response?.data;

  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = data.message;

    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
      return message.join(' ');
    }
  }

  return fallback;
}
