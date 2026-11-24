// Larguras de modal (docs/design-system.md).
const BASE = {
  panelClass: 'aralu-dialog',
  maxWidth: 'calc(100vw - 32px)',
  maxHeight: '90vh',
  autoFocus: 'first-tabbable' as const,
};

/** Modal padrão: 560px. */
export const DIALOG = { ...BASE, width: 'min(560px, calc(100vw - 32px))' };

/** Confirmação e campo único: 448px. */
export const DIALOG_PEQUENO = { ...BASE, width: 'min(448px, calc(100vw - 32px))' };

/** Cadastro com abas: 840px. */
export const DIALOG_LARGO = { ...BASE, width: 'min(840px, calc(100vw - 32px))' };

/** Grade de "Adicionar tarefas em massa" (SPEC-012 v3 §6.4): 1100px. */
export const DIALOG_EM_MASSA = { ...BASE, width: 'min(1100px, calc(100vw - 32px))' };
