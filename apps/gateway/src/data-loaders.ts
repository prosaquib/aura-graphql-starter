import { Injectable } from '@nestjs/common';
import DataLoader from 'dataloader';
import { AuraService } from './aura.service';

@Injectable()
export class DataLoaders {
  constructor(private readonly aura: AuraService) {}

  create() {
    return {
      productById: new DataLoader<string, any>(async (ids) => {
        const uniqueIds = [...new Set(ids)];
        const products = await this.aura.getProductsByIds(uniqueIds);
        const byId = new Map(products.map((p: any) => [p.id, p]));
        // DataLoader requires output length/order to match input keys.
        return ids.map((id) => byId.get(id) ?? null);
      }),
    };
  }
}
