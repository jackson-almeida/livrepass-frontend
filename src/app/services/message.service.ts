import { Injectable, signal, computed } from '@angular/core';

export type MessageType = 'success' | 'error' | 'warning' | 'info';
export type MessagePosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface ToastMessage {
    id: string;
    type: MessageType;
    title?: string;
    message: string;
    duration?: number; // in milliseconds, 0 = infinite
    position?: MessagePosition;
    closable?: boolean;
    timestamp: number;
}

export interface ConfirmDialogOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonClass?: string;
    cancelButtonClass?: string;
    icon?: string;
}

export interface AlertDialogOptions {
    title?: string;
    message: string;
    buttonText?: string;
    buttonClass?: string;
    icon?: string;
}

@Injectable({ providedIn: 'root' })
export class MessageService {
    private _messages = signal<ToastMessage[]>([]);
    private _confirmDialog = signal<{
        visible: boolean;
        options: ConfirmDialogOptions;
        resolve?: (value: boolean) => void;
    }>({
        visible: false,
        options: { message: '' },
    });
    private _alertDialog = signal<{
        visible: boolean;
        options: AlertDialogOptions;
        resolve?: () => void;
    }>({
        visible: false,
        options: { message: '' },
    });
    private _loading = signal<boolean>(false);
    private _loadingMessage = signal<string>('');

    // Public signals
    messages = this._messages.asReadonly();
    confirmDialog = this._confirmDialog.asReadonly();
    alertDialog = this._alertDialog.asReadonly();
    loading = this._loading.asReadonly();
    loadingMessage = this._loadingMessage.asReadonly();

    hasMessages = computed(() => this._messages().length > 0);
    hasActiveDialog = computed(
        () => this._confirmDialog().visible || this._alertDialog().visible,
    );

    /**
     * Show a success toast message
     */
    success(
        message: string,
        title?: string,
        duration: number = 5000,
    ): string {
        return this.show(message, 'success', title, duration);
    }

    /**
     * Show an error toast message
     */
    error(
        message: string,
        title?: string,
        duration: number = 7000,
    ): string {
        return this.show(message, 'error', title, duration);
    }

    /**
     * Show a warning toast message
     */
    warning(
        message: string,
        title?: string,
        duration: number = 6000,
    ): string {
        return this.show(message, 'warning', title, duration);
    }

    /**
     * Show an info toast message
     */
    info(
        message: string,
        title?: string,
        duration: number = 5000,
    ): string {
        return this.show(message, 'info', title, duration);
    }

    /**
     * Show a toast message
     */
    show(
        message: string,
        type: MessageType = 'info',
        title?: string,
        duration: number = 5000,
        position: MessagePosition = 'top-right',
    ): string {
        const id = this.generateId();
        const toast: ToastMessage = {
            id,
            type,
            title,
            message,
            duration,
            position,
            closable: true,
            timestamp: Date.now(),
        };

        this._messages.update((msgs: ToastMessage[]) => [...msgs, toast]);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }

        return id;
    }

    /**
     * Remove a message by ID
     */
    remove(id: string): void {
        this._messages
            .update((msgs: ToastMessage[]) => msgs.filter((msg: ToastMessage) => msg.id !== id));
    }

    /**
     * Clear all messages
     */
    clear(): void {
        this._messages.set([]);
    }

    /**
     * Show a confirmation dialog
     */
    confirm(options: ConfirmDialogOptions): Promise<boolean> {
        return new Promise((resolve) => {
            this._confirmDialog.set({
                visible: true,
                options: {
                    title: options.title || 'Confirmar',
                    message: options.message,
                    confirmText: options.confirmText || 'Confirmar',
                    cancelText: options.cancelText || 'Cancelar',
                    confirmButtonClass:
                        options.confirmButtonClass || 'bg-primary-600 hover:bg-primary-700',
                    cancelButtonClass:
                        options.cancelButtonClass ||
                        'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600',
                    icon: options.icon || 'pi pi-question-circle',
                },
                resolve,
            });
        });
    }

    /**
     * Close confirmation dialog
     */
    closeConfirm(result: boolean): void {
        const dialog = this._confirmDialog();
        if (dialog.resolve) {
            dialog.resolve(result);
        }
        this._confirmDialog.set({
            visible: false,
            options: { message: '' },
        });
    }

    /**
     * Show an alert dialog
     */
    alert(options: AlertDialogOptions): Promise<void> {
        return new Promise((resolve) => {
            this._alertDialog.set({
                visible: true,
                options: {
                    title: options.title || 'Atenção',
                    message: options.message,
                    buttonText: options.buttonText || 'OK',
                    buttonClass:
                        options.buttonClass || 'bg-primary-600 hover:bg-primary-700',
                    icon: options.icon || 'pi pi-info-circle',
                },
                resolve,
            });
        });
    }

    /**
     * Close alert dialog
     */
    closeAlert(): void {
        const dialog = this._alertDialog();
        if (dialog.resolve) {
            dialog.resolve();
        }
        this._alertDialog.set({
            visible: false,
            options: { message: '' },
        });
    }

    /**
     * Show loading indicator
     */
    showLoading(message: string = 'Carregando...'): void {
        this._loading.set(true);
        this._loadingMessage.set(message);
    }

    /**
     * Hide loading indicator
     */
    hideLoading(): void {
        this._loading.set(false);
        this._loadingMessage.set('');
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
