import { useState } from 'react';
import { GitHubMark } from '../../public/PublicChrome';

type OAuthProvider = 'google' | 'github';

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.5-.2-2.2H12v4.1h5.5a4.7 4.7 0 0 1-2 3.1v2.7h3.3c1.9-1.8 3-4.4 3-7.7Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.8-2.4l-3.3-2.7c-.9.6-2.1 1-3.5 1a6 6 0 0 1-5.6-4.1H3v2.8A10.2 10.2 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.8A6.2 6.2 0 0 1 6.1 12c0-.6.1-1.2.3-1.8V7.4H3A10 10 0 0 0 2 12c0 1.7.4 3.2 1 4.6l3.4-2.8Z" />
      <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10.2 10.2 0 0 0-9 5.4l3.4 2.8A6 6 0 0 1 12 6.1Z" />
    </svg>
  );
}

export default function OAuthButtons({
  onProvider,
  onError,
}: {
  onProvider: (provider: OAuthProvider) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [activeProvider, setActiveProvider] = useState<OAuthProvider | null>(null);

  const start = async (provider: OAuthProvider) => {
    setActiveProvider(provider);
    onError('');
    try {
      await onProvider(provider);
    } catch (error) {
      onError(error instanceof Error ? error.message : `Could not continue with ${provider}`);
      setActiveProvider(null);
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => start('google')}
        disabled={activeProvider !== null}
        className="flex min-h-12 items-center justify-center gap-3 rounded-lg border-2 border-rule bg-paper-raised px-4 text-sm font-semibold text-on-surface transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-md disabled:translate-y-0 disabled:opacity-55"
      >
        <GoogleMark />
        <span>{activeProvider === 'google' ? 'Connecting…' : 'Google'}</span>
      </button>
      <button
        type="button"
        onClick={() => start('github')}
        disabled={activeProvider !== null}
        className="flex min-h-12 items-center justify-center gap-3 rounded-lg border-2 border-rule bg-on-surface px-4 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:opacity-55"
      >
        <GitHubMark className="h-5 w-5" />
        <span>{activeProvider === 'github' ? 'Connecting…' : 'GitHub'}</span>
      </button>
    </div>
  );
}
