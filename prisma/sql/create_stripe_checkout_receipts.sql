create table if not exists public.stripe_checkout_receipts (
  id             text primary key,
  session_id     text not null unique,
  payment_intent text,
  event_id       text,
  livemode       boolean not null default false,
  amount_total   integer,
  currency       text,
  status         text,
  payment_status text,
  customer_email text,
  metadata       jsonb,
  raw            jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists stripe_checkout_receipts_payment_intent_idx
  on public.stripe_checkout_receipts (payment_intent);

create index if not exists stripe_checkout_receipts_customer_email_idx
  on public.stripe_checkout_receipts (customer_email);

create index if not exists stripe_checkout_receipts_created_at_idx
  on public.stripe_checkout_receipts (created_at);
