import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon, ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface JsonViewerProps {
  data: unknown;
  defaultExpanded?: boolean;
  className?: string;
  label?: string;
}

export function JsonViewer({ data, defaultExpanded = false, className, label }: JsonViewerProps) {
  const { t } = useTranslation('feedback');
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={cn('overflow-hidden rounded-[var(--r-md)]', className)}>
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center gap-2 bg-[var(--bg-sunken)] px-3.5 py-2.5 text-left font-[JetBrains_Mono,ui-monospace,monospace] text-[12px] text-[color:var(--success-fg)]"
      >
        {expanded ? (
          <ChevronDownIcon className="size-3.5 shrink-0" />
        ) : (
          <ChevronRightIcon className="size-3.5 shrink-0" />
        )}
        <span>{label ?? t('json_viewer_label', { defaultValue: 'JSON' })}</span>
      </button>
      {expanded && (
        <div className="max-h-[280px] overflow-auto bg-[var(--bg-sunken)] px-3.5 pb-3.5 leading-[1.6]">
          <JsonNode value={data} depth={0} />
        </div>
      )}
    </div>
  );
}

function JsonNode({ value, depth }: { value: unknown; depth: number }) {
  const indent = depth * 16;

  if (value === null) {
    return (
      <span className="font-[JetBrains_Mono,ui-monospace,monospace] text-[12px] text-[color:var(--info)]">
        null
      </span>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <span className="font-[JetBrains_Mono,ui-monospace,monospace] text-[12px] text-[color:var(--info)]">
        {String(value)}
      </span>
    );
  }

  if (typeof value === 'number') {
    return (
      <span className="font-[JetBrains_Mono,ui-monospace,monospace] text-[12px] text-[color:var(--info)]">
        {String(value)}
      </span>
    );
  }

  if (typeof value === 'string') {
    return (
      <span className="font-[JetBrains_Mono,ui-monospace,monospace] text-[12px] text-[color:var(--warning)]">
        &quot;{value}&quot;
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <span className="font-[JetBrains_Mono,ui-monospace,monospace] text-[12px] text-[color:var(--text-2)]">
          []
        </span>
      );
    }
    return (
      <span className="font-[JetBrains_Mono,ui-monospace,monospace] text-[12px] text-[color:var(--text-2)]">
        {'[\n'}
        {value.map((item, i) => (
          <span key={i} style={{ paddingLeft: indent + 16 }} className="block">
            <JsonNode value={item} depth={depth + 1} />
            {i < value.length - 1 ? ',' : ''}
          </span>
        ))}
        <span style={{ paddingLeft: indent }} className="block">
          {']'}
        </span>
      </span>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return (
        <span className="font-[JetBrains_Mono,ui-monospace,monospace] text-[12px] text-[color:var(--text-2)]">
          {'{}'}
        </span>
      );
    }
    return (
      <span className="font-[JetBrains_Mono,ui-monospace,monospace] text-[12px] text-[color:var(--text-2)]">
        {'{\n'}
        {entries.map(([key, val], i) => (
          <span key={key} style={{ paddingLeft: indent + 16 }} className="block">
            <span className="text-[color:var(--success)]">&quot;{key}&quot;</span>
            {': '}
            <JsonNode value={val} depth={depth + 1} />
            {i < entries.length - 1 ? ',' : ''}
          </span>
        ))}
        <span style={{ paddingLeft: indent }} className="block">
          {'}'}
        </span>
      </span>
    );
  }

  return (
    <span className="font-[JetBrains_Mono,ui-monospace,monospace] text-[12px] text-[color:var(--text-2)]">
      {String(value)}
    </span>
  );
}
