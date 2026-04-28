import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

import { useChatContext } from '../context/ChatContext';
import { saveChatKey } from '../utils/storage';

const ERROR_MESSAGE = 'Camera permission denied or invalid code. Please try again.';

export default function QRCodeScanner({ navigation }) {
  const { addScannedChat } = useChatContext();
  const [permission, setPermission] = useState(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(true);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Ask for camera access; surface a friendly error if denied.
  const requestPermission = async () => {
    try {
      setIsRequestingPermission(true);
      const nextPermission = await Camera.requestCameraPermissionsAsync();
      setPermission(nextPermission);

      if (!nextPermission.granted) {
        setErrorMessage(ERROR_MESSAGE);
      } else {
        setErrorMessage('');
      }
    } catch (error) {
      setPermission({ granted: false });
      setErrorMessage(ERROR_MESSAGE);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  useEffect(() => {
    requestPermission();
  }, []);

  // Parse the QR JSON, save the AES key locally, join the chat, then jump in.
  const processQrPayload = async (data) => {
    let parsedPayload;

    try {
      parsedPayload = JSON.parse(data);
    } catch (error) {
      return;
    }

    const chatId = parsedPayload?.chatId;
    const sharedKey = parsedPayload?.sharedKey;

    if (!chatId || !sharedKey) {
      return;
    }

    try {
      setIsProcessingScan(true);
      setErrorMessage('');

      await saveChatKey(chatId, sharedKey);
      await addScannedChat({ chatId });

      // Reset stack so Back from Chat goes to Chats, not the scanner.
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Chats' },
          { name: 'Chat', params: { chatId } },
        ],
      });
    } catch (error) {
      setErrorMessage(ERROR_MESSAGE);
    } finally {
      setIsProcessingScan(false);
    }
  };

  // Live camera scan handler; guarded so a single QR can't fire twice.
  const handleBarcodeScanned = async ({ data }) => {
    if (isProcessingScan || !data) {
      return;
    }

    await processQrPayload(data);
  };

  // Fallback path: pick a saved image and decode the QR from it.
  const handleUploadPhoto = async () => {
    if (isProcessingScan) {
      return;
    }

    try {
      setErrorMessage('');

      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!mediaPermission.granted) {
        setErrorMessage(ERROR_MESSAGE);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const imageUri = result.assets[0]?.uri;

      if (!imageUri) {
        setErrorMessage(ERROR_MESSAGE);
        return;
      }

      const qrResults = await Camera.scanFromURLAsync(imageUri, ['qr']);
      const qrData = qrResults?.[0]?.data;

      if (!qrData) {
        setErrorMessage(ERROR_MESSAGE);
        return;
      }

      await processQrPayload(qrData);
    } catch (error) {
      setErrorMessage(ERROR_MESSAGE);
      setIsProcessingScan(false);
    }
  };

  const handleRetry = () => {
    setErrorMessage('');
    setIsProcessingScan(false);

    if (!permission?.granted) {
      requestPermission();
    }
  };

  const isReadyForCamera = permission?.granted && !isRequestingPermission;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan QR Code</Text>
        <Text style={styles.subtitle}>
          Point your camera at the sender's QR code to join the encrypted chat.
        </Text>
      </View>

      <View style={styles.cameraCard}>
        {isReadyForCamera ? (
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
        ) : (
          <View style={styles.placeholder}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.placeholderText}>
              {errorMessage || 'Requesting camera access...'}
            </Text>
          </View>
        )}

        <View pointerEvents="none" style={styles.overlay}>
          <View style={styles.scanFrame} />
        </View>
      </View>

      {isProcessingScan ? (
        <Text style={styles.processingText}>Saving secure handshake...</Text>
      ) : null}

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <TouchableOpacity
        style={styles.retryButton}
        onPress={handleRetry}
        activeOpacity={0.85}
      >
        <Text style={styles.retryButtonText}>Retry Scan</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.uploadButton}
        onPress={handleUploadPhoto}
        activeOpacity={0.9}
      >
        <Text style={styles.uploadButtonText}>Upload</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
  },
  cameraCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#020617',
    position: 'relative',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  placeholderText: {
    marginTop: 14,
    color: '#e2e8f0',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.88)',
    backgroundColor: 'transparent',
  },
  processingText: {
    marginTop: 18,
    color: '#bfdbfe',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 18,
    color: '#fecaca',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: '#2563eb',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  uploadButton: {
    position: 'absolute',
    right: 20,
    top: 24,
    minWidth: 88,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  uploadButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
});
