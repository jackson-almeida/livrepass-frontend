import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserPurchasesService, UserPurchase } from '../../services/user-purchases.service';
import { MessageService } from '../../services/message.service';

@Component({
  selector: 'app-meus-pedidos',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './meus-pedidos.html',
  styleUrl: './meus-pedidos.scss',
})
export class MeusPedidosComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  purchasesService = inject(UserPurchasesService);

  user = this.authService.user;
  activeTab = signal<'pending' | 'approved' | 'all'>('pending');
  selectedPurchase = signal<UserPurchase | null>(null);

  filteredPurchases = computed(() => {
    const tab = this.activeTab();
    switch (tab) {
      case 'pending':
        return this.purchasesService.pendingPurchases();
      case 'approved':
        return this.purchasesService.approvedPurchases();
      default:
        return this.purchasesService.purchases();
    }
  });

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: '/meus-pedidos' },
      });
      return;
    }
    this.purchasesService.loadAllPurchases();
  }

  setTab(tab: 'pending' | 'approved' | 'all'): void {
    this.activeTab.set(tab);
  }

  refreshPurchases(): void {
    this.purchasesService.loadAllPurchases();
  }

  async cancelPurchase(purchase: UserPurchase): Promise<void> {
    const confirmed = await this.messageService.confirm({
      title: 'Desistir da compra',
      message: 'Tem certeza que deseja desistir desta compra? Esta ação não pode ser desfeita.',
      confirmText: 'Desistir',
      cancelText: 'Cancelar',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700',
    });

    if (!confirmed) {
      return;
    }

    this.messageService.showLoading('Cancelando compra...');

    try {
      await this.purchasesService.cancelPurchase(purchase.purchaseId);
      this.messageService.success('Compra cancelada com sucesso');
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Erro ao cancelar compra. Tente novamente.';
      this.messageService.error(errorMessage);
    } finally {
      this.messageService.hideLoading();
    }
  }

  canCancelPurchase(purchase: UserPurchase): boolean {
    return this.purchasesService.canCancelPurchase(purchase);
  }

  goToPaymentDetails(purchase: UserPurchase): void {
    if (
      (purchase.status === 'pending' || purchase.status === 'in_process') &&
      purchase.paymentMethod === 'pix' &&
      purchase.pixCopyAndPaste
    ) {
      this.router.navigate(['/pagamento/pix'], {
        queryParams: { purchaseId: purchase.purchaseId },
      });
    }
  }

  goToReceipt(purchase: UserPurchase): void {
    this.router.navigate(['/confirmacao', purchase.purchaseId]);
  }

  goToTickets(purchase: UserPurchase): void {
    this.router.navigate(['/ingressos-digitais', purchase.purchaseId]);
  }

  isApproved(purchase: UserPurchase): boolean {
    return purchase.status === 'approved' || purchase.status === 'authorized';
  }

  copyPixCode(purchase: UserPurchase): void {
    if (purchase.pixCopyAndPaste) {
      navigator.clipboard.writeText(purchase.pixCopyAndPaste).then(() => {
        this.messageService.success('Código PIX copiado para a área de transferência!');
      }).catch(() => {
        this.messageService.error('Erro ao copiar código PIX. Tente novamente.');
      });
    }
  }

  isPixPending(purchase: UserPurchase): boolean {
    return (
      purchase.paymentMethod === 'pix' &&
      (purchase.status === 'pending' || purchase.status === 'in_process') &&
      !!purchase.pixCopyAndPaste
    );
  }

  getTotalTickets(purchase: UserPurchase): number {
    return purchase.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  openPurchaseDetails(purchase: UserPurchase): void {
    this.selectedPurchase.set(purchase);
  }

  closePurchaseDetails(): void {
    this.selectedPurchase.set(null);
  }

  getQrCodeImage(purchase: UserPurchase): string | null {
    if (purchase.pixQrCodeBase64) {
      return `data:image/png;base64,${purchase.pixQrCodeBase64}`;
    }
    return null;
  }

  hasPixData(purchase: UserPurchase): boolean {
    return !!(purchase.pixQrCodeBase64 || purchase.pixCopyAndPaste || purchase.pixQrCode);
  }

  logout(): void {
    this.authService.logout();
  }
}
