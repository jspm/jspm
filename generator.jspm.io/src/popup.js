let curPopup, curShim;

export function close () {
  if (!curPopup) return;
  curShim.removeEventListener('click', close);
  curPopup.querySelector('.close').removeEventListener('click', close);
  document.body.removeChild(curShim);
  document.body.removeChild(curPopup);
  curPopup = curShim = null;
}

export function popup (content, width = 500, height = 500) {
  if (curPopup) close();
  curShim = Object.assign(document.createElement('div'), { className: 'shim' });
  curPopup = Object.assign(document.createElement('div'), {
    className: 'popup-container',
    innerHTML: `<div class="popup"><div class="close"></div><div class="content">${content}</div></div>`
  });
  const popupInner = curPopup.querySelector('.popup');
  popupInner.style.width = width + 'px';
  popupInner.style.height = height + 'px';
  popupInner.style.marginLeft = -(width / 2) + 'px';
  popupInner.style.marginTop = -(height / 2) + 'px';
  curShim.addEventListener('click', close);
  curPopup.querySelector('.close').addEventListener('click', close);

  document.body.appendChild(curShim);
  document.body.appendChild(curPopup);

  setTimeout(() => curShim.style.opacity = 0.7, 0);
  setTimeout(() => curPopup.style.display = 'block', 100);
}
