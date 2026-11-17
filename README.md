# Лабораторная работа №8. Контейнеризация приложения с Docker

Платформа для продажи и обмена подержанных вещей («Барахолка»): React + Express + Socket.IO.
Проект работает с двумя базами данных на выбор (MongoDB или PostgreSQL) и упакован в Docker-контейнеры.
Запускается одной командой `docker compose up --build`.

Ветка репозитория: `lab28`

## Состав контейнеров

| Сервис | Образ | Назначение | Порт | Профиль |
|---|---|---|---|---|
| `frontend` | собственный (Node 22 → Nginx) | React-сборка и reverse-proxy на backend | 80 | всегда |
| `backend` | собственный (Node 22) | Express API + Socket.IO | 3000 | всегда |
| `mongo` | `mongo:7` | MongoDB (том `mongo_data`) | внутри сети | `mongo` |
| `mongo-express` | `mongo-express:1.0.2` | веб-интерфейс MongoDB | 8081 | `mongo` |
| `postgres` | `postgres:16-alpine` | PostgreSQL (том `pgdata`) | внутри сети | `postgres` |
| `pgadmin` | `dpage/pgadmin4:8` | веб-интерфейс PostgreSQL | 5050 | `postgres` |

База выбирается переменной `DB_TYPE`, а контейнеры нужной БД включаются профилем Compose (`COMPOSE_PROFILES`).
Контейнеры неиспользуемой базы не запускаются.

## Dockerfile

- **Backend (`Dockerfile`)**: `node:22-alpine`, сначала копируются только `package*.json` и ставятся
  зависимости (`npm ci --omit=dev`), затем код. Так слой с зависимостями кэшируется. Приложение запускается
  не от root, а от пользователя `node`.
- **Frontend (`client/Dockerfile`)**: многоэтапная сборка. На первом этапе (`node:22-alpine`) выполняется
  `npm run build`, на втором (`nginx:alpine`) в образ копируется только готовая папка `dist`
  (`COPY --from=builder`). Итоговый образ не содержит Node.js и исходников.

Версия Node 22 вместо 18 из методички нужна потому, что зависимости проекта (mongoose 9, vite 8)
требуют Node 20 и выше.

## Реализованные дополнительные требования

- **Переменные окружения**: секреты (`JWT_SECRET`, пароли БД) хранятся в `.env`, который не попадает в репозиторий.
- **Healthcheck backend**: эндпоинт `GET /health` возвращает 200, если выбранная база отвечает, иначе 503.
- **Healthcheck БД с `service_healthy`**: backend запускается только после готовой базы, frontend после готового backend.
- **mongo-express и pgAdmin**: веб-интерфейсы для управления базами.
- **Reverse-proxy (Nginx)**: раздаёт React-сборку и проксирует `/listings`, `/auth`, `/profile`, `/admin`,
  `/uploads` и WebSocket `/socket.io/` на backend, поэтому браузер работает с одним адресом.
- **Изоляция сетей**: `public_net` (frontend, backend, веб-интерфейсы БД) и внутренняя `db_net`
  (`internal: true`), в которой находятся базы данных. Снаружи и из frontend БД недоступна.
- **Тома**: данные БД (`mongo_data` или `pgdata`) и загруженные фото (`uploads`) сохраняются при пересоздании контейнеров.

## Запуск

1. Установите Docker Desktop и запустите его.
2. В `.env` в корне проекта должны быть:

   ```env
   DB_TYPE=postgres
   COMPOSE_PROFILES=postgres
   JWT_SECRET=любая_длинная_случайная_строка
   ```

   `COMPOSE_PROFILES` должен совпадать с `DB_TYPE` (`postgres` или `mongo`). Остальные переменные
   (пароли БД и т. п.) имеют значения по умолчанию, пример полного набора в `.env.example`.

3. Соберите и запустите:

   ```bash
   docker compose up --build
   ```

   Чтобы запустить с другой базой без правки `.env`:

   ```bash
   DB_TYPE=mongo COMPOSE_PROFILES=mongo docker compose up --build
   ```

4. Заполните базу тестовыми данными (один раз, в соседнем терминале):

   ```bash
   docker compose exec backend npm run seed
   ```

5. Проверка работы:
   - сайт: http://localhost
   - backend: http://localhost:3000 и http://localhost:3000/health (в ответе указана текущая БД)
   - mongo-express: http://localhost:8081 (`admin` / `admin123`) или pgAdmin: http://localhost:5050 (`admin@example.com` / `admin123`)
   - список контейнеров: `docker ps`

Тестовые аккаунты: `admin@listings.local` / `Admin12345!` и `seller@test.com` / `MyPass123`.
У каждой базы свои данные (отдельные тома), при переключении `DB_TYPE` содержимое не переносится.

## Полезные команды

```bash
docker ps                          # список контейнеров
docker compose logs -f backend     # логи backend
docker compose exec backend sh     # оболочка внутри контейнера
docker compose down                # остановить (данные в томах сохраняются)
docker compose down -v             # остановить и удалить тома (БД и фото будут стёрты)
```

## Доступ к образам в Беларуси

Если Docker Hub недоступен, в Docker Desktop (Settings → Docker Engine) добавлены зеркала:

```json
{
  "registry-mirrors": ["https://mirror.gcr.io", "https://dockerhub.timeweb.cloud"]
}
```

## Структура проекта

```text
listings-api/
├── client/
│   ├── Dockerfile          # многоэтапная сборка: node (build) -> nginx
│   ├── nginx.conf          # раздача статики и reverse-proxy
│   ├── .dockerignore
│   └── src/ ...
├── db/                     # слой доступа к данным (mongo / postgres)
├── controllers/ routes/ sockets/ middleware/ scripts/
├── server.js               # + эндпоинт /health
├── Dockerfile              # backend
├── .dockerignore
├── docker-compose.yml      # профили mongo / postgres
├── .env.example
└── README.md
```