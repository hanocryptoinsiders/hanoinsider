import { VimeoPlayer } from "./VimeoPlayer";

const VIMEO_VIDEO_ID = "1204962723";

export function HeroVideo() {
  return (
    <section id="video" className="hero-video-section" aria-label="Hano Inner Circle video">
      <div className="hero-video-inner" data-m-reveal>
        <div className="eyebrow hero-video-eyebrow">
          <span className="pulse-dot" />
          <span className="acc">Inside the circle</span>
        </div>
        <h2 className="hero-video-title">
          See what <em>Hano Insiders</em> is about
        </h2>
        <p className="hero-video-stand">
          A first look at the desk — how we read markets, what members get, and why
          clarity beats chaos.
        </p>

        <div className="hero-video-frame">
          <VimeoPlayer
            vimeoId={VIMEO_VIDEO_ID}
            title="Hano Inner Circle"
            orientation={0}
            showControls
            isActive
            earlyEnd
            autoPlay
            loop
            maxWidth="max-w-full"
          />
        </div>
      </div>
    </section>
  );
}
