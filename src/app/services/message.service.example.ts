/**
 * Exemplos de uso do MessageService
 * 
 * Jackson, criei esse componente global para usarmos para disparar mensagens de erros e solicitar ação do usuário.
 */

import { Component, inject } from '@angular/core';
import { MessageService } from './message.service';

// Exemplo de componente usando o MessageService
export class ExampleComponent {
    private messageService = inject(MessageService);

    // Exemplo: Toast de sucesso
    showSuccess() {
        this.messageService.success('Operação realizada com sucesso!');
    }

    // Exemplo: Toast de erro
    showError() {
        this.messageService.error('Erro ao processar solicitação');
    }

    // Exemplo: Toast de aviso
    showWarning() {
        this.messageService.warning('Atenção: Verifique os dados informados');
    }

    // Exemplo: Toast informativo
    showInfo() {
        this.messageService.info('Nova atualização disponível');
    }

    // Exemplo: Toast com título
    showWithTitle() {
        this.messageService.success(
            'Seus dados foram salvos com sucesso',
            'Salvo!',
            5000
        );
    }

    // Exemplo: Dialog de confirmação
    async showConfirm() {
        const result = await this.messageService.confirm({
            title: 'Confirmar exclusão',
            message: 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.',
            confirmText: 'Excluir',
            cancelText: 'Cancelar',
            confirmButtonClass: 'bg-red-600 hover:bg-red-700',
        });

        if (result) {
            // Usuário confirmou
            this.messageService.success('Item excluído com sucesso');
        } else {
            // Usuário cancelou
            this.messageService.info('Operação cancelada');
        }
    }

    // Exemplo: Dialog de alerta
    async showAlert() {
        await this.messageService.alert({
            title: 'Atenção',
            message: 'Você precisa estar logado para continuar.',
            buttonText: 'Entendi',
        });
    }

    // Exemplo: Loading indicator
    async showLoading() {
        this.messageService.showLoading('Processando pagamento...');

        try {
            await this.someAsyncOperation();
            this.messageService.success('Pagamento processado com sucesso!');
        } catch (error) {
            this.messageService.error('Erro ao processar pagamento');
        } finally {
            this.messageService.hideLoading();
        }
    }

    // Exemplo: Múltiplas mensagens
    showMultiple() {
        this.messageService.success('Item adicionado ao carrinho');
        this.messageService.info('Você tem 3 itens no carrinho');
    }

    // Exemplo: Mensagem em posição específica
    showCustomPosition() {
        this.messageService.show(
            'Mensagem no canto inferior esquerdo',
            'info',
            undefined,
            5000,
            'bottom-left'
        );
    }

    private async someAsyncOperation(): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(resolve, 2000);
        });
    }
}

/**
 * Métodos disponíveis no MessageService:
 * 
 * Toast Messages:
 * - success(message, title?, duration?)
 * - error(message, title?, duration?)
 * - warning(message, title?, duration?)
 * - info(message, title?, duration?)
 * - show(message, type, title?, duration?, position?)
 * - remove(id)
 * - clear()
 * 
 * Dialogs:
 * - confirm(options): Promise<boolean>
 * - alert(options): Promise<void>
 * 
 * Loading:
 * - showLoading(message?)
 * - hideLoading()
 */
