import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();
  const conta = auth.ehAdmin() ? auth.contaSelecionada() : null;
  const cabecalhos: Record<string, string> = {};
  if (token) {
    cabecalhos['Authorization'] = `Bearer ${token}`;
  }

  if (token && conta) {
    cabecalhos['X-Aralu-Conta'] = conta.id;
  }

  const pedido = token ? req.clone({ setHeaders: cabecalhos }) : req;
  return next(pedido).pipe(
    catchError((erro: unknown) => {
      // SPEC-032 §6.5: a assistente removida cai na tela de entrar no próximo pedido.
      if (erro instanceof HttpErrorResponse && erro.status === 401 && erro.error?.code === 'acesso_removido') {
        auth.sair();
        void router.navigate(['/entrar'], { queryParams: { aviso: 'acesso-removido' } });
      }

      return throwError(() => erro);
    }),
  );
};
