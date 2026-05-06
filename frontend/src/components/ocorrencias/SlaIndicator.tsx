import { differenceInMinutes, parseISO } from 'date-fns';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props { slaPrazo: string | null; status: string; }

export function SlaIndicator({ slaPrazo, status }: Props) {
  if (!slaPrazo || status === 'RESOLVIDA' || status === 'ARQUIVADA') return null;

  const minutos  = differenceInMinutes(parseISO(slaPrazo), new Date());
  const vencido  = minutos < 0;
  const critico  = !vencido && minutos < 60;

  const label = vencido
    ? 'SLA vencido'
    : minutos < 60
    ? `${minutos}m`
    : minutos < 1440
    ? `${Math.floor(minutos / 60)}h`
    : `${Math.floor(minutos / 1440)}d`;

  if (vencido) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 ring-1 ring-inset ring-red-200">
        <AlertTriangle size={10} />
        {label}
      </span>
    );
  }

  if (critico) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
        <Clock size={10} />
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-200">
      <CheckCircle2 size={10} />
      {label}
    </span>
  );
}
