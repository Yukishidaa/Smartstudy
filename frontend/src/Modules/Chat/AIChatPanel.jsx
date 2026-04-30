import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, ChevronRight, Maximize2 } from 'lucide-react';
import './AIChatPanel.css';

// ============================================================
// Заглушки ответов ИИ
// ============================================================
const COMMAND_PATTERNS = [
    {
        pattern: /добав[ьи]\s+задач[ую]/i,
        reply: '✅ Хорошо, я создаю задачу в вашем списке. Уточните название и дедлайн — я помогу оформить всё правильно.',
    },
    {
        pattern: /напомн[иы]/i,
        reply: '🔔 Напоминание зафиксировано. В будущем я смогу автоматически добавлять события в ваш календарь.',
    },
    {
        pattern: /расписани[ея]|календар/i,
        reply: '📅 Открываю раздел Календаря. Вы можете перетащить задачи из To-Do прямо в нужный временной слот.',
    },
    {
        pattern: /помог[иы]|что умеешь|что ты умеешь/i,
        reply: '🤖 Я — SmartStudy Assistant. Умею:\n- Отвечать на вопросы по учебным материалам (PDF, конспекты)\n- Создавать задачи и события через чат\n- Анализировать вашу продуктивность\n- Предлагать расписание занятий\n\nПросто напишите, чем могу помочь!',
    },
    {
        pattern: /привет|здравствуй|хай/i,
        reply: '👋 Привет! Чем могу помочь сегодня? Напишите задачу, вопрос по учёбе или просто «помоги» — и я объясню свои возможности.',
    },
];

const FALLBACK_REPLIES = [
    'Понял вас. Сейчас обрабатываю запрос...\n\nЭта функция будет доступна после подключения языковой модели. Я готов работать с вашими учебными материалами, PDF-файлами и конспектами.',
    'Интересный вопрос! Когда подключится реальный API, я смогу дать развёрнутый ответ с примерами и объяснениями.',
    'Записал. В будущем здесь будет полноценный диалог с анализом ваших материалов и персональными рекомендациями.',
];

const getAIReply = (text) => {
    for (const { pattern, reply } of COMMAND_PATTERNS) {
        if (pattern.test(text)) return reply;
    }
    return FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)];
};

// ============================================================
// Индикатор печати
// ============================================================
function TypingIndicator() {
    return (
        <div className="typing-indicator">
            <span /><span /><span />
        </div>
    );
}

// ============================================================
// Бабл сообщения
// ============================================================
function MessageBubble({ msg }) {
    const isUser = msg.role === 'user';

    const renderContent = (text) =>
        text.split('\n').map((line, i) => (
            <span key={i}>
                {line.split(/(`[^`]+`)/g).map((part, j) =>
                    part.startsWith('`') && part.endsWith('`')
                        ? <code key={j} className="inline-code">{part.slice(1, -1)}</code>
                        : part
                )}
                {i < text.split('\n').length - 1 && <br />}
            </span>
        ));

    return (
        <motion.div
            className={`msg-row ${isUser ? 'user' : 'ai'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            {!isUser && (
                <div className="msg-avatar"><Bot size={14} /></div>
            )}
            <div className={`msg-bubble ${isUser ? 'user' : 'ai'}`}>
                <div className="msg-content">{renderContent(msg.content)}</div>
                <span className="msg-time">
                    {new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </motion.div>
    );
}

// ============================================================
// AIChatPanel
// ============================================================
/**
 * AIChatPanel — компонент чата с двумя режимами отображения:
 *
 *  mode='center'  — занимает всё доступное пространство (вкладка «ИИ-ассистент»)
 *  mode='sidebar' — компактная правая панель (рядом с Todo/Calendar)
 *
 * Props:
 *  - theme           {'dark'|'light'}
 *  - messages        {Array}
 *  - onMessages      {fn}
 *  - mode            {'center'|'sidebar'}
 *  - onExpandToChat  {fn}  — открыть вкладку «chat» (из sidebar-режима)
 *  - collapsed       {boolean}  — только для mode='sidebar'
 *  - onToggleCollapse {fn}      — только для mode='sidebar'
 */
function AIChatPanel({
    theme = 'dark',
    messages,
    onMessages,
    mode = 'sidebar',
    onExpandToChat,
    collapsed = false,
    onToggleCollapse,
}) {
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping]   = useState(false);

    const messagesEndRef = useRef(null);
    const textareaRef    = useRef(null);

    // Авто-скролл вниз
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Авто-высота textarea
    const handleInputChange = (e) => {
        setInputText(e.target.value);
        const ta = textareaRef.current;
        if (ta) {
            ta.style.height = 'auto';
            ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
        }
    };

    // Стриминг-эффект ответа
    const streamReply = useCallback((fullText) => {
        const words = fullText.split(' ');
        let current = '';
        let idx = 0;
        const aiMsg = {
            id: Date.now() + 1,
            role: 'ai',
            content: '',
            timestamp: new Date().toISOString(),
        };
        onMessages(prev => [...prev, aiMsg]);
        const timer = setInterval(() => {
            current += (idx > 0 ? ' ' : '') + words[idx];
            idx++;
            onMessages(prev =>
                prev.map(m => m.id === aiMsg.id ? { ...m, content: current } : m)
            );
            if (idx >= words.length) {
                clearInterval(timer);
                setIsTyping(false);
            }
        }, 55);
    }, [onMessages]);

    const handleSend = useCallback(() => {
        const text = inputText.trim();
        if (!text || isTyping) return;
        const userMsg = {
            id: Date.now(),
            role: 'user',
            content: text,
            timestamp: new Date().toISOString(),
        };
        onMessages(prev => [...prev, userMsg]);
        setInputText('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setIsTyping(true);
        const replyText = getAIReply(text);
        setTimeout(() => streamReply(replyText), 800 + Math.random() * 600);
    }, [inputText, isTyping, onMessages, streamReply]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSend();
        }
    };

    // ========== Центральный режим ==========
    if (mode === 'center') {
        return (
            <motion.div
                className={`ai-chat-center ${theme}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.3 }}
            >
                {/* Шапка */}
                <div className="chat-center-header">
                    <div className="chat-avatar-small"><Bot size={18} /></div>
                    <span className="chat-title">Smart Assistant</span>
                </div>

                {/* Сообщения */}
                <div className="chat-center-messages">
                    {messages.length === 0 && (
                        <div className="chat-welcome">
                            <div className="chat-welcome-icon"><Bot size={32} /></div>
                            <p>Привет! Я SmartStudy Assistant.</p>
                            <p className="chat-welcome-sub">
                                Задайте вопрос по учебным материалам, создайте задачу текстом или попросите помочь с расписанием.
                            </p>
                        </div>
                    )}
                    {messages.map(msg => (
                        <MessageBubble key={msg.id} msg={msg} />
                    ))}
                    {isTyping && (
                        <motion.div
                            className="msg-row ai"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="msg-avatar"><Bot size={14} /></div>
                            <div className="msg-bubble ai"><TypingIndicator /></div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Поле ввода */}
                <div className="chat-center-input">
                    <textarea
                        ref={textareaRef}
                        className="chat-textarea"
                        placeholder="Напишите сообщение... (Ctrl+Enter для отправки)"
                        value={inputText}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        disabled={isTyping}
                    />
                    <motion.button
                        className={`chat-send-btn ${isTyping ? 'disabled' : ''}`}
                        onClick={handleSend}
                        disabled={isTyping || !inputText.trim()}
                        whileHover={!isTyping ? { scale: 1.07 } : {}}
                        whileTap={!isTyping ? { scale: 0.93 } : {}}
                        title="Отправить (Ctrl+Enter)"
                    >
                        <Send size={16} />
                    </motion.button>
                </div>
            </motion.div>
        );
    }

    // ========== Sidebar-режим (компактная правая панель) ==========
    return (
        <motion.aside
            className={`ai-chat-panel ${theme} ${collapsed ? 'collapsed' : ''}`}
            animate={{ width: collapsed ? 52 : 300 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
            {/* Шапка */}
            <div className="chat-header">
                <AnimatePresence>
                    {!collapsed && (
                        <motion.div
                            className="chat-header-info"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="chat-avatar-small"><Bot size={15} /></div>
                            <span className="chat-title">Smart Assistant</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="chat-header-btns">
                    {/* Развернуть на вкладку чата */}
                    {!collapsed && (
                        <button
                            className="chat-icon-btn"
                            onClick={onExpandToChat}
                            title="Открыть на весь экран"
                        >
                            <Maximize2 size={15} />
                        </button>
                    )}
                    {/* Свернуть / развернуть панель */}
                    <button
                        className="chat-icon-btn"
                        onClick={onToggleCollapse}
                        title={collapsed ? 'Развернуть чат' : 'Свернуть чат'}
                    >
                        <motion.span
                            animate={{ rotate: collapsed ? 180 : 0 }}
                            transition={{ duration: 0.25 }}
                            style={{ display: 'flex' }}
                        >
                            <ChevronRight size={18} />
                        </motion.span>
                    </button>
                </div>
            </div>

            {/* Сообщения */}
            <AnimatePresence>
                {!collapsed && (
                    <motion.div
                        className="chat-messages"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {messages.length === 0 && (
                            <div className="chat-welcome">
                                <div className="chat-welcome-icon"><Bot size={26} /></div>
                                <p>Привет! Я SmartStudy Assistant.</p>
                                <p className="chat-welcome-sub">
                                    Задайте вопрос или создайте задачу текстом.
                                </p>
                            </div>
                        )}
                        {messages.map(msg => (
                            <MessageBubble key={msg.id} msg={msg} />
                        ))}
                        {isTyping && (
                            <motion.div
                                className="msg-row ai"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="msg-avatar"><Bot size={14} /></div>
                                <div className="msg-bubble ai"><TypingIndicator /></div>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Поле ввода */}
            <AnimatePresence>
                {!collapsed && (
                    <motion.div
                        className="chat-input-area"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <textarea
                            ref={textareaRef}
                            className="chat-textarea"
                            placeholder="Сообщение... (Ctrl+Enter)"
                            value={inputText}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            rows={1}
                            disabled={isTyping}
                        />
                        <motion.button
                            className={`chat-send-btn ${isTyping ? 'disabled' : ''}`}
                            onClick={handleSend}
                            disabled={isTyping || !inputText.trim()}
                            whileHover={!isTyping ? { scale: 1.07 } : {}}
                            whileTap={!isTyping ? { scale: 0.93 } : {}}
                        >
                            <Send size={15} />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.aside>
    );
}

export default AIChatPanel;
