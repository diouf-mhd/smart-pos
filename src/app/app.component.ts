import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit, effect, ViewEncapsulation } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { CartService } from './cart.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  encapsulation: ViewEncapsulation.None, // Force les styles à s'appliquer globalement (Règle le bug Vercel)
  template: `
    <div class="app-shell">
      <header class="topbar">
        <div class="topbar-left">
          <p class="eyebrow">Système POS Professionnel</p>
          <h1>Smart POS ⚡</h1>
        </div>
        <div class="topbar-badge">{{ cartService.totalItems() }} art.</div>
      </header>

      <nav class="tabs">
        <button type="button" [class.active]="activeTab() === 'caisse'" (click)="activeTab.set('caisse')">
          🛒 Caisse
        </button>
        <button type="button" [class.active]="activeTab() === 'historique'" (click)="activeTab.set('historique')">
          📋 Historique
        </button>
      </nav>

      <div class="view-container">
        
        <section class="panel caisse-grid slide-view" [class.active]="activeTab() === 'caisse'">
          
          <div class="card hero-card">
            <h2>Saisie / Caméra Scan Ultra-Rapide</h2>
            <p class="card-desc">Centrez le code-barres sur la ligne rouge. Évitez les reflets directs.</p>

            <button type="button" class="scan-button" [class.cam-active]="isCameraActive()" (click)="toggleCamera()">
              {{ isCameraActive() ? '❌ DÉSACTIVER LA CAMÉRA' : '📸 ACTIVER LE SCANNER HAUTE PRÉCISION' }}
            </button>

            @if (isCameraActive()) {
              <div class="camera-wrapper">
                <video #previewVideo autoplay playsinline muted></video>
                <div class="scanner-target-zone"></div>
                <div class="scanner-laser"></div>
              </div>
            }

            <div class="scan-row">
              <input
                #barcodeInput
                type="text"
                placeholder="Scanner ou saisir..."
                [(ngModel)]="barcodeInputValue"
                (keyup.enter)="handleScan()"
              />
              <button type="button" class="primary-btn" (click)="handleScan()">Ajouter</button>
            </div>
          </div>

          <div class="card cart-panel" id="receipt-zone">
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
                      <div class="small-price">{{ item.price }} FCFA</div>
                    </div>
                    
                    <div class="item-controls">
                      <div class="quantity-counter">
                        <button type="button" class="qty-btn" (click)="decrementQuantity(item)">-</button>
                        <span class="qty-val">{{ item.quantity }}</span>
                        <button type="button" class="qty-btn" (click)="incrementQuantity(item)">+</button>
                      </div>
                      
                      <button type="button" class="delete-btn" (click)="cartService.removeItem(item.id)">
                        🗑️
                      </button>
                    </div>
                  </div>
                }
              </div>
            }

            <div class="summary">
              <div class="summary-row">
                <span>Total :</span>
                <strong class="total-price">{{ cartService.subtotal() }} FCFA</strong>
              </div>
            </div>
          </div>

          <div class="card qr-payment-card" [class.disabled]="cartService.cartItems().length === 0">
            <div class="card-header">
              <h3>Paiement</h3>
            </div>
            
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
              ✅ Encaisser & Imprimer
            </button>
          </div>

        </section>

        <section class="panel history-panel slide-view" [class.active]="activeTab() === 'historique'">
          <div class="card-header-full">
            <h2>Transactions terminées</h2>
            <span class="history-badge">{{ cartService.salesHistory().length }} vente(s)</span>
          </div>

          @if (cartService.salesHistory().length === 0) {
            <div class="empty-state">
              <span class="empty-icon">📂</span>
              <p>Aucune transaction.</p>
            </div>
          } @else {
            <div class="history-list">
              @for (sale of cartService.salesHistory(); track sale.id) {
                <article class="history-card">
                  <div class="history-top">
                    <div>
                      <span class="invoice-tag">{{ sale.id }}</span>
                      <strong class="history-date">{{ sale.createdAt | date:'dd/MM à HH:mm' }}</strong>
                    </div>
                    <span class="history-total">{{ sale.total }} F</span>
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
          <strong>Smart POS Mobile & Desktop</strong>
          <p>Moteur d'analyse optique optimisé</p>
        </div>
        <span class="version-pill">v2.0 Engine Pro</span>
      </footer>
    </div>
  `,
  styles: [
    `
      :host { display: block; min-height: 100vh; background: #f1f5f9; color: #334155; font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
      .app-shell { max-width: 1240px; margin: 0 auto; padding: 12px; box-sizing: border-box; width: 100%; overflow-x: hidden; }
      .topbar { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
      .topbar h1 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #0f172a; }
      .eyebrow { margin: 0 0 2px; color: #2563eb; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.68rem; font-weight: 700; }
      .topbar-badge { padding: 6px 12px; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; border-radius: 999px; font-weight: 700; font-size: 0.8rem; white-space: nowrap; }
      .tabs { display: inline-flex; background: #e2e8f0; padding: 4px; border-radius: 10px; margin-bottom: 16px; gap: 4px; width: 100%; box-sizing: border-box; }
      .tabs button { flex: 1; border: 0; background: transparent; padding: 10px; font-weight: 600; color: #64748b; border-radius: 6px; cursor: pointer; text-align: center; font-size: 0.85rem; }
      .tabs button.active { background: #ffffff; color: #2563eb; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
      .view-container { position: relative; min-height: 450px; width: 100%; }
      .slide-view { position: absolute; top: 0; left: 0; width: 100%; box-sizing: border-box; opacity: 0; visibility: hidden; transform: translateX(15px); transition: transform 0.25s ease, opacity 0.25s ease; }
      .slide-view.active { position: relative; opacity: 1; visibility: visible; transform: translateX(0); }
      .caisse-grid { display: grid; grid-template-columns: 1fr 1.1fr 1.1fr; gap: 16px; width: 100%; }
      .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; min-width: 0; box-sizing: border-box; }
      .card h2, .card h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #0f172a; }
      .card-desc { font-size: 0.8rem; color: #64748b; margin: 4px 0 0 0; line-height: 1.3; }
      
      .scan-button { width: 100%; border: 0; padding: 14px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; border-radius: 10px; font-weight: 700; font-size: 0.9rem; margin: 12px 0; cursor: pointer; }
      .scan-button.cam-active { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
      
      .camera-wrapper { position: relative; width: 100%; border-radius: 10px; overflow: hidden; background: #000000; margin-bottom: 12px; aspect-ratio: 4/3; border: 2px solid #2563eb; }
      .camera-wrapper video { width: 100%; height: 100%; object-fit: cover; filter: contrast(1.5) brightness(0.85) saturate(0); }
      
      .scanner-target-zone { position: absolute; top: 30%; left: 10%; width: 80%; height: 40%; border: 2px dashed rgba(255, 255, 255, 0.6); border-radius: 6px; pointer-events: none; box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.4); }
      .scanner-laser { position: absolute; top: 50%; left: 12%; width: 76%; height: 2px; background-color: #ef4444; box-shadow: 0 0 8px #ef4444; animation: laserMove 1.5s infinite alternate ease-in-out; }
      @keyframes laserMove { from { top: 32%; } to { top: 68%; } }
      
      .scan-row { display: flex; gap: 8px; width: 100%; }
      input { flex: 1; border: 2px solid #e2e8f0; background: #f8fafc; padding: 10px 12px; border-radius: 8px; color: #0f172a; font-weight: 500; min-width: 0; font-size: 0.9rem; }
      input:focus { outline: none; border-color: #2563eb; background: #ffffff; }
      .primary-btn { background: #0f172a; color: white; border: 0; padding: 0 14px; border-radius: 8px; font-weight: 600; cursor: pointer; }
      
      .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .items-count { background: #f1f5f9; padding: 2px 6px; font-size: 0.75rem; border-radius: 4px; font-weight: 600; }
      .cart-list { display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow-y: auto; margin-bottom: 12px; }
      .cart-item { background: #f8fafc; border: 1px solid #edf2f7; padding: 8px 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 6px; min-width: 0; }
      .item-info { flex: 1; min-width: 0; }
      .item-name { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.85rem; color: #0f172a; }
      .small-price { font-size: 0.75rem; color: #64748b; margin-top: 1px; }
      .item-controls { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
      .quantity-counter { display: inline-flex; align-items: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 1px; }
      .qty-btn { background: transparent; border: 0; width: 22px; height: 22px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; }
      .qty-val { font-size: 0.8rem; font-weight: 700; min-width: 18px; text-align: center; }
      .delete-btn { background: transparent; border: 0; cursor: pointer; font-size: 0.9rem; }
      
      .summary { margin-top: auto; border-top: 2px dashed #e2e8f0; padding-top: 10px; }
      .summary-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; }
      .total-price { font-size: 1.15rem; color: #10b981; font-weight: 800; }
      
      .qr-payment-card { background: #fafafa; border: 2px dashed #cbd5e1; align-items: center; justify-content: center; text-align: center; }
      .qr-payment-card.disabled { opacity: 0.5; pointer-events: none; }
      .qr-wrapper { position: relative; background: #ffffff; padding: 12px; border-radius: 10px; margin-bottom: 12px; }
      .qr-placeholder { width: 110px; height: 110px; position: relative; background: #f8fafc; }
      .qr-square { position: absolute; width: 24px; height: 24px; border: 4px solid #0f172a; }
      .corner-tl { top: 4px; left: 4px; }
      .corner-tr { top: 4px; right: 4px; }
      .corner-bl { bottom: 4px; left: 4px; }
      .qr-center-pattern { position: absolute; top: 38px; left: 38px; width: 34px; height: 34px; background: repeating-linear-gradient(45deg, #0f172a, #0f172a 3px, transparent 3px, transparent 6px); }
      .qr-amount-overlay { margin-top: 6px; font-size: 0.8rem; font-weight: 700; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
      .checkout-btn { width: 100%; background: #10b981; color: white; border: 0; padding: 12px; font-weight: 700; font-size: 0.9rem; border-radius: 10px; cursor: pointer; }
      
      .history-panel { background: #ffffff; padding: 16px; border-radius: 12px; box-sizing: border-box; }
      .history-list { display: flex; flex-direction: column; gap: 8px; }
      .history-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
      .history-top { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; }
      .invoice-tag { background: #2563eb; color: white; padding: 1px 4px; font-size: 0.7 her; font-weight: 700; border-radius: 3px; margin-right: 4px; }
      .history-total { color: #10b981; font-weight: 700; }
      .history-items-details { margin: 6px 0 0 0; padding-left: 12px; font-size: 0.8rem; color: #475569; }
      .text-muted { color: #94a3b8; }
      .empty-state { text-align: center; padding: 20px 0; color: #94a3b8; }
      .empty-icon { font-size: 1.5rem; display: block; margin-bottom: 4px; }
      
      .footer { margin-top: 20px; background: #0f172a; color: white; padding: 12px 16px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; }
      .footer-profile strong { display: block; font-size: 0.85rem; }
      .footer-profile p { margin: 2px 0 0 0; font-size: 0.75rem; color: #94a3b8; }
      .version-pill { background: rgba(255,255,255,0.1); color: #38bdf8; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; }

      @media (max-width: 1024px) {
        .caisse-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
        .qr-payment-card { grid-column: span 2; }
      }
      @media (max-width: 680px) {
        .caisse-grid { grid-template-columns: 1fr; gap: 12px; width: 100%; }
        .qr-payment-card { grid-column: span 1; }
        .footer { flex-direction: column; align-items: flex-start; gap: 10px; }
      }

      /* --- BALISE D'IMPRESSION COMPATIBLE VERCEL & WEBKIT (Double anti-slash \\A) --- */
      @media print {
        body *, .app-shell, .topbar, .tabs, .view-container, .footer { display: none !important; }
        body { background: #ffffff; color: #000000; font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 0; }
        #receipt-zone { display: block !important; width: 54mm; margin: 0; padding: 4mm; border: none !important; box-shadow: none !important; }
        #receipt-zone .card-header h3 { font-size: 13px; text-align: center; margin-bottom: 8px; }
        #receipt-zone .card-header h3::before { content: "✨ TOUBA SMART SHOP ✨\\A Dakar, Sénégal\\A --------------------------\\A"; white-space: pre-wrap; display: block; }
        #receipt-zone .items-count { display: none !important; }
        .cart-list { max-height: none !important; overflow: visible !important; display: flex !important; flex-direction: column !important; }
        .cart-item { background: transparent !important; border: none !important; border-bottom: 1px dashed #000000 !important; padding: 4px 0 !important; display: flex !important; justify-content: space-between !important; }
        .item-controls .quantity-counter button, .delete-btn { display: none !important; }
        .qty-val::before { content: "x"; }
        .summary { border-top: 1px solid #000000 !important; margin-top: 8px; padding-top: 4px; }
        .total-price { font-size: 13px; color: #000000 !important; font-weight: bold; }
        .summary-row::after { content: "\\A --------------------------\\A Merci pour votre visite !"; white-space: pre-wrap; display: block; text-align: center; font-size: 10px; margin-top: 10px; }
      }
    `
  ]
})
export class AppComponent implements AfterViewInit {
  readonly cartService = inject(CartService);
  readonly activeTab = signal<'caisse' | 'historique'>('caisse');
  readonly isCameraActive = signal<boolean>(false);
  barcodeInputValue = '';

  @ViewChild('barcodeInput') barcodeInput!: ElementRef<HTMLInputElement>;
  @ViewChild('previewVideo') previewVideo!: ElementRef<HTMLVideoElement>;

  private codeReader = new BrowserMultiFormatReader();

  constructor() {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    this.codeReader.hints = hints;

    effect(() => {
      if (this.isCameraActive()) {
        setTimeout(() => this.startCameraScanner(), 150);
      } else {
        this.stopCameraScanner();
      }
    });
  }

  ngAfterViewInit(): void {
    this.focusInput();
  }

  toggleCamera(): void {
    this.isCameraActive.set(!this.isCameraActive());
  }

  async startCameraScanner(): Promise<void> {
    if (!this.previewVideo?.nativeElement) return;

    try {
      const customConstraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          ...({ focusMode: 'continuous' } as any)
        }
      };

      await this.codeReader.decodeFromConstraints(
        customConstraints,
        this.previewVideo.nativeElement,
        (result, error) => {
          if (result) {
            const decodedText = result.getText().trim();
            const product = this.cartService.scanProduct(decodedText);
            if (!product) {
              alert(`Code scanné inconnu : ${decodedText}`);
            }
          }
        }
      );
    } catch (err) {
      console.error("Erreur d'accès matériel au capteur :", err);
    }
  }

  stopCameraScanner(): void {
    this.codeReader.reset();
  }

  focusInput(): void {
    this.activeTab.set('caisse');
    setTimeout(() => {
      if (this.barcodeInput?.nativeElement) {
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
      this.barcodeInput?.nativeElement?.focus();
    } else {
      alert(`Code inconnu : ${code}`);
    }
  }

  incrementQuantity(item: any): void {
    this.cartService.scanProduct(item.id.toString());
  }

  decrementQuantity(item: any): void {
    if (item.quantity > 1) {
      this.cartService.cartItems.update(items => 
        items.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i)
      );
    } else {
      this.cartService.removeItem(item.id);
    }
  }

  checkout(): void {
    const sale = this.cartService.checkout();
    if (sale) {
      setTimeout(() => {
        window.print();
        this.cartService.clearCart();
        this.activeTab.set('historique');
      }, 250);
    }
  }
}