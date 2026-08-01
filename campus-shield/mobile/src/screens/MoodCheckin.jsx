import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function MoodCheckin() {
  const [mood, setMood] = useState(null);

  const submitMood = (score) => {
    setMood(score);
    // Send to pulseSurveys.js on backend
    console.log('Submitted Mood:', score);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Weekly Pulse</Text>
      <Text style={styles.sub}>How are you feeling today?</Text>
      
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((score) => (
          <TouchableOpacity 
            key={score} 
            style={[styles.btn, mood === score && styles.selected]}
            onPress={() => submitMood(score)}
          >
            <Text style={styles.btnText}>{score}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {mood && <Text style={styles.thanks}>Thanks for checking in!</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, justifyContent: 'center' },
  header: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  sub: { color: '#aaa', textAlign: 'center', marginBottom: 30 },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  btn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: '#0044cc' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  thanks: { color: '#44ff44', textAlign: 'center', marginTop: 30, fontSize: 16 }
});
