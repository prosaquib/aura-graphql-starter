import { Module, Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';

const products = [
  { id: 'prod-1', name: 'Aura Wireless Headphones', description: 'Wireless over-ear headphones with active noise cancellation and long battery life.', price: { amount: 149.99, currency: 'USD' } },
  { id: 'prod-2', name: 'Aura Smart Speaker', description: 'Compact smart speaker with voice control and room-filling audio.', price: { amount: 89.5, currency: 'USD' } },
  { id: 'prod-3', name: 'Aura Travel Charger', description: 'Multi-port USB-C travel charger with fast charging and safety protection.', price: { amount: 39.0, currency: 'USD' } }
];

@Controller()
class ProductsController {
  @Get('/health')
  health() { return { status: 'ok', service: 'products-mock' }; }

  @Get('/products')
  search(@Query('q') q = '', @Query('limit') limit = '10') {
    const term = q.toLowerCase();
    return products.filter(p => `${p.name} ${p.description}`.toLowerCase().includes(term)).slice(0, Number(limit) || 10);
  }

  @Get('/products/batch')
  batch(@Query('ids') ids = '') {
    const wanted = new Set(ids.split(',').filter(Boolean));
    return products.filter(p => wanted.has(p.id));
  }

  @Get('/products/:id/insights')
  insight(@Param('id') id: string, @Query('q') question = '') {
    const product = products.find(p => p.id === id);
    if (!product) throw new NotFoundException('Product not found');
    return {
      answer: `${product.name}: ${product.description} This is a mock RAG response for the question: "${question}".`,
      sources: [`product-catalog:${id}`, 'mock-product-knowledge-base'],
      mock: true
    };
  }

  @Get('/products/:id')
  getProduct(@Param('id') id: string) {
    const product = products.find(p => p.id === id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
@Module({ controllers: [ProductsController] })
export class AppModule {}
