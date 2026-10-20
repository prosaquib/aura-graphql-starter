import { Module, Controller, Get, Param } from '@nestjs/common';

const orderSignals: Record<string, { status: string; date: string }> = {
  'ord-1001': { status: 'SHIPPED', date: '2026-10-14' },
  'ord-1002': { status: 'PROCESSING', date: '2026-10-16' },
  'ord-1003': { status: 'DELIVERED', date: '2026-10-08' }
};

@Controller()
class AiLensController {
  @Get('/health')
  health() { return { status: 'ok', service: 'ai-lens-mock' }; }

  @Get('/ai/orders/:id/summary')
  summary(@Param('id') id: string) {
    const order = orderSignals[id];
    if (!order) return { summary: 'No mock order signals are available for this order.' };
    const summaries: Record<string, string> = {
      SHIPPED: `Order ${id} has shipped and is currently in transit. The mock estimated delivery date is ${order.date}.`,
      PROCESSING: `Order ${id} is being processed and has not yet shipped. The mock estimated delivery date is ${order.date}.`,
      DELIVERED: `Order ${id} is marked delivered. The mock delivery date was ${order.date}.`
    };
    return { summary: summaries[order.status] ?? `Order ${id} status is ${order.status}.` };
  }

  @Get('/ai/orders/:id/shipping-prediction')
  prediction(@Param('id') id: string) {
    const order = orderSignals[id];
    const delayed = id === 'ord-1002';
    return {
      delayLikely: delayed,
      estimatedDelayDays: delayed ? 1 : 0,
      explanation: delayed
        ? 'Mock prediction: processing has not completed, so a one-day delay is possible. This is not a carrier-confirmed estimate.'
        : 'Mock prediction: no delay signal is present in the sample data. This is not a carrier-confirmed estimate.',
      generatedAt: new Date().toISOString(),
      mock: true
    };
  }
}
@Module({ controllers: [AiLensController] })
export class AppModule {}
