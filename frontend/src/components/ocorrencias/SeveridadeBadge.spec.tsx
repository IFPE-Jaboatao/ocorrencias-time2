import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SeveridadeBadge } from './SeveridadeBadge';

describe('SeveridadeBadge', () => {
  it.each([
    [1, '1 — Informativa'],
    [2, '2 — Leve'],
    [3, '3 — Moderada'],
    [4, '4 — Grave'],
    [5, '5 — Gravíssima'],
  ])('severidade %i exibe o label correto', (sev, label) => {
    render(<SeveridadeBadge severidade={sev} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('deve usar o config de severidade 1 (fallback) para valor desconhecido', () => {
    render(<SeveridadeBadge severidade={99} />);
    // Fallback para CONFIG[1] — "Informativa"
    expect(screen.getByText('99 — Informativa')).toBeInTheDocument();
  });

  it('severidade 5 (Gravíssima) deve ter classe de cor vermelha', () => {
    const { container } = render(<SeveridadeBadge severidade={5} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('red');
  });

  it('severidade 1 (Informativa) deve ter classe de cor cinza', () => {
    const { container } = render(<SeveridadeBadge severidade={1} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('gray');
  });

  it('severidade 3 (Moderada) deve ter classe de cor amarela', () => {
    const { container } = render(<SeveridadeBadge severidade={3} />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('yellow');
  });

  it('deve renderizar o indicador ponto colorido (dot)', () => {
    const { container } = render(<SeveridadeBadge severidade={2} />);
    // O dot é um <span> filho com classes de cor
    const dots = container.querySelectorAll('span span');
    expect(dots.length).toBeGreaterThan(0);
  });
});
