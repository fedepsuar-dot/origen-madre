const { getStore, connectLambda } = require("@netlify/blobs");

const STORE_NAME = "carniceria";
const KEY = "products";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "cambiar-este-secreto";

function getProductsStore() {
  // En algunos sitios, Netlify no inyecta la configuración automática de
  // Blobs dentro de la función. Si están cargadas las variables
  // NETLIFY_SITE_ID y NETLIFY_BLOBS_TOKEN, nos conectamos manualmente;
  // si no, probamos con la configuración automática.
  if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_BLOBS_TOKEN) {
    return getStore({
      name: STORE_NAME,
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN,
    });
  }
  return getStore(STORE_NAME);
}

const SEED_PRODUCTS = [
  { id: "asado", name: "Asado", category: "Vacuno", unit: "kg", price: 8900, image: "https://placehold.co/500x360/C8141E/F2EEE5?font=roboto&text=Asado", active: true, offer: false },
  { id: "vacio", name: "Vacío", category: "Vacuno", unit: "kg", price: 10400, image: "https://placehold.co/500x360/C8141E/F2EEE5?font=roboto&text=Vac%C3%ADo", active: true, offer: false },
  { id: "bife-chorizo", name: "Bife de chorizo", category: "Vacuno", unit: "kg", price: 12200, image: "https://placehold.co/500x360/C8141E/F2EEE5?font=roboto&text=Bife+de+Chorizo", active: true, offer: true },
  { id: "matambre", name: "Matambre", category: "Vacuno", unit: "kg", price: 9300, image: "https://placehold.co/500x360/C8141E/F2EEE5?font=roboto&text=Matambre", active: true, offer: false },
  { id: "carne-picada", name: "Carne picada especial", category: "Vacuno", unit: "kg", price: 7900, image: "https://placehold.co/500x360/C8141E/F2EEE5?font=roboto&text=Carne+Picada", active: true, offer: false },
  { id: "chorizo", name: "Chorizo", category: "Embutidos", unit: "unidad", price: 1000, image: "https://placehold.co/500x360/C8141E/F2EEE5?font=roboto&text=Chorizo", active: true, offer: false },
  { id: "morcilla", name: "Morcilla", category: "Embutidos", unit: "unidad", price: 750, image: "https://placehold.co/500x360/C8141E/F2EEE5?font=roboto&text=Morcilla", active: true, offer: false }
];

function json(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  try { connectLambda(event); } catch (e) { /* si no aplica, seguimos */ }
  const store = getProductsStore();

  if (event.httpMethod === "GET") {
    let products = await store.get(KEY, { type: "json" });
    if (!products) {
      products = SEED_PRODUCTS;
      await store.setJSON(KEY, products);
    }
    return json(200, { products });
  }

  if (event.httpMethod === "POST") {
    const token = event.headers["x-admin-token"] || event.headers["X-Admin-Token"];
    if (!token || token !== ADMIN_SECRET) {
      return json(401, { error: "No autorizado" });
    }

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (e) {
      return json(400, { error: "JSON inválido" });
    }

    const { action, product, id } = payload;
    let products = (await store.get(KEY, { type: "json" })) || SEED_PRODUCTS;

    if (action === "upsert" && product && product.id) {
      const idx = products.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        products[idx] = { ...products[idx], ...product };
      } else {
        products.push(product);
      }
    } else if (action === "delete" && id) {
      products = products.filter((p) => p.id !== id);
    } else {
      return json(400, { error: "Acción inválida" });
    }

    await store.setJSON(KEY, products);
    return json(200, { products });
  }

  return json(405, { error: "Método no permitido" });
};
