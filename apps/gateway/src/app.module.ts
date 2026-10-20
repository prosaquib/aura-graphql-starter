import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AuraResolver, OrderFieldsResolver, OrderItemResolver, ProductFieldsResolver } from './aura.resolver';
import { AuraService } from './aura.service';
import { DataLoaders } from './data-loaders';
import { CacheService } from './cache.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    HttpModule.register({ timeout: 2500, maxRedirects: 2 }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: ['./src/schema.gql'],
      path: '/graphql',
      playground: process.env.NODE_ENV !== 'production',
      sortSchema: true,
      introspection: true,
      context: ({ req }: { req: Request }) => ({ req, loaders: undefined }),
    }),
  ],
  controllers: [HealthController],
  providers: [AuraResolver, OrderFieldsResolver, OrderItemResolver, ProductFieldsResolver, AuraService, DataLoaders, CacheService],
})
export class AppModule {}
