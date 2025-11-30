import { Router } from 'express';
import * as ordersController from '../controllers/ordersController';

const router = Router();

// Order CRUD
router.post('/', ordersController.createOrder);
router.get('/:orderId', ordersController.getOrderHandler);
router.get('/user/:userId', ordersController.getUserOrders);
router.put('/:orderId/status', ordersController.updateOrderStatus);

// Payment processing
router.post('/:orderId/payments', ordersController.processPayment);
router.get('/:orderId/payments', ordersController.getOrderPayments);

// NFT minting
router.post('/:orderId/mint-nft', ordersController.mintNFT);
router.get('/:orderId/mint-transactions', ordersController.getOrderMintTransactions);

export default router;
