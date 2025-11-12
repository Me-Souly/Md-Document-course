import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import http from 'http';

import router from './router/index.js';
import errorMiddleware from './middlewares/error-middleware.js';
import initDatabase from './config/init-db.js';
import { roleRepository, userRepository } from './repositories/index.js';
import { initYjsServer } from './yjs/yjs-server.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();

// --- middlewares ---
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL
}));
app.use('/api', router);
app.use(errorMiddleware);

// --- инициализация ---
const start = async () => {
    initDatabase(roleRepository, userRepository);

    try {
        await mongoose.connect(process.env.DB_URL);
        console.log('MongoDB connected');

        const server = http.createServer(app);

        // запускаем Yjs сервер (на том же http-сервере)
        initYjsServer(server);

        server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (e) {
        console.error(e);
    }
};

start();
