import { env } from '../lib/env';
import type { AuthUser } from './types';

// When VITE_MOCK_AUTH=true the frontend uses a dummy Admin session so the UI
// can be built without a running backend. Flip to 'false' once the API is ready.
export const isMockMode = env.VITE_MOCK_AUTH === 'true';

export const MOCK_USER: AuthUser = {
  id: 'mock-admin',
  name: 'Demo Admin',
  email: 'admin@assetflow.com',
  role: 'Admin',
  departmentId: null,
  status: 'Active',
};
