import type { ReactNode } from 'react';
import MobileExperienceGate from './MobileExperienceGate';
import useMobileGate from '../../hooks/useMobileGate';

export default function MobileRouteGate({ children }: { children: ReactNode }) {
  return useMobileGate() ? <MobileExperienceGate /> : children;
}
