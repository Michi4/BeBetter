import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import App from './App.vue'
import router from './router'
import './assets/main.css'

// Register Service Worker for Push Notifications (production only — in dev it
// would cache-first serve Vite's files and silently stale every edit)
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registered successfully with scope:', reg.scope);
      })
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
  });
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(Toast, {
  position: 'top-center',
  timeout: 2000,
  closeOnClick: true,
  pauseOnHover: false,
  hideProgressBar: true,
  newestOnTop: false,
  maxToasts: 3,
  toastClassName: 'bebetter-toast',
  bodyClassName: 'bebetter-toast-body',
})
app.mount('#app')
