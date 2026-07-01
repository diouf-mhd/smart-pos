import { Component, Input } from '@angular/core';
import { CartItem } from '../../../../core/models/product.model';

@Component({
  selector: 'app-cart-list',
  standalone: true,
  template: `
    <section class="cart-list">
      <h2>Panier</h2>
      @if (!items.length) {
        <p class="empty">Aucun produit ajouté pour l’instant.</p>
      } @else {
        <ul>
          @for (item of items; track item.id) {
            <li>
              <div>
                <strong>{{ item.name }}</strong>
                <span>{{ item.quantity }} × {{ item.price }} FCFA</span>
              </div>
              <span class="amount">{{ item.price * item.quantity }} FCFA</span>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [
    `
      .cart-list {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 1rem;
      }

      h2 {
        margin: 0 0 0.75rem;
        font-size: 1.1rem;
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid #f1f5f9;
      }

      li:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }

      div {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .empty {
        color: #64748b;
        margin: 0;
      }

      .amount {
        font-weight: 700;
        white-space: nowrap;
      }
    `
  ]
})
export class CartListComponent {
  @Input() items: CartItem[] = [];
}
