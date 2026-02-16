import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { environment } from '../config/environment';

export interface CardTokenPayload {
  cardholderName: string;
  identificationType: string;
  identificationNumber: string;
}

export interface CardFieldsMountConfig {
  cardNumberContainerId: string;
  expirationDateContainerId: string;
  securityCodeContainerId: string;
}

export interface PaymentMethodResult {
  id: string;
  name: string;
  payment_type_id: string;
  thumbnail: string;
  secure_thumbnail: string;
}

export interface PayerCost {
  installments: number;
  installment_rate: number;
  discount_rate: number;
  min_allowed_amount: number;
  max_allowed_amount: number;
  recommended_message: string;
  installment_amount: number;
  total_amount: number;
}

export interface InstallmentResult {
  payment_method_id: string;
  payment_type_id: string;
  issuer: { id: string; name: string };
  payer_costs: PayerCost[];
}

@Injectable({ providedIn: 'root' })
export class MercadoPagoService {
  private readonly scriptUrl = 'https://sdk.mercadopago.com/js/v2';
  private scriptPromise?: Promise<void>;
  private mercadoPagoInstance: any;
  private fieldsApi: any;
  private cardNumberField?: any;
  private expirationDateField?: any;
  private securityCodeField?: any;

  constructor(@Inject(DOCUMENT) private document: Document) { }

  async createCardToken(
    payload: CardTokenPayload,
  ): Promise<{ id: string; first_six_digits: string } & Record<string, unknown>> {
    const fields = await this.getFieldsApi();

    if (fields?.createCardToken) {
      return fields.createCardToken(payload);
    }

    const mp = await this.getInstance();
    if (mp?.cardToken?.create) {
      return mp.cardToken.create(payload);
    }

    throw new Error('SDK do Mercado Pago não possui o método de criação de token disponível.');
  }

  async mountCardFields(config: CardFieldsMountConfig): Promise<void> {
    const fields = await this.getFieldsApi();

    this.unmountCardFields();

    const baseStyle = {
      style: {
        input: {
          color: '#1f2937',
          'font-size': '0.9375rem',
          'font-family': "'Inter', system-ui, -apple-system, sans-serif",
          'font-weight': '400',
          'line-height': '1.5',
        },
        'input::placeholder': {
          color: '#9ca3af',
        },
      },
    };

    this.cardNumberField = fields.create('cardNumber', {
      placeholder: '0000 0000 0000 0000',
      ...baseStyle,
    });

    this.expirationDateField = fields.create('expirationDate', {
      placeholder: 'MM/AA',
      ...baseStyle,
    });

    this.securityCodeField = fields.create('securityCode', {
      placeholder: '123',
      ...baseStyle,
    });

    await Promise.all([
      this.cardNumberField.mount(config.cardNumberContainerId),
      this.expirationDateField.mount(config.expirationDateContainerId),
      this.securityCodeField.mount(config.securityCodeContainerId),
    ]);
  }

  /**
   * Registra um callback para quando o BIN do cartão muda.
   */
  onCardNumberBinChange(callback: (data: { bin: string | null }) => void): void {
    if (this.cardNumberField) {
      this.cardNumberField.on('binChange', callback);
    }
  }

  /**
   * Obtém os métodos de pagamento (marcas de cartão) baseado no BIN do cartão.
   */
  async getPaymentMethods(bin: string): Promise<{ results: PaymentMethodResult[] }> {
    const mp = await this.getInstance();
    return mp.getPaymentMethods({ bin });
  }

  async getInstallments(amount: string, bin: string): Promise<InstallmentResult[]> {
    const mp = await this.getInstance();
    return mp.getInstallments({ amount, bin });
  }

  async getIssuers(paymentMethodId: string, bin: string): Promise<any[]> {
    const mp = await this.getInstance();
    return mp.getIssuers({ paymentMethodId, bin });
  }

  unmountCardFields(): void {
    this.cardNumberField?.unmount?.();
    this.expirationDateField?.unmount?.();
    this.securityCodeField?.unmount?.();

    this.cardNumberField = undefined;
    this.expirationDateField = undefined;
    this.securityCodeField = undefined;
  }

  areCardFieldsMounted(): boolean {
    return !!(this.cardNumberField && this.expirationDateField && this.securityCodeField);
  }

  private async getInstance(): Promise<any> {
    if (this.mercadoPagoInstance) {
      return this.mercadoPagoInstance;
    }

    await this.ensureScriptLoaded();

    const publicKey = environment.mercadoPagoPublicKey;
    if (!publicKey) {
      throw new Error('Chave pública do Mercado Pago não configurada.');
    }

    const global = (window as unknown as { MercadoPago?: any }).MercadoPago;
    if (!global) {
      throw new Error('SDK do Mercado Pago não foi carregado.');
    }

    this.mercadoPagoInstance = new global(publicKey, { locale: 'pt-BR' });
    return this.mercadoPagoInstance;
  }

  private async getFieldsApi(): Promise<any> {
    if (this.fieldsApi) {
      return this.fieldsApi;
    }

    const mp = await this.getInstance();
    if (!mp?.fields) {
      throw new Error('Campos seguros do Mercado Pago não estão disponíveis.');
    }

    this.fieldsApi = mp.fields;
    return this.fieldsApi;
  }

  private ensureScriptLoaded(): Promise<void> {
    if ((window as unknown as { MercadoPago?: any }).MercadoPago) {
      return Promise.resolve();
    }

    if (!this.scriptPromise) {
      this.scriptPromise = new Promise<void>((resolve, reject) => {
        const script = this.document.createElement('script');
        script.src = this.scriptUrl;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error('Não foi possível carregar o SDK do Mercado Pago.'));
        this.document.body.appendChild(script);
      });
    }

    return this.scriptPromise;
  }
}
