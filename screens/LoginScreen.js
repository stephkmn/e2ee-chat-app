import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginUser } from '../services/auth';

export default function LoginScreen({ navigation }) {
  // These state variables temporarily hold the text the user types into the inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>E2EE Chat App</Text>

        {/* Email Input Field */}
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor="#667"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none" // Prevents phones from capitalizing the first letter of an email
        />

        {/* Password Input Field */}
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#667"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true} // Replaces typed characters with dots for security
        />

        {/* Login Button */}
        <TouchableOpacity 
          style={styles.button} 
          onPress={async () => {
            if (!email || !password) {
              Alert.alert("Error", "Please fill in all fields.");
              return;
            }
            const { user, error } = await loginUser(email, password);
            if (error) {
              Alert.alert("Login Failed", error);
            } else {
              Alert.alert("Success!", "You are logged in.");
              navigation.navigate('Chats');
            }
          }}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        {/* Navigation Link to Register Screen */}
        <TouchableOpacity style={styles.linkContainer} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>Don't have an account? Register here.</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// This section handles all the visual styling (colors, padding, fonts)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f9',
    justifyContent: 'center',
  },
  formContainer: {
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
  },
});