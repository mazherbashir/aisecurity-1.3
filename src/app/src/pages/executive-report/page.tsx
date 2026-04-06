import { useEffect } from 'react';

import { Spinner } from '@app/components/ui/spinner';
import { UserProvider } from '@app/contexts/UserContext';
import { usePageMeta } from '@app/hooks/usePageMeta';
import { useUserStore } from '@app/stores/userStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ExecutiveReport from './components/ExecutiveReport';
import ExecutiveReportIndex from './components/ExecutiveReportIndex';

export default function ExecutiveReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { email, isLoading, fetchEmail } = useUserStore();
  const evalId = searchParams.get('evalId');
  usePageMeta({
    title: 'Executive Risk Dashboard',
    description: 'View or browse concise executive red team results',
  });

  useEffect(() => {
    fetchEmail();
  }, [fetchEmail]);

  useEffect(() => {
    if (!isLoading && !email) {
      navigate(`/login?type=report&redirect=${window.location.pathname}${window.location.search}`);
    }
  }, [isLoading, email, navigate]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 justify-center items-center h-36">
        <Spinner className="size-6" />
        <span className="text-sm text-muted-foreground">Waiting for report data</span>
      </div>
    );
  }

  if (!email) {
    // This will prevent a flash of content before redirect
    return null;
  }

  return <UserProvider>{evalId ? <ExecutiveReport /> : <ExecutiveReportIndex />}</UserProvider>;
}
