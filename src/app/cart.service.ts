import { Injectable, signal, computed } from '@angular/core';

// 1. On définit la structure d'un produit
export interface Product {
  id: string;    // Le code-barres (ex: '111111')
  name: string;  // Le nom de l'article
  price: number; // Le prix en FCFA
}

export interface CartItem extends Product {
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  // 2. LE CATALOGUE DU CLIENT : C'est ici que tu mets les produits qu'il te donne !
  private productCatalog: Product[] = [
    { id: '6043000034907', name: 'creme de peau Happy family', price: 1500 },
    { id: '6987000861005', name: 'Cahier 100 pages', price: 250 },
    { id: '333333', name: 'Café Touba Sac', price: 1000 },
    { id: '444444', name: 'Lait en poudre Presto', price: 2500 },
    // Quand ton client te donne sa liste, tu as juste à ajouter des lignes ici :
    // { id: 'CODE_BARRE_DU_PRODUIT', name: 'NOM_DU_PRODUIT', price: PRIX_FCFA }
  ];

  // Les Signals pour la gestion d'état Angular
  readonly cartItems = signal<CartItem[]>([]);
  readonly salesHistory = signal<any[]>([]);

  // Calculs automatiques du total
  readonly totalItems = computed(() => this.cartItems().reduce((acc, item) => acc + item.quantity, 0));
  readonly subtotal = computed(() => this.cartItems().reduce((acc, item) => acc + (item.price * item.quantity), 0));

  // Fonction appelée par ton composant lors d'un scan caméra ou douchette
  scanProduct(barcode: string): Product | null {
    // On cherche le code-barres dans le catalogue du client
    const product = this.productCatalog.find(p => p.id === barcode);

    if (product) {
      // Si le produit existe, on l'ajoute ou on augmente la quantité dans le panier
      this.cartItems.update(items => {
        const existing = items.find(i => i.id === product.id);
        if (existing) {
          return items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
        }
        return [...items, { ...product, quantity: 1 }];
      });
      return product;
    }

    // Si le code n'est pas dans le catalogue
    return null;
  }

  removeItem(id: string) {
    this.cartItems.update(items => items.filter(i => i.id !== id));
  }

  checkout() {
    if (this.cartItems().length === 0) return null;

    const newSale = {
      id: 'FAC-' + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date(),
      items: [...this.cartItems()],
      total: this.subtotal()
    };

    this.salesHistory.update(history => [newSale, ...history]);
    
    // On ne vide pas tout de suite le panier ici pour pouvoir l'imprimer juste après !
    return newSale;
  }
  
  clearCart() {
    this.cartItems.set([]);
  }
}