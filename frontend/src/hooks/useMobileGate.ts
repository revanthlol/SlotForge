import { useEffect, useState } from 'react';

export const MOBILE_GATE_QUERY = '(max-width: 899px), (pointer: coarse) and (orientation: portrait)';

export default function useMobileGate() {
  const [blocked, setBlocked] = useState(() => window.matchMedia(MOBILE_GATE_QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_GATE_QUERY);
    const update = () => setBlocked(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return blocked;
}
