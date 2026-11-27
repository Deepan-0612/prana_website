const products = {
  'sage-jade': {
    title: 'Sage Jade Bracelet',
    image: 'assets/img/Prana calm bracelets.webp',
    alt: 'Sage Jade bracelet',
    description: 'Natural jade with gold-tone spacers.',
    collection: 'Calm',
    price: 1499,
    customizable: true
  },
  'moonstone-halo': {
    title: 'Moonstone Halo',
    image: 'assets/img/moonstone bracelet.webp',
    alt: 'Moonstone Halo bracelet',
    description: 'Moonstone with gold-tone spacers.',
    collection: 'Intuition',
    price: 1799,
    customizable: true
  },
  'tigers-eye': {
    title: 'Tiger’s Eye Strand',
    image: 'assets/img/product-tigers-eye.webp',
    alt: 'Tiger’s Eye strand bracelet',
    description: 'Tiger’s eye with gold-tone spacers.',
    collection: 'Courage',
    price: 1699,
    customizable: true
  },
  'lapis-lazuli': {
    title: 'Lapis Lazuli Bracelet',
    image: 'assets/img/Lapis Lazuli.jpg',
    alt: 'Lapis Lazuli bracelet',
    description: 'Lapis lazuli with gold-tone spacers.',
    collection: 'Clarity',
    price: 1899,
    customizable: true
  },
  'rose-quartz': {
    title: 'Rose Quartz Bracelet',
    image: 'assets/img/Rose Quartz Bracelet.webp',
    alt: 'Rose Quartz bracelet',
    description: 'Rose quartz with gold-tone spacers.',
    collection: 'Love',
    price: 1599,
    customizable: true
  },
  'rudraksha-mala': {
    title: 'Rudraksha Mala',
    image: 'assets/img/Rudraksha.avif',
    alt: 'Rudraksha mala with a gold-tone tassel',
    description: 'Rudraksha with a gold-tone tassel.',
    collection: 'Devotion',
    price: 2499,
    customizable: false
  }
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const product = products[new URLSearchParams(location.search).get('id')];
const detail = document.getElementById('productDetail');

if (product && detail) {
  document.title = `${product.title} — Prana`;
  detail.innerHTML = `
    <nav class="product-detail__breadcrumb" aria-label="Breadcrumb">
      <a href="shop.html">Shop</a><span aria-hidden="true">/</span><span>${escapeHtml(product.title)}</span>
    </nav>
    <div class="product-detail">
      <div class="product-detail__image" data-hero>
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.alt)}" width="1000" height="1250">
      </div>
      <div class="product-detail__copy" data-hero>
        <p class="eyebrow">${escapeHtml(product.collection)} collection</p>
        <h1 class="h2">${escapeHtml(product.title)}</h1>
        <p class="product-detail__description">${escapeHtml(product.description)}</p>
        <p class="product-detail__price">₹${product.price.toLocaleString('en-IN')}</p>
        <div class="product-detail__actions">
          <button class="btn-cart" type="button" data-add-cart data-product-id="${escapeHtml(new URLSearchParams(location.search).get('id'))}" data-product-title="${escapeHtml(product.title)}" data-product-price="${product.price}" data-product-img="${escapeHtml(product.image)}">Add to bag</button>
          <button class="btn-cart btn-cart--ghost" type="button" data-buy-now data-product-id="${escapeHtml(new URLSearchParams(location.search).get('id'))}" data-product-title="${escapeHtml(product.title)}" data-product-price="${product.price}">Buy on WhatsApp</button>
        </div>
        ${product.customizable ? '<a class="product-detail__customize" href="customize.html">Create a custom bracelet <span aria-hidden="true">→</span></a>' : ''}
        <p class="product-detail__note">Free standard shipping across India.</p>
      </div>
    </div>
  `;
} else if (detail) {
  detail.innerHTML = `
    <p class="eyebrow">Prana collection</p>
    <h1 class="h2">We couldn’t find that piece.</h1>
    <p class="section__sub">Browse the <a href="shop.html">complete collection</a> to find a product.</p>
  `;
}
