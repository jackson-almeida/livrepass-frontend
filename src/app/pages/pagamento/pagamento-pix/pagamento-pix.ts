import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { interval, startWith, switchMap, Subscription, firstValueFrom } from 'rxjs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PurchaseData, PurchaseService } from '../../../services/purchase.service';
import {
  PaymentCustomerPayload,
  PaymentService,
  PaymentStatus,
  PixPaymentResponse,
} from '../../../services/payment.service';
import { ProductSelectionService } from '../../../services/product-selection.service';
import { ProductPurchaseCustomer, ProductSaleReference } from '../../../models/product.model';

@Component({
  selector: 'app-pagamento-pix',
  imports: [CommonModule, CurrencyPipe, CardModule, ButtonModule, ReactiveFormsModule, InputTextModule],
  templateUrl: './pagamento-pix.html',
  styleUrl: './pagamento-pix.scss',
})
export class PagamentoPixComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private purchaseService = inject(PurchaseService);
  private paymentService = inject(PaymentService);
  private productSelectionService = inject(ProductSelectionService);
  private fb = inject(FormBuilder);

  purchaseData = signal<PurchaseData | null>(null);
  pixPayment = signal<PixPaymentResponse | null>(null);
  paymentStatus = signal<PaymentStatus | null>(null);
  isGenerating = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  productsTotal = computed(() => this.productSelectionService.getTotalAmount());
  totalToPay = computed(() => (this.purchaseData()?.total ?? 0) + this.productsTotal());

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

  async gerarCodigoPix(): Promise<void> {
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

    try {
      const productCustomer = this.buildProductPurchaseCustomer();
      const productSales = await this.prepareProductSales(productCustomer);
      const response = await firstValueFrom(
        this.paymentService.createPixPayment(purchase, customer, {
          description: `Ingressos para ${purchase.eventName}`,
          returnUrl: window.location.origin + '/pagamento/pix',
          productSales,
        }),
      );

      this.pixPayment.set(response);
      this.paymentStatus.set(response.status);
      if (this.isApproved(response.status)) {
        this.productSelectionService.clearSelections();
      }
      this.successMessage.set('PIX gerado! Use o QR Code ou copie o código.');
      this.startPolling(response.purchaseId);
    } catch (err) {
      const fallback = (err as { message?: string })?.message || (err as { error?: { message?: string } })?.error?.message;
      this.errorMessage.set(fallback || 'Não foi possível gerar o PIX. Tente novamente.');
    } finally {
      this.isGenerating.set(false);
    }
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
        this.productSelectionService.clearSelections();
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

  private buildProductPurchaseCustomer(): ProductPurchaseCustomer {
    const value = this.customerForm.value;
    const firstName = value.firstName?.trim() || '';
    const lastName = value.lastName?.trim() || '';
    const fullName = `${firstName} ${lastName}`.trim() || firstName || lastName || 'Cliente';
    const documentNumber = value.documentNumber?.replace(/\D/g, '') || '';
    const phoneNumber = this.buildInternationalPhone(value.phoneAreaCode, value.phoneNumber);

    return {
      fullName,
      email: value.email!,
      documentNumber,
      phoneNumber,
    };
  }

  private buildInternationalPhone(areaCode?: string | null, phone?: string | null): string | undefined {
    const area = areaCode?.replace(/\D/g, '');
    const number = phone?.replace(/\D/g, '');
    if (!area || !number) {
      return undefined;
    }
    return `+55 ${area} ${number}`;
  }

  private async prepareProductSales(customer: ProductPurchaseCustomer): Promise<ProductSaleReference[]> {
    if (!this.productSelectionService.hasSelections()) {
      return [];
    }

    await this.productSelectionService.ensureSaleReservations(customer);
    return this.productSelectionService.getSaleReferences();
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
            this.productSelectionService.clearSelections();
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
