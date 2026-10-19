import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, FolderCog, ListPlus, Search, Settings, SkipBack, SkipForward } from 'lucide-react';
import { Playlist, Video } from './types';
import { Player } from './components/Player';
import { LibraryModal } from './components/LibraryModal';
import { PlaylistPicker } from './components/PlaylistPicker';
import { SettingsModal } from './components/SettingsModal';
import { useWakeLock } from './hooks/useWakeLock';
import { requestPersistentStorage, STORAGE_FAIL_EVENT, useStoredState } from './utils/storage';
import { resolveLink, searchVideos, thumbUrl, uid, watchUrl } from './utils/youtube';

const ENV_KEY: string = (import.meta as any).env?.VITE_YOUTUBE_API_KEY || '';

export default function App() {
  const [playlists, setPlaylists] = useStoredState<Playlist[]>('cartube_v2_playlists', []);
  const [results, setResults] = useStoredState<Video[]>('cartube_v2_results', []);
  const [settings, setSettings] = useStoredState<{ apiKey: string }>('cartube_v2_settings', { apiKey: '' });
  const apiKey = settings.apiKey || ENV_KEY;

  const [queue, setQueue] = useState<Video[]>([]);
  const [index, setIndex] = useState(-1);
  const [token, setToken] = useState(0);
  const current = queue[index] ?? null;

  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [panel, setPanel] = useState<'results' | 'playlists'>('results');
  const [panelPlaylistId, setPanelPlaylistId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pickerVideo, setPickerVideo] = useState<Video | null>(null);
  const [storageFailed, setStorageFailed] = useState(false);

  useWakeLock();

  useEffect(() => {
    requestPersistentStorage();
    const onFail = () => setStorageFailed(true);
    window.addEventListener(STORAGE_FAIL_EVENT, onFail);
    return () => window.removeEventListener(STORAGE_FAIL_EVENT, onFail);
  }, []);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const play = (list: Video[], i: number) => {
    setQueue(list);
    setIndex(i);
    setToken((t) => t + 1);
  };
  const next = () => {
    if (index + 1 < queue.length) {
      setIndex(index + 1);
      setToken((t) => t + 1);
    }
  };
  const prev = () => {
    if (index > 0) {
      setIndex(index - 1);
      setToken((t) => t + 1);
    }
  };

  const handleEnded = () => {
    // playlist do YouTube sem importar: o próprio player avança sozinho
    if (current?.playlistId && !current.videoId) return;
    next();
  };
  const handleError = () => {
    notify('Este vídeo não permite reprodução aqui. Pulando…');
    next();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = query.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const linked = await resolveLink(text, apiKey);
      if (linked) {
        setResults(linked.videos);
        setPanel('results');
        play(linked.videos, 0);
        if (linked.note) notify(linked.note);
      } else {
        if (!apiKey) {
          notify('Para buscar pela lupa, configure a chave da API do YouTube.');
          setShowSettings(true);
          return;
        }
        const found = await searchVideos(text, apiKey);
        if (!found.length) {
          notify('Nenhum resultado encontrado.');
          return;
        }
        setResults(found);
        setPanel('results');
      }
      setQuery('');
    } catch (err: any) {
      notify(err.message || 'Erro na busca.');
    } finally {
      setBusy(false);
    }
  };

  const addToPlaylist = (playlistId: string) => {
    if (!pickerVideo) return;
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? { ...p, items: [...p.items, { ...pickerVideo, id: uid() }] } : p)),
    );
    setPickerVideo(null);
    notify('Adicionado à playlist.');
  };
  const createAndAdd = (name: string) => {
    if (!pickerVideo) return;
    setPlaylists((prev) => [{ id: uid(), name, items: [{ ...pickerVideo, id: uid() }] }, ...prev]);
    setPickerVideo(null);
    notify(`Playlist "${name}" criada.`);
  };

  const panelPlaylist = playlists.find((p) => p.id === panelPlaylistId) ?? playlists[0] ?? null;
  const listItems = panel === 'results' ? results : panelPlaylist?.items ?? [];
  const iconBtn = 'p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shrink-0';

  return (
    <div className="w-screen h-screen flex flex-col bg-[#070a10] text-slate-100 p-2 md:p-3 gap-2">
      {storageFailed && (
        <div className="flex items-center gap-2 text-xs bg-amber-950 border border-amber-700 text-amber-200 rounded-xl px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Este navegador está bloqueando o salvamento (comum no preview do AI Studio). Use “Exportar backup” em Editar para não perder as playlists.
        </div>
      )}

      <form onSubmit={submit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no YouTube ou colar link de vídeo/playlist"
            className="w-full pl-10 pr-3 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white outline-none focus:border-red-500"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold text-sm shrink-0"
        >
          {busy ? '...' : 'Buscar'}
        </button>
        <button type="button" onClick={() => setShowLibrary(true)} className={iconBtn} title="Editar playlists e resultados">
          <FolderCog className="w-5 h-5" />
        </button>
        <button type="button" onClick={() => setShowSettings(true)} className={iconBtn} title="Configurações">
          <Settings className="w-5 h-5" />
        </button>
      </form>

      {toast && (
        <div className="text-xs font-semibold bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-slate-100">{toast}</div>
      )}

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2">
        <div className="lg:flex-1 flex flex-col min-h-0 min-w-0">
          <Player video={current} token={token} onEnded={handleEnded} onError={handleError} />
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{current?.title ?? 'Nada tocando'}</p>
              <p className="text-xs text-slate-400 truncate">{current?.channel}</p>
            </div>
            <button onClick={prev} disabled={index <= 0} className={`${iconBtn} disabled:opacity-40`} title="Anterior">
              <SkipBack className="w-5 h-5" />
            </button>
            <button onClick={next} disabled={index + 1 >= queue.length} className={`${iconBtn} disabled:opacity-40`} title="Próximo">
              <SkipForward className="w-5 h-5" />
            </button>
            {current && (
              <>
                <button onClick={() => setPickerVideo(current)} className={iconBtn} title="Adicionar à playlist">
                  <ListPlus className="w-5 h-5 text-blue-400" />
                </button>
                <a href={watchUrl(current)} target="_blank" rel="noreferrer" className={iconBtn} title="Abrir no YouTube">
                  <ExternalLink className="w-5 h-5" />
                </a>
              </>
            )}
          </div>
        </div>

        <div className="lg:w-96 flex flex-col min-h-0 h-64 lg:h-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-2">
          <div className="flex gap-1.5 mb-2">
            {(['results', 'playlists'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setPanel(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold ${panel === t ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                {t === 'results' ? `Resultados (${results.length})` : `Playlists (${playlists.length})`}
              </button>
            ))}
          </div>

          {panel === 'playlists' && (
            <select
              value={panelPlaylist?.id ?? ''}
              onChange={(e) => setPanelPlaylistId(e.target.value)}
              className="mb-2 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
            >
              {playlists.length === 0 && <option value="">Nenhuma playlist</option>}
              {playlists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.items.length})
                </option>
              ))}
            </select>
          )}

          <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
            {listItems.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6 px-3">
                {panel === 'results'
                  ? 'Busque algo pela lupa ou cole um link para começar.'
                  : 'Crie playlists pelo botão de editar ou adicionando vídeos com “＋”.'}
              </p>
            )}
            {listItems.map((v, i) => (
              <button
                key={v.id}
                onClick={() => play(listItems, i)}
                className={`flex items-center gap-2 p-2 rounded-xl text-left border ${
                  current?.id === v.id ? 'bg-red-600/20 border-red-500/50' : 'border-transparent hover:bg-slate-800'
                }`}
              >
                <div className="w-20 h-12 rounded-lg overflow-hidden bg-slate-950 shrink-0">
                  {thumbUrl(v) && <img src={thumbUrl(v)} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{v.title}</p>
                  <p className="text-[11px] text-slate-400 truncate">{v.channel}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {showLibrary && (
        <LibraryModal
          playlists={playlists}
          setPlaylists={setPlaylists}
          results={results}
          setResults={setResults}
          apiKey={apiKey}
          onPlay={play}
          onAddToPlaylist={setPickerVideo}
          onBackupImport={(d) => {
            setPlaylists(d.playlists);
            setResults(d.results);
          }}
          onClose={() => setShowLibrary(false)}
          notify={notify}
        />
      )}
      {showSettings && (
        <SettingsModal apiKey={settings.apiKey} onSave={(k) => setSettings({ apiKey: k })} onClose={() => setShowSettings(false)} />
      )}
      {pickerVideo && (
        <PlaylistPicker
          video={pickerVideo}
          playlists={playlists}
          onPick={addToPlaylist}
          onCreate={createAndAdd}
          onClose={() => setPickerVideo(null)}
        />
      )}
    </div>
  );
}
