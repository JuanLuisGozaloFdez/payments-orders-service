export { BaseRepository } from './BaseRepository';
export { OrdersRepository } from './OrdersRepository';
export { PaymentsRepository } from './PaymentsRepository';
export { NFTTransactionsRepository } from './NFTTransactionsRepository';

// Singleton instances
export const ordersRepository = new (require('./OrdersRepository').OrdersRepository)();
export const paymentsRepository = new (require('./PaymentsRepository').PaymentsRepository)();
export const nftTransactionsRepository = new (require('./NFTTransactionsRepository').NFTTransactionsRepository)();
