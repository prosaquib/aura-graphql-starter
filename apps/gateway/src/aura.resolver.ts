import { Args, Context, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AuraService } from './aura.service';
import { DataLoaders } from './data-loaders';

@Resolver('Query')
export class AuraResolver {
  constructor(
    private readonly aura: AuraService,
    private readonly loaders: DataLoaders,
  ) {}

  @Query('product')
  product(@Args('id') id: string) {
    return this.aura.getProduct(id);
  }

  @Query('searchProducts')
  searchProducts(@Args('query') query: string, @Args('limit') limit = 10) {
    return this.aura.searchProducts(query, Math.min(Math.max(limit, 1), 50));
  }

  @Query('order')
  order(@Args('id') id: string) {
    return this.aura.getOrder(id);
  }
}

@Resolver('Order')
export class OrderFieldsResolver {
  constructor(private readonly aura: AuraService) {}

  @ResolveField('progressSummary')
  progressSummary(@Parent() order: any) {
    return this.aura.getProgressSummary(order.id);
  }

  @ResolveField('shippingPrediction')
  shippingPrediction(@Parent() order: any) {
    return this.aura.getShippingPrediction(order.id);
  }
}

@Resolver('OrderItem')
export class OrderItemResolver {
  constructor(private readonly loaders: DataLoaders) {}

  @ResolveField('product')
  product(@Parent() item: { productId: string }, @Context() context: any) {
    // One loader instance per request, created by DataLoaders.
    // Request-local loader avoids cross-user data leakage.
    context.loaders ??= this.loaders.create();
    return context.loaders.productById.load(item.productId);
  }
}

@Resolver('Product')
export class ProductFieldsResolver {
  constructor(private readonly aura: AuraService) {}

  @ResolveField('ragInsights')
  ragInsights(@Parent() product: any, @Args('question') question: string) {
    return this.aura.getProductInsight(product.id, question);
  }
}
