import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import TagInput from './TagInput';
import './TaskModal.css';

/**
 * TaskModal — универсальное модальное окно для создания и редактирования задач.
 *
 * Props:
 *  - task        {object|null}  — задача для редактирования; null = создание новой
 *  - onSave      {fn}          — колбэк(taskData): вызывается при сохранении
 *  - onClose     {fn}          — колбэк закрытия модала
 *  - allTags     {string[]}    — все существующие теги (для подсказок TagInput)
 *  - theme       {'dark'|'light'}
 */
function TaskModal({ task, onSave, onClose, allTags = [], theme = 'dark' }) {
    const isEdit = Boolean(task);

    // ---- Поля формы ----
    const [title,    setTitle]    = useState(task?.title    ?? '');
    const [desc,     setDesc]     = useState(task?.description ?? '');
    const [tags,     setTags]     = useState(
        task ? (Array.isArray(task.tags) ? task.tags : (task.tag ? [task.tag] : [])) : []
    );
    const [deadline, setDeadline] = useState(task?.deadline ?? '');

    // ---- Ошибки ----
    const [errors, setErrors] = useState({});

    // Сбрасываем форму при смене задачи
    useEffect(() => {
        setTitle(task?.title ?? '');
        setDesc(task?.description ?? '');
        setTags(task ? (Array.isArray(task.tags) ? task.tags : (task.tag ? [task.tag] : [])) : []);
        setDeadline(task?.deadline ?? '');
        setErrors({});
    }, [task]);

    // Закрытие по Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    /** Валидация и сохранение */
    const handleSave = () => {
        const newErrors = {};

        const trimTitle = title.trim();
        if (trimTitle.length < 1)   newErrors.title = 'Заголовок обязателен (минимум 1 символ)';
        if (trimTitle.length > 100) newErrors.title = 'Заголовок не может быть длиннее 100 символов';

        const trimDesc = desc.trim();
        if (trimDesc.length > 1000) newErrors.desc = 'Описание не может быть длиннее 1000 символов';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSave({
            ...(task ?? {}),                   // сохраняем id, created_at, etc. при редактировании
            title:       trimTitle,
            description: trimDesc,
            tags,                              // массив тегов
            tag:         tags[0] ?? 'Без тега', // legacy-поле для совместимости с TodoList
            deadline:    deadline || null,
        });
        onClose();
    };

    return (
        <AnimatePresence>
            {/* Затемнение фона */}
            <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                onClick={onClose}
            >
                {/* Само окно — клик внутри не закрывает */}
                <motion.div
                    className={`task-modal ${theme}`}
                    initial={{ opacity: 0, scale: 0.93, y: 24 }}
                    animate={{ opacity: 1, scale: 1,    y: 0  }}
                    exit={{ opacity: 0, scale: 0.93, y: 24 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* ---- Заголовок модала ---- */}
                    <div className="modal-header">
                        <h3 className="modal-title">
                            {isEdit ? 'Редактировать задачу' : 'Новая задача'}
                        </h3>
                        <button className="modal-close" onClick={onClose} title="Закрыть">
                            <X size={18} />
                        </button>
                    </div>

                    {/* ---- Тело формы ---- */}
                    <div className="modal-body">

                        {/* Заголовок задачи */}
                        <div className="field-group">
                            <label className="field-label">
                                Заголовок <span className="field-required">*</span>
                            </label>
                            <input
                                className={`field-input ${errors.title ? 'error' : ''}`}
                                placeholder="Название задачи (до 100 символов)"
                                value={title}
                                onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: '' })); }}
                                maxLength={100}
                                autoFocus
                            />
                            <div className="field-footer">
                                {errors.title
                                    ? <span className="field-error">{errors.title}</span>
                                    : <span className="field-hint">{title.length}/100</span>
                                }
                            </div>
                        </div>

                        {/* Описание */}
                        <div className="field-group">
                            <label className="field-label">Описание</label>
                            <textarea
                                className={`field-textarea ${errors.desc ? 'error' : ''}`}
                                placeholder="Подробное описание (необязательно, до 1000 символов)"
                                value={desc}
                                onChange={e => { setDesc(e.target.value); setErrors(p => ({ ...p, desc: '' })); }}
                                maxLength={1000}
                                rows={3}
                            />
                            <div className="field-footer">
                                {errors.desc
                                    ? <span className="field-error">{errors.desc}</span>
                                    : <span className="field-hint">{desc.length}/1000</span>
                                }
                            </div>
                        </div>

                        {/* Дедлайн */}
                        <div className="field-group">
                            <label className="field-label">Дедлайн</label>
                            <input
                                type="datetime-local"
                                className="field-input"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                            />
                        </div>

                        {/* Теги */}
                        <div className="field-group">
                            <label className="field-label">Теги</label>
                            <TagInput
                                tags={tags}
                                onChange={setTags}
                                suggestions={allTags}
                                theme={theme}
                            />
                        </div>
                    </div>

                    {/* ---- Кнопки действий ---- */}
                    <div className="modal-footer">
                        <button className="modal-btn cancel" onClick={onClose}>
                            <X size={15} /> Отмена
                        </button>
                        <button className="modal-btn save" onClick={handleSave}>
                            <Check size={15} /> {isEdit ? 'Сохранить' : 'Создать'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default TaskModal;
