import { useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { useDiagnosticTemplate } from '@/hooks/use-diagnostic-templates';
import { TemplateEditor } from './_components/template-editor';

export default function DiagnosticTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useDiagnosticTemplate(id);

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 py-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState />;
  }

  return <TemplateEditor mode="edit" template={data} />;
}
