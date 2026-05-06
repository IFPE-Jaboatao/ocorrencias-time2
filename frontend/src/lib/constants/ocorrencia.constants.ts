import type { StatusOcorrencia } from '@/types/ocorrencia.types';

// M-02: fonte única de verdade — nunca duplicar em múltiplos componentes

export const STATUS_LABELS: Record<StatusOcorrencia, string> = {
  ABERTA:               'Aberta',
  AGUARDANDO_VALIDACAO: 'Aguardando Validação',
  EM_ACOMPANHAMENTO:    'Em Acompanhamento',
  RESOLVIDA:            'Resolvida',
  ARQUIVADA:            'Arquivada',
  REVISAO:              'Revisão',
};

export const STATUS_CORES: Record<StatusOcorrencia, string> = {
  ABERTA:               'bg-blue-50 text-blue-700 ring-blue-200',
  AGUARDANDO_VALIDACAO: 'bg-amber-50 text-amber-700 ring-amber-200',
  EM_ACOMPANHAMENTO:    'bg-purple-50 text-purple-700 ring-purple-200',
  RESOLVIDA:            'bg-green-50 text-green-700 ring-green-200',
  ARQUIVADA:            'bg-gray-100 text-gray-500 ring-gray-200',
  REVISAO:              'bg-orange-50 text-orange-700 ring-orange-200',
};

// I-04: P-03 espelhado no frontend — só exibir transições válidas no select
export const TRANSICOES_VALIDAS: Record<StatusOcorrencia, StatusOcorrencia[]> = {
  ABERTA:               ['AGUARDANDO_VALIDACAO', 'EM_ACOMPANHAMENTO'],
  AGUARDANDO_VALIDACAO: ['EM_ACOMPANHAMENTO', 'REVISAO'],
  EM_ACOMPANHAMENTO:    ['RESOLVIDA'],
  RESOLVIDA:            ['ARQUIVADA', 'EM_ACOMPANHAMENTO'],
  ARQUIVADA:            [],
  REVISAO:              ['ABERTA'],
};
