import request from 'supertest';
import app from '../src/app';
import * as ordersService from '../src/services/ordersService';

describe('Payments Orders Service', () => {
  const testUserId = 'user-456';
  const testTicketId = 'ticket-789';

  describe('POST /orders - Create Order', () => {
    test('should create a new order', async () => {
      const res = await request(app).post('/orders').send({
        userId: testUserId,
        ticketId: testTicketId,
        quantity: 2,
        totalAmount: '200',
      });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.userId).toBe(testUserId);
      expect(res.body.status).toBe('pending');
      expect(res.body.quantity).toBe(2);
    });

    test('should return 400 if required fields are missing', async () => {
      const res = await request(app).post('/orders').send({ userId: testUserId });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /orders/:orderId - Get Order', () => {
    test('should retrieve an order by ID', async () => {
      const order = ordersService.createOrder(testUserId, testTicketId, 1, '100');
      const res = await request(app).get(`/orders/${order.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(order.id);
      expect(res.body.userId).toBe(testUserId);
    });

    test('should return 404 for non-existent order', async () => {
      const res = await request(app).get('/orders/non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /orders/user/:userId - Get User Orders', () => {
    test('should retrieve all orders for a user', async () => {
      ordersService.createOrder(testUserId, testTicketId, 1, '100');
      ordersService.createOrder(testUserId, testTicketId, 2, '200');
      const res = await request(app).get(`/orders/user/${testUserId}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    test('should return empty array for user with no orders', async () => {
      const res = await request(app).get('/orders/user/non-existent-user');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('PUT /orders/:orderId/status - Update Order Status', () => {
    test('should update order status', async () => {
      const order = ordersService.createOrder(testUserId, testTicketId, 1, '100');
      const res = await request(app).put(`/orders/${order.id}/status`).send({ status: 'processing' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('processing');
    });

    test('should return 400 if status is missing', async () => {
      const order = ordersService.createOrder(testUserId, testTicketId, 1, '100');
      const res = await request(app).put(`/orders/${order.id}/status`).send({});
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /orders/:orderId/payments - Process Payment', () => {
    test('should process a payment for an order', async () => {
      const order = ordersService.createOrder(testUserId, testTicketId, 1, '100');
      const res = await request(app)
        .post(`/orders/${order.id}/payments`)
        .send({
          amount: '100',
          currency: 'USD',
          paymentMethod: 'card',
        });
      expect(res.status).toBe(201);
      expect(res.body.payment).toHaveProperty('id');
      expect(res.body.payment.status).toBe('succeeded');
      expect(res.body.order.status).toBe('completed');
    });

    test('should return 400 if payment details are missing', async () => {
      const order = ordersService.createOrder(testUserId, testTicketId, 1, '100');
      const res = await request(app).post(`/orders/${order.id}/payments`).send({ amount: '100' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('should return 404 if order does not exist', async () => {
      const res = await request(app)
        .post('/orders/non-existent/payments')
        .send({
          amount: '100',
          currency: 'USD',
          paymentMethod: 'card',
        });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /orders/:orderId/payments - Get Order Payments', () => {
    test('should retrieve all payments for an order', async () => {
      const order = ordersService.createOrder(testUserId, testTicketId, 1, '100');
      ordersService.createPayment(order.id, '100', 'USD', 'card');
      const res = await request(app).get(`/orders/${order.id}/payments`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /orders/:orderId/mint-nft - Mint NFT', () => {
    test('should record and mint NFT for an order', async () => {
      const order = ordersService.createOrder(testUserId, testTicketId, 1, '100');
      const res = await request(app)
        .post(`/orders/${order.id}/mint-nft`)
        .send({
          contractAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
          tokenId: '1',
        });
      expect(res.status).toBe(201);
      expect(res.body.mintTransaction).toHaveProperty('id');
      expect(res.body.mintTransaction.status).toBe('minted');
      expect(res.body.order.nftTokenIds).toContain('1');
    });

    test('should return 400 if required fields are missing', async () => {
      const order = ordersService.createOrder(testUserId, testTicketId, 1, '100');
      const res = await request(app)
        .post(`/orders/${order.id}/mint-nft`)
        .send({ contractAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('should return 404 if order does not exist', async () => {
      const res = await request(app)
        .post('/orders/non-existent/mint-nft')
        .send({
          contractAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
          tokenId: '1',
        });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /orders/:orderId/mint-transactions - Get Order Mint Transactions', () => {
    test('should retrieve all mint transactions for an order', async () => {
      const order = ordersService.createOrder(testUserId, testTicketId, 1, '100');
      ordersService.recordNFTMintTransaction(order.id, '0xcontract', '0xrecipient', '1');
      const res = await request(app).get(`/orders/${order.id}/mint-transactions`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /health - Health Check', () => {
    test('should return service health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('payments-orders-service');
    });
  });
});
