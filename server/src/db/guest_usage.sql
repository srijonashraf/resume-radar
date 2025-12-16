create table public.guest_usage (
  id character varying(255) not null,
  ip_address character varying(45) not null,
  mac_address character varying(17) null,
  user_agent text null,
  analysis_count integer not null default 1,
  last_analysis_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint guest_usage_pkey primary key (id),
  constraint check_analysis_count_positive check ((analysis_count >= 0))
) TABLESPACE pg_default;

create index IF not exists idx_guest_usage_ip_mac on public.guest_usage using btree (ip_address, mac_address) TABLESPACE pg_default;

create index IF not exists idx_guest_usage_last_analysis on public.guest_usage using btree (last_analysis_at) TABLESPACE pg_default;

create trigger update_guest_usage_updated_at BEFORE
update on guest_usage for EACH row
execute FUNCTION update_updated_at_column ();