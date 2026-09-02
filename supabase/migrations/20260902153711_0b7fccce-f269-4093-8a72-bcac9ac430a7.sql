select cron.schedule(
  'trip-reminders',
  '7 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4a189ca1-59dc-44ca-8329-9ae70115297f.lovable.app/api/public/hooks/reminders',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', private.cron_secret()),
    body := '{}'::jsonb
  );
  $$
);