import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
    <header class="header">
      <h1>Smart POS</h1>
      <p>Scan, ajoute et valide tes produits rapidement.</p>
    </header>
  `,
  styles: [
    `
      .header {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin-bottom: 1rem;
      }

      h1 {
        margin: 0;
        font-size: 1.5rem;
      }

      p {
        margin: 0;
        color: #64748b;
      }
    `
  ]
})
export class HeaderComponent {}
