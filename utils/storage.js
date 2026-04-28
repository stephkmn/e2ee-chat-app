import * as SecureStore from 'expo-secure-store';

// Save a chat's AES key to the hardware-backed keystore.
export async function saveChatKey(chatId, key) {
  if (!chatId || !key) {
    throw new Error('chatId and key are required');
  }

  await SecureStore.setItemAsync(chatId, key);
  return true;
}

// Read a chat's AES key, or null if this device never paired.
export async function getChatKey(chatId) {
  if (!chatId) {
    throw new Error('chatId is required');
  }

  return SecureStore.getItemAsync(chatId);
}

// Delete a chat's AES key; used when regenerating a handshake.
export async function deleteChatKey(chatId) {
  if (!chatId) {
    throw new Error('chatId is required');
  }

  await SecureStore.deleteItemAsync(chatId);
  return true;
}
