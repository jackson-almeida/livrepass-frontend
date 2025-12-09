import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { EventService } from '../../services/event.service';
import { Event } from '../../models/event.model';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-ingressos',
  imports: [CardModule, ButtonModule, DatePipe],
  templateUrl: './ingressos.html',
  styleUrl: './ingressos.scss'
})
export class IngressosComponent implements OnInit {
  private eventService = inject(EventService);
  private router = inject(Router);

  events = signal<Event[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.loading.set(true);
    this.eventService.getEvents().subscribe({
      next: (data) => {
        this.events.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Erro ao carregar eventos:', err);
        this.error.set('Erro ao carregar eventos. Tente novamente mais tarde.');
        this.loading.set(false);
      }
    });
  }

  comprar(event: Event) {
    this.router.navigate(['/compra', event.id]);
  }
}
