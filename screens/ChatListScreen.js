import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import {
  Animated,
  Easing,
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
  const {
    chats,
    createChatHandshake,
    isChatsLoading,
    chatError,
    hideChat,
    renameChat,
  } = useChatContext();
  const containerRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [optionsMenu, setDeleteMenu] = useState(null);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const optionsMenuAnimation = useRef(new Animated.Value(0)).current;

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

  const handleRenameCancel = () => {
    setEditingChatId(null);
    setEditingName('');
  };

  const closeOverlays = () => {
    setIsMenuOpen(false);
    setDeleteMenu(null);
    handleRenameCancel();
    optionsMenuAnimation.setValue(0);
  };

  const openChat = (chatId) => {
    if (editingChatId) {
      return;
    }

    navigation.navigate('Chat', { chatId });
  };

  const handleDeleteMenuOpen = (chat, event) => {
    if (editingChatId) {
      return;
    }

    setIsMenuOpen(false);
    optionsMenuAnimation.setValue(0);

    const pressX = event?.nativeEvent?.pageX ?? 0;
    const pressY = event?.nativeEvent?.pageY ?? 0;

    containerRef.current?.measureInWindow((containerX, containerY, containerWidth) => {
      const menuWidth = 110;
      const screenPadding = 12;
      const localPressX = pressX - containerX;
      const localPressY = pressY - containerY;
      const nextLeft = Math.max(
        screenPadding,
        Math.min(localPressX - menuWidth / 2, containerWidth - menuWidth - screenPadding)
      );

      setDeleteMenu({
        chatId: chat.id,
        chatName: chat.name,
        x: nextLeft,
        y: localPressY + 10,
      });

      Animated.timing(optionsMenuAnimation, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  };

  const handleDeleteChat = async () => {
    if (!optionsMenu?.chatId) {
      return;
    }

    try {
      await hideChat(optionsMenu.chatId);
      closeOverlays();
    } catch (error) {
      Alert.alert(
        'Unable to delete chat',
        error?.message || 'Please try again to update your chat list.'
      );
    }
  };

  const handleRenameMode = () => {
    if (!optionsMenu) {
      return;
    }

    setEditingChatId(optionsMenu.chatId);
    setEditingName(optionsMenu.chatName);
    setDeleteMenu(null);
    optionsMenuAnimation.setValue(0);
  };

  const handleRenameSubmit = async () => {
    if (!editingChatId) {
      return;
    }

    try {
      await renameChat(editingChatId, editingName);
      handleRenameCancel();
    } catch (error) {
      Alert.alert(
        'Unable to rename chat',
        error?.message || 'Please try again to update the chat name.'
      );
    }
  };

  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.chatRow, editingChatId === item.id && styles.chatRowEditing]}
      activeOpacity={0.8}
      onPress={() => openChat(item.id)}
      onLongPress={(event) => handleDeleteMenuOpen(item, event)}
      disabled={Boolean(editingChatId)}
    >
      <View style={styles.chatMeta}>
        {editingChatId === item.id ? (
          <TextInput
            style={styles.chatNameInput}
            value={editingName}
            onChangeText={setEditingName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleRenameSubmit}
            onBlur={handleRenameCancel}
            blurOnSubmit={false}
            placeholder="Chat name"
            placeholderTextColor="#94a3b8"
          />
        ) : (
          <Text style={styles.chatName}>{item.name}</Text>
        )}
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
      <View ref={containerRef} style={styles.content}>
        {isMenuOpen || optionsMenu || editingChatId ? (
          <Pressable
            style={styles.backdrop}
            onPress={editingChatId ? handleRenameCancel : closeOverlays}
          />
        ) : null}

        {isMenuOpen ? (
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleCreateChat}
              activeOpacity={0.85}
            >
              <Text style={styles.menuItemText}>New Chat</Text>
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

        {optionsMenu ? (
          <Animated.View
            style={[
              styles.optionsMenu,
              {
                top: optionsMenu.y,
                left: optionsMenu.x,
                opacity: optionsMenuAnimation,
                transform: [
                  {
                    translateY: optionsMenuAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-12, 0],
                    }),
                  },
                  {
                    scaleY: optionsMenuAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.88, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.menuActionButton}
              onPress={handleRenameMode}
              activeOpacity={0.85}
            >
              <Text style={styles.renameMenuText}>Rename</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuActionButton}
              onPress={handleDeleteChat}
              activeOpacity={0.85}
            >
              <Text style={styles.deleteMenuText}>Delete</Text>
            </TouchableOpacity>
          </Animated.View>
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
          ListEmptyComponent={
            isChatsLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#007aff" />
                <Text style={styles.emptyText}>Loading your secure chats...</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  {chatError ? 'Unable to load chats' : 'No chats yet'}
                </Text>
                <Text style={styles.emptyText}>
                  {chatError || 'Create or scan a secure handshake to start chatting.'}
                </Text>
              </View>
            )
          }
        />

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsMenuOpen((open) => !open)}
          activeOpacity={0.9}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f3f8',
  },
  content: {
    flex: 1,
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
  optionsMenu: {
    position: 'absolute',
    width: 110,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    zIndex: 4,
  },
  menuActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  renameMenuText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteMenuText: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '700',
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
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: '#64748b',
    textAlign: 'center',
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
  chatRowEditing: {
    position: 'relative',
    zIndex: 2,
  },
  chatMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chatName: {
    flex: 1,
    marginRight: 10,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  chatNameInput: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 0,
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
    color: '#334155',
    fontSize: 14,
    lineHeight: 20,
  },
  unreadBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    paddingHorizontal: 8,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
