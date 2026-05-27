import { useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { useContent } from '@/hooks/use-content';
import { ContentEditor } from './_components/content-editor';

export default function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useContent(id);

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
