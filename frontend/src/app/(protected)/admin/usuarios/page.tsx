'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usuariosApi, type CreateUsuarioPayload } from '@/lib/api/usuarios.api';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import type { PerfilUsuario, Segmento } from '@/types/ocorrencia.types';
import {
  Users, Plus, UserX, ChevronDown, AlertCircle,
  Shield, Mail, Building2, BookOpen, X, Check,
} from 'lucide-react';

const PERFIL_LABEL: Record<string, string> = {
  PROFESSOR:         'Professor',
  COORDENADOR:       'Coordenador',
  EQUIPE_PEDAGOGICA: 'Equipe Pedagógica',
  DIRETOR:           'Diretor',
  SECRETARIA:        'Secretaria',
  ADMIN:             'Administrador',
};

const PERFIL_COR: Record<string, string> = {
  PROFESSOR:         'bg-blue-50 text-blue-700 ring-blue-200',
  COORDENADOR:       'bg-purple-50 text-purple-700 ring-purple-200',
  EQUIPE_PEDAGOGICA: 'bg-teal-50 text-teal-700 ring-teal-200',
  DIRETOR:           'bg-amber-50 text-amber-700 ring-amber-200',
  SECRETARIA:        'bg-gray-100 text-gray-600 ring-gray-200',
  ADMIN:             'bg-red-50 text-red-700 ring-red-200',
};

const SEGMENTO_LABEL: Record<string, string> = {
  FUNDAMENTAL: 'Fundamental',
  MEDIO:       'Médio',
  SUPERIOR:    'Superior',
};

const PERFIS: PerfilUsuario[] = [
  'PROFESSOR', 'COORDENADOR', 'EQUIPE_PEDAGOGICA', 'DIRETOR', 'SECRETARIA', 'ADMIN',
];

const SEGMENTOS: Segmento[] = ['FUNDAMENTAL', 'MEDIO', 'SUPERIOR'];

const CAMPI = ['Campus A', 'Campus B', 'Campus C'];

function initForm(): CreateUsuarioPayload {
  return { nome: '', email: '', perfil: 'PROFESSOR', campus: 'Campus A', segmentosResponsaveis: [] };
}

export default function UsuariosAdminPage() {
  const user = useCurrentUser();
  const qc   = useQueryClient();

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn:  usuariosApi.listar,
  });

  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState<CreateUsuarioPayload>(initForm());
  const [formError, setFormError]     = useState('');
  const [success, setSuccess]         = useState('');
  const [editPerfil, setEditPerfil]   = useState<{ id: string; perfil: PerfilUsuario } | null>(null);
  const [confirmDel, setConfirmDel]   = useState<string | null>(null);

  const isAdmin = user?.perfil === 'ADMIN';

  const criarMut = useMutation({
    mutationFn: () => usuariosApi.criar(form),
    onSuccess: u => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      setShowForm(false); setForm(initForm()); setFormError('');
      setSuccess(`Usuário "${u.nome}" criado com sucesso.`);
      setTimeout(() => setSuccess(''), 4000);
    },
    onError: (e: unknown) => setFormError(e instanceof Error ? e.message : 'Erro ao criar usuário.'),
  });

  const alterarPerfilMut = useMutation({
    mutationFn: () => usuariosApi.alterarPerfil(editPerfil!.id, editPerfil!.perfil),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); setEditPerfil(null); },
  });

  const desativarMut = useMutation({
    mutationFn: (id: string) => usuariosApi.desativar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); setConfirmDel(null); },
  });

  function toggleSegmento(seg: Segmento) {
    setForm(f => ({
      ...f,
      segmentosResponsaveis: f.segmentosResponsaveis?.includes(seg)
        ? f.segmentosResponsaveis.filter(s => s !== seg)
        : [...(f.segmentosResponsaveis ?? []), seg],
    }));
  }

  const canSubmit = form.nome.trim().length >= 3
    && form.email.includes('@')
    && form.campus.trim().length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={22} className="text-gray-400" />
            Gestão de Usuários
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} ativo{usuarios.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setShowForm(v => !v); setFormError(''); }}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus size={16} />
            Novo usuário
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

      {/* Formulário de criação */}
      {showForm && isAdmin && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Novo usuário</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Nome completo *</label>
              <input
                type="text"
                placeholder="Ex: Maria Silva"
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">E-mail institucional *</label>
              <input
                type="email"
                placeholder="Ex: maria@escola.edu.br"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Perfil *</label>
              <select
                value={form.perfil}
                onChange={e => setForm(f => ({ ...f, perfil: e.target.value as PerfilUsuario }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PERFIS.map(p => <option key={p} value={p}>{PERFIL_LABEL[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Campus *</label>
              <select
                value={form.campus}
                onChange={e => setForm(f => ({ ...f, campus: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CAMPI.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Segmentos de atuação</label>
            <div className="flex flex-wrap gap-2">
              {SEGMENTOS.map(seg => {
                const selected = form.segmentosResponsaveis?.includes(seg);
                return (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => toggleSegmento(seg)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-all ${
                      selected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {SEGMENTO_LABEL[seg]}
                  </button>
                );
              })}
            </div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
              <AlertCircle size={15} />
              {formError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => criarMut.mutate()}
              disabled={criarMut.isPending || !canSubmit}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
            >
              {criarMut.isPending ? 'Criando...' : 'Criar usuário'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(initForm()); setFormError(''); }}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de usuários */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : usuarios.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Nenhum usuário encontrado.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">Usuário</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Perfil</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Campus</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Segmentos</th>
                {isAdmin && <th className="px-4 py-3 w-24" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {u.nome.split(' ').slice(0, 2).map(n => n[0]).join('')}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{u.nome}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                          <Mail size={10} /> {u.email}
                        </p>
                      </div>
                    </div>
                    {/* Perfil visível no mobile */}
                    <div className="mt-1.5 md:hidden">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ring-1 ring-inset ${PERFIL_COR[u.perfil] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
                        {PERFIL_LABEL[u.perfil] ?? u.perfil}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    {isAdmin && editPerfil?.id === u.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editPerfil.perfil}
                          onChange={e => setEditPerfil({ id: u.id, perfil: e.target.value as PerfilUsuario })}
                          className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {PERFIS.map(p => <option key={p} value={p}>{PERFIL_LABEL[p]}</option>)}
                        </select>
                        <button
                          onClick={() => alterarPerfilMut.mutate()}
                          disabled={alterarPerfilMut.isPending}
                          className="text-xs text-green-600 font-medium hover:text-green-800"
                        >
                          {alterarPerfilMut.isPending ? '...' : 'Salvar'}
                        </button>
                        <button onClick={() => setEditPerfil(null)} className="text-xs text-gray-400 hover:text-gray-600">
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => isAdmin ? setEditPerfil({ id: u.id, perfil: u.perfil }) : undefined}
                        disabled={!isAdmin}
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset transition-colors ${PERFIL_COR[u.perfil] ?? 'bg-gray-100 text-gray-600 ring-gray-200'} ${isAdmin ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                        title={isAdmin ? 'Clique para alterar o perfil' : undefined}
                      >
                        <Shield size={10} />
                        {PERFIL_LABEL[u.perfil] ?? u.perfil}
                        {isAdmin && <ChevronDown size={10} />}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <span className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Building2 size={13} className="text-gray-300" />
                      {u.campus}
                    </span>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {u.segmentosResponsaveis?.length > 0
                        ? u.segmentosResponsaveis.map(s => (
                            <span key={s} className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                              <BookOpen size={9} />
                              {SEGMENTO_LABEL[s] ?? s}
                            </span>
                          ))
                        : <span className="text-xs text-gray-300">—</span>
                      }
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-4 text-right">
                      {confirmDel === u.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs text-gray-400">Confirmar?</span>
                          <button
                            onClick={() => desativarMut.mutate(u.id)}
                            disabled={desativarMut.isPending}
                            className="text-xs text-red-600 font-semibold hover:text-red-800"
                          >
                            {desativarMut.isPending ? '...' : 'Sim'}
                          </button>
                          <button onClick={() => setConfirmDel(null)} className="text-xs text-gray-400 hover:text-gray-600">Não</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDel(u.id)}
                          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                          title="Desativar usuário"
                        >
                          <UserX size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center">
        O perfil controla o que cada usuário pode ver e fazer. O login é feito pelo e-mail institucional — o usuário nunca precisa de senha.
      </p>
    </div>
  );
}
