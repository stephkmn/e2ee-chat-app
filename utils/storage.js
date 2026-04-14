import * as SecureStore from 'expo-secure-store';

export async function saveChatKey(chatId, key) {
  if (!chatId || !key) {
    throw new Error('chatId and key are required');
  }

  await SecureStore.setItemAsync(chatId, key);
  return true;
}

export async function getChatKey(chatId) {
  if (!chatId) {
    throw new Error('chatId is required');
  }

  return SecureStore.getItemAsync(chatId);
}

export async function deleteChatKey(chatId) {
  if (!chatId) {
    throw new Error('chatId is required');
  }

  await SecureStore.deleteItemAsync(chatId);
  return true;
}
