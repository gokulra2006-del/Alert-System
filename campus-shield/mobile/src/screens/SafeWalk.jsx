import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import LiveMap from '../components/LiveMap';

export default function SafeWalk() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>SafeWalk (Virtual Escort)</Text>
      
      <View style={styles.mapContainer}>
        <LiveMap />
      </View>
      
      <TouchableOpacity style={styles.startButton}>
        <Text style={styles.buttonText}>START ESCORT</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 20
  },
  header: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20
  },
  startButton: {
    backgroundColor: '#0044cc',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center'
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16
  }
});
