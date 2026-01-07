import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { PurchaseService } from '../../services/purchase.service';

interface BatchCategory {
  id: number;
  type: string;
  label: string;
  price: string;
  totalQuantity: number;
  soldQuantity: number;
  maxPerPurchase: number;
  isActive: boolean;
  remainingQuantity: number;
}

interface EventBatch {
  id: number;
  name: string;
  description: string | null;
  sequence: number;
  capacity: number;
  maxPerPurchase: number;
  releaseDate: string;
  closingDate: string;
  categories: BatchCategory[];
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
  hasActiveBatch: boolean;
  activeBatch: EventBatch | null;
  nextBatch?: EventBatch | null;
  nextBatchReleaseDate?: string | null;
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

  categorySelections = signal<Record<number, number>>({});

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
          this.initializeCategorySelections(data.activeBatch?.categories ?? []);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.error?.message || 'Erro ao carregar detalhes do evento');
          this.loading.set(false);
        }
      });
  }

  private initializeCategorySelections(categories: BatchCategory[]) {
    const selections = categories.reduce<Record<number, number>>((acc, category) => {
      acc[category.id] = 0;
      return acc;
    }, {});
    this.categorySelections.set(selections);
  }

  getActiveCategories(): BatchCategory[] {
    return this.event()?.activeBatch?.categories ?? [];
  }

  getQuantidadeCategoria(categoryId: number): number {
    return this.categorySelections()[categoryId] ?? 0;
  }

  private getBatchLimit(): number {
    return this.event()?.activeBatch?.maxPerPurchase ?? Number.MAX_SAFE_INTEGER;
  }

  private getCategoryRemaining(category: BatchCategory): number {
    if (typeof category.remainingQuantity === 'number') {
      return category.remainingQuantity;
    }
    if (typeof category.totalQuantity === 'number' && typeof category.soldQuantity === 'number') {
      return Math.max(category.totalQuantity - category.soldQuantity, 0);
    }
    return Number.MAX_SAFE_INTEGER;
  }

  incrementarCategoria(category: BatchCategory) {
    if (!category.isActive) {
      return;
    }

    const current = this.getQuantidadeCategoria(category.id);
    const categoryLimit = category.maxPerPurchase || Number.MAX_SAFE_INTEGER;
    const remaining = this.getCategoryRemaining(category);
    const batchLimit = this.getBatchLimit();
    const totalAtual = this.getTotalIngressos();

    if (
      current >= categoryLimit ||
      current >= remaining ||
      totalAtual >= batchLimit
    ) {
      return;
    }

    this.categorySelections.update((state) => ({
      ...state,
      [category.id]: current + 1,
    }));
  }

  decrementarCategoria(category: BatchCategory) {
    const current = this.getQuantidadeCategoria(category.id);
    if (current <= 0) {
      return;
    }

    this.categorySelections.update((state) => ({
      ...state,
      [category.id]: current - 1,
    }));
  }

  isIncrementDisabled(category: BatchCategory): boolean {
    const current = this.getQuantidadeCategoria(category.id);
    const categoryLimit = category.maxPerPurchase || Number.MAX_SAFE_INTEGER;
    const remaining = this.getCategoryRemaining(category);
    const batchLimit = this.getBatchLimit();
    const totalAtual = this.getTotalIngressos();

    return (
      !category.isActive ||
      current >= categoryLimit ||
      current >= remaining ||
      totalAtual >= batchLimit
    );
  }

  calcularTotal(): number {
    return this.getActiveCategories().reduce((total, category) => {
      const price = parseFloat(category.price);
      const quantity = this.getQuantidadeCategoria(category.id);
      if (!quantity || isNaN(price)) {
        return total;
      }
      return total + price * quantity;
    }, 0);
  }

  getTotalIngressos(): number {
    return Object.values(this.categorySelections()).reduce((sum, quantity) => sum + quantity, 0);
  }

  hasActiveBatch(): boolean {
    const event = this.event();
    return !!(event && event.activeBatch && event.activeBatch.categories?.length);
  }

  podeComprar(): boolean {
    return this.getTotalIngressos() > 0;
  }

  finalizar() {
    if (!this.podeComprar()) {
      return;
    }

    const event = this.event();
    if (!event || !this.eventId || !event.activeBatch) return;

    const categoriasSelecionadas = this.getActiveCategories()
      .map((category) => {
        const price = parseFloat(category.price);
        return {
        categoryId: category.id,
        label: category.label,
        type: category.type,
          unitPrice: isNaN(price) ? 0 : price,
        quantity: this.getQuantidadeCategoria(category.id),
        maxPerPurchase: category.maxPerPurchase,
        };
      })
      .filter((item) => item.quantity > 0);

    if (!categoriasSelecionadas.length) {
      return;
    }

    // Salvar dados da compra no localStorage
    this.purchaseService.savePurchase({
      eventId: this.eventId,
      eventName: event.name,
      batchId: event.activeBatch.id,
      batchName: event.activeBatch.name,
      categories: categoriasSelecionadas,
      totalTickets: this.getTotalIngressos(),
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
