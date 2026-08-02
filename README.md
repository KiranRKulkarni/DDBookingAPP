# Down da village booking admin

## Start locally

1. Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable key.
2. In the Supabase SQL Editor, run `supabase/schema.sql`.
3. Run `npm install`, then `npm run dev`.

Down da village is configured as one 40-unit inventory in `src/data.js`: Deluxe Room (3), 2BHK Villa (1), Standard Room (14), Family Room (6), Family Quad Room (6), and Deluxe Quad Room (10). The included RLS policy is deliberately for a quick prototype; enable Supabase Auth and replace it before deploying publicly.
