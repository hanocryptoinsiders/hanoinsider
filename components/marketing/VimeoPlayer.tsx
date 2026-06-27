"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Player from "@vimeo/player";

export interface VimeoPlayerProps {
  vimeoId: string;
  title?: string;
  orientation?: 0 | 1 | 2 | 3;
  showControls?: boolean;
  isActive?: boolean;
  earlyEnd?: boolean;
  maxWidth?: string;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
}

const ASPECT_CONFIG = {
  0: { aspect: "aspect-video", maxW: "max-w-4xl mx-auto" },
  1: { aspect: "aspect-9/16", maxW: "max-w-[340px] mx-auto" },
  2: { aspect: "aspect-4/5", maxW: "max-w-[500px] mx-auto" },
  3: { aspect: "aspect-square", maxW: "max-w-[560px] mx-auto" },
} as const;

function buildEmbedSrc(vimeoId: string, autoPlay: boolean, loop: boolean) {
  const params = new URLSearchParams({
    controls: "0",
    byline: "0",
    portrait: "0",
    title: "0",
    dnt: "1",
    background: "0",
    loop: loop ? "1" : "0",
    muted: "1",
    autopause: "0",
    pip: "0",
    vimeo_logo: "0",
    unmute_button: "0",
    fullscreen: "0",
    progress_bar: "0",
    cc: "0",
    keyboard: "0",
    autoplay: autoPlay ? "1" : "0",
  });
  return `https://player.vimeo.com/video/${vimeoId}?${params.toString()}`;
}

export function VimeoPlayer({
  vimeoId,
  title,
  orientation = 0,
  showControls = true,
  isActive = true,
  earlyEnd = false,
  maxWidth,
  autoPlay = false,
  loop = true,
  className = "",
}: VimeoPlayerProps) {
  const config = ASPECT_CONFIG[orientation];
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasUnmutedRef = useRef(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(autoPlay);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isManualFullscreen, setIsManualFullscreen] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeFullscreen = isFullscreen || isManualFullscreen;
  const embedSrc = buildEmbedSrc(vimeoId, autoPlay, loop);

  const startHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowOverlay(false);
    }, 2000);
  }, []);

  const handleMouseMove = useCallback(() => {
    if (!isPlaying) return;
    setShowOverlay(true);
    startHideTimer();
  }, [isPlaying, startHideTimer]);

  const handleMouseLeave = useCallback(() => {
    if (!isPlaying) return;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setShowOverlay(false);
  }, [isPlaying]);

  const handleContainerTap = useCallback(() => {
    if (!isPlaying) return;
    if (showOverlay) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setShowOverlay(false);
    } else {
      setShowOverlay(true);
      startHideTimer();
    }
  }, [isPlaying, showOverlay, startHideTimer]);

  useEffect(() => {
    if (isPlaying) {
      startHideTimer();
    } else {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setShowOverlay(true);
    }
  }, [isPlaying, startHideTimer]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (isManualFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isManualFullscreen]);

  useEffect(() => {
    if (!iframeRef.current) return;

    const vimeoPlayer = new Player(iframeRef.current);

    vimeoPlayer
      .ready()
      .then(() => {
        setIsLoading(false);
        vimeoPlayer.setMuted(isMuted).catch(() => {});
      })
      .catch(() => {
        setIsLoading(false);
      });

    const safetyTimeout = setTimeout(() => setIsLoading(false), 3000);

    vimeoPlayer.on("play", () => {
      setIsLoading(false);
      setIsPlaying(true);
      window.dispatchEvent(new CustomEvent("vimeo-play", { detail: { id: vimeoId } }));
    });
    vimeoPlayer.on("pause", () => setIsPlaying(false));
    vimeoPlayer.on("ended", () => {
      if (loop) {
        vimeoPlayer.setCurrentTime(0).catch(() => {});
        vimeoPlayer.play().catch(() => {});
      } else {
        vimeoPlayer.setCurrentTime(0).catch(() => {});
        vimeoPlayer.pause().catch(() => {});
        setIsPlaying(false);
        setProgress(0);
        setShowOverlay(true);
      }
    });
    vimeoPlayer.on("timeupdate", (data: { percent: number; seconds: number; duration: number }) => {
      setProgress(data.percent * 100);

      if (earlyEnd && data.seconds >= data.duration - 0.1 && data.duration > 0) {
        if (loop) {
          vimeoPlayer.setCurrentTime(0).catch(() => {});
          vimeoPlayer.play().catch(() => {});
        } else {
          vimeoPlayer.pause().catch(() => {});
          vimeoPlayer.setCurrentTime(0).catch(() => {});
          setIsPlaying(false);
          setProgress(0);
          setShowOverlay(true);
        }
      }
    });

    setPlayer(vimeoPlayer);

    return () => {
      vimeoPlayer.off("play");
      vimeoPlayer.off("pause");
      vimeoPlayer.off("ended");
      vimeoPlayer.off("timeupdate");
      clearTimeout(safetyTimeout);
      setPlayer(null);
    };
  }, [vimeoId, earlyEnd, loop]);

  useEffect(() => {
    if (!autoPlay || !player || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && isActive) {
            player.play().catch(() => {});
          } else {
            player.pause().catch(() => {});
          }
        });
      },
      { threshold: 0.3 },
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [autoPlay, player, isActive]);

  useEffect(() => {
    if (!isActive && player) {
      player.pause().catch(() => {});
    }
  }, [isActive, player]);

  useEffect(() => {
    if (isActive && autoPlay && player) {
      setIsMuted(true);
      player.setMuted(true).catch(() => {});
      player.play().catch(() => {});
    }
  }, [isActive, autoPlay, player]);

  useEffect(() => {
    const handleGlobalPlay = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail.id !== vimeoId && isPlaying && player) {
        player.pause().catch(() => {});
      }
    };

    window.addEventListener("vimeo-play", handleGlobalPlay);
    return () => window.removeEventListener("vimeo-play", handleGlobalPlay);
  }, [vimeoId, isPlaying, player]);

  useEffect(() => {
    const handleToggleRequest = () => {
      if (!player) return;
      if (isPlaying) player.pause().catch(() => {});
      else player.play().catch(() => {});
    };

    window.addEventListener(`vimeo-toggle-${vimeoId}`, handleToggleRequest);
    return () => window.removeEventListener(`vimeo-toggle-${vimeoId}`, handleToggleRequest);
  }, [vimeoId, player, isPlaying]);

  const unmuteOnFirstInteraction = useCallback(() => {
    if (!player || hasUnmutedRef.current) return;
    hasUnmutedRef.current = true;
    const vol = volume > 0 ? volume : 1;
    player.setMuted(false).catch(() => {});
    player.setVolume(vol).catch(() => {});
    setIsMuted(false);
    setVolume(vol);
  }, [player, volume]);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!player) return;
    unmuteOnFirstInteraction();
    if (isPlaying) player.pause();
    else player.play();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!player) return;
    const newMuted = !isMuted;
    player.setMuted(newMuted).catch(() => {});
    setIsMuted(newMuted);
    if (!newMuted) {
      hasUnmutedRef.current = true;
      const volToSet = volume > 0 ? volume : 1;
      setVolume(volToSet);
      player.setVolume(volToSet).catch(() => {});
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (!player) return;
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    player.setVolume(newVolume);

    if (newVolume > 0 && isMuted) {
      hasUnmutedRef.current = true;
      setIsMuted(false);
      player.setMuted(false);
    } else if (newVolume === 0 && !isMuted) {
      setIsMuted(true);
      player.setMuted(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!player) return;
    const newProgress = parseFloat(e.target.value);
    player.getDuration().then((duration: number) => {
      player.setCurrentTime(duration * (newProgress / 100));
    });
    setProgress(newProgress);
  };

  const toggleFullscreen = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const isIPhone = typeof navigator !== "undefined" && /iPhone/i.test(navigator.userAgent);

    if (isIPhone) {
      setIsManualFullscreen(!isManualFullscreen);
      return;
    }

    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
      } catch {
        player?.requestFullscreen().catch(() => {});
      }
    } else if (document.exitFullscreen) {
      await document.exitFullscreen();
    }
  };

  return (
    <div
      className={`bg-[#030005]/50 border border-white/10 shadow-2xl transition-all duration-700 hover:border-[#B45AFF]/30 hover:shadow-[#B45AFF]/40 group relative overflow-hidden rounded-2xl md:rounded-3xl w-full
        ${activeFullscreen ? "fixed inset-0 z-[9999] bg-[#030005] w-full h-full max-w-none rounded-none" : `${config.aspect} ${maxWidth || config.maxW}`}
        ${className}`}
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-30">
          <div className="w-10 h-10 border-3 border-[#B45AFF]/20 border-t-[#B45AFF] rounded-full animate-spin" />
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={embedSrc}
        className="absolute inset-0 w-full h-full z-0 pointer-events-none"
        allow="autoplay; fullscreen; picture-in-picture"
        title={title || "Vimeo Video"}
        onLoad={() => setIsLoading(false)}
      />

      {!isLoading && isPlaying && !showOverlay && (
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={handleContainerTap}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleContainerTap();
          }}
        />
      )}

      {!isLoading && (
        <button
          type="button"
          className={`absolute inset-0 w-full h-full z-20 flex items-center justify-center transition-all duration-500 cursor-pointer touch-manipulation appearance-none outline-none border-none
            ${isPlaying && !showOverlay ? "opacity-0 group-hover:opacity-100" : ""}
            ${isPlaying && showOverlay ? "opacity-100 bg-black/10" : ""}
            ${!isPlaying ? "opacity-100 bg-black/40 backdrop-blur-[2px]" : ""}`}
          onClick={(e) => togglePlay(e)}
          aria-label={isPlaying ? "Pause video" : "Play video"}
        >
          <div
            className={`w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md shadow-2xl transition-all duration-300
              ${isPlaying ? "scale-90 hover:scale-100 hover:bg-black/80 shadow-[#B45AFF]/50" : "scale-100 hover:scale-110 shadow-white/20"}
            `}
          >
            {isPlaying ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="ml-1 text-white">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </button>
      )}

      {showControls && !isLoading && (
        <div
          className={`absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/90 via-black/40 to-transparent transition-all duration-700 z-30 p-4 md:p-6
            ${isPlaying && !showOverlay ? "translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100" : "translate-y-0 opacity-100"}`}
        >
          <div className="flex items-center gap-4 md:gap-6 bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/5">
            <div className="flex items-center gap-4 border-r border-white/10 pr-4">
              <button
                type="button"
                onClick={togglePlay}
                className="text-white/80 hover:text-[#B45AFF] transition-all hover:scale-110 active:scale-95"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <div className="flex items-center gap-0 md:gap-2 group/volume relative">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="text-white/80 hover:text-[#B45AFF] transition-all hover:scale-110 active:scale-95"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5L6 9H2v6h4l5 4V5z" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5L6 9H2v6h4l5 4V5z" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </button>

                <div className="hidden md:flex items-center w-0 group-hover/volume:w-28 h-8 overflow-hidden transition-all duration-300 ease-out">
                  <div className="px-2 w-full flex items-center h-full">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      style={{
                        background: `linear-gradient(to right, #B45AFF 0%, #B45AFF ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.1) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.1) 100%)`,
                      }}
                      className="w-full h-1 md:h-1.5 rounded-full appearance-none cursor-pointer accent-transparent -translate-y-px
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(180,90,255,0.5)]
                        [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-none"
                      aria-label="Volume"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 group/progress relative flex items-center h-4">
              <div className="relative w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#B45AFF] shadow-[0_0_10px_rgba(180,90,255,0.6)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={progress}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                aria-label="Seek"
              />
            </div>

            <div className="border-l border-white/10 pl-4">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="text-white/80 hover:text-[#B45AFF] transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
                aria-label={activeFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {activeFullscreen ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VimeoPlayer;
