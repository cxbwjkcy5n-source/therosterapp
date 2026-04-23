import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SECTIONS = [
  {
    heading: 'Information We Collect',
    body: 'We collect information you provide directly, including your name, email address, profile details, and any data you enter about people on your roster. We also collect usage data such as app interactions and device information to improve the service.',
  },
  {
    heading: 'How We Use Your Information',
    body: 'Your information is used to provide and improve the Roster app, personalize your experience, send reminders and nudges you configure, and ensure the security of your account. We do not sell your personal data to third parties.',
  },
  {
    heading: 'Data Storage & Security',
    body: 'Your data is stored securely on encrypted servers. We implement industry-standard security measures including HTTPS encryption, secure authentication tokens, and regular security audits. However, no system is 100% secure and you use the app at your own risk.',
  },
  {
    heading: 'Third-Party Data',
    body: 'You may enter personal information about other individuals in the app. You are solely responsible for ensuring you have appropriate consent to store this information. We do not verify or take responsibility for third-party data you enter.',
  },
  {
    heading: 'Data Sharing',
    body: 'We do not share your personal data with third parties except as required by law, to protect our rights, or with service providers who assist in operating the app under strict confidentiality agreements.',
  },
  {
    heading: 'Your Rights',
    body: 'You have the right to access, correct, or delete your personal data at any time. You can delete your account through the Profile settings, which will permanently remove all your data from our servers subject to legal retention requirements.',
  },
  {
    heading: 'Cookies & Tracking',
    body: 'The app may use analytics tools to understand usage patterns. This data is anonymized and used solely to improve the app experience. You can opt out of analytics through your device settings.',
  },
  {
    heading: "Children's Privacy",
    body: 'Roster is intended for users 18 years and older. We do not knowingly collect data from minors. If you believe a minor has created an account, please contact us immediately.',
  },
  {
    heading: 'Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. We will notify you of significant changes through the app. Continued use of the app after changes constitutes acceptance of the updated policy.',
  },
  {
    heading: 'Contact Us',
    body: "If you have questions about this Privacy Policy or how we handle your data, please contact us through the app's support channel.",
  },
];

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Stack.Screen
        options={{
          title: 'Privacy Policy',
          headerShown: true,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#1A1A1A',
          headerShadowVisible: false,
          headerBackTitle: '',
        }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: insets.bottom + 48,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 4, letterSpacing: -0.4 }}>
          Privacy Policy
        </Text>
        <Text style={{ fontSize: 13, color: '#999999', marginBottom: 24 }}>Last Updated: 3/28/2026</Text>
        <View style={{ height: 1, backgroundColor: '#EEEEEE', marginBottom: 24 }} />
        {SECTIONS.map((section, i) => (
          <View key={i} style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, letterSpacing: -0.2 }}>
              {section.heading}
            </Text>
            <Text style={{ fontSize: 14, color: '#555555', lineHeight: 22 }}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
