import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function AnonymousTip() {
  const [tip, setTip] = useState('');

  const submitTip = () => {
    // Send to anonymousTips.js on backend
    console.log('Tip submitted:', tip);
    setTip('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Submit Anonymous Tip</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Describe the incident (e.g. suspicious activity)"
        placeholderTextColor="#666"
        multiline
        value={tip}
        onChangeText={setTip}
      />
      
      <TouchableOpacity style={styles.button} onPress={submitTip}>
        <Text style={styles.buttonText}>SUBMIT SECURELY</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  header: { color: '#fff', fontSize: 20, marginBottom: 20, fontWeight: 'bold' },
  input: {
    backgroundColor: '#111',
    color: '#fff',
    borderRadius: 8,
    padding: 15,
    height: 150,
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333'
  },
  button: { backgroundColor: '#333', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});
