import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterOutlet, RouterLink, NavigationEnd } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { filter } from 'rxjs';
import { PurchaseService, PurchaseData } from '../../services/purchase.service';
import { ProductSelection } from '../../models/product.model';
import { ProductSelectionService } from '../../services/product-selection.service';

@Component({
  selector: 'app-pagamento',
  imports: [CardModule, ButtonModule, RouterOutlet, RouterLink, CurrencyPipe],
  templateUrl: './pagamento.html',
  styleUrl: './pagamento.scss'
})
export class PagamentoComponent implements OnInit {
  router = inject(Router);
  purchaseService = inject(PurchaseService);
  productSelectionService = inject(ProductSelectionService);

  showSelection = true;
  purchaseData = signal<PurchaseData | null>(null);
  productSelections = this.productSelectionService.selections();
  productsTotal = computed(() => this.productSelectionService.getTotalAmount());
  grandTotal = computed(() => (this.purchaseData()?.total ?? 0) + this.productsTotal());

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
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkRoute();
    });
  }

  checkRoute() {
    const url = this.router.url;
    this.showSelection = url === '/pagamento';
  }

  selectPaymentMethod(method: 'card' | 'pix') {
    this.showSelection = false;
    this.router.navigate(['/pagamento', method]);
  }

  removeProduct(selection: ProductSelection) {
    this.productSelectionService.removeSelection(selection.productId, selection.availabilityId);
  }
}
