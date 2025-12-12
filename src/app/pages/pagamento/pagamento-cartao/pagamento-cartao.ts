import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { interval, startWith, switchMap, Subscription, firstValueFrom } from 'rxjs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { SelectModule } from 'primeng/select';
import { PurchaseService, PurchaseData } from '../../../services/purchase.service';
import {
  CardPaymentResponse,
  PaymentCustomerPayload,
  PaymentService,
  PaymentStatus,
} from '../../../services/payment.service';
import { MercadoPagoService } from '../../../services/mercadopago.service';

@Component({
  selector: 'app-pagamento-cartao',
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputMaskModule,
    SelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './pagamento-cartao.html',
  styleUrl: './pagamento-cartao.scss',
})
export class PagamentoCartaoComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private purchaseService = inject(PurchaseService);
  private paymentService = inject(PaymentService);
  private mercadoPagoService = inject(MercadoPagoService);
  private fb = inject(FormBuilder);

  purchaseData = signal<PurchaseData | null>(null);
  paymentStatus = signal<PaymentStatus | null>(null);
  paymentResult = signal<CardPaymentResponse | null>(null);
  isProcessing = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  private pollingSub?: Subscription;

  meses = Array.from({ length: 12 }, (_, i) => {
    const value = (i + 1).toString().padStart(2, '0');
    return { label: value, value };
  });

  anos = Array.from({ length: 15 }, (_, i) => {
    const ano = new Date().getFullYear() + i;
    return { label: ano.toString(), value: ano.toString() };
  });

  bandeiras = [
    { label: 'Visa', value: 'visa' },
    { label: 'Mastercard', value: 'master' },
    { label: 'Elo', value: 'elo' },
    { label: 'Amex', value: 'amex' },
  ];

  cardForm = this.fb.group({
    cardNumber: ['', [Validators.required, Validators.minLength(15)]],
    cardholderName: ['', Validators.required],
    expirationMonth: ['', Validators.required],
    expirationYear: ['', Validators.required],
    cvv: ['', [Validators.required, Validators.minLength(3)]],
    paymentMethodId: ['visa', Validators.required],
    installments: [1, Validators.required],
  });

  customerForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    documentNumber: ['', [Validators.required, Validators.minLength(11)]],
    phoneAreaCode: [''],
    phoneNumber: [''],
  });

  installmentsOptions = Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1}x`, value: i + 1 }));

  ngOnInit() {
    const purchase = this.purchaseService.getPurchase();
    if (!purchase) {
      this.router.navigate(['/ingressos']);
      return;
    }
    this.purchaseData.set(purchase);
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  voltarParaSelecao() {
    this.router.navigate(['/pagamento']);
  }

  async finalizarPagamento() {
    const purchase = this.purchaseData();
    if (!purchase) {
      return;
    }

    if (this.cardForm.invalid || this.customerForm.invalid) {
      this.cardForm.markAllAsTouched();
      this.customerForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isProcessing.set(true);

    try {
      const cardToken = await this.createCardToken();
      const customer = this.buildCustomerPayload();
      const cardholderName = this.cardForm.value.cardholderName?.trim();

      const response = await firstValueFrom(
        this.paymentService.createCardPayment(
          purchase,
          customer,
          {
            token: cardToken,
            paymentMethodId: this.cardForm.value.paymentMethodId!,
            installments: this.cardForm.value.installments!,
            holderName: cardholderName,
          },
          { description: `Ingressos para ${purchase.eventName}` },
        ),
      );

      this.paymentResult.set(response);
      this.paymentStatus.set(response.status);
      if (this.isApproved(response.status)) {
        this.successMessage.set('Pagamento aprovado! Seus ingressos serão liberados em instantes.');
        this.stopPolling();
      } else {
        this.successMessage.set('Pagamento enviado. Estamos aguardando a confirmação.');
        this.startPolling(response.purchaseId);
      }
    } catch (error) {
      const message =
        (error as { message?: string })?.message || 'Não foi possível processar o pagamento.';
      this.errorMessage.set(message);
    } finally {
      this.isProcessing.set(false);
    }
  }

  async verificarStatusManual(): Promise<void> {
    const result = this.paymentResult();
    if (!result) {
      return;
    }

    try {
      const status = await firstValueFrom(this.paymentService.getPaymentStatus(result.purchaseId));
      this.paymentStatus.set(status.status);
      if (this.isApproved(status.status)) {
        this.successMessage.set('Pagamento confirmado!');
        this.stopPolling();
      }
    } catch (error) {
      this.errorMessage.set('Não foi possível verificar o status do pagamento.');
    }
  }

  get statusLabel(): string {
    const status = this.paymentStatus();
    switch (status) {
      case 'approved':
      case 'authorized':
        return 'Pagamento aprovado';
      case 'in_process':
      case 'pending':
        return 'Pagamento em processamento';
      case 'rejected':
        return 'Pagamento rejeitado';
      default:
        return status ? status.toUpperCase() : 'Sem status ainda';
    }
  }

  private buildCustomerPayload(): PaymentCustomerPayload {
    const value = this.customerForm.value;
    return {
      firstName: value.firstName!.trim(),
      lastName: value.lastName!.trim(),
      email: value.email!,
      documentType: 'CPF',
      documentNumber: value.documentNumber!.replace(/\D/g, ''),
      phoneAreaCode: value.phoneAreaCode || undefined,
      phoneNumber: value.phoneNumber?.replace(/\D/g, ''),
    };
  }

  private async createCardToken(): Promise<string> {
    const value = this.cardForm.value;
    const token = await this.mercadoPagoService.createCardToken({
      cardholderName: value.cardholderName!,
      cardNumber: value.cardNumber!.replace(/\s+/g, ''),
      cardExpirationMonth: value.expirationMonth!,
      cardExpirationYear: value.expirationYear!,
      securityCode: value.cvv!,
      identificationType: 'CPF',
      identificationNumber: this.customerForm.value.documentNumber!.replace(/\D/g, ''),
    });

    if (!token?.id) {
      throw new Error('Não foi possível gerar o token do cartão.');
    }

    return token.id;
  }

  private startPolling(purchaseId: string) {
    this.stopPolling();
    this.pollingSub = interval(5000)
      .pipe(
        startWith(0),
        switchMap(() => this.paymentService.getPaymentStatus(purchaseId)),
      )
      .subscribe({
        next: (status) => {
          this.paymentStatus.set(status.status);
          if (this.isApproved(status.status)) {
            this.successMessage.set('Pagamento confirmado!');
            this.stopPolling();
          }
        },
        error: () => this.errorMessage.set('Erro ao verificar status do pagamento.'),
      });
  }

  private stopPolling() {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
  }

  private isApproved(status: PaymentStatus): boolean {
    return status === 'approved' || status === 'authorized';
  }
}
