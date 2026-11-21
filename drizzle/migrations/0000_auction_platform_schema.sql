create extension if not exists pg_cron;

create type public.app_role as enum ('buyer', 'seller');
create type public.auction_status as enum ('upcoming', 'active', 'completed');
create type public.item_condition as enum ('new', 'like_new', 'excellent', 'good', 'fair');
create type public.notification_type as enum (
  'bid_placed', 'outbid', 'new_bid_received', 'ending_soon',
  'auction_completed', 'auction_won', 'auction_lost', 'listing_created'
);

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 500),
  location text check (location is null or char_length(location) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.profiles to anon, authenticated;
grant update (display_name, avatar_url, bio, location) on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Profiles are publicly readable" on public.profiles for select to anon, authenticated using (true);
create policy "Users update own profile" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- PRODUCTS
create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null,
  name text not null check (char_length(name) between 3 and 120),
  description text not null check (char_length(description) between 10 and 4000),
  category text not null check (category in ('Electronics','Collectibles','Fashion','Furniture','Gadgets','Art')),
  condition public.item_condition not null,
  image_urls text[] not null default '{}' check (cardinality(image_urls) <= 6),
  created_at timestamptz not null default now(),
  constraint products_seller_id_fkey foreign key (seller_id) references public.profiles(id) on delete cascade
);
create index products_seller_idx on public.products(seller_id);
grant select on public.products to anon, authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "Products are publicly readable" on public.products for select to anon, authenticated using (true);

-- AUCTIONS
create table public.auctions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique,
  seller_id uuid not null,
  starting_price numeric(12,2) not null check (starting_price > 0),
  min_increment numeric(12,2) not null default 1 check (min_increment > 0),
  current_bid numeric(12,2),
  highest_bidder_id uuid,
  bid_count integer not null default 0,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status public.auction_status not null default 'upcoming',
  winner_id uuid,
  final_price numeric(12,2),
  closed_at timestamptz,
  ending_soon_notified boolean not null default false,
  created_at timestamptz not null default now(),
  constraint auctions_time_order check (end_time > start_time),
  constraint auctions_product_id_fkey foreign key (product_id) references public.products(id) on delete cascade,
  constraint auctions_seller_id_fkey foreign key (seller_id) references public.profiles(id) on delete cascade,
  constraint auctions_highest_bidder_id_fkey foreign key (highest_bidder_id) references public.profiles(id) on delete set null,
  constraint auctions_winner_id_fkey foreign key (winner_id) references public.profiles(id) on delete set null
);
create index auctions_status_end_idx on public.auctions(status, end_time);
create index auctions_seller_idx on public.auctions(seller_id);
create index auctions_winner_idx on public.auctions(winner_id);
grant select on public.auctions to anon, authenticated;
grant all on public.auctions to service_role;
alter table public.auctions enable row level security;
create policy "Auctions are publicly readable" on public.auctions for select to anon, authenticated using (true);

-- BIDS
create table public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null,
  bidder_id uuid not null,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  constraint bids_auction_id_fkey foreign key (auction_id) references public.auctions(id) on delete cascade,
  constraint bids_bidder_id_fkey foreign key (bidder_id) references public.profiles(id) on delete cascade,
  constraint bids_unique_amount unique (auction_id, amount)
);
create index bids_auction_amount_idx on public.bids(auction_id, amount desc);
create index bids_bidder_idx on public.bids(bidder_id);
grant select on public.bids to anon, authenticated;
grant all on public.bids to service_role;
alter table public.bids enable row level security;
create policy "Bids are publicly readable" on public.bids for select to anon, authenticated using (true);

-- NOTIFICATIONS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type public.notification_type not null,
  message text not null,
  auction_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notifications_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint notifications_auction_id_fkey foreign key (auction_id) references public.auctions(id) on delete cascade
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
grant select, delete on public.notifications to authenticated;
grant update (read) on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "Users read own notifications" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "Users mark own notifications" on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own notifications" on public.notifications for delete to authenticated using (auth.uid() = user_id);

-- updated_at
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- NEW USER: profile + chosen role (buyer or seller only)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_role text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(coalesce(new.email, 'member'), '@', 1)
  );
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, left(v_name, 60), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;

  v_role := new.raw_user_meta_data->>'role';
  if v_role not in ('buyer', 'seller') or v_role is null then
    v_role := 'buyer';
  end if;
  insert into public.user_roles (user_id, role) values (new.id, v_role::public.app_role)
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Members may add the other marketplace role to themselves
create or replace function public.add_my_role(p_role public.app_role) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), p_role) on conflict do nothing;
end $$;

-- CREATE LISTING (product + auction atomically)
create or replace function public.create_listing(
  p_name text, p_description text, p_category text, p_condition public.item_condition,
  p_image_urls text[], p_starting_price numeric, p_min_increment numeric,
  p_start_time timestamptz, p_end_time timestamptz
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_product uuid;
  v_auction uuid;
  v_now timestamptz := clock_timestamp();
  v_start timestamptz;
begin
  if v_uid is null then raise exception 'Please sign in to create a listing.'; end if;
  if not public.has_role(v_uid, 'seller') then raise exception 'Only seller accounts can create listings.'; end if;
  if p_name is null or char_length(trim(p_name)) < 3 then raise exception 'Product name must be at least 3 characters.'; end if;
  if p_description is null or char_length(trim(p_description)) < 10 then raise exception 'Description must be at least 10 characters.'; end if;
  if p_starting_price is null or p_starting_price <= 0 then raise exception 'Starting price must be greater than zero.'; end if;
  if p_starting_price > 10000000 then raise exception 'Starting price is too high.'; end if;
  if p_min_increment is null or p_min_increment <= 0 then raise exception 'Minimum increment must be greater than zero.'; end if;
  if p_end_time is null or p_start_time is null then raise exception 'Start and end times are required.'; end if;
  v_start := greatest(p_start_time, v_now);
  if p_start_time < v_now - interval '5 minutes' then raise exception 'Start time cannot be in the past.'; end if;
  if p_end_time <= v_start + interval '1 minute' then raise exception 'The auction must run for at least 1 minute.'; end if;
  if p_end_time > v_start + interval '60 days' then raise exception 'Auctions can run for at most 60 days.'; end if;

  insert into public.products (seller_id, name, description, category, condition, image_urls)
  values (v_uid, trim(p_name), trim(p_description), p_category, p_condition, coalesce(p_image_urls, '{}'))
  returning id into v_product;

  insert into public.auctions (product_id, seller_id, starting_price, min_increment, start_time, end_time, status)
  values (v_product, v_uid, round(p_starting_price, 2), round(p_min_increment, 2), v_start, p_end_time,
          case when v_start <= v_now then 'active'::public.auction_status else 'upcoming'::public.auction_status end)
  returning id into v_auction;

  insert into public.notifications (user_id, type, message, auction_id)
  values (v_uid, 'listing_created', format('Your listing "%s" is live on the marketplace.', trim(p_name)), v_auction);

  return v_auction;
end $$;

-- PLACE BID (atomic, row-locked, server clock)
create or replace function public.place_bid(p_auction_id uuid, p_amount numeric) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  a public.auctions%rowtype;
  v_now timestamptz;
  v_min numeric;
  v_prev uuid;
  v_name text;
  v_bid uuid;
begin
  if v_uid is null then raise exception 'Please sign in to place a bid.'; end if;
  if not public.has_role(v_uid, 'buyer') then raise exception 'Only buyer accounts can bid. Turn on buying in your profile.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter a valid bid amount.'; end if;
  if p_amount <> round(p_amount, 2) then raise exception 'Bids can have at most 2 decimal places.'; end if;
  if p_amount > 100000000 then raise exception 'That bid is too large.'; end if;

  select * into a from public.auctions where id = p_auction_id for update;
  if not found then raise exception 'Auction not found.'; end if;

  v_now := clock_timestamp();
  if a.seller_id = v_uid then raise exception 'You cannot bid on your own auction.'; end if;
  if a.status = 'completed' or v_now >= a.end_time then raise exception 'This auction has ended. Bids are no longer accepted.'; end if;
  if v_now < a.start_time then raise exception 'This auction has not started yet.'; end if;
  if a.highest_bidder_id = v_uid then raise exception 'You are already the highest bidder.'; end if;

  v_min := case when a.current_bid is null then a.starting_price else a.current_bid + a.min_increment end;
  if p_amount < v_min then
    raise exception 'Your bid must be at least $%.', to_char(v_min, 'FM999,999,999,990.00');
  end if;

  v_prev := a.highest_bidder_id;
  select name into v_name from public.products where id = a.product_id;

  insert into public.bids (auction_id, bidder_id, amount, created_at) values (a.id, v_uid, p_amount, v_now) returning id into v_bid;
  update public.auctions
     set current_bid = p_amount, highest_bidder_id = v_uid, bid_count = bid_count + 1, status = 'active'
   where id = a.id;

  insert into public.notifications (user_id, type, message, auction_id) values
    (v_uid, 'bid_placed', format('Your bid of $%s on "%s" is now the highest.', to_char(p_amount, 'FM999,999,999,990.00'), v_name), a.id),
    (a.seller_id, 'new_bid_received', format('New bid of $%s on "%s".', to_char(p_amount, 'FM999,999,999,990.00'), v_name), a.id);
  if v_prev is not null then
    insert into public.notifications (user_id, type, message, auction_id) values
      (v_prev, 'outbid', format('You were outbid on "%s". The new high bid is $%s.', v_name, to_char(p_amount, 'FM999,999,999,990.00')), a.id);
  end if;

  return json_build_object('bid_id', v_bid, 'amount', p_amount, 'next_minimum', p_amount + a.min_increment);
end $$;

-- PROCESS AUCTIONS: open, warn, close (idempotent, server clock)
create or replace function public.process_auctions() returns integer
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_now timestamptz := clock_timestamp();
  v_closed integer := 0;
  v_name text;
  v_price text;
begin
  update public.auctions set status = 'active'
   where status = 'upcoming' and start_time <= v_now and end_time > v_now;

  for r in
    select a.* from public.auctions a
     where a.status = 'active' and not a.ending_soon_notified
       and a.end_time > v_now and a.end_time <= v_now + interval '10 minutes'
     for update skip locked
  loop
    select name into v_name from public.products where id = r.product_id;
    insert into public.notifications (user_id, type, message, auction_id)
    select distinct b.bidder_id, 'ending_soon'::public.notification_type,
           format('"%s" ends in less than 10 minutes.', v_name), r.id
      from public.bids b where b.auction_id = r.id;
    update public.auctions set ending_soon_notified = true where id = r.id;
  end loop;

  for r in
    select a.* from public.auctions a
     where a.status <> 'completed' and a.end_time <= v_now
     for update skip locked
  loop
    select name into v_name from public.products where id = r.product_id;
    update public.auctions
       set status = 'completed', closed_at = v_now,
           winner_id = r.highest_bidder_id, final_price = r.current_bid
     where id = r.id;
    v_closed := v_closed + 1;

    if r.highest_bidder_id is not null then
      v_price := to_char(r.current_bid, 'FM999,999,999,990.00');
      insert into public.notifications (user_id, type, message, auction_id) values
        (r.highest_bidder_id, 'auction_won', format('You won "%s" for $%s!', v_name, v_price), r.id),
        (r.seller_id, 'auction_completed', format('"%s" sold for $%s.', v_name, v_price), r.id);
      insert into public.notifications (user_id, type, message, auction_id)
      select distinct b.bidder_id, 'auction_lost'::public.notification_type,
             format('"%s" closed at $%s. Another bidder won.', v_name, v_price), r.id
        from public.bids b where b.auction_id = r.id and b.bidder_id <> r.highest_bidder_id;
    else
      insert into public.notifications (user_id, type, message, auction_id) values
        (r.seller_id, 'auction_completed', format('"%s" ended with no bids.', v_name), r.id);
    end if;
  end loop;

  return v_closed;
end $$;

revoke execute on function public.place_bid(uuid, numeric) from public, anon;
revoke execute on function public.create_listing(text, text, text, public.item_condition, text[], numeric, numeric, timestamptz, timestamptz) from public, anon;
revoke execute on function public.add_my_role(public.app_role) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.place_bid(uuid, numeric) to authenticated;
grant execute on function public.create_listing(text, text, text, public.item_condition, text[], numeric, numeric, timestamptz, timestamptz) to authenticated;
grant execute on function public.add_my_role(public.app_role) to authenticated;
grant execute on function public.process_auctions() to anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

alter publication supabase_realtime add table public.auctions;
alter publication supabase_realtime add table public.bids;
alter publication supabase_realtime add table public.notifications;
alter table public.auctions replica identity full;
alter table public.notifications replica identity full;