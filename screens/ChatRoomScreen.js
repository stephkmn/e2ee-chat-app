import React, { useState } from 'react';
import {
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

const DUMMY_MESSAGES = [
  { id: '1', text: 'Hey! Did you get the notes?',  mine: false },
  { id: '2', text: 'Yeah I got them, thanks!',      mine: true  },
  { id: '3', text: 'Cool. See you tomorrow 👋',     mine: false },
  { id: '4', text: 'For sure! 😄',                  mine: true  },
];

export default function ChatRoomScreen({ route }) {
  const { chatId } = route.params || {};
  const { getChatById } = useChatContext();
  const chat = chatId ? getChatById(chatId) : null;

  const [messages, setMessages] = useState(DUMMY_MESSAGES);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (inputText.trim() === '') return;
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), text: inputText.trim(), mine: true },
    ]);
    setInputText('');
  };

  const renderMessage = ({ item }) => (
    <View style={[styles.bubble, item.mine ? styles.myBubble : styles.theirBubble]}>
      <Text style={[styles.bubbleText, item.mine && styles.myBubbleText]}>
        {item.text}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{chat?.name || 'Chat'}</Text>
        <Text style={styles.headerSub}>🔒 End-to-End Encrypted</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            activeOpacity={0.8}
          >
            <Text style={styles.sendText}>Send</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f1f3f8',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  bubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  myBubble: {
    backgroundColor: '#007aff',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    color: '#0f172a',
    lineHeight: 20,
  },
  myBubbleText: {
    color: '#ffffff',
  },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#007aff',
    borderRadius: 22,
    paddingHorizontal: 18,
    height: 44,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  sendText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});