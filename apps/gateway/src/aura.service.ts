import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CacheService } from './cache.service';

@Injectable()
export class AuraService {
  private readonly ordersUrl = process.env.ORDERS_URL ?? 'http://localhost:4101';
  private readonly productsUrl = process.env.PRODUCTS_URL ?? 'http://localhost:4102';
  private readonly aiUrl = process.env.AI_LENS_URL ?? 'http://localhost:4103';
  private readonly aiTtl = Number(process.env.AI_CACHE_TTL_SECONDS ?? 60);

  constructor(private readonly http: HttpService, private readonly cache: CacheService) {}

  private async get<T>(url: string): Promise<T> {
    try {
      const response = await firstValueFrom(this.http.get<T>(url));
      return response.data;
    } catch (err) {
      throw new ServiceUnavailableException(`Downstream request failed: ${url}`);
    }
  }

  async getProduct(id: string) {
    return this.get<any>(`${this.productsUrl}/products/${encodeURIComponent(id)}`);
  }

  async searchProducts(query: string, limit: number) {
    return this.get<any[]>(`${this.productsUrl}/products?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async getProductsByIds(ids: readonly string[]) {
    if (!ids.length) return [];
    return this.get<any[]>(`${this.productsUrl}/products/batch?ids=${encodeURIComponent(ids.join(','))}`);
  }

  async getOrder(id: string) {
    return this.get<any>(`${this.ordersUrl}/orders/${encodeURIComponent(id)}`);
  }

  async getProgressSummary(orderId: string): Promise<string> {
    const key = `aura:ai:summary:${orderId}`;
    const cached = await this.cache.get<string>(key);
    if (cached) return cached;
    const result = await this.get<{ summary: string }>(
      `${this.aiUrl}/ai/orders/${encodeURIComponent(orderId)}/summary`,
    );
    await this.cache.set(key, result.summary, this.aiTtl);
    return result.summary;
  }

  async getShippingPrediction(orderId: string) {
    const key = `aura:ai:shipping:${orderId}`;
    const cached = await this.cache.get<any>(key);
    if (cached) return cached;
    const result = await this.get<any>(
      `${this.aiUrl}/ai/orders/${encodeURIComponent(orderId)}/shipping-prediction`,
    );
    await this.cache.set(key, result, this.aiTtl);
    return result;
  }

  async getProductInsight(productId: string, question: string) {
    const result = await this.get<any>(
      `${this.productsUrl}/products/${encodeURIComponent(productId)}/insights?q=${encodeURIComponent(question)}`,
    );
    return result;
  }
}
