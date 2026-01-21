import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../config/environment';
import {
  Product,
  ProductAvailability,
  ProductVariation,
  ProductPurchaseRequest,
  ProductPurchaseResponse,
} from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');

  getProducts(): Observable<Product[]> {
    return this.http
      .get<ProductApiResponse[]>(`${this.baseUrl}/products`)
      .pipe(map((products) => products.map((product) => this.mapProduct(product))));
  }

  getProduct(productId: string): Observable<Product> {
    return this.http
      .get<ProductApiResponse>(`${this.baseUrl}/products/${productId}`)
      .pipe(map((product) => this.mapProduct(product)));
  }

  createPublicPurchase(payload: ProductPurchaseRequest): Observable<ProductPurchaseResponse> {
    return this.http.post<ProductPurchaseResponse>(`${this.baseUrl}/products/purchases`, payload);
  }

  private mapProduct(product: ProductApiResponse): Product {
    return {
      id: product.id,
      eventId: product.eventId,
      name: product.name,
      description: product.description,
      sku: product.sku,
      imageUrl: product.imageUrl,
      tags: product.tags,
      isActive: product.isActive,
      basePrice: this.normalizePrice(product.basePrice),
      metadata: product.metadata,
      variations: product.variations?.map((variation) => this.mapVariation(variation)) ?? [],
      availabilities: product.availabilities?.map((availability) => this.mapAvailability(availability)) ?? [],
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private mapVariation(variation: ProductVariationResponse): ProductVariation {
    const metadataValues = this.getOrderedMetadataValues(variation);

    return {
      id: variation.id,
      productId: variation.productId,
      label: variation.label,
      sku: variation.sku,
      stockType: variation.stockType,
      initialQuantity: variation.initialQuantity ?? null,
      metadata: variation.metadata,
      metadataValues,
      soldQuantity: variation.soldQuantity,
      remainingQuantity: variation.remainingQuantity ?? null,
      createdAt: variation.createdAt,
      updatedAt: variation.updatedAt,
      displayLabel: this.buildVariationLabel(variation, metadataValues),
    };
  }

  private mapAvailability(availability: ProductAvailabilityResponse): ProductAvailability {
    return {
      id: availability.id,
      productId: availability.productId,
      variationId: availability.variationId ?? null,
      label: availability.title || availability.label || 'Disponibilidade',
      title: availability.title,
      description: availability.description,
      price: this.normalizePrice(availability.price) ?? 0,
      currency: availability.currency,
      remainingQuantity: availability.remainingQuantity ?? null,
      initialQuantity: availability.initialQuantity ?? null,
      maxPerPurchase: availability.maxPerOrder ?? availability.maxPerPurchase ?? null,
      status: availability.status,
      releaseAt: availability.releaseAt,
      closeAt: availability.closeAt,
      channel: availability.channel,
      soldQuantity: availability.soldQuantity,
      createdAt: availability.createdAt,
      updatedAt: availability.updatedAt,
    };
  }

  private normalizePrice(value?: string | number | null): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private buildVariationLabel(variation: ProductVariationResponse, metadataValues: string[]): string {
    if (metadataValues.length) {
      return metadataValues.join(' / ');
    }

    return (variation.label || 'Variação').trim() || 'Variação';
  }

  private getOrderedMetadataValues(variation: ProductVariationResponse): string[] {
    const baseLabel = (variation.label || '').trim().toLowerCase();
    const metadataEntries = Object.entries(variation.metadata ?? {})
      .map(([key, value]) => ({ key: key.toLowerCase(), value: this.normalizeMetadataValue(value) }))
      .filter((entry): entry is { key: string; value: string } => !!entry.value);

    if (!metadataEntries.length) {
      return [];
    }

    const preferred = baseLabel ? metadataEntries.find((entry) => entry.key === baseLabel) : undefined;
    const orderedValues: string[] = [];

    if (preferred) {
      orderedValues.push(preferred.value);
    }

    for (const entry of metadataEntries) {
      if (orderedValues.includes(entry.value)) {
        continue;
      }
      orderedValues.push(entry.value);
    }

    return orderedValues;
  }

  private normalizeMetadataValue(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return null;
  }
}

interface ProductApiResponse {
  id: string;
  eventId?: number;
  name: string;
  description?: string;
  sku?: string;
  imageUrl?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  basePrice?: string | number | null;
  tags?: string[];
  variations?: ProductVariationResponse[];
  availabilities?: ProductAvailabilityResponse[];
  createdAt?: string;
  updatedAt?: string;
}

interface ProductVariationResponse {
  id: string;
  productId: string;
  label: string;
  sku?: string;
  stockType?: string;
  initialQuantity?: number | null;
  metadata?: Record<string, unknown>;
  soldQuantity?: number;
  remainingQuantity?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

interface ProductAvailabilityResponse {
  id: string;
  productId: string;
  variationId?: string | null;
  title?: string;
  label?: string;
  description?: string;
  price?: string | number | null;
  currency?: string;
  initialQuantity?: number | null;
  maxPerOrder?: number | null;
  maxPerPurchase?: number | null;
  status?: string;
  releaseAt?: string | null;
  closeAt?: string | null;
  channel?: string;
  soldQuantity?: number;
  remainingQuantity?: number | null;
  createdAt?: string;
  updatedAt?: string;
}
