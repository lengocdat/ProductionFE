import type { Catalog, Product } from "./types";

export function cosmeticDetails(id: string, catalog: Catalog) {
  const product = catalog.products.find(item => item.cosmetic === id);
  if (product) return { name: product.name, color: product.color, kind: product.preview, description: product.description };
  const tier = catalog.season.find(item => item.cosmetic === id);
  if (tier) return { name: `Thanh Vân ký · Ấn chương ${tier.level}`, color: `hsl(${145 + tier.level * 8} 40% 70%)`, kind: "season", description: `Ngoại hình mốc ${tier.level}, không cộng chỉ số chiến đấu.` };
  return { name: "Áo vải khởi hành", color: "#b9b09a", kind: "robe", description: "Diện mạo đạo danh. Không ảnh hưởng sức mạnh, tỉ lệ thắng hay phần thưởng." };
}

export function ProductArt({ product, large = false, chapter }: { product: Pick<Product, "id" | "name" | "color" | "preview">; large?: boolean; chapter?: number }) {
  return <svg viewBox="0 0 240 160" role="img" aria-label={product.name} style={{ display: "block", width: "100%", maxHeight: large ? 280 : 170, color: product.color, background: "rgba(6,16,25,.6)", borderRadius: 12 }}>
    <rect x="12" y="12" width="216" height="136" rx="12" fill="none" stroke="currentColor" opacity=".35" />
    {product.preview === "robe" ? <g stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M101 38 76 48 53 86 76 99 85 79 79 139 161 139 155 79 164 99 187 86 164 48 139 38 120 57Z" fill="currentColor" fillOpacity=".3" /><path d="m101 38 34 46-15 55M139 38l-34 46 15 55M84 87h72M95 94h50" fill="none" /><circle cx="120" cy="25" r="12" fill="currentColor" fillOpacity=".3" /></g> : product.preview === "seal" ? <g stroke="currentColor" strokeWidth="2" fill="none"><circle cx="120" cy="80" r="49" /><circle cx="120" cy="80" r="42" opacity=".4" /><path d={product.id === "seal-moon" ? "M137 47a35 35 0 1 0 11 60 36 36 0 0 1-11-60Z" : product.id === "seal-mountain" ? "m83 99 24-40 14 20 13-15 25 35Z" : product.id === "seal-river" ? "M96 48c65 0-32 64 48 64M107 46c65 0-32 64 48 64" : product.id === "seal-star" ? "m120 44 8 25 24-11-14 22 14 22-24-11-8 25-8-25-24 11 14-22-14-22 24 11Z" : product.id === "seal-crane" ? "m82 69 31 11 7-33 7 33 31-11-23 22-15 21-15-21Z" : product.id === "seal-turtle" ? "m120 50 26 15v30l-26 15-26-15V65Zm0 0v60M94 65l52 30m0-30L94 95" : product.id === "seal-plum" ? "M120 75c-40-45 40-45 0 0 45-40 45 40 0 0 45 40-35 55 0 0-40 45-55-35 0 0-45-40 35-55 0 0Z" : "M116 115V45m0 15 22-12m-22 30-22-12m22 29 22-12"} /></g> : <g fill="currentColor"><circle cx="166" cy="48" r={product.preview === "season" ? 24 : 18} opacity=".7" /><path d="m20 126 53-61 45 48 31-41 71 54Z" opacity=".2" /><path d="m20 137 66-46 46 38 43-35 45 43Z" opacity=".5" /><path d="M26 143q57-34 98-5t90 2" fill="none" stroke="currentColor" strokeWidth="2" />{product.preview === "season" && <path d="m120 30 7 14 16 3-12 11 3 17-14-8-14 8 3-17-12-11 16-3Z" />}{product.id === "landscape-storm" && <path d="m105 23-14 28h13l-8 24 24-33h-14l12-19Z" />}{product.id === "landscape-night" && <path d="m45 35 2 5 5 2-5 2-2 5-2-5-5-2 5-2Zm38-12 1 4 4 1-4 1-1 4-1-4-4-1 4-1Z" />}</g>}
    <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round">
      {product.id === "robe-hermit" && <g><path d="m96 30 24-17 24 17Z" fill="#534d3c" /><path d="m107 29 13-16 13 16M86 88l68 3" /><path d="m89 111 15-2 2 17-15 2Z" fill="currentColor" fillOpacity=".45" /><path d="m89 112 4 2m-2 6 4 2m7-10-3 2m5 6-3 2" /></g>}
      {product.id === "robe-jade" && <g><path d="m134 131 7-31m-5 23-7-7m9 0 9-9m-7 3-7-8" /><path d="m113 52 7 5 7-5" stroke="#c7e5d1" strokeWidth="3" /></g>}
      {product.id === "robe-snow" && <g stroke="#e8f1f5"><path d="m89 132 7-37m55 37-7-37M132 110h15m-7-7v14m-5-12 10 10m0-10-10 10" /><path d="m99 48 21 34 21-34" strokeWidth="3" /></g>}
      {product.id === "robe-ember" && <path d="M88 132q13-1 8-17 13 8 10 17m22 0q-9-10 4-26-2 14 10 12 7 8 3 14" stroke="#efb68b" />}
      {product.id === "robe-night" && <g><path d="M109 25h22v9h-22Z" fill="#202b46" /><path d="m65 83 9 6m92-6 9-6M94 128l7-23m45 23-7-23" stroke="#c2c9ec" /></g>}
      {product.id === "robe-lotus" && <g stroke="#efc5de"><path d="M133 70q-13-6-7-14 8 3 7 14 0-11 8-14 6 8-8 14Zm-6 3h12M89 133q31-8 62 0" /><path d="M91 88h58" strokeWidth="3" /></g>}
      {product.id === "robe-sun" && <path d="m84 132 15-15 12 10 14-19 15 21 14-10M94 95h52" stroke="#705c3c" strokeWidth="3" />}
      {product.id === "robe-cloud" && <g stroke="#d3edf0"><path d="M91 116q-5-8 4-10 3-10 11-4 10-2 10 7h-12m26 17q-4-8 4-9 3-7 9-3 9-1 10 6h-13M109 88l22 2" /></g>}
      {product.id === "landscape-snow" && <path d="m62 78 11-13 16 17-13-5-5 5Zm73 12 14-18 19 22-18-8-5 7Z" fill="#dfedf0" stroke="none" />}
      {product.id === "landscape-dawn" && <path d="m20 141 41-16 37 15 35-18 49 19 38-16" stroke="#6d9c8d" strokeWidth="7" />}
      {product.id === "landscape-gold" && <g><path d="M18 31V18h18m168 0h18v13M18 129v13h18m168 0h18v-13" strokeWidth="3" /><path d="m27 125 46-53 43 49 34-42 63 46" stroke="#c7b27a" /></g>}
      {product.id === "landscape-lotus" && <g><path d="M39 143q34-12 61-3m35 3q32-9 68-2M75 136q-17-7-11-16 10 2 11 16 0-12 10-16 8 8-10 16Zm80 2q-17-7-11-16 10 2 11 16 0-12 10-16 8 8-10 16Z" fill="currentColor" fillOpacity=".3" /></g>}
    </g>
    {chapter !== undefined && <g><rect x="102" y="109" width="36" height="29" rx="6" fill="#102126" /><text x="120" y="130" textAnchor="middle" fill="currentColor" fontSize="19">{String(chapter).padStart(2, "0")}</text></g>}
  </svg>;
}

export default function CosmeticArt({ id, catalog }: { id: string; catalog: Catalog }) {
  const appearance = cosmeticDetails(id, catalog);
  return <ProductArt product={{ id, name: appearance.name, color: appearance.color, preview: appearance.kind }} chapter={catalog.season.find(tier => tier.cosmetic === id)?.level} />;
}
