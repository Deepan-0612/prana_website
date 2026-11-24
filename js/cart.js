/*
 * Prana Cart & WhatsApp Checkout System (Self-initializing, no module dependency required)
 */

(function () {
  const WHATSAPP_NUMBER = '917339112959';
  const STORAGE_KEY = 'prana_cart_items';

  const cart = {
    items: [],

    init() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        this.items = stored ? JSON.parse(stored) : [];
      } catch (e) {
        this.items = [];
      }
      this.renderDrawer();
      this.updateBadge();
      this.bindEvents();
    },

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
      } catch (e) {}
      this.updateBadge();
      this.renderItems();
    },

    add(product) {
      const existing = this.items.find((item) => item.id === product.id);
      if (existing) {
        existing.qty += 1;
      } else {
        const item = {
          id: product.id,
          title: product.title,
          price: Number(product.price) || 0,
          img: product.img || '',
          qty: 1
        };
        // Preserve custom design metadata when provided
        if (product.design)  item.design = product.design;
        if (product.beadSize) item.beadSize = product.beadSize;
        if (product.wrist)    item.wrist = product.wrist;
        if (product.fit)      item.fit = product.fit;
        if (product.beadCount) item.beadCount = product.beadCount;
        this.items.push(item);
      }
      this.save();
      this.showToast('Added "' + product.title + '" to your bag');
      this.openDrawer();
    },

    updateQty(id, delta) {
      const item = this.items.find((i) => i.id === id);
      if (!item) return;
      item.qty += delta;
      if (item.qty <= 0) {
        this.items = this.items.filter((i) => i.id !== id);
      }
      this.save();
    },

    remove(id) {
      this.items = this.items.filter((i) => i.id !== id);
      this.save();
    },

    count() {
      return this.items.reduce((sum, item) => sum + item.qty, 0);
    },

    total() {
      return this.items.reduce((sum, item) => sum + item.price * item.qty, 0);
    },

    updateBadge() {
      const totalCount = this.count();
      document.querySelectorAll('.nav__count').forEach((el) => {
        el.textContent = totalCount;
      });
    },

    renderDrawer() {
      if (document.getElementById('pranaCartDrawer')) return;

      const drawerHtml = `
        <div class="prana-cart-backdrop" id="pranaCartBackdrop" aria-hidden="true"></div>
        <aside class="prana-cart-drawer glass glass--dark" id="pranaCartDrawer" role="dialog" aria-modal="true" aria-label="Shopping Bag">
          <div class="prana-cart-header">
            <div class="prana-cart-title">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>
              <h2>Your Bag (<span id="cartDrawerCount">0</span>)</h2>
            </div>
            <button class="prana-cart-close" id="pranaCartClose" type="button" aria-label="Close bag">&times;</button>
          </div>

          <div class="prana-cart-body" id="pranaCartItems">
            <!-- items injected here -->
          </div>

          <div class="prana-cart-footer" id="pranaCartFooter">
            <div class="prana-cart-summary">
              <span>Total:</span>
              <span class="prana-cart-total-price" id="pranaCartTotal">₹0</span>
            </div>
            <p class="prana-cart-note">⚡ Free shipping & mindful packaging included across India</p>
            <button class="prana-whatsapp-btn" id="pranaWhatsappOrderBtn" type="button">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.35C9.35 7.35 9.06 7.42 8.81 7.69C8.56 7.96 7.85 8.62 7.85 9.97C7.85 11.32 8.83 12.62 8.97 12.81C9.11 13 10.9 15.76 13.64 16.94C14.29 17.22 14.8 17.39 15.2 17.51C15.86 17.72 16.46 17.69 16.93 17.62C17.46 17.54 18.56 16.95 18.79 16.31C19.02 15.67 19.02 15.12 18.95 15C18.88 14.89 18.7 14.82 18.43 14.68C18.15 14.54 16.8 13.88 16.55 13.79C16.3 13.7 16.12 13.65 15.93 13.93C15.75 14.2 15.23 14.82 15.07 15C14.91 15.19 14.75 15.21 14.47 15.07C14.2 14.93 13.31 14.64 12.26 13.71C11.45 12.98 10.89 12.08 10.73 11.81C10.58 11.53 10.71 11.38 10.85 11.24C10.98 11.11 11.14 10.9 11.28 10.74C11.42 10.58 11.47 10.46 11.56 10.28C11.65 10.1 11.61 9.94 11.54 9.8C11.47 9.67 10.92 8.3 10.68 7.74C10.46 7.19 10.24 7.27 10.07 7.26C9.91 7.25 9.73 7.25 9.53 7.35Z"/></svg>
              <span>Order Entire Bag on WhatsApp</span>
            </button>
          </div>
        </aside>
        <div class="prana-toast" id="pranaToast" aria-live="polite"></div>
      `;

      const div = document.createElement('div');
      div.innerHTML = drawerHtml;
      document.body.appendChild(div);
    },

    renderItems() {
      const list = document.getElementById('pranaCartItems');
      const totalEl = document.getElementById('pranaCartTotal');
      const countEl = document.getElementById('cartDrawerCount');
      const footer = document.getElementById('pranaCartFooter');
      if (!list) return;

      const count = this.count();
      if (countEl) countEl.textContent = count;
      if (totalEl) totalEl.textContent = '₹' + this.total().toLocaleString('en-IN');

      if (this.items.length === 0) {
        list.innerHTML = `
          <div class="prana-cart-empty">
            <p>Your bag is currently empty.</p>
            <a class="btn btn--solid btn--sm" href="shop.html">Explore mindful pieces</a>
          </div>
        `;
        if (footer) footer.style.display = 'none';
        return;
      }

      if (footer) footer.style.display = 'block';

      list.innerHTML = this.items.map((item) => `
        <div class="prana-cart-item" data-id="${item.id}">
          <img class="prana-cart-item-img" src="${item.img}" alt="${item.title}" loading="lazy">
          <div class="prana-cart-item-info">
            <h4>${item.title}</h4>
            <span class="prana-cart-item-price">₹${item.price.toLocaleString('en-IN')}</span>
            <div class="prana-cart-qty-ctrl">
              <button type="button" class="prana-qty-btn" data-action="dec" data-id="${item.id}" aria-label="Decrease quantity">−</button>
              <span class="prana-qty-val">${item.qty}</span>
              <button type="button" class="prana-qty-btn" data-action="inc" data-id="${item.id}" aria-label="Increase quantity">+</button>
              <button type="button" class="prana-item-del" data-action="del" data-id="${item.id}" aria-label="Remove item">Remove</button>
            </div>
          </div>
        </div>
      `).join('');
    },

    openDrawer() {
      const drawer = document.getElementById('pranaCartDrawer');
      const backdrop = document.getElementById('pranaCartBackdrop');
      if (!drawer) return;
      this.renderItems();
      drawer.classList.add('is-open');
      backdrop && backdrop.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    },

    closeDrawer() {
      const drawer = document.getElementById('pranaCartDrawer');
      const backdrop = document.getElementById('pranaCartBackdrop');
      if (!drawer) return;
      drawer.classList.remove('is-open');
      backdrop && backdrop.classList.remove('is-open');
      document.body.style.overflow = '';
    },

    showToast(msg) {
      const toast = document.getElementById('pranaToast');
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('is-shown');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        toast.classList.remove('is-shown');
      }, 2800);
    },

    checkoutWhatsapp() {
      if (this.items.length === 0) {
        this.showToast('Please add items to your bag first');
        return;
      }

      let msg = '*Namaste Prana Team!* 🙏\nI would like to place an order from your website:\n\n';
      this.items.forEach((item, idx) => {
        const lineTotal = item.price * item.qty;
        msg += (idx + 1) + '. *' + item.title + '*\n   Qty: ' + item.qty + ' × ₹' + item.price.toLocaleString('en-IN') + ' = ₹' + lineTotal.toLocaleString('en-IN') + '\n';
      });

      msg += '\n*Total Amount:* ₹' + this.total().toLocaleString('en-IN');
      msg += '\n*Delivery:* Free Standard Shipping Across India';
      msg += '\n\nPlease let me know the payment options and confirm my order!';

      const url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg);
      window.open(url, '_blank');
    },

    bindEvents() {
      document.addEventListener('click', (e) => {
        // Toggle / Open drawer from nav bag
        const bag = e.target.closest('.nav__bag');
        if (bag) {
          e.preventDefault();
          this.openDrawer();
          return;
        }

        // Close drawer button
        if (e.target.closest('#pranaCartClose') || e.target.closest('#pranaCartBackdrop')) {
          this.closeDrawer();
          return;
        }

        // Quantity buttons inside drawer
        const qtyBtn = e.target.closest('.prana-qty-btn');
        if (qtyBtn) {
          const id = qtyBtn.dataset.id;
          const action = qtyBtn.dataset.action;
          this.updateQty(id, action === 'inc' ? 1 : -1);
          return;
        }

        // Delete item
        const delBtn = e.target.closest('.prana-item-del');
        if (delBtn) {
          const id = delBtn.dataset.id;
          this.remove(id);
          return;
        }

        // WhatsApp Checkout
        if (e.target.closest('#pranaWhatsappOrderBtn')) {
          this.checkoutWhatsapp();
          return;
        }

        // Add to Cart buttons
        const addBtn = e.target.closest('[data-add-cart]');
        if (addBtn) {
          e.preventDefault();
          e.stopPropagation();
          const product = {
            id: addBtn.dataset.productId,
            title: addBtn.dataset.productTitle,
            price: addBtn.dataset.productPrice,
            img: addBtn.dataset.productImg
          };
          this.add(product);
          return;
        }

        // Instant WhatsApp buy now button (single product)
        const buyNowBtn = e.target.closest('[data-buy-now]');
        if (buyNowBtn) {
          e.preventDefault();
          e.stopPropagation();
          const title = buyNowBtn.dataset.productTitle;
          const price = buyNowBtn.dataset.productPrice;
          const msg = '*Namaste Prana Team!* 🙏\nI would like to order:\n\n*Product:* ' + title + '\n*Price:* ₹' + Number(price).toLocaleString('en-IN') + '\n*Delivery:* Free Standard Shipping\n\nPlease confirm availability and payment details!';
          const url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg);
          window.open(url, '_blank');
          return;
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeDrawer();
      });
    }
  };

  window.pranaCart = cart;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => cart.init());
  } else {
    cart.init();
  }
})();
