import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Send, MessageCircle } from 'lucide-react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useTheme } from '@/contexts/ThemeContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiGet, apiPost, getBearerToken, BACKEND_URL } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface PersonContext {
  id: string;
  name: string;
  photo_url?: string;
}

const SUGGESTED_PROMPTS = [
  "How do I know if they're genuinely interested?",
  "What should I text after a great first date?",
  "How do I bring up exclusivity without scaring them off?",
  "Red flags I should take more seriously",
  "How to stop overthinking between texts",
];

const TypingDots = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      ).start();
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 4, padding: 4 }}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: '#999',
            opacity: dot,
            transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
          }}
        />
      ))}
    </View>
  );
};

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ personId?: string }>();
  const personId = params.personId;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [personContext, setPersonContext] = useState<PersonContext | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const historyUrl = personId ? `/api/chat/history?person_id=${personId}` : '/api/chat/history';
    console.log('[Coach] Loading chat history from GET', historyUrl);
    const loadHistory = apiGet<{ messages: ChatMessage[] }>(historyUrl)
      .then((data) => {
        console.log('[Coach] Loaded', data.messages?.length ?? 0, 'messages');
        setMessages(data.messages || []);
      })
      .catch((e) => console.error('[Coach] Failed to load history:', e));

    const loadPerson = personId
      ? apiGet<any>(`/api/persons/${personId}`)
          .then((data) => {
            const p = data?.person ?? data;
            console.log('[Coach] Loaded person context:', p?.name, 'id:', p?.id);
            setPersonContext({ id: p.id, name: p.name, photo_url: p.photo_url });
          })
          .catch((e) => console.log('[Coach] Could not load person context (non-fatal):', e?.message))
      : Promise.resolve();

    Promise.all([loadHistory, loadPerson]).finally(() => setInitialLoading(false));
  }, [personId]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    console.log('[Coach] Send button pressed — message:', trimmed.slice(0, 50), personId ? `(context: person ${personId})` : '');
    setInput('');

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    // Add an empty assistant message that we'll stream into
    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const token = await getBearerToken();
      const backendUrl = BACKEND_URL;
      const history = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
      const body: Record<string, any> = { message: trimmed, history };
      if (personId) body.person_id = personId;

      console.log('[Coach] POST', `${backendUrl}/api/chat/message/stream`, '— streaming request');
      const response = await fetch(`${backendUrl}/api/chat/message/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Read the SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.token) {
                  accumulated += parsed.token;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId ? { ...m, content: accumulated } : m
                    )
                  );
                }
                // Handle non-streaming fallback: if backend returns { reply: "..." }
                if (parsed.reply) {
                  accumulated = parsed.reply;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId ? { ...m, content: accumulated } : m
                    )
                  );
                }
              } catch {}
            }
          }
        }
      }

      console.log('[Coach] Stream complete, accumulated length:', accumulated.length);

      // If streaming produced nothing, fall back to non-streaming endpoint
      if (!accumulated) {
        console.log('[Coach] Stream empty — falling back to POST /api/chat/message');
        const result = await apiPost<{ reply: string }>('/api/chat/message', body);
        accumulated = result?.reply || '';
        console.log('[Coach] Fallback reply:', accumulated.slice(0, 60));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated } : m
          )
        );
      }
    } catch (e: any) {
      console.error('[Coach] Streaming failed, trying fallback:', e);
      // Fallback to non-streaming
      try {
        const history = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));
        const body: Record<string, any> = { message: trimmed, history };
        if (personId) body.person_id = personId;
        console.log('[Coach] Fallback POST /api/chat/message');
        const result = await apiPost<{ reply: string }>('/api/chat/message', body);
        console.log('[Coach] Fallback reply received:', result?.reply?.slice(0, 60));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: result?.reply || "Sorry, I couldn't respond right now." }
              : m
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Sorry, I couldn't respond right now. Please try again." }
              : m
          )
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    const bubbleBg = isUser ? colors.primary : colors.surface;
    const textColor = isUser ? '#fff' : colors.text;
    const isTyping = !isUser && item.content === '' && loading;
    const timeStr = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
        <View style={{ maxWidth: '75%' }}>
          <View
            style={{
              backgroundColor: bubbleBg,
              borderRadius: 16,
              borderBottomRightRadius: isUser ? 4 : 16,
              borderBottomLeftRadius: isUser ? 16 : 4,
              padding: 12,
              borderWidth: isUser ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            {isTyping ? (
              <TypingDots />
            ) : (
              <Text style={{ color: textColor, fontSize: 15, lineHeight: 21 }}>
                {item.content}
              </Text>
            )}
          </View>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 10,
              marginTop: 3,
              textAlign: isUser ? 'right' : 'left',
            }}
          >
            {timeStr}
          </Text>
        </View>
      </View>
    );
  };

  const inputBarHasText = !!input.trim();
  const sendBtnBg = inputBarHasText ? colors.primary : colors.surface;
  const sendBtnBorder = inputBarHasText ? colors.primary : colors.border;
  const sendIconColor = inputBarHasText ? '#fff' : colors.textTertiary;

  const inputBar = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        paddingBottom: insets.bottom + 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 10,
        backgroundColor: colors.background,
      }}
    >
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder="Ask me anything..."
        placeholderTextColor={colors.textTertiary}
        multiline
        style={{
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 10,
          color: colors.text,
          fontSize: 15,
          borderWidth: 1,
          borderColor: colors.border,
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
          backgroundColor: sendBtnBg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: sendBtnBorder,
        }}
      >
        <Send size={18} color={sendIconColor} />
      </AnimatedPressable>
    </View>
  );

  const personInitial = personContext?.name ? personContext.name[0].toUpperCase() : '?';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
    >
      {/* Person context banner */}
      {personContext && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: 'rgba(168,85,247,0.08)',
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(168,85,247,0.15)',
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(168,85,247,0.2)',
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {personContext.photo_url ? (
              <Image source={{ uri: personContext.photo_url }} style={{ width: 32, height: 32 }} contentFit="cover" />
            ) : (
              <Text style={{ color: '#A855F7', fontWeight: '700', fontSize: 14 }}>{personInitial}</Text>
            )}
          </View>
          <Text style={{ color: '#A855F7', fontSize: 13, fontWeight: '600', flex: 1 }}>
            {'💬 Coaching about '}
            <Text style={{ fontWeight: '700' }}>{personContext.name}</Text>
          </Text>
        </View>
      )}

      {initialLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
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
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
              Your Dating Coach
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                textAlign: 'center',
                marginBottom: 28,
                maxWidth: 260,
              }}
            >
              {personContext
                ? `Ask me anything about ${personContext.name} or your dating life.`
                : 'Ask me anything about dating, relationships, or how to navigate your love life.'}
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
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: 14 }}>{prompt}</Text>
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
          {inputBar}
        </>
      )}
    </KeyboardAvoidingView>
  );
}
