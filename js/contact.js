const contactForm = document.getElementById('contactForm');

contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(contactForm);
  const message = [
    'Namaste Prana Team!',
    '',
    `Name: ${formData.get('name')}`,
    `Email: ${formData.get('email')}`,
    '',
    String(formData.get('message'))
  ].join('\n');

  window.open(`https://wa.me/917339112959?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
});
