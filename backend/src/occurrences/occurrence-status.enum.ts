export enum OccurrenceStatus {
  RASCUNHO          = 'RASCUNHO',
  EM_INVESTIGACAO   = 'EM_INVESTIGACAO',
  NOTIFICADA        = 'NOTIFICADA',
  AGUARDANDO_DEFESA = 'AGUARDANDO_DEFESA',
  ENCERRADA         = 'ENCERRADA',
  ARQUIVADA         = 'ARQUIVADA',
  ANULADA           = 'ANULADA',
}

/** Status visíveis para aluno/responsável (H-01 do CLAUDE.md) */
export const VISIBLE_STATUSES = [
  OccurrenceStatus.NOTIFICADA,
  OccurrenceStatus.AGUARDANDO_DEFESA,
  OccurrenceStatus.ENCERRADA,
  OccurrenceStatus.ARQUIVADA,
];
