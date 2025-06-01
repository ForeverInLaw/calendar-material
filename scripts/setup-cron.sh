#!/bin/bash

# Скрипт для настройки cron job на вашем сервере

echo "Setting up cron job for event notifications..."

# Get the absolute path to the project directory
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

# Create log directory if it doesn't exist
mkdir -p /var/log/calendar-app

# Создаем cron job, который запускается каждую минуту
CRON_JOB="* * * * * cd $PROJECT_DIR && ./scripts/check-event-start.ts >> /var/log/calendar-app/events.log 2>&1"

# Добавляем cron job
(crontab -l 2>/dev/null || echo "") | grep -v "check-event-start.ts" | { cat; echo "$CRON_JOB"; } | crontab -

echo "Cron job added successfully!"
echo "Events will be checked every minute"
echo "Logs are available at: /var/log/calendar-app/events.log"

# Make the script executable
chmod +x "$PROJECT_DIR/scripts/check-event-start.ts"

echo "Script permissions set"
