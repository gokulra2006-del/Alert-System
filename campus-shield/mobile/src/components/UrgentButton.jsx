import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function UrgentButton({ onPress, label }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#ff1111', // Strong red for urgent actions
    width: 250,
    height: 250,
    borderRadius: 125,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ff5555',
    elevation: 10,
    shadowColor: '#ff0000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  text: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    padding: 10
  }
});
