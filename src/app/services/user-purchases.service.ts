import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../config/environment';
import { PaymentStatus, PaymentMethod } from './payment.service';

export interface PurchaseParticipant {
  name: string;
  email: string;
  documentType: string;
  documentNumber: string;
  categoryType?: string;
}

export interface UserPurchase {
  purchaseId: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  statusDetail?: string;
  totalAmount: string;
  items: Array<{
    batchId?: number;
    categoryId?: number;
    categoryType?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  mercadoPagoPaymentId?: string;
  eventId?: number;
  eventName?: string;
  createdAt?: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  pixCopyAndPaste?: string;
  pixTicketUrl?: string;
  pixExpiresAt?: string;
  installments?: number;
  lastFourDigits?: string;
  cardHolderName?: string;
  participants?: PurchaseParticipant[];
}

@Injectable({ providedIn: 'root' })
export class UserPurchasesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');

  private _purchases = signal<UserPurchase[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  purchases = this._purchases.asReadonly();
  loading = this._loading.asReadonly();
  error = this._error.asReadonly();

  pendingPurchases = computed(() =>
    this._purchases().filter(
      (p) => p.status === 'pending' || p.status === 'in_process',
    ),
  );

  approvedPurchases = computed(() =>
    this._purchases().filter(
      (p) => p.status === 'approved' || p.status === 'authorized',
    ),
  );

  otherPurchases = computed(() =>
    this._purchases().filter(
      (p) =>
        p.status !== 'pending' &&
        p.status !== 'in_process' &&
        p.status !== 'approved' &&
        p.status !== 'authorized',
    ),
  );

  loadAllPurchases(): void {
    this._loading.set(true);
    this._error.set(null);

    this.http
      .get<UserPurchase[]>(`${this.baseUrl}/payments/my-purchases`, {
        headers: this.getAuthHeaders(),
      })
      .subscribe({
        next: (data) => {
          this._purchases.set(data);
          this._loading.set(false);
        },
        error: (err) => {
          this._error.set(
            err.error?.message || 'Erro ao carregar seus pedidos.',
          );
          this._loading.set(false);
        },
      });
  }

  getPurchaseById(purchaseId: string): Promise<UserPurchase> {
    return new Promise((resolve, reject) => {
      this.http
        .get<UserPurchase>(
          `${this.baseUrl}/payments/${purchaseId}`,
          { headers: this.getAuthHeaders() },
        )
        .subscribe({
          next: (data) => resolve(data),
          error: (err) =>
            reject(err.error?.message || 'Erro ao carregar detalhes da compra.'),
        });
    });
  }

  loadPendingForEvent(eventId: number): Promise<UserPurchase[]> {
    return new Promise((resolve, reject) => {
      this.http
        .get<UserPurchase[]>(
          `${this.baseUrl}/payments/my-purchases/event/${eventId}`,
          { headers: this.getAuthHeaders() },
        )
        .subscribe({
          next: (data) => resolve(data),
          error: (err) =>
            reject(err.error?.message || 'Erro ao verificar pedidos pendentes.'),
        });
    });
  }

  getStatusLabel(status: PaymentStatus): string {
    const labels: Record<string, string> = {
      pending: 'Aguardando pagamento',
      approved: 'Aprovado',
      authorized: 'Autorizado',
      in_process: 'Em processamento',
      in_mediation: 'Em mediação',
      rejected: 'Rejeitado',
      cancelled: 'Cancelado',
      refunded: 'Reembolsado',
      charged_back: 'Estornado',
    };
    return labels[status] || status;
  }

  getStatusColor(status: PaymentStatus): string {
    const colors: Record<string, string> = {
      pending: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20',
      approved: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20',
      authorized: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20',
      in_process: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
      in_mediation: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20',
      rejected: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
      cancelled: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20',
      refunded: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20',
      charged_back: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
    };
    return colors[status] || 'text-gray-600 bg-gray-50';
  }

  getPaymentMethodLabel(method: PaymentMethod): string {
    return method === 'pix' ? 'PIX' : 'Cartão';
  }

  cancelPurchase(purchaseId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http
        .post<UserPurchase>(
          `${this.baseUrl}/payments/${purchaseId}/cancel`,
          {},
          { headers: this.getAuthHeaders() },
        )
        .subscribe({
          next: () => {
            // Reload purchases after cancellation
            this.loadAllPurchases();
            resolve();
          },
          error: (err) => {
            reject(err.error?.message || 'Erro ao cancelar compra.');
          },
        });
    });
  }

  /**
   * Check if a purchase can be cancelled (only pending purchases)
   */
  canCancelPurchase(purchase: UserPurchase): boolean {
    return (
      purchase.status === 'pending' ||
      purchase.status === 'in_process' ||
      purchase.status === 'in_mediation'
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }
}
