# Calendar App with Telegram Notifications

Веб-приложение календаря с автоматическими уведомлениями в Telegram о начале событий.

## Возможности

- 📅 Создание и управление событиями в календаре
- 🔔 Автоматические уведомления в Telegram при начале событий
- 👤 Аутентификация пользователей через Supabase
- 📱 Адаптивный дизайн для мобильных устройств
- ⚡ Проверка событий каждую минуту через cron job

## Технологии

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Уведомления**: Telegram Bot API
- **Автоматизация**: Cron jobs / systemd timers

## Требования к серверу

- Ubuntu/Debian Linux
- Node.js 18+ (рекомендуется через NVM)
- npm или yarn
- Доступ к интернету для Telegram API
- Права sudo для настройки cron jobs

## Установка и настройка

### 1. Подготовка сервера

\`\`\`bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
sudo apt install -y curl git build-essential

# Установка NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Установка Node.js
nvm install 22.16.0
nvm use 22.16.0
nvm alias default 22.16.0
\`\`\`

### 2. Клонирование проекта

\`\`\`bash
# Клонирование репозитория
git clone <your-repository-url>
cd prodcalendar

# Установка зависимостей
npm install
\`\`\`

### 3. Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. Перейдите в Settings → API и скопируйте:
   - Project URL
   - anon public key
   - service_role key (секретный!)

3. Выполните SQL-скрипт для создания таблиц:

\`\`\`sql
-- Создание таблицы users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  telegram_chat_id TEXT,
  telegram_notifications_enabled BOOLEAN DEFAULT true,
  reminder_notifications_enabled BOOLEAN DEFAULT true,
  creation_notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  reminder_minutes INTEGER DEFAULT 15,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Политики безопасности для users
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Политики безопасности для events
CREATE POLICY "Users can view own events" ON events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON events
  FOR DELETE USING (auth.uid() = user_id);

-- Создание индексов для оптимизации
CREATE INDEX IF NOT EXISTS idx_events_date_time ON events(event_date, start_time);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_chat_id ON users(telegram_chat_id);
\`\`\`

### 4. Настройка Telegram бота

1. Создайте бота через [@BotFather](https://t.me/BotFather):
   - Отправьте \`/newbot\`
   - Выберите имя и username для бота
   - Скопируйте токен бота

2. Получите ваш Chat ID:
   - Отправьте любое сообщение вашему боту
   - Выполните скрипт для получения Chat ID (см. ниже)

### 5. Настройка переменных окружения

Создайте файл \`.env.local\`:

\`\`\`bash
cp .env.local.example .env.local
nano .env.local
\`\`\`

Заполните переменные:

\`\`\`env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Server Configuration
NEXT_PUBLIC_VERCEL_URL=your_domain_or_ip_here
\`\`\`

### 6. Получение Telegram Chat ID

\`\`\`bash
# Сначала отправьте сообщение вашему боту в Telegram
# Затем выполните:
tsx scripts/get-chat-id.ts
\`\`\`

Скопируйте ваш Chat ID и обновите профиль пользователя в Supabase.

### 7. Тестирование подключений

\`\`\`bash
# Тест подключения к Supabase
tsx scripts/test-db-connection.ts

# Тест отправки уведомлений
npm run check-events
\`\`\`

### 8. Настройка автоматических уведомлений

#### Вариант A: Cron Job (рекомендуется)

\`\`\`bash
# Создание директории для логов
sudo mkdir -p /var/log/calendar-app
sudo chmod 777 /var/log/calendar-app

# Настройка cron job
crontab -e

# Добавьте строку (замените путь на ваш):
* * * * * /home/your-user/prodcalendar/scripts/tsx-direct.sh >> /var/log/calendar-app/events.log 2>&1
\`\`\`

#### Вариант B: Systemd Timer

\`\`\`bash
# Создание service файла
sudo nano /etc/systemd/system/calendar-events.service
\`\`\`

\`\`\`ini
[Unit]
Description=Calendar Events Notification Service
After=network.target

[Service]
Type=oneshot
User=root
WorkingDirectory=/home/your-user/prodcalendar
Environment=PATH=/root/.nvm/versions/node/v22.16.0/bin:/usr/bin:/bin
ExecStart=/root/.nvm/versions/node/v22.16.0/bin/npm run check-events
StandardOutput=append:/var/log/calendar-app/systemd.log
StandardError=append:/var/log/calendar-app/systemd.log
\`\`\`

\`\`\`bash
# Создание timer файла
sudo nano /etc/systemd/system/calendar-events.timer
\`\`\`

\`\`\`ini
[Unit]
Description=Run Calendar Events Check every minute
Requires=calendar-events.service

[Timer]
OnCalendar=*:*:00
AccuracySec=1s
Persistent=true

[Install]
WantedBy=timers.target
\`\`\`

\`\`\`bash
# Активация timer
sudo systemctl daemon-reload
sudo systemctl enable calendar-events.timer
sudo systemctl start calendar-events.timer
\`\`\`

### 9. Запуск приложения

#### Development режим:
\`\`\`bash
npm run dev
\`\`\`

#### Production режим:
\`\`\`bash
# Сборка приложения
npm run build

# Запуск в production
npm start

# Или с PM2 для автоматического перезапуска
npm install -g pm2
pm2 start npm --name "calendar-app" -- start
pm2 startup
pm2 save
\`\`\`

### 10. Настройка веб-сервера (Nginx)

\`\`\`bash
sudo apt install nginx

# Создание конфигурации
sudo nano /etc/nginx/sites-available/calendar-app
\`\`\`

\`\`\`nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
\`\`\`

\`\`\`bash
# Активация конфигурации
sudo ln -s /etc/nginx/sites-available/calendar-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
\`\`\`

## Мониторинг и обслуживание

### Проверка логов

\`\`\`bash
# Логи уведомлений
tail -f /var/log/calendar-app/events.log

# Логи cron
sudo tail -f /var/log/syslog | grep CRON

# Логи systemd (если используется)
sudo journalctl -u calendar-events.service -f

# Логи приложения
pm2 logs calendar-app
\`\`\`

### Полезные команды

\`\`\`bash
# Проверка статуса cron job
crontab -l

# Проверка статуса systemd timer
sudo systemctl status calendar-events.timer
sudo systemctl list-timers calendar-events.timer

# Ручная проверка событий
npm run check-events

# Создание тестового события
tsx scripts/create-immediate-test.ts

# Тест подключения к базе данных
tsx scripts/test-db-connection.ts
\`\`\`

### Резервное копирование

\`\`\`bash
# Создание бэкапа базы данных (через Supabase Dashboard)
# Settings → Database → Backups

# Бэкап файлов приложения
tar -czf calendar-app-backup-$(date +%Y%m%d).tar.gz /home/your-user/prodcalendar
\`\`\`

## Устранение неполадок

### Уведомления не приходят

1. Проверьте логи: \`tail -f /var/log/calendar-app/events.log\`
2. Убедитесь, что cron job запущен: \`crontab -l\`
3. Проверьте Chat ID пользователя в базе данных
4. Протестируйте вручную: \`npm run check-events\`

### Ошибки подключения к базе данных

1. Проверьте переменные окружения в \`.env.local\`
2. Убедитесь, что используется Service Role Key для cron jobs
3. Проверьте RLS политики в Supabase

### Проблемы с Node.js в cron

1. Убедитесь, что используются полные пути к Node.js
2. Проверьте, что NVM правильно настроен
3. Используйте systemd timer как альтернативу

## Безопасность

- ⚠️ **Никогда не коммитьте \`.env.local\` в git**
- 🔒 **Service Role Key должен храниться только на сервере**
- 🛡️ **Настройте firewall для ограничения доступа**
- 🔄 **Регулярно обновляйте зависимости**

## Поддержка

Если возникли проблемы:

1. Проверьте логи приложения
2. Убедитесь, что все переменные окружения настроены
3. Протестируйте каждый компонент отдельно
4. Обратитесь к документации Supabase и Telegram Bot API

---

**Версия**: 1.0.0  
**Последнее обновление**: $(date +%Y-%m-%d)
