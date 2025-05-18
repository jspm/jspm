import { LitElement, css, html } from "lit-element";
import { add } from "./utils.js";
import styleSheet from "./assets/styles.css" assert { type: "css" };
import componentData from "./data.json" assert { type: "json" };
import { TYPESCRIPT_VERSION, UserManager, createDemoUsers } from "./helpers.ts";

class MyElement extends LitElement {
  static get properties() {
    return {
      myString: { type: String },
      myArray: { type: Array },
      myBool: { type: Boolean },
      items: { type: Array },
      theme: { type: String },
      userManager: { type: Object },
      activeUsers: { type: Array }
    };
  }

  static get styles() {
    return [styleSheet, css`
      .theme-header {
        font-weight: bold;
        color: darkgreen;
      }
      
      .user-info {
        margin-top: 1rem;
        padding: 1rem;
        background-color: #f5f5f5;
        border-radius: 4px;
      }
      
      .badge {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        border-radius: 3px;
        color: white;
        margin-left: 0.5rem;
      }
      
      .badge-active {
        background-color: #28a745;
      }
      
      .badge-inactive {
        background-color: #dc3545;
      }
      
      .typescript-version {
        font-size: 0.8rem;
        color: #6c757d;
        font-style: italic;
      }
    `];
  }

  constructor() {
    super();
    this.myString = "Hello World";
    this.myArray = ["an", "array", "of", "test", "data"];
    this.myBool = true;
    this.items = componentData.items;
    this.theme = componentData.settings.theme;
    
    // Initialize TypeScript class
    this.userManager = new UserManager(createDemoUsers());
    this.activeUsers = this.userManager.getActiveUsers();
    this.typescriptVersion = TYPESCRIPT_VERSION;
  }

  render() {
    return html`
      <p>${this.myString}</p>
      <p>Adding 2 + 2 ${add(2, 2)}</p>
      <p class="theme-header">Current theme: ${this.theme}</p>
      <ul>
        ${this.myArray.map((i) => html`<li>${i}</li>`)}
      </ul>
      <h3>Items from JSON:</h3>
      <ul>
        ${this.items.map((item) => html`<li>${item.name}: ${item.description}</li>`)}
      </ul>
      
      <h3>TypeScript UserManager Demo</h3>
      <p class="typescript-version">Using TypeScript ${this.typescriptVersion}</p>
      <div class="user-info">
        <h4>All Users:</h4>
        <ul>
          ${this.userManager.getAllUsers().map(
            (user) => html`
              <li>
                ${user.name} (${user.email})
                <span class="badge ${user.isActive ? 'badge-active' : 'badge-inactive'}">
                  ${user.isActive ? 'Active' : 'Inactive'}
                </span>
              </li>
            `
          )}
        </ul>
        
        <h4>Active Users Only:</h4>
        <ul>
          ${this.activeUsers.map(
            (user) => html`
              <li>${user.name} (${user.email})</li>
            `
          )}
        </ul>
      </div>
      
      ${this.myBool
        ? html`<p>Render some HTML if myBool is true</p>`
        : html`<p>Render some other HTML if myBool is false</p>`}
    `;
  }
}

customElements.define("my-element", MyElement);
