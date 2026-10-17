"use strict";

const STORAGE_PRODUCTS = "feathered-fine-products-v1";
const STORAGE_CART = "feathered-fine-cart-v1";
const DELIVERY_FEE = 18;
const FREE_DELIVERY_AT = 120;

const seedProducts = [
  { id: "sussex-01", name: "Sunday Sister", breed: "Speckled Sussex", age: 4, ageWeeks: 17, price: 38, stock: 8, weight: "3.5–4 lb", eggs: "200–250 light brown eggs/year", temperament: "Curious, calm, and people-friendly", vaccinated: "Marek’s, Newcastle & infectious bronchitis", description: "A confident, lovely-natured girl with a coat of warm mahogany and white speckles. Speckled Sussex are classic dual-purpose birds, known for foraging happily and settling easily into a backyard flock.", image: "images.jpg4.jpg" },
  { id: "orpington-01", name: "Clover", breed: "Buff Orpington", age: 5, ageWeeks: 21, price: 45, stock: 6, weight: "5–6 lb", eggs: "180–220 light brown eggs/year", temperament: "Gentle, affectionate, and docile", vaccinated: "Marek’s, Newcastle & infectious bronchitis", description: "Soft golden feathers and an even softer disposition. Buff Orpingtons are a beloved, steady-laying heritage breed that tends to be a sweet fit for families and mixed flocks alike.", image: "images.jpg4.jpg" },
  { id: "brahma-01", name: "Marigold", breed: "Light Brahma", age: 6, ageWeeks: 29, price: 58, stock: 4, weight: "6–8 lb", eggs: "150–200 medium brown eggs/year", temperament: "Calm, friendly, and unhurried", vaccinated: "Marek’s, Newcastle & infectious bronchitis", description: "A stately, feather-footed gentle giant. Light Brahmas are known for their quiet confidence, cold hardiness, and sweet nature. Give Marigold a little room and she’ll bring a lot of charm.", image: "images.jpg5.jpg" },
  { id: "wyandotte-01", name: "Penny", breed: "Golden Laced Wyandotte", age: 4, ageWeeks: 18, price: 42, stock: 5, weight: "4–5 lb", eggs: "180–220 brown eggs/year", temperament: "Social, sturdy, and self-assured", vaccinated: "Marek’s, Newcastle & infectious bronchitis", description: "A bright, beautifully patterned bird with a sturdy build and an independent streak. Wyandottes are dependable layers and make a hardy, eye-catching addition to the coop.", image: "images.jpg4.jpg" },
  { id: "sussex-02", name: "Hazel", breed: "Light Sussex", age: 5, ageWeeks: 22, price: 40, stock: 0, weight: "4–5 lb", eggs: "220–260 cream eggs/year", temperament: "Easygoing, alert, and sociable", vaccinated: "Marek’s, Newcastle & infectious bronchitis", description: "Our Light Sussex girls are known for their bright eyes and easygoing ways. Hazel’s breed is a reliable layer and a natural forager, with a striking white-and-black finish.", image: "images.jpg5.jpg" },
  { id: "barred-rock-01", name: "Pepper", breed: "Barred Plymouth Rock", age: 6, ageWeeks: 32, price: 52, stock: 3, weight: "5–6 lb", eggs: "200–250 brown eggs/year", temperament: "Steady, personable, and hardy", vaccinated: "Marek’s, Newcastle & infectious bronchitis", description: "A classic American farm bird with beautiful barred plumage. Plymouth Rocks are sturdy, adaptable layers, and Pepper’s calm, people-curious nature makes her a flock favorite.", image: "images.jpg6.jpg" }
];

function readStored(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    showToast("Could not save to this browser. Check your storage settings.");
  }
}

function safeImage(value) {
  const image = String(value || "").trim();
  if (/^https:\/\//i.test(image) || /^http:\/\//i.test(image) || /^[\w./-]+\.(?:jpe?g|png|webp|avif)$/i.test(image)) return image;
  return "images.jpg4.jpg";
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value) || 0);
}

let products = readStored(STORAGE_PRODUCTS, null);
if (!Array.isArray(products)) products = seedProducts.map(product => ({ ...product }));
let cart = readStored(STORAGE_CART, {});
if (!cart || typeof cart !== "object" || Array.isArray(cart)) cart = {};
let activeAge = "all";
let toastTimer;

const productGrid = document.querySelector("#productGrid");
const overlay = document.querySelector("#overlay");
const cartDrawer = document.querySelector("#cartDrawer");
const productModal = document.querySelector("#productModal");
const productFormModal = document.querySelector("#productFormModal");
const checkoutModal = document.querySelector("#checkoutModal");
const toast = document.querySelector("#toast");

function persistProducts() {
  save(STORAGE_PRODUCTS, products);
}

function persistCart() {
  save(STORAGE_CART, cart);
}

function ageLabel(age) {
  return Number(age) >= 6 ? "6 months & older" : `${age} months`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function updateBreedOptions() {
  const select = document.querySelector("#breedFilter");
  const selected = select.value;
  const breeds = [...new Set(products.map(product => product.breed).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  select.innerHTML = '<option value="all">Every breed</option>' + breeds.map(breed => `<option value="${escapeHTML(breed)}">${escapeHTML(breed)}</option>`).join("");
  if (breeds.includes(selected)) select.value = selected;
}

function filteredProducts() {
  const search = document.querySelector("#searchInput").value.trim().toLowerCase();
  const breed = document.querySelector("#breedFilter").value;
  const maxPrice = Number(document.querySelector("#priceFilter").value);
  const sort = document.querySelector("#sortFilter").value;
  let matches = products.filter(product => {
    const matchesAge = activeAge === "all" || (activeAge === "6" ? Number(product.age) >= 6 : Number(product.age) === Number(activeAge));
    const matchesSearch = !search || `${product.name} ${product.breed} ${product.description}`.toLowerCase().includes(search);
    const matchesBreed = breed === "all" || product.breed === breed;
    const matchesPrice = !document.querySelector("#priceFilter").value || Number(product.price) <= maxPrice;
    return matchesAge && matchesSearch && matchesBreed && matchesPrice;
  });
  if (sort === "price-low") matches.sort((a, b) => Number(a.price) - Number(b.price));
  if (sort === "price-high") matches.sort((a, b) => Number(b.price) - Number(a.price));
  if (sort === "name") matches.sort((a, b) => a.breed.localeCompare(b.breed));
  return matches;
}

function renderProducts() {
  updateBreedOptions();
  const matches = filteredProducts();
  document.querySelector("#resultCount").textContent = `Showing ${matches.length} ${matches.length === 1 ? "bird" : "birds"}`;
  productGrid.hidden = matches.length === 0;
  document.querySelector("#emptyState").hidden = matches.length !== 0;
  productGrid.innerHTML = matches.map(product => {
    const inStock = Number(product.stock) > 0;
    return `<article class="product-card">
      <div class="product-image-wrap" data-detail="${escapeHTML(product.id)}" tabindex="0" role="button" aria-label="View ${escapeHTML(product.name)} details">
        <img class="product-image" src="${escapeHTML(safeImage(product.image))}" alt="${escapeHTML(product.breed)} chicken" loading="lazy">
        <span class="age-badge">${escapeHTML(ageLabel(product.age))}</span><span class="stock-badge">${inStock ? `${Number(product.stock)} ready to roam` : "Currently sold out"}</span>
      </div>
      <div class="product-info"><div class="product-meta"><span>${escapeHTML(product.breed)}</span><span>${Number(product.ageWeeks) || Number(product.age) * 4} weeks</span></div>
        <div class="product-name-row"><h3 class="product-name" data-detail="${escapeHTML(product.id)}" tabindex="0">${escapeHTML(product.name)}</h3><span class="product-price">${formatPrice(product.price)}</span></div>
        <div class="product-bottom"><small>${inStock ? "Healthy, vaccinated stock" : "Ask us when she’ll be back"}</small><button class="add-button" data-add="${escapeHTML(product.id)}" type="button" ${inStock ? "" : "disabled"}>${inStock ? "Add to basket +" : "Sold out"}</button></div>
      </div>
    </article>`;
  }).join("");
}

function openOverlay() {
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add("visible"));
  document.body.classList.add("no-scroll");
}

function closeLayers() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  [productModal, productFormModal, checkoutModal].forEach(modal => {
    modal.classList.remove("visible");
    setTimeout(() => { if (!modal.classList.contains("visible")) modal.hidden = true; }, 200);
  });
  overlay.classList.remove("visible");
  setTimeout(() => {
    if (!cartDrawer.classList.contains("open") && ![productModal, productFormModal, checkoutModal].some(modal => !modal.hidden)) overlay.hidden = true;
    if (overlay.hidden) document.body.classList.remove("no-scroll");
  }, 240);
}

function openModal(modal) {
  openOverlay();
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add("visible"));
}

function openCart() {
  openOverlay();
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  renderCart();
}

function addToCart(id, amount = 1) {
  const product = products.find(item => item.id === id);
  if (!product || Number(product.stock) <= 0) return;
  const current = Number(cart[id]) || 0;
  if (current + amount > Number(product.stock)) {
    showToast(`Only ${product.stock} ${product.stock === 1 ? "bird is" : "birds are"} available.`);
    return;
  }
  cart[id] = current + amount;
  persistCart();
  renderCart();
  showToast(`${product.name} added to your basket.`);
}

function cartTotals() {
  const subtotal = Object.entries(cart).reduce((total, [id, quantity]) => {
    const product = products.find(item => item.id === id);
    return total + (product ? Number(product.price) * Number(quantity) : 0);
  }, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_DELIVERY_AT ? 0 : DELIVERY_FEE;
  return { subtotal, shipping, total: subtotal + shipping };
}

function renderCart() {
  cart = Object.fromEntries(Object.entries(cart).filter(([id, quantity]) => products.some(product => product.id === id && Number(quantity) > 0)));
  persistCart();
  const entries = Object.entries(cart);
  const quantity = entries.reduce((total, [, count]) => total + Number(count), 0);
  document.querySelector("#cartCount").textContent = quantity;
  document.querySelector("#drawerCount").textContent = `(${quantity})`;
  document.querySelector("#cartEmpty").hidden = entries.length > 0;
  document.querySelector("#cartSummary").hidden = entries.length === 0;
  document.querySelector("#cartItems").innerHTML = entries.map(([id, count]) => {
    const product = products.find(item => item.id === id);
    return `<div class="cart-line"><img src="${escapeHTML(safeImage(product.image))}" alt="${escapeHTML(product.breed)}" loading="lazy"><div class="cart-line-main"><strong>${escapeHTML(product.name)}</strong><small>${escapeHTML(product.breed)} · ${formatPrice(product.price)}</small><div class="quantity-control"><button type="button" data-quantity="${escapeHTML(id)}" data-delta="-1" aria-label="Remove one ${escapeHTML(product.name)}">−</button><span>${Number(count)}</span><button type="button" data-quantity="${escapeHTML(id)}" data-delta="1" aria-label="Add one ${escapeHTML(product.name)}" ${Number(count) >= Number(product.stock) ? "disabled" : ""}>+</button></div></div><div class="cart-line-end"><span>${formatPrice(Number(product.price) * Number(count))}</span><button type="button" class="remove-item" data-remove="${escapeHTML(id)}">Remove</button></div></div>`;
  }).join("");
  const totals = cartTotals();
  document.querySelector("#cartSubtotal").textContent = formatPrice(totals.subtotal);
  document.querySelector("#cartShipping").textContent = totals.shipping ? formatPrice(totals.shipping) : "Complimentary";
  document.querySelector("#cartTotal").textContent = formatPrice(totals.total);
}

function showProductDetails(id) {
  const product = products.find(item => item.id === id);
  if (!product) return;
  document.querySelector("#productModalContent").innerHTML = `<div class="product-detail"><img class="detail-image" src="${escapeHTML(safeImage(product.image))}" alt="${escapeHTML(product.breed)} chicken"><div class="detail-copy"><p class="eyebrow">${escapeHTML(ageLabel(product.age))} · ${Number(product.ageWeeks) || Number(product.age) * 4} WEEKS</p><h2 id="productModalTitle">${escapeHTML(product.name)}</h2><div class="detail-breed">${escapeHTML(product.breed)}</div><div class="detail-price">${formatPrice(product.price)}</div><p>${escapeHTML(product.description)}</p><ul class="spec-list"><li><span>Health</span><strong>Vaccinated & vet-checked</strong></li><li><span>Vaccinations</span><strong>${escapeHTML(product.vaccinated || "Farm health program")}</strong></li><li><span>Weight range</span><strong>${escapeHTML(product.weight || "Breed-typical range")}</strong></li><li><span>Egg laying</span><strong>${escapeHTML(product.eggs || "Varies by individual")}</strong></li><li><span>Temperament</span><strong>${escapeHTML(product.temperament || "Friendly and curious")}</strong></li><li><span>Availability</span><strong>${Number(product.stock) > 0 ? `${Number(product.stock)} in stock` : "Currently sold out"}</strong></li></ul><button class="button button-dark" type="button" data-add="${escapeHTML(product.id)}" ${Number(product.stock) <= 0 ? "disabled" : ""}>${Number(product.stock) > 0 ? "Add to basket" : "Sold out"}<span aria-hidden="true">↗</span></button></div></div>`;
  openModal(productModal);
}

function renderAdmin() {
  document.querySelector("#statListings").textContent = products.length;
  document.querySelector("#statValue").textContent = formatPrice(products.reduce((total, product) => total + Number(product.price) * Number(product.stock), 0));
  document.querySelector("#statOut").textContent = products.filter(product => Number(product.stock) === 0).length;
  document.querySelector("#adminCount").textContent = `${products.length} ${products.length === 1 ? "product" : "products"}`;
  document.querySelector("#adminEmpty").hidden = products.length !== 0;
  document.querySelector(".inventory-wrap").hidden = products.length === 0;
  document.querySelector("#inventoryBody").innerHTML = products.map(product => `<tr><td><div class="admin-product-cell"><img src="${escapeHTML(safeImage(product.image))}" alt="" loading="lazy"><div><strong>${escapeHTML(product.name)}</strong><small>${escapeHTML(product.breed)}</small></div></div></td><td>${escapeHTML(ageLabel(product.age))}</td><td>${formatPrice(product.price)}</td><td>${Number(product.stock)}</td><td>${formatPrice(Number(product.price) * Number(product.stock))}</td><td><div class="inventory-actions"><button class="small-action" type="button" data-edit="${escapeHTML(product.id)}">Edit</button><button class="small-action delete" type="button" data-delete="${escapeHTML(product.id)}">Delete</button></div></td></tr>`).join("");
}

function toggleAdmin() {
  const adminIsOpen = document.querySelector("#adminView").hidden;
  document.querySelector("#adminView").hidden = !adminIsOpen;
  document.querySelector("#storefrontView").hidden = adminIsOpen;
  document.querySelector("#adminToggle").textContent = adminIsOpen ? "Back to storefront" : "Farm manager";
  document.querySelector(".site-header").classList.toggle("admin-active", adminIsOpen);
  if (adminIsOpen) {
    renderAdmin();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function openProductForm(product = null) {
  document.querySelector("#productForm").reset();
  document.querySelector("#productId").value = product?.id || "";
  document.querySelector("#productFormTitle").innerHTML = product ? "Edit a <em>listing.</em>" : "Add a <em>bird.</em>";
  if (product) {
    document.querySelector("#productName").value = product.name;
    document.querySelector("#productBreed").value = product.breed;
    document.querySelector("#productAge").value = String(Number(product.age) >= 6 ? 6 : product.age);
    document.querySelector("#productPrice").value = product.price;
    document.querySelector("#productStock").value = product.stock;
    document.querySelector("#productImage").value = product.image || "";
    document.querySelector("#productDescription").value = product.description;
  }
  openModal(productFormModal);
}

function openCheckout() {
  const totals = cartTotals();
  document.querySelector("#checkoutItems").innerHTML = Object.entries(cart).map(([id, count]) => {
    const product = products.find(item => item.id === id);
    return `<div class="checkout-order-line"><span>${escapeHTML(product.name)} × ${Number(count)}</span><span>${formatPrice(Number(product.price) * Number(count))}</span></div>`;
  }).join("");
  document.querySelector("#checkoutSubtotal").textContent = formatPrice(totals.subtotal);
  document.querySelector("#checkoutShipping").textContent = totals.shipping ? formatPrice(totals.shipping) : "Complimentary";
  document.querySelector("#checkoutTotal").textContent = formatPrice(totals.total);
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  checkoutModal.hidden = false;
  requestAnimationFrame(() => checkoutModal.classList.add("visible"));
}

document.querySelector("#productGrid").addEventListener("click", event => {
  const addButton = event.target.closest("[data-add]");
  if (addButton) {
    addToCart(addButton.dataset.add);
    if (addButton.closest("#productModalContent")) closeLayers();
    return;
  }
  const detail = event.target.closest("[data-detail]");
  if (detail) showProductDetails(detail.dataset.detail);
});
document.querySelector("#productGrid").addEventListener("keydown", event => {
  if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-detail]")) {
    event.preventDefault();
    showProductDetails(event.target.dataset.detail);
  }
});
document.querySelector("#productModalContent").addEventListener("click", event => {
  const addButton = event.target.closest("[data-add]");
  if (addButton) {
    addToCart(addButton.dataset.add);
    closeLayers();
  }
});
document.querySelector("#cartItems").addEventListener("click", event => {
  const quantityButton = event.target.closest("[data-quantity]");
  const removeButton = event.target.closest("[data-remove]");
  if (quantityButton) {
    const id = quantityButton.dataset.quantity;
    const next = (Number(cart[id]) || 0) + Number(quantityButton.dataset.delta);
    if (next <= 0) delete cart[id];
    else if (next <= Number(products.find(product => product.id === id)?.stock)) cart[id] = next;
    persistCart();
    renderCart();
  }
  if (removeButton) {
    delete cart[removeButton.dataset.remove];
    persistCart();
    renderCart();
  }
});

document.querySelectorAll(".age-tab").forEach(tab => tab.addEventListener("click", () => {
  activeAge = tab.dataset.age;
  document.querySelectorAll(".age-tab").forEach(item => item.classList.toggle("active", item === tab));
  renderProducts();
}));
["#searchInput", "#breedFilter", "#priceFilter", "#sortFilter"].forEach(selector => {
  document.querySelector(selector).addEventListener(selector === "#searchInput" || selector === "#priceFilter" ? "input" : "change", renderProducts);
});
document.querySelector("#resetFilters").addEventListener("click", () => {
  activeAge = "all";
  document.querySelectorAll(".age-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.age === "all"));
  document.querySelector("#searchInput").value = "";
  document.querySelector("#breedFilter").value = "all";
  document.querySelector("#priceFilter").value = "";
  document.querySelector("#sortFilter").value = "featured";
  renderProducts();
});

document.querySelector("#cartOpen").addEventListener("click", openCart);
document.querySelectorAll(".close-overlay").forEach(button => button.addEventListener("click", closeLayers));
document.querySelectorAll(".modal-close, .modal-cancel").forEach(button => button.addEventListener("click", closeLayers));
overlay.addEventListener("click", closeLayers);
document.addEventListener("keydown", event => { if (event.key === "Escape") closeLayers(); });
document.querySelector("#adminToggle").addEventListener("click", toggleAdmin);
document.querySelector("#addProduct").addEventListener("click", () => openProductForm());
document.querySelector("#inventoryBody").addEventListener("click", event => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) openProductForm(products.find(product => product.id === editButton.dataset.edit));
  if (deleteButton) {
    const product = products.find(item => item.id === deleteButton.dataset.delete);
    if (product && window.confirm(`Delete ${product.name} from inventory?`)) {
      products = products.filter(item => item.id !== product.id);
      delete cart[product.id];
      persistProducts();
      persistCart();
      renderAdmin();
      renderCart();
      renderProducts();
      showToast(`${product.name} removed from inventory.`);
    }
  }
});

document.querySelector("#productForm").addEventListener("submit", event => {
  event.preventDefault();
  const id = document.querySelector("#productId").value;
  const existing = products.find(product => product.id === id);
  const age = Number(document.querySelector("#productAge").value);
  const item = {
    ...(existing || {}),
    id: existing?.id || `bird-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: document.querySelector("#productName").value.trim(),
    breed: document.querySelector("#productBreed").value.trim(),
    age,
    ageWeeks: existing && Number(existing.age) === age ? existing.ageWeeks : age * 4,
    price: Number(document.querySelector("#productPrice").value),
    stock: Number(document.querySelector("#productStock").value),
    image: safeImage(document.querySelector("#productImage").value),
    description: document.querySelector("#productDescription").value.trim(),
    weight: existing?.weight || "Breed-typical range",
    eggs: existing?.eggs || "Varies by individual",
    temperament: existing?.temperament || "Friendly and curious",
    vaccinated: existing?.vaccinated || "Farm health program"
  };
  if (existing) products = products.map(product => product.id === existing.id ? item : product);
  else products.unshift(item);
  persistProducts();
  renderAdmin();
  renderProducts();
  closeLayers();
  showToast(existing ? "Listing updated." : "A new bird joined the flock.");
});

document.querySelector("#checkoutOpen").addEventListener("click", openCheckout);
const checkoutMarkup = document.querySelector("#checkoutContent").innerHTML;
document.querySelector("#checkoutContent").addEventListener("submit", event => {
  if (event.target.id !== "checkoutForm") return;
  event.preventDefault();
  if (Object.keys(cart).length === 0) return;
  const name = new FormData(event.target).get("fullName").trim().split(/\s+/)[0];
  document.querySelector("#checkoutContent").innerHTML = `<div class="order-success"><span>✳</span><h2>Thank you, ${escapeHTML(name)}.</h2><p>Your demo order is in. We’ll be in touch to confirm delivery details and make sure your new flock arrives happy and healthy.</p><button class="button button-dark" id="continueShopping" type="button">Back to the flock <span aria-hidden="true">↗</span></button></div>`;
  cart = {};
  persistCart();
  renderCart();
  renderAdmin();
});
document.querySelector("#checkoutContent").addEventListener("click", event => {
  if (!event.target.closest("#continueShopping")) return;
  closeLayers();
  document.querySelector("#checkoutContent").innerHTML = checkoutMarkup;
});

renderProducts();
renderCart();