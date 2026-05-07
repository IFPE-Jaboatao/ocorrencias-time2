import { api } from './client';

export interface FiltrosRelatorio {
  dataInicio?: string;
  dataFim?:    string;
  status?:     string;
  severidade?: number;
  segmento?:   string;
  campus?:     string;
}

export interface ResumoRelatorio {
  totalOcorrencias: number;
  porStatus:        Record<string, number>;
  porSeveridade:    Record<string, number>;
  porSegmento:      Record<string, number>;
  porCategoria:     { nome: string; total: number }[];
  slaVencidas:      number;
  periodo:          { inicio: string; fim: string };
}

export const relatoriosApi = {
  resumo: (filtros: FiltrosRelatorio): Promise<ResumoRelatorio> =>
    api.get('/relatorios/resumo', { params: filtros }).then(r => r.data),

  exportarCsvUrl: (filtros: FiltrosRelatorio): string => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v));
    });
    const qs = params.toString();
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    return `${base}/api/v1/relatorios/exportar${qs ? '?' + qs : ''}`;
  },

  exportarCsv: async (filtros: FiltrosRelatorio): Promise<void> => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v));
    });
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    const url  = `${base}/api/v1/relatorios/exportar${params.toString() ? '?' + params.toString() : ''}`;

    const response = await fetch(url, { credentials: 'include' });

    if (!response.ok) throw new Error('Falha ao exportar relatório.');

    const blob     = await response.blob();
    const filename = `radar-academico-ocorrencias-${new Date().toISOString().slice(0, 10)}.csv`;
    const link     = document.createElement('a');
    link.href      = URL.createObjectURL(blob);
    link.download  = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },
};
