import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import LiveMap from '../components/LiveMap';

export default function ShuttleTracker({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Live Shuttle Tracker</Text>
      
      <View style={styles.mapContainer}>
        <LiveMap />
      </View>
      
      {/* Embedded panic button per spec */}
      <TouchableOpacity 
        style={styles.embeddedPanic}
        onPress={() => navigation.navigate('PanicButton')}
      >
        <Text style={styles.panicText}>SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20 },
  header: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  mapContainer: { flex: 1, backgroundColor: '#111', borderRadius: 12 },
  embeddedPanic: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#ff3333',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5
  },
  panicText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
