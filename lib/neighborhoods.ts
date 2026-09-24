export type NeighborhoodSlug =
  | "bandra-west"
  | "bandra-east"
  | "khar-west"
  | "santacruz-west"
  | "juhu"
  | "bkc";

export type NeighborhoodFAQ = {
  q: string;
  a: string;
};

export type TransitOption = {
  label: string;
  minutesToGateway?: string;
};

export type Neighborhood = {
  slug: NeighborhoodSlug;
  name: string;
  zone: string;
  microMarkets: string[];
  priceBands: { configuration: string; lowCr: string; typicalCr: string; highCr: string; when: string }[];
  intro: string[];
  knownFor: string[];
  whoLivesHere: string;
  landmarks: string[];
  amenities: string[];
  schools: string[];
  leisure: string[];
  transit: TransitOption[];
  transitSummary: string;
  distance: { toGateway: string; toAirport: string; toStation: string };
  faqs: NeighborhoodFAQ[];
  testimonials: { quote: string; name: string; area: string; type: string }[];
  geo: { lat: number; lng: number; radiusKm: number; placeId?: string };
  image: string;
  updated: string;
  sourceNote: string;
  listingFilters: (p: { micro_market: string; locality: string; zone: string; location: string }) => boolean;
};

export const neighborhoods: Neighborhood[] = [
  {
    slug: "bandra-west",
    name: "Bandra West",
    zone: "Western Suburbs",
    microMarkets: ["Bandra West", "Bandra"],
    priceBands: [
      { configuration: "2 BHK", lowCr: "₹1.10L/mo", typicalCr: "₹1.45–1.80L/mo", highCr: "₹2.10L/mo", when: "Rent, as of Sep 2026" },
      { configuration: "3 BHK", lowCr: "₹1.80L/mo", typicalCr: "₹2.20–2.80L/mo", highCr: "₹3.40L/mo", when: "Rent, as of Sep 2026" },
      { configuration: "Sea-facing 3 BHK", lowCr: "₹2.80L/mo", typicalCr: "₹3.20–4.50L/mo", highCr: "₹6L/mo", when: "Rent, as of Sep 2026" },
    ],
    intro: [
      "Bandra West is the original soul of Mumbai's west-side premium market — where old sea-facing chawls-turned-homes, Art Deco-era buildings, and modern high-rises share the same waking hours as the city's most photographed promenade. Chariot Realty treats the corridor between Hill Road, Linking Road, and Carter Road as one micro-market, because that's how every serious tenant actually shops: by the promenade, not by the postcode.",
      "It is, by Mumbai standards, compact: roughly 2.7 sq km between the Arabian Sea and the railway line. That compactness is the point. A Bandra West address puts you within walking distance of Bandra Station, Linking Road retail, and Carter Road's chain of cafés, fitness studios, and sea-facing walks — without the commute tax that comes with island-city alternate-side privileges.",
    ],
    knownFor: [
      "The Bandra promenade (Carter Road) and its 1.5 km sea-facing walk",
      "Linking Road's high-street retail and the old-quadrant Art Deco architecture",
      "The 'Bandra of the elite' image — Bollywood-adjacent but genuinely neighbourhood-first",
      "Water taxi access to BKC via Bandra Jetty at peak-office ARRIVALS",
      "Café culture: Olympia, Candies, Bastian, GQ, and the Linking Road chain",
    ],
    whoLivesHere: "Film-industry talent, designers and creative principals at Bandra's agencies, founders and partners who prize a 15-minute walk to BKC, and a long tail of legacy residents who have watched three generations of Mumbai's taste decide where west lives.",
    landmarks: [
      "Carter Road Promenade",
      "Linking Road",
      "Hill Road (St. Andrew's Church)",
      "Bandra Station",
      "Mount Mary Church & the Fair",
      "Bandra Fort (Castella de Aguada)",
    ],
    amenities: [
      "Olympia Café & Café Basilico",
      "Candies (Hill Road)",
      "Bastian, GQ, The Good Wife",
      "The Doodle Room concept cafés",
      "Rider Gym · FitFood",
    ],
    schools: [
      "St. Andrew's High School",
      "Bandra Holy Family Hospital (care)",
      "Terra's educational cluster on Hill Road",
    ],
    leisure: [
      "Joggers' Park & Bandra Bandstand",
      "Mehboob Studios heritage walk",
      "Best Western & Taj Land's End day dining",
    ],
    transit: [
      { label: "Bandra Station — harbour + suburban lines", minutesToGateway: "0 (walk)" },
      { label: "Western Express Highway", minutesToGateway: "10 min drive" },
      { label: "BKC Connector", minutesToGateway: "12 min drive" },
      { label: "Bandra Jetty → BKC ferry", minutesToGateway: "25 min crossing" },
    ],
    transitSummary: "Bandra West connects to the city three ways at once: suburban railways on the east, the Western Express Highway on the north, and the sea on the west. The BKC connector puts the financial district 12 minutes away by car and 25 minutes by the jetty ferry.",
    distance: { toGateway: "Bandra Station is within Bandra West", toAirport: "~20–25 min to CSMIA via WEH", toStation: "Bandra Station on the corridor's east edge" },
    faqs: [
      { q: "What's the average rent for a 2BHK in Bandra West?", a: "A 2BHK in Bandra West typically rents for ₹1.10L to ₹1.80L per month depending on building age, floor, and exact street. Modern 3 BHKs run ₹1.80L to ₹2.80L, and sea-facing 3 BHKs on Carter Road command ₹3.20L to ₹4.50L per month." },
      { q: "Is Bandra West good for families or young professionals?", a: "Both, but in different pockets. New buildings near Linking Road and Waterfield Road suit young professional couples and single executives who want the walk-to-everything lifestyle. Legacy sea-facing buildings and the Pali Hill quadrant are where established families put down roots." },
      { q: "Bandra West vs BKC — which is better for a corporate rental?", a: "BKC is better if your office is IN the financial district and you value a 10-minute commute; Bandra West is better if you want an actual neighbourhood with cafés, the promenade, and retail within walking distance. Most BKC corporates who choose Bandra West do so for the lifestyle, not the commute." },
      { q: "How far is Bandra West from BKC?", a: "Bandra West to BKC is roughly 12 minutes by car across the Bandra-Kurla Connector, or 25 minutes via the Bandra Jetty water taxi. It's one of the few residential areas with a direct ferry to the office cluster." },
      { q: "Is Carter Road or Linking Road the better sea-facing address?", a: "Carter Road literally faces the sea and is the picture-postcard Bandra address; Linking Road is the commercial and retail spine. If the view and the walk matter most, Carter Road. If proximity to shopping, transport, and a reliable 24/7 high street matters more, Linking Road." },
    ],
    testimonials: [
      { quote: "Chariot found us a 3BHK off Carter Road in under two weeks — shortlisted to view exactly three places and we never left the first one we liked.", name: "Anjali & Rohan", area: "Off Carter Road, Bandra West", type: "Verified listing" },
      { quote: "We needed a sea-facing home that accepted our two dogs centralized in one building. Kapil already knew every building's pet policy before we asked.", name: "Tara M.", area: "Pali Hill area", type: "Sea-facing 3 BHK" },
    ],
    geo: { lat: 19.0596, lng: 72.8295, radiusKm: 1.4, placeId: "ChIJz8JmDIuW5zsRksBZkC9qLE" },
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
    updated: "September 2026",
    sourceNote: "Price bands are Chariot Realty market-desk estimates from closed deals and live mandates, updated September 2026. Rents shift seasonally; treat the range as indicative, not a quote.",
    listingFilters: (p) => ["Bandra West", "Bandra"].includes(p.micro_market) || p.locality.toLowerCase().includes("bandra west"),
  },
  {
    slug: "bandra-east",
    name: "Bandra East",
    zone: "Bandra East",
    microMarkets: ["Bandra East", "Kalanagar", "Kalanagar"],
    priceBands: [
      { configuration: "2 BHK", lowCr: "₹90K/mo", typicalCr: "₹1.05–1.35L/mo", highCr: "₹1.60L/mo", when: "Rent, as of Sep 2026" },
      { configuration: "3 BHK", lowCr: "₹1.25L/mo", typicalCr: "₹1.50–1.90L/mo", highCr: "₹2.40L/mo", when: "Rent, as of Sep 2026" },
      { configuration: "Under-construction 3 BHK", lowCr: "₹3.90 Cr", typicalCr: "₹4.25–5.10 Cr", highCr: "₹5.80 Cr", when: "Purchase (under construction), as of Sep 2026" },
    ],
    intro: [
      "Bandra East is the BKC-adjacent sleeper of the western suburbs — a dense, lived-in stretch between the railway line and the Bandra-Kurla Complex that most Mumbai property search starts by underestimating. Its real strength is adjacency: step out of Rustomjee Cleon or the Ten BKC residences and you are genuinely ten minutes from a Grade-A office tower in the financial district.",
      "What was once dismissed as noise-and-traffic hinterland has quietly become the city's most practical BKC-adjacent lifestyle, because the same connector that makes the office 10 minutes away also makes the sea-facing villages of Bandra West 15 minutes in the other direction. Chariot Realty tracks Kalanagar, Khar East, and the BKC-facing blocks here as one working market.",
    ],
    knownFor: [
      "Ten-minute proximity to BKC (Bandra-Kurla Complex)",
      "New under-construction mandates (Rustomjee, Lodha-adjacent parcels) with RERA approval",
      "The BKC Connector flyover dividing the eastern band",
      "Kalanagar's professional, mid-career demo",
      "Direct Western Express Highway access",
    ],
    whoLivesHere: "BKC bankers, lawyers and consultants who want a 10-minute door-to-office commute, new-development buyers taking RERA-approved under-construction at entry prices, and the growing tribe of people who bought here precisely because the office moved to BKC.",
    landmarks: [
      "BKC Connector (Bandra Kurla Complex)",
      "Kalanagar & the BKC flyover",
      "Bandra East bypass & WEH",
      "Bandra Station (via the east)",
      "Godrej BKC office cluster",
    ],
    amenities: [
      "Rustomjee Central Passage retail",
      "Pot Capital, BKC canteens",
      "Linking Road reachable via the west",
      "BKC's 5-star hotel cluster",
    ],
    schools: [
      "St. Joseph's High School (Bandra East)",
      "Terra's Hill Road schools via 5-min drive",
    ],
    leisure: [
      "BKC Green (Jio World Garden)",
      "Bandra Fort walking distance across the bridge",
    ],
    transit: [
      { label: "BKC Connector flyover", minutesToGateway: "10 min to BKC" },
      { label: "Bandra East bypass", minutesToGateway: "direct WEH" },
      { label: "Bandra Station (east)", minutesToGateway: "~8 min drive" },
    ],
    transitSummary: "Bandra East is defined by the BKC Connector: cars reach the financial district in about ten minutes, and the Western Express Highway is direct. The trade-off is that rail access means driving to Bandra Station rather than walking.",
    distance: { toGateway: "BKC via connector ~10 min", toAirport: "~25 min to CSMIA", toStation: "Bandra Station ~8 min drive" },
    faqs: [
      { q: "What's the price of a 3BHK in Bandra East?", a: "A ready 3BHK in Bandra East rents for roughly ₹1.25L to ₹1.90L per month. Under-construction 3 BHKs from RERA-approved developers (possession from 2026) price from about ₹3.90 Cr to ₹5.10 Cr." },
      { q: "Is Bandra East a good place to buy under construction?", a: "Yes if you work in BKC. New RERA-approved projects near the connector are priced below equivalent sea-facing Bandra West and hold their advantage at possession. You give up the promenade for the commute." },
      { q: "Bandra East vs Bandra West for BKC workers?", a: "Bandra East is the short-commute choice (10 minutes to BKC). Bandra West is the lifestyle choice (15 minutes but with cafés, the promenade, and retail at your door). If your office is BKC and you value sleep, Bandra East wins." },
      { q: "Is Kalanagar in Bandra East?", a: "Yes. Kalanagar is the Bandra East micro-market wrapped around the BKC connector — the Ten BKC and Rustomjee Cleon residences both sit here." },
    ],
    testimonials: [
      { quote: "We bought a Rustomjee Cleon 3BHK from Chariot because they were the only ones who actually walked us through the RERA sheet line by line before we signed.", name: "Dev & Priya", area: "Kalanagar, Bandra East", type: "Under-construction purchase" },
    ],
    geo: { lat: 19.0722, lng: 72.8433, radiusKm: 1.2, placeId: "ChIJsX9n4E2W5zsRggzOm5lU2I" },
    image: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=80",
    updated: "September 2026",
    sourceNote: "Price bands are Chariot Realty market-desk estimates from closed deals and developer mandates, updated September 2026.",
    listingFilters: (p) => ["Bandra East", "Kalanagar"].includes(p.micro_market) || p.locality.toLowerCase().includes("bandra east"),
  },
  {
    slug: "khar-west",
    name: "Khar West",
    zone: "Western Suburbs",
    microMarkets: ["Khar West", "Khar"],
    priceBands: [
      { configuration: "2 BHK", lowCr: "₹1L/mo", typicalCr: "₹1.25–1.60L/mo", highCr: "₹1.95L/mo", when: "Rent, as of Sep 2026" },
      { configuration: "3 BHK", lowCr: "₹1.55L/mo", typicalCr: "₹1.80–2.40L/mo", highCr: "₹3L/mo", when: "Rent, as of Sep 2026" },
    ],
    intro: [
      "Khar West is the quieter, timber-lined sibling of the premium western suburb cluster — the neighbourhood where 'established' still means something. Where Bandra West pulses with promenade energyholistic, Khar West trades on maturity: tree-lined residential streets, low-rise sea-block buildings, and a pace that says you have already arrived, you do not need to announce it.",
      "Its social weight comes from being bounded by three of Mumbai's most desirable edges — Bandra to the north, Santacruz to the south, Linking Road on the east and the sea to the west — which means Khar's residents borrow the best of every neighbour while keeping the calm for themselves.",
    ],
    knownFor: [
      "Juhu Tara Road's quiet sea-block residential streets",
      "The 'old money meets new money' mix along Linking Road",
      "Khar's village heart near Khar Station",
      "Proximity to both Juhu Beach and Bandra's cafés",
      "Some of the city's most interesting off-main residential lanes",
    ],
    whoLivesHere: "Bollywood's second-blanket generation, restaurateurs and café founders, legacy Parsi and Portuguese families, and young professionals who choose Khar because it feels like 'grown-up Bandra'.",
    landmarks: [
      "Juhu Tara Road",
      "Khar Station",
      "Linking Road",
      "Nargis Dutt Road",
      "Khar Gymkhana & Khar Danda sea-edge",
    ],
    amenities: [
      "Juhu Beach end (5-min walk)",
      "Linking Road retail corridor",
      "Café Roasters & specialty coffee lane",
      "Khar's wine bars and bistro strip",
    ],
    schools: [
      "Jasudben M.L. School",
      "Hill Spring International",
      "Learners' Academy (Khar)",
    ],
    leisure: [
      "Khar Gymkhana (tennis/lawn)",
      "Juhu Sea Face",
      "Linking Road night market",
    ],
    transit: [
      { label: "Khar Road Station", minutesToGateway: "core walk" },
      { label: "Linking Road (bus + taxi spine)", minutesToGateway: "direct" },
    ],
    transitSummary: "Khar is a rail-first neighbourhood: Khar Road Station anchors the west, Linking Road is the east-side commercial spine, and the sea keeps the west quiet. Most of residential Khar West is walk-or-rickshaw distance to all three.",
    distance: { toGateway: "Khar Station within Khar West", toAirport: "~20 min via WEH", toStation: "Khar Road Station at the west edge" },
    faqs: [
      { q: "How much is rent for a 2BHK in Khar West?", a: "A 2BHK in Khar West rents from about ₹1L to ₹1.60L per month. 3 BHKs run ₹1.55L to ₹2.40L, and larger sea-block configurations on the western edge can exceed ₹3L per month." },
      { q: "Khar West vs Bandra West — which is better?", a: "Bandra West wins for lifestyle and the promenade; Khar West wins for calm, mature streets and slightly gentler pricing. If you want the sea-facing buzz choose Bandra West; if you want tree-shaded lanes and value, Khar West." },
      { q: "Is Khar West good for families?", a: "Very. Khar's schools (Hill Spring, Jasudben M.L.), the gymkhana, and the calm low-rise sea-block streets make it a favourite for established families who want premium without the Bandra crowd." },
      { q: "Is Khar West close to the airport?", a: "Yes — roughly 20 minutes to CSMIA via the Western Express Highway, and Juhu's VVIP edge is almost next door." },
    ],
    testimonials: [
      { quote: "Kapil found us a 3BHK on Juhu Tara Road that let us keep our dog and our garden. Landlord's pets policy was the deciding clause and he knew it before viewing.", name: "Meera & Sid", area: "Juhu Tara Road, Khar West", type: "Verified rental" },
    ],
    geo: { lat: 19.0722, lng: 72.8433, radiusKm: 1.1, placeId: "ChIJsX9n4E2W5zsRggzOm5lU2I" },
    image: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1200&q=80",
    updated: "September 2026",
    sourceNote: "Price bands are Chariot Realty market-desk estimates, updated September 2026.",
    listingFilters: (p) => ["Khar West", "Khar"].includes(p.micro_market) || p.locality.toLowerCase().includes("khar"),
  },
  {
    slug: "santacruz-west",
    name: "Santacruz West",
    zone: "Western Suburbs",
    microMarkets: ["Santacruz", "Santacruz West"],
    priceBands: [
      { configuration: "2 BHK", lowCr: "₹95K/mo", typicalCr: "₹1.10–1.40L/mo", highCr: "₹1.70L/mo", when: "Rent, as of Sep 2026" },
      { configuration: "3 BHK", lowCr: "₹1.40L/mo", typicalCr: "₹1.60–2.10L/mo", highCr: "₹2.60L/mo", when: "Rent, as of Sep 2026" },
    ],
    intro: [
      "Santacruz West is Bandra's practical, airport-connected neighbour — the stretch the airport-to-city hotel shuttle knows bestholistic. If you fly weekly or thrice a week, this is the Mumbai address that turns 'time to the airport' from a nightmare into a scheduled leg of your day.",
      "It pairs the Western Express Highway at its door with the suburban rail line, gives you both the airport and the Bandra/BKC lifestyle within ten minutes, and hosts some of the suburbs' most established family apartments on quiet lanes off Linking Road.",
    ],
    knownFor: [
      "Western Express Highway (WEH) right at the western edge",
      "The airport corridor — 10 minutes to T1/T2 by car",
      "Santacruz's quiet residential lanes (S.V. Road side)",
      "Linking Road as its retail spine",
    ],
    whoLivesHere: "Frequent flyers, airline and airport-adjacent professionals, families who want airport connectivity plus the suburbs' schools, and value-conscious premium renters who skip Bandra's premium.",
    landmarks: [
      "Santacruz Railway Station",
      "Western Express Highway",
      "S.V. Road",
      "Linking Road (south end)",
      "Vakola & Santacruz East connector",
    ],
    amenities: [
      "Direct WEH access",
      "Linking Road retail",
      "Santacruz's bistro & tavern quarter",
    ],
    schools: [
      "Ramnarain Ruia (Santacruz East)",
      "N.L. College",
      "The Kherwadi Educational Society cluster",
    ],
    leisure: [
      "Juhu Beach 10 min north",
      "Linking Road night market",
      "Suburbs' cinema & dining spine",
    ],
    transit: [
      { label: "Western Express Highway", minutesToGateway: "airport 10–12 min" },
      { label: "Santacruz Station", minutesToGateway: "rail to CST/Churchgate" },
    ],
    transitSummary: "Santacruz West runs on the Western Express Highway. The airport is 10–12 minutes by car, linking you to the suburbs' entire eastern corridor, while Santacruz Station serves the rail commuter.",
    distance: { toGateway: "WEH at the door", toAirport: "10–12 min to CSMIA", toStation: "Santacruz Station on the east edge" },
    faqs: [
      { q: "How much is a 2BHK in Santacruz West?", a: "A 2BHK rents from about ₹95K to ₹1.40L per month; 3 BHKs run ₹1.40L to ₹2.10L. Pricing sits noticeably below equivalent Bandra West — the trade is commute popularity for value." },
      { q: "Is Santacruz West close to the airport?", a: "Yes — 10 to 12 minutes from CSMIA terminals by car via the Western Express Highway, plus the airport corridor's dedicated shuttle lanes." },
      { q: "Santacruz West vs Bandra West for families?", a: "Bandra West has the lifestyle premium and schools cachet; Santacruz West has airport connectivity, quieter lanes, and rent 15–20% lower for the same configuration. Families who fly often pick Santacruz." },
    ],
    testimonials: [
      { quote: "I flight in and out weekly. Kapil shortlisted Santacruz 3BHKs within 10 minutes of the airport and we closed in nine days.", name: "Kabir S.", area: "Santacruz West", type: "Airport-commute rental" },
    ],
    geo: { lat: 19.0596, lng: 72.8295, radiusKm: 1.3, placeId: "ChIJfwM0nYOX5zsRGA3rbYQJAA" },
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
    updated: "September 2026",
    sourceNote: "Price bands are Chariot Realty market-desk estimates, updated September 2026.",
    listingFilters: (p) => ["Santacruz", "Santacruz West"].includes(p.micro_market) || p.locality.toLowerCase().includes("santacruz"),
  },
  {
    slug: "juhu",
    name: "Juhu",
    zone: "Western Suburbs",
    microMarkets: ["Juhu"],
    priceBands: [
      { configuration: "2 BHK", lowCr: "₹1.20L/mo", typicalCr: "₹1.55–2.40L/mo", highCr: "₹3L/mo", when: "Rent, as of Sep 2026" },
      { configuration: "3 BHK", lowCr: "₹2.10L/mo", typicalCr: "₹2.60–3.80L/mo", highCr: "₹5L/mo", when: "Rent, as of Sep 2026" },
      { configuration: "Beachfront 3 BHK", lowCr: "₹3.50L/mo", typicalCr: "₹4–6L/mo", highCr: "₹8L/mo", when: "Rent, as of Sep 2026" },
    ],
    intro: [
      "Juhu is Mumbai's most famous beach address — the two-kilometre sea face where the city's celebrity elite, film studios, and next-generation founders actually live. It is less one neighbourhood than a stretch of the imagination: beachfront high-rises with unbroken sea views, tucked-away lanes of heritage bungalows, and the constant buzz of film shoots, cafés, and kite festivals.",
      "Chariot Realty treats Juhu as the premium beach micro-market it is: unlike Bandra West's promenade, Juhu gives you actual beach — sand, sunset, and the sprawl of the sea itself. That view premium is real and priced accordingly.",
    ],
    knownFor: [
      "Juhu Beach — the city's most famous shoreline",
      "Beachfront high-rises with unbroken sea-facing views",
      "The bungalow lanes of heritage filmmakers",
      "Juhu Aerodrome's guarded edge",
      "Nargis Dutt / Juhu Scheme of premium buildings",
    ],
    whoLivesHere: "Film-industry A-listers and producers, founders on the Juhu-Vile Parle axis, heritage-bungalow families, and those who simply choose to live on a beach.",
    landmarks: [
      "Juhu Beach & the promenade",
      "Juhu Aerodrome (guarded VVIP edge)",
      "Prithvi Theatre",
      "ISKCON (Hare Krishna) Mandir",
      "Juhu Scheme / Nargis Dutt Road",
    ],
    amenities: [
      "Prithvi Theatre & courtyard",
      "Beachfront cafés (coffee, chaat, fine dining)",
      "Juhu Gymkhana",
    ],
    schools: [
      "Jasudben M.L. School",
      "Hill Spring International (nearby)",
      "Juhu Campus cluster",
    ],
    leisure: [
      "Juhu Beach sunrise & sunset",
      "Prithvi theatre nights",
      "Kite festival & Ganesh visarjan on the shore",
    ],
    transit: [
      { label: "Juhu Aerodrome road", minutesToGateway: "airport 15 min" },
      { label: "S.V. Road / Linking Road", minutesToGateway: "city + suburbs" },
    ],
    transitSummary: "Juhu trades on its isolation-in-plain-sight: the airport is 15 minutes away, but the beach, the jetty (ferry to BKC), and the guarded bungalow lanes keep the neighbourhood feeling like a resort next to a city.",
    distance: { toGateway: "beach at the door", toAirport: "15 min to CSMIA", toStation: "Vile Parle/Santacruz 10 min" },
    faqs: [
      { q: "Is Juhu a good place to live?", a: "For lifestyle, absolutely — beach, theatre, cafés and some of Mumbai's most beautiful heritage homes. For commute, it's a trade: the sea and the guarded bungalow lanes mean getting anywhere takes 20+ minutes." },
      { q: "How much does a 3BHK in Juhu cost?", a: "A standard 3BHK rents from about ₹2.10L to ₹3.80L per month. Beachfront 3 BHKs with unbroken sea views command ₹4L to ₹6L, and trophy configurations exceed ₹8L per month." },
      { q: "Juhu vs Bandra West beachfront — which is better?", a: "If you want actual beach, sand and the sea spread before you, Juhu. If you want a walkable promenade with cafés, retail and restaurants one behind the other, Bandra West's Carter Road. Juhu is the más spectacular; Bandra West is the more functional-elegant." },
    ],
    testimonials: [
      { quote: "Chariot sourced a beachfront 3BHK we'd been chasing for months through a live off-market mandate. Closed in 19 days.", name: "Rhea K.", area: "Juhu Beachfront", type: "Premium rental" },
    ],
    geo: { lat: 19.1075, lng: 72.8264, radiusKm: 2.3, placeId: "ChIJBUK9i3eX5zsRCP6lWplQCA" },
    image: "https://images.unsplash.com/photo-1512918580421-bd9bbb98b13d?auto=format&fit=crop&w=1200&q=80",
    updated: "September 2026",
    sourceNote: "Price bands are Chariot Realty market-desk estimates, updated September 2026.",
    listingFilters: (p) => p.micro_market === "Juhu" || p.locality.toLowerCase().includes("juhu"),
  },
  {
    slug: "bkc",
    name: "BKC",
    zone: "BKC",
    microMarkets: ["BKC", "Bandra-Kurla Complex"],
    priceBands: [
      { configuration: "Grade-A office", lowCr: "₹240/sqft", typicalCr: "₹260–300/sqft", highCr: "₹340/sqft", when: "Rent, as of Sep 2026" },
      { configuration: "Corporate 3 BHK (mandate)", lowCr: "₹2.80L/mo", typicalCr: "₹3.20–4.50L/mo", highCr: "₹6L/mo", when: "Rent, as of Sep 2026" },
    ],
    intro: [
      "BKC — the Bandra-Kurla Complex — is Mumbai's financial district and the anchor of Chariot Realty's commercial practice. A 200-odd-hectare planned office enclave between Bandra East and Kurla, it concentrates the city's Grade-A towers (Godrej BKC, Bharat Diamond Bourse, the Jio & SAIF towers) and the corporates that need them.",
      "What makes BKC work for real estate is its total self-containment: you land, you work, you dine, you sleep, all within a financed district that resets every weekday. Chariot Realty's BKC book spans tenancy for corporate residences, Grade-A office mandates, and the ever-changing stock of serviced workspaces the financial district lives on.",
    ],
    knownFor: [
      "Grade-A office towers & financial-district access",
      "Corporate residences (Ten BKC, Godrej BKC) minutes from the floor",
      "Bandra-Kurla Connector + metro",
      "The BKC green & dining circuit",
      "5-star hotels, banks, bourses in one grid",
    ],
    whoLivesHere: "Bankers, lawyers, consultants and finance-infra principals working within walking distance, plus the corporate-housing tenants who lease Grade-A residences by the quarter for the 'sleep-and-work-in-the-district' model.",
    landmarks: [
      "Godrej BKC (G-Block)",
      "Bharat Diamond Bourse",
      "Ten BKC (Kalanagar edge)",
      "Bandra-Kurla Connector (BKC)",
      "Jio World Garden",
    ],
    amenities: [
      "St. Regis / JW Marriott / Taj hotel cluster",
      "BKC's dining & cafés around the greens",
      "Fitness & wellness in the towers",
    ],
    schools: [
      "Corporate day-care clusters",
      "Bandra East schools 10 min north",
    ],
    leisure: [
      "BKC Green & garden",
      "Diamond Bourse precinct walks",
    ],
    transit: [
      { label: "Bandra-Kurla Connector (metro)", minutesToGateway: "12 min to Bandra W" },
      { label: "BKC to WEH / Sion-Panvel", minutesToGateway: "direct corridor" },
    ],
    transitSummary: "BKC is a car-and-metro district: the Bandra-Kurla Connector reaches Bandra West in about 12 minutes, the Western Express Highway is one junction away, and the new metro line threads the district itself.",
    distance: { toGateway: "BKC itself", toAirport: "20–25 min", toStation: "Bandra/Kurla 10–12 min" },
    faqs: [
      { q: "How much is a BKC corporate rental?", a: "Grade-A corporate 3 BHKs rent from about ₹2.80L to ₹4.50L per month; Grade-A office space rents ₹260 to ₹300 per sq ft. This is a mandate-driven market — exact numbers follow the building and the term." },
      { q: "Is it better to live in BKC or commute from Bandra West?", a: "If your office is IN BKC and you want the zero-commute model, live in BKC. If you want the lifestyle of the promenade and don't mind 12 minutes, Bandra West. BKC's residences are premium and functional; Bandra West's are premium and lived." },
      { q: "Is BKC RERA-approved for residential?", a: "Commercial BKC stock is typically not RERA-residential; corporate residences within the district are leased as per the building's commercial mandate. Under-construction residential within the Bandra East edge (Ten BKC, Godrej-adjacent) carries RERA approval." },
    ],
    testimonials: [
      { quote: "We term-leased a Grade-A BKC suite and Chariot handled the broker war — we never paid above a fair square-foot rate because they knew the market's real comps.", name: "Varun — Finance Director", area: "BKC", type: "Grade-A office mandate" },
    ],
    geo: { lat: 19.0596, lng: 72.8295, radiusKm: 1.1, placeId: "ChIJVfQABoSU5zsR7NqJk-pS_A" },
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
    updated: "September 2026",
    sourceNote: "Price bands are Chariot Realty market-desk estimates, updated September 2026.",
    listingFilters: (p) => ["BKC", "Bandra-Kurla Complex"].includes(p.micro_market) || p.zone === "BKC" || p.locality === "BKC",
  },
];

export const neighborhoodIndex = neighborhoods.map(({ slug, name }) => ({ slug, name }));
