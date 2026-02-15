import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Event } from '../../models/event.model';

@Component({
    selector: 'app-event-card',
    standalone: true,
    imports: [DatePipe],
    templateUrl: './event-card.html',
    styleUrl: './event-card.scss'
})
export class EventCardComponent {
    @Input({ required: true }) event!: Event;
    @Output() buyClick = new EventEmitter<Event>();

    // Imagem padrão para eventos sem banner (da pasta public)
    private readonly DEFAULT_EVENT_IMAGE = '/images/default-event-banner.png';

    hasActiveBatch(): boolean {
        if (typeof this.event.hasActiveBatch === 'boolean') {
            return this.event.hasActiveBatch;
        }
        return Boolean(this.event.activeBatch);
    }

    getNextBatchReleaseDate(): string | null {
        return this.event.nextBatchReleaseDate ?? this.event.nextBatch?.releaseDate ?? null;
    }

    getEventImage(): string {
        return this.event.bannerUrl || this.DEFAULT_EVENT_IMAGE;
    }

    onBuyClick() {
        this.buyClick.emit(this.event);
    }
}
