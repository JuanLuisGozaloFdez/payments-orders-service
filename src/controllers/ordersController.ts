import { Request, Response } from 'express';
import * as ordersService from '../services/ordersService';

export const createOrder = (req: Request, res: Response) => {
  try {
    const { userId, ticketId, quantity, totalAmount } = req.body;
    if (!userId || !ticketId || !quantity || !totalAmount) {
      return res.status(400).json({ error: 'userId, ticketId, quantity, and totalAmount are required' });
    }
    const order = ordersService.createOrder(userId, ticketId, quantity, totalAmount);
    res.status(201).json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getOrderHandler = (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const order = ordersService.getOrder(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getUserOrders = (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userOrders = ordersService.getUserOrders(userId);
    res.json(userOrders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateOrderStatus = (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status is required' });
    const order = ordersService.updateOrderStatus(orderId, status);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const processPayment = (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { amount, currency, paymentMethod } = req.body;
    if (!amount || !currency || !paymentMethod) {
      return res.status(400).json({ error: 'amount, currency, and paymentMethod are required' });
    }
    const order = ordersService.getOrder(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const payment = ordersService.createPayment(orderId, amount, currency, paymentMethod);
    // Simulate payment processing
    ordersService.updatePaymentStatus(payment.id, 'succeeded', `charge_${payment.id.slice(0, 8)}`);
    ordersService.updateOrderStatus(orderId, 'completed');

    res.status(201).json({
      order: ordersService.getOrder(orderId),
      payment: ordersService.getPayment(payment.id),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getOrderPayments = (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const payments = ordersService.getOrderPayments(orderId);
    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const mintNFT = (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { contractAddress, recipientAddress, tokenId } = req.body;
    if (!contractAddress || !recipientAddress || !tokenId) {
      return res.status(400).json({ error: 'contractAddress, recipientAddress, and tokenId are required' });
    }
    const order = ordersService.getOrder(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const tx = ordersService.recordNFTMintTransaction(orderId, contractAddress, recipientAddress, tokenId);
    // Simulate NFT minting
    ordersService.updateMintTransactionStatus(tx.id, 'minted', `0xtxhash${tx.id.slice(0, 8)}`);
    ordersService.addNFTTokenToOrder(orderId, tokenId);

    res.status(201).json({
      order: ordersService.getOrder(orderId),
      mintTransaction: ordersService.getMintTransaction(tx.id),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getOrderMintTransactions = (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const txs = ordersService.getOrderMintTransactions(orderId);
    res.json(txs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
