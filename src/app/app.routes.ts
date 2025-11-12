import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./layouts/auth-layout/auth-layout').then(m => m.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        loadComponent: () => import('./pages/auth/login/login').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./pages/auth/register/register').then(m => m.RegisterComponent)
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    loadComponent: () => import('./layouts/app-layout/app-layout').then(m => m.AppLayoutComponent),
    children: [
      {
        path: 'ingressos',
        loadComponent: () => import('./pages/ingressos/ingressos').then(m => m.IngressosComponent)
      },
      {
        path: 'carrinho',
        loadComponent: () => import('./pages/carrinho/carrinho').then(m => m.CarrinhoComponent)
      },
      {
        path: 'pagamento',
        loadComponent: () => import('./pages/pagamento/pagamento').then(m => m.PagamentoComponent),
        children: [
          {
            path: 'card',
            loadComponent: () => import('./pages/pagamento/pagamento-cartao/pagamento-cartao').then(m => m.PagamentoCartaoComponent)
          },
          {
            path: 'pix',
            loadComponent: () => import('./pages/pagamento/pagamento-pix/pagamento-pix').then(m => m.PagamentoPixComponent)
          }
        ]
      },
      {
        path: '',
        redirectTo: 'ingressos',
        pathMatch: 'full'
      }
    ]
  }
];
