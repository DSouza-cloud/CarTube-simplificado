import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, ListPlus, Pencil, Play, Trash2 } from 'lucide-react';
import { Video } from '../types';
import { thumbUrl } from '../utils/youtube';

interface Props {
  items: Video[];
  onChange: (items: Video[]) => void;
  onPlay: (index: number) => void;
  onAddToPlaylist: (video: Video) => void;
  emptyText: string;
}

const btn = 'p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0';

export function ItemsEditor({ items, onChange, onPlay, onAddToPlaylist, emptyText }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('');

  const startEdit = (v: Video) => {
    setEditingId(v.id);
    setTitle(v.title);
    setChannel(v.channel);
  };
  const saveEdit = () => {
    onChange(items.map((v) => (v.id === editingId ? { ...v, title: title.trim() || v.title, channel } : v)));
    setEditingId(null);
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
  };

  if (items.length === 0) return <p className="text-sm text-slate-500 py-6 text-center">{emptyText}</p>;

  return (
    <div className="flex flex-col gap-2">
      {items.map((v, i) => (
        <div key={v.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
          <div className="w-20 h-12 rounded-lg overflow-hidden bg-slate-950 shrink-0">
            {thumbUrl(v) && <img src={thumbUrl(v)} alt="" className="w-full h-full object-cover" />}
          </div>

          {editingId === v.id ? (
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-600 text-sm text-white outline-none"
                placeholder="Título"
              />
              <input
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-600 text-xs text-white outline-none"
                placeholder="Canal / artista"
              />
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{v.title}</p>
              <p className="text-xs text-slate-400 truncate">{v.channel}</p>
            </div>
          )}

          <div className="flex items-center gap-1 flex-wrap justify-end max-w-[11.5rem]">
            {editingId === v.id ? (
              <button onClick={saveEdit} className={`${btn} !bg-emerald-600 text-white`} title="Salvar edição">
                <Check className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button onClick={() => onPlay(i)} className={btn} title="Tocar">
                  <Play className="w-4 h-4 text-emerald-400" />
                </button>
                <button onClick={() => startEdit(v)} className={btn} title="Editar título">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => onAddToPlaylist(v)} className={btn} title="Adicionar à playlist">
                  <ListPlus className="w-4 h-4 text-blue-400" />
                </button>
                <button onClick={() => move(i, i - 1)} className={btn} title="Subir">
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button onClick={() => move(i, i + 1)} className={btn} title="Descer">
                  <ArrowDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onChange(items.filter((x) => x.id !== v.id))}
                  className={btn}
                  title="Remover"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
