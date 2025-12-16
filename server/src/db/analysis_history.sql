create table public.analysis_history (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  resume_text text not null,
  education_score integer not null,
  leadership_score integer not null,
  overall_score numeric(3, 1) not null,
  experience_level character varying(50) not null,
  years_of_experience integer not null default 0,
  missing_skills jsonb not null default '[]'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  full_analysis jsonb not null,
  created_at timestamp with time zone not null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint analysis_history_pkey primary key (id),
  constraint analysis_history_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint analysis_history_leadership_score_check check (
    (
      (leadership_score >= 1)
      and (leadership_score <= 10)
    )
  ),
  constraint analysis_history_education_score_check check (
    (
      (education_score >= 1)
      and (education_score <= 10)
    )
  ),
  constraint analysis_history_years_of_experience_check check ((years_of_experience >= 0)),
  constraint analysis_history_overall_score_check check (
    (
      (overall_score >= 1.0)
      and (overall_score <= 10.0)
    )
  ),
  constraint analysis_history_experience_level_check check (
    (
      (experience_level)::text = any (
        (
          array[
            'Entry-Level'::character varying,
            'Junior'::character varying,
            'Mid-Level'::character varying,
            'Senior'::character varying,
            'Lead/Principal'::character varying,
            'Executive'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_analysis_history_user_created on public.analysis_history using btree (user_id, created_at desc) TABLESPACE pg_default;

create index IF not exists idx_analysis_history_experience_level on public.analysis_history using btree (experience_level) TABLESPACE pg_default;

create index IF not exists idx_analysis_history_overall_score on public.analysis_history using btree (overall_score desc) TABLESPACE pg_default;

create index IF not exists idx_analysis_history_years_exp on public.analysis_history using btree (years_of_experience) TABLESPACE pg_default;

create index IF not exists idx_analysis_history_missing_skills on public.analysis_history using gin (missing_skills) TABLESPACE pg_default;

create index IF not exists idx_analysis_history_suggestions on public.analysis_history using gin (suggestions) TABLESPACE pg_default;

create index IF not exists idx_analysis_history_full_analysis on public.analysis_history using gin (full_analysis) TABLESPACE pg_default;

create trigger update_analysis_history_updated_at BEFORE
update on analysis_history for EACH row
execute FUNCTION update_updated_at_column ();