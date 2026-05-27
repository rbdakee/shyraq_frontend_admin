import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UploadIcon, XIcon, FileVideoIcon, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { validateContentFiles } from '@/lib/content-media-validation';

interface MultipartMediaInputProps {
  existingUrls?: string[];
  readOnly?: boolean;
  onFilesChange: (files: File[]) => void;
  files: File[];
}

export function MultipartMediaInput({
  existingUrls,
  readOnly = false,
  onFilesChange,
  files,
}: MultipartMediaInputProps) {
  const { t } = useTranslation('content');
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showDropZone, setShowDropZone] = useState(files.length > 0);

  const hasExisting = existingUrls && existingUrls.length > 0;

  const handleFiles = useCallback(
    (incoming: File[]) => {
      setValidationError(null);
      const err = validateContentFiles(incoming);
      if (err) {
        setValidationError(t(`errors:${err.code}`, { defaultValue: t(err.code) }));
        return;
      }
      onFilesChange(incoming);
    },
    [onFilesChange, t],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) handleFiles(dropped);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) handleFiles(selected);
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  function isVideo(url: string) {
    return /\.(mp4|webm|mov|avi)$/i.test(url);
  }

  return (
    <div className="flex flex-col gap-3">
      {hasExisting && (
        <div>
          <div className="mb-1.5 text-[12.5px] font-semibold text-[color:var(--text-2)]">
            {t('media_existing')}
          </div>
          <div className="flex flex-wrap gap-2">
            {existingUrls.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-16 items-center justify-center overflow-hidden rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-sunken)]"
              >
                {isVideo(url) ? (
                  <FileVideoIcon className="size-6 text-[color:var(--text-4)]" />
                ) : (
                  <img src={url} alt="" className="size-full object-cover" loading="lazy" />
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {!readOnly && (
        <>
          {hasExisting && !showDropZone && (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowDropZone(true)}>
              {t('action_replace_media')}
            </Button>
          )}

          {(showDropZone || !hasExisting) && (
            <>
              {hasExisting && (
                <p className="text-[12px] font-medium text-[color:var(--warning)]">
                  {t('media_replace_warning')}
                </p>
              )}

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[var(--r-lg)] border-2 border-dashed border-[var(--border)] bg-[var(--bg-sunken)] p-6 transition-colors',
                  dragOver &&
                    'border-[var(--primary)] bg-[color:color-mix(in_oklab,var(--primary-soft)_30%,transparent)]',
                )}
              >
                <UploadIcon className="size-5 text-[color:var(--text-4)]" />
                <div className="text-[13px] font-semibold text-[color:var(--text-2)]">
                  {t('field_media')}
                </div>
                <div className="text-[11.5px] text-[color:var(--text-4)]">
                  {t('media_image_limit')} / {t('media_video_limit')} / {t('media_count_limit')}
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleInputChange}
                />
              </div>

              {validationError && (
                <p className="text-[12px] font-medium text-[color:var(--danger)]">
                  {validationError}
                </p>
              )}

              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="group relative flex size-16 items-center justify-center overflow-hidden rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-sunken)]"
                    >
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="size-6 text-[color:var(--text-4)]" />
                      ) : (
                        <FileVideoIcon className="size-6 text-[color:var(--text-4)]" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(idx);
                        }}
                        className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[var(--danger)] text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <XIcon className="size-3" />
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-1 text-center text-[9px] text-white">
                        {file.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
