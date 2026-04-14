import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const initialChats = [
  {
    id: '1',
    name: 'Mom',
    lastMessage: 'Sounds good, have a good day!',
    time: '9:12 AM',
    unread: 2,
  },
  {
    id: '2',
    name: 'Alex',
    lastMessage: 'I sent the photo, check it out',
    time: 'Yesterday',
    unread: 0,
  },
  {
    id: '3',
    name: 'Work Group',
    lastMessage: 'I got class til 3:30, are you guys free after that? I\'m free tomorrow morning if that works better for everyone',
    time: 'Mon',
    unread: 3,
  },
];

export default function ChatListScreen() {
  const [chats, setChats] = useState(initialChats);

  const createNewChat = () => {
    const newChat = {
      id: String(chats.length + 1),
      name: 'New Chat',
      lastMessage: 'Start a secure conversation.',
      time: 'Now',
      unread: 0,
    };
    setChats([newChat, ...chats]);
  };

  const renderChatItem = ({ item }) => (
    <TouchableOpacity style={styles.chatRow} activeOpacity={0.8}>
      <View style={styles.chatMeta}>
        <Text style={styles.chatName}>{item.name}</Text>
        <Text style={styles.chatTime}>{item.time}</Text>
      </View>
      <View style={styles.chatPreviewRow}>
        <View style={styles.chatBubble}>
          <Text style={styles.chatPreview} numberOfLines={2} ellipsizeMode="tail">
            {item.lastMessage}
          </Text>
        </View>
        {item.unread > 0 ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <TouchableOpacity style={styles.addButton} onPress={createNewChat} activeOpacity={0.8}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        contentContainerStyle={styles.chatList}
        showsVerticalScrollIndicator={false}
      />
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
    paddingTop: 10 ,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#0f172a',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '700',
  },
  chatList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  chatRow: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  chatMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chatName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  chatTime: {
    fontSize: 13,
    color: '#6b7280',
  },
  chatPreviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  chatBubble: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 20,
    paddingVertical: 0,
    paddingHorizontal: 0,
    minHeight: 40,
    justifyContent: 'flex-start',
  },
  chatPreview: {
    color: '#1f2937',
    fontSize: 15,
    lineHeight: 20,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 7,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});