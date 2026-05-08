'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { alunosApi } from '@/lib/api/alunos.api';

const SEGMENTOS = [
  { value: 'FUNDAMENTAL', label: 'Ensino Fundamental' },
  { value: 'MEDIO',       label: 'Ensino Médio' },
  { value: 'SUPERIOR',    label: 'Ensino Superior' },
];

interface FormData {
  matricula:      string;
  nome:           string;
  dataNascimento: string;
  segmento:       string;
  campus:         string;
  curso:          string;
  turma:          string;
}

const INITIAL: FormData = {
  matricula: '', nome: '', dataNascimento: '',
  segmento: '', campus: '', curso: '', turma: '',
};

export default function NovoAlunoPage() {
  const router  = useRouter();
  const [form, setForm]   = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const { data: opcoes } = useQuery({
    queryKey: ['alunos-opcoes'],
    queryFn:  alunosApi.getOpcoes,
    staleTime: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: () => alunosApi.criar(form as any),
    onSuccess: (aluno) => {
      router.push(`/alunos/${aluno.id}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      if (Array.isArray(msg)) {
        // class-validator returns array of strings
        const errsObj: Partial<FormData> = {};
        msg.forEach((m: string) => {
          const field = Object.keys(INITIAL).find(k => m.toLowerCase().includes(k.toLowerCase()));
          if (field) errsObj[field as keyof FormData] = m;
        });
        setErrors(errsObj);
      }
    },
  });

  function validate(): boolean {
    const e: Partial<FormData> = {};
    if (!form.matricula.trim()) e.matricula = 'Matrícula é obrigatória';
    if (!form.nome.trim())      e.nome      = 'Nome é obrigatório';
    if (!form.dataNascimento)   e.dataNascimento = 'Data de nascimento é obrigatória';
    if (!form.segmento)         e.segmento  = 'Segmento é obrigatório';
    if (!form.campus.trim())    e.campus    = 'Campus é obrigatório';
    if (!form.curso.trim())     e.curso     = 'Curso é obrigatório';
    if (!form.turma.trim())     e.turma     = 'Turma é obrigatória';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleChange(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  }

  const apiError = mutation.isError
    ? ((mutation.error as any)?.response?.data?.message ?? 'Erro ao cadastrar aluno.')
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center gap-3">
        <Link href="/alunos" className="text-gray-400 hover:text-gray-600 transition-colors p-1">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cadastrar Aluno</h1>
          <p className="text-sm text-gray-500 mt-0.5">Preencha os dados para registrar um novo aluno no sistema</p>
        </div>
      </div>

      {/* ── Erro global da API ── */}
      {typeof apiError === 'string' && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* ── Formulário ── */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Matrícula */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Matrícula <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.matricula}
              onChange={e => handleChange('matricula', e.target.value)}
              placeholder="Ex: 2025001"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${errors.matricula ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
            />
            {errors.matricula && <p className="text-xs text-red-600 mt-1">{errors.matricula}</p>}
          </div>

          {/* Data de Nascimento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data de Nascimento <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.dataNascimento}
              onChange={e => handleChange('dataNascimento', e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${errors.dataNascimento ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
            />
            {errors.dataNascimento && <p className="text-xs text-red-600 mt-1">{errors.dataNascimento}</p>}
          </div>
        </div>

        {/* Nome completo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome Completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.nome}
            onChange={e => handleChange('nome', e.target.value)}
            placeholder="Ex: João Santos Oliveira"
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${errors.nome ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
          />
          {errors.nome && <p className="text-xs text-red-600 mt-1">{errors.nome}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Segmento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Segmento <span className="text-red-500">*</span>
            </label>
            <select
              value={form.segmento}
              onChange={e => handleChange('segmento', e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${errors.segmento ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
            >
              <option value="">Selecione…</option>
              {SEGMENTOS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {errors.segmento && <p className="text-xs text-red-600 mt-1">{errors.segmento}</p>}
          </div>

          {/* Campus */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campus <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              list="lista-campi"
              value={form.campus}
              onChange={e => handleChange('campus', e.target.value)}
              placeholder="Ex: Campus A"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${errors.campus ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
            />
            <datalist id="lista-campi">
              {opcoes?.campi.map(c => <option key={c} value={c} />)}
            </datalist>
            {errors.campus && <p className="text-xs text-red-600 mt-1">{errors.campus}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Curso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Curso <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              list="lista-cursos"
              value={form.curso}
              onChange={e => handleChange('curso', e.target.value)}
              placeholder="Ex: Técnico em Informática"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${errors.curso ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
            />
            <datalist id="lista-cursos">
              {opcoes?.cursos.map(c => <option key={c} value={c} />)}
            </datalist>
            {errors.curso && <p className="text-xs text-red-600 mt-1">{errors.curso}</p>}
          </div>

          {/* Turma */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Turma <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.turma}
              onChange={e => handleChange('turma', e.target.value)}
              placeholder="Ex: 3ºA"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${errors.turma ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
            />
            {errors.turma && <p className="text-xs text-red-600 mt-1">{errors.turma}</p>}
          </div>
        </div>

        {/* ── Ações ── */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <Link
            href="/alunos"
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            <Save size={15} />
            {mutation.isPending ? 'Salvando…' : 'Cadastrar Aluno'}
          </button>
        </div>
      </form>
    </div>
  );
}
