import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  AfterViewInit,
  inject,
  signal,
  ElementRef,
  NgZone,
  computed,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { interval, startWith, switchMap, Subscription, firstValueFrom } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PurchaseService, PurchaseData } from '../../../services/purchase.service';
import {
  CardPaymentResponse,
  PaymentCustomerPayload,
  PaymentService,
  PaymentStatus,
  PaymentSummaryResponse,
} from '../../../services/payment.service';
import {
  MercadoPagoService,
  PayerCost,
  PaymentMethodResult,
} from '../../../services/mercadopago.service';
import { ProductSelectionService } from '../../../services/product-selection.service';
import { ProductPurchaseCustomer, ProductSaleReference } from '../../../models/product.model';
import { CartReservationService, CartReservationItem } from '../../../services/cart-reservation.service';

interface InstallmentOption {
  label: string;
  value: number;
  installmentAmount: number;
  totalAmount: number;
  rate: number;
}

@Component({
  selector: 'app-pagamento-cartao',
  imports: [
    CommonModule,
    CurrencyPipe,
    InputTextModule,
    SelectModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './pagamento-cartao.html',
  styleUrl: './pagamento-cartao.scss',
})
export class PagamentoCartaoComponent implements OnInit, OnDestroy, AfterViewInit {
  private router = inject(Router);
  private purchaseService = inject(PurchaseService);
  private paymentService = inject(PaymentService);
  private mercadoPagoService = inject(MercadoPagoService);
  private productSelectionService = inject(ProductSelectionService);
  private cartReservationService = inject(CartReservationService);
  private fb = inject(FormBuilder);
  private hostElement = inject(ElementRef<HTMLElement>);
  private ngZone = inject(NgZone);

  purchaseData = signal<PurchaseData | null>(null);
  paymentStatus = signal<PaymentStatus | null>(null);
  paymentResult = signal<CardPaymentResponse | null>(null);
  isProcessing = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  cardFieldsReady = signal(false);
  productsTotal = computed(() => this.productSelectionService.getTotalAmount());
  totalToPay = computed(() => (this.purchaseData()?.total ?? 0) + this.productsTotal());

  // Timer from cart reservation
  remainingFormatted = this.cartReservationService.remainingFormatted;
  isExpired = this.cartReservationService.isExpired;

  // Card brand auto-detection
  detectedBrand = signal<PaymentMethodResult | null>(null);
  detectedPaymentMethodId = signal<string | null>(null);
  detectedBrandThumbnail = signal<string | null>(null);
  detectedIssuerId = signal<string | null>(null);

  // Dynamic installments
  installmentsOptions = signal<InstallmentOption[]>([
    { label: '1x à vista', value: 1, installmentAmount: 0, totalAmount: 0, rate: 0 },
  ]);
  loadingInstallments = signal(false);

  private pollingSub?: Subscription;
  private currentBin: string | null = null;

  cardForm = this.fb.group({
    cardholderName: ['', Validators.required],
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

  canSubmit = computed(() => {
    return (
      this.cardFieldsReady() &&
      !!this.detectedPaymentMethodId() &&
      !this.isProcessing() &&
      !this.isExpired()
    );
  });

  ngOnInit() {
    const purchase = this.purchaseService.getPurchase();
    if (!purchase) {
      const reservation = this.cartReservationService.reservation();
      if (!reservation) {
        this.router.navigate(['/ingressos']);
        return;
      }
      const fakePurchase: PurchaseData = {
        eventId: String(reservation.eventId),
        eventName: reservation.eventName,
        batchId: reservation.items[0]?.batchId ?? 0,
        batchName: reservation.items[0]?.batchName ?? '',
        categories: reservation.items.map((item: CartReservationItem) => ({
          categoryId: item.categoryId,
          label: item.label,
          type: item.categoryType,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          maxPerPurchase: item.maxPerPurchase,
        })),
        totalTickets: reservation.totalTickets,
        total: parseFloat(reservation.totalAmount),
        timestamp: Date.now(),
      };
      this.purchaseData.set(fakePurchase);
      this.purchaseService.savePurchase(fakePurchase);
      return;
    }

    this.purchaseData.set(purchase);
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() =>
      queueMicrotask(() => this.initializeCardFields()),
    );
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.mercadoPagoService.unmountCardFields();
  }

  voltarParaSelecao() {
    this.router.navigate(['/pagamento']);
  }

  async finalizarPagamento() {
    const purchase = this.purchaseData();
    if (!purchase) {
      return;
    }

    if (this.isExpired()) {
      this.errorMessage.set(
        'Tempo de reserva expirado. Selecione os ingressos novamente.',
      );
      return;
    }

    const paymentMethodId = this.detectedPaymentMethodId();
    if (!paymentMethodId) {
      this.errorMessage.set(
        'Não foi possível identificar a bandeira do cartão. Verifique o número.',
      );
      return;
    }

    if (this.cardForm.invalid || this.customerForm.invalid || !this.cardFieldsReady()) {
      this.cardForm.markAllAsTouched();
      this.customerForm.markAllAsTouched();
      if (!this.cardFieldsReady()) {
        this.errorMessage.set('Os campos seguros do cartão ainda estão carregando.');
      }
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isProcessing.set(true);

    try {
      const cardToken = await this.createCardToken();
      const customer = this.buildCustomerPayload();
      const cardholderName = this.cardForm.value.cardholderName?.trim();
      const productCustomer = this.buildProductPurchaseCustomer();
      const productSales = await this.prepareProductSales(productCustomer);

      const response: CardPaymentResponse = await firstValueFrom(
        this.paymentService.createCardPayment(
          purchase,
          customer,
          {
            token: cardToken,
            paymentMethodId,
            installments: this.cardForm.value.installments!,
            issuerId: this.detectedIssuerId() || undefined,
            holderName: cardholderName,
          },
          {
            description: `Ingressos para ${purchase.eventName}`,
            productSales,
          },
        ),
      );

      this.paymentResult.set(response);
      this.applyStatusFeedback(response.status, response.statusDetail);

      if (this.isPending(response.status)) {
        this.startPolling(response.purchaseId);
      } else {
        this.stopPolling();
      }
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        'Não foi possível processar o pagamento.';
      console.error('Falha ao finalizar pagamento', error);
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
      const status: PaymentSummaryResponse = await firstValueFrom(
        this.paymentService.getPaymentStatus(result.purchaseId),
      );
      this.applyStatusFeedback(status.status, status.statusDetail);
      if (!this.isPending(status.status)) {
        this.stopPolling();
      }
    } catch {
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
      case 'in_mediation':
        return 'Pagamento em mediação';
      case 'rejected':
        return 'Pagamento rejeitado';
      case 'cancelled':
        return 'Pagamento cancelado';
      case 'refunded':
        return 'Pagamento estornado';
      case 'charged_back':
        return 'Pagamento contestado';
      default:
        return status ? this.formatStatusLabel(status) : 'Sem status ainda';
    }
  }

  // ─── Private helpers ──────────────────────────────────────────

  private async handleBinChange(bin: string | null): Promise<void> {
    if (!bin || bin.length < 6) {
      this.detectedBrand.set(null);
      this.detectedPaymentMethodId.set(null);
      this.detectedBrandThumbnail.set(null);
      this.detectedIssuerId.set(null);
      this.installmentsOptions.set([
        { label: '1x à vista', value: 1, installmentAmount: 0, totalAmount: 0, rate: 0 },
      ]);
      return;
    }

    if (bin === this.currentBin) return;
    this.currentBin = bin;

    try {
      const methods = await this.mercadoPagoService.getPaymentMethods(bin);
      if (methods?.results?.length) {
        const method = methods.results[0];
        this.detectedBrand.set(method);
        this.detectedPaymentMethodId.set(method.id);
        this.detectedBrandThumbnail.set(
          method.secure_thumbnail || method.thumbnail,
        );
      }

      // Buscar opções de parcelamento baseado no valor + BIN
      const amount = this.totalToPay().toFixed(2);
      if (parseFloat(amount) > 0) {
        this.loadingInstallments.set(true);
        const installments = await this.mercadoPagoService.getInstallments(
          amount,
          bin,
        );

        if (installments?.length) {
          const plan = installments[0];

          if (plan.issuer) {
            this.detectedIssuerId.set(plan.issuer.id);
          }

          const options: InstallmentOption[] = plan.payer_costs.map(
            (cost: PayerCost) => ({
              label:
                cost.recommended_message ||
                `${cost.installments}x de R$ ${cost.installment_amount.toFixed(2)}`,
              value: cost.installments,
              installmentAmount: cost.installment_amount,
              totalAmount: cost.total_amount,
              rate: cost.installment_rate,
            }),
          );

          this.installmentsOptions.set(options);

          const currentValue = this.cardForm.value.installments;
          if (!options.some((o) => o.value === currentValue)) {
            this.cardForm.patchValue({ installments: 1 });
          }
        }
        this.loadingInstallments.set(false);
      }
    } catch (error) {
      console.warn('Erro ao detectar bandeira/parcelas:', error);
      this.loadingInstallments.set(false);
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
    const fullName =
      `${firstName} ${lastName}`.trim() || firstName || lastName || 'Cliente';
    const documentNumber = value.documentNumber?.replace(/\D/g, '') || '';
    const phoneNumber = this.buildInternationalPhone(
      value.phoneAreaCode,
      value.phoneNumber,
    );

    return {
      fullName,
      email: value.email!,
      documentNumber,
      phoneNumber,
    };
  }

  private buildInternationalPhone(
    areaCode?: string | null,
    phone?: string | null,
  ): string | undefined {
    const area = areaCode?.replace(/\D/g, '');
    const number = phone?.replace(/\D/g, '');
    if (!area || !number) {
      return undefined;
    }
    return `+55 ${area} ${number}`;
  }

  private async prepareProductSales(
    customer: ProductPurchaseCustomer,
  ): Promise<ProductSaleReference[]> {
    if (!this.productSelectionService.hasSelections()) {
      return [];
    }

    await this.productSelectionService.ensureSaleReservations(customer);
    return this.productSelectionService.getSaleReferences();
  }

  private async createCardToken(): Promise<string> {
    const value = this.cardForm.value;
    const token = await this.mercadoPagoService.createCardToken({
      cardholderName: value.cardholderName!.trim(),
      identificationType: 'CPF',
      identificationNumber: this.customerForm.value.documentNumber!.replace(
        /\D/g,
        '',
      ),
    });

    if (!token?.id) {
      throw new Error('Não foi possível gerar o token do cartão.');
    }

    return token.id;
  }

  private async initializeCardFields(): Promise<void> {
    this.cardFieldsReady.set(false);

    try {
      await this.mercadoPagoService.mountCardFields({
        cardNumberContainerId: this.ensureFieldElement('card-number-field'),
        expirationDateContainerId: this.ensureFieldElement(
          'card-expiration-field',
        ),
        securityCodeContainerId: this.ensureFieldElement('card-security-field'),
      });

      // Listen for BIN changes to auto-detect card brand and installments
      this.mercadoPagoService.onCardNumberBinChange((data) => {
        this.ngZone.run(() => this.handleBinChange(data.bin));
      });

      this.ngZone.run(() => this.cardFieldsReady.set(true));
    } catch (error) {
      const message =
        (error as { message?: string })?.message ||
        'Não foi possível inicializar os campos do cartão.';
      this.ngZone.run(() => this.errorMessage.set(message));
    }
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
          this.applyStatusFeedback(status.status, status.statusDetail);
          if (!this.isPending(status.status)) {
            this.stopPolling();
          }
        },
        error: () =>
          this.errorMessage.set('Erro ao verificar status do pagamento.'),
      });
  }

  private stopPolling() {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = undefined;
    }
  }

  private ensureFieldElement(id: string): string {
    const element = this.hostElement.nativeElement.querySelector(`#${id}`);
    if (!element) {
      throw new Error(
        `Elemento ${id} não encontrado para montar o campo seguro.`,
      );
    }
    return id;
  }

  isApproved(status: PaymentStatus): boolean {
    return status === 'approved' || status === 'authorized';
  }

  isPending(status: PaymentStatus): boolean {
    return (
      status === 'pending' ||
      status === 'in_process' ||
      status === 'in_mediation'
    );
  }

  private isRejected(status: PaymentStatus): boolean {
    return (
      status === 'rejected' ||
      status === 'cancelled' ||
      status === 'refunded' ||
      status === 'charged_back'
    );
  }

  private applyStatusFeedback(
    status: PaymentStatus,
    statusDetail?: string,
  ) {
    this.paymentStatus.set(status);

    if (this.isApproved(status)) {
      this.errorMessage.set(null);
      this.successMessage.set(
        'Pagamento aprovado! Redirecionando para o comprovante...',
      );
      this.productSelectionService.clearSelections();
      this.cartReservationService.clearState();
      const result = this.paymentResult();
      if (result?.purchaseId) {
        setTimeout(() => {
          this.router.navigate(['/confirmacao', result.purchaseId]);
        }, 1500);
      }
      return;
    }

    if (this.isRejected(status)) {
      this.successMessage.set(null);
      this.errorMessage.set(this.getRejectionMessage(statusDetail));
      return;
    }

    if (this.isPending(status)) {
      this.errorMessage.set(null);
      this.successMessage.set(
        'Pagamento enviado. Estamos aguardando a confirmação.',
      );
      return;
    }

    this.successMessage.set(null);
    this.errorMessage.set(
      `Status do pagamento: ${this.formatStatusLabel(status)}.`,
    );
  }

  private getRejectionMessage(statusDetail?: string): string {
    const messages: Record<string, string> = {
      cc_rejected_other_reason:
        'Pagamento rejeitado pelo emissor. Verifique com o banco ou tente outro cartão.',
      cc_rejected_bad_filled_card_number:
        'Pagamento rejeitado. Confira o número do cartão informado.',
      cc_rejected_bad_filled_security_code:
        'Pagamento rejeitado. Confira o código de segurança.',
      cc_rejected_bad_filled_date:
        'Pagamento rejeitado. Verifique a data de validade do cartão.',
      cc_rejected_insufficient_amount:
        'Pagamento rejeitado por saldo/crédito insuficiente.',
      cc_rejected_call_for_authorize:
        'Pagamento rejeitado. Entre em contato com o emissor para liberar a transação.',
      cc_rejected_bad_filled_other:
        'Pagamento rejeitado. Revise os dados do cartão.',
    };

    if (!statusDetail) {
      return 'Pagamento rejeitado. Confira os dados do cartão ou tente outro método.';
    }

    return (
      messages[statusDetail] ||
      `Pagamento rejeitado (${statusDetail}). Confira os dados ou tente outro método.`
    );
  }

  private formatStatusLabel(status: PaymentStatus): string {
    return status.replace(/_/g, ' ');
  }
}
