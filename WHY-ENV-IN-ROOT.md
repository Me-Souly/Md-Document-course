# Почему `.env` в корне проекта?

## 📁 Структура проекта:

```
note-editor/
├── docker-compose.yml      ← читает .env из этой директории
├── .env                    ← должен быть здесь!
├── client/
│   ├── Dockerfile
│   └── src/
├── server/
│   ├── Dockerfile
│   └── index.js
└── ...
```

## 🔍 Почему в корне?

**Docker Compose автоматически читает `.env` из той же директории, где находится `docker-compose.yml`.**

```yaml
# docker-compose.yml (в корне)
services:
  server:
    environment:
      JWT_SECRET: ${JWT_SECRET}  # ← читает из .env в корне
      CLIENT_URL: ${CLIENT_URL}   # ← читает из .env в корне
  
  client:
    build:
      args:
        REACT_APP_API_URL: ${REACT_APP_API_URL}  # ← читает из .env в корне
```

## 📝 Что должно быть в `.env`:

### Переменные для СЕРВЕРА:

```bash
# Server Configuration
NODE_ENV=production
SERVER_PORT=5000

# MongoDB
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your_password
MONGO_DATABASE=notes_db

# Redis
REDIS_PASSWORD=your_redis_password

# JWT (для сервера)
JWT_SECRET=your_jwt_secret_minimum_32_characters
JWT_REFRESH_SECRET=your_refresh_secret_minimum_32_characters
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# CORS (для сервера)
CLIENT_URL=http://localhost:3000

# Email (для сервера)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=noreply@yourapp.com
```

### Переменные для КЛИЕНТА:

```bash
# Frontend (для клиента - передаются при сборке)
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000
REACT_APP_API_PORT=5000
REACT_APP_WS_PORT=5000
CLIENT_PORT=3000
```

## 🔄 Как это работает:

### 1. Docker Compose читает `.env` из корня:

```bash
# .env в корне проекта
JWT_SECRET=my_secret
REACT_APP_API_URL=http://localhost:5000/api
```

### 2. Переменные подставляются в `docker-compose.yml`:

```yaml
# docker-compose.yml
services:
  server:
    environment:
      JWT_SECRET: ${JWT_SECRET}  # → my_secret
  
  client:
    build:
      args:
        REACT_APP_API_URL: ${REACT_APP_API_URL}  # → http://localhost:5000/api
```

### 3. Переменные передаются в контейнеры:

- **Сервер** получает через `environment:` в docker-compose
- **Клиент** получает через `build args:` при сборке образа

## ✅ Правильная структура `.env`:

```bash
# ============================================
# ОБЩИЕ НАСТРОЙКИ
# ============================================
NODE_ENV=production
SERVER_PORT=5000
CLIENT_PORT=3000

# ============================================
# ДЛЯ СЕРВЕРА (Backend)
# ============================================
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your_password
MONGO_DATABASE=notes_db
REDIS_PASSWORD=your_redis_password
JWT_SECRET=your_jwt_secret_minimum_32_characters
JWT_REFRESH_SECRET=your_refresh_secret_minimum_32_characters
CLIENT_URL=http://localhost:3000

# ============================================
# ДЛЯ КЛИЕНТА (Frontend)
# ============================================
# Эти переменные встраиваются в JavaScript код при сборке
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000
REACT_APP_API_PORT=5000
REACT_APP_WS_PORT=5000
```

## 🎯 Итого:

- ✅ `.env` в корне, потому что `docker-compose.yml` там же
- ✅ В `.env` переменные и для сервера, и для клиента
- ✅ Docker Compose автоматически подхватывает переменные из `.env`
- ✅ Сервер получает переменные через `environment:`
- ✅ Клиент получает переменные через `build args:` при сборке

**Один `.env` файл в корне для всех сервисов!**

