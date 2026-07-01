import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CartService } from './cart.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="app-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Système POS Professionnel</p>
          <h1>Smart POS ⚡</h1>
        </div>
        <div class="topbar-badge">{{ cartService.totalItems() }} article(s)</div>
      </header>

      <nav class="tabs">
        <button type="button" [class.active]="activeTab() === 'caisse'" (click)="activeTab.set('caisse')">
          🛒 Terminal de Caisse
        </button>
        <button type="button" [class.active]="activeTab() === 'historique'" (click)="activeTab.set('historique')">
          📋 Historique des Ventes
        </button>
      </nav>

      <div class="view-container">
        
        <section class="panel caisse-grid slide-view" [class.active]="activeTab() === 'caisse'">
          
          <div class="card hero-card">
            <h2>Saisie / Scan</h2>
            <p class="card-desc">Armez le focus automatique pour enregistrer les articles via lecteur de code-barres.</p>

            <button type="button" class="scan-button" (click)="focusInput()">
              📸 ACTIVER LE SCANNER
            </button>

            <div class="scan-row">
              <input
                #barcodeInput
                type="text"
                placeholder="Scanner ou saisir un code..."
                [(ngModel)]="barcodeInputValue"
                (keyup.enter)="handleScan()"
              />
              <button type="button" class="primary-btn" (click)="handleScan()">Ajouter</button>
            </div>
            <div class="hint">Simulation : 111111, 222222, 333333, 444444</div>
          </div>

          <div class="card cart-panel">
            <div class="card-header">
              <h3>Panier actuel</h3>
              <span class="items-count">{{ cartService.totalItems() }} u</span>
            </div>

            @if (cartService.cartItems().length === 0) {
              <div class="empty-state">
                <span class="empty-icon">🛒</span>
                <p>Panier vide.</p>
              </div>
            } @else {
              <div class="cart-list">
                @for (item of cartService.cartItems(); track item.id) {
                  <div class="cart-item">
                    <div class="item-info">
                      <strong class="item-name">{{ item.name }}</strong>
                      <div class="small">{{ item.price }} FCFA / u</div>
                    </div>
                    
                    <div class="item-controls">
                      <div class="quantity-counter">
                        <button type="button" class="qty-btn" (click)="decrementQuantity(item)">-</button>
                        <span class="qty-val">{{ item.quantity }}</span>
                        <button type="button" class="qty-btn" (click)="incrementQuantity(item)">+</button>
                      </div>
                      
                      <button type="button" class="delete-btn" (click)="cartService.removeItem(item.id)" title="Supprimer l'article">
                        🗑️
                      </button>
                    </div>
                  </div>
                }
              </div>
            }

            <div class="summary">
              <div class="summary-row">
                <span>Sous-total :</span>
                <strong class="total-price">{{ cartService.subtotal() }} FCFA</strong>
              </div>
            </div>
          </div>

          <div class="card qr-payment-card" [class.disabled]="cartService.cartItems().length === 0">
            <div class="card-header">
              <h3>Paiement & Facturation</h3>
            </div>
            
            <p class="qr-desc">Scannez le QR Code ci-dessous pour encaisser instantanément le montant.</p>

            <div class="qr-wrapper">
              <div class="qr-placeholder">
                <div class="qr-square corner-tl"></div>
                <div class="qr-square corner-tr"></div>
                <div class="qr-square corner-bl"></div>
                <div class="qr-center-pattern"></div>
              </div>
              <div class="qr-amount-overlay">{{ cartService.subtotal() }} FCFA</div>
            </div>

            <button type="button" class="checkout-btn" [disabled]="cartService.cartItems().length === 0" (click)="checkout()">
              ✅ Encaisser et Imprimer le reçu
            </button>
          </div>

        </section>

        <section class="panel history-panel slide-view" [class.active]="activeTab() === 'historique'">
          <div class="card-header-full">
            <h2>Journal des transactions terminées</h2>
            <span class="history-badge">{{ cartService.salesHistory().length }} vente(s) enregistrée(s)</span>
          </div>

          @if (cartService.salesHistory().length === 0) {
            <div class="empty-state">
              <span class="empty-icon">📂</span>
              <p>Aucune transaction dans l'historique.</p>
            </div>
          } @else {
            <div class="history-list">
              @for (sale of cartService.salesHistory(); track sale.id) {
                <article class="history-card">
                  <div class="history-top">
                    <div>
                      <span class="invoice-tag">{{ sale.id }}</span>
                      <strong class="history-date">{{ sale.createdAt | date:'dd/MM/yyyy à HH:mm' }}</strong>
                    </div>
                    <span class="history-total">+ {{ sale.total }} FCFA</span>
                  </div>
                  <ul class="history-items-details">
                    @for (item of sale.items; track item.id) {
                      <li>{{ item.name }} <span class="text-muted">(x{{ item.quantity }})</span></li>
                    }
                  </ul>
                </article>
              }
            </div>
          }
        </section>
        
      </div>

      <footer class="footer">
        <div class="footer-profile">
          <strong>Ingénieur DevOps / Administration Réseaux</strong>
          <p>Infrastructures Critiques • Linux/Ubuntu • Automatisation de points de vente sécurisés</p>
        </div>
        <span class="version-pill">v1.6 Multi-colonne + Édition</span>
      </footer>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: #f1f5f9;
        color: #334155;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
      }

      .app-shell {
        max-width: 1240px;
        margin: 0 auto;
        padding: 24px;
      }

      .topbar {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 20px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      }

      .topbar h1 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 800;
        color: #0f172a;
      }

      .eyebrow {
        margin: 0 0 2px;
        color: #2563eb;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-size: 0.72rem;
        font-weight: 700;
      }

      .topbar-badge {
        padding: 8px 16px;
        background: #eff6ff;
        color: #1e40af;
        border: 1px solid #bfdbfe;
        border-radius: 999px;
        font-weight: 700;
        font-size: 0.85rem;
      }

      .tabs {
        display: inline-flex;
        background: #e2e8f0;
        padding: 4px;
        border-radius: 12px;
        margin-bottom: 20px;
        gap: 4px;
      }

      .tabs button {
        border: 0;
        background: transparent;
        padding: 8px 18px;
        font-weight: 600;
        color: #64748b;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.9rem;
      }

      .tabs button.active {
        background: #ffffff;
        color: #2563eb;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }

      .view-container {
        position: relative;
        overflow: hidden;
        min-height: 520px;
      }

      .slide-view {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        box-sizing: border-box;
        opacity: 0;
        visibility: hidden;
        transform: translateX(30px);
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease, visibility 0.35s;
      }

      .slide-view.active {
        position: relative;
        opacity: 1;
        visibility: visible;
        transform: translateX(0);
      }

      .caisse-grid {
        display: grid;
        grid-template-columns: 1fr 1.1fr 1.1fr;
        gap: 20px;
      }

      .card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        display: flex;
        flex-direction: column;
      }

      .card h2, .card h3 {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 700;
        color: #0f172a;
      }

      .card-desc {
        font-size: 0.82rem;
        color: #64748b;
        margin: 6px 0 0 0;
        line-height: 1.4;
      }

      .scan-button {
        width: 100%;
        border: 0;
        padding: 16px;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: white;
        border-radius: 12px;
        font-weight: 700;
        font-size: 0.95rem;
        margin: 16px 0;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .scan-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
      }

      .scan-row {
        display: flex;
        gap: 8px;
      }

      input {
        flex: 1;
        border: 2px solid #e2e8f0;
        background: #f8fafc;
        padding: 10px 14px;
        border-radius: 10px;
        color: #0f172a;
        font-weight: 500;
      }

      input:focus {
        outline: none;
        border-color: #2563eb;
        background: #ffffff;
      }

      .primary-btn {
        background: #0f172a;
        color: white;
        border: 0;
        padding: 0 16px;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
      }

      .hint {
        font-size: 0.78rem;
        color: #94a3b8;
        margin-top: 10px;
        font-style: italic;
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
      }

      .items-count {
        background: #f1f5f9;
        padding: 2px 8px;
        font-size: 0.8rem;
        border-radius: 6px;
        font-weight: 600;
      }

      .cart-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 260px;
        overflow-y: auto;
        margin-bottom: 12px;
        padding-right: 4px;
      }

      .cart-item {
        background: #f8fafc;
        border: 1px solid #edf2f7;
        padding: 10px 12px;
        border-radius: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }

      .item-info {
        flex: 1;
        min-width: 0;
      }

      .item-name {
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .small {
        font-size: 0.8rem;
        color: #64748b;
        margin-top: 2px;
      }

      /* STYLE ALIGNÉ DES BOUTONS DE MODIFICATION DE QUANTITÉ */
      .item-controls {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .quantity-counter {
        display: inline-flex;
        align-items: center;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 2px;
      }

      .qty-btn {
        background: transparent;
        border: 0;
        width: 24px;
        height: 24px;
        font-weight: 700;
        color: #0f172a;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .qty-btn:hover {
        background: #f1f5f9;
      }

      .qty-val {
        font-size: 0.85rem;
        font-weight: 700;
        min-width: 20px;
        text-align: center;
      }

      .delete-btn {
        background: transparent;
        border: 0;
        cursor: pointer;
        font-size: 1rem;
        padding: 4px;
        border-radius: 6px;
        transition: background 0.2s;
      }

      .delete-btn:hover {
        background: #fee2e2;
      }

      .summary {
        margin-top: auto;
        border-top: 2px dashed #e2e8f0;
        padding-top: 12px;
      }

      .summary-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .total-price {
        font-size: 1.25rem;
        color: #10b981;
        font-weight: 800;
      }

      .qr-payment-card {
        background: #fafafa;
        border: 2px dashed #cbd5e1;
        align-items: center;
        justify-content: center;
        text-align: center;
      }

      .qr-payment-card.disabled {
        opacity: 0.6;
        pointer-events: none;
      }

      .qr-desc {
        font-size: 0.8rem;
        color: #64748b;
        margin: 4px 0 16px;
      }

      .qr-wrapper {
        position: relative;
        background: #ffffff;
        padding: 16px;
        border-radius: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.04);
        margin-bottom: 16px;
      }

      .qr-placeholder {
        width: 140px;
        height: 140px;
        position: relative;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }

      .qr-square {
        position: absolute;
        width: 32px;
        height: 32px;
        border: 6px solid #0f172a;
      }
      .corner-tl { top: 6px; left: 6px; }
      .corner-tr { top: 6px; right: 6px; }
      .corner-bl { bottom: 6px; left: 6px; }

      .qr-center-pattern {
        position: absolute;
        top: 48px;
        left: 48px;
        width: 44px;
        height: 44px;
        background: repeating-linear-gradient(45deg, #0f172a, #0f172a 4px, transparent 4px, transparent 8px);
      }

      .qr-amount-overlay {
        margin-top: 8px;
        font-size: 0.85rem;
        font-weight: 700;
        color: #0f172a;
        background: #f1f5f9;
        padding: 2px 8px;
        border-radius: 4px;
      }

      .checkout-btn {
        width: 100%;
        background: #10b981;
        color: white;
        border: 0;
        padding: 14px;
        font-weight: 700;
        font-size: 0.95rem;
        border-radius: 12px;
        cursor: pointer;
        box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);
        transition: background 0.2s;
      }

      .checkout-btn:hover:not(:disabled) {
        background: #059669;
      }

      .card-header-full {
        margin-bottom: 16px;
      }
      
      .history-panel {
        background: #ffffff;
        padding: 24px;
        border-radius: 16px;
      }

      .history-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .history-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 14px;
      }

      .history-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .invoice-tag {
        background: #2563eb;
        color: white;
        padding: 2px 6px;
        font-size: 0.75rem;
        font-weight: 700;
        border-radius: 4px;
        margin-right: 8px;
      }

      .history-total {
        color: #10b981;
        font-weight: 700;
      }

      .history-items-details {
        margin: 8px 0 0 0;
        padding-left: 16px;
        font-size: 0.85rem;
        color: #475569;
      }

      .text-muted { color: #94a3b8; }

      .empty-state {
        text-align: center;
        padding: 30px 0;
        color: #94a3b8;
      }

      .empty-icon { font-size: 2rem; display: block; margin-bottom: 6px; }

      .footer {
        margin-top: 24px;
        background: #0f172a;
        color: white;
        padding: 16px 24px;
        border-radius: 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .footer-profile strong { display: block; font-size: 0.9rem; }
      .footer-profile p { margin: 2px 0 0 0; font-size: 0.78rem; color: #94a3b8; }
      
      .version-pill {
        background: rgba(255,255,255,0.1);
        color: #38bdf8;
        font-size: 0.75rem;
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 600;
      }

      @media (max-width: 1024px) {
        .caisse-grid {
          grid-template-columns: 1fr 1fr;
        }
        .qr-payment-card {
          grid-column: span 2;
        }
      }

      @media (max-width: 700px) {
        .caisse-grid {
          grid-template-columns: 1fr;
        }
        .qr-payment-card {
          grid-column: span 1;
        }
        .footer {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }
      }
    `
  ]
})
export class AppComponent {
  readonly cartService = inject(CartService);
  readonly activeTab = signal<'caisse' | 'historique'>('caisse');
  barcodeInputValue = '';

  @ViewChild('barcodeInput') barcodeInput!: ElementRef<HTMLInputElement>;

  focusInput(): void {
    this.activeTab.set('caisse');
    setTimeout(() => {
      if (this.barcodeInput) {
        this.barcodeInput.nativeElement.focus();
        this.barcodeInput.nativeElement.select();
      }
    }, 50);
  }

  handleScan(): void {
    const code = this.barcodeInputValue.trim();
    if (!code) return;

    const product = this.cartService.scanProduct(code);
    if (product) {
      this.barcodeInputValue = '';
      this.barcodeInput.nativeElement.focus();
    } else {
      alert(`Code inconnu : ${code}`);
    }
  }

  // MÉTHODE POUR AUGMENTER LA QUANTITÉ VIA LE BOUTON PLUS
  incrementQuantity(item: any): void {
    // On réutilise la méthode scanProduct du CartService en passant l'ID/code-barres du produit déjà présent
    this.cartService.scanProduct(item.id.toString());
  }

  // MÉTHODE POUR DIMINUER OU ENLEVER VIA LE BOUTON MOINS
  decrementQuantity(item: any): void {
    if (item.quantity > 1) {
      // Si la quantité est supérieure à 1, on décrémente directement dans l'état réactif
      item.quantity--;
      // On force la notification de mise à jour des signaux du panier (déclenche le recalcul des totaux)
      this.cartService.cartItems.set([...this.cartService.cartItems()]);
    } else {
      // Si la quantité tombe à 0, on supprime carrément l'élément du panier
      this.cartService.removeItem(item.id);
    }
  }

  checkout(): void {
    const sale = this.cartService.checkout();
    if (sale) {
      this.activeTab.set('historique');
    }
  }
}