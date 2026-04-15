import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { registerUser } from '../services/auth';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Create Account</Text>

        {/* Name Input */}
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#667"
          value={name}
          onChangeText={setName}
        />

        {/* Email Input */}
        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor="#667"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Password Input */}
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#667"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true} 
        />

        {/* Confirm Password Input */}
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#667"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={true} 
        />

        {/* Register Button */}
        <TouchableOpacity 
          style={styles.button} 
          onPress={async () => {
            if (password !== confirmPassword) {
              Alert.alert("Error", "Passwords do not match!");
              return;
            }
            const { user, error } = await registerUser(email, password);
            if (error) {
              Alert.alert("Registration Failed", error);
            } else {
              Alert.alert("Success!", "Account created successfully.");
              // Usually we navigate to the Chat room here, but for now just clear or let the state update
            }
          }}
        >
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>

        {/* Link back to Login */}
        <TouchableOpacity style={styles.linkContainer} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Already have an account? Login here.</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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
    backgroundColor: '#28a745', // Using a green color to differentiate from login
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
