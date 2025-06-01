#!/bin/sh

# Start cron daemon
crond -f -d 8 &

# Add cron job
echo "* * * * * cd /app && npm run check-events >> /var/log/calendar-events.log 2>&1" | crontab -

# Start Next.js application
npm start
