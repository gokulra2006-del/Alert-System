import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function Home({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Campus Shield</Text>
      
      <View style={styles.grid}>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('PanicButton')}>
          <Text style={styles.cardTitle}>🆘 SOS</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SafeWalk')}>
          <Text style={styles.cardTitle}>🚶 SafeWalk</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AnonymousTip')}>
          <Text style={styles.cardTitle}>🕵️ Tip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ShuttleTracker')}>
          <Text style={styles.cardTitle}>🚌 Shuttle</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('MoodCheckin')}>
          <Text style={styles.cardTitle}>🧠 Wellness</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // OLED Black
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#111111',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  }
});
