import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../config/environment';

export interface CartReservationItem {
    categoryId: number;
    categoryType: string;
    batchId: number;
    batchName: string;
    label: string;
    pricingType: 'inteira' | 'meia';
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    maxPerPurchase: number;
}

export interface CartReservation {
    id: string;
    eventId: number;
    eventName: string;
    status: string;
    items: CartReservationItem[];
    totalAmount: string;
    totalTickets: number;
    expiresAt: string;
    remainingSeconds: number;
    createdAt: string;
}

export interface CreateCartRequest {
    eventId: number;
    batchId: number;
    items: {
        categoryId: number;
        pricingType?: 'inteira' | 'meia';
        quantity: number;
    }[];
}

export interface TicketParticipant {
    documentType: string;
    documentNumber: string;
    name: string;
    email: string;
    categoryId: number;
    categoryType?: string;
}

@Injectable({
    providedIn: 'root',
})
export class CartReservationService implements OnDestroy {
    private readonly http = inject(HttpClient);
    private readonly authService = inject(AuthService);
    private readonly apiUrl = environment.apiUrl;

    // State
    private _reservation = signal<CartReservation | null>(null);
    private _remainingSeconds = signal<number>(0);
    private _loading = signal(false);
    private _error = signal<string | null>(null);
    private _participants = signal<TicketParticipant[]>([]);

    private timerInterval: ReturnType<typeof setInterval> | null = null;

    // Public signals
    reservation = this._reservation.asReadonly();
    remainingSeconds = this._remainingSeconds.asReadonly();
    loading = this._loading.asReadonly();
    error = this._error.asReadonly();
    participants = this._participants.asReadonly();

    isExpired = computed(() => this._remainingSeconds() <= 0 && this._reservation() !== null);
    hasReservation = computed(() => this._reservation() !== null && !this.isExpired());

    remainingMinutes = computed(() => Math.floor(this._remainingSeconds() / 60));
    remainingSecondsDisplay = computed(() => this._remainingSeconds() % 60);
    remainingFormatted = computed(() => {
        const mins = this.remainingMinutes();
        const secs = this.remainingSecondsDisplay();
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    });

    ngOnDestroy(): void {
        this.stopTimer();
    }

    /**
     * Create a new cart reservation on the server.
     */
    createReservation(data: CreateCartRequest): Promise<CartReservation> {
        return new Promise((resolve, reject) => {
            this._loading.set(true);
            this._error.set(null);

            this.http
                .post<CartReservation>(`${this.apiUrl}/cart`, data, {
                    headers: this.getAuthHeaders(),
                })
                .subscribe({
                    next: (res) => {
                        this._reservation.set(res);
                        this._remainingSeconds.set(res.remainingSeconds);
                        this._loading.set(false);
                        this.initializeParticipants(res);
                        this.startTimer();
                        resolve(res);
                    },
                    error: (err) => {
                        this._loading.set(false);
                        const message =
                            err.error?.message || 'Erro ao criar reserva. Tente novamente.';
                        this._error.set(message);
                        reject(message);
                    },
                });
        });
    }

    /**
     * Load the current active cart from the server.
     */
    loadActiveCart(): Promise<CartReservation | null> {
        return new Promise((resolve) => {
            this._loading.set(true);

            this.http
                .get<CartReservation | { message: string }>(`${this.apiUrl}/cart`, {
                    headers: this.getAuthHeaders(),
                })
                .subscribe({
                    next: (res) => {
                        this._loading.set(false);
                        if ('id' in res) {
                            this._reservation.set(res as CartReservation);
                            this._remainingSeconds.set((res as CartReservation).remainingSeconds);
                            this.initializeParticipants(res as CartReservation);
                            this.startTimer();
                            resolve(res as CartReservation);
                        } else {
                            this._reservation.set(null);
                            resolve(null);
                        }
                    },
                    error: () => {
                        this._loading.set(false);
                        this._reservation.set(null);
                        resolve(null);
                    },
                });
        });
    }

    /**
     * Cancel the current cart reservation.
     */
    cancelReservation(): Promise<void> {
        return new Promise((resolve) => {
            this.stopTimer();
            this.http
                .delete(`${this.apiUrl}/cart`, {
                    headers: this.getAuthHeaders(),
                })
                .subscribe({
                    next: () => {
                        this.clearState();
                        resolve();
                    },
                    error: () => {
                        this.clearState();
                        resolve();
                    },
                });
        });
    }

    /**
     * Update a participant's data.
     */
    updateParticipant(index: number, data: Partial<TicketParticipant>): void {
        this._participants.update((list) => {
            const updated = [...list];
            if (updated[index]) {
                updated[index] = { ...updated[index], ...data };
            }
            return updated;
        });
    }

    /**
     * Get participants for payment submission.
     */
    getParticipants(): TicketParticipant[] {
        return this._participants();
    }

    /**
     * Check if all participants have been filled.
     */
    allParticipantsFilled(): boolean {
        return this._participants().every(
            (p) =>
                p.documentType.trim() !== '' &&
                p.documentNumber.trim() !== '' &&
                p.name.trim() !== '' &&
                p.email.trim() !== ''
        );
    }

    clearState(): void {
        this.stopTimer();
        this._reservation.set(null);
        this._remainingSeconds.set(0);
        this._participants.set([]);
        this._error.set(null);
    }

    // ─── Private helpers ──────────────────────────────────────────

    private initializeParticipants(reservation: CartReservation): void {
        const participants: TicketParticipant[] = [];

        for (const item of reservation.items) {
            for (let i = 0; i < item.quantity; i++) {
                participants.push({
                    documentType: 'CPF',
                    documentNumber: '',
                    name: '',
                    email: '',
                    categoryId: item.categoryId,
                    categoryType: item.categoryType,
                });
            }
        }

        this._participants.set(participants);
    }

    private startTimer(): void {
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            const current = this._remainingSeconds();
            if (current <= 0) {
                this.stopTimer();
                this._error.set('Tempo de reserva expirado. Selecione os ingressos novamente.');
                return;
            }
            this._remainingSeconds.set(current - 1);
        }, 1000);
    }

    private stopTimer(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    private getAuthHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders({
            Authorization: `Bearer ${token}`,
        });
    }
}
