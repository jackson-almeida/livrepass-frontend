import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../config/environment';
import {
  Product,
  ProductPurchaseRequest,
  ProductPurchaseResponse,
} from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/$/, '');

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}/products`);
  }

  getProduct(productId: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/products/${productId}`);
  }

  createPublicPurchase(payload: ProductPurchaseRequest): Observable<ProductPurchaseResponse> {
    return this.http.post<ProductPurchaseResponse>(`${this.baseUrl}/products/purchases`, payload);
  }
}
