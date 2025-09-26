import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import { jwtMiddleware } from './middleware/jwt';
// Import habitController only if it exists; guard to avoid startup errors in tests
let habitController: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  habitController = require('./controllers/habitController').default;
} catch (e) {
  // habitController not available during initial test scaffolding
}

const app = express();

app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use('/auth', authRoutes);

// mount protected habit routes only if controller available
if (habitController) {
  app.get('/habits', jwtMiddleware, habitController.listHabits);
  app.post('/habits', jwtMiddleware, habitController.createHabit);
  app.get('/habits/:id', jwtMiddleware, habitController.getHabit);
  app.patch('/habits/:id', jwtMiddleware, habitController.updateHabit);
  app.delete('/habits/:id', jwtMiddleware, habitController.deleteHabit);
  app.get('/today', jwtMiddleware, habitController.todayView);
}

export default app;
