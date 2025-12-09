import { Injectable } from '@angular/core';

export interface PurchaseData {
  eventId: string;
  eventName: string;
  quantidadeInteira: number;
  quantidadeMeia: number;
  precoInteira: number;
  precoMeia: number;
  total: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class PurchaseService {
  private readonly STORAGE_KEY = 'current_purchase';
  private readonly EXPIRATION_TIME = 30 * 60 * 1000; // 30 minutos em milliseconds

  constructor() {
    this.cleanExpiredPurchases();
  }

  savePurchase(data: PurchaseData): void {
    const purchaseWithTimestamp = {
      ...data,
      timestamp: Date.now()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(purchaseWithTimestamp));
  }

  getPurchase(): PurchaseData | null {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) return null;

    try {
      const purchase: PurchaseData = JSON.parse(data);

      // Verifica se a compra expirou (30 minutos)
      const now = Date.now();
      const elapsed = now - purchase.timestamp;

      if (elapsed > this.EXPIRATION_TIME) {
        this.clearPurchase();
        return null;
      }

      return purchase;
    } catch (e) {
      console.error('Erro ao recuperar compra:', e);
      return null;
    }
  }

  clearPurchase(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  hasPurchase(): boolean {
    return this.getPurchase() !== null;
  }

  private cleanExpiredPurchases(): void {
    const purchase = localStorage.getItem(this.STORAGE_KEY);
    if (!purchase) return;

    try {
      const data: PurchaseData = JSON.parse(purchase);
      const now = Date.now();
      const elapsed = now - data.timestamp;

      if (elapsed > this.EXPIRATION_TIME) {
        this.clearPurchase();
      }
    } catch (e) {
      // Se houver erro ao parsear, limpa o storage
      this.clearPurchase();
    }
  }

  getRemainingTime(): number {
    const purchase = this.getPurchase();
    if (!purchase) return 0;

    const elapsed = Date.now() - purchase.timestamp;
    const remaining = this.EXPIRATION_TIME - elapsed;

    return remaining > 0 ? remaining : 0;
  }

  getRemainingMinutes(): number {
    return Math.floor(this.getRemainingTime() / 60000);
  }
}
