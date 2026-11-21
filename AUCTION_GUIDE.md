# Hammerline: Real-Time Auction & Bidding Platform Guide

This document details the architecture, real-time mechanisms, role management, and operational workflows for the Hammerline platform, built to satisfy **Problem Statement 06 (Real-Time Auction & Bidding Platform)**.

---

## 1. System Architecture & Backend Connectivity

The application connects a **TanStack Start (React 19)** frontend with a **Supabase (PostgreSQL, Realtime, Auth, Storage)** backend:

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend Clients                      │
│   (Auctions Marketplace, Live Detail Floor, Hubs, /sell)    │
└──────────────┬───────────────────────────────▲──────────────┘
               │                               │
       PostgREST Queries /                     │ Supabase Realtime
       Atomic RPCs                             │ (Postgres Changes via
       (place_bid, create_listing)             │  WebSockets)
               │                               │
┌──────────────▼───────────────────────────────┴──────────────┐
│                    Supabase / PostgreSQL                    │
│                                                             │
│  • auctions (Row-level locked concurrency)                  │
│  • bids (Atomic insert with strict validation)             │
│  • products (Full descriptions & image relations)           │
│  • notifications (Live event dispatches)                    │
│  • profiles & user_roles (Multi-role authorization)         │
│  • process_auctions() (Automated state transitions & close) │
└─────────────────────────────────────────────────────────────┘
```

### Key Environment Variables (`.env`)
```bash
SUPABASE_PROJECT_ID="hnrdwqjbfkndmctwxwbu"
SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_URL="https://c--83ae6c7a-e7dd-4e0c-9406-5f1ba044aa6e-prod.lovable.cloud"
VITE_SUPABASE_PROJECT_ID="..."
VITE_SUPABASE_PUBLISHABLE_KEY="..."
VITE_SUPABASE_URL="..."
```

---

## 2. Core Operational Workflows

### 2.1. Buyer Experience
1. **Discovery**: Browse the marketplace (`/auctions`) with live tabs ("Live now", "Ending in 24h", "Upcoming", "Completed") and category filters.
2. **Live Bidding Floor (`/auctions/:id`)**:
   - Live high bid flashes on updates without refreshing.
   - Chronological bid history displaying bidder names, timestamps, and leading badges.
   - Quick bid increment suggestions (`min`, `min + increment`, `min + 3*increment`).
   - In-flight concurrency protection: If a competing bid is placed while the confirmation modal is open, the modal warns the user and offers a 1-click update.
3. **Buyer Dashboard (`/dashboard`)**:
   - Filter active bids with clear visual cues:
     - 👑 **Leading**: User holds the highest offer.
     - ⚠️ **Outbid**: Another bidder raised the price (quick link to re-bid).
     - 🏆 **Won**: Completed lots won by the user with final price and claim details.

### 2.2. Seller Experience
1. **Activation**: Members can toggle/enable seller privileges on their `/profile` or directly when visiting `/sell`.
2. **Creating an Auction Listing (`/sell`)**:
   - Item details: Title (3–120 chars), Category (6 options), Condition (5 options), Description (10–4000 chars).
   - Photos: Upload up to 6 images directly, paste custom URLs, or select high-res demo presets.
   - Pricing & Timing: Starting price, minimum increment, start schedule, and duration (1, 3, 5, 7 days).
3. **Seller Dashboard (`/dashboard`)**:
   - Monitor live incoming bids across inventory in real-time.
   - View high bidder identities and closing countdowns.
   - Review completed auctions and final prices.

---

## 3. Real-Time Concurrency & Concurrency Rules

### 3.1. Atomic Concurrency Control (`place_bid`)
* Every bid placement acquires an exclusive row lock on the target auction:
  ```sql
  SELECT * FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  ```
* Validates server timestamp against `end_time` using PostgreSQL `clock_timestamp()`.
* Ensures bid is strictly greater than or equal to `current_bid + min_increment`.
* Updates auction state, records the bid, and atomically dispatches `bid_placed`, `new_bid_received`, and `outbid` notifications.

### 3.2. Background Auto-Closing & Lifecycle Sync
* Handled seamlessly through `useAuctionLifecycleSync()` running in the app background.
* Invokes `process_auctions()` every 45 seconds to:
  - Transition upcoming auctions to `active`.
  - Send 10-minute `ending_soon` warnings to active bidders.
  - Close expired auctions, assign `winner_id` and `final_price`, and dispatch `auction_won` / `auction_completed` / `auction_lost` notifications.

---

## 4. Optional Supabase Configuration (Storage & `pg_cron`)

If you manage the Supabase project directly in the Supabase Dashboard, you can execute the following SQL in the SQL Editor to enable public storage and server-side cron:

```sql
-- 1. Ensure the product-images bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow public read access to product images for guest visitors
CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

-- 3. Schedule automated lifecycle processing every minute via pg_cron
SELECT cron.schedule('process-auctions-cron', '* * * * *', 'SELECT public.process_auctions();');
```

---

## 5. Route Map

| Path | Purpose | Authentication |
| :--- | :--- | :--- |
| `/` | Landing page with closing-soon showcase & hero lot | Public |
| `/auctions` | Marketplace search, filter, and sorting | Public |
| `/auctions/:id` | Live auction bidding floor with real-time bids & countdown | Public (sign in to bid) |
| `/auth` | Member sign in and sign up with role selection | Public |
| `/dashboard` | Unified buyer & seller hub for bids and inventory | Authenticated |
| `/sell` | Listing creation flow for sellers with image uploads | Authenticated (Seller) |
| `/profile` | Profile information and role toggle manager | Authenticated |
| `/notifications` | Full notifications center with mark-all-read | Authenticated |
