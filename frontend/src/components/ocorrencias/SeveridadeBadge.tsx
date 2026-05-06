interface Props { severidade: number; }

const CONFIG: Record<number, { label: string; dot: string; badge: string }> = {
  1: { label: 'Informativa', dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-600 ring-gray-200' },
  2: { label: 'Leve',        dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
  3: { label: 'Moderada',    dot: 'bg-yellow-500', badge: 'bg-yellow-50 text-yellow-700 ring-yellow-200' },
  4: { label: 'Grave',       dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 ring-orange-200' },
  5: { label: 'Gravíssima',  dot: 'bg-red-600',    badge: 'bg-red-50 text-red-700 ring-red-200' },
};

export function SeveridadeBadge({ severidade }: Props) {
  const c = CONFIG[severidade] ?? CONFIG[1];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${c.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {severidade} — {c.label}
    </span>
  );
}
