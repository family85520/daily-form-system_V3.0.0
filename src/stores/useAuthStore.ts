import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const isVerified = ref(false);
  const sessionToken = ref('');

  const authHeaders = computed<Record<string, string>>(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (sessionToken.value) {
      headers['x-auth-token'] = sessionToken.value;
    }
    return headers;
  });

  async function verify(password: string): Promise<boolean> {
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.success) {
        isVerified.value = true;
        sessionToken.value = json.token || '';
        return true;
      }
      return false;
    } catch (_err) {
      return false;
    }
  }

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/check', {
        headers: { 'x-auth-token': sessionToken.value },
      });
      const json = await res.json();
      if (json.success) {
        isVerified.value = true;
      } else {
        isVerified.value = false;
        sessionToken.value = '';
      }
    } catch (_err) {
      isVerified.value = false;
    }
  }

  function logout() {
    const token = sessionToken.value;
    isVerified.value = false;
    sessionToken.value = '';
    fetch('/api/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token,
      },
    }).catch(() => {});
  }

  return {
    isVerified,
    sessionToken,
    authHeaders,
    verify,
    checkAuth,
    logout,
  };
});
