import { CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, inject, OnInit, computed, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { CartReservationService, CartReservation } from '../../services/cart-reservation.service';
import { ProductSelection } from '../../models/product.model';
import { ProductSelectionService } from '../../services/product-selection.service';
import { QueueAccessStore } from '../../services/queue-access.store';
import { WaitingRoomCardComponent } from '../../components/waiting-room-card/waiting-room-card';

@Component({
  selector: 'app-pagamento',
  imports: [RouterOutlet, RouterLink, CurrencyPipe, WaitingRoomCardComponent],
  templateUrl: './pagamento.html',
  styleUrl: './pagamento.scss'
})
export class PagamentoComponent implements OnInit, OnDestroy {
  router = inject(Router);
  cartReservationService = inject(CartReservationService);
  productSelectionService = inject(ProductSelectionService);
  queueAccessStore = inject(QueueAccessStore);

  showSelection = true;
  reservation = this.cartReservationService.reservation;
  remainingFormatted = this.cartReservationService.remainingFormatted;
  remainingSeconds = this.cartReservationService.remainingSeconds;
  isExpired = this.cartReservationService.isExpired;

  productSelections = this.productSelectionService.selections();
  productsTotal = computed(() => this.productSelectionService.getTotalAmount());
  ticketsTotal = computed(() => {
    const res = this.reservation();
    return res ? parseFloat(res.totalAmount) : 0;
  });
  grandTotal = computed(() => this.ticketsTotal() + this.productsTotal());
  queueState = this.queueAccessStore.state;
  queuePosition = this.queueAccessStore.position;
  queueErrorMessage = this.queueAccessStore.errorMessage;

  private routerEventsSub?: Subscription;

  ngOnInit() {
    if (!this.reservation()) {
      this.cartReservationService.loadActiveCart().then((cart) => {
        if (!cart) {
          this.router.navigate(['/ingressos']);
        }
      });
    }

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

    if (this.isExpired()) {
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

  timerUrgency(): 'normal' | 'warning' | 'critical' {
    const secs = this.remainingSeconds();
    if (secs <= 60) return 'critical';
    if (secs <= 300) return 'warning';
    return 'normal';
  }
}
