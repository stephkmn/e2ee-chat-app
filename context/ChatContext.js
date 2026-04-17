import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as Crypto from 'expo-crypto';
import { onAuthStateChanged } from 'firebase/auth';

import { deleteChatKey, saveChatKey } from '../utils/storage';
import { auth } from '../services/firebaseConfig';
import {
  completePendingHandshake,
  createPendingHandshake,
  deletePendingHandshake,
  hideChatForUser,
  subscribeToUserChats,
  subscribeToUserChatPreferences,
  renameChatForUser,
} from '../services/chats';
import { generateKey } from '../utils/encryption';

const ChatContext = createContext(null);

function normalizeChatLoadError(error) {
  const message = error?.message || '';

  if (
    error?.code === 'failed-precondition' &&
    message.toLowerCase().includes('query requires an index')
  ) {
    return 'Chat index is still being created in Firestore. Deploy the Firestore indexes for this project, then try again in a minute.';
  }

  return message || 'Unable to load chats right now.';
}

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
  const [rawChats, setRawChats] = useState([]);
  const [chatPreferences, setChatPreferences] = useState({});
  const [isChatsLoading, setIsChatsLoading] = useState(true);
  const [chatError, setChatError] = useState('');
  const [currentUserId, setCurrentUserId] = useState(auth.currentUser?.uid || null);

  const chats = useMemo(
    () =>
      rawChats.map((chat) => ({
        ...chat,
        name: chatPreferences[chat.id]?.customName || chat.name,
      })),
    [rawChats, chatPreferences]
  );

  const upsertChat = useCallback((chat) => {
    setRawChats((currentChats) => {
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

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid || null);
    });

    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setRawChats([]);
      setChatPreferences({});
      setIsChatsLoading(false);
      setChatError('');
      return () => null;
    }

    setIsChatsLoading(true);
    setChatError('');

    const unsubscribeChats = subscribeToUserChats(
      currentUserId,
      (nextChats) => {
        setRawChats(nextChats);
        setChatError('');
        setIsChatsLoading(false);
      },
      (error) => {
        setChatError(normalizeChatLoadError(error));
        setIsChatsLoading(false);
      }
    );

    return unsubscribeChats;
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      setChatPreferences({});
      return () => null;
    }

    const unsubscribePreferences = subscribeToUserChatPreferences(
      currentUserId,
      (nextPreferences) => {
        setChatPreferences(nextPreferences);
      },
      () => null
    );

    return unsubscribePreferences;
  }, [currentUserId]);

  const createChatHandshake = async (replaceChatId) => {
    let chatId;
    let sharedKey;
    const participantId = auth.currentUser?.uid;

    if (!participantId) {
      throw new Error('You must be logged in to create a secure chat.');
    }

    try {
      chatId = await generateChatId();
      sharedKey = generateSharedKey();
    } catch (error) {
      throw new Error(error.message || 'Unable to generate a secure handshake.');
    }

    try {
      await saveChatKey(chatId, sharedKey);
      await createPendingHandshake({
        chatId,
        initiatorId: participantId,
      });
    } catch (error) {
      throw new Error(
        error.message || 'Unable to create a secure chat on this device.'
      );
    }

    if (replaceChatId) {
      await deleteChatKey(replaceChatId).catch(() => null);
      await deletePendingHandshake(replaceChatId).catch(() => null);
    }

    return { chatId, sharedKey };
  };

  const addScannedChat = async ({ chatId, isInitiator = false }) => {
    if (!chatId) {
      throw new Error('chatId is required');
    }

    const participantId = auth.currentUser?.uid;

    if (!participantId) {
      throw new Error('You must be logged in to join a secure chat.');
    }

    await completePendingHandshake({
      chatId,
      participantId,
    });

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

  const hideChat = useCallback(
    async (chatId) => {
      if (!chatId) {
        throw new Error('chatId is required');
      }

      const userId = auth.currentUser?.uid;

      if (!userId) {
        throw new Error('You must be logged in to update your chat list.');
      }

      await hideChatForUser(chatId, userId);
      setRawChats((currentChats) => currentChats.filter((chat) => chat.id !== chatId));
    },
    []
  );

  const renameChat = useCallback(async (chatId, customName) => {
    if (!chatId) {
      throw new Error('chatId is required');
    }

    const userId = auth.currentUser?.uid;

    if (!userId) {
      throw new Error('You must be logged in to rename a chat.');
    }

    const trimmedName = customName?.trim();

    if (!trimmedName) {
      throw new Error('Chat name cannot be empty.');
    }

    await renameChatForUser(chatId, userId, trimmedName);
    setChatPreferences((currentPreferences) => ({
      ...currentPreferences,
      [chatId]: {
        customName: trimmedName,
      },
    }));
  }, []);

  const updateChatPreview = useCallback((chatId, lastMessage, time = formatTimestamp()) => {
    if (!chatId || !lastMessage) {
      return;
    }

    setRawChats((currentChats) => {
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
      isChatsLoading,
      chatError,
      createChatHandshake,
      addScannedChat,
      getChatById,
      hideChat,
      renameChat,
      updateChatPreview,
    }),
    [chats, isChatsLoading, chatError, hideChat, renameChat, updateChatPreview]
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
