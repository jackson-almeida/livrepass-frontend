import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PurchaseData } from './purchase.service';
import { AuthService } from './auth.service';
import { CartReservationService, TicketParticipant } from './cart-reservation.service';
import { environment } from '../config/environment';
import { ProductSaleReference } from '../models/product.model';

export type PaymentMethod = 'pix' | 'card';
export type PaymentStatus =
  | 'pending'
  | 'approved'
  | 'authorized'
  | 'in_process'
  | 'in_mediation'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
  | 'charged_back';

export interface PaymentCustomerPayload {
  firstName: string;
  lastName: string;
  email: string;
  documentType: string;
  documentNumber: string;
  phoneAreaCode?: string;
  phoneNumber?: string;
}

export interface PaymentItemPayload {
  batchId: number;
  categoryId: number;
  categoryLabel: string;
  categoryType: string;
  unitPrice: number;
  quantity: number;
}

interface BasePaymentPayload {
  eventId: number;
  customer: PaymentCustomerPayload;
  items: PaymentItemPayload[];
  description?: string;
  clientIp?: string;
  productSales?: ProductSaleReference[];
  participants?: TicketParticipant[];
  cartReservationId?: string;
}

export interface PixPaymentRequest extends BasePaymentPayload {
  paymentMethodId: 'pix';
  payment_method_id?: 'pix';
  returnUrl?: string;
}

export interface CardPaymentRequest extends BasePaymentPayload {
  cardToken: string;
  paymentMethodId: string;
  installments: number;
  issuerId?: string;
  cardHolderName?: string;
}

export interface PaymentSummaryResponse {
  purchaseId: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  statusDetail?: string;
  totalAmount: string;
  items: Array<{ batchId: number; categoryId: number; categoryLabel: string; quantity: number; unitPrice: number; totalPrice: number }>;
  mercadoPagoPaymentId?: string;
}

export interface PixPaymentResponse extends PaymentSummaryResponse {
  qrCode?: string;
  qrCodeBase64?: string;
  copyAndPasteCode?: string;
  ticketUrl?: string;
  expiresAt?: string;
}

export interface CardPaymentResponse extends PaymentSummaryResponse {
  installments?: number;
  paymentMethodId?: string;
  lastFourDigits?: string;
  cardHolderName?: string;
}

interface PixPaymentOptions {
  description?: string;
  returnUrl?: string;
  clientIp?: string;
  productSales?: ProductSaleReference[];
}

interface CardPaymentOptions {
  description?: string;
  clientIp?: string;
  productSales?: ProductSaleReference[];
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private cartReservationService = inject(CartReservationService);
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');

  createPixPayment(
    purchase: PurchaseData,
    customer: PaymentCustomerPayload,
    options?: PixPaymentOptions,
  ): Observable<PixPaymentResponse> {
    const reservation = this.cartReservationService.reservation();
    const participants = this.cartReservationService.getParticipants();

    const payload: PixPaymentRequest = {
      eventId: Number(purchase.eventId),
      customer,
      items: this.buildItemsFromPurchase(purchase),
      description: options?.description,
      clientIp: options?.clientIp,
      returnUrl: options?.returnUrl,
      paymentMethodId: 'pix',
      payment_method_id: 'pix',
      participants: participants.length ? participants : undefined,
      cartReservationId: reservation?.id,
    };

    if (options?.productSales?.length) {
      payload.productSales = options.productSales;
    }

    return this.http.post<PixPaymentResponse>(
      `${this.baseUrl}/payments/pix`,
      payload,
      { headers: this.getAuthHeaders() },
    );
  }

  createCardPayment(
    purchase: PurchaseData,
    customer: PaymentCustomerPayload,
    card: {
      token: string;
      paymentMethodId: string;
      installments: number;
      issuerId?: string;
      holderName?: string;
    },
    options?: CardPaymentOptions,
  ): Observable<CardPaymentResponse> {
    const reservation = this.cartReservationService.reservation();
    const participants = this.cartReservationService.getParticipants();

    const payload: CardPaymentRequest = {
      eventId: Number(purchase.eventId),
      customer,
      items: this.buildItemsFromPurchase(purchase),
      description: options?.description,
      clientIp: options?.clientIp,
      cardToken: card.token,
      paymentMethodId: card.paymentMethodId,
      issuerId: card.issuerId,
      installments: card.installments,
      cardHolderName: card.holderName,
      participants: participants.length ? participants : undefined,
      cartReservationId: reservation?.id,
    };

    if (options?.productSales?.length) {
      payload.productSales = options.productSales;
    }

    return this.http.post<CardPaymentResponse>(
      `${this.baseUrl}/payments/card`,
      payload,
      { headers: this.getAuthHeaders() },
    );
  }

  getPaymentStatus(purchaseId: string): Observable<PaymentSummaryResponse> {
    return this.http.get<PaymentSummaryResponse>(`${this.baseUrl}/payments/${purchaseId}`);
  }

  private buildItemsFromPurchase(purchase: PurchaseData): PaymentItemPayload[] {
    const items = purchase.categories
      .filter((category) => category.quantity > 0)
      .map((category) => ({
        batchId: purchase.batchId,
        categoryId: category.categoryId,
        categoryLabel: category.label,
        categoryType: category.type,
        unitPrice: category.unitPrice,
        quantity: category.quantity,
      }));

    if (!items.length) {
      throw new Error('Nenhum item selecionado para pagamento.');
    }

    return items;
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
