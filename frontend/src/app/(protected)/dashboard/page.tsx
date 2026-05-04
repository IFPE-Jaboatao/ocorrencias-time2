'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { SeveridadeBadge } from '@/components/ocorrencias/SeveridadeBadge';
import Link from 'next/link';

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const user = useCurrentUser();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  dashboardApi.resumo,
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Visão Geral</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Bem-vindo, {user?.nome} · {user?.campus}
        </p>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Carregando...</p>}
      {isError  && <p className="text-sm text-red-500">Erro ao carregar dados do dashboard.</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard label="Total de ocorrências"       value={data.total}               color="text-gray-900" />
            <StatCard label="Abertas"                    value={data.abertas}              color="text-blue-600" />
            <StatCard label="Aguardando validação"       value={data.aguardandoValidacao}  color="text-yellow-600" />
            <StatCard label="Em acompanhamento"          value={data.emAcompanhamento}     color="text-purple-600" />
            <StatCard label="Resolvidas hoje"            value={data.resolvidasHoje}       color="text-green-600" />
            <StatCard label="SLA vencidas"               value={data.slaVencidas}          color="text-red-600" />
          </div>

          {data.porSeveridade && Object.keys(data.porSeveridade).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-medium text-gray-700 mb-3">Por severidade</h2>
              <div className="flex flex-wrap gap-3">
                {([1, 2, 3, 4, 5] as const).map(sev => (
                  <div key={sev} className="flex items-center gap-2">
                    <SeveridadeBadge severidade={sev} />
                    <span className="text-sm font-medium text-gray-700">
                      {data.porSeveridade[sev] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex gap-3">
        <Link
          href="/ocorrencias"
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Ver todas as ocorrências
        </Link>
        <Link
          href="/ocorrencias/nova"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Registrar ocorrência
        </Link>
      </div>
    </div>
  );
}
