import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LiveMap() {
  return (
    <View style={styles.mapMock}>
      <Text style={styles.text}>Map rendering disabled in mock</Text>
      <Text style={styles.sub}>Requires react-native-maps & Firebase connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapMock: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  text: { color: '#888', fontWeight: 'bold' },
  sub: { color: '#555', fontSize: 12, marginTop: 5, textAlign: 'center' }
});
