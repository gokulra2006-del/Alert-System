import React, { useState } from 'react';
import { View, Text, StyleSheet, Vibration } from 'react-native';
import UrgentButton from '../components/UrgentButton';

export default function PanicButton() {
  const [active, setActive] = useState(false);

  const handlePanic = () => {
    // Vibrate confirmation
    Vibration.vibrate(500);
    setActive(true);
    
    // Simulate sending SOS to backend (sosFlow.js)
    console.log('Sending SOS to backend...');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{active ? "SOS TRANSMITTING" : "EMERGENCY SOS"}</Text>
      
      <UrgentButton 
        onPress={handlePanic} 
        label={active ? "ACTIVE (SILENT WITNESS)" : "TAP TO SEND SOS"} 
      />
      
      {active && (
        <Text style={styles.subtext}>
          Silent audio & GPS transmission active. Help is on the way.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  header: {
    color: '#ff3333', // Red urgent accent
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40
  },
  subtext: {
    color: '#aaaaaa',
    marginTop: 20,
    textAlign: 'center'
  }
});
