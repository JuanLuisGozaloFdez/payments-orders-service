import { v4 as uuidv4 } from 'uuid';
import { Order, Payment, NFTMintTransaction } from '../models/types';

const orders: Order[] = [];
const payments: Payment[] = [];
const nftTransactions: NFTMintTransaction[] = [];

export const createOrder = (userId: string, ticketId: string, quantity: number, totalAmount: string): Order => {
  const order: Order = {
    id: uuidv4(),
    userId,
    ticketId,
    quantity,
    totalAmount,
    status: 'pending',
    nftTokenIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  orders.push(order);
  return order;
};

export const getOrder = (orderId: string): Order | undefined => {
  return orders.find((o) => o.id === orderId);
};

export const getUserOrders = (userId: string): Order[] => {
  return orders.filter((o) => o.userId === userId);
};

export const updateOrderStatus = (orderId: string, status: Order['status']): Order | undefined => {
  const order = orders.find((o) => o.id === orderId);
  if (order) {
    order.status = status;
    order.updatedAt = Date.now();
  }
  return order;
};

export const addNFTTokenToOrder = (orderId: string, tokenId: string): Order | undefined => {
  const order = orders.find((o) => o.id === orderId);
  if (order) {
    order.nftTokenIds.push(tokenId);
    order.updatedAt = Date.now();
  }
  return order;
};

export const createPayment = (
  orderId: string,
  amount: string,
  currency: string,
  paymentMethod: string
): Payment => {
  const payment: Payment = {
    id: uuidv4(),
    orderId,
    amount,
    currency,
    status: 'pending',
    paymentMethod,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  payments.push(payment);
  return payment;
};

export const getPayment = (paymentId: string): Payment | undefined => {
  return payments.find((p) => p.id === paymentId);
};

export const getOrderPayments = (orderId: string): Payment[] => {
  return payments.filter((p) => p.orderId === orderId);
};

export const updatePaymentStatus = (
  paymentId: string,
  status: Payment['status'],
  stripeChargeId?: string,
  errorMessage?: string
): Payment | undefined => {
  const payment = payments.find((p) => p.id === paymentId);
  if (payment) {
    payment.status = status;
    if (stripeChargeId) payment.stripeChargeId = stripeChargeId;
    if (errorMessage) payment.errorMessage = errorMessage;
    payment.updatedAt = Date.now();
  }
  return payment;
};

export const recordNFTMintTransaction = (
  orderId: string,
  contractAddress: string,
  recipientAddress: string,
  tokenId: string
): NFTMintTransaction => {
  const tx: NFTMintTransaction = {
    id: uuidv4(),
    orderId,
    contractAddress,
    recipientAddress,
    tokenId,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  nftTransactions.push(tx);
  return tx;
};

export const getMintTransaction = (txId: string): NFTMintTransaction | undefined => {
  return nftTransactions.find((t) => t.id === txId);
};

export const getOrderMintTransactions = (orderId: string): NFTMintTransaction[] => {
  return nftTransactions.filter((t) => t.orderId === orderId);
};

export const updateMintTransactionStatus = (
  txId: string,
  status: NFTMintTransaction['status'],
  transactionHash?: string
): NFTMintTransaction | undefined => {
  const tx = nftTransactions.find((t) => t.id === txId);
  if (tx) {
    tx.status = status;
    if (transactionHash) tx.transactionHash = transactionHash;
    tx.updatedAt = Date.now();
  }
  return tx;
};

export const getAllOrders = (): Order[] => {
  return orders;
};

export const getAllPayments = (): Payment[] => {
  return payments;
};

export const getAllMintTransactions = (): NFTMintTransaction[] => {
  return nftTransactions;
};
