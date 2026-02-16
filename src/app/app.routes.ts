import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

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
        path: 'forgot-password',
        loadComponent: () => import('./pages/auth/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent)
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./pages/auth/reset-password/reset-password').then(m => m.ResetPasswordComponent)
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
        path: 'produtos',
        loadComponent: () => import('./pages/produtos/produtos').then(m => m.ProdutosComponent)
      },
      {
        path: 'compra/:id',
        loadComponent: () => import('./pages/compra/compra').then(m => m.CompraComponent),
        canActivate: [authGuard]
      },
      {
        path: 'carrinho',
        loadComponent: () => import('./pages/carrinho/carrinho').then(m => m.CarrinhoComponent),
        canActivate: [authGuard]
      },
      {
        path: 'meus-pedidos',
        loadComponent: () => import('./pages/meus-pedidos/meus-pedidos').then(m => m.MeusPedidosComponent),
        canActivate: [authGuard]
      },
      {
        path: 'confirmacao/:purchaseId',
        loadComponent: () => import('./pages/confirmacao/confirmacao').then(m => m.ConfirmacaoComponent),
        canActivate: [authGuard]
      },
      {
        path: 'ingressos-digitais/:purchaseId',
        loadComponent: () => import('./pages/ingressos-digitais/ingressos-digitais').then(m => m.IngressosDigitaisComponent),
        canActivate: [authGuard]
      },
      {
        path: 'pagamento',
        loadComponent: () => import('./pages/pagamento/pagamento').then(m => m.PagamentoComponent),
        canActivate: [authGuard],
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
