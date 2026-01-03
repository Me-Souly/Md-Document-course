# Note Editor

Современный веб-редактор заметок с поддержкой совместного редактирования в реальном времени, markdown-форматированием и системой управления доступом.

## Основные возможности

- **Markdown-редактор** на базе Milkdown с поддержкой форматирования текста
- **Совместное редактирование** в реальном времени через Yjs и WebSocket
- **Управление заметками**: создание, редактирование, удаление, организация в папки
- **Система доступа**: публичные заметки, совместный доступ с правами read/edit
- **Поиск**: полнотекстовый поиск по всем заметкам
- **Избранное**: возможность помечать заметки как избранные
- **Профили пользователей**: публичные профили с просмотром заметок
- **Модерация**: панель модератора для управления публичным контентом
- **Аутентификация**: регистрация, вход, восстановление пароля, активация аккаунта

## Технологический стек

### Frontend
- **React 19** с TypeScript
- **MobX** для управления состоянием
- **Milkdown** - markdown-редактор
- **Yjs** - синхронизация в реальном времени
- **React Router** для маршрутизации
- **Rspack** для сборки
- **CSS Modules** для стилизации

### Backend
- **Node.js** с Express 5
- **MongoDB** для хранения данных
- **Redis** для кэширования и сессий
- **Yjs WebSocket Server** для совместного редактирования
- **JWT** для аутентификации
- **Nodemailer** для отправки email

### Инфраструктура
- **Docker** и **Docker Compose** для контейнеризации
- **Nginx** для раздачи статики
- **WebSocket** для real-time коммуникации

## Требования

- Node.js 20+
- Docker и Docker Compose (для контейнеризованного запуска)
- MongoDB 7.0+ (если запускаете без Docker)
- Redis 7+ (если запускаете без Docker)

## Быстрый старт

### Вариант 1: Запуск через Docker (рекомендуется)

1. **Клонируйте репозиторий:**
```bash
git clone <repository-url>
cd note-editor
```

2. **Создайте файл `.env` в корне проекта:**
```bash
cp env.example.txt .env
```

3. **Настройте переменные окружения в `.env`:**
   - `JWT_ACCESS_SECRET` и `JWT_REFRESH_SECRET` (минимум 32 символа)
   - `MONGO_ROOT_PASSWORD` - пароль для MongoDB
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` - настройки email (для активации и восстановления пароля)
   - `MODERATOR_EMAIL`, `MODERATOR_LOGIN`, `MODERATOR_PASSWORD` - данные модератора

4. **Запустите приложение:**
```bash
docker-compose up -d --build
```

5. **Откройте в браузере:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api
   - Health Check: http://localhost:5000/api/health

### Вариант 2: Локальный запуск
#### Backend

1. **Перейдите в директорию server:**
```bash
cd server
```

2. **Установите зависимости:**
```bash
npm install
```

3. **Создайте `.env` файл** (см. `env.example.txt` в корне проекта)

4. **Запустите MongoDB и Redis** (или используйте Docker только для них)

5. **Запустите сервер:**
```bash
npm run dev
```

#### Frontend

1. **Перейдите в директорию client:**
```bash
cd client
```

2. **Установите зависимости:**
```bash
npm install
```

3. **Создайте `.env` файл** (опционально):
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000
```

4. **Запустите приложение:**
```bash
npm start
```

Приложение откроется на http://localhost:3000

## Структура проекта

```
note-editor/
├── client/                 # React frontend приложение
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   │   ├── auth/       # Компоненты аутентификации
│   │   │   ├── notes/      # Компоненты заметок и редактора
│   │   │   ├── sidebar/    # Боковая панель с файлами
│   │   │   ├── modals/     # Модальные окна
│   │   │   └── common/     # Общие компоненты
│   │   ├── pages/          # Страницы приложения
│   │   ├── stores/         # MobX сторы
│   │   ├── service/        # API сервисы
│   │   ├── hooks/          # Кастомные React хуки
│   │   └── yjs/            # Yjs конфигурация
│   ├── Dockerfile
│   └── package.json
│
├── server/                 # Node.js backend приложение
│   ├── controllers/        # Контроллеры API
│   ├── services/           # Бизнес-логика
│   ├── models/             # Модели данных
│   ├── repositories/       # Репозитории для работы с БД
│   ├── middlewares/        # Express middleware
│   ├── router/             # Маршруты API
│   ├── yjs/                # Yjs WebSocket сервер
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml      # Docker Compose конфигурация
├── .env                    # Переменные окружения (создать из env.example.txt)
└── README.md
```

## Конфигурация
### Переменные окружения

Основные переменные окружения описаны в файле `env.example.txt`. Ключевые параметры:

- **MongoDB**: `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`, `MONGO_DATABASE`
- **Redis**: `REDIS_PASSWORD` (опционально)
- **JWT**: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, сроки действия токенов
- **SMTP**: настройки для отправки email (активация, восстановление пароля)
- **CORS**: `CLIENT_URL` - разрешенные origins для CORS
- **Moderator**: данные для создания модератора при первом запуске

Подробное описание всех переменных см. в `ENV-VARIABLES-EXPLAINED.md`

## API Endpoints

### Аутентификация
- `POST /api/users/registration` - регистрация
- `POST /api/login` - вход
- `POST /api/logout` - выход
- `POST /api/refresh` - обновление токена
- `POST /api/password/request-reset` - запрос сброса пароля
- `POST /api/password/reset/:token` - сброс пароля

### Заметки
- `GET /api/notes` - получить все заметки пользователя
- `GET /api/notes/:id` - получить заметку по ID
- `POST /api/notes` - создать заметку
- `PUT /api/notes/:id` - обновить заметку
- `DELETE /api/notes/:id` - удалить заметку
- `GET /api/notes/shared` - получить общие заметки
- `GET /api/notes/public` - получить публичные заметки

### Доступ к заметкам
- `GET /api/notes/:id/access` - получить список пользователей с доступом
- `POST /api/notes/:id/access` - предоставить доступ
- `DELETE /api/notes/:id/access/:userId` - удалить доступ

### Модерация
- `GET /api/moderator/public-notes` - получить публичные заметки для модерации
- `DELETE /api/moderator/notes/:id` - удалить заметку
- `POST /api/moderator/notes/:id/block` - заблокировать заметку

## Docker команды

```bash
# Запуск всех сервисов
docker-compose up -d

# Запуск с пересборкой
docker-compose up -d --build

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose stop

# Остановка и удаление контейнеров
docker-compose down

# Остановка с удалением volumes (удалит данные!)
docker-compose down -v
```

## Безопасность

- JWT токены для аутентификации (access и refresh)
- Refresh токены хранятся в httpOnly cookies
- Пароли хешируются с помощью bcrypt
- CORS настроен для защиты от несанкционированных запросов
- Валидация входных данных на клиенте и сервере
- Middleware для проверки прав доступа

## Авторы

Проект разработан в рамках курсовой работы.