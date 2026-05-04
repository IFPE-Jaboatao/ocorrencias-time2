'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery }  from '@tanstack/react-query';
import { alunosApi }       from '@/lib/api/alunos.api';
import { categoriasApi }   from '@/lib/api/categorias.api';
import { useCriarOcorrencia } from '@/lib/hooks/useOcorrencias';
import type { Aluno } from '@/types/ocorrencia.types';

export default function NovaOcorrenciaPage() {
  const router = useRouter();
  const criar  = useCriarOcorrencia();

  const [busca, setBusca]             = useState('');
  const [aluno, setAluno]             = useState<Aluno | null>(null);
  const [categoriaId, setCategoriaId] = useState('');
  const [subcategoria, setSub]        = useState('');
  const [severidade, setSev]          = useState(1);
  const [dataIncidente, setData]      = useState('');
  const [local, setLocal]             = useState('');
  const [descricao, setDescricao]     = useState('');
  const [error, setError]             = useState('');

  const { data: resultadosBusca, isFetching: buscando } = useQuery({
    queryKey: ['alunos-busca', busca],
    queryFn:  () => alunosApi.buscar(busca),
    enabled:  busca.length >= 3,
  });

  const { data: categorias } = useQuery({
    queryKey: ['categorias'],
    queryFn:  categoriasApi.listar,
  });

  const categoriaSelecionada = categorias?.find(c => c.id === categoriaId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aluno) { setError('Selecione um aluno.'); return; }
    setError('');

    criar.mutate(
      { alunoId: aluno.id, categoriaId, subcategoria: subcategoria || undefined, severidade, dataIncidente, local, descricao },
      {
        onSuccess: (oc) => router.push(`/ocorrencias/${oc.id}`),
        onError:   (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Erro ao registrar ocorrência.';
          setError(msg);
        },
      },
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Registrar Ocorrência</h1>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl border border-gray-200 p-6">

        {/* Aluno */}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-gray-700">Aluno</legend>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nome ou matrícula (mín. 3 caracteres)"
              value={aluno ? `${aluno.nome} (${aluno.matricula})` : busca}
              onChange={e => { setBusca(e.target.value); setAluno(null); }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {!aluno && busca.length >= 3 && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white shadow-md">
                {buscando && <p className="px-3 py-2 text-xs text-gray-400">Buscando...</p>}
                {resultadosBusca?.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => { setAluno(a); setBusca(''); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 border-b last:border-0"
                  >
                    <span className="font-medium">{a.nome}</span>{' '}
                    <span className="text-gray-400 text-xs">{a.matricula} · {a.turma} · {a.segmento}</span>
                  </button>
                ))}
                {resultadosBusca?.length === 0 && (
                  <p className="px-3 py-2 text-xs text-gray-400">Nenhum aluno encontrado.</p>
                )}
              </div>
            )}
          </div>
          {aluno && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
              <span>{aluno.nome} — {aluno.turma} — {aluno.segmento}</span>
              <button type="button" onClick={() => setAluno(null)} className="ml-auto text-gray-400 hover:text-red-500 text-xs">
                remover
              </button>
            </div>
          )}
        </fieldset>

        {/* Categoria */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <select
            required
            value={categoriaId}
            onChange={e => { setCategoriaId(e.target.value); setSub(''); }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Selecione uma categoria</option>
            {categorias?.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        {/* Subcategoria */}
        {categoriaSelecionada && categoriaSelecionada.subcategorias.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subcategoria</label>
            <select
              value={subcategoria}
              onChange={e => setSub(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Nenhuma</option>
              {categoriaSelecionada.subcategorias.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* Severidade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Severidade</label>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSev(s)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium border transition-colors ${
                  severidade === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {['Informativa', 'Leve', 'Moderada', 'Grave', 'Gravíssima'][severidade - 1]}
            {severidade >= 4 && ' — requer validação da coordenação'}
          </p>
        </div>

        {/* Data */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data do incidente</label>
          <input
            type="date"
            required
            value={dataIncidente}
            onChange={e => setData(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Local */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
          <input
            type="text"
            required
            maxLength={200}
            placeholder="Ex: Sala 204 — Bloco B"
            value={local}
            onChange={e => setLocal(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea
            required
            minLength={20}
            rows={4}
            placeholder="Descreva o ocorrido com detalhes (mínimo 20 caracteres)"
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
          <p className="mt-0.5 text-xs text-gray-400">{descricao.length}/2000 caracteres</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={criar.isPending}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {criar.isPending ? 'Registrando...' : 'Registrar ocorrência'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
