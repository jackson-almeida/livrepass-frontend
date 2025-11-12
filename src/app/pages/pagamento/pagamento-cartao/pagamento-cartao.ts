import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-pagamento-cartao',
  imports: [CardModule, ButtonModule, InputTextModule, InputMaskModule, SelectModule],
  templateUrl: './pagamento-cartao.html',
  styleUrl: './pagamento-cartao.scss'
})
export class PagamentoCartaoComponent {
  private router = inject(Router);

  meses = [
    { label: '01', value: '01' },
    { label: '02', value: '02' },
    { label: '03', value: '03' },
    { label: '04', value: '04' },
    { label: '05', value: '05' },
    { label: '06', value: '06' },
    { label: '07', value: '07' },
    { label: '08', value: '08' },
    { label: '09', value: '09' },
    { label: '10', value: '10' },
    { label: '11', value: '11' },
    { label: '12', value: '12' }
  ];

  anos = Array.from({ length: 15 }, (_, i) => {
    const ano = new Date().getFullYear() + i;
    return { label: ano.toString(), value: ano.toString() };
  });

  voltarParaSelecao() {
    this.router.navigate(['/pagamento']);
  }

  finalizarPagamento() {
    // Implementar lógica de pagamento
    console.log('Processando pagamento...');
  }
}
