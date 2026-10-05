document.body.appendChild(Object.assign(document.createElement('style'), {
  innerHTML: `
    .toast {
      width: 100%;
      position: absolute;
      left: 0;
      height: 0;
      display: flex;
      justify-content: center;
      transition: bottom 0.2s ease-out, opacity 0.2s ease-in;
      opacity: 1;
      z-index: 100;
    }
    .toast.hidden {
      opacity: 0;
    }
    .toast h3 {
      font-weight: 200;
      font-size: 1em;
      line-height: 2.5em;
      padding: 0em 1.2em;
      margin: 0;
      height: 2.5em;
      z-index: 100;
      color: #fff;
      background-color: #000;
      box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.25);
      border-radius: 1em;
    }
  `
}));


let existingToast;

class Toast {
  constructor (msg) {
    this.el = Object.assign(document.createElement('div'), {
      className: 'toast hidden',
      innerHTML: `<h3>${msg}</h3>`
    });
    this.el.style.bottom = '0em';
    document.body.appendChild(this.el);

    if (existingToast)
      existingToast.hide().then(() => this.show());
    else
      setTimeout(this.show.bind(this), 10);
    
    this.hidden = false;
    existingToast = this;

    setTimeout(this.hide.bind(this), 2500);
  }

  show () {
    this.el.style.bottom = '3.5em';
    this.el.className = 'toast';
  }

  async hide () {
    if (this.hidden)
      return;
    this.hidden = true;
    if (existingToast === this)
      existingToast = undefined;
    this.el.className = 'toast hidden';
    await new Promise(resolve => setTimeout(resolve, 200));
    document.body.removeChild(this.el);
  }
}

export function toast (msg) {
  new Toast(msg);
}
