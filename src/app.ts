import express, { Express } from 'express';
import cors from 'cors';
import ordersRoutes from './routes/orders';

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/orders', ordersRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'payments-orders-service' });
});

export default app;
