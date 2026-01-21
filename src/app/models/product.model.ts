export interface ProductVariation {
  id: string;
  productId: string;
  label: string;
  sku?: string;
  stockType?: string;
  initialQuantity?: number | null;
  metadata?: Record<string, unknown>;
  metadataValues?: string[];
  soldQuantity?: number;
  remainingQuantity?: number | null;
  createdAt?: string;
  updatedAt?: string;
  displayLabel: string;
}

export interface ProductAvailability {
  id: string;
  label: string;
  title?: string;
  price: number;
  currency?: string;
  description?: string;
  productId?: string;
  variationId?: string | null;
  remainingQuantity?: number | null;
  initialQuantity?: number | null;
  maxPerPurchase?: number | null;
  status?: string;
  releaseAt?: string | null;
  closeAt?: string | null;
  channel?: string;
  soldQuantity?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  eventId?: number;
  name: string;
  description?: string;
  sku?: string;
  imageUrl?: string;
  tags?: string[];
  isActive?: boolean;
  basePrice?: number;
  metadata?: Record<string, unknown>;
  variations?: ProductVariation[];
  availabilities?: ProductAvailability[];
  createdAt?: string;
  updatedAt?: string;
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
