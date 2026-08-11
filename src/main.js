import { createAppContainer } from "./app/container.js";
import { App } from "./app/App.js";

const root = document.querySelector("#app");
const container = createAppContainer();
const app = new App(root, container);

app.start();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // PWA offline support is optional during local file previews.
    });
  });
}
