import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Section {
  heading: string;
  body?: string;
  bullets?: string[];
  extra?: { body?: string; bullets?: string[] }[];
}

const SECTIONS: Section[] = [
  {
    heading: 'Overview of the Service',
    body: 'The Roster is a personal dating management and reflection tool that allows users to organize, track, and evaluate their dating experiences. Features include profile creation, adding individuals ("Roster Entries"), ratings, notes, reminders, and insights.',
    extra: [
      { body: 'The App is intended for personal use only and does not function as a matchmaking or dating service.' },
    ],
  },
  {
    heading: 'Eligibility',
    body: 'You must be at least 18 years old to use The Roster. By using the App, you confirm that:',
    bullets: [
      'You are legally permitted to use the service',
      'All information you provide is accurate and truthful',
    ],
  },
  {
    heading: 'User Accounts',
    body: 'To access certain features, you must create an account. You agree to:',
    bullets: [
      'Keep your login credentials secure',
      'Be responsible for all activity under your account',
      'Notify us immediately of unauthorized access',
    ],
    extra: [
      { body: 'We reserve the right to suspend or terminate accounts that violate these Terms.' },
    ],
  },
  {
    heading: 'User Data & Content',
    body: 'You may input personal information about yourself and others, including names, contact details, preferences, and evaluations. By using the App, you agree that:',
    bullets: [
      'You are responsible for all data you enter',
      'You will not upload unlawful, harmful, or abusive content',
      'You will respect the privacy and consent of others',
    ],
    extra: [
      { body: 'We do not verify the accuracy of user-provided information.' },
    ],
  },
  {
    heading: 'Privacy',
    body: 'Your use of the App is also governed by our Privacy Policy. We prioritize user privacy and aim to keep your data secure. However, you acknowledge that:',
    bullets: [
      'No system is 100% secure',
      'You use the App at your own risk',
    ],
  },
  {
    heading: 'Features & Insights Disclaimer',
    body: 'The Roster includes features such as:',
    bullets: [
      'Ratings and evaluations',
      'Pattern insights',
      'Zodiac compatibility scores',
    ],
    extra: [
      {
        body: 'These features are:',
        bullets: [
          'Based on user input or predefined systems',
          'Intended for informational and entertainment purposes only',
        ],
      },
      { body: 'They do not constitute professional advice (legal, psychological, or relationship advice).' },
    ],
  },
  {
    heading: 'Messaging & Reminders',
    body: 'The App may allow you to:',
    bullets: [
      'Set reminders',
      "Open your device's messaging app with pre-filled messages",
    ],
    extra: [
      { body: 'We do not send messages directly on your behalf unless explicitly enabled in future features.' },
      {
        body: 'You are solely responsible for:',
        bullets: [
          'Messages you send',
          'Communication with others',
        ],
      },
    ],
  },
  {
    heading: 'Acceptable Use',
    body: 'You agree not to:',
    bullets: [
      'Use the App for harassment, stalking, or abuse',
      'Store or share sensitive personal data without consent',
      'Attempt to hack, disrupt, or misuse the App',
      'Use the App for any illegal activity',
    ],
    extra: [
      { body: 'Violation may result in immediate account termination.' },
    ],
  },
  {
    heading: 'Intellectual Property',
    body: 'All content, design, branding, and functionality of The Roster are owned by us and protected by intellectual property laws. You may not:',
    bullets: [
      'Copy, reproduce, or distribute the App',
      'Reverse-engineer or exploit the platform',
    ],
  },
  {
    heading: 'Data Storage & Export',
    body: 'We may allow you to:',
    bullets: [
      'Store personal notes and data',
      'Export your data',
    ],
    extra: [
      {
        body: 'You are responsible for:',
        bullets: [
          'Backing up your data',
          'Ensuring compliance with local data laws when storing information about others',
        ],
      },
    ],
  },
  {
    heading: 'Account Deletion',
    body: 'You may delete your account at any time through the Settings. Upon deletion:',
    bullets: [
      'Your data will be permanently removed (subject to technical limitations and legal obligations)',
    ],
  },
  {
    heading: 'Limitation of Liability',
    body: 'To the fullest extent permitted by law, Roster and its creators shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the app, including but not limited to emotional distress, relationship outcomes, or data loss.',
  },
  {
    heading: 'Governing Law',
    body: 'These Terms are governed by the laws of the United States. Any disputes arising from these Terms or your use of the App shall be resolved through binding arbitration, except where prohibited by law.',
  },
  {
    heading: 'Changes to Terms',
    body: 'We reserve the right to update these Terms at any time. Continued use of the App after changes are posted constitutes your acceptance of the new Terms. We will notify users of significant changes through the app.',
  },
  {
    heading: 'Contact',
    body: "If you have questions about these Terms, please contact us through the app's support channel.",
  },
];

function SectionBlock({ section }: { section: Section }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text
        style={{
          fontSize: 16,
          fontWeight: '700',
          color: '#1A1A1A',
          marginBottom: 8,
          letterSpacing: -0.2,
        }}
      >
        {section.heading}
      </Text>
      {section.body ? (
        <Text style={{ fontSize: 14, color: '#555555', lineHeight: 22, marginBottom: section.bullets ? 6 : 0 }}>
          {section.body}
        </Text>
      ) : null}
      {section.bullets && section.bullets.length > 0 ? (
        <View style={{ marginTop: 4 }}>
          {section.bullets.map((bullet, i) => (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 4, paddingLeft: 4 }}>
              <Text style={{ fontSize: 14, color: '#555555', lineHeight: 22, marginRight: 8 }}>{'•'}</Text>
              <Text style={{ fontSize: 14, color: '#555555', lineHeight: 22, flex: 1 }}>{bullet}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {section.extra && section.extra.length > 0
        ? section.extra.map((ex, ei) => (
            <View key={ei} style={{ marginTop: 8 }}>
              {ex.body ? (
                <Text style={{ fontSize: 14, color: '#555555', lineHeight: 22, marginBottom: ex.bullets ? 4 : 0 }}>
                  {ex.body}
                </Text>
              ) : null}
              {ex.bullets && ex.bullets.length > 0 ? (
                <View style={{ marginTop: 2 }}>
                  {ex.bullets.map((bullet, bi) => (
                    <View key={bi} style={{ flexDirection: 'row', marginBottom: 4, paddingLeft: 4 }}>
                      <Text style={{ fontSize: 14, color: '#555555', lineHeight: 22, marginRight: 8 }}>{'•'}</Text>
                      <Text style={{ fontSize: 14, color: '#555555', lineHeight: 22, flex: 1 }}>{bullet}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))
        : null}
    </View>
  );
}

export default function LegalScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Stack.Screen
        options={{
          title: 'Legal',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#1A1A1A',
          headerShadowVisible: false,
          headerBackTitle: 'Back',
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
        {/* Title block */}
        <View style={{ marginBottom: 28 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 4, letterSpacing: -0.4 }}>
            Terms of Service – The Roster
          </Text>
          <Text style={{ fontSize: 13, color: '#999999' }}>Last Updated: 3/28/2026</Text>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: '#EEEEEE', marginBottom: 28 }} />

        {SECTIONS.map((section, index) => (
          <SectionBlock key={index} section={section} />
        ))}
      </ScrollView>
    </View>
  );
}
