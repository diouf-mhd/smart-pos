import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
  // Initialisation du client Supabase avec tes identifiants cloud
  private supabase: SupabaseClient = createClient(
    'https://oyiiwzbmmsewjwrzjfpd.supabase.co',
    'sb_publishable_uJnDx-se2jUqGkht6_Rh2A_Vcfddy8D'
  );

  // Le catalogue dynamique : chargé depuis Supabase au lieu d'être écrit en dur
  readonly productsList = signal<Product[]>([]);

  // Les Signals pour la gestion d'état du panier et des ventes
  readonly cartItems = signal<CartItem[]>([]);
  readonly salesHistory = signal<any[]>([]);

  // Calculs automatiques du total (Tes computed optimisés restent inchangés)
  readonly totalItems = computed(() => this.cartItems().reduce((acc, item) => acc + item.quantity, 0));
  readonly subtotal = computed(() => this.cartItems().reduce((acc, item) => acc + (item.price * item.quantity), 0));

  constructor() {
    // Au démarrage de l'application, on télécharge le catalogue depuis le cloud
    this.fetchProductsFromSupabase();
  }

  // 1. Charger dynamiquement les produits depuis Supabase
  async fetchProductsFromSupabase(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select('id, name, price');

      if (error) throw error;

      if (data) {
        this.productsList.set(data as Product[]);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des produits Supabase:', err);
    }
  }

  // 2. Ajouter ou mettre à jour un produit dans Supabase (Action appelée par ta page Admin)
  async saveProductToSupabase(newProduct: Product): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('products')
        .upsert({ 
          id: newProduct.id, 
          name: newProduct.name, 
          price: newProduct.price 
        });

      if (error) throw error;

      // On rafraîchit immédiatement la liste locale pour que la caisse soit au courant du nouveau produit
      await this.fetchProductsFromSupabase();
      return true;
    } catch (err) {
      console.error("Erreur d'enregistrement Supabase :", err);
      return false;
    }
  }

  // 3. Fonction appelée lors d'un scan caméra ou douchette à la caisse
  scanProduct(barcode: string): Product | null {
    // On cherche maintenant le code-barres dans la liste dynamique de Supabase
    const product = this.productsList().find(p => p.id === barcode);

    if (product) {
      this.cartItems.update(items => {
        const existing = items.find(i => i.id === product.id);
        if (existing) {
          return items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
        }
        return [...items, { ...product, quantity: 1 }];
      });
      return product;
    }

    // Si le code n'est pas encore enregistré dans Supabase
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
    
    // On ne vide pas tout de suite pour permettre l'impression du reçu
    return newSale;
  }
  
  clearCart() {
    this.cartItems.set([]);
  }
}