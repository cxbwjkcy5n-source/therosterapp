import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Send, MessageCircle } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiGet, apiPost } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const SUGGESTED_PROMPTS = [
  'How do I know if someone likes me?',
  'Tips for a first date',
  'How to set healthy boundaries',
];

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    console.log('[Coach] Loading chat history from GET /api/chat/history');
    apiGet<{ messages: ChatMessage[] }>('/api/chat/history')
      .then((data) => {
        console.log('[Coach] Loaded', data.messages?.length ?? 0, 'messages');
        setMessages(data.messages || []);
      })
      .catch((e) => console.error('[Coach] Failed to load history:', e))
      .finally(() => setInitialLoading(false));
  }, []);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    console.log('[Coach] Sending message:', trimmed.slice(0, 50));
    setInput('');

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      console.log('[Coach] POST /api/chat with message and history');
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const result = await apiPost<{ reply: string }>('/api/chat', {
        message: trimmed,
        history,
      });
      console.log('[Coach] Got reply from AI:', result?.reply?.slice(0, 60));

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result?.reply || '',
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
        return [...filtered, tempUserMsg, assistantMsg];
      });
    } catch (e: any) {
      console.error('[Coach] Failed to send message:', e);
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={{
          flexDirection: isUser ? 'row-reverse' : 'row',
          alignItems: 'flex-end',
          marginBottom: 12,
          paddingHorizontal: 16,
          gap: 8,
        }}
      >
        {!isUser && (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(168,85,247,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MessageCircle size={16} color="#A855F7" />
          </View>
        )}
        <View
          style={{
            maxWidth: '75%',
            backgroundColor: isUser ? COLORS.primary : COLORS.surface,
            borderRadius: 16,
            borderBottomRightRadius: isUser ? 4 : 16,
            borderBottomLeftRadius: isUser ? 16 : 4,
            padding: 12,
            borderWidth: isUser ? 0 : 1,
            borderColor: COLORS.border,
          }}
        >
          <Text style={{ color: isUser ? '#fff' : COLORS.text, fontSize: 15, lineHeight: 21 }}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  const inputBar = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        paddingBottom: insets.bottom + 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: 10,
        backgroundColor: COLORS.background,
      }}
    >
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="Ask me anything..."
        placeholderTextColor={COLORS.textTertiary}
        multiline
        style={{
          flex: 1,
          backgroundColor: COLORS.surface,
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 10,
          color: COLORS.text,
          fontSize: 15,
          borderWidth: 1,
          borderColor: COLORS.border,
          maxHeight: 100,
        }}
      />
      <AnimatedPressable
        onPress={() => {
          console.log('[Coach] Send button pressed');
          sendMessage(input);
        }}
        disabled={!input.trim() || loading}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: input.trim() ? COLORS.primary : COLORS.surface,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: input.trim() ? COLORS.primary : COLORS.border,
        }}
      >
        {loading ? (
          <ActivityIndicator color={input.trim() ? '#fff' : COLORS.textTertiary} size="small" />
        ) : (
          <Send size={18} color={input.trim() ? '#fff' : COLORS.textTertiary} />
        )}
      </AnimatedPressable>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <Stack.Screen options={{ title: 'Dating Coach' }} />

      {initialLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : messages.length === 0 ? (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                backgroundColor: 'rgba(168,85,247,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <MessageCircle size={32} color="#A855F7" />
            </View>
            <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
              Your Dating Coach
            </Text>
            <Text
              style={{
                color: COLORS.textSecondary,
                fontSize: 14,
                textAlign: 'center',
                marginBottom: 28,
                maxWidth: 260,
              }}
            >
              Ask me anything about dating, relationships, or how to navigate your love life.
            </Text>
            <View style={{ gap: 10, width: '100%' }}>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <AnimatedPressable
                  key={prompt}
                  onPress={() => {
                    console.log('[Coach] Suggested prompt selected:', prompt);
                    sendMessage(prompt);
                  }}
                >
                  <View
                    style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                  >
                    <Text style={{ color: COLORS.text, fontSize: 14 }}>{prompt}</Text>
                  </View>
                </AnimatedPressable>
              ))}
            </View>
          </View>
          {inputBar}
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
          />

          {loading && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(168,85,247,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MessageCircle size={16} color="#A855F7" />
              </View>
              <View
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  borderBottomLeftRadius: 4,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <ActivityIndicator color={COLORS.textSecondary} size="small" />
              </View>
            </View>
          )}

          {inputBar}
        </>
      )}
    </KeyboardAvoidingView>
  );
}
