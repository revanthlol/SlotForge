import { QueryClient } from '@tanstack/react-query';
import api, { setApiAccessToken } from '../api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

export { api, setApiAccessToken };
export default api;
