import {
  arrayUnion,
  collection,
  deleteField,
  deleteDoc,
  doc,
  increment,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from './firebaseConfig';

function isMissingIndexError(error) {
  const message = error?.message || '';

  return (
    error?.code === 'failed-precondition' &&
    message.toLowerCase().includes('query requires an index')
  );
}

function getChatDoc(chatId) {
  if (!chatId) {
    throw new Error('chatId is required');
  }

  return doc(db, 'chats', chatId);
}

function getUserChatPreferenceDoc(userId, chatId) {
  if (!userId) {
    throw new Error('userId is required');
  }

  if (!chatId) {
    throw new Error('chatId is required');
  }

  return doc(db, 'users', userId, 'chatPreferences', chatId);
}

function buildDefaultChatName(chatId) {
  return `Secure Chat ${chatId.slice(-4)}`;
}

function formatChatTime(timestamp) {
  if (!timestamp?.toDate) {
    return 'Just now';
  }

  return timestamp.toDate().toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function mapChatDocument(documentSnapshot, userId) {
  const data = documentSnapshot.data() || {};
  const hasMessages = Boolean(data.lastMessageAt);
  const unreadCounts =
    data.unreadCounts && typeof data.unreadCounts === 'object' ? data.unreadCounts : {};

  return {
    id: documentSnapshot.id,
    name: data.name || buildDefaultChatName(documentSnapshot.id),
    lastMessage: hasMessages
      ? 'Encrypted message'
      : 'Secure handshake completed.',
    time: formatChatTime(data.lastMessageAt),
    unread: Number.isFinite(unreadCounts[userId]) ? unreadCounts[userId] : 0,
    hasStoredKey: true,
    participants: Array.isArray(data.participants) ? data.participants : [],
    hiddenFor: Array.isArray(data.hiddenFor) ? data.hiddenFor : [],
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    lastMessageAt: data.lastMessageAt ?? null,
  };
}

function getChatSortValue(chat) {
  if (chat.updatedAt?.seconds) {
    return chat.updatedAt.seconds;
  }

  if (chat.lastMessageAt?.seconds) {
    return chat.lastMessageAt.seconds;
  }

  return 0;
}

function sortChatsByRecent(chats) {
  return [...chats].sort((left, right) => getChatSortValue(right) - getChatSortValue(left));
}

function scrubLegacyPreview(snapshot) {
  snapshot.docs.forEach((documentSnapshot) => {
    const data = documentSnapshot.data() || {};

    if (typeof data.lastMessagePreview === 'string' && data.lastMessagePreview.length > 0) {
      updateDoc(documentSnapshot.ref, {
        lastMessagePreview: deleteField(),
      }).catch(() => null);
    }
  });
}

export async function createChatMetadata({
  chatId,
  participantId,
}) {
  if (!participantId) {
    throw new Error('participantId is required');
  }

  await setDoc(
    getChatDoc(chatId),
    {
      participants: [participantId],
      unreadCounts: {
        [participantId]: 0,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      name: buildDefaultChatName(chatId),
    },
    { merge: true }
  );
}

export async function joinChatMetadata({
  chatId,
  participantId,
}) {
  if (!participantId) {
    throw new Error('participantId is required');
  }

  const chatDoc = getChatDoc(chatId);
  const existingChat = await getDoc(chatDoc);

  if (!existingChat.exists()) {
    await setDoc(chatDoc, {
      participants: [participantId],
      unreadCounts: {
        [participantId]: 0,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      name: buildDefaultChatName(chatId),
    });
    return;
  }

  await updateDoc(chatDoc, {
    participants: arrayUnion(participantId),
    [`unreadCounts.${participantId}`]: 0,
    updatedAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
    lastMessagePreview: deleteField(),
  });
}

export async function updateChatActivity(chatId, senderId) {
  if (!senderId) {
    throw new Error('senderId is required');
  }

  const chatSnapshot = await getDoc(getChatDoc(chatId));

  if (!chatSnapshot.exists()) {
    throw new Error('Chat metadata does not exist.');
  }

  const chatData = chatSnapshot.data() || {};
  const participants = Array.isArray(chatData.participants) ? chatData.participants : [];
  const unreadCountUpdates = participants.reduce((updates, participantId) => {
    updates[`unreadCounts.${participantId}`] =
      participantId === senderId ? 0 : increment(1);
    return updates;
  }, {});

  await updateDoc(getChatDoc(chatId), {
    updatedAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
    hiddenFor: [],
    lastMessagePreview: deleteField(),
    ...unreadCountUpdates,
  });
}

export async function markChatAsRead(chatId, userId) {
  if (!userId) {
    throw new Error('userId is required');
  }

  await updateDoc(getChatDoc(chatId), {
    [`unreadCounts.${userId}`]: 0,
  });
}

export function subscribeToUserChats(userId, onChats, onError) {
  if (!userId) {
    throw new Error('userId is required');
  }

  const orderedChatsQuery = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );

  const unorderedChatsQuery = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', userId)
  );

  let activeUnsubscribe = () => null;

  const startUnorderedSubscription = () =>
    onSnapshot(
      unorderedChatsQuery,
      (snapshot) => {
        scrubLegacyPreview(snapshot);
        onChats(
          sortChatsByRecent(snapshot.docs.map((docSnapshot) => mapChatDocument(docSnapshot, userId))).filter(
            (chat) => !chat.hiddenFor.includes(userId)
          )
        );
      },
      onError
    );

  activeUnsubscribe = onSnapshot(
    orderedChatsQuery,
    (snapshot) => {
      scrubLegacyPreview(snapshot);
      onChats(
        snapshot.docs
          .map((docSnapshot) => mapChatDocument(docSnapshot, userId))
          .filter((chat) => !chat.hiddenFor.includes(userId))
      );
    },
    (error) => {
      if (isMissingIndexError(error)) {
        activeUnsubscribe = startUnorderedSubscription();
        return;
      }

      onError(error);
    }
  );

  return () => {
    activeUnsubscribe();
  };
}

export function subscribeToChat(chatId, onChat, onError) {
  return onSnapshot(
    getChatDoc(chatId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChat(null);
        return;
      }

      onChat(mapChatDocument(snapshot, ''));
    },
    onError
  );
}

export function subscribeToUserChatPreferences(userId, onPreferences, onError) {
  if (!userId) {
    throw new Error('userId is required');
  }

  return onSnapshot(
    collection(db, 'users', userId, 'chatPreferences'),
    (snapshot) => {
      const preferences = snapshot.docs.reduce((nextPreferences, documentSnapshot) => {
        const data = documentSnapshot.data() || {};

        nextPreferences[documentSnapshot.id] = {
          customName: typeof data.customName === 'string' ? data.customName : '',
        };

        return nextPreferences;
      }, {});

      onPreferences(preferences);
    },
    onError
  );
}

export async function renameChatForUser(chatId, userId, customName) {
  const trimmedName = customName?.trim();

  if (!trimmedName) {
    throw new Error('Chat name cannot be empty.');
  }

  await setDoc(
    getUserChatPreferenceDoc(userId, chatId),
    {
      customName: trimmedName,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function hideChatForUser(chatId, userId) {
  if (!userId) {
    throw new Error('userId is required');
  }

  await updateDoc(getChatDoc(chatId), {
    hiddenFor: arrayUnion(userId),
  });
}

export async function deleteChatMetadata(chatId) {
  await deleteDoc(getChatDoc(chatId));
}
