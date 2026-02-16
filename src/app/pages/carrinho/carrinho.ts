import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CartReservationService, CartReservation } from '../../services/cart-reservation.service';
import { ProductSelectionService } from '../../services/product-selection.service';
import { ProductSelection } from '../../models/product.model';
import { CartItemComponent } from '../../components/cart-item/cart-item';
import { AuthService } from '../../services/auth.service';
import { UserPurchasesService, UserPurchase } from '../../services/user-purchases.service';

@Component({
  selector: 'app-carrinho',
  imports: [CommonModule, RouterLink, CurrencyPipe, DatePipe, CartItemComponent, FormsModule],
  templateUrl: './carrinho.html',
  styleUrl: './carrinho.scss'
})
export class CarrinhoComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly cartReservationService = inject(CartReservationService);
  private readonly productSelectionService = inject(ProductSelectionService);
  private readonly authService = inject(AuthService);
  private readonly purchasesService = inject(UserPurchasesService);

  reservation = this.cartReservationService.reservation;
  pendingPurchasesForEvent = signal<UserPurchase[]>([]);
  remainingFormatted = this.cartReservationService.remainingFormatted;
  remainingSeconds = this.cartReservationService.remainingSeconds;
  isExpired = this.cartReservationService.isExpired;
  loading = this.cartReservationService.loading;
  error = this.cartReservationService.error;
  participants = this.cartReservationService.participants;

  productSelections = this.productSelectionService.selections();

  // User data for import
  user = this.authService.user;
  isLoggedIn = this.authService.isLoggedIn;
  canImportUserData = computed(() => {
    return this.isLoggedIn() && !!this.user();
  });

  ticketsSubtotal = computed(() => {
    const res = this.reservation();
    return res ? parseFloat(res.totalAmount) : 0;
  });
  productsSubtotal = computed(() => this.productSelectionService.getTotalAmount());
  orderTotal = computed(() => this.ticketsSubtotal() + this.productsSubtotal());

  documentTypes = [
    { label: 'CPF', value: 'CPF' },
    { label: 'RG', value: 'RG' },
    { label: 'CNH', value: 'CNH' },
    { label: 'Passaporte', value: 'PASSAPORTE' },
  ];

  ngOnInit(): void {
    if (!this.reservation()) {
      this.cartReservationService.loadActiveCart().then((cart) => {
        if (!cart) {
          this.router.navigate(['/ingressos']);
        } else {
          this.checkPendingPurchases(cart.eventId);
        }
      });
    } else {
      this.checkPendingPurchases(this.reservation()!.eventId);
    }
  }

  private async checkPendingPurchases(eventId: number): Promise<void> {
    if (!this.authService.isLoggedIn()) return;
    try {
      const pending = await this.purchasesService.loadPendingForEvent(eventId);
      this.pendingPurchasesForEvent.set(pending);
    } catch {
      // non-critical
    }
  }

  goToMyOrders(): void {
    this.router.navigate(['/meus-pedidos']);
  }

  copyPixCode(code: string): void {
    navigator.clipboard.writeText(code);
  }

  ngOnDestroy(): void {

  }

  hasTickets(): boolean {
    const res = this.reservation();
    return !!res && res.items.some((item) => item.quantity > 0);
  }

  removeProduct(selection: ProductSelection): void {
    this.productSelectionService.removeSelection(selection.productId, selection.availabilityId);
  }

  updateProductQuantity(event: { item: ProductSelection; quantity: number }): void {
    if (event.quantity <= 0) {
      this.removeProduct(event.item);
    } else {
      this.productSelectionService.updateQuantity(
        event.item.productId,
        event.item.availabilityId,
        event.quantity
      );
    }
  }

  onParticipantChange(index: number, field: string, value: string): void {
    this.cartReservationService.updateParticipant(index, { [field]: value });
  }

  canProceed(): boolean {
    return (
      this.hasTickets() &&
      !this.isExpired() &&
      this.cartReservationService.allParticipantsFilled()
    );
  }

  async cancelarReserva() {
    await this.cartReservationService.cancelReservation();
    this.router.navigate(['/ingressos']);
  }

  finalizarCompra() {
    if (!this.canProceed()) return;
    this.router.navigate(['/pagamento']);
  }

  timerUrgency(): 'normal' | 'warning' | 'critical' {
    const secs = this.remainingSeconds();
    if (secs <= 60) return 'critical';
    if (secs <= 300) return 'warning';
    return 'normal';
  }

  importUserDataToParticipant1(): void {
    const user = this.authService.getUser();
    if (!user) return;

    const participantData: Partial<{ documentType: string; documentNumber: string; name: string; email: string }> = {
      name: user.name || '',
      email: user.email || '',
    };

    if (user.cpf) {
      participantData.documentType = 'CPF';
      participantData.documentNumber = user.cpf;
    }

    this.cartReservationService.updateParticipant(0, participantData);
  }

}
