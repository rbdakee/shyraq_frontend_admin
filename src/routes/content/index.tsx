// WHY VIS-deviation: VIS screens-ops.jsx ContentFeed shows inline right-rail editor;
// we use route-based editor (/content/new) for consistency with other modules
// (children, billing, schedule) and mobile parity. See OPEN_QUESTIONS A21.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlusIcon, MoreHorizontalIcon, EyeIcon, FilterIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru, kk as kkLocale } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentSectionTabs } from './_components/content-section-tabs';
import { ContentPageHeader } from './_components/content-page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { FilterBottomSheet } from '@/components/forms/filter-bottom-sheet';
import { Fab } from '@/components/ui/fab';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useContentList, ContentTypeEnum, ContentStatusEnum } from '@/hooks/use-content';
import type {
  ContentPost,
  ContentType,
  ContentStatus,
  ContentListFilters,
} from '@/hooks/use-content';
import { resolveJsonbI18n } from '@/lib/jsonb-i18n';
import { cn } from '@/lib/cn';

const TYPE_BADGE_MAP: Record<ContentType, 'info' | 'success' | 'warning' | 'neutral' | 'default'> =
  {
    news: 'info',
    menu: 'success',
    schedule_pub: 'warning',
    qundylyq: 'default',
    birthday: 'neutral',
  };

const STATUS_BADGE_MAP: Record<ContentStatus, 'neutral' | 'info' | 'success'> = {
  draft: 'neutral',
  scheduled: 'info',
  published: 'success',
};

function fmtDate(dateStr: string | null, locale: 'ru' | 'kk'): string {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'dd.MM.yyyy HH:mm', {
      locale: locale === 'kk' ? kkLocale : ru,
    });
  } catch {
    return dateStr;
  }
}

type MobileTab = 'feed' | 'scheduled' | 'drafts';

export default function ContentPage() {
  const { t, i18n } = useTranslation('content');
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const locale = i18n.language as 'ru' | 'kk';

  const [typeFilter, setTypeFilter] = useState<ContentType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [mobileTab, setMobileTab] = useState<MobileTab>('feed');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const filters: ContentListFilters = {};
  if (typeFilter !== 'all') filters.content_type = typeFilter;
  if (!isMobile && statusFilter !== 'all') filters.status = statusFilter;
  if (isMobile) {
    if (mobileTab === 'scheduled') filters.status = 'scheduled';
    else if (mobileTab === 'drafts') filters.status = 'draft';
    else filters.status = undefined;
  }
  if (cursor) filters.cursor = cursor;

  const { data, isLoading, error, refetch } = useContentList(filters);
  const posts = data?.items ?? [];
  const nextCursor = data?.cursor ?? null;

  const feedPosts =
    isMobile && mobileTab === 'feed' ? posts.filter((p) => p.status === 'published') : posts;

  function getPostDate(p: ContentPost) {
    if (p.status === 'scheduled' && p.scheduled_for) return fmtDate(p.scheduled_for, locale);
    if (p.status === 'published' && p.published_at) return fmtDate(p.published_at, locale);
    return '';
  }

  function getTargetLabel(p: ContentPost) {
    if (p.target_type === 'all') return t('target_all');
    if (p.target_type === 'group') return `${t('target_group')}: ${p.target_group_id ?? ''}`;
    if (p.target_type === 'child') return `${t('target_child')}: ${p.target_child_id ?? ''}`;
    return '';
  }

  const hasFilters = typeFilter !== 'all' || statusFilter !== 'all';

  if (isMobile) {
    const scheduledCount = (data?.items ?? []).filter((p) => p.status === 'scheduled').length;

    const currentTabLabel =
      mobileTab === 'feed'
        ? t('tab_feed')
        : mobileTab === 'scheduled'
          ? t('status_scheduled')
          : t('status_draft');

    return (
      <>
        <ContentPageHeader />

        <div className="flex flex-col gap-3">
          <div className="mb-3">
            <ContentSectionTabs active="feed" />
          </div>

          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] text-[color:var(--text-2)]">
              {currentTabLabel}
              {mobileTab === 'scheduled' && scheduledCount > 0 && (
                <span className="ml-1 rounded-full bg-[var(--bg-sunken)] px-1.5 text-[10px]">
                  {scheduledCount}
                </span>
              )}
            </span>
            <button
              type="button"
              className="m-iconbtn"
              onClick={() => setFilterSheetOpen(true)}
              aria-label={t('filters_status_title')}
            >
              <FilterIcon />
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-[var(--r-lg)]" />
              ))}
            </div>
          ) : feedPosts.length === 0 ? (
            <EmptyState title={t('empty_feed')} />
          ) : (
            <div className="flex flex-col gap-3">
              {feedPosts.map((p) => (
                <div
                  key={p.id}
                  className="m-card cursor-pointer overflow-hidden p-0"
                  onClick={() => navigate(`/content/${p.id}`)}
                >
                  <div className="flex items-center gap-2.5 p-3.5 pb-0">
                    <div className="flex-1 min-w-0">
                      <Badge variant={TYPE_BADGE_MAP[p.content_type]} className="mb-1">
                        {t(`type_${p.content_type}`)}
                      </Badge>
                      <div className="text-[14.5px] font-bold tracking-[-0.005em]">
                        {resolveJsonbI18n(p.title_i18n, locale) ||
                          p.title ||
                          t('editor_title_edit')}
                      </div>
                    </div>
                    {p.status !== 'published' && (
                      <Badge variant={STATUS_BADGE_MAP[p.status]} dot className="text-[10.5px]">
                        {t(`status_${p.status}`)}
                      </Badge>
                    )}
                  </div>
                  <div className="px-3.5 py-2 text-[13px] leading-[1.5] text-[color:var(--text-2)]">
                    {resolveJsonbI18n(p.body_i18n, locale) || p.body || ''}
                  </div>
                  <div className="border-t border-[var(--line)] px-3.5 py-2.5 text-[12px] text-[color:var(--text-3)]">
                    {getTargetLabel(p)} {getPostDate(p) && `· ${getPostDate(p)}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {nextCursor && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCursor(nextCursor)}
              className="self-center"
            >
              {t('load_more')}
            </Button>
          )}

          <Fab aria-label={t('create_post')} onClick={() => navigate('/content/new')}>
            <PlusIcon />
          </Fab>

          <FilterBottomSheet
            open={filterSheetOpen}
            onOpenChange={setFilterSheetOpen}
            title={t('filters_status_title')}
            onReset={() => {
              setMobileTab('feed');
              setFilterSheetOpen(false);
            }}
          >
            <div className="flex flex-col gap-2">
              {(['feed', 'scheduled', 'drafts'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setMobileTab(opt);
                    setFilterSheetOpen(false);
                  }}
                  className={cn(
                    'flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line)] px-3 py-3 text-left text-[14px]',
                    mobileTab === opt && 'border-[var(--primary)] bg-[var(--primary-soft)]',
                  )}
                >
                  <span>
                    {opt === 'feed'
                      ? t('tab_feed')
                      : opt === 'scheduled'
                        ? t('status_scheduled')
                        : t('status_draft')}
                  </span>
                  {opt === 'scheduled' && scheduledCount > 0 && (
                    <span className="rounded-full bg-[var(--bg-sunken)] px-2 text-[11px]">
                      {scheduledCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </FilterBottomSheet>
        </div>
      </>
    );
  }

  // Desktop
  return (
    <div className="page">
      <ContentPageHeader />

      <div className="mb-4">
        <ContentSectionTabs active="feed" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v as ContentType | 'all');
            setCursor(undefined);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('filter_all_types')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter_all_types')}</SelectItem>
            {ContentTypeEnum.options.map((ct) => (
              <SelectItem key={ct} value={ct}>
                {t(`type_${ct}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as ContentStatus | 'all');
            setCursor(undefined);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('filter_all_statuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filter_all_statuses')}</SelectItem>
            {ContentStatusEnum.options.map((st) => (
              <SelectItem key={st} value={st}>
                {t(`status_${st}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : posts.length === 0 ? (
        <EmptyState
          variant={hasFilters ? 'filtered' : 'default'}
          title={hasFilters ? undefined : t('empty_feed')}
          onResetFilters={
            hasFilters
              ? () => {
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setCursor(undefined);
                }
              : undefined
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--line)]">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--bg-sunken)]">
                  <th className="px-3 py-2.5 text-[12px] font-semibold text-[color:var(--text-3)]">
                    {t('col_type')}
                  </th>
                  <th className="px-3 py-2.5 text-[12px] font-semibold text-[color:var(--text-3)]">
                    {t('col_title')}
                  </th>
                  <th className="px-3 py-2.5 text-[12px] font-semibold text-[color:var(--text-3)]">
                    {t('col_target')}
                  </th>
                  <th className="px-3 py-2.5 text-[12px] font-semibold text-[color:var(--text-3)]">
                    {t('col_status')}
                  </th>
                  <th className="px-3 py-2.5 text-[12px] font-semibold text-[color:var(--text-3)]">
                    {t('col_date')}
                  </th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer border-b border-[var(--line)] transition-colors hover:bg-[var(--bg-sunken)]"
                    onClick={() => navigate(`/content/${p.id}`)}
                  >
                    <td className="px-3 py-2.5">
                      <Badge variant={TYPE_BADGE_MAP[p.content_type]}>
                        {t(`type_${p.content_type}`)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-[color:var(--text-1)]">
                      {resolveJsonbI18n(p.title_i18n, locale) || p.title || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] text-[color:var(--text-3)]">
                      {getTargetLabel(p)}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={STATUS_BADGE_MAP[p.status]}>{t(`status_${p.status}`)}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-[color:var(--text-3)]">
                      {getPostDate(p) || '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/content/${p.id}`);
                            }}
                          >
                            <EyeIcon className="mr-2 size-4" />
                            {t('editor_title_edit')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12.5px] text-[color:var(--text-3)]">
              {t('shown_count', { count: posts.length })}
            </span>
            {nextCursor && (
              <Button variant="outline" size="sm" onClick={() => setCursor(nextCursor)}>
                {t('load_more')}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
