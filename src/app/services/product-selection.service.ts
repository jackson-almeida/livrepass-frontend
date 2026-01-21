import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ProductService } from './product.service';
import {
  Product,
  ProductAvailability,
  ProductPurchaseCustomer,
  ProductSelection,
  ProductSaleReference,
} from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductSelectionService {
  private readonly STORAGE_KEY = 'lp_product_selections';
  private readonly selectionsSignal = signal<ProductSelection[]>(this.loadFromStorage());
  private readonly productService = inject(ProductService);

  selections() {
    return this.selectionsSignal.asReadonly();
  }

  hasSelections(): boolean {
    return this.selectionsSignal().length > 0;
  }

  getTotalAmount(): number {
    return this.selectionsSignal().reduce((total, selection) => total + selection.unitPrice * selection.quantity, 0);
  }

  addSelection(product: Product, availability: ProductAvailability, quantity: number): void {
    if (!quantity || quantity <= 0) {
      return;
    }

    const maxPerPurchase = availability.maxPerPurchase ?? undefined;
    const normalizedQuantity = this.normalizeQuantity(quantity, maxPerPurchase);

    this.selectionsSignal.update((current) => {
      const existingIndex = current.findIndex(
        (item) => item.productId === product.id && item.availabilityId === availability.id,
      );

      if (existingIndex >= 0) {
        const updated = this.cloneSelections(current);
        const existing = updated[existingIndex];
        const newQuantity = this.normalizeQuantity(existing.quantity + normalizedQuantity, maxPerPurchase);
        updated[existingIndex] = {
          ...existing,
          quantity: newQuantity,
          unitPrice: availability.price ?? existing.unitPrice,
          maxPerPurchase: maxPerPurchase ?? existing.maxPerPurchase,
          saleId: undefined,
        };
        return updated;
      }

      return [
        ...current,
        {
          productId: product.id,
          productName: product.name,
          availabilityId: availability.id,
          availabilityLabel: availability.label,
          unitPrice: availability.price ?? 0,
          quantity: normalizedQuantity,
          imageUrl: product.imageUrl,
          maxPerPurchase,
        },
      ];
    });

    this.persistSelections();
  }

  updateQuantity(productId: string, availabilityId: string, quantity: number): void {
    if (quantity < 0) {
      quantity = 0;
    }

    this.selectionsSignal.update((current) => {
      const updated = this.cloneSelections(current);
      const index = updated.findIndex(
        (item) => item.productId === productId && item.availabilityId === availabilityId,
      );

      if (index === -1) {
        return current;
      }

      if (quantity === 0) {
        updated.splice(index, 1);
        return updated;
      }

      const normalizedQuantity = this.normalizeQuantity(quantity, updated[index].maxPerPurchase);

      updated[index] = {
        ...updated[index],
        quantity: normalizedQuantity,
        saleId: undefined,
      };

      return updated;
    });

    this.persistSelections();
  }

  removeSelection(productId: string, availabilityId: string): void {
    this.selectionsSignal.update((current) =>
      current.filter((item) => !(item.productId === productId && item.availabilityId === availabilityId)),
    );
    this.persistSelections();
  }

  clearSelections(): void {
    this.selectionsSignal.set([]);
    this.persistSelections();
  }

  async ensureSaleReservations(customer: ProductPurchaseCustomer, notes?: string): Promise<ProductSelection[]> {
    if (!this.hasSelections()) {
      return this.cloneSelections(this.selectionsSignal());
    }

    const updated = this.cloneSelections(this.selectionsSignal());

    for (const selection of updated) {
      if (selection.saleId) {
        continue;
      }

      const response = await firstValueFrom(
        this.productService.createPublicPurchase({
          availabilityId: selection.availabilityId,
          quantity: selection.quantity,
          customer,
          notes,
        }),
      );

      selection.saleId = response.saleId;
      selection.productName = response.productName || selection.productName;
      selection.availabilityLabel = response.availabilityLabel || selection.availabilityLabel;
      selection.unitPrice = response.unitPrice ?? selection.unitPrice;
      selection.imageUrl = response.imageUrl || selection.imageUrl;
    }

    this.selectionsSignal.set(updated);
    this.persistSelections();

    return updated;
  }

  getSaleReferences(): ProductSaleReference[] {
    return this.selectionsSignal()
      .filter((selection) => !!selection.saleId)
      .map((selection) => ({ saleId: selection.saleId! }));
  }

  private normalizeQuantity(quantity: number, max?: number): number {
    const normalized = Number.isFinite(quantity) ? Math.floor(quantity) : 1;
    const safeQuantity = Math.max(1, normalized);

    if (!max || max <= 0) {
      return safeQuantity;
    }

    return Math.min(safeQuantity, max);
  }

  private loadFromStorage(): ProductSelection[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as ProductSelection[];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((item) => typeof item.productId === 'string' && typeof item.availabilityId === 'string');
    } catch (error) {
      console.warn('Não foi possível recuperar produtos salvos', error);
      return [];
    }
  }

  private persistSelections(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.selectionsSignal()));
    } catch (error) {
      console.warn('Não foi possível salvar produtos selecionados', error);
    }
  }

  private cloneSelections(source: ProductSelection[]): ProductSelection[] {
    return source.map((item) => ({ ...item }));
  }
}
