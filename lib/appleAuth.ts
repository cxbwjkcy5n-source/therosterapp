// Stub for non-iOS platforms — native Apple Sign In is not available here
export async function nativeAppleSignIn(): Promise<string> {
  throw new Error('Native Apple Sign In is only available on iOS');
}
