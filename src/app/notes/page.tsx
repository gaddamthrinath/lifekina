'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileText, Plus, Pin, Pencil, Trash2, Search, Tag, X, Check,
  Filter, ChevronLeft, ChevronRight, Eye, Download, Code,
  List, Type, Heading1, Heading2, Heading3, Quote, CheckSquare,
  FileCode, Clock, ArrowDownToLine, ArrowLeft, Save, ArrowLeftRight
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import { NoteItem } from '@/lib/types';

type PeriodType = 'monthly' | 'weekly' | 'quarterly' | 'yearly';
type ViewMode = 'list' | 'editor';

const NOTE_COLORS = [
  '#ffffff', '#fef9c3', '#dcfce7', '#e0f2fe', '#f3e8ff', '#ffe4e6',
];

const ITEMS_PER_PAGE = 10;

// Helper: Calculate ISO week number of a date
function getWeekNumber(date: Date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

// Helper: Check if date is in specified period
function isDateInPeriod(
  dateObj: Date,
  periodType: PeriodType,
  year: number,
  month: number,
  week: number,
  quarter: number
): boolean {
  if (isNaN(dateObj.getTime())) return false;
  if (dateObj.getFullYear() !== year) return false;

  if (periodType === 'monthly') {
    return (dateObj.getMonth() + 1) === month;
  } else if (periodType === 'weekly') {
    return getWeekNumber(dateObj) === week;
  } else if (periodType === 'quarterly') {
    const q = Math.ceil((dateObj.getMonth() + 1) / 3);
    return q === quarter;
  } else if (periodType === 'yearly') {
    return true;
  }
  return true;
}

// Notion / Obsidian Markdown Export Function
function exportNoteAsMarkdown(note: { title: string; content: string; tags?: string[]; createdAt?: number }) {
  const frontmatter = [
    '---',
    `title: "${note.title.replace(/"/g, '\\"')}"`,
    `created: ${note.createdAt ? new Date(note.createdAt).toISOString() : new Date().toISOString()}`,
    note.tags && note.tags.length > 0 ? `tags: [${note.tags.map(t => `"${t}"`).join(', ')}]` : 'tags: []',
    '---',
    '',
    `# ${note.title}`,
    '',
    note.content
  ].join('\n');

  const blob = new Blob([frontmatter], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(note.title || 'untitled-note').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Convert HTML from contentEditable back into standard Markdown text
function htmlToMarkdown(element: HTMLElement): string {
  const childNodes = Array.from(element.childNodes);
  const lines: string[] = [];

  childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim()) lines.push(text);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const txt = el.textContent || '';

      if (tag === 'pre') {
        const lang = el.getAttribute('data-lang') || '';
        // Extract raw code lines inside pre block
        const codeContent = Array.from(el.childNodes)
          .filter(n => (n as HTMLElement).tagName?.toLowerCase() !== 'div' || !(n as HTMLElement).style?.color?.includes('38bdf8'))
          .map(n => n.textContent || '')
          .join('')
          .trim();
        lines.push(`\`\`\`${lang}\n${codeContent}\n\`\`\``);
      } else if (tag === 'h1') lines.push(`# ${txt}`);
      else if (tag === 'h2') lines.push(`## ${txt}`);
      else if (tag === 'h3') lines.push(`### ${txt}`);
      else if (tag === 'blockquote') lines.push(`> ${txt}`);
      else if (tag === 'ul') {
        const lis = Array.from(el.querySelectorAll('li'));
        lis.forEach(li => lines.push(`- ${li.textContent || ''}`));
      } else if (tag === 'li') {
        lines.push(`- ${txt}`);
      } else if (tag === 'div' || tag === 'p') {
        lines.push(txt);
      } else {
        lines.push(txt);
      }
    }
  });

  return lines.join('\n');
}

// Multi-block Markdown parser to Editable HTML with Code Blocks & Math Formula rendering
function markdownToEditableHtml(mdText: string): string {
  if (!mdText) return '<div><br></div>';

  const lines = mdText.split('\n');
  const htmlParts: string[] = [];

  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];

  lines.forEach(line => {
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        const codeText = codeLines.join('\n')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        htmlParts.push(
          `<pre data-lang="${codeLang}" style="margin:12px 0;background:#0f172a;color:#e2e8f0;padding:14px 16px;border-radius:8px;font-family:monospace;font-size:13px;border:1px solid #1e293b;overflow-x:auto">` +
          (codeLang ? `<div style="font-size:11px;font-weight:700;color:#38bdf8;text-transform:uppercase;margin-bottom:6px;border-bottom:1px solid #1e293b;padding-bottom:4px">${codeLang}</div>` : '') +
          `<code>${codeText}</code></pre>`
        );
        codeLines = [];
        inCodeBlock = false;
        codeLang = '';
      } else {
        inCodeBlock = true;
        codeLang = line.trim().replace(/^```/, '').trim();
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    if (!line.trim()) {
      htmlParts.push('<div><br></div>');
      return;
    }

    let formatted = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Math formulas ($$ ... $$ and $ ... $)
    formatted = formatted.replace(/\$\$(.*?)\$\$/g, '<span style="background:#f1f5f9;padding:4px 8px;border-radius:4px;font-family:serif;font-style:italic;color:#0f172a;border:1px solid var(--border-light)">$1</span>');
    formatted = formatted.replace(/\$(.*?)\$/g, '<span style="background:#f8fafc;padding:2px 6px;border-radius:4px;font-family:serif;font-style:italic;color:#1e293b">$1</span>');

    // Inline bold, italic, code
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/`(.*?)`/g, '<code style="background:rgba(217,119,6,0.1);padding:2px 5px;border-radius:4px;color:#d97706;font-family:monospace;font-size:12.5px">$1</code>');

    if (line.startsWith('# ')) {
      htmlParts.push(`<h1 style="font-size:20px;font-weight:800;color:var(--text-main);margin:12px 0 6px;border-bottom:1px solid var(--border-light);padding-bottom:4px">${formatted.substring(2)}</h1>`);
      return;
    }
    if (line.startsWith('## ')) {
      htmlParts.push(`<h2 style="font-size:17px;font-weight:700;color:var(--text-main);margin:10px 0 4px">${formatted.substring(3)}</h2>`);
      return;
    }
    if (line.startsWith('### ')) {
      htmlParts.push(`<h3 style="font-size:15px;font-weight:700;color:var(--text-main);margin:8px 0 3px">${formatted.substring(4)}</h3>`);
      return;
    }
    if (line.startsWith('> ')) {
      htmlParts.push(`<blockquote style="border-left:3px solid var(--brand);margin:6px 0;padding:4px 10px;color:var(--text-sub);font-style:italic;background:rgba(0,0,0,0.02)">${formatted.substring(2)}</blockquote>`);
      return;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      htmlParts.push(`<div style="display:flex;gap:6px;align-items:flex-start;margin:3px 0"><span style="color:var(--brand-dark);font-weight:800">•</span><div>${formatted.substring(2)}</div></div>`);
      return;
    }

    htmlParts.push(`<div style="margin:2px 0;line-height:1.6;color:var(--text-main)">${formatted}</div>`);
  });

  return htmlParts.join('');
}

export default function NotesPage() {
  const { notes, createNote, editNote, togglePinNote, removeNote } = useApp();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentWeek = getWeekNumber(now);
  const currentQuarter = Math.ceil(currentMonth / 3);

  // Period Filter States (Dashboard aligned - Unchanged)
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [yearVal, setYearVal] = useState(currentYear);
  const [monthVal, setMonthVal] = useState(currentMonth);
  const [weekVal, setWeekVal] = useState(currentWeek);
  const [quarterVal, setQuarterVal] = useState(currentQuarter);

  // Search, Source, Tag Filter & Pagination State
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'local' | 'imported'>('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Main Page View Mode: 'list' (Table View) vs 'editor' (Full Width Page Section)
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);

  // Editor Form States
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);

  const editableRef = useRef<HTMLDivElement>(null);
  const yearsList = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Synchronize content into contenteditable element whenever opening a note or switching to editor mode
  useEffect(() => {
    if (viewMode === 'editor' && editableRef.current) {
      editableRef.current.innerHTML = markdownToEditableHtml(content);
    }
  }, [viewMode, editingNote, isReadOnlyView]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sourceFilter, tagFilter, periodType, yearVal, monthVal, weekVal, quarterVal]);

  const allNoteTags = useMemo(() => {
    const tagsSet = new Set<string>();
    notes.forEach(n => n.tags?.forEach(t => tagsSet.add(t)));
    return Array.from(tagsSet);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      // Source Filter
      if (sourceFilter === 'local' && n.syncOrigin === 'imported') return false;
      if (sourceFilter === 'imported' && n.syncOrigin !== 'imported') return false;

      const d = new Date(n.createdAt);
      if (!isDateInPeriod(d, periodType, yearVal, monthVal, weekVal, quarterVal)) {
        return false;
      }
      if (tagFilter !== 'all' && (!n.tags || !n.tags.includes(tagFilter))) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some(t => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [notes, sourceFilter, periodType, yearVal, monthVal, weekVal, quarterVal, tagFilter, search]);

  // Pagination for Notes Table
  const totalPages = Math.ceil(filteredNotes.length / ITEMS_PER_PAGE) || 1;
  const paginatedNotes = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredNotes.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredNotes, currentPage]);

  const openCreateEditor = () => {
    setEditingNote(null);
    setIsReadOnlyView(false);
    setTitle('');
    setContent('# Heading 1\n\nStart typing text directly or paste Markdown code blocks & math formulas...');
    setColor(NOTE_COLORS[0]);
    setTagsInput('');
    setViewMode('editor');
  };

  const openEditEditor = (n: NoteItem) => {
    setEditingNote(n);
    setIsReadOnlyView(false);
    setTitle(n.title);
    setContent(n.content);
    setColor(n.color ?? NOTE_COLORS[0]);
    setTagsInput(n.tags ? n.tags.join(', ') : '');
    setViewMode('editor');
  };

  const openViewEditor = (n: NoteItem) => {
    setEditingNote(n);
    setIsReadOnlyView(true);
    setTitle(n.title);
    setContent(n.content);
    setColor(n.color ?? NOTE_COLORS[0]);
    setTagsInput(n.tags ? n.tags.join(', ') : '');
    setViewMode('editor');
  };

  // Direct In-Place Live Formatting as user types
  const handleEditableInput = () => {
    if (!editableRef.current) return;
    const rawMd = htmlToMarkdown(editableRef.current);
    setContent(rawMd);
  };

  // Execute formatting command on contenteditable (e.g. Bold, Italic, Headings)
  const execFormatCommand = (cmd: string, val: string = '') => {
    if (isReadOnlyView) return;
    document.execCommand(cmd, false, val);
    handleEditableInput();
  };

  // Paste handler: Intercept pasted Markdown text and convert to formatted HTML with code blocks & math equations
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (isReadOnlyView) return;
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain');
    if (!pastedText) return;

    const formattedHtml = markdownToEditableHtml(pastedText);
    document.execCommand('insertHTML', false, formattedHtml);
    handleEditableInput();
  };

  const handleSaveNote = async () => {
    let finalContent = content;
    if (editableRef.current) {
      finalContent = htmlToMarkdown(editableRef.current);
    }
    if (!finalContent.trim()) return;
    setSaving(true);

    // Auto-extract note title from the first heading or first line of note content
    const firstLine = finalContent.split('\n').find(l => l.trim().length > 0) || 'Untitled Note';
    const derivedTitle = firstLine.replace(/^[#*`>-\s\d.]+/g, '').trim() || 'Untitled Note';

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    try {
      if (editingNote) {
        await editNote({
          ...editingNote,
          title: derivedTitle,
          content: finalContent.trim(),
          tags,
          color,
          updatedAt: Date.now(),
        });
      } else {
        await createNote({
          title: derivedTitle,
          content: finalContent.trim(),
          tags,
          color,
          isPinned: false,
        });
      }
      setViewMode('list');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (ts: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div style={{ width: '100%', minHeight: viewMode === 'editor' ? '100%' : 'calc(100vh - 80px)' }}>
      {/* FULL PAGE WYSIWYG LIVE EDITOR & READER VIEW (Spans 100% Full Width & Height) */}
      {viewMode === 'editor' ? (
        <div className="notes-editor-full">
          {/* Top Page Action Bar */}
          <div className="notes-editor-header">
            <div className="notes-editor-nav-left">
              <button className="btn btn-outline btn-sm" onClick={() => setViewMode('list')} style={{ padding: '6px 12px', borderRadius: 6, gap: 6 }}>
                <ArrowLeft size={15} /> Back to Notes List
              </button>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-heading)' }}>
                <FileCode size={18} color="var(--brand-dark)" />
                <span>{isReadOnlyView ? 'View Note' : editingNote ? 'Edit Note' : 'New Note'}</span>
              </div>
            </div>

            <div className="notes-editor-actions">
              {/* Inline Tags Input */}
              <div className="notes-editor-tags-wrap">
                <Tag size={14} color="var(--text-muted)" />
                <input
                  type="text"
                  className="fi"
                  placeholder="Tags (e.g. Work, Ideas)"
                  value={tagsInput}
                  readOnly={isReadOnlyView}
                  onChange={e => setTagsInput(e.target.value)}
                  style={{ fontSize: 12, height: 32, borderRadius: 6 }}
                />
              </div>

              {isReadOnlyView ? (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setIsReadOnlyView(false)}
                  style={{ gap: 6, borderRadius: 6 }}
                >
                  <Pencil size={14} /> Edit
                </button>
              ) : null}

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => exportNoteAsMarkdown({ title: title || 'untitled', content: editableRef.current ? htmlToMarkdown(editableRef.current) : content, tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean) })}
                style={{ gap: 6, borderRadius: 6 }}
              >
                <ArrowDownToLine size={14} /> Export .md
              </button>

              {!isReadOnlyView && (
                <button className="btn btn-primary btn-sm" onClick={handleSaveNote} disabled={saving} style={{ gap: 6, padding: '6px 16px', borderRadius: 6 }}>
                  <Save size={14} /> {saving ? 'Saving...' : 'Save Document'}
                </button>
              )}
            </div>
          </div>

          {/* Formatting Toolbar */}
          {!isReadOnlyView && (
            <div className="notes-editor-toolbar">
              <button type="button" className="ibtn" onClick={() => execFormatCommand('formatBlock', '<h1>')} title="Heading 1"><Heading1 size={15} /></button>
              <button type="button" className="ibtn" onClick={() => execFormatCommand('formatBlock', '<h2>')} title="Heading 2"><Heading2 size={15} /></button>
              <button type="button" className="ibtn" onClick={() => execFormatCommand('formatBlock', '<h3>')} title="Heading 3"><Heading3 size={15} /></button>
              <div style={{ width: 1, height: 16, background: 'var(--border-light)', margin: '0 4px' }} />
              <button type="button" className="ibtn" onClick={() => execFormatCommand('bold')} title="Bold"><Type size={15} style={{ fontWeight: 800 }} /></button>
              <button type="button" className="ibtn" onClick={() => execFormatCommand('italic')} title="Italic"><em style={{ fontSize: 13, fontWeight: 700 }}>I</em></button>
              <div style={{ width: 1, height: 16, background: 'var(--border-light)', margin: '0 4px' }} />
              <button type="button" className="ibtn" onClick={() => execFormatCommand('insertUnorderedList')} title="Bullet List"><List size={15} /></button>
              <button type="button" className="ibtn" onClick={() => execFormatCommand('formatBlock', '<blockquote>')} title="Blockquote"><Quote size={15} /></button>
            </div>
          )}

          {/* Scrollable Full-Height Writing Surface */}
          <div className="notes-editor-scroll-area">
            <div className="notes-editor-canvas">
              <div
                ref={editableRef}
                className="notes-editor-content"
                contentEditable={!isReadOnlyView}
                suppressContentEditableWarning
                onInput={handleEditableInput}
                onPaste={handlePaste}
              />
            </div>
          </div>
        </div>
      ) : (
        /* TABLE & CARDS LIST VIEW FOR VAULT NOTES */
        <div style={{ width: '100%' }}>
          {/* Page Header */}
          <div className="pg-header" style={{ marginBottom: 16 }}>
            <div>
              <h1 className="pg-title" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileCode size={22} color="var(--brand-dark)" /> Personal Notes
              </h1>
            </div>
            <button className="btn btn-primary" onClick={openCreateEditor} style={{ borderRadius: 6 }}>
              <Plus size={16} /> New Note Page
            </button>
          </div>

          {/* Unified Filters Card */}
          <div className="filter-bar-card">
            {/* Row 1: Period Selection */}
            <div className="filter-bar-row">
              <div className="filter-bar-group">
                <span className="filter-control-label">
                  <Filter size={13} /> Period:
                </span>
                <div className="period-segmented-wrap">
                  {[
                    { key: 'monthly', label: 'Monthly' },
                    { key: 'weekly', label: 'Weekly' },
                    { key: 'quarterly', label: 'Quarterly' },
                    { key: 'yearly', label: 'Yearly' },
                  ].map(p => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPeriodType(p.key as PeriodType)}
                      className={`period-pill-btn ${periodType === p.key ? 'active' : ''}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-bar-group">
                {/* Year Selector */}
                <div className="filter-control-wrap">
                  <span className="filter-control-label">Year:</span>
                  <select
                    className="filter-control-select"
                    value={yearVal}
                    onChange={e => setYearVal(Number(e.target.value))}
                  >
                    {yearsList.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Month Selector */}
                {periodType === 'monthly' && (
                  <div className="filter-control-wrap">
                    <span className="filter-control-label">Month:</span>
                    <select
                      className="filter-control-select"
                      value={monthVal}
                      onChange={e => setMonthVal(Number(e.target.value))}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>
                          {new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'short' })}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Week Selector */}
                {periodType === 'weekly' && (
                  <div className="filter-control-wrap">
                    <span className="filter-control-label">Week:</span>
                    <select
                      className="filter-control-select"
                      value={weekVal}
                      onChange={e => setWeekVal(Number(e.target.value))}
                    >
                      {Array.from({ length: 52 }, (_, i) => i + 1).map(w => (
                        <option key={w} value={w}>Week {w}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Quarter Selector */}
                {periodType === 'quarterly' && (
                  <div className="filter-control-wrap">
                    <span className="filter-control-label">Quarter:</span>
                    <select
                      className="filter-control-select"
                      value={quarterVal}
                      onChange={e => setQuarterVal(Number(e.target.value))}
                    >
                      <option value={1}>Q1 (Jan-Mar)</option>
                      <option value={2}>Q2 (Apr-Jun)</option>
                      <option value={3}>Q3 (Jul-Sep)</option>
                      <option value={4}>Q4 (Oct-Dec)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="filter-bar-divider" />

            {/* Row 2: Search, Source & Tags */}
            <div className="filter-bar-row">
              <div className="filter-search-box">
                <Search size={15} className="search-ico" />
                <input
                  type="text"
                  className="filter-search-input"
                  placeholder="Search notes by title, markdown content, or tags..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <div className="filter-bar-group">
                {/* Source Filter */}
                <select
                  id="notes-source-filter"
                  className="filter-select-standalone"
                  style={{ minWidth: 165 }}
                  value={sourceFilter}
                  onChange={e => setSourceFilter(e.target.value as 'all' | 'local' | 'imported')}
                >
                  <option value="all">Source: All Records</option>
                  <option value="local">Created on this device</option>
                  <option value="imported">Synced from another device</option>
                </select>

                {/* Tag Filter */}
                <select
                  className="filter-select-standalone"
                  value={tagFilter}
                  onChange={e => setTagFilter(e.target.value)}
                  style={{ minWidth: 130 }}
                >
                  <option value="all">All Tags ({notes.length})</option>
                  {allNoteTags.map(t => (
                    <option key={t} value={t}>#{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* LIST VIEW (TABLE ON DESKTOP, COMFORTABLE CARDS ON MOBILE/TABLET) */}
          {filteredNotes.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<FileText size={24} />}
                title={search || sourceFilter !== 'all' || tagFilter !== 'all' ? 'No notes match your filters' : 'No notes found for selected period'}
                description={search || sourceFilter !== 'all' || tagFilter !== 'all' ? 'Try adjusting your search query, source, or tag filter.' : 'Click "+ New Note Page" above to create your first markdown document.'}
                action={
                  !search && sourceFilter === 'all' && tagFilter === 'all' ? (
                    <button className="btn btn-primary" onClick={openCreateEditor}>
                      <Plus size={15} /> New Note Page
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Desktop Table View (>= 769px) */}
              <div className="desktop-notes-table" style={{ overflowX: 'auto' }}>
                <table className="tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-light)' }}>
                      <th style={{ width: 40, padding: '12px 16px', textAlign: 'center' }}>Pin</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Title &amp; Snippet</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', width: 160 }}>Tags</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', width: 120 }}>Date Created</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', width: 130 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedNotes.map((n, idx) => {
                      const isSynced = n.syncOrigin === 'imported';

                      return (
                        <tr
                          key={n.id}
                          className={idx % 2 === 1 ? 'tbl-row-striped' : ''}
                          style={{ borderBottom: '1px solid var(--border-light)' }}
                        >
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button className="ibtn" onClick={() => togglePinNote(n.id)} title={n.isPinned ? 'Unpin Note' : 'Pin Note'}>
                              <Pin size={14} color={n.isPinned ? 'var(--brand-dark)' : 'var(--text-light)'} fill={n.isPinned ? 'var(--brand-dark)' : 'none'} />
                            </button>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span>{n.title}</span>
                              {isSynced && (
                                <span
                                  title="Synced from another device"
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    background: 'var(--brand-light)',
                                    color: 'var(--brand-dark)',
                                    padding: '1px 6px',
                                    borderRadius: 'var(--r-full)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                  }}
                                >
                                  <ArrowLeftRight size={10} /> Synced
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {n.content.replace(/[#*`>-]/g, '').trim()}
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            {n.tags && n.tags.length > 0 ? (
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {n.tags.map(t => (
                                  <span key={t} style={{ fontSize: 10.5, fontWeight: 700, background: '#f1f5f9', color: 'var(--brand-dark)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border-light)' }}>
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--text-light)' }}>—</span>
                            )}
                          </td>

                          <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {formatDate(n.createdAt)}
                          </td>

                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                              <button className="ibtn" onClick={() => exportNoteAsMarkdown(n)} title="Export .md File">
                                <Download size={14} color="var(--brand-dark)" />
                              </button>
                              <button className="ibtn" onClick={() => openViewEditor(n)} title="View Note Page">
                                <Eye size={14} />
                              </button>
                              <button className="ibtn" onClick={() => openEditEditor(n)} title="Edit Note Page">
                                <Pencil size={14} />
                              </button>
                              <button className="ibtn" style={{ color: '#dc2626' }} onClick={() => setDelId(n.id)} title="Delete Note">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile & Tablet Card Grid View (<= 768px) */}
              <div className="mobile-notes-cards" style={{ padding: '14px' }}>
                <div className="notes-card-grid">
                  {paginatedNotes.map(n => {
                    const isSynced = n.syncOrigin === 'imported';

                    return (
                      <div key={n.id} className="note-card-item">
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-main)' }}>
                              {n.title}
                            </span>
                            {isSynced && (
                              <span
                                title="Synced from another device"
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  background: 'var(--brand-light)',
                                  color: 'var(--brand-dark)',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--r-full)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                }}
                              >
                                <ArrowLeftRight size={10} /> Synced
                              </span>
                            )}
                          </div>
                          <button
                            className="ibtn"
                            onClick={() => togglePinNote(n.id)}
                            title={n.isPinned ? 'Unpin Note' : 'Pin Note'}
                            style={{ padding: 4, flexShrink: 0 }}
                          >
                            <Pin
                              size={15}
                              color={n.isPinned ? 'var(--brand-dark)' : 'var(--text-light)'}
                              fill={n.isPinned ? 'var(--brand-dark)' : 'none'}
                            />
                          </button>
                        </div>

                        <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '2px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {n.content.replace(/[#*`>-]/g, '').trim() || 'No additional content'}
                        </p>

                        {n.tags && n.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>
                            {n.tags.map(t => (
                              <span key={t} style={{ fontSize: 10.5, fontWeight: 700, background: '#f1f5f9', color: 'var(--brand-dark)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border-light)' }}>
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: 8, marginTop: 4 }}>
                          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                            {formatDate(n.createdAt)}
                          </span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="ibtn" onClick={() => exportNoteAsMarkdown(n)} title="Export .md File" style={{ padding: 4 }}>
                              <Download size={14} color="var(--brand-dark)" />
                            </button>
                            <button className="ibtn" onClick={() => openViewEditor(n)} title="View Note Page" style={{ padding: 4 }}>
                              <Eye size={14} />
                            </button>
                            <button className="ibtn" onClick={() => openEditEditor(n)} title="Edit Note Page" style={{ padding: 4 }}>
                              <Pencil size={14} />
                            </button>
                            <button className="ibtn" style={{ color: '#dc2626', padding: 4 }} onClick={() => setDelId(n.id)} title="Delete Note">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Table Pagination Footer */}
              <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 }}>
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredNotes.length)} of {filteredNotes.length} notes
                </div>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{ padding: '4px 8px', fontSize: 12 }}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          border: `1px solid ${currentPage === p ? 'var(--brand-dark)' : 'var(--border-light)'}`,
                          background: currentPage === p ? 'var(--brand-dark)' : '#ffffff',
                          color: currentPage === p ? '#ffffff' : 'var(--text-sub)',
                          cursor: 'pointer',
                        }}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{ padding: '4px 8px', fontSize: 12 }}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      {delId && (
        <ConfirmDialog
          title="Delete vault note"
          description="Are you sure you want to delete this vault note? This action cannot be undone."
          confirmLabel="Delete Note"
          onConfirm={async () => { await removeNote(delId); setDelId(null); }}
          onCancel={() => setDelId(null)}
        />
      )}
    </div>
  );
}
