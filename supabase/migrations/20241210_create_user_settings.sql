create table if not exists public.user_settings (
    user_id uuid not null references public.profiles(id) on delete cascade,
    language text not null default 'en',
    theme text not null default 'system',
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (user_id)
);

-- Enable RLS
alter table public.user_settings enable row level security;

-- Policies
create policy "Users can view their own settings"
    on public.user_settings for select
    using (auth.uid() = user_id);

create policy "Users can update their own settings"
    on public.user_settings for update
    using (auth.uid() = user_id);

create policy "Users can insert their own settings"
    on public.user_settings for insert
    with check (auth.uid() = user_id);

-- Function to handle updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger to update updated_at
create trigger handle_updated_at before update on public.user_settings
    for each row execute procedure public.handle_updated_at();

-- Function to safely get or create settings
create or replace function public.get_or_create_user_settings(request_user_id uuid)
returns json as $$
declare
    settings_record record;
begin
    insert into public.user_settings (user_id)
    values (request_user_id)
    on conflict (user_id) do nothing;

    select * into settings_record from public.user_settings where user_id = request_user_id;
    return row_to_json(settings_record);
end;
$$ language plpgsql security definer;
