import { ref } from 'vue'

export const demoPromptVisible = ref(false)

export function openDemoPrompt() {
  demoPromptVisible.value = true
}

export function closeDemoPrompt() {
  demoPromptVisible.value = false
}