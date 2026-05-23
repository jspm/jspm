import { html, LitElement } from "lit";
import "@spectrum-web-components/icons-workflow/icons/sp-icon-email.js";

class EmailIconElement extends LitElement {
  render() {
    return html` <sp-icon-email></sp-icon-email> `;
  }
}
customElements.define("email-icon-element", EmailIconElement);
