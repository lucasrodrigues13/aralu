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
      // Qualquer outro 401 com token enviado = sessão expirada: volta direto para entrar.
      if (token && erro instanceof HttpErrorResponse && erro.status === 401) {
        const aviso = erro.error?.code === 'acesso_removido' ? 'acesso-removido' : 'sessao-expirada';
        auth.sair();
        void router.navigate(['/entrar'], { queryParams: { aviso } });
      }

      // SPEC-062 §7: conta fora do prazo vai para a tela de bloqueio, em qualquer página.
      if (token && erro instanceof HttpErrorResponse && erro.status === 402 && erro.error?.code === 'conta_bloqueada') {
        void router.navigate(['/conta-bloqueada']);
      }

      return throwError(() => erro);
    }),
  );
};
