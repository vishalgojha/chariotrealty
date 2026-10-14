-- Curated new-development inventory for the dedicated public collection.
-- The rows remain normal CMS listings: they can be edited, unpublished, or
-- supplemented with photos from the admin inventory desk at any time.
insert into public.chariot_properties (
  slug, name, category, locality, micro_market, location,
  price, price_value, price_unit, carpet_area_sqft, configuration, parking,
  possession, status, source, published_at, custom_fields
)
values
  (
    '60-perry-cross',
    '60 Perry Cross',
    'under-construction',
    'Bandra West',
    'Bandra West',
    'Chimbai Road, off Perry Cross Road, Bandra West',
    '₹90,000 / sqft ++',
    90000,
    'per_sqft',
    1437,
    '3 BHK',
    2,
    'December 2029',
    'published',
    'chariot_admin',
    now(),
    jsonb_build_object(
      'developer', 'Urbania Realty',
      'project_details', jsonb_build_array('Developer: Urbania Realty', '19 floors', 'Two apartments per floor', 'Available 3 BHK carpet areas: 1,437, 1,460, 1,806, 1,826 and 3,632 sq ft', 'Two parking slots per apartment', 'Five podium parking levels', 'Plot size: 1,600 sq m', 'Bare shell', 'Maintenance: ₹18 per sq ft'),
      'amenities', jsonb_build_array('Ramp parking', 'Vastu approved', 'Column-less structure', 'Sea-view apartments', 'Grand lobby', 'Concierge services', 'Kids play area', 'Library', 'Cafeteria', 'Business centre', 'Theatre', 'Rock climbing'),
      'public_description', 'An under-construction Urbania Realty development on Chimbai Road, off Perry Cross Road in Bandra West. The 19-storey project has two 3 BHK residences per floor, with available carpet areas of 1,437, 1,460, 1,806, 1,826 and 3,632 sq ft. Each residence includes two parking slots. The project is planned with five podium parking levels, ramp access, a column-less structure and sea-view apartments. Possession is scheduled for December 2029.'
    )
  ),
  (
    '46-juhu',
    '46 Juhu',
    'under-construction',
    'Juhu',
    'Juhu',
    '11th Road, JVPD Scheme, Juhu',
    '₹75,000 / sqft ++',
    75000,
    'per_sqft',
    1672,
    '3 & 4 BHK + Penthouse',
    3,
    'June 2028',
    'published',
    'chariot_admin',
    now(),
    jsonb_build_object(
      'developer', 'Urbania Realty',
      'project_details', jsonb_build_array('Developer: Urbania Realty', '12 floors', 'One apartment per floor', 'Available carpet areas: 3 BHK 1,672 sq ft; 4 BHK 2,349 and 3,085 sq ft; penthouse 6,570 sq ft including a 400 sq ft terrace', 'Three parking slots per apartment', 'Two basement parking levels', 'Plot size: 670 sq m', 'Bare shell', 'Maintenance: ₹18–20 per sq ft', 'MahaRERA: P51800052291'),
      'amenities', jsonb_build_array('Ramp parking', 'Vastu approved', 'Column-less structure', '10.5 ft floor-to-ceiling height', 'Indoor games room', 'Indoor lounge', 'Outdoor lounge', 'Multipurpose court', 'Yoga zone'),
      'public_description', '46 Juhu is an under-construction Urbania Realty residence on 11th Road in JVPD Scheme, Juhu. The 12-storey project is planned for one apartment per floor, with a 3 BHK at 1,672 sq ft, 4 BHK residences at 2,349 and 3,085 sq ft, and a 6,570 sq ft penthouse including a 400 sq ft terrace. Each residence includes three parking slots. The project is designed with ramp parking, Vastu-compliant planning, a column-less structure and 10.5 ft floor-to-ceiling height. Possession is scheduled for June 2028.'
    )
  )
on conflict (slug) do nothing;
