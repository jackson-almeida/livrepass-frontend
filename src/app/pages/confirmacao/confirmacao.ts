import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserPurchasesService, UserPurchase } from '../../services/user-purchases.service';

@Component({
    selector: 'app-confirmacao',
    standalone: true,
    imports: [CommonModule, CurrencyPipe, DatePipe, RouterLink],
    templateUrl: './confirmacao.html',
    styleUrl: './confirmacao.scss',
})
export class ConfirmacaoComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private purchasesService = inject(UserPurchasesService);

    purchase = signal<UserPurchase | null>(null);
    loading = signal(true);
    error = signal<string | null>(null);

    isApproved = computed(() => {
        const status = this.purchase()?.status;
        return status === 'approved' || status === 'authorized';
    });

    isPending = computed(() => {
        const status = this.purchase()?.status;
        return status === 'pending' || status === 'in_process' || status === 'in_mediation';
    });

    isRejected = computed(() => {
        const status = this.purchase()?.status;
        return status === 'rejected' || status === 'cancelled' || status === 'refunded' || status === 'charged_back';
    });

    statusLabel = computed(() => this.purchasesService.getStatusLabel(this.purchase()?.status || 'pending'));
    statusColor = computed(() => this.purchasesService.getStatusColor(this.purchase()?.status || 'pending'));
    paymentMethodLabel = computed(() => this.purchasesService.getPaymentMethodLabel(this.purchase()?.paymentMethod || 'pix'));

    totalTickets = computed(() => {
        const items = this.purchase()?.items || [];
        return items.reduce((sum, item) => sum + item.quantity, 0);
    });

    async ngOnInit(): Promise<void> {
        const purchaseId = this.route.snapshot.paramMap.get('purchaseId');
        if (!purchaseId) {
            this.router.navigate(['/meus-pedidos']);
            return;
        }

        try {
            const data = await this.purchasesService.getPurchaseById(purchaseId);
            this.purchase.set(data);
        } catch (err) {
            this.error.set(typeof err === 'string' ? err : 'Erro ao carregar dados da compra.');
        } finally {
            this.loading.set(false);
        }
    }

    async refreshStatus(): Promise<void> {
        const purchaseId = this.purchase()?.purchaseId;
        if (!purchaseId) return;

        try {
            const data = await this.purchasesService.getPurchaseById(purchaseId);
            this.purchase.set(data);
        } catch {
            // silently ignore refresh errors
        }
    }

    printReceipt(): void {
        window.print();
    }
}
