class ProgressBar extends HTMLElement {
  constructor () {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(Object.assign(document.createElement('style'), { textContent: `
      .el {
        margin-top: -1px;
        width: 100%;
        height: 3px;
        overflow: hidden;
      }
      .progress {
        position: relative;
        width: 100%;
        background-color: #A0BDC9;
        height: 3px;
        margin-bottom: -3px;
        transition: 0.2s linear all;
        background: linear-gradient(90deg, #c8dae2, #A0BDC9, #c8dae2, #A0BDC9, #c8dae2);
        background-size: 200% 30px;
        animation: gradient 2s ease-out infinite;
      }
      @keyframes gradient {
        0% {
          background-position: 0% 0;
        }
        100% {
          background-position: 100% 0;
        }
      }
      .progress.hidden {
        transition: none;
        visibility: hidden;
      }
      `
    }));
    this.hidden = true;
    this.jobTime = 0;
    this.runningTime = 0;
    this.completedWork = 0;
    this.workCnt = 0;
    const el = Object.assign(document.createElement('div'), { className: 'el' });
    this.progress = Object.assign(document.createElement('div'), { className: 'progress hidden' });
    el.appendChild(this.progress);
    shadow.appendChild(el);
  }
  hide () {
    if (!this.hidden) {
      this.hidden = true;
      this.progress.style.left = '-100%';
      this.progress.className = 'progress hidden';
    }
  }
  setEstimate (estimatedTime) {
    this.runningTime = estimatedTime;
    this.completedWork = 1;
  }
  getEstimate () {
    return this.runningTime / this.completedWork;
  }
  addWork (items = 1) {
    if (items === 0)
      return;
    this.workCnt += items;
    this.load(this.workCnt * this.getEstimate());
  }
  completeWork (items = 1) {
    this.completedWork += items;
    this.workCnt -= items;
    if (this.workCnt <= 0)
      this.complete();
    else
      this.load(this.workCnt * this.getEstimate());
  }
  load (estimatedDuration, curProgress = this.jobTime) {
    if (this.loader) {
      clearInterval(this.loader);
      this.loader = undefined;
    }
    let interval = 200;
    let time = curProgress || 0;
    setProgress.call(this, 0);
    this.loader = setInterval(() => {
      this.runningTime += 200;
      this.jobTime += 200;
      if (time + interval > 0.9 * estimatedDuration) {
        const remaining = estimatedDuration - time;
        const remainingTime = remaining / interval;
        if (remainingTime < interval * 10)
          interval *= 0.5;
        else if (remainingTime > interval * 10)
          interval *= 1.1;
        while (time + interval * 5 > estimatedDuration)
          interval = interval * 0.9;
      }
      time += interval;
      setProgress.call(this, time / estimatedDuration);
    }, interval);
  }
  complete () {
    this.completedWork += this.workCnt;
    this.workCnt = 0;
    this.jobTime = 0;
    if (this.loader) {
      clearInterval(this.loader);
      this.loader = undefined;
    }
    setProgress.call(this, 1);
  }
}
function setProgress (pc) {
  if (this.hidden) {
    this.progress.className = 'progress';
    this.hidden = false;
  }
  this.progress.style.left = -((1 - pc) * 100) + '%';
  if (pc === 1)
    setTimeout(() => this.hide(), 200);
}
customElements.define('progress-bar', ProgressBar);
