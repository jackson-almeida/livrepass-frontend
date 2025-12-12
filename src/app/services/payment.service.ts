import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PurchaseData } from './purchase.service';
import { environment } from '../config/environment';

export type PricingType = 'inteira' | 'meia';
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
  pricingType: PricingType;
  quantity: number;
}

interface BasePaymentPayload {
  eventId: number;
  customer: PaymentCustomerPayload;
  items: PaymentItemPayload[];
  description?: string;
  clientIp?: string;
}

export interface PixPaymentRequest extends BasePaymentPayload {
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
  items: Array<{ batchId: number; pricingType: PricingType; quantity: number; unitPrice: number; totalPrice: number }>;
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

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');

  createPixPayment(
    purchase: PurchaseData,
    customer: PaymentCustomerPayload,
    options?: { description?: string; returnUrl?: string; clientIp?: string },
  ): Observable<PixPaymentResponse> {
    const payload: PixPaymentRequest = {
      eventId: Number(purchase.eventId),
      customer,
      items: this.buildItemsFromPurchase(purchase),
      description: options?.description,
      clientIp: options?.clientIp,
      returnUrl: options?.returnUrl,
    };

    return this.http.post<PixPaymentResponse>(`${this.baseUrl}/payments/pix`, payload);
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
    options?: { description?: string; clientIp?: string },
  ): Observable<CardPaymentResponse> {
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
    };

    return this.http.post<CardPaymentResponse>(`${this.baseUrl}/payments/card`, payload);
  }

  getPaymentStatus(purchaseId: string): Observable<PaymentSummaryResponse> {
    return this.http.get<PaymentSummaryResponse>(`${this.baseUrl}/payments/${purchaseId}`);
  }

  private buildItemsFromPurchase(purchase: PurchaseData): PaymentItemPayload[] {
    const items: PaymentItemPayload[] = [];

    if (purchase.quantidadeInteira > 0) {
      items.push({
        batchId: purchase.batchId,
        pricingType: 'inteira',
        quantity: purchase.quantidadeInteira,
      });
    }

    if (purchase.quantidadeMeia > 0) {
      items.push({
        batchId: purchase.batchId,
        pricingType: 'meia',
        quantity: purchase.quantidadeMeia,
      });
    }

    if (!items.length) {
      throw new Error('Nenhum item selecionado para pagamento.');
    }

    return items;
  }
}
