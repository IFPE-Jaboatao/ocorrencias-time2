import { differenceInMinutes, parseISO } from 'date-fns';

interface Props { slaPrazo: string | null; status: string; }

export function SlaIndicator({ slaPrazo, status }: Props) {
  if (!slaPrazo || status === 'RESOLVIDA' || status === 'ARQUIVADA') return null;

  const prazo     = parseISO(slaPrazo);
  const agora     = new Date();
  const minutos   = differenceInMinutes(prazo, agora);
  const vencido   = minutos < 0;
  const critico   = !vencido && minutos < 60;

  const label = vencido
    ? 'SLA vencido'
    : critico
    ? `${minutos}m restantes`
    : minutos < 1440
    ? `${Math.floor(minutos / 60)}h restantes`
    : `${Math.floor(minutos / 1440)}d restantes`;

  const cls = vencido ? 'bg-red-100 text-red-700' : critico ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
