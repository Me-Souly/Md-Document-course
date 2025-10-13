require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const router = require('./router/index');
const errorMiddleware = require('./middlewares/error-middleware');
const initDatabase = require('./config/init-db');
const { roleRepository, userRepository } = require('./repositories/')

const PORT = process.env.PORT || 5000;
const app = express();

// middlewares
app.use(express.json()); // parse JSON req
app.use(cookieParser()); // parse cookie header
app.use(cors({           // чтобы фронт мог работать с апи(вроде)
    credentials: true,   // куки автоматически присоединяются к запросам
    origin: process.env.CLIENT_URL
}));
app.use('/api', router); // путь для api
app.use(errorMiddleware); // в самом низу - если возникла ошибка

const start = async () => {
    // инициализация базы данных
    initDatabase(roleRepository, userRepository);

    try {
        await mongoose.connect(process.env.DB_URL); // установка соединения с mongodb
        app.listen(PORT, () => console.log(`Server started at port = ${PORT}`));
    } catch (e) {
        console.log(e);
    }
}

start();