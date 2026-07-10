import { useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  SendIcon,
  PaperclipIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonLine, SkeletonBox } from '@/components/feedback/skeleton';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { FullScreenSheet } from '@/components/forms/full-screen-sheet';
import {
  useParentRequest,
  useAcceptParentRequest,
  useRejectParentRequest,
  useParentRequestMessages,
  useAddParentRequestMessage,
} from '@/hooks/use-parent-requests';
import { useChildrenList } from '@/hooks/use-children';
import { useGroups } from '@/hooks/use-groups';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useBreadcrumbLabel } from '@/hooks/use-breadcrumb-label';
import { formatDateTime, formatDate, getInitials } from '@/lib/format';
import { isAppError, toI18nKey } from '@/lib/error-map';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

type ParentRequestDto = NonNullable<ReturnType<typeof useParentRequest>['data']>;
type ParentRequestStatus = ParentRequestDto['status'];

type MessagesPage = NonNullable<
  ReturnType<typeof useParentRequestMessages>['data']
>['pages'][number];
type ParentRequestMessageDto = MessagesPage['items'][number];

const STATUS_BADGE_VARIANT: Record<
  ParentRequestStatus,
  'warning' | 'success' | 'error' | 'neutral'
> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'error',
  cancelled: 'neutral',
};

const ReviewNoteSchema = z.object({
  review_note: z.string(),
});
type ReviewNoteForm = z.infer<typeof ReviewNoteSchema>;

const MessageSchema = z.object({
  body: z.string().min(1),
});
type MessageForm = z.infer<typeof MessageSchema>;

const KNOWN_DETAIL_KEYS = [
  'full_name',
  'phone',
  'relation',
  'valid_until',
  'document',
  'period',
  'type',
  'tariff_impact',
  'reason',
  'time',
  'notes',
] as const;

export default function ParentRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('parent-requests');
  const tErrors = useTranslation('errors').t;
  const tz = DEFAULT_TIMEZONE;

  const requestQuery = useParentRequest(id ?? '');
  const messagesQuery = useParentRequestMessages(id ?? '');
  const acceptMutation = useAcceptParentRequest(id ?? '');
  const rejectMutation = useRejectParentRequest(id ?? '');
  const addMessageMutation = useAddParentRequestMessage(id ?? '');

  const childrenQuery = useChildrenList({ limit: 500, offset: 0 });
  const groupsQuery = useGroups({ archived: false });

  const childrenMap = useMemo(
    () => new Map((childrenQuery.data?.data ?? []).map((c) => [c.id, c])),
    [childrenQuery.data],
  );

  const groupsMap = useMemo(
    () => new Map((groupsQuery.data ?? []).map((g) => [g.id, g.name])),
    [groupsQuery.data],
  );

  const request = requestQuery.data;

  useBreadcrumbLabel(id, request ? t(`request_type.${request.request_type}`) : undefined);

  const allMessages = useMemo(
    () => messagesQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [messagesQuery.data],
  );

  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const acceptForm = useForm<ReviewNoteForm>({
    resolver: zodResolver(ReviewNoteSchema),
    defaultValues: { review_note: '' },
  });

  const rejectForm = useForm<ReviewNoteForm>({
    resolver: zodResolver(ReviewNoteSchema),
    defaultValues: { review_note: '' },
  });

  const messageForm = useForm<MessageForm>({
    resolver: zodResolver(MessageSchema),
    defaultValues: { body: '' },
  });
  const messageBodyValue = useWatch({ control: messageForm.control, name: 'body' });

  const handleAccept = useCallback(
    (data: ReviewNoteForm) => {
      acceptMutation.mutate(
        { review_note: data.review_note || undefined },
        {
          onSuccess: () => {
            toast.success(t('success.accepted'));
            setAcceptDialogOpen(false);
            acceptForm.reset();
          },
          onError: (error) => {
            if (isAppError(error) && error.code === 'parent_request_already_processed') {
              toast.error(t('detail.conflict.title'), {
                description: t('detail.conflict.description'),
              });
              void requestQuery.refetch();
              setAcceptDialogOpen(false);
            } else {
              toast.error(tErrors(toI18nKey(error)));
            }
            console.error(error);
          },
        },
      );
    },
    [acceptMutation, acceptForm, t, tErrors, requestQuery],
  );

  const handleReject = useCallback(
    (data: ReviewNoteForm) => {
      rejectMutation.mutate(
        { review_note: data.review_note || undefined },
        {
          onSuccess: () => {
            toast.success(t('success.rejected'));
            setRejectDialogOpen(false);
            rejectForm.reset();
          },
          onError: (error) => {
            if (isAppError(error) && error.code === 'parent_request_already_processed') {
              toast.error(t('detail.conflict.title'), {
                description: t('detail.conflict.description'),
              });
              void requestQuery.refetch();
              setRejectDialogOpen(false);
            } else {
              toast.error(tErrors(toI18nKey(error)));
            }
            console.error(error);
          },
        },
      );
    },
    [rejectMutation, rejectForm, t, tErrors, requestQuery],
  );

  const handleSendMessage = useCallback(
    (data: MessageForm) => {
      addMessageMutation.mutate(
        { body: data.body },
        {
          onSuccess: () => {
            toast.success(t('success.message_sent'));
            messageForm.reset();
          },
          onError: (error) => {
            toast.error(tErrors(toI18nKey(error)));
            console.error(error);
          },
        },
      );
    },
    [addMessageMutation, messageForm, t, tErrors],
  );

  const { isMobile } = useBreakpoint();

  if (requestQuery.isPending) {
    if (isMobile) {
      return (
        <div className="flex flex-col gap-4">
          <SkeletonLine width={200} height={14} />
          <SkeletonBox height={100} />
          <SkeletonBox height={200} />
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <SkeletonLine width={200} height={14} />
        <SkeletonBox height={40} />
        <div className="grid grid-cols-[1fr_320px] gap-[22px]">
          <div className="flex flex-col gap-4">
            <SkeletonBox height={200} />
            <SkeletonBox height={300} />
          </div>
          <div className="flex flex-col gap-4">
            <SkeletonBox height={80} />
            <SkeletonBox height={80} />
          </div>
        </div>
      </div>
    );
  }

  if (requestQuery.isError || !request) {
    return <ErrorState title={t('detail.not_found')} onRetry={() => requestQuery.refetch()} />;
  }

  const isPending = request.status === 'pending';
  const child = childrenMap.get(request.child_id);
  const childGroup = child?.current_group_id ? groupsMap.get(child.current_group_id) : null;

  if (isMobile) {
    return (
      <>
        <MobileTopBar
          back
          title={t(`request_type.${request.request_type}`)}
          sub={formatDateTime(request.created_at, tz)}
        />

        <div className="flex flex-col gap-4 px-4 pt-2 pb-6">
          {/* Status + requester */}
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_BADGE_VARIANT[request.status]} dot>
              {t(`status.${request.status}`)}
            </Badge>
            <span className="text-[12px] text-[color:var(--text-3)]">
              {t('detail.requester')}: {t('thread.author_parent')}
            </span>
          </div>

          {/* Action buttons for pending */}
          {isPending && (
            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => setRejectDialogOpen(true)}
              >
                <XCircleIcon className="size-4" />
                {t('detail.actions.reject')}
              </Button>
              <Button className="flex-1" onClick={() => setAcceptDialogOpen(true)}>
                <CheckCircleIcon className="size-4" />
                {t('detail.actions.accept')}
              </Button>
            </div>
          )}

          {/* Request details */}
          <div className="m-card flush">
            <div className="px-4 pt-3 pb-2 text-[15px] font-semibold text-[color:var(--text-1)]">
              {t('detail.request_info')}
            </div>
            <div className="mx-4 mb-3 rounded-[10px] bg-[var(--bg-sunken)] p-3">
              <div className="text-[12px] text-[color:var(--text-3)]">
                {t('detail.description_label')}
              </div>
              <div className="mt-1 text-[14px] leading-relaxed text-[color:var(--text-1)]">
                {getDescriptionFromDetails(request)}
              </div>
            </div>

            {request.request_type === 'late_pickup' && (
              <div className="mx-4 mb-3 flex gap-2.5 rounded-[var(--r-md)] border border-[color-mix(in_oklab,var(--warning)_20%,transparent)] bg-[var(--warning-soft)] p-3 text-[13px] text-[color:var(--warning-fg)]">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                <div>
                  <div className="font-semibold">{t('detail.late_pickup_banner_title')}</div>
                  <div className="mt-0.5">{t('detail.late_pickup_note')}</div>
                </div>
              </div>
            )}

            <MobileRequestDetailsGrid request={request} t={t} tz={tz} />

            {(request.date_from ?? request.date_to) && (
              <div className="mx-4 mb-3">
                {request.date_from && (
                  <div className="m-kv">
                    <span className="k">{t('detail.date_from')}</span>
                    <span className="v">{formatDate(request.date_from, tz)}</span>
                  </div>
                )}
                {request.date_to && (
                  <div className="m-kv">
                    <span className="k">{t('detail.date_to')}</span>
                    <span className="v">{formatDate(request.date_to, tz)}</span>
                  </div>
                )}
              </div>
            )}

            {request.reviewed_at && (
              <div className="mx-4 mb-3 border-t border-[var(--line)] pt-3">
                <div className="m-kv">
                  <span className="k">{t('detail.reviewed_at')}</span>
                  <span className="v">{formatDateTime(request.reviewed_at, tz)}</span>
                </div>
                {request.review_note && (
                  <div className="m-kv">
                    <span className="k">{t('detail.review_note_label')}</span>
                    <span className="v">{request.review_note}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Child card */}
          <div className="m-card flush">
            <div className="px-4 pt-3 pb-2 text-[15px] font-semibold text-[color:var(--text-1)]">
              {t('detail.child_card')}
            </div>
            <Link to={`/children/${request.child_id}`} className="m-list-row">
              <div className="m-avatar guardian">{child ? getInitials(child.full_name) : '?'}</div>
              <div className="min-w-0 flex-1">
                <div className="m-row-title truncate">
                  {child?.full_name ?? request.child_id.slice(0, 8)}
                </div>
                <div className="m-row-sub">{childGroup ?? t('no_data')}</div>
              </div>
              <ChevronRightIcon className="size-4 shrink-0 text-[color:var(--text-4)]" />
            </Link>
          </div>

          {/* Recipient */}
          <div className="m-card flush">
            <div className="px-4 pt-3 pb-2 text-[15px] font-semibold text-[color:var(--text-1)]">
              {t('detail.recipient_card')}
            </div>
            <div className="px-4 pb-3 text-[13px] text-[color:var(--text-1)]">
              {request.recipient_type
                ? t(`recipient_type.${request.recipient_type}`)
                : t('no_data')}
            </div>
          </div>

          {/* Thread */}
          <div className="m-card flush">
            <div className="px-4 pt-3 pb-2 text-[15px] font-semibold text-[color:var(--text-1)]">
              {t('thread.title')}
            </div>

            <div className="flex flex-col gap-3 px-4 pb-3">
              {messagesQuery.hasNextPage && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={messagesQuery.isFetchingNextPage}
                    onClick={() => void messagesQuery.fetchNextPage()}
                  >
                    {t('thread.load_more')}
                  </Button>
                </div>
              )}
              {allMessages.length === 0 && !messagesQuery.isPending && (
                <div className="py-6 text-center text-[13px] text-[color:var(--text-4)]">
                  {t('thread.empty')}
                </div>
              )}
              {allMessages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} t={t} tz={tz} />
              ))}
            </div>

            <form
              onSubmit={messageForm.handleSubmit(handleSendMessage)}
              className="flex items-center gap-2 border-t border-[var(--line)] px-4 py-3"
            >
              <Input
                {...messageForm.register('body')}
                placeholder={t('thread.input_placeholder')}
                className="flex-1"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!messageBodyValue.trim() || addMessageMutation.isPending}
              >
                <SendIcon className="size-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Accept sheet */}
        <FullScreenSheet
          open={acceptDialogOpen}
          onOpenChange={(open) => {
            setAcceptDialogOpen(open);
            if (!open) acceptForm.reset();
          }}
          title={t('detail.actions.accept')}
          sub={t(`request_type.${request.request_type}`)}
          description={t('detail.actions.accept')}
          footer={
            <Button
              className="w-full"
              disabled={acceptMutation.isPending}
              onClick={acceptForm.handleSubmit(handleAccept)}
            >
              <CheckCircleIcon className="size-4" />
              {t('detail.actions.accept')}
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            {request.request_type === 'late_pickup' && (
              <div className="flex gap-2.5 rounded-[var(--r-md)] border border-[color-mix(in_oklab,var(--warning)_20%,transparent)] bg-[var(--warning-soft)] p-3 text-[13px] text-[color:var(--warning-fg)]">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                <div>{t('detail.late_pickup_note')}</div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('detail.review_note_label')}
              </label>
              <Textarea
                {...acceptForm.register('review_note')}
                rows={3}
                placeholder={t('detail.review_note_placeholder')}
                className="min-h-[80px] resize-y border-[var(--border)] bg-[var(--bg-elev)] text-[14px] text-[color:var(--text-1)] placeholder:text-[color:var(--text-4)] focus:border-[var(--primary)] focus:shadow-[var(--focus-ring)]"
              />
            </div>
          </div>
        </FullScreenSheet>

        {/* Reject sheet */}
        <FullScreenSheet
          open={rejectDialogOpen}
          onOpenChange={(open) => {
            setRejectDialogOpen(open);
            if (!open) rejectForm.reset();
          }}
          title={t('detail.actions.reject')}
          sub={t(`request_type.${request.request_type}`)}
          description={t('detail.actions.reject')}
          footer={
            <Button
              className="w-full"
              variant="destructive"
              disabled={rejectMutation.isPending}
              onClick={rejectForm.handleSubmit(handleReject)}
            >
              <XCircleIcon className="size-4" />
              {t('detail.actions.reject')}
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('detail.review_note_label')}
              </label>
              <Textarea
                {...rejectForm.register('review_note')}
                rows={3}
                placeholder={t('detail.review_note_placeholder')}
                className="min-h-[80px] resize-y border-[var(--border)] bg-[var(--bg-elev)] text-[14px] text-[color:var(--text-1)] placeholder:text-[color:var(--text-4)] focus:border-[var(--primary)] focus:shadow-[var(--focus-ring)]"
              />
            </div>
          </div>
        </FullScreenSheet>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-[14px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-[color:var(--text-3)]">
        <Link to="/parent-requests" className="hover:text-[color:var(--primary)]">
          {t('detail.breadcrumb')}
        </Link>
        <ChevronRightIcon className="size-3 text-[color:var(--text-4)]" />
        <span className="text-[color:var(--text-1)]">
          {t(`request_type.${request.request_type}`)}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight text-[color:var(--text-1)]">
            {t(`request_type.${request.request_type}`)}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={STATUS_BADGE_VARIANT[request.status]} dot>
              {t(`status.${request.status}`)}
            </Badge>
            <span className="text-[12px] text-[color:var(--text-3)]">
              {t('detail.requester')}:{' '}
              <strong className="text-[color:var(--text-2)]">{t('thread.author_parent')}</strong>
            </span>
            <span className="size-1 rounded-full bg-[var(--text-4)]" />
            <span className="text-[12px] text-[color:var(--text-3)]">
              {formatDateTime(request.created_at, tz)}
            </span>
          </div>
        </div>
        {isPending && (
          <ActionButtons
            t={t}
            onAccept={() => setAcceptDialogOpen(true)}
            onReject={() => setRejectDialogOpen(true)}
          />
        )}
        {!isPending && <DisabledActionButtons t={t} />}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[1fr_320px] gap-[22px]">
        {/* LEFT column */}
        <div className="flex flex-col gap-4">
          {/* Request details card */}
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shyraq-shadow-1)]">
            <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
              {t('detail.request_info')}
            </div>

            {/* Description block */}
            <div className="mt-3 rounded-[10px] bg-[var(--bg-sunken)] p-3.5">
              <div className="text-[12px] text-[color:var(--text-3)]">
                {t('detail.description_label')}
              </div>
              <div className="mt-1.5 text-[14px] leading-relaxed text-[color:var(--text-1)]">
                {getDescriptionFromDetails(request)}
              </div>
            </div>

            {/* Late pickup banner */}
            {request.request_type === 'late_pickup' && (
              <div className="mt-3 flex gap-2.5 rounded-[var(--r-md)] border border-[color-mix(in_oklab,var(--warning)_20%,transparent)] bg-[var(--warning-soft)] p-3 text-[13px] text-[color:var(--warning-fg)]">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                <div>
                  <div className="font-semibold">{t('detail.late_pickup_banner_title')}</div>
                  <div className="mt-0.5">{t('detail.late_pickup_note')}</div>
                </div>
              </div>
            )}

            {/* Type-specific details */}
            <RequestDetailsGrid request={request} t={t} tz={tz} />

            {/* Date range if present */}
            {(request.date_from ?? request.date_to) && (
              <div className="mt-3 grid grid-cols-[160px_1fr] gap-x-4 gap-y-2 text-[13.5px]">
                {request.date_from && (
                  <>
                    <div className="text-[color:var(--text-3)]">{t('detail.date_from')}</div>
                    <div className="font-semibold text-[color:var(--text-1)]">
                      {formatDate(request.date_from, tz)}
                    </div>
                  </>
                )}
                {request.date_to && (
                  <>
                    <div className="text-[color:var(--text-3)]">{t('detail.date_to')}</div>
                    <div className="font-semibold text-[color:var(--text-1)]">
                      {formatDate(request.date_to, tz)}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Review info if already reviewed */}
            {request.reviewed_at && (
              <div className="mt-4 border-t border-[var(--line)] pt-3">
                <div className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-2 text-[13.5px]">
                  <div className="text-[color:var(--text-3)]">{t('detail.reviewed_at')}</div>
                  <div className="text-[color:var(--text-1)]">
                    {formatDateTime(request.reviewed_at, tz)}
                  </div>
                  {request.review_note && (
                    <>
                      <div className="text-[color:var(--text-3)]">
                        {t('detail.review_note_label')}
                      </div>
                      <div className="text-[color:var(--text-1)]">{request.review_note}</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Thread card */}
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
            <div className="border-b border-[var(--line)] px-5 py-3">
              <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
                {t('thread.title')}
              </div>
            </div>

            {/* Messages */}
            <div className="flex flex-col gap-3 p-5">
              {messagesQuery.hasNextPage && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={messagesQuery.isFetchingNextPage}
                    onClick={() => void messagesQuery.fetchNextPage()}
                  >
                    {t('thread.load_more')}
                  </Button>
                </div>
              )}
              {allMessages.length === 0 && !messagesQuery.isPending && (
                <div className="py-6 text-center text-[13px] text-[color:var(--text-4)]">
                  {t('thread.empty')}
                </div>
              )}
              {allMessages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} t={t} tz={tz} />
              ))}
            </div>

            {/* Composer */}
            <form
              onSubmit={messageForm.handleSubmit(handleSendMessage)}
              className="flex items-center gap-2 border-t border-[var(--line)] px-5 py-3"
            >
              <Input
                {...messageForm.register('body')}
                placeholder={t('thread.input_placeholder')}
                className="flex-1"
              />
              <Button type="button" variant="ghost" size="icon" disabled>
                <PaperclipIcon className="size-4" />
              </Button>
              <Button
                type="submit"
                disabled={!messageBodyValue.trim() || addMessageMutation.isPending}
              >
                <SendIcon className="size-4" />
                {t('thread.send')}
              </Button>
            </form>
          </div>
        </div>

        {/* RIGHT column */}
        <div className="flex flex-col gap-4">
          {/* Child card */}
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4 shadow-[var(--shyraq-shadow-1)]">
            <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
              {t('detail.child_card')}
            </div>
            <Link
              to={`/children/${request.child_id}`}
              className="mt-3 flex items-center gap-3 rounded-[var(--r-md)] p-1.5 -mx-1.5 hover:bg-[var(--bg-sunken)] transition-colors"
            >
              <Avatar size="default">
                <AvatarFallback>{child ? getInitials(child.full_name) : '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="truncate font-semibold text-[color:var(--text-1)]">
                  {child?.full_name ?? request.child_id.slice(0, 8)}
                </div>
                <div className="text-[12px] text-[color:var(--text-3)]">
                  {childGroup ?? t('no_data')}
                </div>
              </div>
              <ChevronRightIcon className="size-3.5 shrink-0 text-[color:var(--text-4)]" />
            </Link>
          </div>

          {/* Recipient card */}
          <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4 shadow-[var(--shyraq-shadow-1)]">
            <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
              {t('detail.recipient_card')}
            </div>
            <div className="mt-3 text-[13px] text-[color:var(--text-1)]">
              {request.recipient_type
                ? t(`recipient_type.${request.recipient_type}`)
                : t('no_data')}
            </div>
            <div className="mt-2 text-[12px] text-[color:var(--text-3)]">
              {t('detail.recipient_card_note')}
            </div>
          </div>
        </div>
      </div>

      {/* Accept dialog */}
      <Dialog
        open={acceptDialogOpen}
        onOpenChange={(open) => {
          setAcceptDialogOpen(open);
          if (!open) acceptForm.reset();
        }}
      >
        <DialogContent className="sm:max-w-[440px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
          <DialogHeader className="px-[22px] pt-[18px] pb-3">
            <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('detail.actions.accept')}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
              {t(`request_type.${request.request_type}`)}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={acceptForm.handleSubmit(handleAccept)}
            className="flex flex-col gap-4 px-[22px] pb-[18px]"
          >
            {request.request_type === 'late_pickup' && (
              <div className="flex gap-2.5 rounded-[var(--r-md)] border border-[color-mix(in_oklab,var(--warning)_20%,transparent)] bg-[var(--warning-soft)] p-3 text-[13px] text-[color:var(--warning-fg)]">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                <div>{t('detail.late_pickup_note')}</div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('detail.review_note_label')}
              </label>
              <Textarea
                {...acceptForm.register('review_note')}
                rows={3}
                placeholder={t('detail.review_note_placeholder')}
                className="min-h-[80px] resize-y border-[var(--border)] bg-[var(--bg-elev)] text-[14px] text-[color:var(--text-1)] placeholder:text-[color:var(--text-4)] focus:border-[var(--primary)] focus:shadow-[var(--focus-ring)]"
              />
            </div>
            <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAcceptDialogOpen(false)}
                className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
              >
                {t('detail.actions.cancel')}
              </Button>
              <Button type="submit" disabled={acceptMutation.isPending}>
                <CheckCircleIcon className="size-4" />
                {t('detail.actions.accept')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          setRejectDialogOpen(open);
          if (!open) rejectForm.reset();
        }}
      >
        <DialogContent className="sm:max-w-[440px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
          <DialogHeader className="px-[22px] pt-[18px] pb-3">
            <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {t('detail.actions.reject')}
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
              {t(`request_type.${request.request_type}`)}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={rejectForm.handleSubmit(handleReject)}
            className="flex flex-col gap-4 px-[22px] pb-[18px]"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('detail.review_note_label')}
              </label>
              <Textarea
                {...rejectForm.register('review_note')}
                rows={3}
                placeholder={t('detail.review_note_placeholder')}
                className="min-h-[80px] resize-y border-[var(--border)] bg-[var(--bg-elev)] text-[14px] text-[color:var(--text-1)] placeholder:text-[color:var(--text-4)] focus:border-[var(--primary)] focus:shadow-[var(--focus-ring)]"
              />
            </div>
            <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectDialogOpen(false)}
                className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
              >
                {t('detail.actions.cancel')}
              </Button>
              <Button type="submit" variant="destructive" disabled={rejectMutation.isPending}>
                <XCircleIcon className="size-4" />
                {t('detail.actions.reject')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionButtons({
  t,
  onAccept,
  onReject,
}: {
  t: (key: string) => string;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={onReject}>
        <XCircleIcon className="size-4" />
        {t('detail.actions.reject')}
      </Button>
      <Button onClick={onAccept}>
        <CheckCircleIcon className="size-4" />
        {t('detail.actions.accept')}
      </Button>
    </div>
  );
}

function DisabledActionButtons({ t }: { t: (key: string) => string }) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex">
              <Button variant="outline" disabled className="pointer-events-none">
                <XCircleIcon className="size-4" />
                {t('detail.actions.reject')}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{t('detail.accept_disabled')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex">
              <Button disabled className="pointer-events-none">
                <CheckCircleIcon className="size-4" />
                {t('detail.actions.accept')}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{t('detail.accept_disabled')}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

function getDescriptionFromDetails(request: ParentRequestDto): string {
  const details = request.details;
  if (typeof details.description === 'string') return details.description;
  if (typeof details.comment === 'string') return details.comment;
  if (typeof details.reason === 'string') return details.reason;
  if (typeof details.notes === 'string') return details.notes;
  if (typeof details.body === 'string') return details.body;
  return '—';
}

function RequestDetailsGrid({
  request,
  t,
  tz,
}: {
  request: ParentRequestDto;
  t: (key: string) => string;
  tz: string;
}) {
  const entries = Object.entries(request.details).filter(
    ([key]) => !['description', 'comment', 'body'].includes(key),
  );

  if (entries.length === 0) return null;

  return (
    <div className="mt-3 grid grid-cols-[160px_1fr] gap-x-4 gap-y-2 text-[13.5px]">
      {entries.map(([key, value]) => (
        <DetailRow key={key} detailKey={key} value={value} t={t} tz={tz} />
      ))}
    </div>
  );
}

function MobileRequestDetailsGrid({
  request,
  t,
  tz,
}: {
  request: ParentRequestDto;
  t: (key: string) => string;
  tz: string;
}) {
  const entries = Object.entries(request.details).filter(
    ([key]) => !['description', 'comment', 'body'].includes(key),
  );

  if (entries.length === 0) return null;

  return (
    <div className="mx-4 mb-3">
      {entries.map(([key, value]) => {
        const isKnownKey = (KNOWN_DETAIL_KEYS as readonly string[]).includes(key);
        const label = isKnownKey ? t(`detail.detail_keys.${key}`) : key.replace(/_/g, ' ');
        return (
          <div key={key} className="m-kv">
            <span className="k">{label}</span>
            <span className="v">{formatDetailValue(value, tz)}</span>
          </div>
        );
      })}
    </div>
  );
}

function DetailRow({
  detailKey,
  value,
  t,
  tz,
}: {
  detailKey: string;
  value: unknown;
  t: (key: string) => string;
  tz: string;
}) {
  const isKnownKey = (KNOWN_DETAIL_KEYS as readonly string[]).includes(detailKey);
  const label = isKnownKey ? t(`detail.detail_keys.${detailKey}`) : detailKey.replace(/_/g, ' ');

  const formattedValue = formatDetailValue(value, tz);

  return (
    <>
      <div className="text-[color:var(--text-3)]">{label}</div>
      <div className="font-semibold text-[color:var(--text-1)]">{formattedValue}</div>
    </>
  );
}

function formatDetailValue(value: unknown, tz: string): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value, tz);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value, tz);
    return value;
  }
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '+' : '-';
  return JSON.stringify(value);
}

function MessageBubble({
  message,
  t,
  tz,
}: {
  message: ParentRequestMessageDto;
  t: (key: string) => string;
  tz: string;
}) {
  const isStaff = !!message.author_staff_id;
  const authorLabel = isStaff
    ? t('thread.author_staff')
    : message.author_user_id
      ? t('thread.author_parent')
      : t('thread.author_unknown');

  return (
    <div className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-[var(--r-lg)] p-3 ${
          isStaff
            ? 'bg-[var(--primary-soft)] text-[color:var(--text-1)]'
            : 'bg-[var(--bg-sunken)] text-[color:var(--text-1)]'
        }`}
      >
        <div className="mb-1 text-[11px] font-semibold text-[color:var(--text-3)]">
          {authorLabel} · {formatDateTime(message.created_at, tz)}
        </div>
        <div className="text-[14px] leading-relaxed">{message.body}</div>
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.attachments.map((att, i) => (
              <a
                key={i}
                href={att}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-[var(--r-sm)] bg-[var(--bg-elev)] px-2 py-0.5 text-[11px] text-[color:var(--primary)] hover:underline"
              >
                <PaperclipIcon className="size-3" />
                {t('thread.attachments')} {i + 1}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
