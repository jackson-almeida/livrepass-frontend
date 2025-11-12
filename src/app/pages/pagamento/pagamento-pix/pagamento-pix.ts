import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-pagamento-pix',
  imports: [CardModule, ButtonModule],
  templateUrl: './pagamento-pix.html',
  styleUrl: './pagamento-pix.scss'
})
export class PagamentoPixComponent {
  private router = inject(Router);

  pixCode = '00020126580014br.gov.bcb.pix0136a1b2c3d4-e5f6-7890-abcd-ef1234567890520400005303986540542.005802BR5913PassLivre Ltda6009SAO PAULO62070503***63041D3D';

  voltarParaSelecao() {
    this.router.navigate(['/pagamento']);
  }

  copiarCodigo() {
    navigator.clipboard.writeText(this.pixCode);
    // Pode adicionar uma mensagem de sucesso aqui
    console.log('Código PIX copiado!');
  }

  finalizarPagamento() {
    // Implementar lógica de verificação de pagamento
    console.log('Aguardando confirmação do pagamento...');
  }
}
