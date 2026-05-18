interface FieldErrorDisplayProps {
  message?: string;
}

export function FieldErrorDisplay({ message }: FieldErrorDisplayProps) {
  if (!message) return null;
  return <p className="mt-1 text-[12px] text-[color:var(--danger-fg)]">{message}</p>;
}
