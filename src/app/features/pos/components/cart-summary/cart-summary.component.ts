import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-cart-summary',
  standalone: true,
  template: `
    <section class="summary-card">
      <div class="row">
        <span>Articles</span>
        <strong>{{ totalItems }}</strong>
      </div>
      <div class="row">
        <span>Total</span>
        <strong>{{ subtotal }} FCFA</strong>
      </div>
      <button type="button" (click)="validate.emit()">Valider</button>
    </section>
  `,
  styles: [
    `
      .summary-card {
        background: #111827;
        color: #fff;
        border-radius: 12px;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      button {
        border: 0;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        background: #22c55e;
        color: #fff;
        cursor: pointer;
        font-weight: 700;
      }
    `
  ]
})
export class CartSummaryComponent {
  @Input() subtotal = 0;
  @Input() totalItems = 0;
  @Output() validate = new EventEmitter<void>();
}
