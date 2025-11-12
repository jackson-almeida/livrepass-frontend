import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-carrinho',
  imports: [CardModule, ButtonModule],
  templateUrl: './carrinho.html',
  styleUrl: './carrinho.scss'
})
export class CarrinhoComponent {
  private router = inject(Router);

  finalizarCompra() {
    this.router.navigate(['/pagamento']);
  }
}
