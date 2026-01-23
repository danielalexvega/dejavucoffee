import Image from 'next/image';

interface VideoPlayerProps {
  src: string;
  alt?: string;
  className?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
}

export function VideoPlayer({
  src,
  alt = 'Video',
  className = '',
  autoplay = true,
  loop = true,
  muted = true,
  controls = false,
}: VideoPlayerProps) {
  return (
    <div className={`relative mx-auto w-full max-w-[70vw] ${className}`}>
      <video
        src={src}
        className="h-auto w-full rounded-lg shadow-lg"
        autoPlay={autoplay}
        loop={loop}
        muted={muted}
        playsInline
        controls={controls}
        aria-label={alt}
      >
        Your browser does not support the video tag.
      </video>
      {/* Overlay image in top right corner */}
      <div className="absolute right-2 top-4">
        <Image
          src="/every-damn-day.png"
          alt="Every Damn Day"
          width={200}
          height={200}
          className="video-overlay-image"
        />
      </div>
    </div>
  );
}
