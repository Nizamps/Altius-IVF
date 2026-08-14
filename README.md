# Altius IVF & Maternity Tracker

GitHub Pages-ready, Supabase-backed tracker for IVF and maternity patients.

## Program filter
The dashboard has an **All / IVF / Maternity** filter. Patient records are tagged with `programType` and use separate workflows.

## Maternity workflow
Maternity patients have Trimester 1, 2 and 3 tabs. The tracker follows the supplied maternity CSV:
- Trimester 1: up to 12 weeks — 13 blood investigations, 1 scan, unlimited consultation; package reference ₹15,000.
- Trimester 2: 13–28 weeks — 4 blood investigations, 3 scans, unlimited consultation; package reference ₹12,000.
- Trimester 3: 29 weeks until delivery — 9 blood investigations, 2 scans, unlimited consultation; package reference ₹10,000.

The CSV does **not** provide individual test/scan names. Therefore the app creates numbered slots and lets the clinical team replace each slot with the exact test or scan name and mark it Pending/Done (or the other available statuses).

## Supabase
Run `supabase.sql` once in the Supabase SQL Editor. The existing JSONB patient model means no additional database migration is required for the maternity fields.
