/** Estilo do texto corrido das páginas de Termos de uso e Política de privacidade. */
export const ESTILOS_LEGAL = `
  .prosa { display: grid; gap: 16px; padding-top: 12px; }
  .prosa h2 { font-size: 20px; line-height: 28px; font-weight: 600; margin: 24px 0 0; }
  .prosa p, .prosa li { margin: 0; text-wrap: pretty; }
  .prosa ul { list-style: disc; padding-left: 24px; margin: 0; display: grid; gap: 8px; }
  .prosa a { color: var(--mat-sys-primary); }
  .prosa table { width: 100%; border-collapse: collapse; font-size: 14px; line-height: 20px; }
  .prosa th, .prosa td { text-align: left; vertical-align: top; padding: 12px 12px 12px 0; border-bottom: 1px solid var(--mat-sys-outline-variant); }
  .prosa th { font-weight: 600; }
  .rolagem { overflow-x: auto; }
`;
