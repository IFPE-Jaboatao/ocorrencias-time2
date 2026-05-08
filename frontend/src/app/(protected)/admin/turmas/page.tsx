'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, BookOpen, Loader2 } from 'lucide-react';
import { turmasApi, type CreateTurmaPayload, type Turno } from '@/lib/api/turmas.api';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import type { Segmento } from '@/types/ocorrencia.types';

const SEGMENTO_LABEL: Record<string, string> = {
  FUNDAMENTAL: 'Fundamental',
  MEDIO:       'Médio',
  SUPERIOR:    'Superior',
};

const TURNO_LABEL: Record<string, string> = {
  MANHA:    'Manhã',
  TARDE:    'Tarde',
  NOITE:    'Noite',
  INTEGRAL: 'Integral',
};

const TURNO_COR: Record<string, string> = {
  MANHA:    'bg-yellow-50 text-yellow-700 ring-yellow-200',
  TARDE:    'bg-orange-50 text-orange-700 ring-orange-200',
  NOITE:    'bg-indigo-50 text-indigo-700 ring-indigo-200',
  INTEGRAL: 'bg-green-50 text-green-700 ring-green-200',
};

const ANO_ATUAL = new Date().getFullYear();

const FORM_VAZIO: CreateTurmaPayload = {
  nome:      '',
  segmento:  'FUNDAMENTAL' as Segmento,
  campus:    '',
  curso:     '',
  anoLetivo: ANO_ATUAL,
  turno:     undefined,
};

export default function TurmasAdminPage() {
  const qc   = useQueryClient();
  const user = useCurrentUser();

  const [showForm, setShowForm]           = useState(false);
  const [form, setForm]                   = useState<CreateTurmaPayload>(FORM_VAZIO);
  const [filtroSegmento, setFiltroSeg]    = useState('');
  const [filtroCampus, setFiltroCampus]   = useState('');
  const [erro, setErro]                   = useState('');

  const podeAdmin = user?.perfil === 'ADMIN' || user?.perfil === 'SECRETARIA';

  const { data: turmas = [], isLoading } = useQuery({
    queryKey: ['turmas', filtroSegmento, filtroCampus],
    queryFn:  () => turmasApi.listar({
      segmento:  filtroSegmento  ? filtroSegmento as Segmento : undefined,
      campus:    filtroCampus    || undefined,
    }),
  });

  const criarMut = useMutation({
    mutationFn: () => turmasApi.criar(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['turmas'] });
      setShowForm(false);
      setForm(FORM_VAZIO);
      setErro('');
    },
    onError: () => setErro('Não foi possível criar a turma. Verifique os dados.'),
  });

  function handleChange(field: keyof CreateTurmaPayload, value: string | number | undefined) {
    setForm(f => ({ ...f, [field]: value }));
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Turmas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gerencie as turmas da instituição para controle de acesso dos professores
          </p>
        </div>
        {podeAdmin && (
          <button
            onClick={() => { setShowForm(true); setErro(''); }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus size={15} /> Nova Turma
          </button>
        )}
      </div>

      {/* Formulário de criação */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Nova Turma</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Código da Turma <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: 8A, 1B, 3EM-A"
                value={form.nome}
                onChange={e => handleChange('nome', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Deve coincidir com o campo Turma do aluno</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Segmento <span className="text-red-500">*</span>
              </label>
              <select
                value={form.segmento}
                onChange={e => handleChange('segmento', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="FUNDAMENTAL">Fundamental</option>
                <option value="MEDIO">Médio</option>
                <option value="SUPERIOR">Superior</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Campus <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Campus A"
                value={form.campus}
                onChange={e => handleChange('campus', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Curso <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Ensino Fundamental, Administração"
                value={form.curso}
                onChange={e => handleChange('curso', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Ano Letivo <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={2000}
                max={2100}
                value={form.anoLetivo}
                onChange={e => handleChange('anoLetivo', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Turno</label>
              <select
                value={form.turno ?? ''}
                onChange={e => handleChange('turno', e.target.value as Turno || undefined)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Não informado</option>
                <option value="MANHA">Manhã</option>
                <option value="TARDE">Tarde</option>
                <option value="NOITE">Noite</option>
                <option value="INTEGRAL">Integral</option>
              </select>
            </div>
          </div>

          {erro && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={() => criarMut.mutate()}
              disabled={criarMut.isPending || !form.nome || !form.campus || !form.curso}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {criarMut.isPending ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar Turma'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(FORM_VAZIO); setErro(''); }}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filtroSegmento}
          onChange={e => setFiltroSeg(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os segmentos</option>
          <option value="FUNDAMENTAL">Fundamental</option>
          <option value="MEDIO">Médio</option>
          <option value="SUPERIOR">Superior</option>
        </select>
        <input
          type="text"
          placeholder="Filtrar por campus..."
          value={filtroCampus}
          onChange={e => setFiltroCampus(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-blue-500" />
        </div>
      ) : turmas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma turma encontrada</p>
          <p className="text-sm text-gray-400 mt-1">
            {podeAdmin ? 'Clique em "Nova Turma" para começar.' : 'Nenhuma turma cadastrada ainda.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Código</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Curso</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Segmento</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Campus</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Turno</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Ano</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {turmas.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900">{t.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{t.curso}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200 font-medium">
                      {SEGMENTO_LABEL[t.segmento] ?? t.segmento}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.campus}</td>
                  <td className="px-4 py-3">
                    {t.turno ? (
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full ring-1 font-medium ${TURNO_COR[t.turno] ?? ''}`}>
                        {TURNO_LABEL[t.turno]}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.anoLetivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
