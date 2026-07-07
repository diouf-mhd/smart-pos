import { Component, inject, signal, ViewChild, ElementRef, AfterViewInit, effect, ViewEncapsulation } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { CartService } from './cart.service';
import { jsPDF } from 'jspdf'; // 👈 IMPORTATION DE JSPDF

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

      <div *ngIf="showReceiptModal" class="receipt-modal-overlay no-print">
        <div class="receipt-modal-card">
          <h3>🎉 Vente validée avec succès !</h3>
          <p>Le ticket de caisse est prêt.</p>
          <div class="modal-actions">
            <button type="button" class="download-pdf-btn" (click)="generateReceiptPDF()">
              📄 Télécharger le Ticket PDF
            </button>
            <button type="button" class="close-modal-btn" (click)="closeReceiptModal()">
              Continuer la vente
            </button>
          </div>
        </div>
      </div>

      <div class="view-container">
        
        <section class="panel caisse-fullscreen-layout slide-view" [class.active]="activeTab() === 'caisse'">
          <div class="scanner-upper-section no-print">
            <video #previewVideo autoplay playsinline muted></video>
            <div class="scanner-target-box">
              <div class="corner tl"></div> <div class="corner tr"></div>
              <div class="corner bl"></div> <div class="corner br"></div>
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
                      <span class="item-price">
                        {{ item.price }} F
                        @if (item.unit && item.unit !== 'U') {
                          <small class="text-muted">/ {{ item.unit }}</small>
                        }
                      </span>
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
                ⚡ Valider l'encaissement ({{ cartService.subtotal() }} F)
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

        <section class="panel caisse-fullscreen-layout slide-view no-print" [class.active]="activeTab() === 'admin'">
          @if (!isAdminAuthenticated()) {
            <div class="admin-lock-screen" style="width:100%; padding:20px;">
              <input type="password" [(ngModel)]="passwordInput" placeholder="Code secret..." (keyup.enter)="verifyPassword()" class="admin-input-field" />
              <button type="button" class="sheet-checkout-btn" (click)="verifyPassword()">Déverrouiller</button>
            </div>
          } @else {
            <div class="scanner-upper-section">
              <video #adminVideo autoplay playsinline muted></video>
              <div class="scanner-target-box admin-mode">
                <div class="corner tl"></div> <div class="corner tr"></div>
                <div class="corner bl"></div> <div class="corner br"></div>
              </div>
              <div class="scan-status-overlay" *ngIf="adminBarcode">
                <span>Code détecté : <strong>{{ adminBarcode }}</strong></span>
              </div>
            </div>

            <div class="items-lower-sheet">
              <div class="sheet-header">
                <h3>📦 Nouvel Article Cloud</h3>
                <button type="button" class="clear-scan-btn" (click)="adminBarcode = ''" *ngIf="adminBarcode">🔄 Re-scanner</button>
              </div>

              <div class="sheet-scrolled-list" style="padding-top: 5px;">
                <div class="input-group">
                  <label>Code-barres capturé</label>
                  <input type="text" [(ngModel)]="adminBarcode" placeholder="Scannez un article pour remplir..." class="admin-input-field" readonly />
                </div>

                <div class="input-group">
                  <label>Désignation / Nom</label>
                  <input type="text" [(ngModel)]="adminName" placeholder="Ex: T-Shirt Nike Tech, Mangue..." class="admin-input-field" />
                </div>

                <div class="input-group">
                  <label>Unité de mesure (Facultatif)</label>
                  <div class="unit-selector">
                    <button type="button" [class.selected]="adminUnit === 'U'" (click)="adminUnit = 'U'">Pcs (U)</button>
                    <button type="button" [class.selected]="adminUnit === 'kg'" (click)="adminUnit = 'kg'">kg</button>
                    <button type="button" [class.selected]="adminUnit === 'g'" (click)="adminUnit = 'g'">g</button>
                    <button type="button" [class.selected]="adminUnit === 'L'" (click)="adminUnit = 'L'">Litre</button>
                  </div>
                </div>

                <div class="input-group">
                  <label>Prix de vente (FCFA)</label>
                  <input type="number" [(ngModel)]="adminPrice" placeholder="Ex: 500 ou 15000" class="admin-input-field" />
                </div>
              </div>

              <div class="sheet-footer-action">
                <button type="button" class="sheet-checkout-btn" [disabled]="!adminBarcode || !adminName || !adminPrice" (click)="saveProduct()">
                  💾 Enregistrer sur Supabase
                </button>
                <button type="button" (click)="logoutAdmin()" class="logout-btn">Déconnexion Admin</button>
              </div>
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
    :root {
      --bg-shell: #ffffff; --bg-panels: #f8fafc; --bg-cards: #ffffff;
      --text-main: #0f172a; --text-muted: #64748b; --border-color: #e2e8f0;
      --nav-bg: #f1f5f9; --nav-glow: rgba(37, 99, 235, 0.15);
    }
    .dark-theme {
      --bg-shell: #0f172a; --bg-panels: #1e293b; --bg-cards: #0f172a;
      --text-main: #f8fafc; --text-muted: #94a3b8; --border-color: #334155;
      --nav-bg: #0f172a; --nav-glow: rgba(59, 130, 246, 0.4);
    }

    .app-shell { background: var(--bg-shell); color: var(--text-main); min-height: 100vh; font-family: system-ui, sans-serif; display: flex; flex-direction: column; }
    .topbar { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px 5px 20px; }
    .theme-toggle-btn { background: var(--nav-bg); border: 1px solid var(--border-color); width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }

    .dynamic-nav-container { padding: 10px 20px; }
    .segmented-control { position: relative; display: flex; background: var(--nav-bg); padding: 4px; border-radius: 30px; border: 1px solid var(--border-color); box-shadow: 0 4px 20px var(--nav-glow); isolation: isolate; }
    .nav-tab-btn { position: relative; flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; background: transparent; border: none; padding: 12px 5px; font-size: 0.9rem; font-weight: 600; color: var(--text-muted); cursor: pointer; z-index: 2; transition: color 0.3s ease; }
    .nav-tab-btn.active { color: #ffffff !important; }
    .nav-slider { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc(33.333% - 4px); background: #2563eb; border-radius: 26px; z-index: 1; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 10px rgba(37, 99, 235, 0.4); }
    .segmented-control[data-active-tab="caisse"] .nav-slider { transform: translateX(0); }
    .segmented-control[data-active-tab="historique"] .nav-slider { transform: translateX(100%); }
    .segmented-control[data-active-tab="admin"] .nav-slider { transform: translateX(200%); }

    .view-container { flex: 1; padding: 15px; }
    .panel { display: none; }
    .panel.active { display: flex; }
    .caisse-fullscreen-layout { flex-direction: column; height: calc(100vh - 190px); margin: -15px; overflow: hidden; }

    .scanner-upper-section { position: relative; height: 36%; background: #000; overflow: hidden; }
    .scanner-upper-section video { width: 100%; height: 100%; object-fit: cover; }
    .scanner-target-box { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 180px; height: 110px; pointer-events: none; }
    .scanner-target-box.admin-mode .corner { border-color: #f59e0b; filter: drop-shadow(0 0 4px #f59e0b); }
    .corner { position: absolute; width: 18px; height: 18px; border: 3px solid #10b981; filter: drop-shadow(0 0 4px #10b981); }
    .tl { top: 0; left: 0; border-right: none; border-bottom: none; } .tr { top: 0; right: 0; border-left: none; border-bottom: none; }
    .bl { bottom: 0; left: 0; border-right: none; border-top: none; } .br { bottom: 0; right: 0; border-left: none; border-top: none; }

    .scan-status-overlay { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: #fff; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; border: 1px solid #f59e0b; }
    .camera-floating-controls { position: absolute; right: 12px; top: 12px; }
    .control-circle-btn { padding: 8px 14px; border-radius: 20px; background: rgba(0, 0, 0, 0.6); border: 1px solid rgba(255,255,255,0.2); color: #fff; font-size: 0.75rem; font-weight: bold; cursor: pointer; }
    .control-circle-btn.active { background: #f59e0b; color: #000; border-color: #f59e0b; }

    .items-lower-sheet { flex: 1; background: var(--bg-panels); border-top-left-radius: 24px; border-top-right-radius: 24px; display: flex; flex-direction: column; padding: 18px; overflow: hidden; }
    .sheet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .sheet-price-total { font-size: 1.3rem; font-weight: 800; color: #2563eb; }
    .sheet-scrolled-list { flex: 1; overflow-y: auto; margin-bottom: 12px; }
    
    .sheet-item-row { display: flex; justify-content: space-between; align-items: center; background: var(--bg-cards); padding: 12px 14px; border-radius: 12px; margin-bottom: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .sheet-counter { display: flex; align-items: center; background: rgba(0,0,0,0.03); border-radius: 6px; padding: 2px; border: 1px solid var(--border-color); }
    .sheet-counter button { background: transparent; border: none; width: 24px; height: 24px; font-weight: bold; color: var(--text-main); }
    .sheet-del-btn { background: transparent; border: none; cursor: pointer; }
    .sheet-checkout-btn { width: 100%; background: #2563eb; color: #fff; border: none; padding: 14px; font-size: 1rem; font-weight: 700; border-radius: 12px; cursor: pointer; }
    .sheet-checkout-btn:disabled { opacity: 0.4; pointer-events: none; }

    .input-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
    .input-group label { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
    .admin-input-field { width: 100%; padding: 10px; border-radius: 8px; background: var(--bg-shell); color: var(--text-main); border: 1px solid var(--border-color); font-size: 0.9rem; }
    
    .unit-selector { display: flex; gap: 6px; }
    .unit-selector button { flex: 1; padding: 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-cards); color: var(--text-main); font-weight: 600; cursor: pointer; font-size: 0.8rem; }
    .unit-selector button.selected { background: #f59e0b; color: #000; border-color: #f59e0b; }
    
    .clear-scan-btn { background: transparent; border: none; color: #2563eb; font-weight: 700; cursor: pointer; font-size: 0.85rem; }
    .logout-btn { margin-top: 8px; background: none; border: none; color: #ef4444; width: 100%; cursor: pointer; font-weight: 600; font-size: 0.85rem; }
    .footer { text-align: center; padding: 8px; font-size: 0.75rem; border-top: 1px solid var(--border-color); }
    .footer a { color: #2563eb; text-decoration: none; }
    
    /* MODAL DE CONFIRMATION DESIGN */
    .receipt-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.75); display: flex; justify-content: center; align-items: center; z-index: 9999; padding: 20px; }
    .receipt-modal-card { background: var(--bg-cards); padding: 24px; border-radius: 16px; width: 100%; max-width: 360px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.3); border: 1px solid var(--border-color); }
    .modal-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
    .download-pdf-btn { background: #10b981; color: white; padding: 12px; border: none; border-radius: 10px; font-weight: bold; font-size: 0.95rem; cursor: pointer; }
    .close-modal-btn { background: transparent; color: var(--text-muted); padding: 10px; border: 1px solid var(--border-color); border-radius: 10px; cursor: pointer; font-size: 0.9rem; }

    .no-print { display: block; }
  `]
})
export class AppComponent implements AfterViewInit {
  readonly cartService = inject(CartService);
  readonly activeTab = signal<'caisse' | 'historique' | 'admin'>('caisse');
  readonly isDarkMode = signal<boolean>(false);
  readonly isFlashOn = signal<boolean>(false);
  
  readonly isAdminAuthenticated = signal<boolean>(false);
  passwordInput = '';

  adminBarcode = '';
  adminName = '';
  adminPrice: number | null = null;
  adminUnit = 'U';

  // Gestion de la modal après encaissement
  showReceiptModal = false;
  lastReceiptItems: any[] = [];
  lastReceiptTotal = 0;
  currentInvoiceId = '';
  currentPrintDate = new Date();

  @ViewChild('previewVideo') previewVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('adminVideo') adminVideo!: ElementRef<HTMLVideoElement>;
  
  private codeReader = new BrowserMultiFormatReader();
  private videoTrack: MediaStreamTrack | null = null;

  constructor() {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    this.codeReader.hints = hints;

    effect(() => {
      const tab = this.activeTab();
      this.stopCamera(); 
      
      setTimeout(() => {
        if (tab === 'caisse' && !this.showReceiptModal) {
          this.startScannerCamera(this.previewVideo?.nativeElement, false);
        } else if (tab === 'admin' && this.isAdminAuthenticated()) {
          this.startScannerCamera(this.adminVideo?.nativeElement, true);
        }
      }, 250);
    });
  }

  ngAfterViewInit(): void {
    this.ensureCameraOnLaunch();
  }

  ensureCameraOnLaunch(): void {
    if (this.activeTab() === 'caisse') {
      this.startScannerCamera(this.previewVideo?.nativeElement, false);
    }
  }

  toggleTheme(): void {
    this.isDarkMode.set(!this.isDarkMode());
  }

  setActiveTab(tabName: 'caisse' | 'historique' | 'admin'): void {
    this.activeTab.set(tabName);
  }

  verifyPassword(): void {
    if (this.passwordInput === '2026') {
      this.isAdminAuthenticated.set(true);
      this.passwordInput = '';
      setTimeout(() => this.startScannerCamera(this.adminVideo?.nativeElement, true), 100);
    }
  }

  logoutAdmin(): void {
    this.isAdminAuthenticated.set(false);
    this.setActiveTab('caisse');
  }

  async startScannerCamera(videoElement: HTMLVideoElement, isAdminMode: boolean): Promise<void> {
    if (!videoElement) return;
    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      };

      await this.codeReader.decodeFromConstraints(
        constraints,
        videoElement,
        (result) => {
          if (result) {
            const decodedText = result.getText().trim();
            if (isAdminMode) {
              this.adminBarcode = decodedText;
            } else {
              this.cartService.scanProduct(decodedText);
            }
          }
        }
      );

      const stream = videoElement.srcObject as MediaStream;
      if (stream) {
        this.videoTrack = stream.getVideoTracks()[0];
      }
    } catch (err) {
      console.error("Erreur d'accès caméra :", err);
    }
  }

  async toggleFlash(): Promise<void> {
    if (!this.videoTrack) return;
    try {
      const nextFlashState = !this.isFlashOn();
      const capabilities = this.videoTrack.getCapabilities() as any;
      if (capabilities.torch) {
        await this.videoTrack.applyConstraints({ advanced: [{ torch: nextFlashState }] } as any);
        this.isFlashOn.set(nextFlashState);
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
      price: this.adminPrice,
      unit: this.adminUnit
    });
    
    this.adminBarcode = ''; 
    this.adminName = ''; 
    this.adminPrice = null;
    this.adminUnit = 'U';
  }

  // 1. Déclencheur à la validation : sauvegarde des données et ouverture de l'option PDF
  checkout(): void {
    this.lastReceiptItems = [...this.cartService.cartItems()];
    this.lastReceiptTotal = this.cartService.subtotal();
    this.currentPrintDate = new Date();
    this.currentInvoiceId = 'INV-' + Math.floor(100000 + Math.random() * 900000);

    const sale = this.cartService.checkout();
    if (sale) {
      this.stopCamera(); // Coupe le flux caméra
      this.showReceiptModal = true; // Affiche l'écran de téléchargement
    }
  }

  // 2. GÉNÉRATEUR DE TICKET PDF PROPRE (Format Ticket Thermique 80mm)
  generateReceiptPDF(): void {
    // Largeur fixe standard de 80mm, hauteur proportionnelle au nombre d'articles
    const baseHeight = 90; 
    const dynamicHeight = baseHeight + (this.lastReceiptItems.length * 8);
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, dynamicHeight]
    });

    doc.setFont('Courier', 'bold');
    
    // Header
    doc.setFontSize(14);
    doc.text('WEUZ.SHOP', 40, 10, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('Courier', 'normal');
    doc.text('Vêtements Homme & Accessoires', 40, 14, { align: 'center' });
    doc.text('📍 Sacré-Cœur 3, Dakar', 40, 18, { align: 'center' });
    doc.text('📞 Tel: +221 77 123 45 67', 40, 22, { align: 'center' });
    
    doc.text('-------------------------------------------', 40, 26, { align: 'center' });
    
    // Métadonnées
    const dateStr = this.currentPrintDate.toLocaleDateString('fr-FR') + ' ' + this.currentPrintDate.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
    doc.text(`Date : ${dateStr}`, 6, 31);
    doc.text(`Ticket N° : ${this.currentInvoiceId}`, 6, 35);
    
    doc.text('-------------------------------------------', 40, 40, { align: 'center' });
    
    // En-tête Tableau
    doc.setFont('Courier', 'bold');
    doc.text('PRODUIT', 6, 45);
    doc.text('QTE', 46, 45);
    doc.text('PRIX', 74, 45, { align: 'right' });
    doc.text('-------------------------------------------', 40, 48, { align: 'center' });

    // Articles dynamiques
    doc.setFont('Courier', 'normal');
    let currentY = 53;
    
    this.lastReceiptItems.forEach((item) => {
      const unitLabel = item.unit && item.unit !== 'U' ? ` (${item.unit})` : '';
      let displayName = item.name + unitLabel;
      
      // Tronquer le nom s'il est trop long pour le ticket de 80mm
      if (displayName.length > 20) displayName = displayName.substring(0, 18) + '..';

      doc.text(displayName, 6, currentY);
      doc.text(`x${item.quantity}`, 47, currentY);
      doc.text(`${item.price * item.quantity} F`, 74, currentY, { align: 'right' });
      currentY += 7;
    });

    doc.text('-------------------------------------------', 40, currentY, { align: 'center' });
    currentY += 5;

    // Total Récapitulatif
    doc.setFont('Courier', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL PAYÉ', 6, currentY);
    doc.text(`${this.lastReceiptTotal} FCFA`, 74, currentY, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setFont('Courier', 'normal');
    currentY += 6;
    doc.text('-------------------------------------------', 40, currentY, { align: 'center' });
    
    // Footer
    currentY += 5;
    doc.text('Merci pour votre confiance ! À bientôt.', 40, currentY, { align: 'center' });
    currentY += 4;
    doc.text('Suivez-nous sur Weuz.Shop ✨', 40, currentY, { align: 'center' });

    // Sauvegarde & Téléchargement instantané
    doc.save(`Ticket_${this.currentInvoiceId}.pdf`);
    
    this.closeReceiptModal();
  }

  closeReceiptModal(): void {
    this.showReceiptModal = false;
    this.cartService.clearCart();
    this.ensureCameraOnLaunch(); // Relance le scanner de caisse
  }
}