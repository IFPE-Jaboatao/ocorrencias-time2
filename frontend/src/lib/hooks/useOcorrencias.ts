'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ocorrenciasApi, FilterParams, CreateOcorrenciaPayload } from '../api/ocorrencias.api';

export function useOcorrencias(params?: FilterParams) {
  return useQuery({
    queryKey: ['ocorrencias', params],
    queryFn:  () => ocorrenciasApi.listar(params),
  });
}

export function useOcorrencia(id: string) {
  return useQuery({
    queryKey: ['ocorrencia', id],
    queryFn:  () => ocorrenciasApi.buscarPorId(id),
    enabled:  !!id,
  });
}

export function useCriarOcorrencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOcorrenciaPayload) => ocorrenciasApi.criar(payload),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['ocorrencias'] }),
  });
}
