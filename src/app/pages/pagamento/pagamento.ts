import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-pagamento',
  imports: [CardModule, ButtonModule, RouterOutlet],
  templateUrl: './pagamento.html',
  styleUrl: './pagamento.scss'
})
export class PagamentoComponent {
  router = inject(Router);
  selectedMethod: 'card' | 'pix' | null = null;

  selectPaymentMethod(method: 'card' | 'pix') {
    this.selectedMethod = method;
    this.router.navigate(['/pagamento', method]);
  }
}
