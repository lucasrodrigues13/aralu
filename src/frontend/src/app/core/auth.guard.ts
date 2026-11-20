import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';
import { ContaClient } from './conta.client';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.autenticado() ? true : router.createUrlTree(['/entrar']);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.autenticado()) {
    return router.createUrlTree(['/entrar']);
  }

  return auth.ehAdmin() ? true : router.createUrlTree(['/hoje']);
};

/** Só a dona (Perfil, Contratos da conta, Assistentes): a assistente vai para "sem acesso" (SPEC-032 §7). */
export const donaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.autenticado()) {
    return router.createUrlTree(['/entrar']);
  }

  return auth.ehAssistente() ? router.createUrlTree(['/sem-acesso']) : true;
};

/** Financeiro: a dona sempre; a assistente só com "pode ver o financeiro". Lê as permissões do servidor. */
export const financeiroGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const conta = inject(ContaClient);
  if (!auth.autenticado()) {
    return router.createUrlTree(['/entrar']);
  }

  if (!auth.ehAssistente()) {
    return true;
  }

  return conta.areaUsuario().pipe(
    map((area) => {
      auth.permissoes.set({ podeVerFinanceiro: !!area.podeVerFinanceiro, somenteDela: !!area.somenteDela, usuarioId: area.usuarioId });
      return area.podeVerFinanceiro ? true : router.createUrlTree(['/sem-acesso']);
    }),
    catchError(() => of(router.createUrlTree(['/sem-acesso']))),
  );
};
