# Payments Orders Service

Microservice for managing orders, payment processing, and NFT minting in the NFT ticketing marketplace.

## Features

- **Order Management**: Create and manage ticket purchase orders
- **Payment Processing**: Process payments with Stripe integration support
- **NFT Minting**: Trigger and track NFT minting for successful orders
- **Order Status Tracking**: Monitor order lifecycle from pending to completed
- **Payment History**: Maintain complete payment records per order

## Tech Stack

- **Node.js** 20 LTS
- **TypeScript** 5.2 (strict mode)
- **Express** 4.18
- **Stripe** 14.5 (payment processing)
- **Jest** 29.6 (testing)
- **Supertest** 7.1 (HTTP testing)

## Setup

```bash
npm install
npm run dev   # Start development server
npm test      # Run test suite (12 tests passing)
npm run build # Compile TypeScript
```

## API Endpoints

### Order Management
- `POST /orders` - Create a new order
- `GET /orders/:orderId` - Retrieve an order by ID
- `GET /orders/user/:userId` - Get all orders for a user
- `PUT /orders/:orderId/status` - Update order status

### Payment Processing
- `POST /orders/:orderId/payments` - Process payment for order
- `GET /orders/:orderId/payments` - Retrieve all payments for an order

### NFT Minting
- `POST /orders/:orderId/mint-nft` - Trigger NFT minting for order
- `GET /orders/:orderId/mint-transactions` - Get all mint transactions for an order

### Health Check
- `GET /health` - Service health status

## Example Requests

### Create Order
```bash
curl -X POST http://localhost:3003/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-456",
    "ticketId": "ticket-789",
    "quantity": 2,
    "totalAmount": "200"
  }'
```

### Process Payment
```bash
curl -X POST http://localhost:3003/orders/{orderId}/payments \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "200",
    "currency": "USD",
    "paymentMethod": "card"
  }'
```

### Mint NFT Ticket
```bash
curl -X POST http://localhost:3003/orders/{orderId}/mint-nft \
  -H "Content-Type: application/json" \
  -d '{
    "contractAddress": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    "recipientAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "tokenId": "1"
  }'
```

### Update Order Status
```bash
curl -X PUT http://localhost:3003/orders/{orderId}/status \
  -H "Content-Type: application/json" \
  -d '{"status": "processing"}'
```

## Data Models

### Order
```typescript
interface Order {
  id: string;
  userId: string;
  ticketId: string;
  quantity: number;
  totalAmount: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  stripePaymentId?: string;
  nftTokenIds: string[];
  createdAt: number;
  updatedAt: number;
}
```

### Payment
```typescript
interface Payment {
  id: string;
  orderId: string;
  amount: string;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  stripeChargeId?: string;
  paymentMethod: string;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}
```

### NFT Mint Transaction
```typescript
interface NFTMintTransaction {
  id: string;
  orderId: string;
  contractAddress: string;
  recipientAddress: string;
  tokenId: string;
  transactionHash?: string;
  status: 'pending' | 'minted' | 'failed';
  createdAt: number;
  updatedAt: number;
}
```

## Testing

The service includes **12 comprehensive tests** covering:

✅ Order creation and retrieval
✅ User order queries
✅ Order status updates
✅ Payment processing
✅ Payment history retrieval
✅ NFT minting workflows
✅ Mint transaction tracking
✅ Error handling and validation
✅ Health check endpoint

Run tests with:
```bash
npm test
```

## Port

Service runs on **port 3003** by default.

## Environment Variables

None required for local development. Configure the following in production:
- `PORT` - Service port (default: 3003)
- `NODE_ENV` - Environment (development/production)
- `STRIPE_SECRET_KEY` - Stripe API secret key (for real payment processing)
- `STRIPE_PUBLISHABLE_KEY` - Stripe API publishable key
- `NFT_CONTRACT_ADDRESS` - Smart contract address for NFT deployment

## Integration

This service integrates with:
- **Ticketing Core Service** (port 3001) - For ticket information
- **Users Identity Service** (port 3002) - For user validation
- **Wallet Assets Service** (port 3005) - For wallet management
- **API Gateway BFF** (port 3000) - For external access
- **Notifications Service** (port 3004) - For order confirmation emails

## Payment Flow

1. User initiates order creation with ticket and quantity
2. Order status transitions to `processing`
3. Payment processor validates payment method
4. Stripe charges the card and returns charge ID
5. Payment status updates to `succeeded`
6. Order status transitions to `completed`
7. NFT minting is triggered for each quantity
8. User receives notification with NFT details
9. Wallet assets are updated with minted NFTs

## Future Enhancements

- Real Stripe integration for production payments
- Refund processing workflow
- Order cancellation with refunds
- Webhook support for Stripe events
- Payment retry logic with exponential backoff
- Advanced order analytics and reporting
- Bulk order processing
- Subscription management for season passes

## License

MIT
