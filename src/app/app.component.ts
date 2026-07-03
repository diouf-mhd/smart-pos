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

      <!-- ZONE D'IMPRESSION DU REÇU (CACHÉE À L'ÉCRAN, VISIBLE UNIQUEMENT À L'IMPRESSION) -->
      <div id="receipt-print-zone" class="print-only">
        <div class="receipt-header">
          <h2>WEUZ.SHOP</h2>
          <p class="receipt-subtitle">Vêtements Homme & Accessoires de Mode</p>
          <p>📍 Sacré-Cœur 3, Dakar, Sénégal</p>
          <p>📞 Tel: +221 77 123 45 67</p>
        </div>
        
        <div class="receipt-divider">-----------------------------------------</div>
        
        <div class="receipt-meta">
          <p><strong>Date :</strong> {{ currentPrintDate | date:'dd/MM/yyyy HH:mm' }}</p>
          <p><strong>Ticket N° :</strong> {{ currentInvoiceId }}</p>
        </div>
        
        <div class="receipt-divider">-----------------------------------------</div>
        
        <table class="receipt-table">
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
        
        <!-- ================= ONGLET 1 : CAISSE (ACCUEIL EN BLOCS ÉPURÉS) ================= -->
        <section class="panel caisse-grid slide-view" [class.active]="activeTab() === 'caisse'">
          
          <!-- BLOC DE SAISIE ET SCAN (Inspiré de la netteté de l'image 274736.jpg) -->
          <div class="card premium-block no-print">
            <div class="block-indicator indigo-dot"></div>
            <h3>Scanner & Recherche</h3>
            <p class="card-desc">Centrez le code-barres dans la zone ou utilisez la recherche manuelle rapide.</p>

            <button type="button" class="scan-button-modern" [class.cam-active]="isCameraActive() && scanMode() === 'caisse'" (click)="toggleCamera('caisse')">
              @if (isCameraActive() && scanMode() === 'caisse') {
                <span>❌ Éteindre la caméra</span>
              } @else {
                <span>📸 Lancer le Scanner Photo</span>
              }
            </button>

            @if (isCameraActive() && scanMode() === 'caisse') {
              <div class="camera-wrapper-modern">
                <video #previewVideo autoplay playsinline muted></video>
                <div class="scanner-target-zone"></div>
                <div class="scanner-laser"></div>
              </div>
            }

            <div class="search-bar-wrapper">
              <span class="search-icon">🔍</span>
              <input
                #barcodeInput
                type="text"
                placeholder="Entrez ou scannez un code-barres..."
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
            <p class="card-desc">Finalisez la commande pour éditer le ticket de caisse.</p>
            
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
              ✅ Encaisser & Imprimer Ticket
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
                <p class="card-desc" style="margin-bottom: 20px;">Veuillez saisir le code d'accès secret pour gérer le stock et le catalogue cloud.</p>
                
                <div style="display: flex; flex-direction: column; gap: 15px;">
                  <input 
                    type="password" 
                    [(ngModel)]="passwordInput" 
                    placeholder="Entrez le code secret..." 
                    style="text-align: center; font-size: 1.2rem; letter-spacing: 6px; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);"
                    (keyup.enter)="verifyPassword()"
                  />
                  @if (passwordError()) {
                    <p style="color: #ef4444; font-size: 0.85rem; font-weight: 600; margin: 0;">❌ Code secret incorrect.</p>
                  }
                  <button type="button" class="checkout-action-btn" style="width: 100%;" (click)="verifyPassword()">
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
                <button type="button" class="modern-delete-btn" style="padding: 6px 12px; font-size: 0.85rem; display: flex; align-items: center; gap: 5px;" (click)="logoutAdmin()">
                  🔒 Déconnexion
                </button>
              </div>
            </div>

            <div class="caisse-grid" style="grid-template-columns: 1.1fr 1.9fr; gap: 24px; align-items: start;">
              
              <div class="card premium-block" style="position: sticky; top: 10px;">
                <h3 style="margin-top: 0; display: flex; align-items: center; gap: 8px;">📦 Nouveau Produit</h3>
                <p class="card-desc" style="margin-bottom: 15px;">Capturez directement un code-barres depuis le capteur photo.</p>
                
                <button type="button" class="scan-button-modern" [class.cam-active]="isCameraActive() && scanMode() === 'admin'" (click)="toggleCamera('admin')" style="margin-bottom: 15px;">
                  {{ isCameraActive() && scanMode() === 'admin' ? '❌ Désactiver la caméra admin' : '📸 Configurer par scan' }}
                </button>

                @if (isCameraActive() && scanMode() === 'admin') {
                  <div class="camera-wrapper-modern" style="margin-bottom: 15px;">
                    <video #previewVideo autoplay playsinline muted></video>
                    <div class="scanner-target-zone"></div>
                    <div class="scanner-laser"></div>
                  </div>
                }

                <div style="display: flex; flex-direction: column; gap: 14px;">
                  <div>
                    <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 5px;">Code-barres unique</label>
                    <input type="text" [(ngModel)]="adminBarcode" placeholder="Scannez ou saisissez..." style="font-family: monospace; font-weight: bold; width:100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);" />
                  </div>
                  <div>
                    <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 5px;">Désignation / Nom</label>
                    <input type="text" [(ngModel)]="adminName" placeholder="Ex: Chemise Lin Slim Fit..." style="width:100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);" />
                  </div>
                  <div>
                    <label style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 5px;">Prix de vente (FCFA)</label>
                    <input type="number" [(ngModel)]="adminPrice" placeholder="Ex: 15000" style="width:100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);" />
                  </div>
                  
                  <button type="button" class="checkout-action-btn" style="margin-top: 10px; width: 100%;" (click)="saveProduct()">
                    💾 Sauvegarder sur Supabase Cloud
                  </button>
                </div>
              </div>

              <div class="card premium-block">
                <h3 style="margin-top: 0; margin-bottom: 5px;">☁️ Catalogue Général (Base Cloud)</h3>
                <p class="card-desc" style="margin-bottom: 15px;">Voici la liste des produits disponibles pour la vente sur l'application.</p>
                
                <div class="cart-list" style="max-height: 480px; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; gap: 8px;">
                  @if (cartService.productsList().length === 0) {
                    <div class="empty-state-modern" style="padding: 40px 0;">
                      <span class="empty-icon-emoji">📭</span>
                      <p>Aucun produit en ligne.</p>
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
    /* STYLE DES NOUVEAUX BLOCS MODERNES (Inspiré de l'image 274736.jpg) */
    .premium-block {
      position: relative;
      border: 1px solid var(--border-color) !important;
      border-radius: 16px !important; /* Angles adoucis comme sur l'image */
      padding: 20px !important;
      background: var(--bg-card) !important;
      overflow: hidden;
    }
    
    .block-indicator {
      position: absolute;
      top: 15px;
      right: 15px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .indigo-dot { background: #6366f1; box-shadow: 0 0 8px #6366f1; }
    .emerald-dot { background: #10b981; box-shadow: 0 0 8px #10b981; }
    .amber-dot { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }

    /* BOUTON SCAN ULTRA-SIMPLE */
    .scan-button-modern {
      width: 100%;
      background: rgba(37, 99, 235, 0.06);
      color: #2563eb;
      border: 1px dashed #2563eb;
      padding: 12px;
      font-weight: 600;
      border-radius: 10px;
      cursor: pointer;
      margin-bottom: 15px;
      transition: all 0.2s ease;
    }
    .scan-button-modern:hover {
      background: #2563eb;
      color: #fff;
      border-style: solid;
    }

    /* BARRE DE RECHERCHE MONOCHROME */
    .search-bar-wrapper {
      display: flex;
      align-items: center;
      background: rgba(0, 0, 0, 0.02);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 4px 10px;
      gap: 8px;
    }
    .dark-theme .search-bar-wrapper {
      background: rgba(255, 255, 255, 0.03);
    }
    .search-icon { color: var(--text-muted); font-size: 1rem; }
    .search-bar-wrapper input {
      flex: 1;
      border: none !important;
      background: transparent !important;
      padding: 8px 0;
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

    /* STRUCTURE DE LA LISTE DU PANIER */
    .cart-list-modern {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 15px;
      max-height: 260px;
      overflow-y: auto;
    }
    .cart-item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid rgba(0,0,0,0.04);
    }
    .item-main-details { display: flex; flex-direction: column; }
    .item-title { font-size: 0.95rem; color: var(--text-main); }
    .item-subtitle { font-size: 0.8rem; color: var(--text-muted); }
    
    /* COMPTEUR PLUS FIN ET PLUS JOLI */
    .item-actions-wrapper { display: flex; align-items: center; gap: 12px; }
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
      width: 26px;
      height: 26px;
      font-weight: bold;
      color: var(--text-main);
      cursor: pointer;
    }
    .counter-value { font-size: 0.9rem; font-weight: 600; min-width: 20px; text-align: center; }
    .modern-delete-btn {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      padding: 4px;
    }

    /* BLOC TOTAL ET QR DESIGN */
    .modern-summary-box {
      margin-top: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px dashed var(--border-color);
    }
    .summary-value { font-size: 1.25rem; color: #2563eb; }
    
    .qr-wrapper-modern {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 20px 0;
      gap: 10px;
    }
    .qr-box-design {
      width: 100px;
      height: 100px;
      border: 2px solid var(--border-color);
      border-radius: 12px;
      position: relative;
    }
    .qr-corner { position: absolute; width: 14px; height: 14px; border: 3px solid #2563eb; }
    .top-left { top: -2px; left: -2px; border-right: none; border-bottom: none; border-top-left-radius: 6px; }
    .top-right { top: -2px; right: -2px; border-left: none; border-bottom: none; border-top-right-radius: 6px; }
    .bottom-left { bottom: -2px; left: -2px; border-right: none; border-top: none; border-bottom-left-radius: 6px; }
    .qr-center-dot { position: absolute; top: 43px; left: 43px; width: 14px; height: 14px; background: var(--text-main); border-radius: 3px; }
    .qr-price-badge { font-family: monospace; font-weight: bold; font-size: 1rem; background: rgba(0,0,0,0.04); padding: 2px 8px; border-radius: 6px; }

    .checkout-action-btn {
      width: 100%;
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 14px;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 10px;
      cursor: pointer;
    }

    /* ================= GESTION STRICTE DE L'IMPRESSION DU TICKET REÇU ================= */
    #receipt-print-zone {
      font-family: 'Courier New', Courier, monospace;
      width: 280px;
      padding: 10px;
      background: #fff;
      color: #000;
      margin: 0 auto;
    }
    .receipt-header { text-align: center; margin-bottom: 8px; }
    .receipt-header h2 { font-size: 1.4rem; margin: 0 0 4px 0; font-weight: bold; letter-spacing: 1px; }
    .receipt-subtitle { font-size: 0.75rem; text-transform: uppercase; margin: 0 0 6px 0; }
    .receipt-header p { font-size: 0.8rem; margin: 2px 0; }
    .receipt-divider { text-align: center; font-size: 0.85rem; margin: 6px 0; letter-spacing: -1px; }
    .receipt-meta p { font-size: 0.8rem; margin: 3px 0; }
    .receipt-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin: 8px 0; }
    .receipt-table th { font-weight: bold; padding-bottom: 4px; border-bottom: 1px dashed #000; }
    .receipt-table td { padding: 4px 0; vertical-align: top; }
    .receipt-total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 1.05rem; padding: 4px 0; }
    .receipt-footer { text-align: center; font-size: 0.8rem; margin-top: 15px; font-style: italic; }

    /* Règles d'affichage écran vs papier */
    .print-only { display: none; }
    @media print {
      .no-print { display: none !important; }
      .print-only { display: block !important; }
      body, html { background: #fff !important; color: #000 !important; }
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
  
  // Sécurité
  readonly isAdminAuthenticated = signal<boolean>(false);
  passwordInput = '';
  readonly passwordError = signal<boolean>(false);

  barcodeInputValue = '';

  // Variables tampons pour mémoriser la vente à imprimer
  lastReceiptItems: any[] = [];
  lastReceiptTotal = 0;
  currentInvoiceId = '';
  currentPrintDate = new Date();

  // Formulaire d'administration
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
    // 1. Mémoriser les informations de la vente en cours avant de vider le panier
    this.lastReceiptItems = [...this.cartService.cartItems()];
    this.lastReceiptTotal = this.cartService.subtotal();
    this.currentPrintDate = new Date();
    this.currentInvoiceId = 'INV-' + Math.floor(100000 + Math.random() * 900000);

    // 2. Enregistrer la transaction dans le service
    const sale = this.cartService.checkout();
    if (sale) {
      setTimeout(() => {
        // Lancer la fenêtre d'impression native
        window.print();
        
        // Nettoyer et réinitialiser l'interface après impression
        this.cartService.clearCart();
        this.activeTab.set('caisse');
      }, 250);
    }
  }
}