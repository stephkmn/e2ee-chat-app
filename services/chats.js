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

// Detect the "missing composite index" error so we can fall back gracefully.
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

// Default display name when no custom name is set.
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

// Convert a Firestore chat doc into the shape the UI consumes.
function mapChatDocument(documentSnapshot, userId) {
  const data = documentSnapshot.data() || {};
  const hasMessages = Boolean(data.lastMessageAt);
  const unreadCounts =
    data.unreadCounts && typeof data.unreadCounts === 'object' ? data.unreadCounts : {};

  return {
    id: documentSnapshot.id,
    name: data.name || buildDefaultChatName(documentSnapshot.id),
    // Hard-coded preview — server never sees plaintext.
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

// Newest-first sort, used as fallback when the Firestore index isn't ready.
function sortChatsByRecent(chats) {
  return [...chats].sort((left, right) => getChatSortValue(right) - getChatSortValue(left));
}

// Defensively strip leftover plaintext previews from older prototype docs.
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

// Initiator's first write — creates the chat doc with themself as sole participant.
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

// Joiner adds themself to the chat's participants array; recreates doc if missing.
export async function joinChatMetadata({
  chatId,
  participantId,
}) {
  if (!participantId) {
    throw new Error('participantId is required');
  }

  const chatDoc = getChatDoc(chatId);

  try {
    await updateDoc(chatDoc, {
      participants: arrayUnion(participantId),
      [`unreadCounts.${participantId}`]: 0,
      updatedAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      lastMessagePreview: deleteField(),
    });
  } catch (error) {
    if (error.code !== 'not-found') {
      throw error;
    }

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
  }
}

// Bumps timestamps and increments unread for everyone except the sender on each new message.
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

// Reset this user's unread counter to zero for the chat.
export async function markChatAsRead(chatId, userId) {
  if (!userId) {
    throw new Error('userId is required');
  }

  await updateDoc(getChatDoc(chatId), {
    [`unreadCounts.${userId}`]: 0,
  });
}

// Real-time chat list for a user; falls back to client-side sort if the index is missing.
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
            (chat) => !chat.hiddenFor.includes(userId) && chat.participants.length >= 2
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
          .filter((chat) => !chat.hiddenFor.includes(userId) && chat.participants.length >= 2)
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

// Listen to a single chat doc — used to detect when the second participant joins.
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

// Listen to per-user chat preferences (custom names) — local to this user.
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

// Save a custom chat name to this user's preferences only — not shared.
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

// Soft-delete: hide for this user; reappears if a new message arrives.
export async function hideChatForUser(chatId, userId) {
  if (!userId) {
    throw new Error('userId is required');
  }

  await updateDoc(getChatDoc(chatId), {
    hiddenFor: arrayUnion(userId),
  });
}

// Hard-delete the chat doc; used during handshake regeneration.
export async function deleteChatMetadata(chatId) {
  await deleteDoc(getChatDoc(chatId));
}
