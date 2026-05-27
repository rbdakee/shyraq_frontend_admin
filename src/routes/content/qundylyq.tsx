import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlusIcon, SparklesIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru, kk } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { useContentList } from '@/hooks/use-content';
import type { ContentPost } from '@/hooks/use-content';
import { resolveJsonbI18n } from '@/lib/jsonb-i18n';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { ContentSectionTabs } from './_components/content-section-tabs';
import { ContentPageHeader } from './_components/content-page-header';

function formatMonth(monthStr: string, locale: 'ru' | 'kk'): string {
  try {
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return format(date, 'LLLL yyyy', { locale: locale === 'kk' ? kk : ru });
  } catch {
    return monthStr;
  }
}

export default function QundylyqPage() {
  const { t, i18n } = useTranslation('content');
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const locale = i18n.language as 'ru' | 'kk';

  const { data, isLoading, error } = useContentList({
    content_type: 'qundylyq',
    limit: 50,
  });

  if (error) return <ErrorState />;

  const posts = data?.items ?? [];

  const publishedPosts = posts
    .filter((p) => p.status === 'published' && p.published_at)
    .sort((a, b) => b.published_at!.localeCompare(a.published_at!));
  const current = publishedPosts[0] as ContentPost | undefined;
  const history = publishedPosts.slice(1);

  function getMetadata(post: ContentPost) {
    const md = post.metadata as Record<string, unknown> | null | undefined;
    return {
      month: typeof md?.month === 'string' ? md.month : '',
      theme: typeof md?.theme === 'string' ? md.theme : '',
    };
  }

  return (
    <>
      <ContentPageHeader />
      <div className={isMobile ? 'flex flex-col gap-4' : 'page'}>
        <div className="mb-4">
          <ContentSectionTabs active="qundylyq" />
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            title={t('empty_qundylyq')}
            action={
              <Button onClick={() => navigate('/content/new?type=qundylyq')}>
                <PlusIcon className="mr-1 size-4" />
                {t('action_create_qundylyq')}
              </Button>
            }
          />
        ) : (
          <div className={isMobile ? 'flex flex-col gap-4' : 'grid grid-cols-[1fr_320px] gap-6'}>
            <div className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--line)] bg-[var(--bg-elev)]">
              <div className="flex items-center justify-between border-b border-[var(--line)] p-4">
                <h2 className="text-[16px] font-bold text-[color:var(--text-1)]">
                  {t('qundylyq_current')}
                </h2>
                {current && <Badge variant="success">{t('status_published')}</Badge>}
              </div>

              {current ? (
                <>
                  <div
                    className="flex flex-col gap-3 p-6"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--primary-soft) 0%, var(--warning-soft) 100%)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="size-5 text-[color:var(--primary)]" />
                      {getMetadata(current).month && (
                        <Badge variant="default">
                          {formatMonth(getMetadata(current).month, locale)}
                        </Badge>
                      )}
                    </div>
                    {getMetadata(current).theme && (
                      <div className="text-[36px] font-[800] tracking-[-0.02em] text-[color:var(--text-1)]">
                        {getMetadata(current).theme}
                      </div>
                    )}
                    <div className="text-[18px] text-[color:var(--text-2)]">
                      {resolveJsonbI18n(current.title_i18n, locale) || current.title || ''}
                    </div>
                    <div className="max-w-[540px] text-[14px] leading-[1.5] text-[color:var(--text-2)]">
                      {resolveJsonbI18n(current.body_i18n, locale) || current.body || ''}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 border-t border-[var(--line)] p-4">
                    <Button variant="outline" onClick={() => navigate(`/content/${current.id}`)}>
                      {t('editor_title_edit')}
                    </Button>
                    <Button
                      onClick={() => navigate('/content/new?type=qundylyq')}
                      className="gap-1 bg-[var(--primary)] text-white hover:bg-[color:color-mix(in_oklab,var(--primary)_85%,black)]"
                    >
                      <PlusIcon className="size-4" />
                      {t('action_create_qundylyq')}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-[color:var(--text-3)]">
                  {t('empty_qundylyq')}
                </div>
              )}
            </div>

            <div className="rounded-[var(--r-xl)] border border-[var(--line)] bg-[var(--bg-elev)] p-4">
              <h3 className="mb-3 text-[15px] font-bold text-[color:var(--text-1)]">
                {t('qundylyq_history')}
              </h3>
              {history.length === 0 ? (
                <p className="text-[13px] text-[color:var(--text-3)]">
                  {t('qundylyq_history_empty')}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {history.map((q) => {
                    const md = getMetadata(q);
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => navigate(`/content/${q.id}`)}
                        className="cursor-pointer rounded-[var(--r-md)] bg-[var(--bg-sunken)] p-2.5 text-left transition-colors hover:bg-[var(--bg-sunken-hover)]"
                      >
                        {md.month && (
                          <div className="text-[10px] font-bold uppercase tracking-[0.05em] text-[color:var(--text-3)]">
                            {formatMonth(md.month, locale)}
                          </div>
                        )}
                        {md.theme && (
                          <div className="mt-0.5 text-[14px] font-bold text-[color:var(--text-1)]">
                            {md.theme}
                          </div>
                        )}
                        <div className="text-[12px] text-[color:var(--text-3)]">
                          {resolveJsonbI18n(q.title_i18n, locale) || q.title || ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
