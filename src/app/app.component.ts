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
          <p class="eyebrow">Système caisse Professionnel Cloud</p>
          <h1>La caisse ⚡</h1>
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
          
          @if (!isAdminAuthenticated()) {
            <div style="display: flex; justify-content: center; align-items: center; min-height: 400px; padding: 20px;">
              <div class="card" style="width: 100%; max-width: 400px; text-align: center; padding: 30px; border-top: 4px solid #2563eb;">
                <div style="font-size: 3rem; margin-bottom: 10px;">🔐</div>
                <h2 style="margin-bottom: 8px;">Espace Administrateur</h2>
                <p class="card-desc" style="margin-bottom: 20px;">Veuillez saisir le code d'accès secret pour gérer le stock et le catalogue cloud.</p>
                
                <div style="display: flex; flex-direction: column; gap: 15px;">
                  <input 
                    type="password" 
                    [(ngModel)]="passwordInput" 
                    placeholder="Entrez le code secret..." 
                    style="text-align: center; font-size: 1.2rem; letter-spacing: 6px; padding: 12px;"
                    (keyup.enter)="verifyPassword()"
                  />
                  @if (passwordError()) {
                    <p style="color: #ef4444; font-size: 0.85rem; font-weight: 600; margin: 0;">❌ Code secret incorrect.</p>
                  }
                  <button type="button" class="checkout-btn" style="width: 100%;" (click)="verifyPassword()">
                    Déverrouiller l'accès
                  </button>
                </div>
              </div>
            </div>
          }

          @else {
            <div class="card-header-full" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <div>
                <h2 style="margin: 0;">⚙️ Panneau d'Administration Général</h2>
                <p class="card-desc" style="margin: 4px 0 0 0;">Ajout de produits et suivi de la synchronisation cloud</p>
              </div>
              <div style="display: flex; gap: 10px; align-items: center;">
                <span class="history-badge" style="background: #10b981; padding: 6px 12px; font-weight: 600;">
                  🟢 {{ cartService.productsList().length }} articles synchronisés
                </span>
                <button type="button" class="delete-btn" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 6px 12px; font-size: 0.85rem; display: flex; align-items: center; gap: 5px;" (click)="logoutAdmin()">
                  🔒 Déconnexion
                </button>
              </div>
            </div>

            <div class="caisse-grid" style="grid-template-columns: 1.1fr 1.9fr; gap: 24px; align-items: start;">
              
              <div class="card" style="border-top: 4px solid #2563eb; position: sticky; top: 10px;">
                <h3 style="margin-top: 0; display: flex; align-items: center; gap: 8px;">📦 Nouveau Produit</h3>
                <p class="card-desc" style="margin-bottom: 15px;">Utilisez le bouton ci-dessous pour capturer directement un code-barres depuis le capteur photo.</p>
                
                <button type="button" class="scan-button" [class.cam-active]="isCameraActive() && scanMode() === 'admin'" (click)="toggleCamera('admin')" style="margin-bottom: 15px;">
                  {{ isCameraActive() && scanMode() === 'admin' ? '❌ DÉSACTIVER LA CAMÉRA ADMIN' : '📸 CONFIGURER PAR SCAN CAMÉRA' }}
                </button>

                @if (isCameraActive() && scanMode() === 'admin') {
                  <div class="camera-wrapper" style="margin-bottom: 15px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                    <video #previewVideo autoplay playsinline muted></video>
                    <div class="scanner-target-zone"></div>
                    <div class="scanner-laser"></div>
                  </div>
                }

                <div style="display: flex; flex-direction: column; gap: 14px;">
                  <div>
                    <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #6b7280; display: block; margin-bottom: 5px;">Code-barres unique</label>
                    <input type="text" [(ngModel)]="adminBarcode" placeholder="Scannez ou saisissez manuellement..." style="font-family: monospace; font-weight: bold;" />
                  </div>
                  <div>
                    <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #6b7280; display: block; margin-bottom: 5px;">Désignation / Nom</label>
                    <input type="text" [(ngModel)]="adminName" placeholder="Ex: Robe d'été fleurie, Sac en cuir..." />
                  </div>
                  <div>
                    <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #6b7280; display: block; margin-bottom: 5px;">Prix de vente (FCFA)</label>
                    <input type="number" [(ngModel)]="adminPrice" placeholder="Ex: 12500" />
                  </div>
                  
                  <button type="button" class="checkout-btn" style="margin-top: 10px; width: 100%; display: flex; justify-content: center; align-items: center; gap: 8px;" (click)="saveProduct()">
                    <span>💾</span> Sauvegarder sur Supabase Cloud
                  </button>
                </div>
              </div>

              <div class="card" style="border-top: 4px solid #10b981;">
                <h3 style="margin-top: 0; margin-bottom: 5px;">☁️ Catalogue Général (Base Cloud)</h3>
                <p class="card-desc" style="margin-bottom: 15px;">Voici la liste des produits disponibles pour la vente sur l'application.</p>
                
                <div class="cart-list" style="max-height: 480px; overflow-y: auto; padding-right: 5px; gap: 8px;">
                  @if (cartService.productsList().length === 0) {
                    <div class="empty-state" style="padding: 40px 0;">
                      <span class="empty-icon">📭</span>
                      <p>Aucun produit en ligne dans la base de données.</p>
                    </div>
                  } @else {
                    @for (prod of cartService.productsList(); track prod.id) {
                      <div class="cart-item" style="padding: 12px; background: rgba(0,0,0,0.02); border-radius: 8px; border: 1px solid rgba(0,0,0,0.04); display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;">
                        <div class="item-info">
                          <strong style="font-size: 0.95rem; color: var(--text-main);">{{ prod.name }}</strong>
                          <div class="small-price" style="font-size: 0.75rem; color: #9ca3af; font-family: monospace; margin-top: 2px;">Barcode ID: {{ prod.id }}</div>
                        </div>
                        <div style="font-weight: 700; color: #2563eb; font-size: 1rem; background: rgba(37, 99, 235, 0.08); padding: 4px 10px; border-radius: 6px;">
                          {{ prod.price }} F
                        </div>
                      </div>
                    }
                  }
                </div>
              </div>

            </div>
          }
        </section>
        
      </div>

      <footer class="footer">
        <div class="footer-profile">
          <strong>La caisse Mobile & Desktop</strong>
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
  readonly scanMode = signal<'caisse' | 'admin'>('caisse');
  readonly isDarkMode = signal<boolean>(false);
  
  // Variables de gestion de la sécurité Admin
  readonly isAdminAuthenticated = signal<boolean>(false);
  passwordInput = '';
  readonly passwordError = signal<boolean>(false);

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

  // Fonctions de vérification de sécurité
  verifyPassword(): void {
    if (this.passwordInput === '2026') {
      this.isAdminAuthenticated.set(true);
      this.passwordError.set(false);
      this.passwordInput = '';
    } else {
      this.passwordError.set(true);
    }
  }

  logoutAdmin(): void {
    this.isAdminAuthenticated.set(false);
    this.stopCameraScanner();
    this.isCameraActive.set(false);
    this.activeTab.set('caisse');
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
              const product = this.cartService.scanProduct(decodedText);
              if (!product) {
                alert(`Code scanné inconnu : ${decodedText}`);
              }
            } else {
              this.adminBarcode = decodedText;
              this.isCameraActive.set(false);
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