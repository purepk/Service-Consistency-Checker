import express from 'express';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { connectMongoDB } from './config/db.js';
import apiRouter from './routes/api.js';
import { executeCheckRun } from './services/checkerService.js';

dotenv.config();

const app = express();
app.use(express.json());

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: 'public' });
});
app.use('/api/v1', apiRouter);

cron.schedule('*/1 * * * *', async () => {
    console.log('[CRON] Starting periodic consistency check...');
    await executeCheckRun('schedule');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    await connectMongoDB();
    console.log(`Server listening on http://localhost:${PORT}`);
});