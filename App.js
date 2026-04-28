import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ChatProvider } from './context/ChatContext';
import ChatListScreen from './screens/ChatListScreen';
import ChatScreen from './screens/ChatScreen';
import LoginScreen from './screens/LoginScreen';
import QRCodeGenerator from './screens/QRCodeGenerator';
import QRCodeScanner from './screens/QRCodeScanner';
import RegisterScreen from './screens/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  // ChatProvider exposes chat state to every screen; navigator defines the six routes.
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
            name="QRCodeGenerator"
            component={QRCodeGenerator}
            options={{ title: 'Share Secure Handshake' }}
          />
          <Stack.Screen
            name="QRCodeScanner"
            component={QRCodeScanner}
            options={{ title: 'Scan Secure Handshake' }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ title: 'Secure Chat' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ChatProvider>
  );
}
