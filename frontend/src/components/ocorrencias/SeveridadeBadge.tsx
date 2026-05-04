interface Props { severidade: number; }

const CONFIG: Record<number, { label: string; className: string }> = {
  1: { label: 'Informativa',  className: 'bg-gray-100 text-gray-700' },
  2: { label: 'Leve',         className: 'bg-blue-100 text-blue-700' },
  3: { label: 'Moderada',     className: 'bg-yellow-100 text-yellow-800' },
  4: { label: 'Grave',        className: 'bg-orange-100 text-orange-800' },
  5: { label: 'Gravíssima',   className: 'bg-red-700 text-white' },
};

export function SeveridadeBadge({ severidade }: Props) {
  const config = CONFIG[severidade] ?? { label: String(severidade), className: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      Sev. {severidade} — {config.label}
    </span>
  );
}
