export interface Product {
  id: string;
  name: string;
  price: number;
  barcode: string;
  category?: string;
}

export interface CartItem extends Product {
  quantity: number;
}
