import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './core/auth.interceptor';
import { routes } from './app.routes';
import { GD_DATE_FORMATS, GdDateAdapter } from './shared/gd-date-adapter';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { MAT_BUTTON_TOGGLE_DEFAULT_OPTIONS } from '@angular/material/button-toggle';
import { MAT_TABS_CONFIG } from '@angular/material/tabs';
import { DIALOG } from './shared/dialog';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimationsAsync(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
    { provide: DateAdapter, useClass: GdDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: GD_DATE_FORMATS },
    // Campo outline do template; o rótulo fica fora, acima da caixa (docs/design-system.md).
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline', subscriptSizing: 'dynamic' },
    },
    // Alternância usada como abas de filtro: sem o visto na opção escolhida.
    { provide: MAT_BUTTON_TOGGLE_DEFAULT_OPTIONS, useValue: { hideSingleSelectionIndicator: true, hideMultipleSelectionIndicator: true } },
    // Abas alinhadas à esquerda, sem esticar.
    { provide: MAT_TABS_CONFIG, useValue: { stretchTabs: false, alignTabs: 'start' } },
    // Todo modal usa a mesma casca (docs/design-system.md).
    { provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: { ...DIALOG, hasBackdrop: true } },
  ],
};
