import { Injectable, signal } from '@angular/core';
import { CartItem, Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly cartItems = signal<CartItem[]>([]);
  readonly items = this.cartItems.asReadonly();

  addProduct(product: Product): void {
    const existingItem = this.cartItems().find((item) => item.id === product.id);

    if (existingItem) {
      this.cartItems.update((items) =>
        items.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
      return;
    }

    this.cartItems.update((items) => [...items, { ...product, quantity: 1 }]);
  }

  addScannedProduct(barcode: string): void {
    const product = this.getDemoProduct(barcode);
    if (product) {
      this.addProduct(product);
    }
  }

  removeItem(id: string): void {
    this.cartItems.update((items) => items.filter((item) => item.id !== id));
  }

  clearCart(): void {
    this.cartItems.set([]);
  }

  get subtotal(): number {
    return this.cartItems().reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  get totalItems(): number {
    return this.cartItems().reduce((sum, item) => sum + item.quantity, 0);
  }

  private getDemoProduct(barcode: string): Product | null {
    const products: Product[] = [
      { id: 'p1', name: 'Café', price: 250, barcode: '111111' },
      { id: 'p2', name: 'Sandwich', price: 1200, barcode: '222222' },
      { id: 'p3', name: 'Eau', price: 300, barcode: '333333' }
    ];

    return products.find((product) => product.barcode === barcode) ?? null;
  }
}
