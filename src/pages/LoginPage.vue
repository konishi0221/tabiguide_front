<template>
  <div class="login-wrapper">
    <h2>ログイン</h2>
    <div class="form-group">
      <label>メールアドレス</label>
      <input type="email" v-model="email" />
    </div>
    <div class="form-group">
      <label>パスワード</label>
      <input type="password" v-model="password" />
    </div>
    <div class="form-group">
      <button @click="login">送信</button>
    </div>
    <div class="form-group">
      <button @click="logout" class="logout-button">ログアウト</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useToast } from 'vue-toastification'
const toast = useToast()

const email = ref('')
const password = ref('')

async function login() {
  try {
    const res = await fetch('/api/login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    })
    const data = await res.json()
    if (data.success) {
      localStorage.setItem('login', 'true')
      localStorage.setItem('chat_user_id', data.user_uid)
      toast.success('ログイン成功')
      // 必要ならトークン保存やリダイレクト
    } else {
      toast.error('ログイン失敗: ' + data.message)
    }
  } catch (e) {
    toast.error('エラー: ' + e.message)
  }
}

function logout() {
  localStorage.removeItem('login')
  localStorage.removeItem('chat_user_id')
  toast.info('ログアウトしました')
}
</script>

<style scoped>
.login-wrapper {
  max-width: 360px;
  margin: 60px auto;
  padding: 30px 24px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

h2 {
  font-size: 20px;
  margin-bottom: 24px;
  text-align: center;
  color: #333;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  font-weight: bold;
  margin-bottom: 6px;
  font-size: 14px;
}

input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 6px;
}

button {
  width: 100%;
  padding: 10px;
  font-size: 15px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: #2980b9;
}

.logout-button {
  background-color: #e74c3c;
}

.logout-button:hover {
  background-color: #c0392b;
}
</style>
