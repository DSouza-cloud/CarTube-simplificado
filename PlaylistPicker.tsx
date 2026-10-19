import { useState } from 'react';
import { Playlist, Video } from '../types';

interface Props {
  video: Video;
  playlists: Playlist[];
  onPick: (playlistId: string) => void;
  onCreate: (name: string) => void;
  onClose: () => void;
}

export function PlaylistPicker({ video, playlists, onPick, onCreate, onClose }: Props) {
  const [name, setName] = useState('');
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-white text-sm">Adicionar à playlist</h3>
        <p className="text-xs text-slate-400 truncate mt-1">{video.title}</p>

        <div className="mt-3 max-h-56 overflow-y-auto flex flex-col gap-1.5">
          {playlists.length === 0 && <p className="text-xs text-slate-500">Nenhuma playlist ainda. Crie uma abaixo.</p>}
          {playlists.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              className="flex justify-between items-center px-3 py-3 rounded-xl bg-slate-800 hover:bg-blue-600 text-left"
            >
              <span className="text-sm font-semibold text-white truncate">{p.name}</span>
              <span className="text-xs text-slate-400">{p.items.length}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nova playlist"
            className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white outline-none focus:border-blue-500"
          />
          <button
            disabled={!name.trim()}
            onClick={() => onCreate(name.trim())}
            className="px-4 rounded-xl bg-emerald-600 disabled:opacity-40 text-white text-sm font-bold"
          >
            Criar
          </button>
        </div>
        <button onClick={onClose} className="mt-3 w-full py-2 rounded-xl bg-slate-800 text-slate-300 text-sm">
          Fechar
        </button>
      </div>
    </div>
  );
}
