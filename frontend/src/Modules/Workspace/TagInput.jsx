import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag } from 'lucide-react';
import './TagInput.css';

/**
 * TagInput — интеллектуальное поле ввода тегов (Combobox).
 *
 * Props:
 *  - tags        {string[]}  — текущие выбранные теги
 *  - onChange    {fn}        — колбэк при изменении массива тегов
 *  - suggestions {string[]}  — список подсказок (существующие теги)
 *  - theme       {'dark'|'light'}
 */
function TagInput({ tags = [], onChange, suggestions = [], theme = 'dark' }) {
    const [inputVal, setInputVal]     = useState('');
    const [showDrop, setShowDrop]     = useState(false);
    const inputRef                    = useRef(null);
    const containerRef                = useRef(null);

    // Фильтруем подсказки: совпадение с вводом + ещё не добавлены
    const filtered = suggestions.filter(
        s => s.toLowerCase().includes(inputVal.toLowerCase()) && !tags.includes(s)
    );

    /** Добавить тег */
    const addTag = (value) => {
        const trimmed = value.trim();
        if (!trimmed || tags.includes(trimmed)) return;
        onChange([...tags, trimmed]);
        setInputVal('');
        setShowDrop(false);
        inputRef.current?.focus();
    };

    /** Удалить тег */
    const removeTag = (tag) => {
        onChange(tags.filter(t => t !== tag));
    };

    /** Обработка клавиш: Enter добавляет, Backspace удаляет последний при пустом поле */
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (inputVal.trim()) addTag(inputVal);
            else if (filtered.length > 0) addTag(filtered[0]);
        }
        if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
        if (e.key === 'Escape') {
            setShowDrop(false);
        }
    };

    // Закрыть дропдаун при клике вне компонента
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setShowDrop(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className={`tag-input-wrap ${theme}`} ref={containerRef}>
            {/* Баблы выбранных тегов */}
            <div className="tag-bubbles-row">
                <AnimatePresence>
                    {tags.map(tag => (
                        <motion.span
                            key={tag}
                            className="tag-bubble"
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.7, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                        >
                            <Tag size={11} />
                            {tag}
                            {/* Кнопка удаления тега */}
                            <button
                                type="button"
                                className="tag-remove"
                                onClick={() => removeTag(tag)}
                                title={`Удалить тег «${tag}»`}
                            >
                                <X size={11} />
                            </button>
                        </motion.span>
                    ))}
                </AnimatePresence>

                {/* Поле ввода нового тега */}
                <input
                    ref={inputRef}
                    className="tag-text-input"
                    placeholder={tags.length === 0 ? 'Добавить тег...' : ''}
                    value={inputVal}
                    onChange={e => {
                        setInputVal(e.target.value);
                        setShowDrop(true);
                    }}
                    onFocus={() => setShowDrop(true)}
                    onKeyDown={handleKeyDown}
                />
            </div>

            {/* Дропдаун с подсказками */}
            <AnimatePresence>
                {showDrop && (filtered.length > 0 || inputVal.trim()) && (
                    <motion.ul
                        className="tag-dropdown"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.16 }}
                    >
                        {/* Существующие теги */}
                        {filtered.map(s => (
                            <li
                                key={s}
                                className="tag-option"
                                onMouseDown={() => addTag(s)}
                            >
                                <Tag size={12} /> {s}
                            </li>
                        ))}

                        {/* Опция создать новый тег */}
                        {inputVal.trim() && !suggestions.includes(inputVal.trim()) && (
                            <li
                                className="tag-option tag-option-new"
                                onMouseDown={() => addTag(inputVal)}
                            >
                                + Создать «{inputVal.trim()}»
                            </li>
                        )}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
}

export default TagInput;
