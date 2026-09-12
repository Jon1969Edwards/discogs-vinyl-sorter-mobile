import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Spindle render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.box}>
        <Text style={styles.title}>Spindle hit an error</Text>
        <ScrollView style={styles.scroll}>
          <Text style={styles.body}>{this.state.error.message}</Text>
        </ScrollView>
        <Text style={styles.hint}>
          Fully close the app and reopen. If this stays, uninstall Spindle and
          install the preview APK again.
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 24,
    paddingTop: 64,
  },
  title: {
    color: colors.error,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  scroll: { flex: 1 },
  body: { color: '#eee', fontSize: 14, lineHeight: 20 },
  hint: { color: '#aaa', fontSize: 13, marginTop: 16 },
});
