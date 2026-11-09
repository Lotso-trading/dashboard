import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";

export function bootstrapDashboard(): void {
  const app = createApp(App);
  app.use(createPinia());
  app.mount("#app");
}

if (typeof document !== "undefined") {
  bootstrapDashboard();
}
