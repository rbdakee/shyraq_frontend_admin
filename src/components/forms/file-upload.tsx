import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { UploadIcon, XIcon, CheckCircleIcon, TriangleAlertIcon, Loader2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface PresignedResult {
  upload_url: string;
  key: string;
}

type FileStatus = 'pending' | 'uploading' | 'success' | 'error';

interface TrackedFile {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
  key?: string;
}

interface FileUploadProps {
  getPresigned: (file: File) => Promise<PresignedResult>;
  onConfirm: (info: { key: string; file: File }) => void;
  accept?: string;
  maxSizeMB?: number;
  multiple?: boolean;
  className?: string;
}

export function FileUpload({
  getPresigned,
  onConfirm,
  accept,
  maxSizeMB = 10,
  multiple = false,
  className,
}: FileUploadProps) {
  const { t } = useTranslation('forms');
  const [files, setFiles] = useState<TrackedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateFile = useCallback((id: string, update: Partial<TrackedFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...update } : f)));
  }, []);

  async function processFile(tracked: TrackedFile) {
    try {
      updateFile(tracked.id, { status: 'uploading', progress: 0 });

      const { upload_url, key } = await getPresigned(tracked.file);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', upload_url);
        xhr.setRequestHeader('Content-Type', tracked.file.type);

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            updateFile(tracked.id, { progress: pct });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${String(xhr.status)}`));
        });
        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.send(tracked.file);
      });

      updateFile(tracked.id, { status: 'success', progress: 100, key });
      onConfirm({ key, file: tracked.file });
    } catch {
      updateFile(tracked.id, {
        status: 'error',
        error: t('upload_error', { defaultValue: 'Ошибка загрузки' }),
      });
    }
  }

  function addFiles(fileList: FileList | File[]) {
    const toAdd = Array.from(fileList);

    for (const file of toAdd) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        const tracked: TrackedFile = {
          id: crypto.randomUUID(),
          file,
          status: 'error',
          progress: 0,
          error: t('upload_too_large', {
            max: maxSizeMB,
            defaultValue: `Файл превышает {{max}} МБ`,
          }),
        };
        setFiles((prev) => [...prev, tracked]);
        continue;
      }

      const tracked: TrackedFile = {
        id: crypto.randomUUID(),
        file,
        status: 'pending',
        progress: 0,
      };
      setFiles((prev) => [...prev, tracked]);
      void processFile(tracked);
    }
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  }

  return (
    <div className={cn(className)}>
      <div
        className={cn(
          'cursor-pointer rounded-[var(--r-md)] border-[1.5px] border-dashed border-[var(--border-strong)] bg-[var(--bg-subtle)] px-6 py-6 text-center text-[color:var(--text-3)] transition-colors',
          dragOver &&
            'border-[var(--primary)] bg-[var(--primary-soft)] text-[color:var(--primary-fg)]',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <UploadIcon className="mx-auto mb-2 size-6" />
        <div className="text-[13px]">
          <strong className="text-[color:var(--text-1)]">
            {t('upload_drag', { defaultValue: 'Перетащите файл сюда' })}
          </strong>{' '}
          {t('upload_or_click', { defaultValue: 'или нажмите для выбора' })}
        </div>
        <div className="mt-1 text-[12px] text-[color:var(--text-4)]">
          {t('upload_limit', {
            max: maxSizeMB,
            defaultValue: `Макс. {{max}} МБ`,
          })}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleInputChange}
      />

      {files.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {files.map((tracked) => (
            <div
              key={tracked.id}
              className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--bg-elev)] px-3 py-2"
            >
              <div className="flex size-8 shrink-0 items-center justify-center">
                {tracked.status === 'uploading' && (
                  <Loader2Icon className="size-4 animate-spin text-[color:var(--primary)]" />
                )}
                {tracked.status === 'success' && (
                  <CheckCircleIcon className="size-4 text-[color:var(--success)]" />
                )}
                {tracked.status === 'error' && (
                  <TriangleAlertIcon className="size-4 text-[color:var(--danger)]" />
                )}
                {tracked.status === 'pending' && (
                  <UploadIcon className="size-4 text-[color:var(--text-4)]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-[color:var(--text-1)]">
                  {tracked.file.name}
                </div>
                {tracked.status === 'uploading' && (
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-sunken)]">
                    <div
                      className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-200"
                      style={{ width: `${String(tracked.progress)}%` }}
                    />
                  </div>
                )}
                {tracked.error && (
                  <div className="mt-0.5 text-[12px] text-[color:var(--danger-fg)]">
                    {tracked.error}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(tracked.id);
                }}
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
