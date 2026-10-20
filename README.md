# Aura GraphQL Gateway

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![GraphQL](https://img.shields.io/badge/GraphQL-E10098?style=flat&logo=graphql&logoColor=white)](https://graphql.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)](https://redis.io/)
[![Apollo GraphQL](https://img.shields.io/badge/Apollo-311C87?style=flat&logo=apollo-graphql&logoColor=white)](https://www.apollographql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A production-ready, schema-first GraphQL BFF (Backend-for-Frontend) gateway built with NestJS, Apollo Server, and DataLoader. Features microservices architecture with Docker Compose orchestration, Redis caching, and N+1 query prevention.

## 🚀 Features

- **Schema-First GraphQL** - Type-safe API development with `.gql` schemas
- **DataLoader Pattern** - Eliminates N+1 queries through intelligent batching
- **Redis Caching** - TTL-based caching for AI-generated responses
- **Microservices Architecture** - 4 independently deployable services
- **Docker Compose** - Complete local development environment
- **Health Checks** - Built-in health endpoints for all services
- **Mock Services** - Realistic mock data for development and testing
- **RAG Insights** - Simulated Retrieval-Augmented Generation for products
- **Shipping Predictions** - Mock AI-powered delivery forecasting

## 📋 Architecture

```
┌─────────────────────────────────────────────────────┐
│                  API Gateway (4000)                 │
│           GraphQL + Apollo + DataLoader             │
└──────────┬────────────┬────────────┬────────────────┘
           │            │            │
    ┌──────▼─────┐ ┌───▼─────┐ ┌───▼──────┐
    │  Orders    │ │ Products │ │ AI Lens  │
    │  (4101)    │ │  (4102)  │ │  (4103)  │
    └────────────┘ └──────────┘ └──────────┘
           │            │            │
           └────────────┴────────────┘
                       │
                  ┌────▼─────┐
                  │  Redis   │
                  │  (6379)  │
                  └──────────┘
```

## 🏗️ Services

| Service | Port | Description |
|---------|------|-------------|
| **gateway** | 4000 | GraphQL API Gateway (NestJS + Apollo) |
| **orders** | 4101 | Mock Order Management REST API |
| **products** | 4102 | Mock Product Catalog + RAG REST API |
| **ai-lens** | 4103 | Mock AI Predictions REST API |
| **redis** | 6379 | Shared Cache Layer |

All application containers are built by Docker Compose. This starter intentionally uses mock data and deterministic AI responses; it does not call a real LLM or carrier API.

## 🛠️ Prerequisites

- **Docker Engine** (20.10 or higher)
- **Docker Compose** v2

## ⚡ Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/prosaquib/aura-graphql-starter.git
cd aura-graphql-starter
```

### 2. Start all services

```bash
docker compose up --build
```

### 3. Access GraphQL Playground

Open your browser to: **http://localhost:4000/graphql**

### 4. Run example queries

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

**Search products:**

```graphql
query {
  searchProducts(query: "headphones", limit: 10) {
    id
    name
    description
  }
}
```

**Get order status:**

```graphql
query {
  order(id: "ord-1002") {
    id
    status
    progressSummary
  }
}
```

## 🔍 Health Checks

Verify all services are running:

- Gateway: http://localhost:4000/health
- Orders: http://localhost:4101/health
- Products: http://localhost:4102/health
- AI Lens: http://localhost:4103/health

## 📚 Architecture Notes

### Schema-First Design

The GraphQL schema is defined in `apps/gateway/src/schema.gql`. Resolvers are implemented in TypeScript and call downstream REST APIs.

### DataLoader Pattern

`OrderItem.product` uses a **request-scoped DataLoader** to batch product lookups and prevent N+1 query problems:

```typescript
// Without DataLoader: N+1 queries
Order with 10 items → 1 query for order + 10 queries for products = 11 queries

// With DataLoader: Batched queries
Order with 10 items → 1 query for order + 1 batched query for products = 2 queries
```

### Redis Caching

AI Lens results are cached in Redis with a short TTL:
- Cache keys include operation type and order ID
- TTL configured via `AI_CACHE_TTL_SECONDS` environment variable
- DataLoader cache is request-scoped and independent of Redis

### Mock Services

All downstream services (`orders`, `products`, `ai-lens`) return deterministic mock data:
- No external API calls
- No real LLM integration
- Perfect for development, testing, and demos

## 🛠️ Development

### Rebuild services

```bash
docker compose up --build --force-recreate
```

### View logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f gateway
```

### Stop services

```bash
docker compose down
```

### Clean up (including volumes)

```bash
docker compose down -v
```

## 📁 Project Structure

```
aura-graphql-starter/
├── apps/
│   ├── gateway/           # GraphQL API Gateway
│   │   ├── src/
│   │   │   ├── schema.gql        # GraphQL schema
│   │   │   ├── aura.resolver.ts  # Query/field resolvers
│   │   │   ├── data-loaders.ts   # DataLoader implementation
│   │   │   └── cache.service.ts  # Redis cache service
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── orders/            # Mock Orders API
│   ├── products/          # Mock Products API
│   └── ai-lens/           # Mock AI Predictions API
├── docker-compose.yml     # Service orchestration
├── .gitignore
├── LICENSE
└── README.md
```

## 🔐 Environment Variables

The gateway accepts the following environment variables (configured in `docker-compose.yml`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Gateway HTTP port |
| `ORDERS_URL` | `http://orders:4101` | Orders service endpoint |
| `PRODUCTS_URL` | `http://products:4102` | Products service endpoint |
| `AI_LENS_URL` | `http://ai-lens:4103` | AI Lens service endpoint |
| `REDIS_URL` | `redis://redis:6379` | Redis connection string |
| `AI_CACHE_TTL_SECONDS` | `60` | Cache TTL for AI responses |

## 🚀 Production Hardening Checklist

Before deploying to production, implement:

- [ ] **Authentication & Authorization** - JWT, OAuth 2.0, API keys
- [ ] **Request Validation** - Input sanitization, schema validation
- [ ] **GraphQL Security** - Query depth/complexity limits, rate limiting
- [ ] **Observability** - OpenTelemetry, structured logging, metrics
- [ ] **Resilience** - Circuit breakers, timeouts, retries
- [ ] **Secret Management** - Vault, AWS Secrets Manager, environment encryption
- [ ] **Cache Invalidation** - Event-driven cache purging
- [ ] **Real Integrations** - Replace mock services with production APIs
- [ ] **Integration Tests** - E2E test suite with contract testing
- [ ] **Performance Testing** - Load testing, stress testing
- [ ] **Security Scanning** - SAST, DAST, dependency scanning
- [ ] **Documentation** - API docs, architecture diagrams, runbooks

⚠️ **Important:** Do not treat mock AI predictions as actual shipping commitments. Use a proper ML model and show provenance/freshness of predictions in production.

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

Please ensure:
- Code follows existing style and conventions
- All tests pass
- Documentation is updated
- Commit messages are clear and descriptive

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Saquib Akhtar**
- GitHub: [@prosaquib](https://github.com/prosaquib)

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Apollo Server](https://www.apollographql.com/docs/apollo-server/) - GraphQL server
- [DataLoader](https://github.com/graphql/dataloader) - Batching and caching layer
- [Redis](https://redis.io/) - In-memory data store

## 📊 Tech Stack

- **Framework:** NestJS 10.x
- **GraphQL:** Apollo Server 4.x
- **Language:** TypeScript 5.x
- **Runtime:** Node.js 20.x
- **Cache:** Redis 7.x
- **Containerization:** Docker & Docker Compose
- **Architecture:** Microservices, BFF Pattern

---

⭐ **If you find this project helpful, please give it a star!** ⭐
