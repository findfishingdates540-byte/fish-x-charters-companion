export type Cat = "rods" | "tackle" | "apparel" | "electronics";
export type IconKind = "rod" | "reel" | "lure" | "shirt" | "cap" | "spool" | "sonar" | "jacket" | "hook";

export type Product = {
  id: string;
  name: string;
  seller: string;
  sellerType: string;
  price: number;
  rating: string;
  reviews: number;
  cat: Cat;
  badge?: string;
  icon: IconKind;
  description?: string;
  specs?: Array<{ label: string; value: string }>;
};

export const CATALOG: Product[] = [
  { id: "p1", name: "Apex 7'0\" Inshore Spinning Rod", seller: "Apex Rod Co.", sellerType: "Gear maker", price: 189, rating: "4.9", reviews: 214, cat: "rods", badge: "Bestseller", icon: "rod",
    description: "Tournament-grade inshore spinning rod hand-built in Tampa. IM8 graphite blank tuned for redfish, snook, and speckled trout — light in the hand, ruthless on the hookset.",
    specs: [{label:"Length",value:"7'0\""},{label:"Power",value:"Medium"},{label:"Action",value:"Fast"},{label:"Line",value:"8–17 lb"},{label:"Lure",value:"1/4–3/4 oz"}] },
  { id: "p2", name: "Sealine 4000 Spinning Reel", seller: "Reel Deal Tackle", sellerType: "Tackle shop", price: 145, rating: "4.8", reviews: 167, cat: "rods", icon: "reel",
    description: "Sealed 8+1 bearing spinning reel with a saltwater-shielded drag stack. The workhorse behind three IGFA line-class records last season.",
    specs: [{label:"Gear ratio",value:"6.2:1"},{label:"Max drag",value:"22 lb"},{label:"Weight",value:"9.3 oz"},{label:"Bearings",value:"8+1"}] },
  { id: "p3", name: "Tarpon Slam Lure Kit · 12 pc", seller: "Reel Deal Tackle", sellerType: "Tackle shop", price: 42, rating: "4.9", reviews: 98, cat: "tackle", badge: "Shop pick", icon: "lure",
    description: "Twelve hand-picked soft plastics and topwaters for the pre-dawn tarpon bite. Colors curated by Captain Miles Alvarez.",
    specs: [{label:"Pieces",value:"12"},{label:"Species",value:"Tarpon, snook"},{label:"Rigging",value:"Weedless"}] },
  { id: "p4", name: "UPF 50 Performance Hoodie", seller: "Tidewater Apparel", sellerType: "Apparel brand", price: 68, rating: "4.9", reviews: 342, cat: "apparel", badge: "Bestseller", icon: "shirt",
    description: "Sun hoodie built for 12-hour offshore days. UPF 50, moisture-wicking, and quick-drying with a face gaiter that actually breathes.",
    specs: [{label:"Fabric",value:"92% poly / 8% spandex"},{label:"UPF",value:"50+"},{label:"Fit",value:"Athletic"}] },
  { id: "p5", name: "Legend Trucker Cap", seller: "Tidewater Apparel", sellerType: "Apparel brand", price: 32, rating: "4.7", reviews: 120, cat: "apparel", icon: "cap",
    description: "Structured 6-panel trucker with a curved brim and salt-resistant snapback. Wear it, wash it, wear it again.",
    specs: [{label:"Front",value:"Cotton twill"},{label:"Back",value:"Mesh"},{label:"Closure",value:"Snapback"}] },
  { id: "p6", name: "ProBraid 30 lb · 300 yd", seller: "Reel Deal Tackle", sellerType: "Tackle shop", price: 28, rating: "4.8", reviews: 76, cat: "tackle", icon: "spool",
    description: "8-carrier braided line with a tight weave and a low-vis moss-green finish. Zero stretch, all hookset.",
    specs: [{label:"Test",value:"30 lb"},{label:"Length",value:"300 yd"},{label:"Diameter",value:"0.25 mm"}] },
  { id: "p7", name: "CoastScan 7\" Sonar / GPS", seller: "Apex Rod Co.", sellerType: "Gear maker", price: 899, rating: "4.9", reviews: 58, cat: "electronics", badge: "New", icon: "sonar",
    description: "7-inch chartplotter with CHIRP sonar, side-scan, and preloaded coastal charts. NMEA 2000 ready.",
    specs: [{label:"Display",value:"7\" HD"},{label:"Sonar",value:"CHIRP + SideVu"},{label:"GPS",value:"10 Hz"}] },
  { id: "p8", name: "Foul-Weather Shell Jacket", seller: "Tidewater Apparel", sellerType: "Apparel brand", price: 148, rating: "4.8", reviews: 203, cat: "apparel", icon: "jacket",
    description: "3-layer waterproof shell with taped seams and a storm hood. Tested on 40-knot runs out of Montauk.",
    specs: [{label:"Waterproof",value:"20K mm"},{label:"Breathability",value:"15K g/m²"},{label:"Seams",value:"Fully taped"}] },
  { id: "p9", name: "Circle Hook Pro Pack · 50", seller: "Reel Deal Tackle", sellerType: "Tackle shop", price: 18, rating: "4.9", reviews: 311, cat: "tackle", icon: "hook",
    description: "50 forged inline circle hooks — chemically sharpened, corrosion-resistant, and IGFA-legal for the release fleet.",
    specs: [{label:"Count",value:"50"},{label:"Sizes",value:"3/0 – 7/0"},{label:"Finish",value:"Black nickel"}] },
];

export const tileFor = (cat: Cat): { bg: string; ink: string } => {
  if (cat === "rods") return { bg: "linear-gradient(150deg,#f4e6cd,#ecd8b8)", ink: "#a97e3c" };
  if (cat === "tackle") return { bg: "linear-gradient(150deg,#e2eef2,#d2e4ea)", ink: "#1f9fbe" };
  if (cat === "apparel") return { bg: "linear-gradient(150deg,#e9edf1,#dde3e9)", ink: "#5c6b78" };
  return { bg: "linear-gradient(150deg,#12314b,#0a2236)", ink: "#e3c089" };
};

export const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
