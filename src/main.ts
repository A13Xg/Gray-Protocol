import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { assertContentDefinitions } from './core/content/validation'

assertContentDefinitions()

createApp(App).mount('#app')
