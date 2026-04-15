import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChatContext } from '../context/ChatContext';

export default function ChatScreen({ route }) {
  const { chatId } = route.params || {};
  const { getChatById } = useChatContext();
  const chat = chatId ? getChatById(chatId) : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{chat?.name || 'Chat'}</Text>
        <Text style={styles.subtitle}>{chatId || 'No chat selected'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Secure handshake ready</Text>
        <Text style={styles.cardText}>
          This chat has been paired with a QR-based key exchange. Messaging can now
          build on chat ID and locally stored encryption keys.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f3f8',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 6,
    color: '#64748b',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#334155',
  },
});
