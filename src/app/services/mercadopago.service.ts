import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { environment } from '../config/environment';

export interface CardTokenPayload {
  cardholderName: string;
  cardNumber: string;
  cardExpirationMonth: string;
  cardExpirationYear: string;
  securityCode: string;
  identificationType: string;
  identificationNumber: string;
}

@Injectable({ providedIn: 'root' })
export class MercadoPagoService {
  private readonly scriptUrl = 'https://sdk.mercadopago.com/js/v2';
  private scriptPromise?: Promise<void>;
  private mercadoPagoInstance: any;

  constructor(@Inject(DOCUMENT) private document: Document) {}

  async createCardToken(payload: CardTokenPayload): Promise<{ id: string; first_six_digits: string } & Record<string, unknown>> {
    const mp = await this.getInstance();
    return mp.cardToken.create(payload);
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
        script.onerror = () => reject(new Error('Não foi possível carregar o SDK do Mercado Pago.'));
        this.document.body.appendChild(script);
      });
    }

    return this.scriptPromise;
  }
}
