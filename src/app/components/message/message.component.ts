import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService, ToastMessage } from '../../services/message.service';

@Component({
    selector: 'app-message',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './message.component.html',
    styleUrl: './message.component.scss',
})
export class MessageComponent {
    messageService = inject(MessageService);

    messages = this.messageService.messages;
    confirmDialog = this.messageService.confirmDialog;
    alertDialog = this.messageService.alertDialog;
    loading = this.messageService.loading;
    loadingMessage = this.messageService.loadingMessage;

    // Group messages by position
    messagesByPosition = computed(() => {
        const grouped: Record<string, ToastMessage[]> = {};
        this.messages().forEach((msg: ToastMessage) => {
            const pos = msg.position || 'top-right';
            if (!grouped[pos]) {
                grouped[pos] = [];
            }
            grouped[pos].push(msg);
        });
        return grouped;
    });

    getPositionKeys(): string[] {
        return Object.keys(this.messagesByPosition());
    }

    getMessagesForPosition(position: string): ToastMessage[] {
        return this.messagesByPosition()[position] || [];
    }

    getMessageIcon(type: string): string {
        const icons: Record<string, string> = {
            success: 'pi-check-circle',
            error: 'pi-times-circle',
            warning: 'pi-exclamation-triangle',
            info: 'pi-info-circle',
        };
        return icons[type] || 'pi-info-circle';
    }

    getMessageColorClass(type: string): string {
        const colors: Record<string, string> = {
            success:
                'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
            error:
                'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
            warning:
                'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
            info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
        };
        return colors[type] || colors['info'];
    }

    getMessageIconColorClass(type: string): string {
        const colors: Record<string, string> = {
            success: 'text-green-600 dark:text-green-400',
            error: 'text-red-600 dark:text-red-400',
            warning: 'text-amber-600 dark:text-amber-400',
            info: 'text-blue-600 dark:text-blue-400',
        };
        return colors[type] || colors['info'];
    }

    getPositionClasses(position: string): string {
        const positions: Record<string, string> = {
            'top-right': 'top-4 right-4',
            'top-left': 'top-4 left-4',
            'top-center': 'top-4 left-1/2 -translate-x-1/2',
            'bottom-right': 'bottom-4 right-4',
            'bottom-left': 'bottom-4 left-4',
            'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
        };
        return positions[position] || positions['top-right'];
    }

    closeMessage(id: string): void {
        this.messageService.remove(id);
    }

    handleConfirm(result: boolean): void {
        this.messageService.closeConfirm(result);
    }

    handleAlert(): void {
        this.messageService.closeAlert();
    }
}
