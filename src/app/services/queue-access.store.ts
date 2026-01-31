import { Injectable, signal } from '@angular/core';
import { Subscription, catchError, interval, of, startWith, switchMap } from 'rxjs';
import { QueueService, QueueStatusResponse } from './queue.service';

export type QueueAccessState = 'idle' | 'checking' | 'allowed' | 'waiting' | 'error';

@Injectable({ providedIn: 'root' })
export class QueueAccessStore {
  private readonly heartbeatInterval = 15000;
  private readonly queueStatusInterval = 5000;

  private queueAccessSub?: Subscription;
  private heartbeatSub?: Subscription;
  private queueMonitorSub?: Subscription;

  readonly state = signal<QueueAccessState>('idle');
  readonly position = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);

  constructor(private readonly queueService: QueueService) {}

  connect(): void {
    const currentState = this.state();

    if (currentState === 'allowed') {
      return;
    }

    if (currentState === 'waiting') {
      this.startHeartbeat();
      this.startQueuePolling();
      return;
    }

    if (currentState === 'checking') {
      return;
    }

    this.requestAccess();
  }

  retry(): void {
    this.requestAccess(true);
  }

  refresh(): void {
    const currentState = this.state();
    if (currentState === 'checking') {
      return;
    }

    this.queueService.getQueueStatus().subscribe({
      next: (response) => this.applyResponse(response),
      error: () => this.errorMessage.set('Não foi possível atualizar a posição agora.'),
    });
  }

  private requestAccess(force = false): void {
    const currentState = this.state();
    if (!force && (currentState === 'checking' || currentState === 'waiting')) {
      return;
    }

    this.state.set('checking');
    this.errorMessage.set(null);
    this.position.set(null);
    this.stopTracking();
    this.queueAccessSub?.unsubscribe();

    this.queueAccessSub = this.queueService.requestAccess().subscribe({
      next: (response) => this.applyResponse(response, true),
      error: () => {
        this.state.set('error');
        this.errorMessage.set('Não foi possível entrar na sala de espera.');
        this.stopTracking();
      },
    });
  }

  private applyResponse(response: QueueStatusResponse, fromAccess = false): void {
    if (response.status === 'ALLOWED') {
      this.state.set('allowed');
      this.position.set(null);
      this.errorMessage.set(null);
      this.stopTracking();
      return;
    }

    this.state.set('waiting');
    this.position.set(response.position ?? null);
    this.errorMessage.set(null);
    this.startHeartbeat(fromAccess);
    this.startQueuePolling(fromAccess);
  }

  private startHeartbeat(force = false): void {
    if (this.heartbeatSub && !force) {
      return;
    }

    if (this.heartbeatSub) {
      this.heartbeatSub.unsubscribe();
    }

    this.heartbeatSub = interval(this.heartbeatInterval)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.queueService.sendHeartbeat().pipe(
            catchError(() => of(null)),
          ),
        ),
      )
      .subscribe();
  }

  private startQueuePolling(force = false): void {
    if (this.queueMonitorSub && !force) {
      return;
    }

    if (this.queueMonitorSub) {
      this.queueMonitorSub.unsubscribe();
    }

    this.queueMonitorSub = interval(this.queueStatusInterval)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.queueService.getQueueStatus().pipe(
            catchError(() => {
              this.errorMessage.set('Oscilação detectada. Mantemos você na fila.');
              return of(null);
            }),
          ),
        ),
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }

        this.position.set(typeof response.position === 'number' ? response.position : null);

        if (response.status === 'ALLOWED') {
          this.state.set('allowed');
          this.position.set(null);
          this.errorMessage.set(null);
          this.stopTracking();
        }
      });
  }

  private stopTracking(): void {
    this.heartbeatSub?.unsubscribe();
    this.heartbeatSub = undefined;
    this.queueMonitorSub?.unsubscribe();
    this.queueMonitorSub = undefined;
  }
}
