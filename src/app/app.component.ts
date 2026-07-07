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
      
      <header class="topbar no-print">
        <div class="topbar-left">
          <h1>La Caisse <span class="accent-bolt">⚡</span></h1>
        </div>
        <div class="topbar-actions">
          <button type="button" class="theme-toggle-btn" (click)="toggleTheme()" [title]="isDarkMode() ? 'Activer le mode clair' : 'Activer le mode sombre'">
            <span class="theme-icon">{{ isDarkMode() ? '☀️' : '🌙' }}</span>
          </button>
        </div>
      </header>

      <nav class="dynamic-nav-container no-print">
        <div class="segmented-control" [attr.data-active-tab]="activeTab()">
          <div class="nav-slider"></div>
          
          <button type="button" class="nav-tab-btn" [class.active]="activeTab() === 'caisse'" (click)="setActiveTab('caisse')">
            <span class="nav-icon">🛒</span>
            <span class="nav-label">Caisse</span>
          </button>
          
          <button type="button" class="nav-tab-btn" [class.active]="activeTab() === 'historique'" (click)="setActiveTab('historique')">
            <span class="nav-icon">📋</span>
            <span class="nav-label">Historique</span>
          </button>
          
          <button type="button" class="nav-tab-btn" [class.active]="activeTab() === 'admin'" (click)="setActiveTab('admin')">
            <span class="nav-icon">⚙️</span>
            <span class="nav-label">Admin</span>
          </button>
        </div>
      </nav>

      <div id="receipt-print-zone" class="print-only">
        <div class="receipt-header">
          <h2>WEUZ.SHOP</h2>
          <p class="receipt-subtitle">Vêtements Homme & Accessoires</p>
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
        
        <section class="panel caisse-fullscreen-layout slide-view" [class.active]="activeTab() === 'caisse'">
          
          <div class="scanner-upper-section no-print">
            <video #previewVideo autoplay playsinline muted></video>
            
            <div class="scanner-target-box">
              <div class="corner tl"></div>
              <div class="corner tr"></div>
              <div class="corner bl"></div>
              <div class="corner br"></div>
            </div>

            <div class="camera-floating-controls">
              <button type="button" class="control-circle-btn" [class.active]="isFlashOn()" (click)="toggleFlash()">
                {{ isFlashOn() ? '🔦 On' : '⚡ Flash' }}
              </button>
            </div>
          </div>

          <div class="items-lower-sheet no-print">
            <div class="sheet-header">
              <div>
                <h3>Articles scannés</h3>
                <span class="sheet-sub">Total : {{ cartService.totalItems() }} produit(s)</span>
              </div>
              <div class="sheet-price-total">{{ cartService.subtotal() }} F</div>
            </div>

            <div class="sheet-scrolled-list">
              @if (cartService.cartItems().length === 0) {
                <div class="empty-sheet-state">
                  <div class="scan-pulse-icon">📸</div>
                  <p>Caméra prête. Scannez un article...</p>
                </div>
              } @else {
                @for (item of cartService.cartItems(); track item.id) {
                  <div class="sheet-item-row">
                    <div class="item-info">
                      <span class="item-name">{{ item.name }}</span>
                      <span class="item-price">{{ item.price }} FCFA</span>
                    </div>
                    
                    <div class="item-actions">
                      <div class="sheet-counter">
                        <button type="button" (click)="decrementQuantity(item)">-</button>
                        <span>{{ item.quantity }}</span>
                        <button type="button" (click)="incrementQuantity(item)">+</button>
                      </div>
                      <button type="button" class="sheet-del-btn" (click)="cartService.removeItem(item.id)">🗑️</button>
                    </div>
                  </div>
                }
              }
            </div>

            <div class="sheet-footer-action">
              <button type="button" class="sheet-checkout-btn" [disabled]="cartService.cartItems().length === 0" (click)="checkout()">
                🛒 Valider l'encaissement ({{ cartService.subtotal() }} F)
              </button>
            </div>
          </div>
        </section>

        <section class="panel history-panel slide-view no-print" [class.active]="activeTab() === 'historique'">
          <div class="card-header-full">
            <h2>Transactions terminées</h2>
          </div>
          <div class="history-list">
            @for (sale of cartService.salesHistory().length ? cartService.salesHistory() : []; track sale.id) {
              <article class="history-card">
                <div class="history-top">
                  <div>
                    <span class="invoice-tag">{{ sale.id }}</span>
                    <strong class="history-date">{{ sale.createdAt | date:'dd/MM à HH:mm' }}</strong>
                  </div>
                  <span class="history-total">{{ sale.total }} F</span>
                </div>
              </article>
            }
          </div>
        </section>

        <section class="panel history-panel slide-view no-print" [class.active]="activeTab() === 'admin'">
          @if (!isAdminAuthenticated()) {
            <div class="admin-lock-screen">
              <input type="password" [(ngModel)]="passwordInput" placeholder="Code secret..." (keyup.enter)="verifyPassword()" class="admin-input-field" />
              <button type="button" class="sheet-checkout-btn" (click)="verifyPassword()">Déverrouiller</button>
            </div>
          } @else {
            <div class="card premium-block">
              <h3>📦 Ajouter un Article</h3>
              <input type="text" [(ngModel)]="adminBarcode" placeholder="Code-barres..." class="admin-input-field" />
              <input type="text" [(ngModel)]="adminName" placeholder="Nom de l'article..." class="admin-input-field" />
              <input type="number" [(ngModel)]="adminPrice" placeholder="Prix..." class="admin-input-field" />
              <button type="button" class="sheet-checkout-btn" (click)="saveProduct()">Sauvegarder Cloud</button>
              <button type="button" (click)="logoutAdmin()" class="logout-btn">Déconnexion Admin</button>
            </div>
          }
        </section>
        
      </div>

      <footer class="footer no-print">
        <div class="footer-profile">
          <strong>La Caisse Cloud ⚡</strong>
          <p><a href="https://moussadioufportfolio.kesug.com" target="_blank" rel="noopener noreferrer">Portfolio Développeur</a></p>
        </div>
      </footer>

    </div>
  `,
  styles: [`
    /* SYSTEM DE VARIABLES DU THEME CHANGER (CLAIR/SOMBRE) */
    :root {
      --bg-shell: #ffffff;
      --bg-panels: #f8fafc;
      --bg-cards: #ffffff;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --border-color: #e2e8f0;
      --nav-bg: #f1f5f9;
      --nav-glow: rgba(37, 99, 235, 0.15);
    }

    .dark-theme {
      --bg-shell: #0f172a;
      --bg-panels: #1e293b;
      --bg-cards: #0f172a;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border-color: #334155;
      --nav-bg: #0f172a;
      --nav-glow: rgba(59, 130, 246, 0.4);
    }

    /* GLOBAL SYSTEM */
    .app-shell {
      background: var(--bg-shell);
      color: var(--text-main);
      min-height: 100vh;
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      transition: background 0.3s ease, color 0.3s ease;
      display: flex;
      flex-direction: column;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px 5px 20px;
    }
    .topbar h1 { margin: 0; font-size: 1.4rem; font-weight: 800; letter-spacing: -0.5px; }
    .accent-bolt { color: #f59e0b; }

    /* BOUTON DE THÈME LUMINEUX/SOMBRE */
    .theme-toggle-btn {
      background: var(--nav-bg);
      border: 1px solid var(--border-color);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      transition: all 0.2s ease;
    }
    .theme-toggle-btn:hover { transform: scale(1.05); }
    .theme-icon { font-size: 1.1rem; }

    /* ================= SYSTEM DE NAVIGATION ET LUMIERE AMBIANTE ================= */
    .dynamic-nav-container {
      padding: 10px 20px;
    }
    .segmented-control {
      position: relative;
      display: flex;
      background: var(--nav-bg);
      padding: 4px;
      border-radius: 30px;
      border: 1px solid var(--border-color);
      isolation: isolate;
      /* Lumière ambiante diffuse sous la barre de navigation */
      box-shadow: 0 4px 20px var(--nav-glow);
      transition: box-shadow 0.3s ease;
    }

    .nav-tab-btn {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: transparent;
      border: none;
      padding: 12px 5px;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      z-index: 2;
      transition: color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .nav-tab-btn.active {
      color: #ffffff !important;
    }

    /* Le Slider Dynamique */
    .nav-slider {
      position: absolute;
      top: 4px;
      bottom: 4px;
      left: 4px;
      width: calc(33.333% - 4px);
      background: #2563eb;
      border-radius: 26px;
      z-index: 1;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      /* Surbrillance lumineuse sur la pill active */
      box-shadow: 0 2px 10px rgba(37, 99, 235, 0.4);
    }

    /* Changement de position dynamique en fonction du tag de l'attribut */
    .segmented-control[data-active-tab="caisse"] .nav-slider { transform: translateX(0); }
    .segmented-control[data-active-tab="historique"] .nav-slider { transform: translateX(100%); }
    .segmented-control[data-active-tab="admin"] .nav-slider { transform: translateX(200%); }

    /* INTERFACE LAYOUT STRUCTURE */
    .view-container { flex: 1; padding: 15px; }
    .panel { display: none; }
    .panel.active { display: flex; }

    .caisse-fullscreen-layout {
      flex-direction: column;
      height: calc(100vh - 190px);
      margin: -15px;
      overflow: hidden;
    }

    /* ZONE CAMÉRA EN HAUT */
    .scanner-upper-section {
      position: relative;
      height: 38%;
      background: #000;
      overflow: hidden;
    }
    .scanner-upper-section video { width: 100%; height: 100%; object-fit: cover; }

    /* VISEUR CIBLE VERT IMMERSIF */
    .scanner-target-box {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 180px;
      height: 110px;
      pointer-events: none;
    }
    .corner { position: absolute; width: 18px; height: 18px; border: 3px solid #10b981; filter: drop-shadow(0 0 4px #10b981); }
    .tl { top: 0; left: 0; border-right: none; border-bottom: none; }
    .tr { top: 0; right: 0; border-left: none; border-bottom: none; }
    .bl { bottom: 0; left: 0; border-right: none; border-top: none; }
    .br { bottom: 0; right: 0; border-left: none; border-top: none; }

    .camera-floating-controls { position: absolute; right: 12px; top: 12px; }
    .control-circle-btn {
      padding: 8px 14px; border-radius: 20px; background: rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; font-size: 0.75rem; font-weight: bold; cursor: pointer;
    }
    .control-circle-btn.active { background: #f59e0b; color: #000; border-color: #f59e0b; box-shadow: 0 0 8px #f59e0b; }

    /* FEUILLE DES PRODUITS SCANNÉS */
    .items-lower-sheet {
      flex: 1;
      background: var(--bg-panels);
      border-top-left-radius: 24px;
      border-top-right-radius: 24px;
      box-shadow: 0 -6px 20px rgba(0,0,0,0.04);
      display: flex;
      flex-direction: column;
      padding: 18px;
      overflow: hidden;
      transition: background 0.3s ease;
    }

    .sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .sheet-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; }
    .sheet-sub { font-size: 0.8rem; color: var(--text-muted); }
    .sheet-price-total { font-size: 1.3rem; font-weight: 800; color: #2563eb; }

    .sheet-scrolled-list { flex: 1; overflow-y: auto; margin-bottom: 12px; }
    .sheet-item-row {
      display: flex; justify-content: space-between; align-items: center;
      background: var(--bg-cards); padding: 12px 14px; border-radius: 12px; margin-bottom: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      transition: background 0.3s ease;
    }
    
    .item-info { display: flex; flex-direction: column; }
    .item-name { font-weight: 600; font-size: 0.9rem; }
    .item-price { font-size: 0.75rem; color: var(--text-muted); }
    .item-actions { display: flex; align-items: center; gap: 10px; }
    
    .sheet-counter { display: flex; align-items: center; background: rgba(0,0,0,0.03); border-radius: 6px; padding: 2px; border: 1px solid var(--border-color); }
    .dark-theme .sheet-counter { background: rgba(255,255,255,0.05); }
    .sheet-counter button { background: transparent; border: none; width: 24px; height: 24px; font-weight: bold; color: var(--text-main); cursor: pointer; }
    .sheet-counter span { font-weight: 600; min-width: 16px; text-align: center; font-size: 0.85rem; }
    .sheet-del-btn { background: transparent; border: none; cursor: pointer; }

    .empty-sheet-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 35px; color: var(--text-muted); }
    .scan-pulse-icon { font-size: 2rem; margin-bottom: 5px; animation: pulseScan 2s infinite; }
    @keyframes pulseScan { 0% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 0.6; } }

    .sheet-checkout-btn {
      width: 100%; background: #2563eb; color: #fff; border: none; padding: 14px;
      font-size: 1rem; font-weight: 700; border-radius: 12px; cursor: pointer;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
    }
    .sheet-checkout-btn:disabled { opacity: 0.4; pointer-events: none; box-shadow: none; }

    /* ADMIN PANELS STYLE RE-DYMANISÉ */
    .admin-input-field {
      width: 100%; margin-bottom: 12px; padding: 12px; border-radius: 8px;
      background: var(--bg-shell); color: var(--text-main); border: 1px solid var(--border-color);
    }
    .logout-btn { margin-top: 10px; background: none; border: none; color: #ef4444; width: 100%; cursor: pointer; font-weight: 600; }

    /* FOOTER */
    .footer { text-align: center; padding: 10px; font-size: 0.8rem; border-top: 1px solid var(--border-color); margin-top: auto; }
    .footer a { color: #2563eb; text-decoration: none; font-weight: 600; }

    /* PRINT PRÉPARATION RECIEPT */
    #receipt-print-zone { font-family: monospace; width: 280px; padding: 10px; background: #fff; color: #000; }
    .print-only { display: none; }
    @media print { .no-print { display: none !important; } .print-only { display: block !important; } }
  `]
})
export class AppComponent implements AfterViewInit {
  readonly cartService = inject(CartService);
  readonly activeTab = signal<'caisse' | 'historique' | 'admin'>('caisse');
  readonly isDarkMode = signal<boolean>(false);
  readonly isFlashOn = signal<boolean>(false);
  
  readonly isAdminAuthenticated = signal<boolean>(false);
  passwordInput = '';

  lastReceiptItems: any[] = [];
  lastReceiptTotal = 0;
  currentInvoiceId = '';
  currentPrintDate = new Date();

  adminBarcode = '';
  adminName = '';
  adminPrice: number | null = null;

  @ViewChild('previewVideo') previewVideo!: ElementRef<HTMLVideoElement>;
  private codeReader = new BrowserMultiFormatReader();
  private videoTrack: MediaStreamTrack | null = null;

  constructor() {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    this.codeReader.hints = hints;

    effect(() => {
      if (this.activeTab() === 'caisse') {
        setTimeout(() => this.startCamera(), 200);
      } else {
        this.stopCamera();
      }
    });
  }

  ngAfterViewInit(): void {
    this.ensureCameraOnLaunch();
  }

  ensureCameraOnLaunch(): void {
    if (this.activeTab() === 'caisse') {
      this.startCamera();
    }
  }

  toggleTheme(): void {
    this.isDarkMode.set(!this.isDarkMode());
  }

  setActiveTab(tabName: 'caisse' | 'historique' | 'admin'): void {
    this.activeTab.set(tabName);
    this.ensureCameraOnLaunch();
  }

  verifyPassword(): void {
    if (this.passwordInput === '2026') {
      this.isAdminAuthenticated.set(true);
      this.passwordInput = '';
    }
  }

  logoutAdmin(): void {
    this.isAdminAuthenticated.set(false);
    this.setActiveTab('caisse');
  }

  async startCamera(): Promise<void> {
    if (!this.previewVideo?.nativeElement) return;
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      };

      await this.codeReader.decodeFromConstraints(
        constraints,
        this.previewVideo.nativeElement,
        (result) => {
          if (result) {
            const decodedText = result.getText().trim();
            this.cartService.scanProduct(decodedText);
          }
        }
      );

      const stream = this.previewVideo.nativeElement.srcObject as MediaStream;
      if (stream) {
        this.videoTrack = stream.getVideoTracks()[0];
      }
    } catch (err) {
      console.error("Erreur caméra :", err);
    }
  }

  async toggleFlash(): Promise<void> {
    if (!this.videoTrack) return;
    try {
      const nextFlashState = !this.isFlashOn();
      const capabilities = this.videoTrack.getCapabilities() as any;
      
      if (capabilities.torch) {
        await this.videoTrack.applyConstraints({
          advanced: [{ torch: nextFlashState }]
        } as any);
        this.isFlashOn.set(nextFlashState);
      } else {
        alert("Le flash n'est pas supporté par cet appareil.");
      }
    } catch (err) {
      console.error("Erreur flash :", err);
    }
  }

  stopCamera(): void {
    this.isFlashOn.set(false);
    this.videoTrack = null;
    this.codeReader.reset();
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
    if (!this.adminBarcode || !this.adminName || !this.adminPrice) return;
    await this.cartService.saveProductToSupabase({
      id: this.adminBarcode.trim(),
      name: this.adminName.trim(),
      price: this.adminPrice
    });
    this.adminBarcode = ''; this.adminName = ''; this.adminPrice = null;
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
      }, 250);
    }
  }
}