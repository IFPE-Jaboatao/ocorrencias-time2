import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SlaIndicator } from './SlaIndicator';
import { addMinutes, addHours, addDays, subHours, formatISO } from 'date-fns';

// Helper: gera uma ISO string relativa ao momento atual
const iso = (d: Date) => formatISO(d);

describe('SlaIndicator', () => {
  // ── Casos onde não renderiza nada ────────────────────────────────────────

  it('não renderiza nada quando slaPrazo é null', () => {
    const { container } = render(<SlaIndicator slaPrazo={null} status="ABERTA" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('não renderiza nada quando status é RESOLVIDA', () => {
    const { container } = render(
      <SlaIndicator slaPrazo={iso(addHours(new Date(), 5))} status="RESOLVIDA" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('não renderiza nada quando status é ARQUIVADA', () => {
    const { container } = render(
      <SlaIndicator slaPrazo={iso(addHours(new Date(), 5))} status="ARQUIVADA" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  // ── SLA vencido ───────────────────────────────────────────────────────────

  it('exibe "SLA vencido" quando prazo já passou', () => {
    render(
      <SlaIndicator slaPrazo={iso(subHours(new Date(), 2))} status="ABERTA" />,
    );
    expect(screen.getByText('SLA vencido')).toBeInTheDocument();
  });

  it('badge de SLA vencido tem classe vermelha', () => {
    const { container } = render(
      <SlaIndicator slaPrazo={iso(subHours(new Date(), 1))} status="ABERTA" />,
    );
    expect(container.firstChild as HTMLElement).toHaveClass('bg-red-50');
  });

  // ── SLA crítico (< 60 minutos) ────────────────────────────────────────────

  it('exibe minutos quando faltam menos de 60 minutos', () => {
    render(
      <SlaIndicator slaPrazo={iso(addMinutes(new Date(), 45))} status="ABERTA" />,
    );
    // Usa regex para tolerar variação de ±1 min no tempo de execução do teste
    expect(screen.getByText(/^\d+m$/)).toBeInTheDocument();
  });

  it('badge crítico tem classe âmbar', () => {
    const { container } = render(
      <SlaIndicator slaPrazo={iso(addMinutes(new Date(), 45))} status="ABERTA" />,
    );
    expect(container.firstChild as HTMLElement).toHaveClass('bg-amber-50');
  });

  // ── SLA saudável ──────────────────────────────────────────────────────────

  it('exibe horas quando faltam entre 1h e 24h', () => {
    render(
      <SlaIndicator slaPrazo={iso(addHours(new Date(), 8))} status="ABERTA" />,
    );
    // Usa regex para tolerar variação de ±1 min
    expect(screen.getByText(/^\d+h$/)).toBeInTheDocument();
  });

  it('exibe dias quando faltam mais de 24h', () => {
    render(
      <SlaIndicator slaPrazo={iso(addDays(new Date(), 5))} status="ABERTA" />,
    );
    expect(screen.getByText(/^\d+d$/)).toBeInTheDocument();
  });

  it('badge saudável tem classe verde', () => {
    const { container } = render(
      <SlaIndicator slaPrazo={iso(addDays(new Date(), 2))} status="ABERTA" />,
    );
    expect(container.firstChild as HTMLElement).toHaveClass('bg-green-50');
  });

  // ── Status não-resolvidos devem exibir o indicador ────────────────────────

  it.each(['ABERTA', 'AGUARDANDO_VALIDACAO', 'EM_ACOMPANHAMENTO', 'REVISAO'])(
    'status "%s" deve renderizar o indicador',
    (status) => {
      const { container } = render(
        <SlaIndicator slaPrazo={iso(addHours(new Date(), 10))} status={status} />,
      );
      expect(container).not.toBeEmptyDOMElement();
    },
  );
});
