import { CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, inject, OnInit, computed, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink, NavigationEnd } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Subscription, filter } from 'rxjs';
import { PurchaseService, PurchaseData } from '../../services/purchase.service';
import { ProductSelection } from '../../models/product.model';
import { ProductSelectionService } from '../../services/product-selection.service';
import { QueueAccessStore } from '../../services/queue-access.store';
import { WaitingRoomCardComponent } from '../../components/waiting-room-card/waiting-room-card';

@Component({
  selector: 'app-pagamento',
  imports: [CardModule, ButtonModule, RouterOutlet, RouterLink, CurrencyPipe, WaitingRoomCardComponent],
  templateUrl: './pagamento.html',
  styleUrl: './pagamento.scss'
})
export class PagamentoComponent implements OnInit, OnDestroy {
  router = inject(Router);
  purchaseService = inject(PurchaseService);
  productSelectionService = inject(ProductSelectionService);
  queueAccessStore = inject(QueueAccessStore);

  showSelection = true;
  purchaseData = signal<PurchaseData | null>(null);
  productSelections = this.productSelectionService.selections();
  productsTotal = computed(() => this.productSelectionService.getTotalAmount());
  grandTotal = computed(() => (this.purchaseData()?.total ?? 0) + this.productsTotal());
  queueState = this.queueAccessStore.state;
  queuePosition = this.queueAccessStore.position;
  queueErrorMessage = this.queueAccessStore.errorMessage;

  private routerEventsSub?: Subscription;

  ngOnInit() {
    // Carrega dados da compra
    const purchase = this.purchaseService.getPurchase();

    if (!purchase) {
      // Se não houver compra, redireciona para ingressos
      this.router.navigate(['/ingressos']);
      return;
    }

    this.purchaseData.set(purchase);

    // Verifica a URL atual
    this.checkRoute();

    // Escuta mudanças de rota
    this.routerEventsSub = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkRoute();
      });

    this.queueAccessStore.connect();
  }

  checkRoute() {
    const url = this.router.url;
    this.showSelection = url === '/pagamento';
  }

  selectPaymentMethod(method: 'card' | 'pix') {
    if (this.queueState() !== 'allowed') {
      return;
    }

    this.showSelection = false;
    this.router.navigate(['/pagamento', method]);
  }

  removeProduct(selection: ProductSelection) {
    this.productSelectionService.removeSelection(selection.productId, selection.availabilityId);
  }

  ngOnDestroy(): void {
    this.routerEventsSub?.unsubscribe();
  }

  retryQueueAccess(): void {
    this.queueAccessStore.retry();
  }

  forceQueueRefresh(): void {
    this.queueAccessStore.refresh();
  }
}
