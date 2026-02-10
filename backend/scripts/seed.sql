WITH property_data AS (
  INSERT INTO properties (id, name, address, city, state, zip_code, status)
  VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Park Meadows Apartments', '123 Main St', 'Denver', 'CO', '80206', 'active')
  RETURNING id
),
unit_type_data AS (
  INSERT INTO unit_types (property_id, name, bedrooms, bathrooms, square_footage)
  SELECT id, '1BR/1BA', 1, 1, 700
  FROM property_data
  RETURNING id, property_id
),
units_data AS (
  INSERT INTO units (property_id, unit_type_id, unit_number, floor, status)
  SELECT
    ut.property_id,
    ut.id,
    (100 + gs.n)::text,
    FLOOR(gs.n / 10) + 1,
    'occupied'
  FROM unit_type_data ut
  CROSS JOIN generate_series(1, 20) AS gs(n)
  RETURNING id, property_id, unit_type_id, unit_number
),
unit_pricing_data AS (
  INSERT INTO unit_pricing (unit_id, base_rent, market_rent, effective_date)
  SELECT id, 1600, 1600, CURRENT_DATE
  FROM units_data
  RETURNING unit_id
),
resident_1 AS (
  INSERT INTO residents (property_id, unit_id, first_name, last_name, email, status)
  SELECT property_id, id, 'Jane', 'Doe', 'jane.doe@example.com', 'active'
  FROM units_data WHERE unit_number = '101'
  RETURNING id, property_id, unit_id
),
lease_1 AS (
  INSERT INTO leases (property_id, resident_id, unit_id, lease_start_date, lease_end_date, monthly_rent, lease_type, status)
  SELECT property_id, id, unit_id, '2023-01-15', CURRENT_DATE + INTERVAL '45 days', 1400, 'fixed', 'active'
  FROM resident_1
  RETURNING id, property_id, resident_id
),
payments_1 AS (
  INSERT INTO resident_ledger (property_id, resident_id, transaction_type, charge_code, amount, transaction_date)
  SELECT
    r.property_id,
    r.id,
    'payment',
    'rent',
    1400,
    CURRENT_DATE - INTERVAL '1 month' * (6 - gs.n)
  FROM resident_1 r
  CROSS JOIN generate_series(0, 5) AS gs(n)
  RETURNING id
),
resident_2 AS (
  INSERT INTO residents (property_id, unit_id, first_name, last_name, email, status)
  SELECT property_id, id, 'John', 'Smith', 'john.smith@example.com', 'active'
  FROM units_data WHERE unit_number = '102'
  RETURNING id, property_id, unit_id
),
lease_2 AS (
  INSERT INTO leases (property_id, resident_id, unit_id, lease_start_date, lease_end_date, monthly_rent, lease_type, status)
  SELECT property_id, id, unit_id, '2023-01-15', CURRENT_DATE + INTERVAL '60 days', 1500, 'fixed', 'active'
  FROM resident_2
  RETURNING id, property_id, resident_id
),
payments_2 AS (
  INSERT INTO resident_ledger (property_id, resident_id, transaction_type, charge_code, amount, transaction_date)
  SELECT
    r.property_id,
    r.id,
    'payment',
    'rent',
    1500,
    CURRENT_DATE - INTERVAL '1 month' * (6 - gs.n)
  FROM resident_2 r
  CROSS JOIN generate_series(0, 4) AS gs(n)
  RETURNING id
),
resident_3 AS (
  INSERT INTO residents (property_id, unit_id, first_name, last_name, email, status)
  SELECT property_id, id, 'Alice', 'Johnson', 'alice.johnson@example.com', 'active'
  FROM units_data WHERE unit_number = '103'
  RETURNING id, property_id, unit_id
),
lease_3 AS (
  INSERT INTO leases (property_id, resident_id, unit_id, lease_start_date, lease_end_date, monthly_rent, lease_type, status)
  SELECT property_id, id, unit_id, '2023-06-15', CURRENT_DATE + INTERVAL '180 days', 1600, 'fixed', 'active'
  FROM resident_3
  RETURNING id, property_id, resident_id
),
payments_3 AS (
  INSERT INTO resident_ledger (property_id, resident_id, transaction_type, charge_code, amount, transaction_date)
  SELECT
    r.property_id,
    r.id,
    'payment',
    'rent',
    1600,
    CURRENT_DATE - INTERVAL '1 month' * (6 - gs.n)
  FROM resident_3 r
  CROSS JOIN generate_series(0, 5) AS gs(n)
  RETURNING id
),
renewal_3 AS (
  INSERT INTO renewal_offers (property_id, resident_id, lease_id, renewal_start_date, renewal_end_date, proposed_rent, status)
  SELECT
    l.property_id,
    l.resident_id,
    l.id,
    CURRENT_DATE + INTERVAL '180 days',
    CURRENT_DATE + INTERVAL '545 days',
    1650,
    'pending'
  FROM lease_3 l
  RETURNING id
),
resident_4 AS (
  INSERT INTO residents (property_id, unit_id, first_name, last_name, email, status)
  SELECT property_id, id, 'Bob', 'Williams', 'bob.williams@example.com', 'active'
  FROM units_data WHERE unit_number = '104'
  RETURNING id, property_id, unit_id
),
lease_4 AS (
  INSERT INTO leases (property_id, resident_id, unit_id, lease_start_date, lease_end_date, monthly_rent, lease_type, status)
  SELECT property_id, id, unit_id, '2024-12-01', '2025-01-01', 1450, 'month_to_month', 'active'
  FROM resident_4
  RETURNING id, property_id, resident_id
),
payments_4 AS (
  INSERT INTO resident_ledger (property_id, resident_id, transaction_type, charge_code, amount, transaction_date)
  SELECT
    r.property_id,
    r.id,
    'payment',
    'rent',
    1450,
    CURRENT_DATE - INTERVAL '1 month' * (6 - gs.n)
  FROM resident_4 r
  CROSS JOIN generate_series(0, 5) AS gs(n)
  RETURNING id
)
SELECT 'Seed data inserted successfully!' AS result;
