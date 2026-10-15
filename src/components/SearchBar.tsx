import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export function SearchBar({ initialValue = '', onSubmit }: { initialValue?: string; onSubmit: (query: string) => void }) {
  const [value, setValue] = useState(initialValue);
  return <View style={styles.wrap}>
    <MaterialIcons name="search" size={21} color="#999" />
    <TextInput value={value} onChangeText={setValue} onSubmitEditing={() => value.trim() && onSubmit(value.trim())} placeholder="Search videos, music and more" placeholderTextColor="#777" style={styles.input} returnKeyType="search" />
    {value.length > 0 && <Pressable onPress={() => setValue('')}><MaterialIcons name="close" size={20} color="#777" /></Pressable>}
  </View>;
}
const styles = StyleSheet.create({ wrap: { height: 48, marginHorizontal: 16, borderRadius: 14, backgroundColor: '#18181c', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 9 }, input: { flex: 1, color: '#fff', fontSize: 14 } });
