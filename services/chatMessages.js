import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from './firebaseConfig';

function getMessagesCollection(chatId) {
  if (!chatId) {
    throw new Error('chatId is required');
  }

  return collection(db, 'chats', chatId, 'messages');
}

export async function sendEncryptedMessage({
  chatId,
  senderId,
  encryptedContent,
  nonce,
}) {
  if (!senderId) {
    throw new Error('senderId is required');
  }

  if (!encryptedContent || !nonce) {
    throw new Error('Encrypted message content is required');
  }

  const messageRef = await addDoc(getMessagesCollection(chatId), {
    encryptedContent,
    nonce,
    senderId,
    timestamp: serverTimestamp(),
  });

  return messageRef.id;
}

export function subscribeToChatMessages(chatId, onMessages, onError) {
  const messagesQuery = query(
    getMessagesCollection(chatId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(
    messagesQuery,
    async (snapshot) => {
      const messages = snapshot.docs.map((documentSnapshot) => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data(),
      }));

      await onMessages(messages);
    },
    onError
  );
}
