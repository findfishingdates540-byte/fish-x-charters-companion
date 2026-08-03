CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('release-escrow') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'release-escrow');

SELECT cron.schedule(
  'release-escrow',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--4a189ca1-59dc-44ca-8329-9ae70115297f.lovable.app/api/public/hooks/release-escrow',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppYm1iZ3ZocmV0bnV2Z2l5dG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MzQxMTcsImV4cCI6MjA5ODQxMDExN30.9ddsugSrpePiTJKKCoN2VPhGj7BvPXq6Ylfceajq5jY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);