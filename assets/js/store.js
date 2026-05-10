(() => {
  const storageKey = "hairry-blossom-cart";
  const products = {
    shampoo: {
      id: "shampoo",
      name: "Hairry Blossom Ayurvedic Shampoo",
      size: "200 ml",
      price: 279,
      image: "assets/img/amazon-shampoo-detail.jpg",
      amazonUrl: "https://www.amazon.in/dp/B0GWXWK2S8",
    },
    oil: {
      id: "oil",
      name: "Hairry Blossom Herbal Hair Oil",
      size: "100 ml",
      price: 299,
      image: "assets/img/amazon-hair-oil.jpg",
      amazonUrl: "https://www.amazon.in/gp/product/B0FTVB8CVV",
    },
    combo: {
      id: "combo",
      name: "Hairry Blossom Shampoo + Hair Oil Combo",
      size: "200 ml + 100 ml",
      price: 549,
      image: "assets/img/product-duo.png",
      amazonUrl: "",
    },
  };

  const readCart = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey));
      return Array.isArray(parsed) ? parsed.filter((item) => products[item.id]) : [];
    } catch {
      return [];
    }
  };

  let cart = readCart();
  let toastTimer;

  const formatPrice = (amount) => `Rs. ${amount.toLocaleString("en-IN")}`;
  const saveCart = () => localStorage.setItem(storageKey, JSON.stringify(cart));
  const cartCount = () => cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = () =>
    cart.reduce((sum, item) => sum + products[item.id].price * item.quantity, 0);

  const ensureCartRoot = () => {
    let root = document.getElementById("cart-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "cart-root";
      document.body.append(root);
    }

    root.innerHTML = `
      <div class="cart-overlay" data-close-cart></div>
      <aside class="cart-drawer" aria-label="Shopping cart" aria-hidden="true">
        <header class="cart-header">
          <h2>Your Cart</h2>
          <button class="icon-button" type="button" data-close-cart aria-label="Close cart">x</button>
        </header>
        <div class="cart-body" data-cart-body></div>
        <footer class="cart-footer">
          <div class="subtotal-row">
            <span>Subtotal</span>
            <strong data-cart-subtotal>Rs. 0</strong>
          </div>
          <button class="btn btn-primary btn-full" type="button" data-show-checkout>Checkout</button>
          <form class="checkout-form" data-checkout-form>
            <h3>Checkout Details</h3>
            <div class="form-field">
              <label for="checkout-name">Name</label>
              <input id="checkout-name" name="name" autocomplete="name" required>
            </div>
            <div class="form-field">
              <label for="checkout-email">Email</label>
              <input id="checkout-email" name="email" type="email" autocomplete="email" required>
            </div>
            <div class="form-field">
              <label for="checkout-phone">Phone</label>
              <input id="checkout-phone" name="phone" autocomplete="tel" required>
            </div>
            <div class="form-field">
              <label for="checkout-address">Delivery Address</label>
              <textarea id="checkout-address" name="address" required></textarea>
            </div>
            <button class="btn btn-earth btn-full" type="submit">Place Order</button>
          </form>
        </footer>
      </aside>
      <div class="toast" role="status" aria-live="polite" data-toast></div>
    `;
  };

  const updateCounts = () => {
    document.querySelectorAll("[data-cart-count]").forEach((countNode) => {
      countNode.textContent = String(cartCount());
    });
  };

  const showToast = (message) => {
    const toast = document.querySelector("[data-toast]");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  };

  const renderCart = () => {
    const body = document.querySelector("[data-cart-body]");
    const subtotal = document.querySelector("[data-cart-subtotal]");
    const checkoutForm = document.querySelector("[data-checkout-form]");
    if (!body || !subtotal) return;

    subtotal.textContent = formatPrice(cartSubtotal());
    updateCounts();

    if (!cart.length) {
      body.innerHTML = `
        <div class="empty-cart">
          <strong>Your cart is ready for something herbal.</strong>
          <p>Add shampoo, hair oil, or the complete combo to begin checkout.</p>
        </div>
      `;
      checkoutForm?.classList.remove("is-visible");
      return;
    }

    body.innerHTML = cart
      .map((item) => {
        const product = products[item.id];
        return `
          <article class="cart-line">
            <img src="${product.image}" alt="${product.name}">
            <div>
              <div class="cart-line-title">${product.name}</div>
              <div class="cart-line-meta">${product.size} - ${formatPrice(product.price)}</div>
              <div class="cart-controls">
                <div class="qty-control" aria-label="Quantity for ${product.name}">
                  <button type="button" data-cart-action="decrease" data-product-id="${product.id}" aria-label="Decrease quantity">-</button>
                  <span>${item.quantity}</span>
                  <button type="button" data-cart-action="increase" data-product-id="${product.id}" aria-label="Increase quantity">+</button>
                </div>
                <button class="remove-line" type="button" data-cart-action="remove" data-product-id="${product.id}">Remove</button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  };

  const openCart = () => {
    document.body.classList.add("cart-open");
    document.querySelector(".cart-drawer")?.setAttribute("aria-hidden", "false");
  };

  const closeCart = () => {
    document.body.classList.remove("cart-open");
    document.querySelector(".cart-drawer")?.setAttribute("aria-hidden", "true");
  };

  const addToCart = (id, quantity = 1) => {
    const product = products[id];
    if (!product) return;
    const current = cart.find((item) => item.id === id);
    if (current) {
      current.quantity += quantity;
    } else {
      cart.push({ id, quantity });
    }
    saveCart();
    renderCart();
    showToast(`${product.name} added to cart`);
    openCart();
  };

  const updateQuantity = (id, nextQuantity) => {
    cart = cart
      .map((item) => (item.id === id ? { ...item, quantity: nextQuantity } : item))
      .filter((item) => item.quantity > 0);
    saveCart();
    renderCart();
  };

  const handleCartAction = (button) => {
    const id = button.dataset.productId;
    const item = cart.find((line) => line.id === id);
    if (!item) return;

    if (button.dataset.cartAction === "increase") updateQuantity(id, item.quantity + 1);
    if (button.dataset.cartAction === "decrease") updateQuantity(id, item.quantity - 1);
    if (button.dataset.cartAction === "remove") updateQuantity(id, 0);
  };

  const initNavigation = () => {
    const toggle = document.querySelector("[data-menu-toggle]");
    const nav = document.querySelector("[data-site-nav]");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  };

  const initForms = () => {
    document.querySelectorAll("[data-contact-form]").forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        form.reset();
        showToast("Thanks. Your message has been received.");
      });
    });
  };

  const initStorefront = () => {
    ensureCartRoot();
    renderCart();
    initNavigation();
    initForms();

    document.addEventListener("click", (event) => {
      const addButton = event.target.closest("[data-add-to-cart]");
      if (addButton) {
        const quantityInputId = addButton.dataset.quantitySource;
        const quantityInput = quantityInputId ? document.getElementById(quantityInputId) : null;
        const quantity = quantityInput ? Number(quantityInput.value) : 1;
        addToCart(addButton.dataset.addToCart, Math.max(1, quantity || 1));
        return;
      }

      if (event.target.closest("[data-open-cart]")) {
        openCart();
        return;
      }

      if (event.target.closest("[data-close-cart]")) {
        closeCart();
        return;
      }

      const cartAction = event.target.closest("[data-cart-action]");
      if (cartAction) {
        handleCartAction(cartAction);
        return;
      }

      if (event.target.closest("[data-show-checkout]")) {
        if (!cart.length) {
          showToast("Add at least one product before checkout.");
          return;
        }
        document.querySelector("[data-checkout-form]")?.classList.add("is-visible");
      }
    });

    document.addEventListener("submit", (event) => {
      const form = event.target.closest("[data-checkout-form]");
      if (!form) return;
      event.preventDefault();
      cart = [];
      saveCart();
      renderCart();
      form.reset();
      closeCart();
      showToast("Order placed. We will contact you to confirm delivery.");
    });
  };

  document.addEventListener("DOMContentLoaded", initStorefront);

  window.HairryCart = { addToCart, openCart };
})();
