import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import { useAuth } from '../../../contexts/AuthContext';

export default function OAuthCallbackPage() {
  const { user, organizationId, needsAccountSetup, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const providerError = searchParams.get('error_description')
    || searchParams.get('error')
    || hashParams.get('error_description')
    || hashParams.get('error');

  useEffect(() => {
    if (loading || providerError) return;
    if (!user) {
      navigate('/login?oauth_error=session', { replace: true });
      return;
    }
    if (needsAccountSetup) {
      navigate('/complete-account', { replace: true });
      return;
    }
    if (organizationId) navigate('/', { replace: true });
  }, [loading, needsAccountSetup, navigate, organizationId, providerError, user]);

  useEffect(() => {
    if (providerError) {
      navigate(`/login?oauth_error=${encodeURIComponent(providerError)}`, { replace: true });
    }
  }, [navigate, providerError]);

  return <LoadingScreen label="Securing your SlotForge session" />;
}
