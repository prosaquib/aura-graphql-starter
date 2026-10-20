# Aura GraphQL Gateway — Docker Compose Starter

A schema-first NestJS + Apollo GraphQL gateway with DataLoader, mock downstream services, and Redis caching.

## Services

- `gateway`: public GraphQL API on http://localhost:4000/graphql
- `orders`: mock order REST API on http://localhost:4101
- `products`: mock product/RAG REST API on http://localhost:4102
- `ai-lens`: mock AI summary and shipping prediction API on http://localhost:4103
- `redis`: shared cache on port 6379

All application containers are built by Docker Compose. This starter intentionally uses mock data and deterministic AI responses; it does not call a real LLM or carrier API.

## Run

Requirements: Docker Engine and Docker Compose v2.

```bash
docker compose up --build
```

GraphQL Playground / Apollo landing page:
- http://localhost:4000/graphql

Health:
- http://localhost:4000/health
- http://localhost:4101/health
- http://localhost:4102/health
- http://localhost:4103/health

Stop:

```bash
docker compose down
```

## Example query

```graphql
query AuraOrderExperience {
  order(id: "ord-1001") {
    id
    status
    estimatedDelivery
    progressSummary
    shippingPrediction {
      delayLikely
      estimatedDelayDays
      explanation
      generatedAt
    }
    items {
      productId
      quantity
      product {
        id
        name
        price { amount currency }
        ragInsights(question: "What are the key benefits?") {
          answer
          sources
        }
      }
    }
  }
}
```

Other useful queries:

```graphql
query {
  searchProducts(query: "headphones", limit: 10) {
    id
    name
    description
  }
}
```

```graphql
query {
  order(id: "ord-1002") {
    id
    status
    progressSummary
  }
}
```

## Architecture notes

- The gateway is schema-first: `apps/gateway/src/schema.gql`.
- Resolvers call downstream HTTP APIs; mock services are independently deployable containers.
- `OrderItem.product` uses a request-scoped DataLoader to batch product lookups and avoid N+1 calls.
- Redis caches AI Lens results for a short TTL. Cache keys include operation and order ID.
- DataLoader cache is request-scoped and is not a substitute for shared Redis caching.
- The mock `ragInsights` and AI Lens endpoints return deterministic sample output only.

## Development

The Docker image installs dependencies and builds the TypeScript app. Source files are mounted nowhere by default so builds are reproducible and production-like. Edit source and rebuild with:

```bash
docker compose up --build --force-recreate
```

## Production hardening checklist

Before production, add authentication and object-level authorization, request/response validation, GraphQL query depth/complexity limits, rate limiting, OpenTelemetry, structured logs, deadlines/circuit breakers, secret management, cache invalidation rules, and real integration tests. Use a proper prediction model and show the provenance/freshness of its outputs. Do not treat mock predictions as actual shipping commitments.
