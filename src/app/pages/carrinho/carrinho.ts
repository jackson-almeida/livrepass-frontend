import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { PurchaseData, PurchaseService } from '../../services/purchase.service';
import { ProductSelectionService } from '../../services/product-selection.service';
import { ProductSelection } from '../../models/product.model';

@Component({
  selector: 'app-carrinho',
  imports: [CommonModule, RouterLink, CardModule, ButtonModule, CurrencyPipe],
  templateUrl: './carrinho.html',
  styleUrl: './carrinho.scss'
})
export class CarrinhoComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly purchaseService = inject(PurchaseService);
  private readonly productSelectionService = inject(ProductSelectionService);

  purchaseData = signal<PurchaseData | null>(null);
  productSelections = this.productSelectionService.selections();

  ticketsSubtotal = computed(() => this.purchaseData()?.total ?? 0);
  productsSubtotal = computed(() => this.productSelectionService.getTotalAmount());
  orderTotal = computed(() => this.ticketsSubtotal() + this.productsSubtotal());

  ngOnInit(): void {
    this.purchaseData.set(this.purchaseService.getPurchase());
  }

  hasTickets(): boolean {
    const purchase = this.purchaseData();
    if (!purchase) {
      return false;
    }
    return purchase.categories.some((category) => category.quantity > 0);
  }

  removeProduct(selection: ProductSelection): void {
    this.productSelectionService.removeSelection(selection.productId, selection.availabilityId);
  }

  finalizarCompra() {
    this.router.navigate(['/pagamento']);
  }
}
