import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { ProductSelection } from '../../models/product.model';

@Component({
    selector: 'app-cart-item',
    standalone: true,
    imports: [CurrencyPipe],
    templateUrl: './cart-item.html',
    styleUrl: './cart-item.scss'
})
export class CartItemComponent {
    @Input({ required: true }) item!: ProductSelection;
    @Output() remove = new EventEmitter<ProductSelection>();
    @Output() quantityChange = new EventEmitter<{ item: ProductSelection; quantity: number }>();

    onRemove() {
        this.remove.emit(this.item);
    }

    onQuantityChange(event: Event) {
        const target = event.target as HTMLInputElement;
        const quantity = parseInt(target.value, 10) || 1;
        this.quantityChange.emit({ item: this.item, quantity });
    }
}
