const $optionsContainer = Object.assign(document.createElement('div'), { className: 'options-container' });
document.body.appendChild($optionsContainer);

class SelectBox extends HTMLElement {
  constructor () {
    super();

    this.open = false;
    this.$selected = this.querySelector('.selected');
    this.$options = this.querySelector('.options');
    this.addEventListener('click', () => {
      if (this.open)
        this.hide();
      else
        this.show();
    });
    this.click = e => {
      const event = new CustomEvent('change', {
        detail: {
          new: e.target.innerHTML,
          old: this.$selected.querySelector('span').innerHTML
        },
        bubbles: true
      });
      this.$selected.innerHTML = '<span>' + e.target.innerHTML + '</span>';
      this.dispatchEvent(event);
    };
    // custom blur event
    window.addEventListener('click', e => {
      if (e.target !== this && e.target.parentNode !== this && e.target.parentNode && e.target.parentNode.parentNode !== this && this.open)
        this.hide();
    });
    window.addEventListener('keydown', e => {
      if (this.open && e.code === 'Escape')
        this.hide();
    });
  }

  set (option) {
    this.$selected.innerHTML = '<span>' + option + '</span>';
  }

  get baseClassName () {
    return this.className.split(' ').filter(name => name !== 'expanded').join(' ');
  }

  hide () {
    this.className = this.baseClassName;
    this.open = false;
    $optionsContainer.removeChild(this.$optionsClone);
    this.$optionsClone.removeEventListener('click', this.click);
  }

  show () {
    const classNames = this.className.split(' ');
    if (classNames.includes('loading'))
      return;
    const rect = this.getBoundingClientRect();
    this.$optionsClone = this.$options.cloneNode(true);
    this.$optionsClone.className += ' scroll';
    $optionsContainer.style.visibility = 'hidden';
    $optionsContainer.appendChild(this.$optionsClone);
    if (classNames.includes('up')) {
      const optionsRect = this.$options.getBoundingClientRect();
      $optionsContainer.style.top = (rect.top - optionsRect.height - 3) + 'px';
      $optionsContainer.style.left = rect.left + 'px';
      this.$optionsClone.addEventListener('click', this.click);
    }
    else {
      $optionsContainer.style.top = (rect.bottom + 3) + 'px';
      $optionsContainer.style.left = (rect.left) + 'px';
      this.$optionsClone.addEventListener('click', this.click);
    }
    this.className = this.baseClassName + ' expanded';
    // trigger reflow for scrollbar width
    this.$optionsClone.querySelector('.option:last-child').style.paddingLeft = '1px';
    setTimeout(() => {
      $optionsContainer.style.visibility = 'visible';
      this.$optionsClone.querySelector('.option:last-child').style.paddingLeft = '0px';
    });
    this.open = true;
  }
}

customElements.define('select-box', SelectBox);
