import { useRef, useState } from 'react';
import { Download, Play, Trash2, Upload, X } from 'lucide-react';
import { Playlist, Video } from '../types';
import { ItemsEditor } from './ItemsEditor';
import { resolveLink, uid } from '../utils/youtube';

interface Props {
  playlists: Playlist[];
  setPlaylists: (fn: (prev: Playlist[]) => Playlist[]) => void;
  results: Video[];
  setResults: (items: Video[]) => void;
  apiKey: string;
  onPlay: (list: Video[], index: number) => void;
  onAddToPlaylist: (video: Video) => void;
  onBackupImport: (data: { playlists: Playlist[]; results: Video[] }) => void;
  onClose: () => void;
  notify: (msg: string) => void;
}

export function LibraryModal(p: Props) {
  const [tab, setTab] = useState<'results' | 'playlists'>('playlists');
  const [selectedId, setSelectedId] = useState<string | null>(p.playlists[0]?.id ?? null);
  const [newName, setNewName] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = p.playlists.find((x) => x.id === selectedId) || null;
  const updatePlaylist = (id: string, patch: Partial<Playlist>) =>
    p.setPlaylists((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const createPlaylist = () => {
    if (!newName.trim()) return;
    const pl: Playlist = { id: uid(), name: newName.trim(), items: [] };
    p.setPlaylists((prev) => [pl, ...prev]);
    setSelectedId(pl.id);
    setNewName('');
  };

  const deletePlaylist = () => {
    if (!selected || !confirm(`Excluir a playlist "${selected.name}"?`)) return;
    p.setPlaylists((prev) => prev.filter((x) => x.id !== selected.id));
    setSelectedId(null);
  };

  const addLink = async () => {
    if (!selected || !link.trim()) return;
    setBusy(true);
    try {
      const r = await resolveLink(link, p.apiKey);
      if (!r) return p.notify('Link do YouTube inválido.');
      updatePlaylist(selected.id, { items: [...selected.items, ...r.videos] });
      setLink('');
      p.notify(r.note || `${r.videos.length} item(ns) adicionado(s).`);
    } catch (e: any) {
      p.notify(e.message || 'Erro ao importar.');
    } finally {
      setBusy(false);
    }
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ playlists: p.playlists, results: p.results }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cartube-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.playlists)) throw new Error();
      p.onBackupImport({ playlists: data.playlists, results: Array.isArray(data.results) ? data.results : [] });
      p.notify('Backup importado.');
    } catch {
      p.notify('Arquivo de backup inválido.');
    }
  };

  const tabBtn = (id: 'results' | 'playlists', label: string) => (
    <button
      onClick={() => setTab(id)}
      className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === id ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-2 md:p-6">
      <div className="w-full max-w-4xl max-h-full bg-slate-950 border border-slate-700 rounded-2xl p-4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex gap-2">
            {tabBtn('playlists', `Playlists (${p.playlists.length})`)}
            {tabBtn('results', `Resultados (${p.results.length})`)}
          </div>
          <button onClick={p.onClose} className="p-2 text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          {tab === 'results' && (
            <>
              <div className="flex justify-end mb-2">
                <button
                  disabled={!p.results.length}
                  onClick={() => confirm('Limpar todos os resultados?') && p.setResults([])}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-red-400 text-xs font-bold disabled:opacity-40"
                >
                  Limpar tudo
                </button>
              </div>
              <ItemsEditor
                items={p.results}
                onChange={p.setResults}
                onPlay={(i) => p.onPlay(p.results, i)}
                onAddToPlaylist={p.onAddToPlaylist}
                emptyText="Nenhum resultado. Faça uma busca pela lupa ou cole um link."
              />
            </>
          )}

          {tab === 'playlists' && (
            <>
              <div className="flex gap-2 mb-3">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createPlaylist()}
                  placeholder="Nome da nova playlist"
                  className="flex-1 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white outline-none focus:border-blue-500"
                />
                <button onClick={createPlaylist} className="px-4 rounded-xl bg-emerald-600 text-white text-sm font-bold">
                  Criar
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {p.playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => setSelectedId(pl.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
                      pl.id === selectedId ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {pl.name} · {pl.items.length}
                  </button>
                ))}
              </div>

              {!selected && <p className="text-sm text-slate-500 py-6 text-center">Crie ou selecione uma playlist.</p>}

              {selected && (
                <div className="mt-2">
                  <div className="flex gap-2 items-center mb-3">
                    <input
                      value={selected.name}
                      onChange={(e) => updatePlaylist(selected.id, { name: e.target.value })}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-bold text-white outline-none focus:border-blue-500"
                    />
                    <button
                      disabled={!selected.items.length}
                      onClick={() => {
                        p.onPlay(selected.items, 0);
                        p.onClose();
                      }}
                      className="px-3 py-2.5 rounded-xl bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Play className="w-4 h-4" /> Tocar
                    </button>
                    <button onClick={deletePlaylist} className="p-2.5 rounded-xl bg-slate-800 text-red-400" title="Excluir playlist">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <input
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addLink()}
                      placeholder="Colar link de vídeo ou playlist do YouTube"
                      className="flex-1 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white outline-none focus:border-red-500"
                    />
                    <button
                      disabled={busy}
                      onClick={addLink}
                      className="px-4 rounded-xl bg-red-600 disabled:opacity-50 text-white text-sm font-bold"
                    >
                      {busy ? '...' : 'Adicionar'}
                    </button>
                  </div>

                  <ItemsEditor
                    items={selected.items}
                    onChange={(items) => updatePlaylist(selected.id, { items })}
                    onPlay={(i) => {
                      p.onPlay(selected.items, i);
                      p.onClose();
                    }}
                    onAddToPlaylist={p.onAddToPlaylist}
                    emptyText="Playlist vazia. Cole um link acima ou adicione a partir dos resultados."
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
          <button onClick={exportBackup} className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Exportar backup
          </button>
          <button onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold flex items-center gap-1.5">
            <Upload className="w-4 h-4" /> Importar backup
          </button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => importBackup(e.target.files?.[0])} />
        </div>
      </div>
    </div>
  );
}
