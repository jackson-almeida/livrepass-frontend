import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PaymentService, TicketsResponse, Ticket } from '../../services/payment.service';
import { MessageService } from '../../services/message.service';

@Component({
    selector: 'app-ingressos-digitais',
    standalone: true,
    imports: [CommonModule, DatePipe, RouterLink],
    templateUrl: './ingressos-digitais.html',
    styleUrl: './ingressos-digitais.scss',
})
export class IngressosDigitaisComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private paymentService = inject(PaymentService);
    private messageService = inject(MessageService);

    ticketsData = signal<TicketsResponse | null>(null);
    loading = signal(true);
    error = signal<string | null>(null);

    /** ID do ingresso que será impresso. null = imprimir todos */
    printingTicketId = signal<number | null>(null);

    /** Se o Google Wallet está configurado */
    googleWalletConfigured = signal<boolean>(false);

    tickets = computed(() => this.ticketsData()?.tickets || []);
    eventName = computed(() => this.ticketsData()?.eventName || '');
    purchaseDate = computed(() => this.ticketsData()?.purchaseDate || '');
    purchaseId = computed(() => this.route.snapshot.paramMap.get('purchaseId') || '');

    async ngOnInit(): Promise<void> {
        const purchaseId = this.route.snapshot.paramMap.get('purchaseId');
        if (!purchaseId) {
            this.router.navigate(['/meus-pedidos']);
            return;
        }

        try {
            const data = await firstValueFrom(this.paymentService.getTickets(purchaseId));
            this.ticketsData.set(data);

            try {
                const status: { configured: boolean } = await firstValueFrom(
                    this.paymentService.checkGoogleWalletStatus(),
                );
                this.googleWalletConfigured.set(status.configured);
            } catch {
                this.googleWalletConfigured.set(false);
            }
        } catch (err) {
            const message =
                (err as { error?: { message?: string } })?.error?.message ||
                'Erro ao carregar ingressos.';
            this.error.set(message);
        } finally {
            this.loading.set(false);
        }
    }

    async printTicket(ticket: Ticket): Promise<void> {
        if (this.tickets().length > 1) {
            const onlyThis = await this.messageService.confirm({
                title: 'Imprimir ingressos',
                message: `Deseja imprimir apenas o ingresso de ${ticket.participantName} ou todos os ingressos?`,
                confirmText: 'Apenas este',
                cancelText: 'Todos',
                icon: 'pi pi-print',
            });

            if (onlyThis) {
                this.printingTicketId.set(ticket.ticketId);
            } else {
                this.printingTicketId.set(null);
            }
        } else {
            this.printingTicketId.set(null);
        }

        setTimeout(() => {
            window.print();
            this.printingTicketId.set(null);
        }, 100);
    }

    printAll(): void {
        this.printingTicketId.set(null);
        setTimeout(() => window.print(), 100);
    }

    isVisibleForPrint(ticket: Ticket): boolean {
        const selected = this.printingTicketId();
        return selected === null || selected === ticket.ticketId;
    }

    async addToGoogleWallet(ticket: Ticket): Promise<void> {
        try {
            const response: { jwt: string } = await firstValueFrom(
                this.paymentService.getGoogleWalletJWT(this.purchaseId(), ticket.ticketId),
            );

            const url = `https://pay.google.com/gp/v/save/${response.jwt}`;
            window.open(url, '_blank');

            this.messageService.success('Ingresso adicionado ao Google Wallet!');
        } catch (err: any) {
            let message = 'Erro ao adicionar ingresso ao Google Wallet.';

            if (err?.error?.message) {
                message = err.error.message;
            } else if (err?.message) {
                message = err.message;
            }

            if (message.includes('não está configurado') || message.includes('not configured')) {
                message = 'Google Wallet não está disponível no momento. Por favor, use a opção de imprimir o ingresso.';
            }

            this.messageService.error(message);
        }
    }

    addToGoogleCalendar(ticket: Ticket): void {
        try {
            const startDate = new Date(ticket.eventStartDate);
            const endDate = new Date(ticket.eventEndDate);

            // Formata as datas no formato do Google Calendar (YYYYMMDDTHHMMSSZ)
            const formatGoogleCalendarDate = (date: Date): string => {
                const year = date.getUTCFullYear();
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const day = String(date.getUTCDate()).padStart(2, '0');
                const hours = String(date.getUTCHours()).padStart(2, '0');
                const minutes = String(date.getUTCMinutes()).padStart(2, '0');
                const seconds = String(date.getUTCSeconds()).padStart(2, '0');
                return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
            };

            const startDateStr = formatGoogleCalendarDate(startDate);
            const endDateStr = formatGoogleCalendarDate(endDate);

            // Cria a descrição do evento
            const description = [
                `Ingresso para: ${ticket.participantName}`,
                `Documento: ${ticket.documentType} ${ticket.documentNumber}`,
                `Categoria: ${ticket.categoryType || 'Ingresso'}`,
                `ID do ingresso: #${ticket.ticketId}`,
            ].join('\\n');

            // Monta o link do Google Calendar
            const params = new URLSearchParams({
                action: 'TEMPLATE',
                text: ticket.eventName,
                dates: `${startDateStr}/${endDateStr}`,
                details: description,
                location: ticket.eventLocation,
            });

            const calendarUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;

            // Abre o Google Calendar em nova aba
            window.open(calendarUrl, '_blank');

            this.messageService.success('Evento adicionado ao Google Calendar!');
        } catch (err) {
            this.messageService.error('Erro ao adicionar evento ao Google Calendar.');
        }
    }
}
