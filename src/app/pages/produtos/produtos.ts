import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { Product, ProductAvailability, ProductSelection, ProductVariation } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { ProductSelectionService } from '../../services/product-selection.service';

interface ProductAvailabilityCard {
  key: string;
  product: Product;
  availability: ProductAvailability;
  variation?: ProductVariation;
  metadataValues: string[];
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
  productCards = signal<ProductAvailabilityCard[]>([]);
  loading = signal<boolean>(true);
  errorMessage = signal<string | null>(null);
  feedbackMessage = signal<string | null>(null);
  quantityState = signal<Record<string, number>>({});
  metadataSelection = signal<Record<string, string | null>>({});

  productSelections = this.selectionService.selections();
  productsTotal = computed(() => this.selectionService.getTotalAmount());

  ngOnInit(): void {
    this.loadProducts();
  }

  addToOrder(card: ProductAvailabilityCard) {
    if (this.isMetadataSelectionRequired(card) && !this.getSelectedMetadata(card.key)) {
      const label = this.getCardMetadataLabel(card) || 'uma opção disponivel';
      this.feedbackMessage.set(`Escolha ${label} antes de adicionar ao pedido.`);
      window.setTimeout(() => this.feedbackMessage.set(null), 4000);
      return;
    }

    const quantity = this.getCardQuantity(card.key);

    this.selectionService.addSelection(card.product, card.availability, quantity);
    this.feedbackMessage.set(`${card.product.name} foi adicionado ao pedido.`);
    window.setTimeout(() => this.feedbackMessage.set(null), 4000);
  }

  getCardMetadataLabel(card: ProductAvailabilityCard): string | null {
    return card.variation?.label ?? null;
  }

  getCardMetadataValues(card: ProductAvailabilityCard): string[] {
    return card.metadataValues;
  }

  getCardQuantity(cardKey: string): number {
    return this.quantityState()[cardKey] ?? 1;
  }

  updateCardQuantity(cardKey: string, quantity: number | string) {
    const parsedQuantity = typeof quantity === 'number' ? quantity : Number(quantity);
    const normalized = parsedQuantity && parsedQuantity > 0 ? Math.floor(parsedQuantity) : 1;

    this.quantityState.update((state) => ({
      ...state,
      [cardKey]: normalized,
    }));
  }

  getCardsForProduct(productId: string): ProductAvailabilityCard[] {
    return this.productCards().filter((card) => card.product.id === productId);
  }

  getMetadataOptions(card: ProductAvailabilityCard): string[] {
    return card.metadataValues;
  }

  getSelectedMetadata(cardKey: string): string | null {
    return this.metadataSelection()[cardKey] ?? null;
  }

  toggleMetadata(cardKey: string, value: string): void {
    this.metadataSelection.update((state) => {
      const current = state[cardKey] ?? null;
      const next = current === value ? null : value;
      return { ...state, [cardKey]: next };
    });
  }

  isMetadataSelectionRequired(card: ProductAvailabilityCard): boolean {
    return card.metadataValues.length > 0;
  }

  canAddCard(card: ProductAvailabilityCard): boolean {
    if (!this.isMetadataSelectionRequired(card)) {
      return true;
    }

    return !!this.getSelectedMetadata(card.key);
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
        const cards = this.buildProductCards(activeProducts);
        this.productCards.set(cards);
        this.seedQuantityState(cards);
        this.seedMetadataState(cards);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Não foi possível carregar os produtos disponíveis.');
        this.loading.set(false);
      },
    });
  }

  private buildProductCards(products: Product[]): ProductAvailabilityCard[] {
    const cards: ProductAvailabilityCard[] = [];

    for (const product of products) {
      const variationsById = new Map((product.variations || []).map((variation) => [variation.id, variation]));
      const availabilities = product.availabilities || [];

      for (const availability of availabilities) {
        const variation = availability.variationId ? variationsById.get(availability.variationId) : undefined;
        cards.push({
          key: `${product.id}::${availability.id}`,
          product,
          availability,
          variation,
          metadataValues: variation?.metadataValues ?? [],
        });
      }
    }

    return cards;
  }

  private seedQuantityState(cards: ProductAvailabilityCard[]): void {
    const state: Record<string, number> = {};
    cards.forEach((card) => {
      state[card.key] = 1;
    });
    this.quantityState.set(state);
  }

  private seedMetadataState(cards: ProductAvailabilityCard[]): void {
    const state: Record<string, string | null> = {};
    cards.forEach((card) => {
      state[card.key] = null;
    });
    this.metadataSelection.set(state);
  }
}
