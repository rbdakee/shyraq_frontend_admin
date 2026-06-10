import { useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { useContent } from '@/hooks/use-content';
import { useBreadcrumbLabel } from '@/hooks/use-breadcrumb-label';
import { useUiStore } from '@/stores/ui-store';
import { resolveJsonbI18n, type JsonbI18n } from '@/lib/jsonb-i18n';
import { ContentEditor } from './_components/content-editor';

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useContent(id);
  const locale = useUiStore((s) => s.locale);

  useBreadcrumbLabel(id, data ? resolveJsonbI18n(data.title_i18n as JsonbI18n, locale) : undefined);

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 py-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState />;
  }

  return <ContentEditor mode="edit" post={data} />;
}
