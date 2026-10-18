// Source of truth: https://www.kanyakacorporation.com (Home, About Us, Products, Contact Us).
// Keep business claims here limited to what the official site states.

export const companyInfo = {
  name: "Kanyaka Corporation",
  tagline: "Genuine and quality products at reasonable price.",
  motto: "Genuine and quality products at reasonable price.",
  experienceYears: "24",
  summary:
    "Kanyaka Corporation supplies chloro-alkali products, acids, specialty chemicals and solvents to Indian manufacturing industry. We are an authorised dealer for Grasim Industries Ltd., and stock their products at our own warehouse near the Pashamylaram industrial estate.",
  promoter: {
    name: "Mr. K. Subrahmanyam",
    designation: "Promoter",
    experience: "24 years in the chemical industry",
    bio: "Kanyaka Corporation is promoted and guided by Mr. K. Subrahmanyam, who brings 24 years of experience in the chemical industry. The company is managed by a qualified team of highly motivated people, and works to one simple motto: genuine and quality products at a reasonable price.",
  },
  authorizedPartners: [
    {
      name: "Grasim Industries Ltd.",
      parent: "Principal",
      tier: "Authorised dealer · Telangana & Andhra Pradesh",
      products: "Aluminium Chloride (Granules & Powder), Caustic Soda Flakes, Calcium Chloride, Sodium Sulphate Anhydrous, Hydrochloric Acid, Sodium Hypochlorite",
      badgeText: "Authorised Grasim Dealer",
    },
    {
      name: "Other leading manufacturers",
      parent: "Trade supply",
      tier: "Tata · Nirma · DCM · TGV · Andhra Sugars · Deepak · Kutch · Panoli",
      products: "Caustic Potash, Potassium Carbonate, Soda Ash, Sodium Bicarbonate, Sulphites, Sodium Nitrite, Thionyl Chloride, Sulphuric Acid, Oxalic Acid and more",
      badgeText: "Allied brands",
    },
  ],
  industriesServed: ["Agro", "Engineering", "Leather", "Pesticides", "Printing & Packaging", "Pharmaceuticals", "Dairy", "Textiles"],
  warehouse: {
    area: "6,000 sq.ft. warehouse",
    location: "Near Pashamylaram Industrial Estate, Medak District (now Sangareddy), Telangana",
    features: [
      "Around 6,000 sq.ft. of warehouse space near the Pashamylaram industrial estate",
      "A second warehouse at Kanukunta, north of Hyderabad",
      "Godown stock of Grasim Industries products",
      "Supplying industries across Telangana and Andhra Pradesh",
    ],
  },
  contacts: {
    phonePrimary: "+91 90300 44304",
    phoneSecondary: "+91 99498 44304",
    whatsapp: "+919030044304",
    whatsappDisplay: "+91 90300 44304",
    emailSales: "kanyaka_corp@hotmail.com",
    emailDirector: "subrahmanyam549@gmail.com",
    webmailUrl: "http://webmail.kanyakacorporation.com:2095",
  },
  addresses: {
    registeredOffice: {
      title: "Office",
      line1: "Flat No. 202, SV'S VJ Mansion, MIG 401-404",
      line2: "KPHB Colony, Kukatpally",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500085",
      country: "India",
      googleMapsQuery: "SV'S VJ Mansion KPHB Colony Kukatpally Hyderabad",
    },
    warehouseDepot: {
      title: "Warehouse",
      line1: "Near Pashamylaram Industrial Estate",
      line2: "Medak District (now Sangareddy)",
      city: "Sangareddy District",
      state: "Telangana",
      pincode: "",
      country: "India",
      googleMapsQuery: "Pashamylaram Industrial Estate Telangana",
    },
  },
  // Exact map pins supplied by Kanyaka Corporation (DMS converted to decimal degrees).
  locations: [
    {
      id: "office",
      kind: "office" as const,
      title: "Office",
      place: "KPHB Colony, Kukatpally, Hyderabad",
      lines: ["Flat No. 202, SV'S VJ Mansion, MIG 401-404", "KPHB Colony, Kukatpally", "Hyderabad 500085, Telangana"],
      dms: `17°29'21.5"N 78°23'44.0"E`,
      lat: 17.489306,
      lng: 78.395556,
    },
    {
      id: "pashamylaram",
      kind: "warehouse" as const,
      title: "Pashamylaram Warehouse",
      place: "Pashamylaram, Sangareddy District",
      lines: ["Near Pashamylaram Industrial Estate", "Medak District (now Sangareddy)", "Telangana"],
      dms: `17°31'43.1"N 78°10'06.7"E`,
      lat: 17.528639,
      lng: 78.168528,
    },
    {
      id: "kanukunta",
      kind: "warehouse" as const,
      title: "Kanukunta Warehouse",
      place: "Kanukunta, Telangana",
      lines: ["Kanukunta", "Telangana"],
      dms: `17°41'34.6"N 78°24'12.9"E`,
      lat: 17.692944,
      lng: 78.403583,
    },
  ],
  operatingHours: "Monday to Saturday, 10:00 AM – 6:00 PM",
  stats: [
    { value: "24", label: "Years of experience", desc: "Mr. K. Subrahmanyam, in the chemical industry" },
    { value: "6,000", label: "Sq. ft. warehouse", desc: "Near Pashamylaram industrial estate" },
    { value: "27", label: "Chemicals supplied", desc: "Chlor-alkali, salts, acids & reagents" },
    { value: "1", label: "Authorised principal", desc: "Grasim Industries Ltd." },
    { value: "8", label: "Industries served", desc: "From pharma and agro to dairy and textiles" },
  ],
};
