import { useEffect, useRef } from 'react';
import { Video } from '../types';
import { loadYouTubeApi } from '../utils/youtube';

interface Props {
  video: Video | null;
  token: number; // muda a cada toque, permite repetir o mesmo vídeo
  onEnded: () => void;
  onError: () => void;
}

export function Player({ video, token, onEnded, onError }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);
  const ready = useRef(false);
  const pending = useRef<Video | null>(video);
  const cbs = useRef({ onEnded, onError });
  cbs.current = { onEnded, onError };

  const load = (v: Video) => {
    const p = player.current;
    if (!ready.current || !p) {
      pending.current = v;
      return;
    }
    if (v.videoId) p.loadVideoById(v.videoId);
    else if (v.playlistId) p.loadPlaylist({ listType: 'playlist', list: v.playlistId, index: 0 });
  };

  useEffect(() => {
    let cancelled = false;
    const mount = document.createElement('div');
    mount.style.width = '100%';
    mount.style.height = '100%';
    box.current?.appendChild(mount);

    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      player.current = new YT.Player(mount, {
        width: '100%',
        height: '100%',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, autoplay: 1 },
        events: {
          onReady: () => {
            ready.current = true;
            if (pending.current) load(pending.current);
          },
          onStateChange: (e: any) => {
            if (e.data === YT.PlayerState.ENDED) cbs.current.onEnded();
          },
          onError: () => cbs.current.onError(),
        },
      });
    });

    return () => {
      cancelled = true;
      ready.current = false;
      try {
        player.current?.destroy();
      } catch {
        /* ignore */
      }
      player.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (video) load(video);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.id, token]);

  return (
    <div className="relative w-full aspect-video max-h-full bg-black rounded-2xl overflow-hidden border border-slate-800">
      <div ref={box} className="absolute inset-0" />
      {!video && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm pointer-events-none">
          Busque um vídeo ou cole um link do YouTube
        </div>
      )}
    </div>
  );
}
