import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { QueueAccessState } from '../../services/queue-access.store';

@Component({
  selector: 'app-waiting-room-card',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './waiting-room-card.html',
  styleUrl: './waiting-room-card.scss',
})
export class WaitingRoomCardComponent {
  @Input() state: QueueAccessState = 'checking';
  @Input() position: number | null = null;
  @Input() errorMessage: string | null = null;
  @Input() title = 'Você está na fila virtual';
  @Input() subtitle = 'Assim que sua vez chegar continuaremos automaticamente.';
  @Input() footerNote = 'Mantenha esta aba aberta para não perder sua vaga.';
  @Input() refreshLabel = 'Atualizar agora';
  @Input() retryLabel = 'Tentar novamente';
  @Input() tips: Array<{ label: string; helper: string }> = [
    {
      label: 'Mantenha esta aba aberta',
      helper: 'Enviamos um sinal de presença a cada 15 segundos para segurar sua vaga.',
    },
    {
      label: 'Evite recarregar a página',
      helper: 'Recarregar pode gerar um novo identificador e reposicionar você na fila.',
    },
  ];

  @Output() refresh = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();

  get normalizedState(): 'waiting' | 'checking' | 'error' {
    if (this.state === 'waiting') {
      return 'waiting';
    }
    if (this.state === 'error') {
      return 'error';
    }
    return 'checking';
  }

  handleRefresh(): void {
    this.refresh.emit();
  }

  handleRetry(): void {
    this.retry.emit();
  }
}
