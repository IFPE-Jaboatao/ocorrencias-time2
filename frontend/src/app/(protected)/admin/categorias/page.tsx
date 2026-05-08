'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  categoriasApi,
  type CreateCategoriaPayload,
  type CreateSubcategoriaPayload,
  type Subcategoria,
} from '@/lib/api/categorias.api';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import type { Segmento } from '@/types/ocorrencia.types';
import {
  Tag, Plus, X, Check, AlertCircle, Trash2,
  Clock, Bell, Shield, BookOpen, ChevronRight, ChevronDown,
} from 'lucide-react';

const SEGMENTOS: Segmento[] = ['FUNDAMENTAL', 'MEDIO', 'SUPERIOR'];
const SEGMENTO_LABEL: Record<string, string> = {
  FUNDAMENTAL: 'Fundamental',
  MEDIO:       'Médio',
  SUPERIOR:    'Superior',
};

const SLA_OPTIONS = [
  { label: '4 horas',                  value: 4 },
  { label: '24 horas',                 value: 24 },
  { label: '48 horas (2 dias úteis)',  value: 48 },
  { label: '72 horas (3 dias úteis)',  value: 72 },
  { label: '120 horas (5 dias úteis)', value: 120 },
];

const SEV_LABELS = ['', 'Informativa', 'Leve', 'Moderada', 'Grave', 'Gravíssima'];

function SeveridadeDot({ n }: { n: number }) {
  const colors = ['', 'bg-gray-400', 'bg-blue-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-600'];
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[n] ?? 'bg-gray-300'}`} />;
}

function initCatForm(): CreateCategoriaPayload {
  return {
    nome: '', severidadePadrao: 2, slaHoras: 72,
    exigeNotifResponsavel: false, obrigatorioLegal: false,
    segmentosAplicaveis: ['FUNDAMENTAL', 'MEDIO', 'SUPERIOR'], exigeValidacao: false,
  };
}

function initSubForm(): CreateSubcategoriaPayload {
  return {
    nome: '', severidadePadrao: 2, slaHoras: 72,
    exigeValidacao: false, exigeNotifResponsavel: false, obrigatorioLegal: false,
  };
}

interface SubFormState {
  categoriaId: string;
  form: CreateSubcategoriaPayload;
  error: string;
}

export default function CategoriasAdminPage() {
  const user = useCurrentUser();
  const qc   = useQueryClient();

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['categorias'],
    queryFn:  categoriasApi.listar,
  });

  const [showForm, setShowForm]     = useState(false);
  const [catForm, setCatForm]       = useState<CreateCategoriaPayload>(initCatForm());
  const [formError, setFormError]   = useState('');
  const [success, setSuccess]       = useState('');
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [confirmDelSub, setConfirmDelSub] = useState<{ catId: string; subId: string } | null>(null);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [subFormState, setSubFormState] = useState<SubFormState | null>(null);

  const isAdmin = user?.perfil === 'ADMIN';

  const criarCatMut = useMutation({
    mutationFn: () => categoriasApi.criar(catForm),
    onSuccess: c => {
      qc.invalidateQueries({ queryKey: ['categorias'] });
      setShowForm(false); setCatForm(initCatForm()); setFormError('');
      setSuccess(`Categoria "${c.nome}" criada com sucesso.`);
      setTimeout(() => setSuccess(''), 4000);
    },
    onError: (e: unknown) => setFormError(e instanceof Error ? e.message : 'Erro ao criar categoria.'),
  });

  const desativarCatMut = useMutation({
    mutationFn: (id: string) => categoriasApi.desativar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); setConfirmDel(null); },
  });

  const criarSubMut = useMutation({
    mutationFn: ({ catId, payload }: { catId: string; payload: CreateSubcategoriaPayload }) =>
      categoriasApi.criarSubcategoria(catId, payload),
    onSuccess: (sub) => {
      qc.invalidateQueries({ queryKey: ['categorias'] });
      setSubFormState(null);
      setSuccess(`Subcategoria "${sub.nome}" criada.`);
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (e: unknown) => {
      setSubFormState(s => s ? { ...s, error: e instanceof Error ? e.message : 'Erro ao criar subcategoria.' } : s);
    },
  });

  const desativarSubMut = useMutation({
    mutationFn: ({ catId, subId }: { catId: string; subId: string }) =>
      categoriasApi.desativarSubcategoria(catId, subId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); setConfirmDelSub(null); },
  });

  function toggleSegmento(seg: Segmento) {
    setCatForm(f => ({
      ...f,
      segmentosAplicaveis: f.segmentosAplicaveis.includes(seg)
        ? f.segmentosAplicaveis.filter(s => s !== seg)
        : [...f.segmentosAplicaveis, seg],
    }));
  }

  function openSubForm(catId: string) {
    setSubFormState({ categoriaId: catId, form: initSubForm(), error: '' });
  }

  const canSubmitCat = catForm.nome.trim().length >= 2 && catForm.segmentosAplicaveis.length > 0;
  const canSubmitSub = (subFormState?.form.nome.trim().length ?? 0) >= 2;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Tag size={22} className="text-gray-400" />
            Gestão de Categorias
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {categorias.length} categoria{categorias.length !== 1 ? 's' : ''} ativa{categorias.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowForm(v => !v); setFormError(''); }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus size={16} />
            Nova categoria
          </button>
        )}
      </div>

      {/* Success toast */}
      {success && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
          <Check size={16} className="text-green-600 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Formulário nova categoria */}
      {showForm && isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Nova categoria</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome da categoria *</label>
              <input
                type="text"
                placeholder="Ex: Comportamental"
                value={catForm.nome}
                onChange={e => setCatForm(f => ({ ...f, nome: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Severidade padrão</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCatForm(f => ({ ...f, severidadePadrao: n }))}
                    className={`flex-1 flex flex-col items-center gap-1 rounded-xl py-2 border text-xs font-medium transition-all ${
                      catForm.severidadePadrao === n
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                    title={SEV_LABELS[n]}
                  >
                    <SeveridadeDot n={n} />
                    {n}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-400">Nível: <strong>{SEV_LABELS[catForm.severidadePadrao]}</strong></p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">SLA (prazo padrão)</label>
              <select
                value={catForm.slaHoras}
                onChange={e => setCatForm(f => ({ ...f, slaHoras: Number(e.target.value) }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SLA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Segmentos */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Segmentos aplicáveis *</label>
            <div className="flex gap-2">
              {SEGMENTOS.map(seg => {
                const selected = catForm.segmentosAplicaveis.includes(seg);
                return (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => toggleSegmento(seg)}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium border transition-all ${
                      selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <BookOpen size={13} />
                    {SEGMENTO_LABEL[seg]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flags */}
          <div className="space-y-3">
            <label className="block text-xs font-medium text-gray-600">Configurações adicionais</label>
            {[
              { key: 'exigeValidacao',       icon: Shield, label: 'Exige validação do coordenador antes de efeito formal',  desc: 'Ocorrências desta categoria ficam em "Aguardando Validação" até aprovação.' },
              { key: 'exigeNotifResponsavel', icon: Bell,   label: 'Notificar responsável legal (menores)',                  desc: 'Envia e-mail ao responsável quando a ocorrência é registrada.' },
              { key: 'obrigatorioLegal',      icon: Shield, label: 'Notificação obrigatória por lei (ECA)',                  desc: 'Impede opt-out da notificação — obrigação legal.' },
            ].map(({ key, icon: Icon, label, desc }) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={!!catForm[key as keyof typeof catForm]}
                    onChange={e => setCatForm(f => ({ ...f, [key]: e.target.checked }))}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-checked:bg-blue-600 rounded-full transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <Icon size={12} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
              </label>
            ))}
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
              <AlertCircle size={15} />
              {formError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => criarCatMut.mutate()}
              disabled={criarCatMut.isPending || !canSubmitCat}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
            >
              {criarCatMut.isPending ? 'Criando...' : 'Criar categoria'}
            </button>
            <button
              onClick={() => { setShowForm(false); setCatForm(initCatForm()); setFormError(''); }}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de categorias */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : categorias.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
            <Tag size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Nenhuma categoria cadastrada.</p>
          </div>
        ) : (
          categorias.map(cat => {
            const isExpanded = expanded === cat.id;
            const subForm    = subFormState?.categoriaId === cat.id ? subFormState : null;
            const subcats    = cat.subcategorias ?? [];

            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Row */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : cat.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <SeveridadeDot n={cat.severidadePadrao} />
                      <span className="font-semibold text-gray-800">{cat.nome}</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 flex-wrap">
                      {cat.segmentosAplicaveis?.map(s => (
                        <span key={s} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          {SEGMENTO_LABEL[s] ?? s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="hidden md:flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {cat.slaHoras}h
                      </span>
                      {cat.exigeValidacao && (
                        <span className="flex items-center gap-1 text-purple-500">
                          <Shield size={11} /> Validação
                        </span>
                      )}
                      {cat.exigeNotifResponsavel && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <Bell size={11} /> Notif.
                        </span>
                      )}
                      {cat.obrigatorioLegal && (
                        <span className="flex items-center gap-1 text-red-500 font-medium">
                          <Shield size={11} /> Legal
                        </span>
                      )}
                      <span className="text-gray-300">
                        {subcats.length} subcat.
                      </span>
                    </div>
                    {isExpanded
                      ? <ChevronDown size={16} className="text-gray-300" />
                      : <ChevronRight size={16} className="text-gray-300" />
                    }
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-5">
                    {/* Detalhes da categoria */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Severidade padrão</p>
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <SeveridadeDot n={cat.severidadePadrao} />
                          {cat.severidadePadrao} — {SEV_LABELS[cat.severidadePadrao]}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">SLA</p>
                        <span className="flex items-center gap-1 text-sm text-gray-700">
                          <Clock size={13} className="text-gray-400" />
                          {cat.slaHoras} horas
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Segmentos</p>
                        <div className="flex flex-wrap gap-1">
                          {cat.segmentosAplicaveis?.map(s => (
                            <span key={s} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                              {SEGMENTO_LABEL[s] ?? s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Configurações</p>
                        <div className="space-y-0.5">
                          <p className={`text-xs flex items-center gap-1 ${cat.exigeValidacao ? 'text-purple-600' : 'text-gray-300'}`}>
                            <Shield size={10} /> Exige validação
                          </p>
                          <p className={`text-xs flex items-center gap-1 ${cat.exigeNotifResponsavel ? 'text-amber-600' : 'text-gray-300'}`}>
                            <Bell size={10} /> Notif. responsável
                          </p>
                          <p className={`text-xs flex items-center gap-1 ${cat.obrigatorioLegal ? 'text-red-600 font-medium' : 'text-gray-300'}`}>
                            <Shield size={10} /> Obrigatório legal
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Subcategorias */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Subcategorias ({subcats.length})
                        </p>
                        {isAdmin && !subForm && (
                          <button
                            onClick={() => openSubForm(cat.id)}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <Plus size={12} />
                            Adicionar
                          </button>
                        )}
                      </div>

                      {subcats.length === 0 && !subForm && (
                        <p className="text-xs text-gray-300">Nenhuma subcategoria cadastrada.</p>
                      )}

                      <div className="space-y-2">
                        {subcats.map((sub: Subcategoria) => {
                          const isDeletingSub = confirmDelSub?.catId === cat.id && confirmDelSub.subId === sub.id;
                          return (
                            <div key={sub.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <SeveridadeDot n={sub.severidadePadrao} />
                                <span className="text-sm font-medium text-gray-700 truncate">{sub.nome}</span>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Clock size={10} />
                                  {sub.slaHoras}h
                                </span>
                                {sub.exigeValidacao && (
                                  <span className="text-purple-500 flex items-center gap-1">
                                    <Shield size={10} /> Val.
                                  </span>
                                )}
                                {sub.exigeNotifResponsavel && (
                                  <span className="text-amber-500 flex items-center gap-1">
                                    <Bell size={10} /> Notif.
                                  </span>
                                )}
                                {sub.obrigatorioLegal && (
                                  <span className="text-red-500 font-medium flex items-center gap-1">
                                    <Shield size={10} /> Legal
                                  </span>
                                )}
                                {isAdmin && (
                                  isDeletingSub ? (
                                    <span className="flex items-center gap-2">
                                      <button
                                        onClick={() => desativarSubMut.mutate({ catId: cat.id, subId: sub.id })}
                                        disabled={desativarSubMut.isPending}
                                        className="text-red-600 font-semibold hover:text-red-800"
                                      >
                                        {desativarSubMut.isPending ? '...' : 'Confirmar'}
                                      </button>
                                      <button onClick={() => setConfirmDelSub(null)} className="text-gray-400 hover:text-gray-600">
                                        Cancelar
                                      </button>
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => setConfirmDelSub({ catId: cat.id, subId: sub.id })}
                                      className="text-gray-300 hover:text-red-500 transition-colors"
                                      title="Desativar subcategoria"
                                    >
                                      <X size={13} />
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Inline form nova subcategoria */}
                      {subForm && (
                        <div className="mt-3 bg-blue-50/60 border border-blue-100 rounded-xl p-4 space-y-3">
                          <p className="text-xs font-semibold text-blue-700">Nova subcategoria</p>

                          <input
                            type="text"
                            placeholder="Nome da subcategoria"
                            value={subForm.form.nome}
                            onChange={e => setSubFormState(s => s ? { ...s, form: { ...s.form, nome: e.target.value } } : s)}
                            className="w-full rounded-xl border border-blue-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                            autoFocus
                          />

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-blue-600 font-medium mb-1">Severidade padrão</label>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(n => (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() => setSubFormState(s => s ? { ...s, form: { ...s.form, severidadePadrao: n } } : s)}
                                    className={`flex-1 flex flex-col items-center gap-0.5 rounded-lg py-1.5 border text-xs font-medium transition-all ${
                                      subForm.form.severidadePadrao === n
                                        ? 'border-blue-500 bg-blue-100 text-blue-700'
                                        : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'
                                    }`}
                                    title={SEV_LABELS[n]}
                                  >
                                    <SeveridadeDot n={n} />
                                    {n}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-blue-600 font-medium mb-1">SLA</label>
                              <select
                                value={subForm.form.slaHoras}
                                onChange={e => setSubFormState(s => s ? { ...s, form: { ...s.form, slaHoras: Number(e.target.value) } } : s)}
                                className="w-full rounded-xl border border-blue-200 bg-white px-2 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              >
                                {SLA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4">
                            {[
                              { key: 'exigeValidacao',       label: 'Exige validação' },
                              { key: 'exigeNotifResponsavel', label: 'Notif. responsável' },
                              { key: 'obrigatorioLegal',      label: 'Obrigatório legal' },
                            ].map(({ key, label }) => (
                              <label key={key} className="flex items-center gap-2 cursor-pointer text-xs text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={!!subForm.form[key as keyof typeof subForm.form]}
                                  onChange={e => setSubFormState(s => s ? { ...s, form: { ...s.form, [key]: e.target.checked } } : s)}
                                  className="rounded"
                                />
                                {label}
                              </label>
                            ))}
                          </div>

                          {subForm.error && (
                            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-2">
                              <AlertCircle size={13} />
                              {subForm.error}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={() => criarSubMut.mutate({ catId: cat.id, payload: subForm.form })}
                              disabled={criarSubMut.isPending || !canSubmitSub}
                              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {criarSubMut.isPending ? 'Criando...' : 'Criar subcategoria'}
                            </button>
                            <button
                              onClick={() => setSubFormState(null)}
                              className="rounded-xl border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Ações da categoria */}
                    {isAdmin && (
                      <div className="pt-2 border-t border-gray-100">
                        {confirmDel === cat.id ? (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600">Desativar categoria <strong>{cat.nome}</strong>?</span>
                            <button
                              onClick={() => desativarCatMut.mutate(cat.id)}
                              disabled={desativarCatMut.isPending}
                              className="text-sm text-red-600 font-semibold hover:text-red-800"
                            >
                              {desativarCatMut.isPending ? 'Desativando...' : 'Confirmar'}
                            </button>
                            <button onClick={() => setConfirmDel(null)} className="text-sm text-gray-400 hover:text-gray-600">
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDel(cat.id)}
                            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                            Desativar categoria
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
