import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule, DatePipe } from '@angular/common';
import { CartReservationService } from '../../services/cart-reservation.service';
import { WaitingRoomCardComponent } from '../../components/waiting-room-card/waiting-room-card';
import { QueueAccessStore } from '../../services/queue-access.store';

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
  imports: [CommonModule, DatePipe, WaitingRoomCardComponent],
  templateUrl: './compra.html',
  styleUrl: './compra.scss'
})
export class CompraComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private router = inject(Router);
  private cartReservationService = inject(CartReservationService);
  private queueAccessStore = inject(QueueAccessStore);

  event = signal<EventDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  reserving = signal(false);

  categorySelections = signal<Record<number, number>>({});
  queueState = this.queueAccessStore.state;
  queuePosition = this.queueAccessStore.position;
  queueErrorMessage = this.queueAccessStore.errorMessage;

  eventId: string | null = null;

  private readonly DEFAULT_EVENT_IMAGE = '/images/default-event-banner.png';

  ngOnInit() {
    this.queueAccessStore.connect();
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
    return Object.values(this.categorySelections()).reduce((sum: number, quantity: unknown) => {
      const qty = typeof quantity === 'number' ? quantity : 0;
      return sum + qty;
    }, 0);
  }

  hasActiveBatch(): boolean {
    const event = this.event();
    return !!(event && event.activeBatch && event.activeBatch.categories?.length);
  }

  getEventImage(): string {
    const event = this.event();
    return event?.bannerUrl || this.DEFAULT_EVENT_IMAGE;
  }

  podeComprar(): boolean {
    return this.queueState() === 'allowed' && this.getTotalIngressos() > 0 && !this.reserving();
  }

  async finalizar() {
    if (!this.podeComprar()) {
      return;
    }

    const event = this.event();
    if (!event || !this.eventId || !event.activeBatch) return;

    const items = this.getActiveCategories()
      .map((category) => ({
        categoryId: category.id,
        quantity: this.getQuantidadeCategoria(category.id),
      }))
      .filter((item) => item.quantity > 0);

    if (!items.length) {
      return;
    }

    this.reserving.set(true);
    this.error.set(null);

    try {
      await this.cartReservationService.createReservation({
        eventId: Number(this.eventId),
        batchId: event.activeBatch.id,
        items,
      });

      // Redirect to cart page with timer and participant form
      this.router.navigate(['/carrinho']);
    } catch (err: any) {
      this.error.set(typeof err === 'string' ? err : 'Erro ao reservar ingressos. Tente novamente.');
    } finally {
      this.reserving.set(false);
    }
  }

  voltar() {
    this.router.navigate(['/ingressos']);
  }

  retryQueueAccess(): void {
    this.queueAccessStore.retry();
  }

  forceQueueRefresh(): void {
    this.queueAccessStore.refresh();
  }
}
