export interface ProductAvailability {
  id: string;
  label: string;
  price: number;
  currency?: string;
  remainingQuantity?: number;
  maxPerPurchase?: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  tags?: string[];
  isActive?: boolean;
  basePrice?: number;
  availabilities?: ProductAvailability[];
}

export interface ProductPurchaseCustomer {
  fullName: string;
  email: string;
  documentNumber: string;
  phoneNumber?: string;
}

export interface ProductPurchaseRequest {
  availabilityId: string;
  quantity: number;
  customer: ProductPurchaseCustomer;
  notes?: string;
}

export interface ProductPurchaseResponse {
  saleId: string;
  productId: string;
  productName: string;
  availabilityId: string;
  availabilityLabel?: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
  imageUrl?: string;
}

export interface ProductSelection {
  productId: string;
  productName: string;
  availabilityId: string;
  availabilityLabel: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
  maxPerPurchase?: number;
  saleId?: string;
}

export interface ProductSaleReference {
  saleId: string;
}
