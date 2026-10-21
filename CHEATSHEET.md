# GraphQL + Apollo + DataLoader Cheat Sheet

Quick reference for common patterns and concepts.

---

## GraphQL Basics

### Schema Types

```graphql
# Scalar types
String    # Text
Int       # Integer numbers
Float     # Decimal numbers
Boolean   # true/false
ID        # Unique identifier

# Custom scalars
scalar DateTime

# Object type
type Product {
  id: ID!           # ! = required
  name: String!
  price: Float
  tags: [String!]!  # Array of strings
}

# Enum
enum Status {
  ACTIVE
  INACTIVE
}

# Input (for mutations)
input ProductInput {
  name: String!
  price: Float!
}
```

### Queries

```graphql
type Query {
  # Simple query
  product(id: ID!): Product
  
  # With default values
  products(limit: Int = 10): [Product!]!
  
  # Multiple arguments
  search(query: String!, category: String): [Product!]!
}
```

### Example Queries

```graphql
# Simple query
{
  product(id: "123") {
    name
  }
}

# With alias
{
  p1: product(id: "123") { name }
  p2: product(id: "456") { name }
}

# With variables
query GetProduct($id: ID!) {
  product(id: $id) {
    name
  }
}
# Variables: { "id": "123" }

# With fragments
fragment ProductInfo on Product {
  id
  name
  price
}

{
  product(id: "123") {
    ...ProductInfo
  }
}
```

---

## NestJS + Apollo Setup

### Module Configuration

```typescript
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: ['./src/schema.gql'],
      path: '/graphql',
      playground: true,
      introspection: true,
      context: ({ req }) => ({ req }),
    }),
  ],
})
export class AppModule {}
```

---

## Resolvers

### Query Resolver

```typescript
import { Query, Args, Resolver } from '@nestjs/graphql';

@Resolver('Query')
export class ProductResolver {
  @Query('product')
  getProduct(@Args('id') id: string) {
    return { id, name: 'Widget' };
  }
  
  @Query('products')
  getProducts(@Args('limit') limit: number = 10) {
    return [];
  }
}
```

### Field Resolver

```typescript
import { ResolveField, Parent, Resolver } from '@nestjs/graphql';

@Resolver('Order')
export class OrderResolver {
  @ResolveField('total')
  calculateTotal(@Parent() order: any) {
    // @Parent() gives you the parent Order object
    return order.items.reduce((sum, item) => sum + item.price, 0);
  }
}
```

### Context Usage

```typescript
import { Context, Resolver } from '@nestjs/graphql';

@Resolver('User')
export class UserResolver {
  @Query('me')
  getCurrentUser(@Context() context: any) {
    // Access request context
    return context.req.user;
  }
}
```

---

## DataLoader Pattern

### Problem: N+1 Queries

```typescript
// ❌ BAD: N+1 problem
@ResolveField('product')
async getProduct(@Parent() item: any) {
  // Called once per item
  return this.productService.findById(item.productId);
}

// If order has 10 items → 10 database queries!
```

### Solution: DataLoader

```typescript
// ✅ GOOD: Batched with DataLoader

// 1. Create DataLoader service
@Injectable()
export class DataLoaders {
  constructor(private readonly productService: ProductService) {}
  
  create() {
    return {
      productById: new DataLoader<string, Product>(async (ids) => {
        // Called once with all IDs
        const uniqueIds = [...new Set(ids)];
        const products = await this.productService.findByIds(uniqueIds);
        
        // Map results to maintain order
        const byId = new Map(products.map(p => [p.id, p]));
        return ids.map(id => byId.get(id) ?? null);
      }),
    };
  }
}

// 2. Use in resolver
@Resolver('OrderItem')
export class OrderItemResolver {
  constructor(private readonly loaders: DataLoaders) {}
  
  @ResolveField('product')
  getProduct(@Parent() item: any, @Context() context: any) {
    // Create request-scoped loaders
    context.loaders ??= this.loaders.create();
    
    // Load via DataLoader (batches automatically)
    return context.loaders.productById.load(item.productId);
  }
}

// If order has 10 items → 1 database query! ✅
```

### DataLoader Key Points

```typescript
// ✅ DO: Return results in same order as input
return ids.map(id => byId.get(id) ?? null);

// ✅ DO: Create new loader per request
context.loaders = this.loaders.create();

// ✅ DO: Deduplicate IDs
const uniqueIds = [...new Set(ids)];

// ❌ DON'T: Share loaders across requests
// (causes data leakage!)

// ❌ DON'T: Return results in wrong order
// (DataLoader will throw error)
```

---

## Caching with Redis

### Setup

```typescript
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }
  
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async set(key: string, value: any, ttlSeconds: number) {
    await this.redis.set(
      key,
      JSON.stringify(value),
      'EX',
      ttlSeconds
    );
  }
}
```

### Usage

```typescript
@Injectable()
export class AuraService {
  constructor(private readonly cache: CacheService) {}
  
  async getExpensiveData(id: string) {
    const key = `data:${id}`;
    
    // Check cache first
    const cached = await this.cache.get(key);
    if (cached) return cached;
    
    // Cache miss - fetch data
    const data = await this.fetchFromAPI(id);
    
    // Store in cache (60 seconds)
    await this.cache.set(key, data, 60);
    
    return data;
  }
}
```

---

## Common Patterns

### Pagination

```graphql
type Query {
  products(
    first: Int!
    after: String
  ): ProductConnection!
}

type ProductConnection {
  edges: [ProductEdge!]!
  pageInfo: PageInfo!
}

type ProductEdge {
  node: Product!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}
```

### Error Handling

```typescript
import { GraphQLError } from 'graphql';

@Query('product')
async getProduct(@Args('id') id: string) {
  const product = await this.service.findById(id);
  
  if (!product) {
    throw new GraphQLError('Product not found', {
      extensions: {
        code: 'PRODUCT_NOT_FOUND',
        productId: id,
      },
    });
  }
  
  return product;
}
```

### Authentication

```typescript
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

@Resolver('Query')
export class SecureResolver {
  @Query('me')
  @UseGuards(AuthGuard)
  getCurrentUser(@Context() context: any) {
    return context.req.user;
  }
}
```

---

## Performance Tips

### 1. Use DataLoader for N+1

```typescript
// ❌ BAD
for (let item of items) {
  item.product = await getProduct(item.productId);
}

// ✅ GOOD
const products = await Promise.all(
  items.map(item => loader.load(item.productId))
);
```

### 2. Cache Expensive Operations

```typescript
// ✅ Cache AI/ML results
const key = `ai:prediction:${orderId}`;
const cached = await cache.get(key);
if (cached) return cached;

const result = await callAIService(orderId);
await cache.set(key, result, 300); // 5 min
return result;
```

### 3. Field-Level Resolution

```graphql
# Only fetch what's needed
query {
  product(id: "123") {
    name  # Only name resolver executes
  }
}

# vs

query {
  product(id: "123") {
    name
    reviews {  # Reviews resolver also executes
      text
    }
  }
}
```

### 4. Batching Strategies

```typescript
// Strategy 1: Max batch size
const loader = new DataLoader(batchFn, {
  maxBatchSize: 100  // Limit batch to 100 items
});

// Strategy 2: Batch time window
const loader = new DataLoader(batchFn, {
  batchScheduleFn: (callback) => setTimeout(callback, 10)
});

// Strategy 3: Disable caching (if using Redis)
const loader = new DataLoader(batchFn, {
  cache: false  // Use external cache instead
});
```

---

## Debugging

### Enable Query Logging

```typescript
GraphQLModule.forRoot({
  // ...
  plugins: [
    {
      requestDidStart() {
        console.log('Request started');
        return {
          didResolveOperation(ctx) {
            console.log('Operation:', ctx.operationName);
          },
          executionDidStart() {
            console.log('Execution started');
          },
        };
      },
    },
  ],
})
```

### Log Resolver Execution

```typescript
@Query('product')
async getProduct(@Args('id') id: string) {
  console.log(`Fetching product: ${id}`);
  const result = await this.service.findById(id);
  console.log(`Product fetched:`, result);
  return result;
}
```

### Inspect DataLoader Batches

```typescript
productById: new DataLoader(async (ids) => {
  console.log('🔄 Batch:', ids);
  console.log('📦 Unique:', [...new Set(ids)]);
  // ...
})
```

---

## Quick Commands

```bash
# Start services
docker compose up --build

# Stop services
docker compose down

# View logs
docker compose logs -f gateway

# Rebuild single service
docker compose up --build gateway

# Clean up volumes
docker compose down -v

# Check health
curl http://localhost:4000/health
curl http://localhost:4101/health
```

---

## GraphQL Playground Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl/Cmd + Enter` | Run query |
| `Ctrl/Cmd + Space` | Autocomplete |
| `Ctrl/Cmd + Shift + P` | Prettify query |
| Click "Docs" | View schema |
| Click "Schema" | View SDL |

---

## Common Errors

### 1. Field Resolver Not Called

**Problem:**
```typescript
@ResolveField('total')
calculateTotal() { ... }
```

Query doesn't request `total` → Resolver never executes!

**Solution:** Request the field in your query.

### 2. DataLoader Wrong Order

**Problem:**
```typescript
return products;  // ❌ Wrong order
```

**Solution:**
```typescript
return ids.map(id => byId.get(id));  // ✅ Correct order
```

### 3. Cross-Request Cache Leakage

**Problem:**
```typescript
// ❌ Shared across requests
const loader = new DataLoader(batchFn);
```

**Solution:**
```typescript
// ✅ Request-scoped
context.loaders ??= this.loaders.create();
```

---

## Resources

- **GraphQL Spec:** https://spec.graphql.org/
- **Apollo Docs:** https://www.apollographql.com/docs/
- **DataLoader:** https://github.com/graphql/dataloader
- **NestJS GraphQL:** https://docs.nestjs.com/graphql/quick-start

---

**Quick Reference:** Keep this handy while coding! 📚
