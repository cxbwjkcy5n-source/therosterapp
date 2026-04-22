import * as AppleAuthentication from 'expo-apple-authentication';

export async function nativeAppleSignIn(): Promise<string> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) {
    throw new Error('No identity token received from Apple');
  }
  return credential.identityToken;
}
