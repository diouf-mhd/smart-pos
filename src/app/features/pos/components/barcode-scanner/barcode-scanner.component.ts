import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-barcode-scanner',
  standalone: true,
  template: `
    <section class="scanner-card">
      <h2>Scanner un code-barres</h2>
      <p>Entrez un code-barres pour simuler un scan.</p>
      <div class="scanner-actions">
        <input
          type="text"
          placeholder="Code-barres"
          #barcodeInput
          (keyup.enter)="scan(barcodeInput.value)"
        />
        <button type="button" (click)="scan(barcodeInput.value)">Scanner</button>
      </div>
    </section>
  `,
  styles: [
    `
      .scanner-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 1rem;
        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
      }

      h2 {
        margin: 0 0 0.25rem;
        font-size: 1.1rem;
      }

      p {
        margin: 0 0 0.75rem;
        color: #64748b;
      }

      .scanner-actions {
        display: flex;
        gap: 0.5rem;
      }

      input {
        flex: 1;
        padding: 0.7rem 0.8rem;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
      }

      button {
        border: 0;
        border-radius: 8px;
        background: #2563eb;
        color: #fff;
        padding: 0.7rem 1rem;
        cursor: pointer;
      }
    `
  ]
})
export class BarcodeScannerComponent {
  @Output() scanned = new EventEmitter<string>();

  scan(value: string): void {
    const barcode = value.trim();
    if (!barcode) {
      return;
    }

    this.scanned.emit(barcode);
  }
}
