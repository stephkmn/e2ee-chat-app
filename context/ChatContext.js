import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import * as Crypto from 'expo-crypto';

import { deleteChatKey, saveChatKey } from '../utils/storage';
import { generateKey } from '../utils/encryption';

const ChatContext = createContext(null);

const initialChats = [
  {
    id: '1',
    name: 'Mom',
    lastMessage: 'Sounds good, have a good day!',
    time: '9:12 AM',
    unread: 2,
    hasStoredKey: false,
  },
  {
    id: '2',
    name: 'Alex',
    lastMessage: 'I sent the photo, check it out',
    time: 'Yesterday',
    unread: 0,
    hasStoredKey: false,
  },
  {
    id: '3',
    name: 'Work Group',
    lastMessage:
      "I got class til 3:30, are you guys free after that? I'm free tomorrow morning if that works better for everyone",
    time: 'Mon',
    unread: 3,
    hasStoredKey: false,
  },
];

function formatTimestamp() {
  return new Date().toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildChatRecord(chatId, overrides = {}) {
  return {
    id: chatId,
    name: overrides.name || `Secure Chat ${chatId.slice(-4)}`,
    lastMessage: overrides.lastMessage || 'Secure handshake completed.',
    time: overrides.time || formatTimestamp(),
    unread: overrides.unread || 0,
    hasStoredKey:
      typeof overrides.hasStoredKey === 'boolean' ? overrides.hasStoredKey : true,
  };
}

async function randomBytes(length) {
  try {
    return await Crypto.getRandomBytesAsync(length);
  } catch (error) {
    throw new Error('Unable to generate secure random bytes on this device.');
  }
}

function bytesToBase64(bytes) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const third = index + 2 < bytes.length ? bytes[index + 2] : 0;

    const combined = (first << 16) | (second << 8) | third;

    output += chars[(combined >> 18) & 63];
    output += chars[(combined >> 12) & 63];
    output += index + 1 < bytes.length ? chars[(combined >> 6) & 63] : '=';
    output += index + 2 < bytes.length ? chars[combined & 63] : '=';
  }

  return output;
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function generateSharedKey() {
  return generateKey();
}

async function generateChatId() {
  const randomSuffix = bytesToHex(await randomBytes(6));
  return `chat-${Date.now()}-${randomSuffix}`;
}

export function ChatProvider({ children }) {
  const [chats, setChats] = useState(initialChats);

  const upsertChat = useCallback((chat) => {
    setChats((currentChats) => {
      const existingIndex = currentChats.findIndex((item) => item.id === chat.id);

      if (existingIndex === -1) {
        return [chat, ...currentChats];
      }

      const updatedChats = [...currentChats];
      updatedChats[existingIndex] = {
        ...updatedChats[existingIndex],
        ...chat,
      };

      return updatedChats;
    });
  }, []);

  const createChatHandshake = async (replaceChatId) => {
    let chatId;
    let sharedKey;

    try {
      chatId = await generateChatId();
      sharedKey = generateSharedKey();
    } catch (error) {
      throw new Error(error.message || 'Unable to generate a secure handshake.');
    }

    try {
      await saveChatKey(chatId, sharedKey);
    } catch (error) {
      throw new Error(
        error.message || 'Unable to save the chat key securely on this device.'
      );
    }

    if (replaceChatId) {
      await deleteChatKey(replaceChatId).catch(() => null);
      setChats((currentChats) => currentChats.filter((chat) => chat.id !== replaceChatId));
    }

    return { chatId, sharedKey };
  };

  const addScannedChat = ({ chatId, isInitiator = false }) => {
    if (!chatId) {
      throw new Error('chatId is required');
    }

    upsertChat(
      buildChatRecord(chatId, {
        lastMessage: isInitiator
          ? 'Secure handshake shared. Start the conversation.'
          : 'Secure handshake completed.',
        hasStoredKey: true,
      })
    );

    return chatId;
  };

  const getChatById = (chatId) => chats.find((chat) => chat.id === chatId) || null;

  const updateChatPreview = useCallback((chatId, lastMessage, time = formatTimestamp()) => {
    if (!chatId || !lastMessage) {
      return;
    }

    setChats((currentChats) => {
      const existingIndex = currentChats.findIndex((chat) => chat.id === chatId);
      const existingChat = existingIndex >= 0 ? currentChats[existingIndex] : null;
      const nextChat = buildChatRecord(chatId, {
        ...(existingChat || {}),
        lastMessage,
        time,
        unread: 0,
        hasStoredKey: existingChat?.hasStoredKey ?? true,
      });

      if (existingIndex === -1) {
        return [nextChat, ...currentChats];
      }

      const updatedChats = currentChats.filter((chat) => chat.id !== chatId);
      updatedChats.unshift({
        ...currentChats[existingIndex],
        ...nextChat,
      });

      return updatedChats;
    });
  }, []);

  const value = useMemo(
    () => ({
      chats,
      createChatHandshake,
      addScannedChat,
      getChatById,
      updateChatPreview,
    }),
    [chats]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }

  return context;
}
