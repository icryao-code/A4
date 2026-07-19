"use client";

import { Check, CloudUpload, Download, FileText, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Idiom, IdiomStatus, Question, QuestionStatus } from "../lib/types";
import { CSV_HEADERS } from "../lib/csv";
import { PageHeader } from "./study-pages";

type BulkQuestionUpdate = Partial<Pick<Question, "status" | "difficulty">>;
type BulkIdiomUpdate = Partial<Pick<Idiom, "reviewStatus" | "category" | "status">>;
const PAGE_SIZE = 25;

function statusLabel(status: QuestionStatus | IdiomStatus) {
  return status === "published" ? "已发布" : status === "draft" ? "草稿" : "已下架";
}

function Pagination({ page, pageCount, total, onChange }: { page: number; pageCount: number; total: number; onChange: (page: number) => void }) {
  if (pageCount <= 1) return null;
  return <div className="pagination"><span>共 {total} 条 · 第 {page} / {pageCount} 页</span><div><button className="secondary-button compact" disabled={page <= 1} onClick={() => onChange(page - 1)}>上一页</button><button className="secondary-button compact" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>下一页</button></div></div>;
}

export function AdminPage({ questions, idioms, questionSearch, setQuestionSearch, idiomSearch, setIdiomSearch, filter, setFilter, questionCategory, setQuestionCategory, idiomCategory, setIdiomCategory, idiomReviewFilter, setIdiomReviewFilter, idiomStatusFilter, setIdiomStatusFilter, setDraft, idiomDraft, setIdiomDraft, importRef, importCsv, idiomImportRef, importIdiomsCsv, onBatchQuestionUpdate, onBatchQuestionDelete, onBatchIdiomUpdate, onBatchIdiomDelete, onExport, onDownloadTemplate }: {
  questions: Question[];
  idioms: Idiom[];
  questionSearch: string;
  setQuestionSearch: (value: string) => void;
  idiomSearch: string;
  setIdiomSearch: (value: string) => void;
  filter: "all" | QuestionStatus;
  setFilter: (value: "all" | QuestionStatus) => void;
  questionCategory: "all" | "基础" | "进阶";
  setQuestionCategory: (value: "all" | "基础" | "进阶") => void;
  idiomCategory: string;
  setIdiomCategory: (value: string) => void;
  idiomReviewFilter: "all" | "待校审" | "已校审";
  setIdiomReviewFilter: (value: "all" | "待校审" | "已校审") => void;
  idiomStatusFilter: "all" | IdiomStatus;
  setIdiomStatusFilter: (value: "all" | IdiomStatus) => void;
  setDraft: (question: Question | null) => void;
  idiomDraft: Idiom | null;
  setIdiomDraft: (idiom: Idiom | null) => void;
  importRef: React.RefObject<HTMLInputElement | null>;
  importCsv: (event: ChangeEvent<HTMLInputElement>) => void;
  idiomImportRef: React.RefObject<HTMLInputElement | null>;
  importIdiomsCsv: (event: ChangeEvent<HTMLInputElement>) => void;
  onBatchQuestionUpdate: (ids: string[], updates: BulkQuestionUpdate) => void;
  onBatchQuestionDelete: (ids: string[]) => void;
  onBatchIdiomUpdate: (ids: string[], updates: BulkIdiomUpdate) => void;
  onBatchIdiomDelete: (ids: string[]) => void;
  onExport: () => void;
  onDownloadTemplate: () => void;
}) {
  const [section, setSection] = useState<"questions" | "idioms">("questions");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [selectedIdiomIds, setSelectedIdiomIds] = useState<string[]>([]);
  const [questionPage, setQuestionPage] = useState(1);
  const [idiomPage, setIdiomPage] = useState(1);

  const visibleQuestions = useMemo(() => questions.filter((question) => (filter === "all" || question.status === filter) && (questionCategory === "all" || question.difficulty === questionCategory) && (!questionSearch || question.stem.includes(questionSearch) || question.source.includes(questionSearch) || question.sourceRef.includes(questionSearch) || question.contentStatus.includes(questionSearch))), [questions, filter, questionCategory, questionSearch]);
  const idiomCategories = useMemo(() => Array.from(new Set(idioms.map((idiom) => idiom.category).filter(Boolean))).sort(), [idioms]);
  const visibleIdioms = useMemo(() => idioms.filter((idiom) => (idiomCategory === "全部" || idiom.category === idiomCategory) && (idiomReviewFilter === "all" || idiom.reviewStatus === idiomReviewFilter) && (idiomStatusFilter === "all" || idiom.status === idiomStatusFilter) && (!idiomSearch || idiom.name.includes(idiomSearch) || idiom.pinyin.includes(idiomSearch) || idiom.meaning.includes(idiomSearch) || idiom.sourceRef.includes(idiomSearch))), [idioms, idiomCategory, idiomReviewFilter, idiomStatusFilter, idiomSearch]);
  const selectedVisibleQuestions = visibleQuestions.filter((question) => selectedQuestionIds.includes(question.id));
  const selectedVisibleIdioms = visibleIdioms.filter((idiom) => selectedIdiomIds.includes(idiom.id));
  const questionPageCount = Math.max(1, Math.ceil(visibleQuestions.length / PAGE_SIZE));
  const idiomPageCount = Math.max(1, Math.ceil(visibleIdioms.length / PAGE_SIZE));
  const currentQuestionPage = Math.min(questionPage, questionPageCount);
  const currentIdiomPage = Math.min(idiomPage, idiomPageCount);
  const pagedQuestions = visibleQuestions.slice((currentQuestionPage - 1) * PAGE_SIZE, currentQuestionPage * PAGE_SIZE);
  const pagedIdioms = visibleIdioms.slice((currentIdiomPage - 1) * PAGE_SIZE, currentIdiomPage * PAGE_SIZE);
  const allQuestionsSelected = pagedQuestions.length > 0 && pagedQuestions.every((question) => selectedQuestionIds.includes(question.id));
  const allIdiomsSelected = pagedIdioms.length > 0 && pagedIdioms.every((idiom) => selectedIdiomIds.includes(idiom.id));

  const newQuestion = () => setDraft({ id: `question-${Date.now()}`, stem: "", options: ["", "", "", ""], answer: 0, explanation: "", source: "后台新增", sourceRef: "待补充来源说明", difficulty: "基础", status: "draft", contentStatus: "curated" });
  const newIdiom = () => setIdiomDraft({ id: `idiom-${Date.now()}`, name: "", pinyin: "", meaning: "", example: "", category: "待分类", sourceRef: "待补充来源说明", reviewStatus: "待校审", status: "draft" });
  const toggleQuestion = (id: string) => setSelectedQuestionIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleIdiom = (id: string) => setSelectedIdiomIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleAllQuestions = () => setSelectedQuestionIds((current) => allQuestionsSelected ? current.filter((id) => !pagedQuestions.some((question) => question.id === id)) : Array.from(new Set([...current, ...pagedQuestions.map((question) => question.id)])));
  const toggleAllIdioms = () => setSelectedIdiomIds((current) => allIdiomsSelected ? current.filter((id) => !pagedIdioms.some((idiom) => idiom.id === id)) : Array.from(new Set([...current, ...pagedIdioms.map((idiom) => idiom.id)])));
  const deleteQuestions = () => { if (selectedQuestionIds.length && window.confirm(`确定删除选中的 ${selectedQuestionIds.length} 道题目吗？`)) { onBatchQuestionDelete(selectedQuestionIds); setSelectedQuestionIds([]); } };
  const deleteIdioms = () => { if (selectedIdiomIds.length && window.confirm(`确定删除选中的 ${selectedIdiomIds.length} 个成语吗？`)) { onBatchIdiomDelete(selectedIdiomIds); setSelectedIdiomIds([]); } };

  return <>
    <PageHeader eyebrow="CONTENT DESK" title="题库后台" description="题目和成语分开管理。先筛选，再勾选内容执行批量操作。" action={<>
      <input ref={importRef} className="hidden-input" type="file" accept=".csv,text/csv" onChange={importCsv} />
      <input ref={idiomImportRef} className="hidden-input" type="file" accept=".csv,text/csv" onChange={importIdiomsCsv} />
      <button className="secondary-button" onClick={() => importRef.current?.click()}><CloudUpload size={17} />导入题目</button>
      <button className="secondary-button" onClick={() => idiomImportRef.current?.click()}><CloudUpload size={17} />导入成语</button>
      <button className="secondary-button" onClick={onDownloadTemplate}><Download size={17} />下载模板</button>
    </>} />
    <div className="admin-summary"><div><span>题目总数</span><strong>{questions.length}</strong></div><div><span>已发布题目</span><strong>{questions.filter((question) => question.status === "published").length}</strong></div><div><span>成语总数</span><strong>{idioms.length}</strong></div><div><span>待校审成语</span><strong>{idioms.filter((idiom) => idiom.reviewStatus !== "已校审").length}</strong></div></div>
    <div className="admin-tabs" role="tablist" aria-label="内容类型"><button className={section === "questions" ? "active" : ""} onClick={() => setSection("questions")} role="tab" aria-selected={section === "questions"}>题目管理 <span>{questions.length}</span></button><button className={section === "idioms" ? "active" : ""} onClick={() => setSection("idioms")} role="tab" aria-selected={section === "idioms"}>成语管理 <span>{idioms.length}</span></button></div>
    {section === "questions" ? <section className="admin-workspace" aria-label="题目管理">
      <div className="workspace-header"><div><span className="eyebrow">QUESTION DESK</span><h2>题目管理</h2><p>当前显示 {visibleQuestions.length} 条，已选择 {selectedQuestionIds.length} 条。</p></div><button className="primary-button" onClick={newQuestion}><Plus size={17} />新增题目</button></div>
      <div className="admin-toolbar"><div className="search-box"><Search size={17} /><input value={questionSearch} onChange={(event) => setQuestionSearch(event.target.value)} placeholder="搜索题干、来源、状态或内容类型" /></div><select className="admin-select" aria-label="题目分类" value={questionCategory} onChange={(event) => setQuestionCategory(event.target.value as "all" | "基础" | "进阶")}><option value="all">全部难度</option><option value="基础">基础题</option><option value="进阶">进阶题</option></select><button className="icon-button" title="导出题库" onClick={onExport}><Download size={17} /></button></div>
      <div className="filter-tabs small-tabs"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>全部状态</button><button className={filter === "published" ? "active" : ""} onClick={() => setFilter("published")}>已发布</button><button className={filter === "draft" ? "active" : ""} onClick={() => setFilter("draft")}>草稿</button><button className={filter === "offline" ? "active" : ""} onClick={() => setFilter("offline")}>已下架</button></div>
      {selectedQuestionIds.length > 0 && <div className="bulk-toolbar"><strong>已选择 {selectedQuestionIds.length} 道题目</strong><button className="secondary-button" onClick={() => onBatchQuestionUpdate(selectedQuestionIds, { status: "published" })}><Check size={16} />一键发布</button><button className="secondary-button" onClick={() => onBatchQuestionUpdate(selectedQuestionIds, { status: "offline" })}><Trash2 size={16} />一键下架</button><select aria-label="批量修改难度" defaultValue="" onChange={(event) => { if (event.target.value) onBatchQuestionUpdate(selectedQuestionIds, { difficulty: event.target.value as Question["difficulty"] }); event.currentTarget.value = ""; }}><option value="">批量修改难度</option><option value="基础">设为基础</option><option value="进阶">设为进阶</option></select><button className="danger-button compact" onClick={deleteQuestions}><Trash2 size={15} />批量删除</button><button className="text-button" onClick={() => setSelectedQuestionIds([])}>取消选择</button></div>}
      <div className="table-wrap"><table><thead><tr><th className="check-cell"><input type="checkbox" aria-label="全选题目" checked={allQuestionsSelected} onChange={toggleAllQuestions} /></th><th>题目</th><th>来源</th><th>难度</th><th>状态</th><th>操作</th></tr></thead><tbody>{pagedQuestions.map((question) => <tr key={question.id} className={selectedQuestionIds.includes(question.id) ? "is-selected" : ""}><td className="check-cell"><input type="checkbox" aria-label={`选择题目 ${question.id}`} checked={selectedQuestionIds.includes(question.id)} onChange={() => toggleQuestion(question.id)} /></td><td><strong className="table-stem">{question.stem}</strong><small>{question.id} · {question.contentStatus === "curated" ? "可追溯内容" : "导入内容"}</small></td><td>{question.source}</td><td>{question.difficulty}</td><td><span className={`status-pill ${question.status}`}>{statusLabel(question.status)}</span></td><td><div className="table-actions"><button className="status-action" title="编辑题目" onClick={() => setDraft(question)}><Pencil size={15} /><span>编辑</span></button>{question.status === "published" ? <button className="status-action" title="下架题目" onClick={() => onBatchQuestionUpdate([question.id], { status: "offline" })}><Trash2 size={15} /><span>下架</span></button> : <button className="status-action publish-action" title="发布题目" onClick={() => onBatchQuestionUpdate([question.id], { status: "published" })}><Check size={15} /><span>发布</span></button>}</div></td></tr>)}</tbody></table></div><Pagination page={currentQuestionPage} pageCount={questionPageCount} total={visibleQuestions.length} onChange={setQuestionPage} />
      <div className="import-tip"><FileText size={17} /><span>普通用户只显示“已发布”题目。草稿或下架题目可在此直接发布。</span></div>
    </section> : <section className="admin-workspace" aria-label="成语管理">
      <div className="workspace-header"><div><span className="eyebrow">IDIOM DESK</span><h2>成语管理</h2><p>当前显示 {visibleIdioms.length} 条，已选择 {selectedIdiomIds.length} 条。</p></div><button className="primary-button" onClick={newIdiom}><Plus size={17} />新增成语</button></div>
      <div className="admin-toolbar"><div className="search-box"><Search size={17} /><input value={idiomSearch} onChange={(event) => setIdiomSearch(event.target.value)} placeholder="搜索成语、拼音、释义或来源" /></div><select className="admin-select" aria-label="成语分类" value={idiomCategory} onChange={(event) => setIdiomCategory(event.target.value)}><option value="全部">全部分类</option>{idiomCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select><select className="admin-select" aria-label="成语校审状态" value={idiomReviewFilter} onChange={(event) => setIdiomReviewFilter(event.target.value as "all" | "待校审" | "已校审")}><option value="all">全部校审状态</option><option value="待校审">待校审</option><option value="已校审">已校审</option></select><select className="admin-select" aria-label="成语发布状态" value={idiomStatusFilter} onChange={(event) => setIdiomStatusFilter(event.target.value as "all" | IdiomStatus)}><option value="all">全部发布状态</option><option value="published">已发布</option><option value="draft">草稿</option><option value="offline">已下架</option></select></div>
      {selectedIdiomIds.length > 0 && <div className="bulk-toolbar"><strong>已选择 {selectedIdiomIds.length} 个成语</strong><button className="secondary-button" onClick={() => onBatchIdiomUpdate(selectedIdiomIds, { status: "published" })}><Check size={16} />一键发布</button><button className="secondary-button" onClick={() => onBatchIdiomUpdate(selectedIdiomIds, { status: "offline" })}><Trash2 size={16} />一键下架</button><button className="secondary-button" onClick={() => onBatchIdiomUpdate(selectedIdiomIds, { reviewStatus: "已校审" })}><Check size={16} />一键校审</button><button className="secondary-button" onClick={() => onBatchIdiomUpdate(selectedIdiomIds, { reviewStatus: "待校审" })}>撤回校审</button><select aria-label="批量修改成语分类" defaultValue="" onChange={(event) => { if (event.target.value) onBatchIdiomUpdate(selectedIdiomIds, { category: event.target.value }); event.currentTarget.value = ""; }}><option value="">批量修改分类</option>{idiomCategories.map((category) => <option key={category} value={category}>{category}</option>)}<option value="待分类">待分类</option></select><button className="danger-button compact" onClick={deleteIdioms}><Trash2 size={15} />批量删除</button><button className="text-button" onClick={() => setSelectedIdiomIds([])}>取消选择</button></div>}
      <div className="table-wrap"><table><thead><tr><th className="check-cell"><input type="checkbox" aria-label="全选成语" checked={allIdiomsSelected} onChange={toggleAllIdioms} /></th><th>成语</th><th>拼音</th><th>分类</th><th>校审</th><th>发布状态</th><th>操作</th></tr></thead><tbody>{pagedIdioms.map((idiom) => <tr key={idiom.id} className={selectedIdiomIds.includes(idiom.id) ? "is-selected" : ""}><td className="check-cell"><input type="checkbox" aria-label={`选择成语 ${idiom.id}`} checked={selectedIdiomIds.includes(idiom.id)} onChange={() => toggleIdiom(idiom.id)} /></td><td><strong className="table-stem">{idiom.name}</strong><small>{idiom.id}</small></td><td>{idiom.pinyin}</td><td><span className="tag">{idiom.category}</span></td><td><span className="status-pill draft">{idiom.reviewStatus}</span></td><td><span className={`status-pill ${idiom.status}`}>{statusLabel(idiom.status)}</span></td><td><div className="table-actions"><button className="status-action" title="编辑成语" onClick={() => setIdiomDraft(idiom)}><Pencil size={15} /><span>编辑</span></button>{idiom.status === "published" ? <button className="status-action" title="下架成语" onClick={() => onBatchIdiomUpdate([idiom.id], { status: "offline" })}><Trash2 size={15} /><span>下架</span></button> : <button className="status-action publish-action" title="发布成语" onClick={() => onBatchIdiomUpdate([idiom.id], { status: "published" })}><Check size={15} /><span>发布</span></button>}{idiom.reviewStatus === "待校审" && <button className="status-action publish-action" title="校审成语" onClick={() => onBatchIdiomUpdate([idiom.id], { reviewStatus: "已校审" })}><Check size={15} /><span>校审</span></button>}</div></td></tr>)}</tbody></table></div><Pagination page={currentIdiomPage} pageCount={idiomPageCount} total={visibleIdioms.length} onChange={setIdiomPage} />
      <div className="import-tip"><FileText size={17} /><span>成语与题目独立管理。可按分类、校审状态和关键词筛选，再执行批量校审、改分类或删除。</span></div>
    </section>}
  </>;
}

export function QuestionModal({ draft, setDraft, onSubmit }: { draft: Question; setDraft: (question: Question | null) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-backdrop" onMouseDown={() => setDraft(null)}><div className="modal-card" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">QUESTION EDITOR</span><h2>{draft.id.startsWith("question-") ? "新增题目" : "编辑题目"}</h2></div><button className="icon-button" title="关闭" onClick={() => setDraft(null)}><X size={18} /></button></div><form onSubmit={onSubmit} className="modal-form"><label>题干<textarea value={draft.stem} onChange={(event) => setDraft({ ...draft, stem: event.target.value })} rows={3} required /></label><div className="option-form-grid">{draft.options.map((option, index) => <label key={index}>选项 {"ABCD"[index]}<input value={option} onChange={(event) => setDraft({ ...draft, options: draft.options.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} required /></label>)}</div><div className="form-grid"><label>正确选项<select value={draft.answer} onChange={(event) => setDraft({ ...draft, answer: Number(event.target.value) })}><option value={0}>A</option><option value={1}>B</option><option value={2}>C</option><option value={3}>D</option></select></label><label>难度<select value={draft.difficulty} onChange={(event) => setDraft({ ...draft, difficulty: event.target.value as Question["difficulty"] })}><option>基础</option><option>进阶</option></select></label></div><label>解析<textarea value={draft.explanation} onChange={(event) => setDraft({ ...draft, explanation: event.target.value })} rows={4} required /></label><label>来源<input value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })} required /></label><label>来源说明<input value={draft.sourceRef} onChange={(event) => setDraft({ ...draft, sourceRef: event.target.value })} required /></label><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setDraft(null)}>取消</button><button className="primary-button" type="submit"><Check size={17} />保存题目</button></div></form></div></div>;
}

export function IdiomModal({ draft, setDraft, onSubmit }: { draft: Idiom; setDraft: (idiom: Idiom | null) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-backdrop" onMouseDown={() => setDraft(null)}><div className="modal-card" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow">IDIOM EDITOR</span><h2>{draft.id.startsWith("idiom-") ? "新增成语" : "编辑成语"}</h2></div><button className="icon-button" title="关闭" onClick={() => setDraft(null)}><X size={18} /></button></div><form onSubmit={onSubmit} className="modal-form"><div className="form-grid"><label>成语<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label><label>拼音<input value={draft.pinyin} onChange={(event) => setDraft({ ...draft, pinyin: event.target.value })} required /></label></div><label>释义<textarea value={draft.meaning} onChange={(event) => setDraft({ ...draft, meaning: event.target.value })} rows={4} required /></label><label>例句<textarea value={draft.example} onChange={(event) => setDraft({ ...draft, example: event.target.value })} rows={3} required /></label><div className="form-grid"><label>分类<input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} required /></label><label>校审状态<select value={draft.reviewStatus} onChange={(event) => setDraft({ ...draft, reviewStatus: event.target.value as Idiom["reviewStatus"] })}><option value="待校审">待校审</option><option value="已校审">已校审</option></select></label></div><label>来源说明<input value={draft.sourceRef} onChange={(event) => setDraft({ ...draft, sourceRef: event.target.value })} required /></label><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setDraft(null)}>取消</button><button className="primary-button" type="submit"><Check size={17} />保存成语</button></div></form></div></div>;
}
