import {
  httpsCallable,
  type HttpsCallableResult,
} from 'firebase/functions';
import { getFirebaseFunctions, isFirebaseReady } from './firebase';

/**
 * Wrap a Firebase onCall function so it can be used with TanStack Query's
 * useMutation/useQuery. Returns an async function that:
 *  - Throws structured `error.details` matching the old 409 CONFLICT shape
 *    so the frontend's existing error-handling needs minimal changes.
 *  - Unwraps the `.data` envelope.
 */
export function createCallable<TData = unknown, TResult = unknown>(
  name: string,
): (payload: TData) => Promise<TResult> {
  return async (payload: TData): Promise<TResult> => {
    if (!isFirebaseReady()) {
      throw new Error('Firebase not initialized (mock mode active)');
    }
    const fn = httpsCallable<TData, TResult>(getFirebaseFunctions(), name);
    let result: HttpsCallableResult<TResult>;
    try {
      result = await fn(payload);
    } catch (err: unknown) {
      const fbErr = err as { code?: string; details?: unknown; message?: string };
      // Re-throw with the same shape the old axios error handler expects:
      // { response: { data: { code, details } } }
      const wrapped = new Error(fbErr.message) as Error & {
        response?: { data?: { code?: string; details?: Record<string, unknown> } };
      };
      wrapped.response = {
        data: {
          code: fbErr.code ?? 'UNKNOWN',
          details: fbErr.details as Record<string, unknown> | undefined,
        },
      };
      throw wrapped;
    }
    return result.data;
  };
}
