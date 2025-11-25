import React, { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { api, API_HOST } from '../utils/api';

const ResizableImageComponent = (props) => {
    const imgRef = useRef(null);
    const draggingRef = useRef(false);
    const startXRef = useRef(0);
    const startWidthRef = useRef(0);

    const handleMouseDown = (e) => {
        e.preventDefault();
        draggingRef.current = true;
        startXRef.current = e.clientX;
        startWidthRef.current = imgRef.current ? imgRef.current.offsetWidth : 0;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (!draggingRef.current) return;
        const delta = e.clientX - startXRef.current;
        const next = Math.max(80, startWidthRef.current + delta);
        props.updateAttributes({ width: `${next}px` });
    };

    const handleMouseUp = () => {
        draggingRef.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    return (
        <NodeViewWrapper className={`tiptap-image-node ${props.selected ? 'selected' : ''}`} style={{ display: 'inline-block', position: 'relative' }}>
            <img
                ref={imgRef}
                src={props.node.attrs.src}
                alt={props.node.attrs.alt || ''}
                style={{ width: props.node.attrs.width || 'auto', height: 'auto', maxWidth: '100%', display: 'inline-block' }}
            />
            <span
                onMouseDown={handleMouseDown}
                style={{ position: 'absolute', right: 0, bottom: 0, width: '10px', height: '10px', background: 'var(--primary-color)', cursor: 'nwse-resize', borderRadius: '2px' }}
            />
        </NodeViewWrapper>
    );
};

const ResizableImage = Image.extend({
    addAttributes() {
        const base = typeof this.parent === 'function' ? this.parent() : {};
        return {
            ...base,
            width: {
                default: null,
                parseHTML: element => {
                    const styleW = element.style?.width || '';
                    const attrW = element.getAttribute('width');
                    if (styleW) return styleW;
                    if (attrW) return `${attrW}${/\d$/.test(attrW) ? 'px' : ''}`;
                    return null;
                },
                renderHTML: attrs => ({ style: attrs.width ? `width: ${attrs.width}; height: auto;` : 'height: auto;' })
            }
        };
    },
    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageComponent);
    }
});

const HtmlEditor = ({ value = '', onChange, disabled = false }) => {
    const fileInputRef = useRef(null);
    const [formulaOpen, setFormulaOpen] = useState(false);
    const [formulaText, setFormulaText] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined' && !window.MathJax) {
            window.MathJax = {
                tex: {
                    inlineMath: [['$', '$'], ['\\(', '\\)']],
                    displayMath: [['$$', '$$'], ['\\[', '\\]']]
                },
                options: {
                    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
                }
            };
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
            script.async = true;
            script.onload = () => {
                if (window.MathJax && window.MathJax.typesetPromise) {
                    window.MathJax.typesetPromise();
                }
            };
            document.head.appendChild(script);
        }
    }, []);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({ openOnClick: true }),
            ResizableImage,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            TextStyle,
            Color
        ],
        content: value || '',
        editable: !disabled,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onChange && onChange(html);
            if (window.MathJax && window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise();
            }
        }
    });

    useEffect(() => {
        if (!editor) return;
        if ((value || '') !== editor.getHTML()) {
            editor.commands.setContent(value || '', false);
        }
    }, [value, editor]);

    const insertImage = () => fileInputRef.current?.click();
    const onFileChange = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !editor) return;
        try {
            const res = await api.uploadImage(file);
            const full = `${API_HOST}${res.url}`;
            editor.chain().focus().setImage({ src: full, alt: 'image', width: '400px' }).run();
        } catch { /* noop */ }
    };

    const insertFormula = () => {
        setFormulaOpen(true);
    };

    const applyFormula = () => {
        if (!editor) return;
        const tex = (formulaText || '').trim();
        if (!tex) return;
        editor.chain().focus().insertContent(`\\(${tex}\\)`).run();
        setFormulaText('');
        setFormulaOpen(false);
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise();
        }
    };

    const adjustImageWidth = (delta) => {
        if (!editor) return;
        const attrs = editor.getAttributes('image');
        let w = attrs.width || '';
        let n = parseInt(String(w).replace(/[^0-9]/g, '')) || 400;
        n = Math.max(80, n + delta);
        editor.chain().focus().updateAttributes('image', { width: `${n}px` }).run();
    };

    const setImageWidthPercent = (percent) => {
        if (!editor) return;
        const p = Math.max(10, Math.min(100, percent));
        editor.chain().focus().updateAttributes('image', { width: `${p}%` }).run();
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" className="icon-btn" onClick={() => editor?.chain().focus().toggleBold().run()} disabled={disabled}>B</button>
                <button type="button" className="icon-btn" onClick={() => editor?.chain().focus().toggleItalic().run()} disabled={disabled}><span style={{ fontStyle: 'italic' }}>I</span></button>
                <button type="button" className="icon-btn" onClick={() => editor?.chain().focus().toggleUnderline().run()} disabled={disabled}><span style={{ textDecoration: 'underline' }}>U</span></button>
                <span style={{ width: '1px', height: '20px', background: 'var(--border-color)' }} />
                <button type="button" className="icon-btn" onClick={() => editor?.chain().focus().toggleOrderedList().run()} disabled={disabled}>1. 2. 3.</button>
                <button type="button" className="icon-btn" onClick={() => editor?.chain().focus().toggleBulletList().run()} disabled={disabled}>• • •</button>
                <span style={{ width: '1px', height: '20px', background: 'var(--border-color)' }} />
                <button type="button" className="icon-btn" onClick={() => editor?.chain().focus().setTextAlign('left').run()} disabled={disabled}>↤</button>
                <button type="button" className="icon-btn" onClick={() => editor?.chain().focus().setTextAlign('center').run()} disabled={disabled}>↔︎</button>
                <button type="button" className="icon-btn" onClick={() => editor?.chain().focus().setTextAlign('right').run()} disabled={disabled}>↦</button>
                <span style={{ width: '1px', height: '20px', background: 'var(--border-color)' }} />
                <button type="button" className="icon-btn" onClick={insertImage} disabled={disabled}>🖼️</button>
                <button type="button" className="icon-btn" onClick={() => adjustImageWidth(-40)} disabled={disabled || !editor?.isActive('image')}>−</button>
                <button type="button" className="icon-btn" onClick={() => adjustImageWidth(40)} disabled={disabled || !editor?.isActive('image')}>＋</button>
                <button type="button" className="icon-btn" onClick={() => setImageWidthPercent(100)} disabled={disabled || !editor?.isActive('image')}>100%</button>
                <button type="button" className="icon-btn" onClick={insertFormula} disabled={disabled}>∑</button>
                <button type="button" className="icon-btn" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} disabled={disabled}>{'</>'}</button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
            </div>
            {formulaOpen && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <input
                        type="text"
                        value={formulaText}
                        onChange={(e) => setFormulaText(e.target.value)}
                        placeholder="TeX"
                        disabled={disabled}
                        style={{ flex: 1 }}
                    />
                    <button type="button" className="icon-btn" onClick={applyFormula} disabled={disabled}>Chèn</button>
                    <button type="button" className="icon-btn" onClick={() => { setFormulaText(''); setFormulaOpen(false); }} disabled={disabled}>Đóng</button>
                </div>
            )}
            <EditorContent editor={editor} style={{ minHeight: '380px' }} />
            <style>{`
                .tiptap {
                    font-size: 16px;
                    line-height: 1.6;
                }
                .tiptap p { margin: 0 0 0.75rem; }
                .tiptap img { max-width: 100%; height: auto; display: inline-block; }
                .tiptap-image-node.selected { outline: 2px solid var(--primary-color); }
                .icon-btn { padding: 6px 8px; }
            `}</style>
        </div>
    );
};

export default HtmlEditor;
