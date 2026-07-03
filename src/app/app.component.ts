import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit, effect, ViewEncapsulation } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { CartService } from './cart.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  encapsulation: ViewEncapsulation.None, // Indispensable pour maintenir l'accès aux règles d'impression globales
  template: `
    <div class="app-shell" [class.dark-theme]="isDarkMode()">
      <header class="topbar">
        <div class="topbar-left">
          <p class="eyebrow">Système POS Professionnel Cloud</p>
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
        <button type="button" [class.active]="activeTab() === 'admin'" (click)="activeTab.set('admin')">
          ⚙️ Admin / Stock
        </button>
      </nav>

      <div class="view-container">
        
        <section class="panel caisse-grid slide-view" [class.active]="activeTab() === 'caisse'">
          
          <div class="card hero-card">
            <h2>Saisie / Caméra Scan Ultra-Rapide</h2>
            <p class="card-desc">Centrez le code-barres sur la ligne rouge. Évitez les reflets directs.</p>

            <button type="button" class="scan-button" [class.cam-active]="isCameraActive() && scanMode() === 'caisse'" (click)="toggleCamera('caisse')">
              {{ isCameraActive() && scanMode() === 'caisse' ? '❌ DÉSACTIVER LA CAMÉRA' : '📸 ACTIVER LE SCANNER HAUTE PRÉCISION' }}
            </button>

            @if (isCameraActive() && scanMode() === 'caisse') {
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

        <section class="panel history-panel slide-view" [class.active]="activeTab() === 'admin'">
          <div class="card-header-full">
            <h2>⚙️ Gestion du Stock & Nouveaux Articles</h2>
            <span class="history-badge" style="background: #10b981;">{{ cartService.productsList().length }} en ligne</span>
          </div>

          <div class="caisse-grid" style="grid-template-columns: 1.2fr 1.8fr; gap: 20px;">
            <div class="card">
              <h3>Enregistrer un article</h3>
              <p class="card-desc">Activez le scanner ci-dessous, puis scannez le code-barres du produit physique pour remplir le champ automatiquement.</p>
              
              <button type="button" class="scan-button" [class.cam-active]="isCameraActive() && scanMode() === 'admin'" (click)="toggleCamera('admin')">
                {{ isCameraActive() && scanMode() === 'admin' ? '❌ DÉSACTIVER LA CAMÉRA ADMIN' : '📸 SCANNER LE NOUVEAU PRODUIT' }}
              </button>

              @if (isCameraActive() && scanMode() === 'admin') {
                <div class="camera-wrapper" style="margin-bottom: 15px;">
                  <video #previewVideo autoplay playsinline muted></video>
                  <div class="scanner-target-zone"></div>
                  <div class="scanner-laser"></div>
                </div>
              }

              <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 10px;">
                <div>
                  <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">Code-barres (Scanné ou écrit) :</label>
                  <input type="text" [(ngModel)]="adminBarcode" placeholder="En attente du scan ou saisie..." />
                </div>
                <div>
                  <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">Nom de l'article :</label>
                  <input type="text" [(ngModel)]="adminName" placeholder="Ex: Cahier 100 pages, Canette..." />
                </div>
                <div>
                  <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">Prix de vente (FCFA) :</label>
                  <input type="number" [(ngModel)]="adminPrice" placeholder="Ex: 500" />
                </div>
                
                <button type="button" class="checkout-btn" style="margin-top: 5px; width: 100%;" (click)="saveProduct()">
                  💾 Sauvegarder sur Supabase
                </button>
              </div>
            </div>

            <div class="card">
              <h3>Catalogue de la boutique (Synchronisé Cloud)</h3>
              <div class="cart-list" style="max-height: 420px; overflow-y: auto; margin-top: 10px; padding-right: 5px;">
                @for (prod of cartService.productsList(); track prod.id) {
                  <div class="cart-item" style="padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,0.08);">
                    <div class="item-info">
                      <strong style="font-size: 0.95rem;">{{ prod.name }}</strong>
                      <div class="small-price" style="font-size: 0.75rem; color: gray;">Code: {{ prod.id }}</div>
                    </div>
                    <div style="font-weight: 700; color: #2563eb; font-size: 0.95rem;">{{ prod.price }} FCFA</div>
                  </div>
                }
              </div>
            </div>
          </div>
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
  styles: []
})
export class AppComponent implements AfterViewInit {
  readonly cartService = inject(CartService);
  readonly activeTab = signal<'caisse' | 'historique' | 'admin'>('caisse');
  readonly isCameraActive = signal<boolean>(false);
  readonly scanMode = signal<'caisse' | 'admin'>('caisse'); // Cible le scanneur actif
  readonly isDarkMode = signal<boolean>(false);
  
  barcodeInputValue = '';

  // Modèles pour le formulaire d'administration
  adminBarcode = '';
  adminName = '';
  adminPrice: number | null = null;

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

  toggleCamera(mode: 'caisse' | 'admin'): void {
    if (this.isCameraActive() && this.scanMode() === mode) {
      this.isCameraActive.set(false);
    } else {
      this.scanMode.set(mode);
      this.isCameraActive.set(true);
    }
  }

  async startCameraScanner(): Promise<void> {
    if (!this.previewVideo?.nativeElement) return;

    try {
      // Configuration initiale ultra-nette conservée
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
        (result) => {
          if (result) {
            const decodedText = result.getText().trim();
            
            if (this.scanMode() === 'caisse') {
              // Comportement standard à la caisse
              const product = this.cartService.scanProduct(decodedText);
              if (!product) {
                alert(`Code scanné inconnu : ${decodedText}`);
              }
            } else {
              // Comportement sur la page Admin : on injecte le code dans le formulaire
              this.adminBarcode = decodedText;
              this.isCameraActive.set(false); // Désactive la caméra pour remplir tranquillement le nom et prix
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

  async saveProduct() {
    if (!this.adminBarcode || !this.adminName || !this.adminPrice) {
      alert("Veuillez remplir tous les champs ou scanner un article.");
      return;
    }

    const success = await this.cartService.saveProductToSupabase({
      id: this.adminBarcode.trim(),
      name: this.adminName.trim(),
      price: this.adminPrice
    });

    if (success) {
      // Nettoyage complet des champs après l'envoi cloud réussi
      this.adminBarcode = '';
      this.adminName = '';
      this.adminPrice = null;
      alert("Article enregistré avec succès sur ton cloud Supabase ! 🚀");
    } else {
      alert("Échec de la synchronisation cloud.");
    }
  }

  checkout(): void {
    const sale = this.cartService.checkout();
    if (sale) {
      setTimeout(() => {
        window.print();
        this.cartService.clearCart();
        this.activeTab.set('caisse');
      }, 250);
    }
  }
}