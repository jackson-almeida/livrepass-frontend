import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { Product, ProductAvailability, ProductSelection } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { ProductSelectionService } from '../../services/product-selection.service';

interface ProductSelectionState {
  availabilityId: string | null;
  quantity: number;
}

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    SelectModule,
    InputNumberModule,
    CurrencyPipe,
  ],
  templateUrl: './produtos.html',
  styleUrl: './produtos.scss',
})
export class ProdutosComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly selectionService = inject(ProductSelectionService);

  products = signal<Product[]>([]);
  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  feedbackMessage = signal<string | null>(null);
  selectionState = signal<Record<string, ProductSelectionState>>({});

  productSelections = this.selectionService.selections();
  productsTotal = computed(() => this.selectionService.getTotalAmount());

  ngOnInit(): void {
    this.loadProducts();
  }

  getSelectedAvailability(product: Product): ProductAvailability | undefined {
    const state = this.selectionState()[product.id];
    if (!state?.availabilityId) {
      return product.availabilities?.[0];
    }
    return product.availabilities?.find((item) => item.id === state.availabilityId);
  }

  onAvailabilityChange(productId: string, availabilityId: string | null) {
    this.selectionState.update((state) => ({
      ...state,
      [productId]: {
        availabilityId,
        quantity: state[productId]?.quantity ?? 1,
      },
    }));
  }

  onQuantityChange(productId: string, quantity: number) {
    this.selectionState.update((state) => ({
      ...state,
      [productId]: {
        availabilityId: state[productId]?.availabilityId ?? null,
        quantity: Math.max(1, Math.floor(quantity || 1)),
      },
    }));
  }

  addToOrder(product: Product) {
    const state = this.selectionState();
    const selection = state[product.id];

    if (!selection?.availabilityId) {
      this.feedbackMessage.set('Escolha uma variação para adicionar ao pedido.');
      return;
    }

    const availability = product.availabilities?.find((item) => item.id === selection.availabilityId);
    if (!availability) {
      this.feedbackMessage.set('Esta variação não está mais disponível.');
      return;
    }

    this.selectionService.addSelection(product, availability, selection.quantity || 1);
    this.feedbackMessage.set(`${product.name} foi adicionado ao pedido.`);
    window.setTimeout(() => this.feedbackMessage.set(null), 4000);
  }

  removeSelection(productId: string, availabilityId: string): void {
    this.selectionService.removeSelection(productId, availabilityId);
  }

  updateSelectionQuantity(selection: ProductSelection, quantity: number | string) {
    const parsedQuantity = typeof quantity === 'number' ? quantity : Number(quantity);

    if (!parsedQuantity || parsedQuantity <= 0) {
      this.selectionService.removeSelection(selection.productId, selection.availabilityId);
      return;
    }

    this.selectionService.updateQuantity(selection.productId, selection.availabilityId, parsedQuantity);
  }

  private loadProducts(): void {
    this.loading.set(true);
    this.productService.getProducts().subscribe({
      next: (products) => {
        const activeProducts = products.filter((product) => product.isActive !== false);
        this.products.set(activeProducts);
        this.seedSelectionState(activeProducts);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Não foi possível carregar os produtos disponíveis.');
        this.loading.set(false);
      },
    });
  }

  private seedSelectionState(products: Product[]): void {
    const state: Record<string, ProductSelectionState> = {};
    products.forEach((product) => {
      const availability = product.availabilities?.[0];
      state[product.id] = {
        availabilityId: availability?.id ?? null,
        quantity: 1,
      };
    });

    this.selectionState.set(state);
  }
}
