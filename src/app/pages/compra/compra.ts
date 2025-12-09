import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { PurchaseService } from '../../services/purchase.service';

interface EventBatch {
  id: number;
  type: string;
  quantity: number;
  price: string;
  name: string;
  description: string | null;
  releaseDate: string;
  closingDate: string;
  createdAt: string;
}

interface EventDetail {
  id: number;
  name: string;
  description: string;
  location: string;
  capacity: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  bannerUrl: string;
  createdAt: string;
  updatedAt: string;
  activeBatch: EventBatch;
}

@Component({
  selector: 'app-compra',
  imports: [CommonModule, CardModule, ButtonModule],
  templateUrl: './compra.html',
  styleUrl: './compra.scss'
})
export class CompraComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private router = inject(Router);
  private purchaseService = inject(PurchaseService);

  event = signal<EventDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  quantidadeInteira = signal(0);
  quantidadeMeia = signal(0);

  eventId: string | null = null;

  ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id');
    if (this.eventId) {
      this.loadEventDetails();
    } else {
      this.error.set('ID do evento não encontrado');
      this.loading.set(false);
    }
  }

  loadEventDetails() {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<EventDetail>(`http://localhost:3000/api/events/${this.eventId}`)
      .subscribe({
        next: (data) => {
          this.event.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Erro ao carregar detalhes do evento');
          this.loading.set(false);
        }
      });
  }

  incrementarInteira() {
    this.quantidadeInteira.update(q => q + 1);
  }

  decrementarInteira() {
    this.quantidadeInteira.update(q => q > 0 ? q - 1 : 0);
  }

  incrementarMeia() {
    this.quantidadeMeia.update(q => q + 1);
  }

  decrementarMeia() {
    this.quantidadeMeia.update(q => q > 0 ? q - 1 : 0);
  }

  calcularTotal(): number {
    const event = this.event();
    if (!event || !event.activeBatch) return 0;

    const precoInteira = parseFloat(event.activeBatch.price);
    const precoMeia = precoInteira / 2;

    const totalInteira = this.quantidadeInteira() * precoInteira;
    const totalMeia = this.quantidadeMeia() * precoMeia;

    return totalInteira + totalMeia;
  }

  getTotalIngressos(): number {
    return this.quantidadeInteira() + this.quantidadeMeia();
  }

  getPrecoMeia(): number {
    const event = this.event();
    if (!event || !event.activeBatch) return 0;
    return parseFloat(event.activeBatch.price) / 2;
  }

  podeComprar(): boolean {
    return this.getTotalIngressos() > 0;
  }

  finalizar() {
    if (!this.podeComprar()) {
      return;
    }

    const event = this.event();
    if (!event || !this.eventId) return;

    const precoInteira = parseFloat(event.activeBatch.price);
    const precoMeia = precoInteira / 2;

    // Salvar dados da compra no localStorage
    this.purchaseService.savePurchase({
      eventId: this.eventId,
      eventName: event.name,
      quantidadeInteira: this.quantidadeInteira(),
      quantidadeMeia: this.quantidadeMeia(),
      precoInteira: precoInteira,
      precoMeia: precoMeia,
      total: this.calcularTotal(),
      timestamp: Date.now()
    });

    // Redirecionar para página de pagamento
    this.router.navigate(['/pagamento']);
  }

  voltar() {
    this.router.navigate(['/ingressos']);
  }
}
