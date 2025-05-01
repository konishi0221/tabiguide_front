<!-- src/components/Chat.vue -->
<template>
    <div class="chat-wrap">
      <div ref="listRef" class="msg-list">
        <template v-for="(m, i) in chat.messages" :key="i">
          <div :class="m.role === 'bot' ? 'bot-row' : ''">
            <img v-if="m.role === 'bot'" :src="botIcon" class="bot-icon" />
            <div :class="['bubble', m.role === 'bot' ? 'bubble-bot' : 'bubble-user']"
                 v-html="m.text" />
          </div>
        </template>
        <div v-if="chat.loading" class="bot-row">
          <img :src="botIcon" class="bot-icon" />
          <div class="bubble bubble-bot typing">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { onMounted } from 'vue'
//   import useSpeech from '@/composables/useSpeech'
  import botIcon from '@/assets/images/default_icon.png'
import { useChatStore } from '@/stores/chat' 

  const chat = useChatStore() 
//   const { init } = useSpeech(chat)
  
//   onMounted(() => init())
  </script>
  
  <style scoped>
  .chat-wrap  { height:100%; overflow:hidden }
  .msg-list   { padding:12px; overflow-y:auto }
  .bot-row    { display:flex; align-items:flex-start; margin-bottom:8px }
  .bot-icon   { width:32px; height:32px; margin-right:6px }
  .bubble     { max-width:70%; padding:8px 12px; border-radius:12px }
  .bubble-bot { background:#eee }
  .bubble-user{ background:#0084ff; color:#fff; margin-left:auto }
  .typing .dot{ display:inline-block; width:6px; height:6px; margin:0 1px;
                border-radius:50%; background:#999; animation:blink 1s infinite }
  @keyframes blink { 50% { opacity:0.2 } }
  </style>
  