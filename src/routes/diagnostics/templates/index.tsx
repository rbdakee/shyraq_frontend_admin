import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PlusIcon, ChevronRightIcon, EllipsisIcon, FileTextIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import {
  useDiagnosticTemplates,
  useDeactivateDiagnosticTemplate,
} from '@/hooks/use-diagnostic-templates';
import type { DiagnosticTemplate } from '@/hooks/use-diagnostic-templates';
import { useSpecialistTypes } from '@/hooks/use-specialist-types';
import { specialistTypeLabel } from '@/lib/specialist-type';
import { isAppError, toI18nKey } from '@/lib/error-map';

const EMPTY_ITEMS: DiagnosticTemplate[] = [];

type StatusFilter = 'all' | 'active' | 'inactive';

export default function DiagnosticsTemplatesPage() {
  const { t, i18n } = useTranslation(['diagnostics', 'staff', 'common', 'errors']);
  const locale = i18n.language;
  const { isMobile } = useBreakpoint();
  const navigate = useNavigate();

  const specTypesQuery = useSpecialistTypes();
  const activeSpecTypes = specTypesQuery.data ?? [];

  const [specFilter, setSpecFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filters = {
    specialist_type: specFilter === 'all' ? undefined : specFilter,
    is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
  };

  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useDiagnosticTemplates(filters);

  const templates = useMemo(() => data?.pages.flatMap((p) => p.items) ?? EMPTY_ITEMS, [data]);
  const deactivateMutation = useDeactivateDiagnosticTemplate();
  const [deactivateTarget, setDeactivateTarget] = useState<DiagnosticTemplate | null>(null);

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    try {
      await deactivateMutation.mutateAsync(deactivateTarget.id);
      toast.success(t('diagnostics:deactivate.success'));
      setDeactivateTarget(null);
    } catch (err) {
      if (isAppError(err)) {
        toast.error(t(toI18nKey(err)));
      } else {
        toast.error(t('errors:unknown_error'));
        console.error(err);
      }
    }
  }

  const hasFilters = specFilter !== 'all' || statusFilter !== 'all';

  function resetFilters() {
    setSpecFilter('all');
    setStatusFilter('all');
  }

  if (isMobile) {
    return (
      <MobileView
        templates={templates}
        isLoading={isLoading}
        error={error}
        specFilter={specFilter}
        onSpecFilterChange={setSpecFilter}
        onRefetch={() => void refetch()}
        onNavigate={navigate}
        onDeactivate={setDeactivateTarget}
        deactivateTarget={deactivateTarget}
        onConfirmDeactivate={handleDeactivate}
        deactivateLoading={deactivateMutation.isPending}
        hasMore={hasNextPage}
        isFetchingMore={isFetchingNextPage}
        onLoadMore={() => void fetchNextPage()}
      />
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">{t('diagnostics:templates_title')}</h1>
          <div className="page-sub">
            {templates.filter((tp) => tp.is_active).length} {t('diagnostics:active_count_suffix')}
          </div>
        </div>
        <Button onClick={() => navigate('/diagnostics/templates/new')}>
          <PlusIcon className="size-4" />
          {t('diagnostics:create_button')}
        </Button>
      </div>

      <div className="table-wrap mb-4">
        <div className="table-toolbar">
          <Select value={specFilter} onValueChange={setSpecFilter}>
            <SelectTrigger size="sm">
              <SelectValue placeholder={t('diagnostics:filters.specialist_type_placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('diagnostics:filters.specialist_type_placeholder')}
              </SelectItem>
              {activeSpecTypes.map((st) => (
                <SelectItem key={st.code} value={st.code}>
                  {specialistTypeLabel(st.code, activeSpecTypes, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger size="sm">
              <SelectValue placeholder={t('diagnostics:filters.status_placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('diagnostics:filters.status_placeholder')}</SelectItem>
              <SelectItem value="active">{t('diagnostics:filters.active')}</SelectItem>
              <SelectItem value="inactive">{t('diagnostics:filters.inactive')}</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />
        </div>

        {isLoading && (
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {error && <ErrorState onRetry={() => void refetch()} />}

        {!isLoading && !error && templates.length === 0 && (
          <EmptyState
            icon={<FileTextIcon className="size-9 text-[color:var(--text-4)]" />}
            title={
              hasFilters ? t('diagnostics:empty.filtered_title') : t('diagnostics:empty.title')
            }
            text={
              hasFilters
                ? t('diagnostics:empty.filtered_description')
                : t('diagnostics:empty.description')
            }
            variant={hasFilters ? 'filtered' : 'default'}
            onResetFilters={hasFilters ? resetFilters : undefined}
            action={
              !hasFilters ? (
                <Button
                  variant="outline"
                  className="mt-1"
                  onClick={() => navigate('/diagnostics/templates/new')}
                >
                  <PlusIcon className="size-4" />
                  {t('diagnostics:create_button')}
                </Button>
              ) : undefined
            }
          />
        )}

        {!isLoading && !error && templates.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>{t('diagnostics:columns.specialist_type')}</th>
                <th>{t('diagnostics:columns.name')}</th>
                <th>{t('diagnostics:columns.version')}</th>
                <th>{t('diagnostics:columns.is_active')}</th>
                <th className="w-10">{t('diagnostics:columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tp) => (
                <tr
                  key={tp.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/diagnostics/templates/${tp.id}`)}
                >
                  <td>
                    <Badge variant="info">
                      {specialistTypeLabel(tp.specialist_type, activeSpecTypes, locale)}
                    </Badge>
                  </td>
                  <td>
                    <strong>{tp.name}</strong>
                  </td>
                  <td className="font-mono text-[13px]">v{tp.version}</td>
                  <td>
                    {tp.is_active ? (
                      <Badge variant="success">{t('diagnostics:status.active')}</Badge>
                    ) : (
                      <Badge variant="neutral">{t('diagnostics:status.inactive')}</Badge>
                    )}
                  </td>
                  <td className="actions" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs">
                          <EllipsisIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => navigate(`/diagnostics/templates/${tp.id}`)}
                        >
                          {t('diagnostics:detail.edit')}
                        </DropdownMenuItem>
                        {tp.is_active && (
                          <DropdownMenuItem
                            className="text-[color:var(--danger)]"
                            onClick={() => setDeactivateTarget(tp)}
                          >
                            {t('diagnostics:detail.deactivate')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {hasNextPage && (
          <div className="flex justify-center border-t border-[var(--line)] p-3">
            <Button
              variant="outline"
              size="sm"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              {isFetchingNextPage ? t('common:loading') : t('common:pagination.load_more')}
            </Button>
          </div>
        )}
      </div>

      <DestructiveConfirm
        open={!!deactivateTarget}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null);
        }}
        title={t('diagnostics:deactivate.title')}
        description={t('diagnostics:deactivate.description')}
        confirmLabel={t('diagnostics:deactivate.confirm')}
        cancelLabel={t('diagnostics:deactivate.cancel')}
        onConfirm={handleDeactivate}
        loading={deactivateMutation.isPending}
      />
    </div>
  );
}

interface MobileViewProps {
  templates: DiagnosticTemplate[];
  isLoading: boolean;
  error: Error | null;
  specFilter: string;
  onSpecFilterChange: (v: string) => void;
  onRefetch: () => void;
  onNavigate: (path: string) => void;
  onDeactivate: (tp: DiagnosticTemplate | null) => void;
  deactivateTarget: DiagnosticTemplate | null;
  onConfirmDeactivate: () => void;
  deactivateLoading: boolean;
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore: () => void;
}

function MobileView({
  templates,
  isLoading,
  error,
  specFilter,
  onSpecFilterChange,
  onRefetch,
  onNavigate,
  onDeactivate,
  deactivateTarget,
  onConfirmDeactivate,
  deactivateLoading,
  hasMore,
  isFetchingMore,
  onLoadMore,
}: MobileViewProps) {
  const { t } = useTranslation(['diagnostics', 'staff', 'common']);

  const specFilters = [
    { key: 'all', label: t('common:mobile_filter_all'), count: templates.length },
    ...activeSpecTypes
      .map((st) => ({
        key: st.code,
        label: specialistTypeLabel(st.code, activeSpecTypes, locale),
        count: templates.filter((tp) => tp.specialist_type === st.code).length,
      }))
      .filter((sf) => sf.count > 0),
  ];

  const filtered =
    specFilter === 'all' ? templates : templates.filter((tp) => tp.specialist_type === specFilter);

  return (
    <>
      <MobileTopBar
        title={t('common:mobile_diag_title')}
        sub={t('common:mobile_diag_sub')}
        action={
          <button
            type="button"
            className="m-iconbtn primary"
            aria-label={t('common:actions.create')}
            onClick={() => onNavigate('/diagnostics/templates/new')}
          >
            <PlusIcon />
          </button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="m-chips">
          {specFilters.map((sf) => (
            <button
              key={sf.key}
              type="button"
              className={`m-chip${specFilter === sf.key ? ' active' : ''}`}
              onClick={() => onSpecFilterChange(sf.key)}
            >
              {sf.label}
              <span className="m-chip-count">{sf.count}</span>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex flex-col gap-2.5 px-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        )}

        {error && <ErrorState onRetry={onRefetch} />}

        {!isLoading && !error && filtered.length === 0 && (
          <EmptyState
            icon={<FileTextIcon className="size-9 text-[color:var(--text-4)]" />}
            title={t('diagnostics:empty.title')}
            text={t('diagnostics:empty.description')}
          />
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {filtered.map((tp) => (
              <div
                key={tp.id}
                className="m-card cursor-pointer"
                style={{ padding: 14, opacity: tp.is_active ? 1 : 0.6 }}
                onClick={() => onNavigate(`/diagnostics/templates/${tp.id}`)}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <Badge variant="info" dot className="text-[10.5px]">
                      {specialistTypeLabel(tp.specialist_type, activeSpecTypes, locale)}
                    </Badge>
                    <div className="mt-1.5 text-[14.5px] font-bold tracking-[-0.005em]">
                      {tp.name}
                    </div>
                  </div>
                  {tp.is_active ? (
                    <Badge variant="success" dot className="text-[10.5px]">
                      {t('common:mobile_diag_active')}
                    </Badge>
                  ) : (
                    <Badge variant="neutral" dot className="text-[10.5px]">
                      {t('common:mobile_diag_inactive')}
                    </Badge>
                  )}
                </div>
                <div
                  className="mt-2 flex items-center gap-3.5 border-t pt-2.5 text-[11.5px]"
                  style={{
                    borderColor: 'var(--line)',
                    color: 'var(--text-3)',
                  }}
                >
                  <span>
                    {t('common:mobile_diag_version')}{' '}
                    <strong className="font-mono" style={{ color: 'var(--text-1)' }}>
                      v{tp.version}
                    </strong>
                  </span>
                  <ChevronRightIcon
                    className="ml-auto size-3.5"
                    style={{ color: 'var(--text-4)' }}
                  />
                </div>
              </div>
            ))}

            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                className="mx-auto"
                disabled={isFetchingMore}
                onClick={onLoadMore}
              >
                {isFetchingMore ? t('common:loading') : t('common:pagination.load_more')}
              </Button>
            )}
          </div>
        )}
      </div>

      <DestructiveConfirm
        open={!!deactivateTarget}
        onOpenChange={(open) => {
          if (!open) onDeactivate(null);
        }}
        title={t('diagnostics:deactivate.title')}
        description={t('diagnostics:deactivate.description')}
        confirmLabel={t('diagnostics:deactivate.confirm')}
        cancelLabel={t('diagnostics:deactivate.cancel')}
        onConfirm={onConfirmDeactivate}
        loading={deactivateLoading}
      />
    </>
  );
}
