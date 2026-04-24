import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ChatProvider } from './context/ChatContext';
import ChatListScreen from './screens/ChatListScreen';
import ChatRoomScreen from './screens/ChatRoomScreen';
import LoginScreen from './screens/LoginScreen';
import QRCodeGenerator from './screens/QRCodeGenerator';
import QRCodeScanner from './screens/QRCodeScanner';
import RegisterScreen from './screens/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <ChatProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Chats"
            component={ChatListScreen}
            options={{ headerShown: true, title: 'Chats' }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatRoomScreen}
            options={{ title: 'Secure Chat' }}
          />
          <Stack.Screen
            name="QRCodeGenerator"
            component={QRCodeGenerator}
            options={{ title: 'Share Secure Handshake' }}
          />
          <Stack.Screen
            name="QRCodeScanner"
            component={QRCodeScanner}
            options={{ title: 'Scan Secure Handshake' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ChatProvider>
  );
}