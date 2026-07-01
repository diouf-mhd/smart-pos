import { Injectable, signal, computed } from '@angular/core';

export interface Product {
  barcode: string;
  name: string;
  price: number;
}

export interface CartItem extends Product {
  id: string;
  quantity: number;
}

export interface Sale {
  id: string;
  createdAt: Date;
  items: CartItem[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  // Base de données simulée (Stock initial)
  private readonly productsDB: Product[] = [
    { barcode: '111111', name: 'Nescafé 100g', price: 1500 },
    { barcode: '222222', name: 'Lait Kirène 1L', price: 1000 },
    { barcode: '333333', name: 'Pain de mie', price: 1200 },
    { barcode: '444444', name: 'Eau Aquaterre 10L', price: 1800 }
  ];

  // États réactifs d'Angular (Signals)
  readonly cartItems = signal<CartItem[]>([]);
  readonly salesHistory = signal<Sale[]>([]);

  // Propriétés calculées réactives (Computed)
  readonly totalItems = computed(() => this.cartItems().reduce((acc, item) => acc + item.quantity, 0));
  readonly subtotal = computed(() => this.cartItems().reduce((acc, item) => acc + (item.price * item.quantity), 0));

  constructor() {
    // Charger l'historique du localStorage au démarrage
    const savedHistory = localStorage.getItem('smart_pos_sales');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        // Reconvertir les chaînes de caractères de date en vrais objets Date
        const formatted = parsed.map((sale: any) => ({
          ...sale,
          createdAt: new Date(sale.createdAt)
        }));
        this.salesHistory.set(formatted);
      } catch (e) {
        console.error("Erreur lors de la lecture de l'historique", e);
      }
    }
  }

  // Scanner/Chercher un produit
  scanProduct(barcode: string): Product | null {
    const product = this.productsDB.find(p => p.barcode === barcode);
    if (!product) return null;

    const currentItems = this.cartItems();
    const existingIndex = currentItems.findIndex(item => item.barcode === barcode);

    if (existingIndex > -1) {
      currentItems[existingIndex].quantity += 1;
      this.cartItems.set([...currentItems]);
    } else {
      this.cartItems.set([...currentItems, { 
        ...product, 
        id: 'item-' + Math.random().toString(36).substring(2, 9), 
        quantity: 1 
      }]);
    }
    return product;
  }

  // Retirer une unité ou l'élément du panier
  removeItem(itemId: string): void {
    const currentItems = this.cartItems();
    const updatedItems = currentItems.filter(item => item.id !== itemId);
    this.cartItems.set(updatedItems);
  }

  // Archiver et valider la vente définitivement
  checkout(): Sale | null {
    if (this.cartItems().length === 0) return null;

    const newSale: Sale = {
      id: 'FAC-' + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date(),
      items: [...this.cartItems()],
      total: this.subtotal()
    };

    // Ajouter la vente en haut de l'historique
    const updatedHistory = [newSale, ...this.salesHistory()];
    this.salesHistory.set(updatedHistory);
    localStorage.setItem('smart_pos_sales', JSON.stringify(updatedHistory));

    // Vider le panier
    this.cartItems.set([]);
    return newSale;
  }
}