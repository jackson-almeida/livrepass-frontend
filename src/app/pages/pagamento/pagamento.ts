import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { filter } from 'rxjs';

@Component({
  selector: 'app-pagamento',
  imports: [CardModule, ButtonModule, RouterOutlet],
  templateUrl: './pagamento.html',
  styleUrl: './pagamento.scss'
})
export class PagamentoComponent implements OnInit {
  router = inject(Router);
  showSelection = true;

  ngOnInit() {
    // Verifica a URL atual
    this.checkRoute();

    // Escuta mudanças de rota
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkRoute();
    });
  }

  checkRoute() {
    const url = this.router.url;
    this.showSelection = url === '/pagamento';
  }

  selectPaymentMethod(method: 'card' | 'pix') {
    this.showSelection = false;
    this.router.navigate(['/pagamento', method]);
  }
}
