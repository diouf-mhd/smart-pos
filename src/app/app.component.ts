import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit, effect, ViewEncapsulation } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { CartService } from './cart.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  encapsulation: ViewEncapsulation.None, // Maintient l'accès global au fichier styles.css
  template: `
    <div class="app-shell" [class.dark-theme]="isDarkMode()">
      <header class="topbar">
        <div class="topbar-left">
          <p class="eyebrow">Système POS Professionnel</p>
          <h1>Smart POS ⚡</h1>
        </div>
        <div class="topbar-actions">
          <button type="button" class="theme-toggle-btn" (click)="toggleTheme()">
            {{ isDarkMode() ? '☀️ Mode Clair' : '🌙 Mode Sombre' }}
          </button>
          <div class="topbar-badge">{{ cartService.totalItems() }} art.</div>
        </div>
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
          <p>visiter mon profile : <a href="https://moussadioufportfolio.kesug.com" target="_blank" rel="noopener noreferrer">https://moussadioufportfolio.kesug.com</a></p>
        </div>
      </footer>
    </div>
  `,
  styles: [] // Laissé vide volontairement car tout est géré par src/styles.css maintenant
})
export class AppComponent implements AfterViewInit {
  readonly cartService = inject(CartService);
  readonly activeTab = signal<'caisse' | 'historique'>('caisse');
  readonly isCameraActive = signal<boolean>(false);
  readonly isDarkMode = signal<boolean>(false); // Signal pour gérer l'état du mode sombre
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

  toggleTheme(): void {
    this.isDarkMode.set(!this.isDarkMode());
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