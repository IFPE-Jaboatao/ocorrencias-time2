import { api } from './client';

export interface DashboardStats {
  total:           number;
  abertas:         number;
  aguardandoValidacao: number;
  emAcompanhamento: number;
  resolvidasHoje:  number;
  slaVencidas:     number;
  porSeveridade:   Record<number, number>;
}

export const dashboardApi = {
  resumo: () => api.get<DashboardStats>('/dashboard/resumo').then(r => r.data),
};
