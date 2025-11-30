export interface Order {
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

export interface Payment {
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

export interface NFTMintTransaction {
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
