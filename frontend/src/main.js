import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import App from './App.vue'
import router from './router'
import './assets/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(Toast, {
  position: 'top-center',
  timeout: 2000,
  closeOnClick: true,
  pauseOnHover: false,
  hideProgressBar: true,
  newestOnTop: true,
  maxToasts: 3,
  toastClassName: 'bebetter-toast',
  bodyClassName: 'bebetter-toast-body',
})
app.mount('#app')
