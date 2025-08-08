class CollectionPCardError {
  constructor(node) {
    this.node = node;
    this.timer = null;
    if (this.node) {
      this.msgEl = this.node.querySelector('.collection-pcard-error__msg');
      if (!this.msgEl) {
        this.msgEl = document.createElement('span');
        this.msgEl.className = 'collection-pcard-error__msg';
        this.node.append(this.msgEl);
      }
    }
  }
  removeDiacritics(text) {
    if (!text) return text;
    try {
      return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch (e) {
      return text;
    }
  }
  show(msg) {
    if (!this.node) return;
    clearTimeout(this.timer);
    if (!msg) msg = window.ConceptSGMStrings?.cartError || 'Error';
    msg = this.removeDiacritics(msg);
    this.msgEl.textContent = msg;
    this.node.classList.remove('show');
    void this.node.offsetWidth;
    this.node.classList.add('show');
    const onScroll = () => this.hide();
    window.addEventListener('scroll', onScroll, { once: true });
    this.timer = setTimeout(() => this.hide(), 4000);
  }
  hide() {
    if (!this.node) return;
    this.node.classList.remove('show');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.msgEl.textContent = '';
    }, 300);
  }
}
window.CollectionPCardError = CollectionPCardError;
