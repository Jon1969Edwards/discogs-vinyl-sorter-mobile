import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSettings } from '../hooks/useSettings';
import type { DividerMode, SortBy } from '../types';
import { FORMAT_FILTERS } from '../domain/formatFilter';
import { CurrencyPicker } from '../components/CurrencyPicker';
import { clearAllAuth } from '../services';
import type { DiscogsCurrency } from '../types';
import { AppText } from '../components/ui/AppText';
import { SettingsSection } from '../components/ui/SettingsSection';
import { LicenseModal } from '../components/LicenseModal';
import { ProUpgradeModal } from '../components/ProUpgradeModal';
import { useLicense } from '../context/LicenseContext';
import {
  canFetchPrices,
  canUseAbcDividers,
} from '../services/featureGate';
import { colors, radius, spacing } from '../theme';
import {
  APP_NAME,
  APP_VERSION,
  DISCOGS_DISCLAIMER,
  SUPPORT_EMAIL,
} from '../constants/version';

const DIVIDER_OPTIONS: { id: DividerMode; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'letter', label: 'A–Z letters' },
  { id: 'abc', label: 'Shelf A/B/C' },
];

const SORT_OPTIONS: { id: SortBy; label: string }[] = [
  { id: 'artist', label: 'Artist' },
  { id: 'title', label: 'Title' },
  { id: 'year', label: 'Year' },
  { id: 'genre', label: 'Genre' },
  { id: 'price_asc', label: 'Price (low first)' },
  { id: 'price_desc', label: 'Price (high first)' },
];

interface SettingsScreenProps {
  onSignOut: () => void;
  onSettingsChanged?: () => void;
}

export function SettingsScreen({
  onSignOut,
  onSettingsChanged,
}: SettingsScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<{ Settings: undefined }>>();
  const { settings, loaded, update } = useSettings();
  const { isPro, summary } = useLicense();
  const [currencyDraft, setCurrencyDraft] = useState(settings.currency);
  const [saving, setSaving] = useState(false);
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [upsellFeature, setUpsellFeature] = useState<string | null>(null);

  React.useEffect(() => {
    if (loaded) setCurrencyDraft(settings.currency);
  }, [loaded, settings.currency]);

  React.useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', () => {
      if (currencyDraft !== settings.currency) {
        void update({ currency: currencyDraft });
      }
    });
    return unsub;
  }, [navigation, currencyDraft, settings.currency, update]);

  const toggleFormat = useCallback(
    async (fmt: string) => {
      let formats = [...settings.formats];
      if (fmt === 'everything') {
        formats = formats.includes('everything') ? ['lp'] : ['everything'];
      } else {
        formats = formats.filter((f) => f !== 'everything');
        if (formats.includes(fmt)) {
          formats = formats.filter((f) => f !== fmt);
        } else {
          formats.push(fmt);
        }
        if (formats.length === 0) formats = ['lp'];
      }
      await update({ formats });
      onSettingsChanged?.();
    },
    [settings.formats, update, onSettingsChanged]
  );

  const handleSignOut = useCallback(async () => {
    await clearAllAuth();
    onSignOut();
  }, [onSignOut]);

  const currencyDirty = currencyDraft !== settings.currency;

  const saveCurrency = useCallback(async () => {
    if (!currencyDirty) return;
    setSaving(true);
    try {
      await update({ currency: currencyDraft });
      onSettingsChanged?.();
    } finally {
      setSaving(false);
    }
  }, [currencyDraft, currencyDirty, update, onSettingsChanged]);

  const handleDone = useCallback(async () => {
    await saveCurrency();
    navigation.goBack();
  }, [saveCurrency, navigation]);

  if (!loaded) {
    return (
      <View style={styles.center}>
        <AppText variant="caption">Loading settings…</AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => void handleDone()}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <AppText style={styles.doneBtnText}>Done</AppText>
          )}
        </TouchableOpacity>
        <AppText variant="title" style={styles.topBarTitle}>
          Settings
        </AppText>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <SettingsSection title="Collection">
          {FORMAT_FILTERS.map(([id, label]) => (
            <View key={id} style={styles.row}>
              <AppText variant="body" style={styles.label}>
                {label}
              </AppText>
              <Switch
                value={
                  id === 'everything'
                    ? settings.formats.includes('everything')
                    : settings.formats.includes(id)
                }
                onValueChange={() => toggleFormat(id)}
                trackColor={{ false: colors.surfaceElevated, true: colors.accent }}
                thumbColor={colors.textPrimary}
                ios_backgroundColor={colors.surfaceElevated}
              />
            </View>
          ))}
          <View style={styles.row}>
            <AppText variant="body" style={styles.label}>
              Sort by
            </AppText>
          </View>
          <View style={styles.chipRow}>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.chip,
                  settings.sort_by === opt.id && styles.chipActive,
                ]}
                onPress={async () => {
                  if (
                    (opt.id === 'price_asc' || opt.id === 'price_desc') &&
                    !canFetchPrices(isPro)
                  ) {
                    setUpsellFeature('Marketplace prices');
                    return;
                  }
                  await update({ sort_by: opt.id });
                  onSettingsChanged?.();
                }}
              >
                <AppText
                  variant="bodySmall"
                  style={[
                    styles.chipText,
                    settings.sort_by === opt.id && styles.chipTextActive,
                  ]}
                >
                  {opt.label}
                  {(opt.id === 'price_asc' || opt.id === 'price_desc') && !isPro
                    ? ' (Pro)'
                    : ''}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </SettingsSection>

        <SettingsSection title="Pro">
          <AppText variant="body" style={styles.aboutTitle}>
            Status: {summary}
          </AppText>
          {!isPro ? (
            <>
              <AppText variant="caption" style={styles.aboutCaption}>
                Free includes up to 100 records. Pro unlocks prices, manual
                order, A/B/C dividers, and more.
              </AppText>
              <TouchableOpacity
                style={styles.proBtn}
                onPress={() => setLicenseOpen(true)}
              >
                <AppText style={styles.proBtnText}>Upgrade to Pro</AppText>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.proBtnSecondary}
              onPress={() => setLicenseOpen(true)}
            >
              <AppText style={styles.proBtnTextSecondary}>Manage license</AppText>
            </TouchableOpacity>
          )}
        </SettingsSection>

        <SettingsSection title="Export & display">
          <AppText variant="body" style={styles.subsectionLabel}>
            Export dividers
          </AppText>
          <View style={styles.chipRow}>
            {DIVIDER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.chip,
                  settings.divider_mode === opt.id && styles.chipActive,
                ]}
                onPress={async () => {
                  if (opt.id === 'abc' && !canUseAbcDividers(isPro)) {
                    setUpsellFeature('A/B/C shelf dividers');
                    return;
                  }
                  await update({ divider_mode: opt.id });
                  onSettingsChanged?.();
                }}
              >
                <AppText
                  variant="bodySmall"
                  style={[
                    styles.chipText,
                    settings.divider_mode === opt.id && styles.chipTextActive,
                  ]}
                >
                  {opt.label}
                  {opt.id === 'abc' && !isPro ? ' (Pro)' : ''}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <AppText variant="body" style={styles.label}>
              Show prices in list
            </AppText>
            <Switch
              value={settings.show_prices && canFetchPrices(isPro)}
              onValueChange={(v) => {
                if (v && !canFetchPrices(isPro)) {
                  setUpsellFeature('Marketplace prices');
                  return;
                }
                void update({ show_prices: v });
              }}
              trackColor={{ false: colors.surfaceElevated, true: colors.accent }}
              thumbColor={colors.textPrimary}
            />
          </View>

          <View style={styles.row}>
            <AppText variant="body" style={styles.label}>
              Save last export on device
            </AppText>
            <Switch
              value={settings.save_last_export !== false}
              onValueChange={(v) => void update({ save_last_export: v })}
              trackColor={{ false: colors.surfaceElevated, true: colors.accent }}
              thumbColor={colors.textPrimary}
            />
          </View>

          <View style={styles.row}>
            <AppText variant="body" style={styles.label}>
              Include JSON in exports
            </AppText>
            <Switch
              value={settings.write_json}
              onValueChange={(v) => update({ write_json: v })}
              trackColor={{ false: colors.surfaceElevated, true: colors.accent }}
              thumbColor={colors.textPrimary}
            />
          </View>

          <AppText variant="body" style={[styles.label, styles.fieldLabel]}>
            Currency
          </AppText>
          <CurrencyPicker
            value={currencyDraft}
            onChange={(currency: DiscogsCurrency) => setCurrencyDraft(currency)}
          />
          {currencyDirty ? (
            <TouchableOpacity
              style={styles.saveCurrencyBtn}
              onPress={() => void saveCurrency()}
              disabled={saving}
            >
              <AppText variant="accent" style={styles.saveCurrencyBtnText}>
                {saving ? 'Saving…' : 'Save currency'}
              </AppText>
            </TouchableOpacity>
          ) : (
            <AppText variant="caption" style={styles.currencyHint}>
              Tap Done when finished. Other settings save automatically.
            </AppText>
          )}
        </SettingsSection>

        <SettingsSection title="Advanced">
          <AppText variant="body" style={styles.fieldLabel}>
            Poll interval (seconds)
          </AppText>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            placeholderTextColor={colors.textMuted}
            value={String(settings.poll_seconds)}
            onChangeText={(t) => {
              const n = parseInt(t, 10);
              if (!Number.isNaN(n) && n >= 60) update({ poll_seconds: n });
            }}
          />

          <AppText variant="body" style={styles.fieldLabel}>
            User-Agent
          </AppText>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            multiline
            placeholderTextColor={colors.textMuted}
            value={settings.user_agent}
            onChangeText={(t) => update({ user_agent: t })}
          />
        </SettingsSection>

        <SettingsSection title="About">
          <AppText variant="body" style={styles.aboutTitle}>
            {APP_NAME} {APP_VERSION}
          </AppText>
          <AppText variant="caption" style={styles.aboutCaption}>
            {DISCOGS_DISCLAIMER}
          </AppText>
          <AppText variant="caption" style={styles.aboutCaption}>
            Support: {SUPPORT_EMAIL}
          </AppText>
        </SettingsSection>

        <SettingsSection title="Account">
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <AppText style={styles.signOutText}>Sign Out</AppText>
          </TouchableOpacity>
        </SettingsSection>
      </ScrollView>

      <LicenseModal visible={licenseOpen} onClose={() => setLicenseOpen(false)} />
      <ProUpgradeModal
        visible={upsellFeature != null}
        feature={upsellFeature || 'This feature'}
        onClose={() => setUpsellFeature(null)}
        onOpenLicense={() => {
          setUpsellFeature(null);
          setLicenseOpen(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
  },
  topBarSpacer: { width: 72 },
  doneBtn: {
    minWidth: 72,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  doneBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  label: { flex: 1, color: colors.textSecondary },
  subsectionLabel: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: colors.textSecondary,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  chipActive: { backgroundColor: colors.accent },
  chipText: { color: colors.textSecondary },
  chipTextActive: { color: colors.white, fontWeight: '600' },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    padding: spacing.md,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  inputMulti: { minHeight: 60 },
  saveCurrencyBtn: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  saveCurrencyBtnText: { fontWeight: '700' },
  currencyHint: {
    marginTop: spacing.sm,
  },
  aboutTitle: {
    marginBottom: spacing.xs,
  },
  aboutCaption: {
    marginBottom: spacing.xs,
  },
  proBtn: {
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  proBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  proBtnSecondary: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  proBtnTextSecondary: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 15,
  },
  signOutBtn: {
    backgroundColor: colors.accent,
    padding: spacing.lg,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  signOutText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
