import { Component, inject } from '@angular/core';
import { CartService } from '../../core/services/cart.service';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { BarcodeScannerComponent } from './components/barcode-scanner/barcode-scanner.component';
import { CartListComponent } from './components/cart-list/cart-list.component';
import { CartSummaryComponent } from './components/cart-summary/cart-summary.component';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    HeaderComponent,
    BarcodeScannerComponent,
    CartListComponent,
    CartSummaryComponent
  ],
  template: `
    <app-header></app-header>

    <div class="pos-grid">
      <div class="left-column">
        <app-barcode-scanner (scanned)="handleScan($event)"></app-barcode-scanner>
        <app-cart-list [items]="cartService.items()"></app-cart-list>
      </div>

      <app-cart-summary
        [subtotal]="cartService.subtotal"
        [totalItems]="cartService.totalItems"
        (validate)="handleValidate()"
      ></app-cart-summary>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .pos-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 1rem;
        align-items: start;
      }

      .left-column {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      @media (max-width: 800px) {
        .pos-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class PosComponent {
  readonly cartService = inject(CartService);

  handleScan(barcode: string): void {
    this.cartService.addScannedProduct(barcode);
  }

  handleValidate(): void {
    if (!this.cartService.totalItems) {
      return;
    }

    alert(`Commande validée pour ${this.cartService.totalItems} article(s) — total ${this.cartService.subtotal} FCFA`);
    this.cartService.clearCart();
  }
}
