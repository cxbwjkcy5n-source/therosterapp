import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/Colors';

export const colors = {
  primary: COLORS.primary,
  secondary: COLORS.primaryLight,
  accent: COLORS.accent,
  background: COLORS.background,
  backgroundAlt: COLORS.surface,
  text: COLORS.text,
  grey: COLORS.textSecondary,
  card: COLORS.surface,
};

export const buttonStyles = StyleSheet.create({
  instructionsButton: {
    backgroundColor: COLORS.primary,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    backgroundColor: COLORS.surface,
    alignSelf: 'center',
    width: '100%',
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 800,
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    color: COLORS.text,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  text: {
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 22,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    width: '100%',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: 'white',
  },
});
