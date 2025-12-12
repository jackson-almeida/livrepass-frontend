import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { interval, startWith, switchMap, Subscription, firstValueFrom } from 'rxjs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PurchaseService, PurchaseData } from '../../../services/purchase.service';
import {
  PaymentCustomerPayload,
  PaymentService,
  PaymentStatus,
  PixPaymentResponse,
} from '../../../services/payment.service';

@Component({
  selector: 'app-pagamento-pix',
  imports: [CommonModule, CardModule, ButtonModule, ReactiveFormsModule, InputTextModule],
  templateUrl: './pagamento-pix.html',
  styleUrl: './pagamento-pix.scss',
})
export class PagamentoPixComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private purchaseService = inject(PurchaseService);
  private paymentService = inject(PaymentService);
  private fb = inject(FormBuilder);

  purchaseData = signal<PurchaseData | null>(null);
  pixPayment = signal<PixPaymentResponse | null>(null);
  paymentStatus = signal<PaymentStatus | null>(null);
  isGenerating = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  private pollingSub?: Subscription;

  customerForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    documentNumber: ['', [Validators.required, Validators.minLength(11)]],
    phoneAreaCode: [''],
    phoneNumber: [''],
  });

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

  gerarCodigoPix(): void {
    const purchase = this.purchaseData();
    if (!purchase) {
      return;
    }

    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    this.isGenerating.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const customer = this.buildCustomerPayload();

    this.paymentService
      .createPixPayment(purchase, customer, {
        description: `Ingressos para ${purchase.eventName}`,
        returnUrl: window.location.origin + '/pagamento/pix',
      })
      .subscribe({
        next: (response) => {
          this.pixPayment.set(response);
          this.paymentStatus.set(response.status);
          this.successMessage.set('PIX gerado! Use o QR Code ou copie o código.');
          this.startPolling(response.purchaseId);
        },
        error: (err) => {
          const message = err?.error?.message || 'Não foi possível gerar o PIX. Tente novamente.';
          this.errorMessage.set(message);
        },
        complete: () => this.isGenerating.set(false),
      });
  }

  async verificarPagamentoManual(): Promise<void> {
    const pix = this.pixPayment();
    if (!pix) {
      return;
    }

    try {
      const status = await firstValueFrom(this.paymentService.getPaymentStatus(pix.purchaseId));
      this.paymentStatus.set(status.status);
      if (this.isApproved(status.status)) {
        this.successMessage.set('Pagamento confirmado! Seu pedido está sendo processado.');
        this.stopPolling();
      }
    } catch (error) {
      this.errorMessage.set('Não foi possível atualizar o status do pagamento.');
    }
  }

  copiarCodigoPix(): void {
    const pix = this.pixPayment();
    const code = pix?.copyAndPasteCode || pix?.qrCode;
    if (!code) {
      return;
    }

    navigator.clipboard.writeText(code);
    this.successMessage.set('Código PIX copiado para a área de transferência.');
  }

  get qrCodeImage(): string | null {
    const pix = this.pixPayment();
    return pix?.qrCodeBase64 ? `data:image/png;base64,${pix.qrCodeBase64}` : null;
  }

  get statusLabel(): string {
    const status = this.paymentStatus();
    switch (status) {
      case 'approved':
      case 'authorized':
        return 'Pagamento aprovado';
      case 'pending':
      case 'in_process':
        return 'Aguardando confirmação do PIX';
      case 'rejected':
        return 'Pagamento rejeitado';
      case 'cancelled':
        return 'Pagamento cancelado';
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
            this.successMessage.set('Pagamento confirmado! Seu pedido está sendo processado.');
            this.stopPolling();
          }
        },
        error: () => this.errorMessage.set('Erro ao verificar o status do pagamento.'),
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
