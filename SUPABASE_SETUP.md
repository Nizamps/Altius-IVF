# Supabase Setup

1. Run `supabase.sql` in the Supabase SQL Editor.
2. Create staff users under Authentication → Users.
3. Keep the publishable key in `supabase-config.js`; never put a service-role/secret key in the frontend.
4. Deploy the flat files to the root of GitHub Pages.

The existing `patients.patient_data` JSONB structure now stores `programType`, `lmp`, `edd`, `maternityPackage`, and `maternity` trimester rows alongside the IVF data.
