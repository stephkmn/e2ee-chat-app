import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import { useChatContext } from '../context/ChatContext';

export default function QRCodeGenerator({ navigation, route }) {
  const { addScannedChat, createChatHandshake } = useChatContext();
  const [isRegenerating, setIsRegenerating] = useState(false);

  const currentChatId = route.params?.chatId;
  const currentSharedKey = route.params?.sharedKey;

  const qrPayload = useMemo(() => {
    if (!currentChatId || !currentSharedKey) {
      return '';
    }

    return JSON.stringify({
      chatId: currentChatId,
      sharedKey: currentSharedKey,
    });
  }, [currentChatId, currentSharedKey]);

  const handleRegenerate = async () => {
    try {
      setIsRegenerating(true);
      const nextHandshake = await createChatHandshake(currentChatId);

      navigation.replace('QRCodeGenerator', nextHandshake);
    } catch (error) {
      Alert.alert(
        'Unable to regenerate',
        'Please try again to generate a new secure handshake.'
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleBackToChats = () => {
    navigation.navigate('Chats');
  };

  const handleScannedConfirmation = () => {
    if (!currentChatId) {
      return;
    }

    addScannedChat({ chatId: currentChatId, isInitiator: true });
    navigation.navigate('Chat', { chatId: currentChatId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Share Secure Handshake</Text>
        <Text style={styles.instructions}>
          Scan this code with the recipient's device.
        </Text>

        <View style={styles.qrWrapper}>
          {qrPayload ? (
            <QRCode value={qrPayload} size={220} backgroundColor="#ffffff" color="#111827" />
          ) : (
            <Text style={styles.errorText}>
              A secure handshake could not be loaded. Please create a new chat.
            </Text>
          )}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleBackToChats}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Back to Chats</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isRegenerating && styles.disabledButton]}
            onPress={handleRegenerate}
            activeOpacity={0.85}
            disabled={isRegenerating}
          >
            <Text style={styles.primaryButtonText}>
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleScannedConfirmation}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmButtonText}>QR Code Scanned</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  instructions: {
    marginTop: 10,
    marginBottom: 22,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    color: '#475569',
  },
  qrWrapper: {
    width: '100%',
    minHeight: 260,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#b91c1c',
    textAlign: 'center',
  },
  buttonRow: {
    width: '100%',
    flexDirection: 'row',
    marginTop: 24,
  },
  button: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    marginRight: 10,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
  },
  disabledButton: {
    opacity: 0.65,
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmButton: {
    width: '100%',
    marginTop: 14,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
