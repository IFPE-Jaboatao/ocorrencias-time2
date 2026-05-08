'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery }  from '@tanstack/react-query';
import { Search, UserCheck, X, ArrowLeft, AlertCircle } from 'lucide-react';
import { alunosApi }          from '@/lib/api/alunos.api';
import { categoriasApi }      from '@/lib/api/categorias.api';
import { useCriarOcorrencia } from '@/lib/hooks/useOcorrencias';
import type { Aluno } from '@/types/ocorrencia.types';
import type { Subcategoria } from '@/lib/api/categorias.api';

const SEV_CONFIG = [
  { n: 1 as const, label: 'Informativa', cor: 'bg-gray-100 text-gray-600 border-gray-200',         sel: 'bg-gray-600 text-white border-gray-600' },
  { n: 2 as const, label: 'Leve',        cor: 'bg-blue-50 text-blue-600 border-blue-200',           sel: 'bg-blue-600 text-white border-blue-600' },
  { n: 3 as const, label: 'Moderada',    cor: 'bg-yellow-50 text-yellow-700 border-yellow-200',     sel: 'bg-yellow-500 text-white border-yellow-500' },
  { n: 4 as const, label: 'Grave',       cor: 'bg-orange-50 text-orange-700 border-orange-200',     sel: 'bg-orange-500 text-white border-orange-500' },
  { n: 5 as const, label: 'Gravíssima',  cor: 'bg-red-50 text-red-700 border-red-200',              sel: 'bg-red-600 text-white border-red-600' },
];

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</h2>
      {children}
    </div>
  );
}

export default function NovaOcorrenciaPage() {
  const router = useRouter();
  const criar  = useCriarOcorrencia();

  const [busca, setBusca]             = useState('');
  const [aluno, setAluno]             = useState<Aluno | null>(null);
  const [inputFocado, setInputFocado] = useState(false);
  const [categoriaId, setCategoriaId] = useState('');
  const [subcategoriaId, setSubId]    = useState('');
  const [severidade, setSev]          = useState(1);
  const [dataIncidente, setData]      = useState('');
  const [local, setLocal]             = useState('');
  const [descricao, setDescricao]     = useState('');
  const [error, setError]             = useState('');

  // Busca quando foca (mostra todos) ou quando digita (filtra)
  const queryAtiva = inputFocado && !aluno;
  const { data: resultadosBusca, isFetching: buscando } = useQuery({
    queryKey: ['alunos-busca', busca],
    queryFn:  () => alunosApi.buscar(busca),
    enabled:  queryAtiva,
    staleTime: 30_000,
  });

  const { data: categorias } = useQuery({
    queryKey: ['categorias'],
    queryFn:  categoriasApi.listar,
  });

  const categoriaSelecionada  = categorias?.find(c => c.id === categoriaId);
  const subcatSelecionada: Subcategoria | undefined = categoriaSelecionada?.subcategorias.find(s => s.id === subcategoriaId);
  const sevAtual = SEV_CONFIG.find(s => s.n === severidade)!;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aluno) { setError('Selecione um aluno.'); return; }
    setError('');
    criar.mutate(
      { alunoId: aluno.id, categoriaId, subcategoriaId: subcategoriaId || undefined, severidade, dataIncidente, local, descricao },
      {
        onSuccess: (oc) => router.push(`/ocorrencias/${oc.id}`),
        onError:   (err: unknown) => setError(err instanceof Error ? err.message : 'Erro ao registrar ocorrência.'),
      },
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Registrar Ocorrência</h1>
        <p className="text-sm text-gray-500 mt-0.5">Preencha todos os campos obrigatórios.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ── Aluno ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <FormSection title="Identificação do Aluno">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Clique para ver alunos ou digite para filtrar..."
                value={aluno ? `${aluno.nome} — ${aluno.matricula}` : busca}
                onChange={e => { setBusca(e.target.value); setAluno(null); }}
                onFocus={() => setInputFocado(true)}
                onBlur={() => setTimeout(() => setInputFocado(false), 200)}
                disabled={!!aluno}
                className="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
              {buscando && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}

              {/* Dropdown de resultados */}
              {!aluno && inputFocado && !buscando && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-gray-100 bg-white shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                  {resultadosBusca?.length === 0 && (
                    <p className="px-4 py-3 text-xs text-gray-400 text-center">Nenhum aluno encontrado.</p>
                  )}
                  {!resultadosBusca && (
                    <p className="px-4 py-3 text-xs text-gray-400 text-center">Carregando alunos...</p>
                  )}
                  {resultadosBusca?.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => { setAluno(a); setBusca(''); setInputFocado(false); }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors"
                    >
                      <span className="font-semibold text-gray-800">{a.nome}</span>
                      <span className="text-gray-400 text-xs ml-2">{a.matricula} · {a.turma} · {a.segmento}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Aluno selecionado */}
            {aluno && (
              <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <UserCheck size={15} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">{aluno.nome}</p>
                    <p className="text-xs text-green-600">{aluno.matricula} · {aluno.turma} · {aluno.segmento}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAluno(null)}
                  className="text-green-400 hover:text-red-500 transition-colors p-1"
                >
                  <X size={15} />
                </button>
              </div>
            )}
          </FormSection>
        </div>

        {/* ── Categoria e Severidade ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <FormSection title="Classificação">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
              <select
                required
                value={categoriaId}
                onChange={e => { setCategoriaId(e.target.value); setSubId(''); }}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione uma categoria</option>
                {categorias?.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            {categoriaSelecionada && categoriaSelecionada.subcategorias.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Subcategoria
                  {subcatSelecionada && (
                    <span className="ml-2 text-xs text-blue-600 font-normal">
                      → severidade {subcatSelecionada.severidadePadrao} aplicada automaticamente
                    </span>
                  )}
                </label>
                <select
                  value={subcategoriaId}
                  onChange={e => {
                    const id = e.target.value;
                    setSubId(id);
                    if (id) {
                      const sub = categoriaSelecionada.subcategorias.find(s => s.id === id);
                      if (sub) setSev(sub.severidadePadrao);
                    }
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Nenhuma</option>
                  {categoriaSelecionada.subcategorias.map(s => (
                    <option key={s.id} value={s.id}>{s.nome} (sev. {s.severidadePadrao}, {s.slaHoras}h)</option>
                  ))}
                </select>
              </div>
            )}
          </FormSection>

          <FormSection title="Severidade">
            <div className="grid grid-cols-5 gap-2">
              {SEV_CONFIG.map(s => (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => setSev(s.n)}
                  className={`rounded-xl py-3 text-center border transition-all ${
                    severidade === s.n ? s.sel : s.cor + ' hover:opacity-80'
                  }`}
                >
                  <span className="block text-xl font-bold">{s.n}</span>
                  <span className="block text-xs mt-0.5 font-medium">{s.label}</span>
                </button>
              ))}
            </div>
            {severidade >= 4 && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3">
                <AlertCircle size={15} />
                Severidade {severidade} requer validação da coordenação antes de efeito formal.
              </div>
            )}
          </FormSection>
        </div>

        {/* ── Detalhes ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <FormSection title="Detalhes do Incidente">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Data do incidente</label>
                <input
                  type="date"
                  required
                  value={dataIncidente}
                  onChange={e => setData(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Local</label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  placeholder="Ex: Sala 204 — Bloco B"
                  value={local}
                  onChange={e => setLocal(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição do ocorrido</label>
              <textarea
                required
                minLength={20}
                rows={5}
                placeholder="Descreva os fatos com detalhes: o que aconteceu, quem estava envolvido, contexto..."
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="mt-1.5 text-xs text-gray-400 text-right">
                {descricao.length < 20
                  ? <span className="text-amber-500">{descricao.length}/20 mínimos</span>
                  : <span className="text-green-600">{descricao.length} caracteres</span>
                }
              </p>
            </div>
          </FormSection>
        </div>

        {/* ── Erro e submit ── */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={criar.isPending}
            className="flex-1 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            {criar.isPending ? 'Registrando...' : 'Registrar ocorrência'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="sm:w-auto rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>

      </form>
    </div>
  );
}
