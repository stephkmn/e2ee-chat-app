import React, { useState } from 'react';
import { Alert } from 'react-native';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChatContext } from '../context/ChatContext';

export default function ChatListScreen({ navigation }) {
  const { chats, createChatHandshake } = useChatContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const handleCreateChat = async () => {
    setIsMenuOpen(false);

    try {
      const handshake = await createChatHandshake();
      navigation.navigate('QRCodeGenerator', handshake);
    } catch (error) {
      Alert.alert(
        'Unable to create chat',
        error?.message || 'Please try again to generate a secure handshake.'
      );
    }
  };

  const handleJoinChat = () => {
    setIsMenuOpen(false);
    navigation.navigate('QRCodeScanner');
  };

  const openChat = (chatId) => {
    navigation.navigate('Chat', { chatId });
  };

  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatRow}
      activeOpacity={0.8}
      onPress={() => openChat(item.id)}
    >
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
      {isMenuOpen ? <Pressable style={styles.backdrop} onPress={() => setIsMenuOpen(false)} /> : null}

      {isMenuOpen ? (
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleCreateChat}
            activeOpacity={0.85}
          >
            <Text style={styles.menuItemText}>Add Contact</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleJoinChat}
            activeOpacity={0.85}
          >
            <Text style={styles.menuItemText}>Scan</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.searchWrapper}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        contentContainerStyle={styles.chatList}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setIsMenuOpen((open) => !open)}
        activeOpacity={0.9}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f3f8',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 3,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '700',
  },
  menu: {
    position: 'absolute',
    right: 20,
    bottom: 98,
    width: 170,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 3,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInputWrapper: {
    height: 48,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  searchIcon: {
    color: '#94a3b8',
    fontSize: 24,
    marginRight: 5,
    marginLeft: 10,
    transform: [{ scaleX: -1 }],
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    paddingVertical: 0,
  },
  chatList: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 110,
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
