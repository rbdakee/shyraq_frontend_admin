import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TriangleAlertIcon, ScanLineIcon, EyeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FaceTab({ childId }: { childId: string }) {
  const { t } = useTranslation('children');
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-3.5" data-child-id={childId}>
      {/* Left column: banner + biometric profile */}
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shyraq-shadow-1)]">
        {/* Phase C warning banner */}
        <div className="mb-4 flex gap-2.5 rounded-[var(--r-md)] border border-[color-mix(in_oklab,var(--warning)_40%,transparent)] bg-[var(--warning-soft)] p-3 text-[13px] text-[color:var(--warning-fg)]">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <div className="grow">
            <div className="font-bold">{t('detail.face_id.phase_c_title')}</div>
            <div>{t('detail.face_id.phase_c_body')}</div>
          </div>
        </div>

        <div className="mb-3 text-[15px] font-semibold text-[color:var(--text-1)]">
          {t('detail.face_id.biometric_title')}
        </div>

        <div className="flex items-center gap-3 rounded-[10px] bg-[var(--bg-sunken)] p-3.5">
          <div className="flex size-12 items-center justify-center rounded-[10px] bg-[var(--neutral-soft)]">
            <ScanLineIcon className="size-[22px] text-[color:var(--text-3)]" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-[color:var(--text-1)]">
              {t('detail.face_id.not_registered')}
            </div>
            <div className="mt-0.5 text-[12px] text-[color:var(--text-3)]">
              {t('detail.face_id.no_data')}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/face')}>
            {t('detail.face_id.go_to_section')}
          </Button>
        </div>
      </div>

      {/* Right column: consents */}
      <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shyraq-shadow-1)]">
        <div className="mb-3 text-[15px] font-semibold text-[color:var(--text-1)]">
          {t('detail.face_id.consents_title')}
        </div>
        <div className="text-[13px] text-[color:var(--text-3)]">
          {t('detail.face_id.consents_body')}
        </div>
        <Button variant="outline" className="mt-3 w-full" disabled>
          <EyeIcon className="size-4" />
          {t('detail.face_id.open_scan')}
        </Button>
      </div>
    </div>
  );
}
