import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChatContext } from '../context/ChatContext';
import { auth } from '../services/firebaseConfig';
import { markChatAsRead } from '../services/chats';
import {
  sendEncryptedMessage,
  subscribeToChatMessages,
} from '../services/chatMessages';
import { decryptMessage, encryptMessage } from '../utils/encryption';
import { getChatKey } from '../utils/storage';

function formatMessageTimestamp(timestamp) {
  if (!timestamp?.toDate) {
    return 'Sending...';
  }

  return timestamp.toDate().toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ChatScreen({ route }) {
  const { chatId } = route.params || {};
  const { getChatById, updateChatPreview } = useChatContext();
  const chat = chatId ? getChatById(chatId) : null;
  const currentUser = auth.currentUser;

  const [chatKey, setChatKey] = useState(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [screenError, setScreenError] = useState('');

  useEffect(() => {
    let isMounted = true;
    let unsubscribe = () => null;

    async function initializeChatMessages() {
      if (!chatId) {
        setScreenError('No chat session is selected.');
        setIsInitialLoading(false);
        return;
      }

      setIsInitialLoading(true);
      setScreenError('');

      try {
        const storedKey = await getChatKey(chatId);

        if (!storedKey) {
          throw new Error('No local encryption key was found for this chat.');
        }

        if (!isMounted) {
          return;
        }

        setChatKey(storedKey);

        unsubscribe = subscribeToChatMessages(
          chatId,
          async (encryptedMessages) => {
            if (!isMounted) {
              return;
            }

            setIsDecrypting(true);

            try {
              const decryptedMessages = encryptedMessages.map((message) => {
                const text = decryptMessage(
                  message.encryptedContent,
                  storedKey,
                  message.nonce
                );

                if (typeof text !== 'string' || text.length === 0) {
                  throw new Error('Unable to decrypt one or more messages.');
                }

                return {
                  id: message.id,
                  senderId: message.senderId,
                  text,
                  timestamp: message.timestamp ?? null,
                };
              });

              if (!isMounted) {
                return;
              }

              setMessages(decryptedMessages);
              setScreenError('');
              if (currentUser?.uid) {
                await markChatAsRead(chatId, currentUser.uid);
              }

              const latestMessage = decryptedMessages[decryptedMessages.length - 1];
              if (latestMessage) {
                updateChatPreview(
                  chatId,
                  latestMessage.text,
                  formatMessageTimestamp(latestMessage.timestamp)
                );
              }
            } catch (error) {
              if (isMounted) {
                setScreenError(
                  error?.message || 'Messages could not be decrypted safely.'
                );
              }
            } finally {
              if (isMounted) {
                setIsInitialLoading(false);
                setIsDecrypting(false);
              }
            }
          },
          (error) => {
            if (!isMounted) {
              return;
            }

            setScreenError(error?.message || 'Unable to listen for chat updates.');
            setIsInitialLoading(false);
            setIsDecrypting(false);
          }
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setScreenError(
          error?.message || 'This chat could not be prepared for secure messaging.'
        );
        setIsInitialLoading(false);
      }
    }

    initializeChatMessages();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [chatId, updateChatPreview]);

  const sortedMessages = useMemo(
    () =>
      [...messages].sort((left, right) => {
        const leftTime = left.timestamp?.seconds ?? 0;
        const rightTime = right.timestamp?.seconds ?? 0;
        return leftTime - rightTime;
      }),
    [messages]
  );

  const handleSendMessage = async () => {
    const plainTextMessage = draftMessage.trim();

    if (!plainTextMessage || isSending) {
      return;
    }

    if (!chatId) {
      Alert.alert('Unable to send', 'No chat session is selected.');
      return;
    }

    if (!chatKey) {
      Alert.alert('Unable to send', 'The local encryption key is unavailable.');
      return;
    }

    if (!currentUser?.uid) {
      Alert.alert('Unable to send', 'You must be logged in to send messages.');
      return;
    }

    try {
      setIsSending(true);

      const { ciphertext, nonce } = encryptMessage(plainTextMessage, chatKey);

      await sendEncryptedMessage({
        chatId,
        senderId: currentUser.uid,
        encryptedContent: ciphertext,
        nonce,
      });

      setDraftMessage('');
      setScreenError('');
    } catch (error) {
      Alert.alert(
        'Secure send failed',
        error?.message || 'The message could not be encrypted and stored.'
      );
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isCurrentUser = item.senderId === currentUser?.uid;

    return (
      <View
        style={[
          styles.messageRow,
          isCurrentUser ? styles.messageRowOutgoing : styles.messageRowIncoming,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.outgoingBubble : styles.incomingBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isCurrentUser ? styles.outgoingMessageText : styles.incomingMessageText,
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isCurrentUser ? styles.outgoingMessageTime : styles.incomingMessageTime,
            ]}
          >
            {formatMessageTimestamp(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior="padding"
      >
        <View style={styles.header}>
          <Text style={styles.title}>{chat?.name || 'Secure Chat'}</Text>
          <Text style={styles.subtitle}>{chatId || 'No chat selected'}</Text>
        </View>

        {screenError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{screenError}</Text>
          </View>
        ) : null}

        {isDecrypting && !isInitialLoading ? (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color="#007aff" />
            <Text style={styles.statusText}>Decrypting latest messages...</Text>
          </View>
        ) : null}

        {isInitialLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#007aff" />
            <Text style={styles.loaderText}>Preparing secure conversation...</Text>
          </View>
        ) : (
          <FlatList
            data={sortedMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptyText}>
                  Your first message will be encrypted before Firestore stores it.
                </Text>
              </View>
            }
          />
        )}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Enter message"
            placeholderTextColor="#94a3b8"
            value={draftMessage}
            onChangeText={setDraftMessage}
            multiline
            textAlignVertical="top"
            editable={!isSending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!draftMessage.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            activeOpacity={0.85}
            disabled={!draftMessage.trim() || isSending}
          >
            <Text style={styles.sendButtonText}>
              {isSending ? 'Sending...' : 'Send'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f3f8',
  },
  keyboardArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748b',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  statusText: {
    marginLeft: 10,
    color: '#475569',
    fontSize: 13,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    marginTop: 14,
    color: '#475569',
    fontSize: 15,
  },
  messageList: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    color: '#64748b',
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  messageRowIncoming: {
    justifyContent: 'flex-start',
  },
  messageRowOutgoing: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  incomingBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 6,
  },
  outgoingBubble: {
    backgroundColor: '#007aff',
    borderBottomRightRadius: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  incomingMessageText: {
    color: '#0f172a',
  },
  outgoingMessageText: {
    color: '#ffffff',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 8,
  },
  incomingMessageTime: {
    color: '#64748b',
  },
  outgoingMessageTime: {
    color: '#dbeafe',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginTop: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 8,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: '#007aff',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
