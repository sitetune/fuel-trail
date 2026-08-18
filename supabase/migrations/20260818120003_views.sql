-- Reporting helpers. All remain organization-scoped via RLS on base tables
-- (ordinary views inherit caller rights; no security definer).

create or replace view public.latest_fuel_estimates
with (security_invoker = true) as
select distinct on (e.truck_id)
  e.id,
  e.organization_id,
  e.truck_id,
  e.receipt_id,
  e.estimated_before_gallons,
  e.purchased_gallons,
  e.estimated_after_gallons,
  e.odometer,
  e.confidence,
  e.method,
  e.calculated_at,
  e.calculation_json
from public.fuel_level_estimates e
order by e.truck_id, e.calculated_at desc;

create or replace view public.station_latest_prices
with (security_invoker = true) as
select distinct on (p.station_id, p.fuel_type)
  p.id,
  p.organization_id,
  p.station_id,
  p.fuel_type,
  p.cash_price,
  p.credit_price,
  p.discounted_price,
  coalesce(p.discounted_price, p.cash_price, p.credit_price) as displayed_price,
  p.observed_at,
  p.source,
  p.source_reference
from public.fuel_price_snapshots p
order by p.station_id, p.fuel_type, p.observed_at desc;

create or replace view public.monthly_truck_fuel_metrics
with (security_invoker = true) as
select
  r.organization_id,
  r.truck_id,
  date_trunc('month', r.purchased_at) as month_start,
  count(*) as receipt_count,
  coalesce(sum(r.gallons), 0) as gallons,
  coalesce(sum(r.total_amount), 0) as spend,
  case
    when coalesce(sum(r.gallons), 0) > 0 then sum(r.total_amount) / sum(r.gallons)
    else null
  end as avg_price,
  min(r.odometer) as min_odometer,
  max(r.odometer) as max_odometer
from public.fuel_receipts r
where r.status in ('submitted', 'verified')
  and r.purchased_at is not null
group by r.organization_id, r.truck_id, date_trunc('month', r.purchased_at);

create or replace view public.quarterly_fuel_purchases
with (security_invoker = true) as
select
  r.organization_id,
  r.truck_id,
  r.merchant_region as jurisdiction,
  r.fuel_type,
  date_trunc('quarter', r.purchased_at) as quarter_start,
  count(*) as receipt_count,
  coalesce(sum(r.gallons), 0) as gallons,
  coalesce(sum(r.total_amount), 0) as total_amount,
  coalesce(sum(r.tax_amount), 0) as tax_amount
from public.fuel_receipts r
where r.status in ('submitted', 'verified')
  and r.purchased_at is not null
group by
  r.organization_id,
  r.truck_id,
  r.merchant_region,
  r.fuel_type,
  date_trunc('quarter', r.purchased_at);

create or replace view public.receipt_review_counts
with (security_invoker = true) as
select
  organization_id,
  truck_id,
  count(*) filter (where status in ('needs_review', 'submitted')) as needs_review_count,
  count(*) filter (where duplicate_of is not null and duplicate_override = false) as duplicate_warning_count,
  count(*) filter (where status = 'rejected') as rejected_count
from public.fuel_receipts
group by organization_id, truck_id;

grant select on public.latest_fuel_estimates to authenticated;
grant select on public.station_latest_prices to authenticated;
grant select on public.monthly_truck_fuel_metrics to authenticated;
grant select on public.quarterly_fuel_purchases to authenticated;
grant select on public.receipt_review_counts to authenticated;
