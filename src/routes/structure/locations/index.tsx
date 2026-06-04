import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  PlusIcon,
  BuildingIcon,
  ChevronRightIcon,
  InfoIcon,
  PencilIcon,
  Trash2Icon,
  CameraIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonTableRow } from '@/components/feedback/skeleton';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import {
  useLocations,
  useCreateLocation,
  useUpdateLocation,
  useArchiveLocation,
} from '@/hooks/use-locations';
import {
  useCameras,
  useCreateCamera,
  useUpdateCamera,
  useArchiveCamera,
} from '@/hooks/use-cameras';
import { useGroups } from '@/hooks/use-groups';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { toI18nKey, isAppError } from '@/lib/error-map';
import { resolveJsonbI18n, type JsonbI18n } from '@/lib/jsonb-i18n';
import { useUiStore } from '@/stores/ui-store';

type Location = NonNullable<ReturnType<typeof useLocations>['data']>[number];
type Camera = NonNullable<ReturnType<typeof useCameras>['data']>[number];

const LocationFormSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});
type LocationFormValues = z.infer<typeof LocationFormSchema>;

const CameraFormSchema = z.object({
  name: z.string().min(1),
  location_id: z.string().min(1),
  rtsp_url: z.string().optional(),
  hls_url: z.string().optional(),
});
type CameraFormValues = z.infer<typeof CameraFormSchema>;

function resolveDescription(desc: unknown, locale: 'ru' | 'kk'): string {
  if (desc == null) return '';
  if (typeof desc === 'string') return desc;
  if (typeof desc === 'object') return resolveJsonbI18n(desc as JsonbI18n, locale);
  return '';
}

export default function StructureLocationsPage() {
  const { t } = useTranslation('structure');
  const { isMobile } = useBreakpoint();
  const location = useLocation();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'locations' | 'cameras'>(
    location.pathname.includes('/structure/cameras') ? 'cameras' : 'locations',
  );

  const locationsQuery = useLocations();
  const camerasQuery = useCameras();
  const groupsQuery = useGroups();

  const locations = locationsQuery.data ?? [];
  const cameras = camerasQuery.data ?? [];
  const groups = groupsQuery.data ?? [];

  const activeLocations = locations.filter((l) => !l.archived_at);
  const activeCameras = cameras.filter((c) => !c.archived_at);

  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [archivingLocationId, setArchivingLocationId] = useState<string | null>(null);

  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [archivingCameraId, setArchivingCameraId] = useState<string | null>(null);

  function switchTab(next: 'locations' | 'cameras') {
    setTab(next);
    const target = next === 'cameras' ? '/structure/cameras' : '/structure/locations';
    if (location.pathname !== target) {
      navigate(target, { replace: true });
    }
  }

  function handleAddClick() {
    if (tab === 'locations') {
      setEditingLocation(null);
      setLocationDialogOpen(true);
    } else {
      setEditingCamera(null);
      setCameraDialogOpen(true);
    }
  }

  if (isMobile) {
    return (
      <MobileView
        tab={tab}
        switchTab={switchTab}
        locations={activeLocations}
        cameras={activeCameras}
        groups={groups}
        isLoading={locationsQuery.isLoading || camerasQuery.isLoading}
        isError={locationsQuery.isError || camerasQuery.isError}
        onRetry={() => {
          void locationsQuery.refetch();
          void camerasQuery.refetch();
        }}
        onAdd={handleAddClick}
        onEditLocation={(loc) => {
          setEditingLocation(loc);
          setLocationDialogOpen(true);
        }}
        onEditCamera={(cam) => {
          setEditingCamera(cam);
          setCameraDialogOpen(true);
        }}
        locationDialogOpen={locationDialogOpen}
        setLocationDialogOpen={setLocationDialogOpen}
        editingLocation={editingLocation}
        cameraDialogOpen={cameraDialogOpen}
        setCameraDialogOpen={setCameraDialogOpen}
        editingCamera={editingCamera}
        allLocations={activeLocations}
      />
    );
  }

  return (
    <div className="page">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {t('page_title')}
          </h1>
          <div className="mt-0.5 text-[13px] text-[color:var(--text-3)]">{t('page_sub')}</div>
        </div>
        <Button onClick={handleAddClick}>
          <PlusIcon className="mr-1.5 size-4" />
          {tab === 'locations' ? t('add_location') : t('add_camera')}
        </Button>
      </div>

      <div className="mt-5 flex gap-1 rounded-[var(--r-lg)] bg-[var(--bg-sunken)] p-1">
        <button
          type="button"
          className={`flex-1 rounded-[var(--r-md)] px-4 py-1.5 text-[13px] font-semibold transition-colors ${
            tab === 'locations'
              ? 'bg-[var(--bg-elev)] text-[color:var(--text-1)] shadow-sm'
              : 'text-[color:var(--text-3)] hover:text-[color:var(--text-2)]'
          }`}
          onClick={() => switchTab('locations')}
        >
          {t('tab_locations')}
          <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-[var(--bg-sunken)] px-1.5 text-[10px]">
            {activeLocations.length}
          </span>
        </button>
        <button
          type="button"
          className={`flex-1 rounded-[var(--r-md)] px-4 py-1.5 text-[13px] font-semibold transition-colors ${
            tab === 'cameras'
              ? 'bg-[var(--bg-elev)] text-[color:var(--text-1)] shadow-sm'
              : 'text-[color:var(--text-3)] hover:text-[color:var(--text-2)]'
          }`}
          onClick={() => switchTab('cameras')}
        >
          {t('tab_cameras')}
          <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-[var(--bg-sunken)] px-1.5 text-[10px]">
            {activeCameras.length}
          </span>
        </button>
      </div>

      <div className="mt-4">
        {tab === 'locations' ? (
          <LocationsTab
            locations={activeLocations}
            cameras={activeCameras}
            groups={groups}
            isLoading={locationsQuery.isLoading}
            isError={locationsQuery.isError}
            onRetry={() => void locationsQuery.refetch()}
            onEdit={(loc) => {
              setEditingLocation(loc);
              setLocationDialogOpen(true);
            }}
            onArchive={setArchivingLocationId}
          />
        ) : (
          <CamerasTab
            locations={activeLocations}
            cameras={activeCameras}
            isLoading={camerasQuery.isLoading}
            isError={camerasQuery.isError}
            onRetry={() => void camerasQuery.refetch()}
            onEdit={(cam) => {
              setEditingCamera(cam);
              setCameraDialogOpen(true);
            }}
            onArchive={setArchivingCameraId}
          />
        )}
      </div>

      <LocationDialog
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
        location={editingLocation}
      />

      <CameraDialog
        open={cameraDialogOpen}
        onOpenChange={setCameraDialogOpen}
        camera={editingCamera}
        locations={activeLocations}
      />

      <ArchiveLocationConfirm
        locationId={archivingLocationId}
        onClose={() => setArchivingLocationId(null)}
      />

      <ArchiveCameraConfirm
        cameraId={archivingCameraId}
        onClose={() => setArchivingCameraId(null)}
      />
    </div>
  );
}

function LocationsTab({
  locations,
  cameras,
  groups,
  isLoading,
  isError,
  onRetry,
  onEdit,
  onArchive,
}: {
  locations: Location[];
  cameras: Camera[];
  groups: { id: string; current_location_id: string | null }[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onEdit: (loc: Location) => void;
  onArchive: (id: string) => void;
}) {
  const { t } = useTranslation('structure');
  const locale = useUiStore((s) => s.locale);

  if (isError) return <ErrorState onRetry={onRetry} />;

  if (isLoading) {
    return (
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)]">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonTableRow key={i} columns={5} />
        ))}
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <EmptyState
        icon={<BuildingIcon className="size-9 text-[color:var(--text-4)]" />}
        title={t('no_locations')}
        text={t('no_locations_text')}
      />
    );
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
      <Table>
        <TableHeader>
          <TableRow className="border-[var(--line)]">
            <TableHead className="text-[12px] font-semibold text-[color:var(--text-3)]">
              {t('col_name')}
            </TableHead>
            <TableHead className="text-[12px] font-semibold text-[color:var(--text-3)]">
              {t('col_description')}
            </TableHead>
            <TableHead className="text-right text-[12px] font-semibold text-[color:var(--text-3)]">
              {t('col_groups')}
            </TableHead>
            <TableHead className="text-right text-[12px] font-semibold text-[color:var(--text-3)]">
              {t('col_cameras')}
            </TableHead>
            <TableHead className="w-[80px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.map((loc) => {
            const groupCount = groups.filter((g) => g.current_location_id === loc.id).length;
            const camCount = cameras.filter((c) => c.location_id === loc.id).length;
            const desc = resolveDescription(loc.description, locale);

            return (
              <TableRow key={loc.id} className="border-[var(--line)]">
                <TableCell className="text-[14px] font-semibold text-[color:var(--text-1)]">
                  {loc.name}
                </TableCell>
                <TableCell className="text-[13px] text-[color:var(--text-3)]">
                  {desc || '—'}
                </TableCell>
                <TableCell className="text-right text-[14px] text-[color:var(--text-2)]">
                  {groupCount}
                </TableCell>
                <TableCell className="text-right text-[14px] text-[color:var(--text-2)]">
                  {camCount}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      className="rounded-[var(--r-md)] p-1.5 text-[color:var(--text-3)] hover:bg-[var(--bg-sunken)] hover:text-[color:var(--text-1)]"
                      onClick={() => onEdit(loc)}
                    >
                      <PencilIcon className="size-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-[var(--r-md)] p-1.5 text-[color:var(--text-3)] hover:bg-[var(--danger-soft)] hover:text-[color:var(--danger)]"
                      onClick={() => onArchive(loc.id)}
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function CamerasTab({
  locations,
  cameras,
  isLoading,
  isError,
  onRetry,
  onEdit,
  onArchive,
}: {
  locations: Location[];
  cameras: Camera[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onEdit: (cam: Camera) => void;
  onArchive: (id: string) => void;
}) {
  const { t } = useTranslation('structure');
  const locale = useUiStore((s) => s.locale);

  if (isError) return <ErrorState onRetry={onRetry} />;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 2 }, (_, i) => (
          <div
            key={i}
            className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-4"
          >
            <SkeletonTableRow columns={4} />
            <SkeletonTableRow columns={4} />
          </div>
        ))}
      </div>
    );
  }

  if (cameras.length === 0) {
    return (
      <EmptyState
        icon={<CameraIcon className="size-9 text-[color:var(--text-4)]" />}
        title={t('no_cameras')}
        text={t('no_cameras_text')}
      />
    );
  }

  const locationsWithCameras = locations.filter((l) => cameras.some((c) => c.location_id === l.id));

  const unassignedCameras = cameras.filter((c) => !locations.some((l) => l.id === c.location_id));

  return (
    <div className="flex flex-col gap-4">
      {locationsWithCameras.map((loc) => {
        const locCameras = cameras.filter((c) => c.location_id === loc.id);
        const desc = resolveDescription(loc.description, locale);

        return (
          <div
            key={loc.id}
            className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]"
          >
            <div className="border-b border-[var(--line)] px-4 py-3">
              <div className="text-[15px] font-bold text-[color:var(--text-1)]">{loc.name}</div>
              {desc && <div className="mt-0.5 text-[13px] text-[color:var(--text-3)]">{desc}</div>}
            </div>
            <CameraTable cameras={locCameras} onEdit={onEdit} onArchive={onArchive} />
          </div>
        );
      })}

      {unassignedCameras.length > 0 && (
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shyraq-shadow-1)]">
          <div className="border-b border-[var(--line)] px-4 py-3">
            <div className="text-[15px] font-bold text-[color:var(--text-3)]">
              {t('unassigned_location')}
            </div>
          </div>
          <CameraTable cameras={unassignedCameras} onEdit={onEdit} onArchive={onArchive} />
        </div>
      )}

      <div className="flex items-start gap-2.5 rounded-[var(--r-lg)] border border-[color-mix(in_oklab,var(--info)_20%,transparent)] bg-[var(--info-soft)] p-3.5 text-[12.5px] text-[color:var(--info-fg)]">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        <span>{t('camera_test_banner')}</span>
      </div>
    </div>
  );
}

function CameraTable({
  cameras,
  onEdit,
  onArchive,
}: {
  cameras: Camera[];
  onEdit: (cam: Camera) => void;
  onArchive: (id: string) => void;
}) {
  const { t } = useTranslation('structure');

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[var(--line)]">
          <TableHead className="text-[12px] font-semibold text-[color:var(--text-3)]">
            {t('col_name')}
          </TableHead>
          <TableHead className="text-[12px] font-semibold text-[color:var(--text-3)]">
            {t('col_stream_url')}
          </TableHead>
          <TableHead className="text-[12px] font-semibold text-[color:var(--text-3)]">
            {t('col_status')}
          </TableHead>
          <TableHead className="w-[200px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {cameras.map((cam) => (
          <TableRow key={cam.id} className="border-[var(--line)]">
            <TableCell>
              <div className="flex items-center gap-2">
                <CameraIcon className="size-4 text-[color:var(--text-3)]" />
                <span className="text-[14px] font-semibold text-[color:var(--text-1)]">
                  {cam.name}
                </span>
              </div>
            </TableCell>
            <TableCell className="font-mono text-[13px] text-[color:var(--text-3)]">
              {cam.rtsp_url || cam.hls_url || '—'}
            </TableCell>
            <TableCell>
              {cam.is_active ? (
                <Badge variant="success">{t('camera_active')}</Badge>
              ) : (
                <Badge variant="neutral">{t('camera_inactive')}</Badge>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button size="sm" variant="outline" disabled className="text-[12px]">
                          {t('camera_test')}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{t('camera_test_tooltip')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <button
                  type="button"
                  className="rounded-[var(--r-md)] p-1.5 text-[color:var(--text-3)] hover:bg-[var(--bg-sunken)] hover:text-[color:var(--text-1)]"
                  onClick={() => onEdit(cam)}
                >
                  <PencilIcon className="size-4" />
                </button>
                <button
                  type="button"
                  className="rounded-[var(--r-md)] p-1.5 text-[color:var(--text-3)] hover:bg-[var(--danger-soft)] hover:text-[color:var(--danger)]"
                  onClick={() => onArchive(cam.id)}
                >
                  <Trash2Icon className="size-4" />
                </button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function LocationDialog({
  open,
  onOpenChange,
  location: editLoc,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location | null;
}) {
  const { t } = useTranslation('structure');
  const tErrors = useTranslation('errors').t;
  const tCommon = useTranslation('common').t;
  const locale = useUiStore((s) => s.locale);
  const isEdit = !!editLoc;

  const createMutation = useCreateLocation();
  const updateMutation = useUpdateLocation(editLoc?.id ?? '');

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(LocationFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
    values: editLoc
      ? {
          name: editLoc.name,
          description: resolveDescription(editLoc.description, locale),
        }
      : undefined,
  });

  function handleClose() {
    onOpenChange(false);
    form.reset({ name: '', description: '' });
  }

  function handleSubmit(data: LocationFormValues) {
    const body = {
      name: data.name,
      description: data.description || undefined,
    };

    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(body, {
      onSuccess: () => {
        toast.success(isEdit ? t('location_updated') : t('location_created'));
        handleClose();
      },
      onError: (error) => {
        const mapped = mapValidationErrors(error, form.setError);
        if (!mapped) {
          toast.error(tErrors(toI18nKey(error)));
        }
      },
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[480px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {isEdit ? t('edit_location_title') : t('create_location_title')}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4 px-[22px] pb-[18px]"
        >
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('location_name')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Input
              {...form.register('name')}
              placeholder={t('location_name_placeholder')}
              aria-invalid={!!form.formState.errors.name}
            />
            {form.formState.errors.name && (
              <p className="text-[12px] text-[color:var(--danger-fg)]">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('location_description')}
            </Label>
            <Textarea
              {...form.register('description')}
              placeholder={t('location_description_placeholder')}
              rows={3}
            />
          </div>

          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {tCommon('actions.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={
                form.formState.isSubmitting || createMutation.isPending || updateMutation.isPending
              }
            >
              {tCommon('actions.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CameraDialog({
  open,
  onOpenChange,
  camera: editCam,
  locations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camera: Camera | null;
  locations: Location[];
}) {
  const { t } = useTranslation('structure');
  const tErrors = useTranslation('errors').t;
  const tCommon = useTranslation('common').t;
  const isEdit = !!editCam;

  const createMutation = useCreateCamera();
  const updateMutation = useUpdateCamera(editCam?.id ?? '');

  const form = useForm<CameraFormValues>({
    resolver: zodResolver(CameraFormSchema),
    defaultValues: {
      name: '',
      location_id: '',
      rtsp_url: '',
      hls_url: '',
    },
    values: editCam
      ? {
          name: editCam.name,
          location_id: editCam.location_id,
          rtsp_url: editCam.rtsp_url ?? '',
          hls_url: editCam.hls_url ?? '',
        }
      : undefined,
  });

  function handleClose() {
    onOpenChange(false);
    form.reset({ name: '', location_id: '', rtsp_url: '', hls_url: '' });
  }

  function handleSubmit(data: CameraFormValues) {
    if (isEdit) {
      updateMutation.mutate(
        {
          name: data.name,
          location_id: data.location_id,
          rtsp_url: data.rtsp_url || undefined,
          hls_url: data.hls_url || undefined,
        },
        {
          onSuccess: () => {
            toast.success(t('camera_updated'));
            handleClose();
          },
          onError: (error) => {
            const mapped = mapValidationErrors(error, form.setError);
            if (!mapped) {
              toast.error(tErrors(toI18nKey(error)));
            }
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          name: data.name,
          location_id: data.location_id,
          rtsp_url: data.rtsp_url || undefined,
          hls_url: data.hls_url || undefined,
        },
        {
          onSuccess: () => {
            toast.success(t('camera_created'));
            handleClose();
          },
          onError: (error) => {
            const mapped = mapValidationErrors(error, form.setError);
            if (!mapped) {
              toast.error(tErrors(toI18nKey(error)));
            }
          },
        },
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        else onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[520px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]">
        <DialogHeader className="px-[22px] pt-[18px] pb-3">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {isEdit ? t('edit_camera_title') : t('create_camera_title')}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4 px-[22px] pb-[18px]"
        >
          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('camera_name')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Input
              {...form.register('name')}
              placeholder={t('camera_name_placeholder')}
              aria-invalid={!!form.formState.errors.name}
            />
            {form.formState.errors.name && (
              <p className="text-[12px] text-[color:var(--danger-fg)]">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('camera_location')}
              <span className="text-[color:var(--danger)]"> *</span>
            </Label>
            <Controller
              control={form.control}
              name="location_id"
              render={({ field, fieldState }) => (
                <>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('camera_location_placeholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && (
                    <p className="text-[12px] text-[color:var(--danger-fg)]">
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('camera_rtsp_url')}
              </Label>
              <Input
                {...form.register('rtsp_url')}
                placeholder={t('camera_rtsp_url_placeholder')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
                {t('camera_hls_url')}
              </Label>
              <Input {...form.register('hls_url')} placeholder={t('camera_hls_url_placeholder')} />
            </div>
          </div>

          <DialogFooter className="-mx-0 -mb-0 rounded-b-[var(--r-xl)] border-t border-[var(--line)] bg-transparent px-[22px] py-[14px]">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-[var(--border)] bg-[var(--bg-elev)] text-[color:var(--text-1)] hover:bg-[var(--bg-sunken)]"
            >
              {tCommon('actions.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={
                form.formState.isSubmitting || createMutation.isPending || updateMutation.isPending
              }
            >
              {tCommon('actions.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ArchiveLocationConfirm({
  locationId,
  onClose,
}: {
  locationId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('structure');
  const tErrors = useTranslation('errors').t;
  const archiveMutation = useArchiveLocation(locationId ?? '');

  return (
    <DestructiveConfirm
      open={!!locationId}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={t('archive_location_title')}
      description={t('archive_location_desc')}
      onConfirm={() => {
        archiveMutation.mutate(undefined, {
          onSuccess: () => {
            toast.success(t('location_archived'));
            onClose();
          },
          onError: (error) => {
            if (isAppError(error) && error.code === 'location_in_use') {
              toast.error(t('location_in_use_message'));
            } else {
              toast.error(tErrors(toI18nKey(error)));
            }
            onClose();
          },
        });
      }}
      loading={archiveMutation.isPending}
    />
  );
}

function ArchiveCameraConfirm({
  cameraId,
  onClose,
}: {
  cameraId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('structure');
  const tErrors = useTranslation('errors').t;
  const archiveMutation = useArchiveCamera(cameraId ?? '');

  return (
    <DestructiveConfirm
      open={!!cameraId}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title={t('archive_camera_title')}
      description={t('archive_camera_desc')}
      onConfirm={() => {
        archiveMutation.mutate(undefined, {
          onSuccess: () => {
            toast.success(t('camera_archived'));
            onClose();
          },
          onError: (error) => {
            toast.error(tErrors(toI18nKey(error)));
            onClose();
          },
        });
      }}
      loading={archiveMutation.isPending}
    />
  );
}

function MobileView({
  tab,
  switchTab,
  locations,
  cameras,
  groups,
  isLoading,
  isError,
  onRetry,
  onAdd,
  onEditLocation,
  onEditCamera,
  locationDialogOpen,
  setLocationDialogOpen,
  editingLocation,
  cameraDialogOpen,
  setCameraDialogOpen,
  editingCamera,
  allLocations,
}: {
  tab: 'locations' | 'cameras';
  switchTab: (t: 'locations' | 'cameras') => void;
  locations: Location[];
  cameras: Camera[];
  groups: { id: string; current_location_id: string | null }[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onAdd: () => void;
  onEditLocation: (loc: Location) => void;
  onEditCamera: (cam: Camera) => void;
  locationDialogOpen: boolean;
  setLocationDialogOpen: (v: boolean) => void;
  editingLocation: Location | null;
  cameraDialogOpen: boolean;
  setCameraDialogOpen: (v: boolean) => void;
  editingCamera: Camera | null;
  allLocations: Location[];
}) {
  const { t } = useTranslation('structure');
  const tCommon = useTranslation('common').t;
  const locale = useUiStore((s) => s.locale);

  return (
    <>
      <MobileTopBar
        title={tCommon('mobile_structure_title')}
        sub={tCommon('mobile_structure_sub')}
        back
        action={
          <button
            type="button"
            className="m-iconbtn primary"
            aria-label={tCommon('actions.create')}
            onClick={onAdd}
          >
            <PlusIcon />
          </button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="m-segmented" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={tab === 'locations' ? 'on' : ''}
            onClick={() => switchTab('locations')}
          >
            {tCommon('mobile_structure_locations')}
            <span
              style={{
                marginLeft: 5,
                background: 'var(--bg-sunken)',
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 999,
              }}
            >
              {locations.length}
            </span>
          </button>
          <button
            type="button"
            className={tab === 'cameras' ? 'on' : ''}
            onClick={() => switchTab('cameras')}
          >
            {tCommon('mobile_structure_cameras')}
            <span
              style={{
                marginLeft: 5,
                background: 'var(--bg-sunken)',
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 999,
              }}
            >
              {cameras.length}
            </span>
          </button>
        </div>

        {isError && <ErrorState onRetry={onRetry} />}

        {isLoading && !isError && (
          <div className="m-card flush" style={{ marginBottom: 12 }}>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="m-list-row">
                <SkeletonTableRow columns={2} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && !isError && tab === 'locations' && (
          <>
            {locations.length === 0 ? (
              <EmptyState
                icon={<BuildingIcon className="size-9 text-[color:var(--text-4)]" />}
                title={t('no_locations')}
                text={t('no_locations_text')}
              />
            ) : (
              <div className="m-card flush" style={{ marginBottom: 12 }}>
                {locations.map((l) => {
                  const camCount = cameras.filter((c) => c.location_id === l.id).length;
                  const groupCount = groups.filter((g) => g.current_location_id === l.id).length;
                  const desc = resolveDescription(l.description, locale);

                  return (
                    <div key={l.id} className="m-list-row" onClick={() => onEditLocation(l)}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: 'var(--primary-soft)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <BuildingIcon style={{ width: 18, height: 18 }} />
                      </div>
                      <div>
                        <div className="m-row-title">{l.name}</div>
                        {desc && <div className="m-row-sub">{desc}</div>}
                        <div
                          style={{
                            display: 'flex',
                            gap: 10,
                            marginTop: 5,
                            fontSize: 11,
                            color: 'var(--text-3)',
                          }}
                        >
                          <span>
                            <strong style={{ color: 'var(--text-1)' }}>{groupCount}</strong>{' '}
                            {tCommon('mobile_structure_groups_unit')}
                          </span>
                          <span>
                            <strong style={{ color: 'var(--text-1)' }}>{camCount}</strong>{' '}
                            {tCommon('mobile_structure_cameras_unit')}
                          </span>
                        </div>
                      </div>
                      <ChevronRightIcon className="m-row-chev" style={{ width: 16, height: 16 }} />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {!isLoading && !isError && tab === 'cameras' && (
          <>
            {cameras.length === 0 ? (
              <EmptyState
                icon={<CameraIcon className="size-9 text-[color:var(--text-4)]" />}
                title={t('no_cameras')}
                text={t('no_cameras_text')}
              />
            ) : (
              <>
                <div className="m-card flush" style={{ marginBottom: 12 }}>
                  {cameras.map((c) => {
                    const locName =
                      locations.find((l) => l.id === c.location_id)?.name ??
                      t('unassigned_location');
                    return (
                      <div key={c.id} className="m-list-row" onClick={() => onEditCamera(c)}>
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: 'var(--primary-soft)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CameraIcon style={{ width: 18, height: 18 }} />
                        </div>
                        <div>
                          <div className="m-row-title">{c.name}</div>
                          <div className="m-row-sub">{locName}</div>
                          <div style={{ marginTop: 4 }}>
                            {c.is_active ? (
                              <Badge variant="success" className="text-[10px]">
                                {t('camera_active')}
                              </Badge>
                            ) : (
                              <Badge variant="neutral" className="text-[10px]">
                                {t('camera_inactive')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRightIcon
                          className="m-row-chev"
                          style={{ width: 16, height: 16 }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: 'var(--info-soft)',
                    color: 'var(--info-fg)',
                    fontSize: 12.5,
                    display: 'flex',
                    gap: 10,
                  }}
                >
                  <InfoIcon style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                  <div>{tCommon('mobile_structure_cameras_phase_c')}</div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <LocationDialog
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
        location={editingLocation}
      />

      <CameraDialog
        open={cameraDialogOpen}
        onOpenChange={setCameraDialogOpen}
        camera={editingCamera}
        locations={allLocations}
      />
    </>
  );
}
