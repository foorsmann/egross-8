/**
 * collection-quick-add.js - isolated quantity + double qty + ajax add-to-cart for collection cards
 * Mirrors product-page quantity logic with collection-specific hooks.
 */
(function(){
  function snapDown(val, step, min){
    if(!isFinite(val)) return min;
    if(val < min) return min;
    return Math.floor((val - min)/step)*step + min;
  }
  function clampAndSnap(val, step, min, max, snap){
    val = Math.min(val, max);
    if(val < min) val = min;
    if(snap && val !== max){
      val = snapDown(val, step, min);
    }
    return val;
  }
  function clearTextSelection(){
    var sel = window.getSelection ? window.getSelection() : null;
    if(sel && sel.removeAllRanges){ sel.removeAllRanges(); }
  }
  function validateAndHighlight(input){
      if(input.value === ''){
        input.classList.remove('text-red-600');
        input.style.color = '';
        return;
    }
    var min = input.min ? parseInt(input.min,10) : 1;
    var step = parseInt(input.getAttribute('data-collection-min-qty'),10) || parseInt(input.step,10) || 1;
    var max = input.max ? parseInt(input.max,10) : Infinity;
    var val = parseInt(input.value,10);
    if(isNaN(val)) val = min;
    val = clampAndSnap(val, step, min, max, false);
    input.value = val;
    if(val >= max){
      input.classList.add('text-red-600');
      input.style.color = '#e3342f';
    }else{
      input.classList.remove('text-red-600');
      input.style.color = '';
    }
    return val;
  }
  function updateQtyButtonsState(input){
    var wrap = input.closest('collection-quantity-input');
    if(!wrap) return;
    var plus = wrap.querySelector('[data-collection-quantity-selector="increase"]');
    var minus = wrap.querySelector('[data-collection-quantity-selector="decrease"]');
    var max = input.max ? parseInt(input.max,10) : Infinity;
    var step = parseInt(input.getAttribute('data-collection-min-qty'),10) || parseInt(input.step,10) || 1;
    var minQty = step;
    var val = parseInt(input.value,10);
    if(isNaN(val)) val = 0;
    if(plus) plus.disabled = isFinite(max) && val >= max;
    if(minus) minus.disabled = val <= minQty;
  }
  function syncOtherQtyInputs(changed){
    var pid = changed.dataset.collectionProductId;
    if(!pid) return;
    var value = changed.value;
    document.querySelectorAll('input[data-collection-product-id="'+pid+'"][data-collection-quantity-input]').forEach(function(inp){
      if(inp === changed) return;
      if(inp.value !== value){
        inp.value = value;
        validateAndHighlight(inp);
        updateQtyButtonsState(inp);
        inp.dispatchEvent(new Event('input',{bubbles:true}));
        inp.dispatchEvent(new Event('change',{bubbles:true}));
      }
    });
  }
  function applyMinQty(){
    document.querySelectorAll('input[data-collection-min-qty]').forEach(function(input){
      var min = parseInt(input.getAttribute('data-collection-min-qty'),10);
      if(min && min > 0){
        input.min = 1;
        input.step = min;
        validateAndHighlight(input);
        updateQtyButtonsState(input);
      }
    });
  }
  function applyCappedQtyState(source){
    var pid = source.dataset.collectionProductId;
    var inputs = document.querySelectorAll('input[data-collection-product-id="'+pid+'"][data-collection-quantity-input]');
    inputs.forEach(function(input){
      input.dataset.prevMin = input.min;
      var prevAttr = input.getAttribute('data-collection-min-qty');
      if(prevAttr !== null) input.dataset.prevMinQtyAttr = prevAttr;
      input.removeAttribute('data-collection-min-qty');
      input.min = 0;
      input.value = 0;
      input.classList.add('text-red-600');
      input.style.color = '#e3342f';
      updateQtyButtonsState(input);
      setTimeout(function(){
        input.value = 0;
        updateQtyButtonsState(input);
      },0);
      var clearWarning = function(){
        input.classList.remove('text-red-600');
        input.style.color = '';
        if(input.dataset.prevMin){
          input.min = input.dataset.prevMin;
          delete input.dataset.prevMin;
        }
        if(input.dataset.prevMinQtyAttr !== undefined){
          input.setAttribute('data-collection-min-qty', input.dataset.prevMinQtyAttr);
          delete input.dataset.prevMinQtyAttr;
        }
        input.removeEventListener('input', clearWarning);
        input.removeEventListener('change', clearWarning);
        syncOtherQtyInputs(input);
      };
      input.addEventListener('input', clearWarning, {once:true});
      input.addEventListener('change', clearWarning, {once:true});
    });
  }
  window.collectionApplyCappedQtyState = applyCappedQtyState;
  function handleQtyInputEvent(e){
    var input = e.target.closest('input[data-collection-quantity-input]');
    if(!input) return;
    validateAndHighlight(input);
    updateQtyButtonsState(input);
    syncOtherQtyInputs(input);
    updateCollectionDoubleQtyState(input);
  }

  function handleQtyKeypress(e){
    if(e.key !== 'Enter') return;
    var input = e.target.closest('input[data-collection-quantity-input]');
    if(!input) return;
    validateAndHighlight(input);
    updateQtyButtonsState(input);
    syncOtherQtyInputs(input);
    updateCollectionDoubleQtyState(input);
  }
  function adjustQuantity(input, delta, baseVal){
    var stepAttr = input.getAttribute('data-collection-min-qty');
    if(!stepAttr && input.dataset.prevMinQtyAttr){
      stepAttr = input.dataset.prevMinQtyAttr;
    }
    var step = parseInt(stepAttr,10) || parseInt(input.step,10) || 1;
    var max = input.max ? parseInt(input.max,10) : Infinity;
    var minQty = step;
    var val = baseVal !== undefined ? parseInt(baseVal,10) : parseInt(input.value,10);
    if(isNaN(val)) val = 1;
    if(delta > 0 && isFinite(max) && val >= max){
      validateAndHighlight(input);
      updateQtyButtonsState(input);
      return;
    }
    if(delta < 0){
      if((val - minQty) % step !== 0){
        val = Math.floor((val - minQty) / step) * step + minQty;
      }else{
        val -= step;
      }
      if(val < minQty) val = minQty;
    }else{
      if((val - minQty) % step !== 0){
        val = Math.ceil((val - minQty) / step) * step + minQty;
      }else{
        val += step;
      }
      if(val > max) val = max;
    }
    var newVal = clampAndSnap(val, step, 1, max);
    input.value = newVal;
    if(newVal >= max){
      input.classList.add('text-red-600');
      input.style.color = '#e3342f';
    }else{
      input.classList.remove('text-red-600');
      input.style.color = '';
    }
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    updateQtyButtonsState(input);
  }
  var qtyButtonListenerBound = false;
  function attachQtyButtonListeners(){
    if(qtyButtonListenerBound) return;
    qtyButtonListenerBound = true;
    document.addEventListener('click', function(e){
      var btn = e.target.closest('[data-collection-quantity-selector]');
      if(!btn) return;
      var wrap = btn.closest('collection-quantity-input') || btn.parentNode;
      var input = wrap ? wrap.querySelector('input[data-collection-quantity-input]') : null;
      if(!input) return;
      var before = input.value;
      var action = btn.getAttribute('data-collection-quantity-selector');
      if(action === 'increase'){
        adjustQuantity(input,1,before);
      }else if(action === 'decrease'){
        adjustQuantity(input,-1,before);
      }else{
        validateAndHighlight(input);
        updateQtyButtonsState(input);
      }
      clearTextSelection();
      btn.blur();
    }, true);
  }

  var noHighlightListenerBound = false;
  function attachNoHighlightListeners(){
    if(noHighlightListenerBound) return;
    noHighlightListenerBound = true;
    document.addEventListener('click', function(e){
      var btn = e.target.closest('.collection-add-to-cart, .collection-double-qty-btn, .collection-qty-button, .sf__btn');
      if(!btn || !btn.closest('.sf__pcard-quick-add-col')) return;
      clearTextSelection();
      btn.blur();
    }, true);
  }
  function findQtyInput(btn){
    var group = btn.closest('.collection-qty-group');
    if(group){
      var inp = group.querySelector('input[data-collection-quantity-input]');
      if(inp) return inp;
    }
    var pid = btn.getAttribute('data-collection-product-id');
    if(pid){
      return document.querySelector('input[data-collection-product-id="'+pid+'"][data-collection-quantity-input]');
    }
    return null;
  }

  function setupCollectionDoubleQtyButton(btn){
    var input = findQtyInput(btn);
    if(!input) return;
    var storedMin = parseInt(btn.getAttribute('data-collection-original-min-qty'),10);
    var min = isNaN(storedMin) ? (parseInt(input.getAttribute('data-collection-min-qty'),10) || 1) : storedMin;
    if(isNaN(storedMin)){
      btn.setAttribute('data-collection-original-min-qty', min);
    }
    var template = btn.getAttribute('data-collection-label-template') || btn.textContent;
    var label = template.replace('{min_qty}', min);
    btn.setAttribute('aria-label', label);
    btn.textContent = label;
    var max = input.max ? parseInt(input.max,10) : 9999;
    var val = parseInt(input.value,10) || 1;
    btn.disabled = val >= max;
  }

  function setupCollectionDoubleQtyButtons(){
    document.querySelectorAll('.collection-double-qty-btn').forEach(setupCollectionDoubleQtyButton);
  }

  function updateCollectionDoubleQtyState(input){
    var pid = input.dataset.collectionProductId;
    if(!pid) return;
    document.querySelectorAll('.collection-double-qty-btn[data-collection-product-id="'+pid+'"]').forEach(function(btn){
      setupCollectionDoubleQtyButton(btn);
    });
  }

  function handleDoubleQtyClick(e){
    var btn = e.target.closest('.collection-double-qty-btn');
    if(!btn) return;
    e.preventDefault();
    var input = findQtyInput(btn);
    if(!input) return;
    var step = parseInt(input.getAttribute('data-collection-min-qty'),10) || parseInt(input.step,10) || 1;
    var max = input.max ? parseInt(input.max,10) : Infinity;
    var current = parseInt(input.value,10);
    if(isNaN(current)) current = 0;
    var newVal = current + step;
    if(newVal > max) newVal = max;
    input.value = newVal;
    validateAndHighlight(input);
    updateQtyButtonsState(input);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    updateCollectionDoubleQtyState(input);
    clearTextSelection();
    btn.blur();
  }

  function handleDoubleQtyFocus(e){
    var btn = e.target.closest('.collection-double-qty-btn');
    if(btn) btn.classList.add('focus');
  }

  function handleDoubleQtyBlur(e){
    var btn = e.target.closest('.collection-double-qty-btn');
    if(btn) btn.classList.remove('focus');
  }
  function updateQtyGroupLayout(){
    document.querySelectorAll('.collection-qty-group').forEach(function(group){
      var input = group.querySelector('input[data-collection-quantity-input]');
      var btn = group.querySelector('.collection-double-qty-btn');
      if(!input || !btn) return;
      group.classList.toggle('is-wrapped', btn.offsetTop > input.offsetTop);
    });
  }
  var qtyLayoutListenerBound = false;
  function watchQtyGroupLayout(){
    updateQtyGroupLayout();
    if(qtyLayoutListenerBound) return;
    qtyLayoutListenerBound = true;
    window.addEventListener('resize', updateQtyGroupLayout);
    var container = document.querySelector('.sf-collection-list, .collection-listing');
    if(container && window.MutationObserver){
      var observer = new MutationObserver(function(){
        updateQtyGroupLayout();
        setupCollectionDoubleQtyButtons();
      });
      observer.observe(container, { childList:true, subtree:true });
    }
  }
  document.addEventListener('input', handleQtyInputEvent, true);
  document.addEventListener('change', handleQtyInputEvent, true);
  document.addEventListener('blur', handleQtyInputEvent, true);
  document.addEventListener('keypress', handleQtyKeypress, true);
  document.addEventListener('click', handleDoubleQtyClick, true);
  document.addEventListener('focus', handleDoubleQtyFocus, true);
  document.addEventListener('blur', handleDoubleQtyBlur, true);

  function initAll(){
    applyMinQty();
    setupCollectionDoubleQtyButtons();
    attachQtyButtonListeners();
    attachNoHighlightListeners();
    watchQtyGroupLayout();
  }
  document.addEventListener('DOMContentLoaded', initAll);
  window.addEventListener('shopify:section:load', initAll);
  window.addEventListener('shopify:cart:updated', initAll);
  window.addEventListener('shopify:product:updated', initAll);
  class CollectionProductForm extends HTMLElement{
    constructor(){
      super();
      this.form = this.querySelector('form');
      this.submitButton = this.querySelector('.collection-add-to-cart');
      this.idInput = this.form ? this.form.querySelector('[name="id"]') : null;
      if(this.idInput){ this.idInput.disabled = false; }
      const card = this.closest('.sf__pcard');
      this.error = new CollectionPCardError(card ? card.querySelector('.collection-pcard-error') : null);
      this.addEventListener('submit', this.onSubmit.bind(this));
    }
    toggleSpinner(show){
      this.classList[show ? 'add' : 'remove']('adding');
    }
    async onSubmit(e){
      e.preventDefault();
      this.toggleSpinner(true);
      const formData = new FormData(this.form);
      const variantId = parseInt(formData.get('id'),10);
      if(!variantId){
        this.error.show(window.ConceptSGMStrings?.noVariant || 'Selecteaza o varianta');
        this.toggleSpinner(false);
        return;
      }
      const qtyInput = this.form.querySelector('input[name="quantity"]');
      const requestedQty = parseInt(formData.get('quantity')) || 1;
      const maxQty = parseInt(qtyInput?.max) || Infinity;
      let cartQty = 0;
      try{
        const cart = await fetch('/cart.js').then(r=>r.json());
        cartQty = cart.items?.find(it=>it.variant_id === variantId)?.quantity || 0;
      }catch(err){ cartQty = 0; }
      const available = Math.max(maxQty - cartQty,0);
      let resetQty = false;
        if(available <= 0){
          this.error.show(window.ConceptSGMStrings?.cartLimit || 'Cantitatea maxima pentru acest produs este deja in cos.');
          this.toggleSpinner(false);
          return;
        }
        if(requestedQty > available){
          formData.set('quantity', available);
          resetQty = true;
          this.error.show(window.ConceptSGMStrings?.cartLimit || 'Cantitatea maxima pentru acest produs este deja in cos.');
        }
      const config = {
        method:'POST',
        headers:{Accept:'application/javascript','X-Requested-With':'XMLHttpRequest'},
        body: formData
      };
      const settings = window.ConceptSGMSettings || {};
        fetch(`${settings.routes?.cart_add_url || '/cart/add'}`, config)
          .then(async r => {
            let body;
            try{
              const ct = r.headers.get('content-type');
              if(ct && ct.includes('application/json')){
                body = await r.json();
              }else{
                const text = await r.text();
                body = { message: text };
              }
            }catch(parseErr){
              body = {};
            }
            return { statusCode: r.status, statusText: r.statusText, body };
          })
          .then(({ statusCode, statusText, body }) => {
            if(statusCode >= 400 || body.status){
              let msg = body.description || body.message || statusText;
              if(msg && typeof msg === 'string' && /<\/?html/i.test(msg)){
                msg = window.ConceptSGMStrings?.cartError || 'Error';
              }
              const errData = body.errors;
              if(!msg && errData){
                if(typeof errData === 'string') msg = errData;
                else if(Array.isArray(errData)) msg = errData[0];
                else if(typeof errData === 'object'){
                  const key = Object.keys(errData)[0];
                  msg = Array.isArray(errData[key]) ? errData[key][0] : errData[key];
                }
              }
              if(statusCode === 429){
                msg = 'Ati trimis prea multe cereri. Va rugam sa incercati din nou mai tarziu.';
              }
              this.error.show(msg);
            }else{
              window.ConceptSGMEvents?.emit('COLLECTION_ITEM_ADDED', body);
              window.Shopify?.onItemAdded?.(body);
              if(resetQty && qtyInput){ applyCappedQtyState(qtyInput); }
              this.error.hide();
            }
          })
          .catch(err => {
            let msg = err && err.message || '';
            if(!msg || /<\/?html/i.test(msg)){
              msg = window.ConceptSGMStrings?.cartError || 'Error';
            }
            this.error.show(msg);
          })
          .finally(()=>{ this.toggleSpinner(false); });
    }
  }
  if(!customElements.get('collection-product-form')){
    customElements.define('collection-product-form', CollectionProductForm);
  }
})();

