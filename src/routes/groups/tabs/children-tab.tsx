import { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SearchIcon } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBox } from '@/components/feedback/skeleton';
import { useGroupChildren } from '@/hooks/use-groups';
import { formatDate, getInitials } from '@/lib/format';
import { DEFAULT_TIMEZONE, SEARCH_DEBOUNCE_MS } from '@/lib/constants';

type ChildrenData = NonNullable<ReturnType<typeof useGroupChildren>['data']>;
type Child = ChildrenData['data'][number];
type ChildStatusValue = Child['status'];

function computeAge(dateOfBirth: string): { years: number; months: number } {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (now.getDate() < dob.getDate() && months > 0) {
    months -= 1;
  }
  return { years, months };
}

type StatusBadgeVariant = 'info' | 'success' | 'neutral';

function childStatusVariant(status: ChildStatusValue): StatusBadgeVariant {
  const map: Record<ChildStatusValue, StatusBadgeVariant> = {
    card_created: 'info',
    active: 'success',
    archived: 'neutral',
  };
  return map[status];
}

interface ChildrenTabProps {
  groupId: string;
}

export default function ChildrenTab({ groupId }: ChildrenTabProps) {
  const { t } = useTranslation('groups');
  const tChildren = useTranslation('children').t;
  const navigate = useNavigate();
  const tz = DEFAULT_TIMEZONE;

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const childrenQuery = useGroupChildren(groupId);
  const allChildren = useMemo(() => childrenQuery.data?.data ?? [], [childrenQuery.data?.data]);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return allChildren;
    const q = debouncedSearch.toLowerCase();
    return allChildren.filter((c) => c.full_name.toLowerCase().includes(q));
  }, [allChildren, debouncedSearch]);

  if (childrenQuery.isPending) {
    return <SkeletonBox height={200} />;
  }

  if (childrenQuery.isError) {
    return <ErrorState onRetry={() => void childrenQuery.refetch()} />;
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
          {t('detail.children.title')}
        </div>
        <div className="relative w-[200px]">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[color:var(--text-4)]" />
          <Input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('detail.children.search_placeholder')}
            className="pl-9"
          />
        </div>
      </div>

      {allChildren.length === 0 ? (
        <div className="border-t border-[var(--line)]">
          <EmptyState title={t('detail.children.empty')} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-t border-[var(--line)]">
          <EmptyState variant="filtered" onResetFilters={() => handleSearchChange('')} />
        </div>
      ) : (
        <div className="border-t border-[var(--line)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-[12px] font-semibold text-[color:var(--text-3)]">
                <th className="w-12 px-5 py-2.5">{t('detail.children.columns.photo')}</th>
                <th className="px-5 py-2.5">{t('detail.children.columns.full_name')}</th>
                <th className="px-5 py-2.5">{t('detail.children.columns.age')}</th>
                <th className="px-5 py-2.5">{t('detail.children.columns.enrolled_at')}</th>
                <th className="px-5 py-2.5">{t('detail.children.columns.status')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((child) => {
                const age = computeAge(child.date_of_birth);
                return (
                  <tr
                    key={child.id}
                    className="cursor-pointer border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--bg-sunken)]"
                    onClick={() => navigate(`/children/${child.id}`)}
                  >
                    <td className="px-5 py-3">
                      <Avatar size="default">
                        <AvatarFallback>{getInitials(child.full_name)}</AvatarFallback>
                      </Avatar>
                    </td>
                    <td className="px-5 py-3">
                      <strong className="text-[color:var(--text-1)]">{child.full_name}</strong>
                    </td>
                    <td className="px-5 py-3 text-[13px] tabular-nums text-[color:var(--text-2)]">
                      {tChildren('age_format', { years: age.years, months: age.months })}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-[color:var(--text-2)]">
                      {child.enrollment_date ? formatDate(child.enrollment_date, tz) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={childStatusVariant(child.status)}>
                        {tChildren(`status.${child.status}`)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
