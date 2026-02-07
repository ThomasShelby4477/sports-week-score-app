import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Routes
import authRoutes from './routes/auth.js';
import sportsRoutes from './routes/sports.js';
import resultsRoutes from './routes/results.js';
import medalsRoutes from './routes/medals.js';
import adminRoutes from './routes/admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Render/Vercel (Required for Secure cookies behind load balancer)
app.set('trust proxy', 1);

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'https://sports-week-score-app.vercel.app', process.env.FRONTEND_URL].filter(Boolean),
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// SSE clients for real-time updates
const sseClients = new Set();

// SSE endpoint for live updates
app.get('/api/sse', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial connection message
    res.write('data: {"type":"connected"}\n\n');

    sseClients.add(res);

    req.on('close', () => {
        sseClients.delete(res);
    });
});

// Broadcast to all SSE clients
export function broadcast(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach(client => {
        client.write(message);
    });
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sports', sportsRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/medals', medalsRoutes);
app.use('/api/admin', adminRoutes);

// Serve static files in production - DISABLED for split deployment (Frontend on Vercel)
// if (process.env.NODE_ENV === 'production') {
//     app.use(express.static(join(__dirname, '../client/dist')));
//     app.get('*', (req, res) => {
//         res.sendFile(join(__dirname, '../client/dist/index.html'));
//     });
// }

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║     🏆 Sports Week Score App Server (API ONLY) 🏆         ║
╠═══════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}                 ║
║  API Base URL:      http://localhost:${PORT}/api             ║
╚═══════════════════════════════════════════════════════════╝
    `);
});

export default app;
