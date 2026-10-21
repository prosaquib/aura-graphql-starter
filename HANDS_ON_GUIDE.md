# Hands-On Testing Guide

**See GraphQL, Apollo, and DataLoader in Action!**

---

## Quick Start

### 1. Start the Services

```bash
cd ~/Projects/aura-graphql-starter
docker compose up --build
```

Wait for all services to be healthy (~30 seconds):

```
✓ gateway  healthy
✓ orders   healthy
✓ products healthy
✓ ai-lens  healthy
✓ redis    healthy
```

### 2. Open GraphQL Playground

Open your browser: **http://localhost:4000/graphql**

---

## Test 1: Simple Query (No DataLoader)

### Query: Fetch a Product

```graphql
query SimpleProduct {
  product(id: "prod-123") {
    id
    name
    description
    price {
      amount
      currency
    }
  }
}
```

### What Happens:

```
1. Apollo Server validates query
2. Executes AuraResolver.product()
3. Calls Products service: GET /products/prod-123
4. Returns product data
```

**Request count:** 1 ✅

---

## Test 2: N+1 Problem Solved by DataLoader

### Query: Order with Products

```graphql
query OrderWithProducts {
  order(id: "ord-1001") {
    id
    status
    items {
      productId
      quantity
      product {
        id
        name
        price {
          amount
          currency
        }
      }
    }
  }
}
```

### What Happens (Step-by-Step):

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Fetch Order                                         │
└─────────────────────────────────────────────────────────────┘

Resolver: AuraResolver.order("ord-1001")
HTTP: GET http://orders:4101/orders/ord-1001

Response:
{
  "id": "ord-1001",
  "status": "SHIPPED",
  "items": [
    { "productId": "prod-123", "quantity": 2 },
    { "productId": "prod-456", "quantity": 1 },
    { "productId": "prod-789", "quantity": 3 }
  ]
}

▼

┌─────────────────────────────────────────────────────────────┐
│ Step 2: Resolve OrderItem.product (DataLoader Magic!)      │
└─────────────────────────────────────────────────────────────┘

For each item, Apollo calls OrderItemResolver.product()

Item 1: loader.load("prod-123")  → QUEUED
Item 2: loader.load("prod-456")  → QUEUED
Item 3: loader.load("prod-789")  → QUEUED

DataLoader batches all 3 requests:
  Unique IDs: ["prod-123", "prod-456", "prod-789"]
  
  HTTP: GET /products/batch?ids=prod-123,prod-456,prod-789
  
  Single request fetches all 3 products! ✅

▼

┌─────────────────────────────────────────────────────────────┐
│ Step 3: Apollo Assembles Response                           │
└─────────────────────────────────────────────────────────────┘

Returns complete nested structure with all products
```

**Request count:** 2 (1 order + 1 batched products) ✅

**Without DataLoader:** 4 requests (1 order + 3 individual products) ❌

**Savings:** 50% fewer requests!

---

## Test 3: DataLoader Deduplication

### Query: Order with Duplicate Products

```graphql
query OrderWithDuplicates {
  order(id: "ord-1002") {
    id
    items {
      productId
      product {
        name
      }
    }
  }
}
```

**Mock order "ord-1002" has duplicate products:**
```json
{
  "items": [
    { "productId": "prod-123", "quantity": 2 },
    { "productId": "prod-123", "quantity": 1 },  // DUPLICATE
    { "productId": "prod-456", "quantity": 3 },
    { "productId": "prod-123", "quantity": 5 }   // DUPLICATE
  ]
}
```

### What DataLoader Does:

```
Loader receives:
  ["prod-123", "prod-123", "prod-456", "prod-123"]

Deduplicates to:
  ["prod-123", "prod-456"]

Fetches only 2 products! ✅

Returns 4 results:
  [Product{123}, Product{123}, Product{456}, Product{123}]
  
  Same product instance reused! (memory efficient)
```

**Request count:** 2 (1 order + 1 batched products for 2 unique IDs)

**Without DataLoader:** 5 requests ❌

**Savings:** 60% fewer requests!

---

## Test 4: Redis Caching (AI Predictions)

### First Request: Cache Miss

```graphql
query ShippingPredictionFirstTime {
  order(id: "ord-1001") {
    id
    shippingPrediction {
      delayLikely
      estimatedDelayDays
      explanation
      generatedAt
    }
  }
}
```

**What happens:**

```
1. Check Redis: GET aura:ai:shipping:ord-1001
   → Cache miss (null)
   
2. Call AI Lens service:
   GET http://ai-lens:4103/ai/orders/ord-1001/shipping-prediction
   
3. Store in Redis:
   SET aura:ai:shipping:ord-1001 "{...}" EX 60
   
4. Return result

Request count: 2 (order + AI prediction)
Response time: ~200ms
```

### Second Request (Within 60 Seconds): Cache Hit

```graphql
query ShippingPredictionCached {
  order(id: "ord-1001") {
    id
    shippingPrediction {
      delayLikely
      explanation
    }
  }
}
```

**What happens:**

```
1. Check Redis: GET aura:ai:shipping:ord-1001
   → Cache hit! ✅
   
2. Return cached result (no AI service call)

Request count: 1 (order only)
Response time: ~5ms
```

**Savings:** 
- 1 fewer downstream call
- 97.5% faster response time!

---

## Test 5: Field-Level Granularity

### Query: Only Order Status (No Nested Data)

```graphql
query OnlyStatus {
  order(id: "ord-1001") {
    id
    status
  }
}
```

**What happens:**

```
1. Fetch order: GET /orders/ord-1001
2. Return { id, status }

NO calls to:
  - Products service (items.product not requested)
  - AI Lens service (shippingPrediction not requested)
  
Request count: 1
```

### Query: With Nested Data

```graphql
query WithNestedData {
  order(id: "ord-1001") {
    id
    status
    items {
      product {
        name
      }
    }
    shippingPrediction {
      delayLikely
    }
  }
}
```

**What happens:**

```
1. Fetch order
2. Fetch products (DataLoader batched)
3. Fetch shipping prediction (Redis cached)

Request count: 3 (or 2 if cached)
```

**Key Point:** GraphQL only fetches what you ask for!

---

## Test 6: Complex Nested Query

### Query: Everything!

```graphql
query CompleteOrder {
  order(id: "ord-1001") {
    id
    status
    estimatedDelivery
    
    # Nested items with products
    items {
      productId
      quantity
      product {
        id
        name
        description
        price {
          amount
          currency
        }
        
        # RAG insights for each product
        ragInsights(question: "What are the key features?") {
          answer
          sources
          mock
        }
      }
    }
    
    # AI summary
    progressSummary
    
    # Shipping prediction
    shippingPrediction {
      delayLikely
      estimatedDelayDays
      explanation
      generatedAt
      mock
    }
  }
}
```

### Request Breakdown:

```
1. GET /orders/ord-1001
   → Order with items

2. GET /products/batch?ids=...
   → All products (DataLoader batched)

3. For each product:
   GET /products/{id}/insights?q=...
   → RAG insights (3 requests if 3 unique products)

4. GET /ai/orders/ord-1001/summary
   → Progress summary (cached in Redis)

5. GET /ai/orders/ord-1001/shipping-prediction
   → Shipping prediction (cached in Redis)

Total: 1 + 1 + 3 + 1 + 1 = 7 requests

With cache hits: 1 + 1 + 3 = 5 requests
```

**Compare to REST API:**

```
Without GraphQL:
1. GET /orders/ord-1001
2. GET /products/prod-123
3. GET /products/prod-456
4. GET /products/prod-789
5. GET /products/prod-123/insights
6. GET /products/prod-456/insights
7. GET /products/prod-789/insights
8. GET /ai/orders/ord-1001/summary
9. GET /ai/orders/ord-1001/shipping

Total: 9 requests (22% more!)
Plus: Over-fetching unused fields
```

---

## Test 7: Multiple Queries in Parallel

```graphql
query MultipleOrders {
  order1: order(id: "ord-1001") {
    id
    status
  }
  
  order2: order(id: "ord-1002") {
    id
    status
  }
  
  product: product(id: "prod-123") {
    name
    price {
      amount
    }
  }
}
```

**What happens:**

Apollo executes all 3 queries **in parallel**!

```
Parallel execution:
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ order1      │  │ order2      │  │ product     │
│ (200ms)     │  │ (200ms)     │  │ (150ms)     │
└─────────────┘  └─────────────┘  └─────────────┘

Total time: max(200, 200, 150) = 200ms

Sequential would be: 200 + 200 + 150 = 550ms
Savings: 63% faster! ✅
```

---

## Debugging: Watch Requests in Real-Time

### Enable Logging

Add console.log to DataLoader:

```typescript
// apps/gateway/src/data-loaders.ts

productById: new DataLoader<string, any>(async (ids) => {
  console.log('🔄 DataLoader batch:', ids);  // ADD THIS
  
  const uniqueIds = [...new Set(ids)];
  console.log('📦 Unique IDs:', uniqueIds);  // ADD THIS
  
  const products = await this.aura.getProductsByIds(uniqueIds);
  
  console.log('✅ Products fetched:', products.length);  // ADD THIS
  
  const byId = new Map(products.map((p: any) => [p.id, p]));
  return ids.map((id) => byId.get(id) ?? null);
}),
```

Rebuild and run:

```bash
docker compose up --build
```

Now run the OrderWithProducts query and watch the logs:

```
🔄 DataLoader batch: [ 'prod-123', 'prod-456', 'prod-789' ]
📦 Unique IDs: [ 'prod-123', 'prod-456', 'prod-789' ]
✅ Products fetched: 3
```

You can see DataLoader batching in action!

---

## Performance Comparison

### Scenario: Order with 10 Items (5 Unique Products)

| Approach | Requests | Time |
|----------|----------|------|
| **No DataLoader** | 11 (1 order + 10 products) | ~2000ms |
| **DataLoader (No Cache)** | 2 (1 order + 1 batch) | ~400ms |
| **DataLoader + Redis** | 1 (order only, cache hit) | ~50ms |

**Performance gains:**
- DataLoader: 80% fewer requests, 80% faster
- DataLoader + Cache: 91% fewer requests, 97.5% faster!

---

## Common Patterns

### Pattern 1: Pagination

```graphql
query PaginatedProducts {
  searchProducts(query: "laptop", limit: 10) {
    id
    name
    price {
      amount
      currency
    }
  }
}
```

### Pattern 2: Conditional Fields

```graphql
query ConditionalData($includeProducts: Boolean!) {
  order(id: "ord-1001") {
    id
    status
    items @include(if: $includeProducts) {
      product {
        name
      }
    }
  }
}

# Variables:
# { "includeProducts": false }
```

If `includeProducts` is false, DataLoader never executes!

### Pattern 3: Fragments (Reusable Fields)

```graphql
fragment ProductDetails on Product {
  id
  name
  price {
    amount
    currency
  }
}

query {
  product(id: "prod-123") {
    ...ProductDetails
  }
}
```

---

## Experiment Ideas

1. **Add More Logging**
   - Log every resolver execution
   - Log HTTP requests to downstream services
   - Log cache hits/misses

2. **Test Cache Expiration**
   - Run query twice within 60 seconds (cache hit)
   - Wait 60 seconds, run again (cache miss)

3. **Compare Performance**
   - Query with 1 item vs 100 items
   - Measure time in Network tab

4. **Break Things**
   - Stop Redis: see cache bypass in action
   - Stop Products service: see error handling
   - Send invalid query: see validation

---

## Next Steps

1. Read `ARCHITECTURE_GUIDE.md` for deep dive
2. Explore the code in `apps/gateway/src/`
3. Add your own queries to schema.gql
4. Implement custom resolvers
5. Add authentication/authorization

---

**Happy learning! 🚀**

The best way to understand is to break things and see what happens!
