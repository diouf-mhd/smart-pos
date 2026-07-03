import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit, effect, ViewEncapsulation } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { CartService } from './cart.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  encapsulation: ViewEncapsulation.None, 
  template: `
    <div class="app-shell" [class.dark-theme]="isDarkMode()">
      
      <!-- EN-TÊTE ÉPURÉ DE L'APP -->
      <header class="topbar no-print">
        <div class="topbar-left">
          <p class="eyebrow">Système Cloud & Gestion de Stock</p>
          <h1>La Caisse ⚡</h1>
        </div>
        <div class="topbar-actions">
          <button type="button" class="theme-toggle-btn" (click)="toggleTheme()">
            {{ isDarkMode() ? '☀️ Mode Clair' : '🌙 Mode Sombre' }}
          </button>
          <div class="topbar-badge">{{ cartService.totalItems() }} art.</div>
        </div>
      </header>

      <!-- NAVIGATION À 3 ONGLETS -->
      <nav class="tabs no-print">
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

      <!-- ZONE D'IMPRESSION DU REÇU -->
      <div id="receipt-print-zone" class="print-only">
        <div class="receipt-header">
          <h2>SHOP</h2>
          <p class="receipt-subtitle">Produits  </p>
          <p>📍 Dougar ,,Diamniadio, Dakar, Sénégal</p>
          <p>📞 Tel: +221 77 906 11 73</p>
        </div>
        
        <div class="receipt-divider">-----------------------------------------</div>
        
        <div class="receipt-meta">
          <p><strong>Date :</strong> {{ currentPrintDate | date:'dd/MM/yyyy HH:mm' }}</p>
          <p><strong>Ticket N° :</strong> {{ currentInvoiceId }}</p>
        </div>
        
        <div class="receipt-divider">-----------------------------------------</div>
        
        <table class="receipt-tablei">
          <thead>
            <tr>
              <th style="text-align: left;">PRODUIT</th>
              <th style="text-align: center;">QTÉ</th>
              <th style="text-align: right;">PRIX</th>
            </tr>
          </thead>
          <tbody>
            @for (item of lastReceiptItems; track item.id) {
              <tr>
                <td style="text-align: left;">{{ item.name }}</td>
                <td style="text-align: center;">x{{ item.quantity }}</td>
                <td style="text-align: right;">{{ item.price * item.quantity }} F</td>
              </tr>
            }
          </tbody>
        </table>
        
        <div class="receipt-divider">-----------------------------------------</div>
        
        <div class="receipt-total-row">
          <span>TOTAL PAYÉ</span>
          <strong>{{ lastReceiptTotal }} FCFA</strong>
        </div>
        
        <div class="receipt-divider">-----------------------------------------</div>
        
        <div class="receipt-footer">
          <p>Merci pour votre confiance ! À bientôt.</p>
          <p>Suivez-nous sur Weuz.Shop ✨</p>
        </div>
      </div>

      <div class="view-container">
        
        <!-- ================= ONGLET 1 : CAISSE (ACCUEIL EN BLOCS ÉPURÉS COMPACTS) ================= -->
        <section class="panel caisse-grid slide-view" [class.active]="activeTab() === 'caisse'">
          
          <!-- BLOC DE SAISIE ET SCAN (Version ultra-compacte) -->
          <div class="card premium-block no-print">
            <div class="block-indicator indigo-dot"></div>
            <div class="compact-block-header">
              <h3>Scanner & Saisie</h3>
              <button type="button" class="compact-cam-toggle" [class.cam-active]="isCameraActive() && scanMode() === 'caisse'" (click)="toggleCamera('caisse')">
                {{ isCameraActive() && scanMode() === 'caisse' ? '❌ Fermer Caméra' : '📸 Ouvrir Caméra' }}
              </button>
            </div>

            @if (isCameraActive() && scanMode() === 'caisse') {
              <div class="camera-wrapper-compact">
                <video #previewVideo autoplay playsinline muted></video>
                <div class="scanner-laser-compact"></div>
              </div>
            }

            <div class="search-bar-wrapper" style="margin-top: 12px;">
              <span class="search-icon">🔍</span>
              <input
                #barcodeInput
                type="text"
                placeholder="Scanner ou saisir un code..."
                [(ngModel)]="barcodeInputValue"
                (keyup.enter)="handleScan()"
              />
              <button type="button" class="search-action-btn" (click)="handleScan()">Ajouter</button>
            </div>
          </div>

          <!-- BLOC DU PANIER ACTUEL -->
          <div class="card premium-block no-print">
            <div class="block-indicator emerald-dot"></div>
            <div class="card-header-inline">
              <h3>Panier en Cours</h3>
              <span class="items-count-badge">{{ cartService.totalItems() }} u</span>
            </div>

            @if (cartService.cartItems().length === 0) {
              <div class="empty-state-modern">
                <span class="empty-icon-emoji">🛒</span>
                <p>Le panier est vide pour le moment</p>
              </div>
            } @else {
              <div class="cart-list-modern">
                @for (item of cartService.cartItems(); track item.id) {
                  <div class="cart-item-row">
                    <div class="item-main-details">
                      <strong class="item-title">{{ item.name }}</strong>
                      <span class="item-subtitle">{{ item.price }} FCFA</span>
                    </div>
                    
                    <div class="item-actions-wrapper">
                      <div class="modern-counter">
                        <button type="button" class="counter-btn" (click)="decrementQuantity(item)">-</button>
                        <span class="counter-value">{{ item.quantity }}</span>
                        <button type="button" class="counter-btn" (click)="incrementQuantity(item)">+</button>
                      </div>
                      
                      <button type="button" class="modern-delete-btn" (click)="cartService.removeItem(item.id)">
                        🗑️
                      </button>
                    </div>
                  </div>
                }
              </div>
            }

            <div class="modern-summary-box">
              <span class="summary-label">Montant Total :</span>
              <strong class="summary-value">{{ cartService.subtotal() }} FCFA</strong>
            </div>
          </div>

          <!-- BLOC DE VALIDATION & PAIEMENT -->
          <div class="card premium-block no-print" [class.disabled-opacity]="cartService.cartItems().length === 0">
            <div class="block-indicator amber-dot"></div>
            <h3>Règlement Client</h3>
            
            <div class="qr-wrapper-modern">
              <div class="qr-box-design">
                <div class="qr-corner top-left"></div>
                <div class="qr-corner top-right"></div>
                <div class="qr-corner bottom-left"></div>
                <div class="qr-center-dot"></div>
              </div>
              <div class="qr-price-badge">{{ cartService.subtotal() }} F</div>
            </div>

            <button type="button" class="checkout-action-btn" [disabled]="cartService.cartItems().length === 0" (click)="checkout()">
              ✅ Encaisser & Imprimer
            </button>
          </div>
        </section>

        <!-- ================= ONGLET 2 : HISTORIQUE ================= -->
        <section class="panel history-panel slide-view no-print" [class.active]="activeTab() === 'historique'">
          <div class="card-header-full">
            <h2>Transactions terminées</h2>
            <span class="history-badge">{{ cartService.salesHistory().length }} vente(s)</span>
          </div>

          @if (cartService.salesHistory().length === 0) {
            <div class="empty-state-modern">
              <span class="empty-icon-emoji">📂</span>
              <p>Aucune transaction enregistrée.</p>
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

        <!-- ================= ONGLET 3 : ADMIN / GESTION DES PRODUITS ================= -->
        <section class="panel history-panel slide-view no-print" [class.active]="activeTab() === 'admin'">
          
          @if (!isAdminAuthenticated()) {
            <div style="display: flex; justify-content: center; align-items: center; min-height: 400px; padding: 20px;">
              <div class="card premium-block" style="width: 100%; max-width: 400px; text-align: center; padding: 30px;">
                <div style="font-size: 3rem; margin-bottom: 10px;">🔐</div>
                <h2 style="margin-bottom: 8px;">Espace Administrateur</h2>
                
                <div style="display: flex; flex-direction: column; gap: 15px;">
                  <input 
                    type="password" 
                    [(ngModel)]="passwordInput" 
                    placeholder="Code secret..." 
                    style="text-align: center; font-size: 1.2rem; letter-spacing: 6px; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);"
                    (keyup.enter)="verifyPassword()"
                  />
                  @if (passwordError()) {
                    <p style="color: #ef4444; font-size: 0.85rem; font-weight: 600; margin: 0;">❌ Code secret incorrect.</p>
                  }
                  <button type="button" class="checkout-action-btn" style="width: 100%;" (click)="verifyPassword()">
                    Déverrouiller
                  </button>
                </div>
              </div>
            </div>
          }

          @else {
            <div class="card-header-full" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <div>
                <h2 style="margin: 0;">⚙️ Administration Cloud</h2>
              </div>
              <div style="display: flex; gap: 10px; align-items: center;">
                <span class="history-badge" style="background: #10b981; padding: 6px 12px; font-weight: 600;">
                  🟢 {{ cartService.productsList().length }} articles
                </span>
                <button type="button" class="modern-delete-btn" style="padding: 6px 12px; font-size: 0.85rem;" (click)="logoutAdmin()">
                  🔒 Déconnexion
                </button>
              </div>
            </div>

            <div class="caisse-grid" style="grid-template-columns: 1.1fr 1.9fr; gap: 24px; align-items: start;">
              
              <div class="card premium-block">
                <h3 style="margin-top: 0;">📦 Nouveau Produit</h3>
                
                <div class="compact-block-header" style="margin-bottom: 10px;">
                  <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">Lancer le capteur :</span>
                  <button type="button" class="compact-cam-toggle" [class.cam-active]="isCameraActive() && scanMode() === 'admin'" (click)="toggleCamera('admin')">
                    {{ isCameraActive() && scanMode() === 'admin' ? '❌ Fermer' : '📸 Activer' }}
                  </button>
                </div>

                @if (isCameraActive() && scanMode() === 'admin') {
                  <div class="camera-wrapper-compact" style="margin-bottom: 12px;">
                    <video #previewVideo autoplay playsinline muted></video>
                    <div class="scanner-laser-compact"></div>
                  </div>
                }

                <div style="display: flex; flex-direction: column; gap: 14px;">
                  <div>
                    <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 4px;">Code-barres</label>
                    <input type="text" [(ngModel)]="adminBarcode" placeholder="ID..." style="font-family: monospace; font-weight: bold; width:100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);" />
                  </div>
                  <div>
                    <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 4px;">Nom de l'article</label>
                    <input type="text" [(ngModel)]="adminName" placeholder="Désignation..." style="width:100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);" />
                  </div>
                  <div>
                    <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 4px;">Prix de vente (F)</label>
                    <input type="number" [(ngModel)]="adminPrice" placeholder="Montant..." style="width:100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);" />
                  </div>
                  
                  <button type="button" class="checkout-action-btn" style="margin-top: 10px; width: 100%;" (click)="saveProduct()">
                    💾 Sauvegarder sur Supabase
                  </button>
                </div>
              </div>

              <div class="card premium-block">
                <h3 style="margin-top: 0; margin-bottom: 15px;">☁️ Catalogue Général</h3>
                
                <div class="cart-list" style="max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
                  @if (cartService.productsList().length === 0) {
                    <div class="empty-state-modern" style="padding: 40px 0;">
                      <span class="empty-icon-emoji">📭</span>
                      <p>Aucun produit enregistré.</p>
                    </div>
                  } @else {
                    @for (prod of cartService.productsList(); track prod.id) {
                      <div class="cart-item-row" style="padding: 12px;">
                        <div class="item-main-details">
                          <strong style="font-size: 0.95rem;">{{ prod.name }}</strong>
                          <span style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">ID: {{ prod.id }}</span>
                        </div>
                        <div style="font-weight: 700; color: #2563eb; background: var(--primary-light); padding: 4px 10px; border-radius: 6px;">
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

      <footer class="footer no-print">
        <div class="footer-profile">
          <strong>La Caisse Mobile & Desktop</strong>
          <p>visiter mon profile : <a href="https://moussadioufportfolio.kesug.com" target="_blank" rel="noopener noreferrer">https://moussadioufportfolio.kesug.com</a></p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    /* STYLE DES BLOCS MODERNES */
    .premium-block {
      position: relative;
      border: 1px solid var(--border-color) !important;
      border-radius: 16px !important;
      padding: 18px !important;
      background: var(--bg-card) !important;
    }
    
    .block-indicator {
      position: absolute;
      top: 15px;
      right: 15px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }
    .indigo-dot { background: #6366f1; }
    .emerald-dot { background: #10b981; }
    .amber-dot { background: #f59e0b; }

    /* EN-TÊTE COMPACT POUR LE SCAN */
    .compact-block-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .compact-block-header h3 { margin: 0; font-size: 1.1rem; }
    
    .compact-cam-toggle {
      background: var(--primary-light);
      color: #2563eb;
      border: 1px solid rgba(37, 99, 235, 0.15);
      padding: 6px 12px;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .compact-cam-toggle:hover, .compact-cam-toggle.cam-active {
      background: #2563eb;
      color: #fff;
    }

    /* ZONE DE VISION COMPACTE (BANDEAU HORIZONTAL FIN) */
    .camera-wrapper-compact {
      position: relative;
      width: 100%;
      height: 90px; /* Taille drastiquement réduite */
      background: #000;
      border-radius: 10px;
      overflow: hidden;
      margin-top: 10px;
      border: 1px solid var(--border-color);
    }
    .camera-wrapper-compact video {
      width: 100%;
      height: 100%;
      object-fit: cover; /* Recadre pour remplir le petit bandeau */
    }
    
    .scanner-laser-compact {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: #ef4444;
      box-shadow: 0 0 6px #ef4444;
      animation: laserScanCompact 1.5s infinite ease-in-out;
    }
    @keyframes laserScanCompact {
      0% { top: 15%; }
      50% { top: 85%; }
      100% { top: 15%; }
    }

    /* BARRE DE RECHERCHE */
    .search-bar-wrapper {
      display: flex;
      align-items: center;
      background: rgba(0, 0, 0, 0.02);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 4px 10px;
      gap: 8px;
    }
    .dark-theme .search-bar-wrapper { background: rgba(255, 255, 255, 0.03); }
    .search-icon { color: var(--text-muted); }
    .search-bar-wrapper input {
      flex: 1;
      border: none !important;
      background: transparent !important;
      padding: 6px 0;
      font-size: 0.95rem;
      color: var(--text-main);
      outline: none;
    }
    .search-action-btn {
      background: var(--text-main);
      color: var(--bg-card);
      border: none;
      padding: 6px 12px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
    }

    /* LISTE DU PANIER */
    .cart-list-modern {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 10px;
      max-height: 240px;
      overflow-y: auto;
    }
    .cart-item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(0,0,0,0.04);
    }
    .item-main-details { display: flex; flex-direction: column; }
    .item-title { font-size: 0.95rem; color: var(--text-main); }
    .item-subtitle { font-size: 0.8rem; color: var(--text-muted); }
    
    /* COMPTEUR AMÉLIORÉ */
    .item-actions-wrapper { display: flex; align-items: center; gap: 10px; }
    .modern-counter {
      display: flex;
      align-items: center;
      background: rgba(0,0,0,0.03);
      border-radius: 8px;
      padding: 2px;
      border: 1px solid var(--border-color);
    }
    .dark-theme .modern-counter { background: rgba(255,255,255,0.04); }
    .counter-btn {
      background: transparent;
      border: none;
      width: 24px;
      height: 24px;
      font-weight: bold;
      color: var(--text-main);
      cursor: pointer;
    }
    .counter-value { font-size: 0.9rem; font-weight: 600; min-width: 18px; text-align: center; }
    .modern-delete-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 0.95rem;
    }

    /* TOTAL ET QR CODE */
    .modern-summary-box {
      margin-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px dashed var(--border-color);
    }
    .summary-value { font-size: 1.2rem; color: #2563eb; }
    
    .qr-wrapper-modern {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 15px 0;
      gap: 8px;
    }
    .qr-box-design {
      width: 80px;
      height: 80px;
      border: 2px solid var(--border-color);
      border-radius: 12px;
      position: relative;
    }
    .qr-corner { position: absolute; width: 12px; height: 12px; border: 3px solid #2563eb; }
    .top-left { top: -2px; left: -2px; border-right: none; border-bottom: none; border-top-left-radius: 50%; }
    .top-right { top: -2px; right: -2px; border-left: none; border-bottom: none; border-top-right-radius: 50%; }
    .bottom-left { bottom: -2px; left: -2px; border-right: none; border-top: none; border-bottom-left-radius: 50%; }
    .qr-center-dot { position: absolute; top: 34px; left: 34px; width: 12px; height: 12px; background: var(--text-main); border-radius: 2px; }
    .qr-price-badge { font-family: monospace; font-weight: bold; font-size: 0.95rem; }

    .checkout-action-btn {
      width: 100%;
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 12px;
      font-size: 0.95rem;
      font-weight: 600;
      border-radius: 10px;
      cursor: pointer;
    }

    /* CONFIGURATION STRICTE REÇU IMPRESSION */
    #receipt-print-zone {
      font-family: 'Courier New', Courier, monospace;
      width: 280px;
      padding: 10px;
      background: #fff;
      color: #000;
      margin: 0 auto;
    }
    .receipt-header { text-align: center; margin-bottom: 6px; }
    .receipt-header h2 { font-size: 1.3rem; margin: 0 0 4px 0; font-weight: bold; }
    .receipt-subtitle { font-size: 0.7rem; text-transform: uppercase; margin: 0 0 4px 0; }
    .receipt-header p { font-size: 0.75rem; margin: 2px 0; }
    .receipt-divider { text-align: center; font-size: 0.8rem; margin: 4px 0; }
    .receipt-meta p { font-size: 0.75rem; margin: 2px 0; }
    .receipt-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; margin: 6px 0; }
    .receipt-table th { font-weight: bold; padding-bottom: 4px; border-bottom: 1px dashed #000; }
    .receipt-table td { padding: 3px 0; }
    .receipt-total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 1rem; }
    .receipt-footer { text-align: center; font-size: 0.75rem; margin-top: 12px; font-style: italic; }

    .print-only { display: none; }
    @media print {
      .no-print { display: none !important; }
      .print-only { display: block !important; }
    }
    .disabled-opacity { opacity: 0.4; pointer-events: none; }
  `]
})
export class AppComponent implements AfterViewInit {
  readonly cartService = inject(CartService);
  readonly activeTab = signal<'caisse' | 'historique' | 'admin'>('caisse');
  readonly isCameraActive = signal<boolean>(false);
  readonly scanMode = signal<'caisse' | 'admin'>('caisse');
  readonly isDarkMode = signal<boolean>(false);
  
  readonly isAdminAuthenticated = signal<boolean>(false);
  passwordInput = '';
  readonly passwordError = signal<boolean>(false);

  barcodeInputValue = '';

  lastReceiptItems: any[] = [];
  lastReceiptTotal = 0;
  currentInvoiceId = '';
  currentPrintDate = new Date();

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
      console.error("Erreur capteur :", err);
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
      alert("Veuillez remplir tous les champs.");
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
      alert("Article synchronisé cloud ! 🚀");
    } else {
      alert("Échec cloud.");
    }
  }

  checkout(): void {
    this.lastReceiptItems = [...this.cartService.cartItems()];
    this.lastReceiptTotal = this.cartService.subtotal();
    this.currentPrintDate = new Date();
    this.currentInvoiceId = 'INV-' + Math.floor(100000 + Math.random() * 900000);

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