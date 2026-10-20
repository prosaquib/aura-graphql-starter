import { Module, Controller, Get, Param, NotFoundException } from '@nestjs/common';

const orders = [
  { id: 'ord-1001', status: 'SHIPPED', estimatedDelivery: '2026-10-14', items: [{ productId: 'prod-1', quantity: 1 }, { productId: 'prod-2', quantity: 2 }] },
  { id: 'ord-1002', status: 'PROCESSING', estimatedDelivery: '2026-10-16', items: [{ productId: 'prod-2', quantity: 1 }, { productId: 'prod-3', quantity: 1 }] },
  { id: 'ord-1003', status: 'DELIVERED', estimatedDelivery: '2026-10-08', items: [{ productId: 'prod-1', quantity: 1 }] }
];

@Controller()
class OrdersController {
  @Get('/health')
  health() { return { status: 'ok', service: 'orders-mock' }; }

  @Get('/orders/:id')
  getOrder(@Param('id') id: string) {
    const order = orders.find((item) => item.id === id);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
@Module({ controllers: [OrdersController] })
export class AppModule {}
