# DD Cottages booking admin

## Start locally

1. Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable key.
2. In the Supabase SQL Editor, run `supabase/schema.sql`.
3. Run `npm install`, then `npm run dev`.

The 15 rooms are configured as 1–15 in `src/data.js`. Change this list if your physical room labels differ. The included RLS policy is deliberately for a quick prototype; enable Supabase Auth and replace it before deploying publicly.
