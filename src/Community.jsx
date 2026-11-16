import { useEffect, useState } from 'react';
import { ArrowRight, Heart, MessageCircle, Pencil, Plus, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import { api } from './api';
import './community.css';

export function Community() {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState({ body: '', skillTag: '' });
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [comments, setComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [editing, setEditing] = useState(null);

  const load = async (nextPage = page, term = search) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(nextPage), size: '10' });
      if (term.trim()) params.set('query', term.trim());
      const result = await api(`/community/posts?${params}`);
      setPosts(result.items || []); setPage(result.page || 0); setTotalPages(result.totalPages || 0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(0, ''); }, []);

  const createPost = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { await api('/community/posts', { method: 'POST', body: draft }); setDraft({ body: '', skillTag: '' }); setNotice('Your post is shared.'); await load(0, search); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const toggleLike = async (post) => {
    try {
      const result = await api(`/community/posts/${post.id}/like`, { method: 'POST' });
      setPosts((items) => items.map((item) => item.id === post.id ? { ...item, likedByMe: result.liked, likeCount: result.likeCount } : item));
    } catch (e) { setError(e.message); }
  };
  const toggleComments = async (post) => {
    if (expanded === post.id) { setExpanded(null); return; }
    setExpanded(post.id);
    try { const result = await api(`/community/posts/${post.id}/comments?page=0&size=50`); setComments((value) => ({ ...value, [post.id]: result.items || [] })); }
    catch (e) { setError(e.message); }
  };
  const addComment = async (event, post) => {
    event.preventDefault(); const body = commentDrafts[post.id]?.trim(); if (!body) return;
    try {
      const added = await api(`/community/posts/${post.id}/comments`, { method: 'POST', body: { body } });
      setComments((value) => ({ ...value, [post.id]: [...(value[post.id] || []), added] }));
      setCommentDrafts((value) => ({ ...value, [post.id]: '' }));
      setPosts((items) => items.map((item) => item.id === post.id ? { ...item, commentCount: item.commentCount + 1 } : item));
    } catch (e) { setError(e.message); }
  };
  const deletePost = async (post) => {
    if (!window.confirm('Delete this post?')) return;
    try { await api(`/community/posts/${post.id}`, { method: 'DELETE' }); setNotice('Post deleted.'); await load(page, search); }
    catch (e) { setError(e.message); }
  };
  const saveEdit = async (event, post) => {
    event.preventDefault();
    try { await api(`/community/posts/${post.id}`, { method: 'PUT', body: editing }); setEditing(null); setNotice('Post updated.'); await load(page, search); }
    catch (e) { setError(e.message); }
  };
  const deleteComment = async (post, comment) => {
    try { await api(`/community/comments/${comment.id}`, { method: 'DELETE' }); setComments((value) => ({ ...value, [post.id]: value[post.id].filter((item) => item.id !== comment.id) })); }
    catch (e) { setError(e.message); }
  };
  const report = async (post) => {
    try { await api(`/community/posts/${post.id}/report`, { method: 'POST', body: { description: 'Reported from the community feed.' } }); setNotice('Thanks. The post was sent to moderators for review.'); }
    catch (e) { setError(e.message); }
  };
  const reportComment = async (comment) => {
    try { await api(`/community/comments/${comment.id}/report`, { method: 'POST', body: { description: 'Reported from the community comments.' } }); setNotice('Thanks. The comment was sent to moderators for review.'); }
    catch (e) { setError(e.message); }
  };

  return <div className="content-page community-page">
    <div className="page-intro"><div><span className="section-kicker">SHARE WHAT YOU’RE LEARNING</span><h1>SkillBridge community</h1><p>Ask questions, share progress and swap useful learning resources.</p></div><span className="free-tag free-tag-large"><Heart size={13}/> Community</span></div>
    {error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="inline-notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={15}/></button></div>}
    <form className="surface-card community-compose" onSubmit={createPost}><label>Start a conversation<textarea required maxLength={3000} rows={3} value={draft.body} onChange={(e)=>setDraft({...draft,body:e.target.value})} placeholder="What are you learning or curious about?" /></label><div><label>Skill tag <input maxLength={100} value={draft.skillTag} onChange={(e)=>setDraft({...draft,skillTag:e.target.value})} placeholder="Optional, e.g. Python" /></label><button className="button button-primary button-sm" disabled={busy||!draft.body.trim()}>{busy?'Posting…':<><Plus size={14}/> Share post</>}</button></div></form>
    <form className="community-search" onSubmit={(e)=>{e.preventDefault();setSearch(query);load(0,query);}}><Search size={16}/><input value={query} onChange={(e)=>setQuery(e.target.value)} aria-label="Search community posts" placeholder="Search posts or skill tags"/><button className="button button-outline button-sm">Search</button></form>
    {loading ? <div className="loading-surface">Loading community posts…</div> : posts.length ? <div className="community-feed">{posts.map((post)=><article className="surface-card community-post" key={post.id}>
      {editing?.id===post.id ? <form onSubmit={(e)=>saveEdit(e,post)} className="community-edit"><textarea value={editing.body} maxLength={3000} onChange={(e)=>setEditing({...editing,body:e.target.value})}/><input value={editing.skillTag} maxLength={100} onChange={(e)=>setEditing({...editing,skillTag:e.target.value})} placeholder="Skill tag"/><button className="button button-primary button-sm">Save changes</button><button type="button" className="button button-outline button-sm" onClick={()=>setEditing(null)}>Cancel</button></form> : <>
        <header><span className="avatar">{post.authorName.split(/\s+/).map((part)=>part[0]).slice(0,2).join('').toUpperCase()}</span><div><strong>{post.authorName}</strong><time>{new Date(post.createdAt).toLocaleString()}</time></div>{post.skillTag&&<span className="skill-tag skill-learn">{post.skillTag}</span>}</header><p className="community-post-body">{post.body}</p>
        <div className="community-post-actions"><button className={post.likedByMe?'community-liked':''} onClick={()=>toggleLike(post)} aria-label={post.likedByMe?'Unlike post':'Like post'}><Heart size={15}/>{post.likeCount}</button><button onClick={()=>toggleComments(post)}><MessageCircle size={15}/>{post.commentCount} comments</button><button onClick={()=>report(post)}><ShieldCheck size={14}/>Report</button>{post.mine&&<><button onClick={()=>setEditing({id:post.id,body:post.body,skillTag:post.skillTag})}><Pencil size={14}/>Edit</button><button onClick={()=>deletePost(post)}><Trash2 size={14}/>Delete</button></>}</div>
        {expanded===post.id&&<div className="community-comments">{(comments[post.id]||[]).map((comment)=><div className="community-comment" key={comment.id}><div><strong>{comment.authorName}</strong><p>{comment.body}</p></div><span>{!comment.mine&&<button onClick={()=>reportComment(comment)} aria-label="Report comment"><ShieldCheck size={13}/></button>}{comment.mine&&<button onClick={()=>deleteComment(post,comment)} aria-label="Delete your comment"><Trash2 size={13}/></button>}</span></div>)}<form onSubmit={(e)=>addComment(e,post)}><input maxLength={1000} value={commentDrafts[post.id]||''} onChange={(e)=>setCommentDrafts((value)=>({...value,[post.id]:e.target.value}))} placeholder="Write a comment…" aria-label="Write a comment"/><button className="button button-primary button-sm" disabled={!commentDrafts[post.id]?.trim()}>Comment <ArrowRight size={13}/></button></form></div>}
      </>}
    </article>)}</div> : <div className="surface-card no-matches"><h3>No posts yet</h3><p>Start the conversation by sharing a learning question, milestone or resource.</p></div>}
    <div className="match-pagination"><button className="button button-outline button-sm" disabled={page===0||loading} onClick={()=>load(page-1,search)}>Previous</button><span>Page {page+1} of {Math.max(totalPages,1)}</span><button className="button button-outline button-sm" disabled={page+1>=totalPages||loading} onClick={()=>load(page+1,search)}>Next</button></div>
  </div>;
}
