import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { BottomNav } from '../components/BottomNav';

export default function SettingsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const items = [
    { key: 'account', label: 'Account' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'appearance', label: 'Appearance' },
    { key: 'privacy', label: 'Privacy & Security' },
    { key: 'help', label: 'Help and Support' },
    { key: 'about', label: 'About' },
  ];

  const filtered = items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <SafeAreaView style={styles.root}>
      {/* Full-width header (outside scroll) */}
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchBox}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search for a setting..."
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.searchInput}
          />
        </View>

        {/* Options */}
        <View style={{ marginTop: theme.spacing.md }}>
          {filtered.map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => {
                if (item.key === 'account') return router.push('/settings/account');
                // Placeholders for future pages
              }}
            >
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowChevron}>›</Text>
            </TouchableOpacity>
          ))}
          {filtered.length === 0 && (
            <Text style={styles.empty}>No results</Text>
          )}
        </View>

  {/* Bottom spacer so floating elements never overlap */}
  <View style={{ height: theme.spacing.xxl }} />
      </ScrollView>
      
      <BottomNav currentScreen="/settings" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
  paddingHorizontal: 16,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neon,
  },
  backButton: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
  fontSize: 36,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
  fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  searchBox: {
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,255,0,0.15)',
    backgroundColor: 'rgba(0,255,0,0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,255,0,0.15)',
    backgroundColor: 'rgba(0,255,0,0.04)',
    borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 18,
  minHeight: 56,
    marginBottom: theme.spacing.sm,
    shadowColor: '#00FF00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  rowLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  rowChevron: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 18,
    opacity: 0.9,
  },
  empty: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
});
