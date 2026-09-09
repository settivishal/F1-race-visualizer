import { Button } from "@/components/ui/button";
import { motion, MotionValue, useTransform } from "framer-motion";

const SPEED_OPTIONS = [0.5, 1, 2, 4, 8];

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

const PrevIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const NextIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const RestartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
    <path d="M21.5 2v6h-6" />
    <path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </svg>
);

/**
 * One speed option. Hoisted out of the component: defined inside it, this would
 * be a new component type on every render, and React would unmount and remount
 * the buttons rather than update them.
 */
function SpeedButton({
  option,
  isActive,
  onSelect,
  className = "",
}: {
  option: number;
  isActive: boolean;
  onSelect: (speed: number) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(option)}
      className={`tap inline-flex h-9 items-center justify-center rounded-md px-2.5 text-eyebrow font-bold uppercase transition ${className} ${
        isActive
          ? "bg-accent-fill text-on-accent hover:bg-accent-strong"
          : "border border-white/15 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
      }`}
    >
      {option}x
    </button>
  );
}

export function ReplayControls({
  currentLap,
  maxLap,
  isPlaying,
  speed,
  progressPercent,
  lapProgress,
  canStepBackward,
  canStepForward,
  onPlayPause,
  onRestart,
  onPrevious,
  onNext,
  onJumpToLap,
  onChangeSpeed,
  compact = false,
}: {
  currentLap: number;
  maxLap: number;
  isPlaying: boolean;
  speed: number;
  progressPercent: number;
  lapProgress: MotionValue<number>;
  canStepBackward: boolean;
  canStepForward: boolean;
  onPlayPause: () => void;
  onRestart: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onJumpToLap: (lap: number) => void;
  onChangeSpeed: (speed: number) => void;
  compact?: boolean;
}) {
  const percent = useTransform(lapProgress, (p) => {
    return Math.max(0, Math.min(100, ((currentLap - 1 + p) / Math.max(1, maxLap - 1)) * 100));
  });
  
  const widthStr = useTransform(percent, (p) => `${p}%`);
  const thumbStrCompact = useTransform(percent, (p) => `calc(${p}% - 7px)`);
  const thumbStrNormal = useTransform(percent, (p) => `calc(${p}% - 8px)`);

  // The compact overlay renders inside the chart panel, which stays dark in
  // both themes (see docs/decisions.md, "The chart panel stays dark in both
  // themes"). So its surfaces are fixed dark values, not theme tokens — with
  // tokens it turned into white buttons on a black chart in light mode. Only
  // the accent is a token, because it is red either way.
  if (compact) {
    return (
      <div className="w-full rounded-xl border border-white/10 bg-black/55 px-4 py-4 shadow-lg backdrop-blur-md sm:px-6 sm:py-5">
        {/* Two deliberate rows rather than one that wraps: at 390px the four
            transport buttons and five speeds cannot share a line, and letting
            them wrap put a lone 8x on a third row of its own. */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!canStepBackward}
            aria-label="Previous lap"
            className="tap-square h-9 w-9 flex items-center justify-center rounded-md border border-white/15 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-30"
          >
            <PrevIcon />
          </button>
          <button
            type="button"
            onClick={onPlayPause}
            aria-label={isPlaying ? "Pause replay" : "Play replay"}
            // The same button as its three neighbours. It used to be a red
            // disc, which made one control in a row of four read as a
            // different kind of thing; the accent is carried by the speed
            // selection and the progress bar, which is enough red for one
            // panel.
            className="tap-square h-9 w-9 flex items-center justify-center rounded-md border border-white/15 bg-white/10 text-white transition hover:bg-white/20 active:brightness-90"
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canStepForward}
            aria-label="Next lap"
            className="tap-square h-9 w-9 flex items-center justify-center rounded-md border border-white/15 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-30"
          >
            <NextIcon />
          </button>
          <button
            type="button"
            onClick={onRestart}
            aria-label="Restart replay"
            className="tap-square h-9 w-9 flex items-center justify-center rounded-md border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
          >
            <RestartIcon />
          </button>

          {/* A segmented control on its own line: five options that share the
              width rather than five pills that wrap. */}
          <div className="ml-auto hidden gap-1 sm:flex">
            {SPEED_OPTIONS.map((option) => (
              <SpeedButton
                key={option}
                option={option}
                isActive={option === speed}
                onSelect={onChangeSpeed}
              />
            ))}
          </div>
        </div>

        <div className="mt-2 flex gap-1 sm:hidden">
          {SPEED_OPTIONS.map((option) => (
            <SpeedButton
              key={option}
              option={option}
              isActive={option === speed}
              onSelect={onChangeSpeed}
              className="flex-1"
            />
          ))}
        </div>

        <div className="mt-3.5 grid gap-2">
          <div className="flex items-center justify-between text-eyebrow font-bold uppercase text-white/60">
            <span>Lap {currentLap}</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          
          <div className="relative w-full h-1.5 mt-1">
            {/* The visual progress track */}
            <div className="absolute inset-0 h-full overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full rounded-full bg-accent"
                style={{ width: widthStr }}
              />
            </div>
            {/* The visible scrubber head (thumb) */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-foreground border-2 border-accent pointer-events-none"
              style={{ left: thumbStrCompact }}
            />
            {/* The invisible interactive range slider on top */}
            <input
              type="range"
              min={1}
              max={Math.max(1, maxLap)}
              step={1}
              value={Math.max(1, currentLap)}
              onChange={(event) => onJumpToLap(Number(event.target.value))}
              className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
              aria-label="Lap scrubber"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-panel p-5 shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={onPlayPause}>
              {isPlaying ? "Pause Replay" : "Play Replay"}
            </Button>
            <Button type="button" variant="secondary" onClick={onRestart}>
              Restart
            </Button>
            <Button type="button" variant="secondary" onClick={onPrevious} disabled={!canStepBackward}>
              Previous Lap
            </Button>
            <Button type="button" variant="secondary" onClick={onNext} disabled={!canStepForward}>
              Next Lap
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between gap-4 text-eyebrow font-semibold uppercase text-muted">
              <span>Lap scrubber</span>
              <span>
                Lap {currentLap} / {maxLap}
              </span>
            </div>
            
            <div className="relative w-full h-2 mt-3">
              {/* The visual progress track */}
              <div className="absolute inset-0 h-full overflow-hidden rounded-full bg-line">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  style={{ width: widthStr }}
                />
              </div>
              {/* The visible scrubber head (thumb) */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-foreground border-2 border-accent pointer-events-none"
                style={{ left: thumbStrNormal }}
              />
              {/* The invisible interactive range slider on top */}
              <input
                type="range"
                min={1}
                max={Math.max(1, maxLap)}
                step={1}
                value={Math.max(1, currentLap)}
                onChange={(event) => onJumpToLap(Number(event.target.value))}
                className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-eyebrow font-bold uppercase text-foreground">
              Playback speed
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SPEED_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChangeSpeed(option)}
                  className={
                    option === speed
                      ? "rounded-full bg-accent-fill px-4 py-2 text-eyebrow font-semibold uppercase text-on-accent"
                      : "rounded-full border border-line bg-panel px-4 py-2 text-eyebrow font-semibold uppercase text-foreground transition-colors hover:bg-panel-strong"
                  }
                >
                  {option}x
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-line bg-panel px-4 py-3">
              <p className="text-eyebrow font-bold uppercase text-muted">
                Current lap
              </p>
              <p className="tabular mt-2 font-heading text-3xl leading-none text-foreground">
                {currentLap}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-panel px-4 py-3">
              <p className="text-eyebrow font-bold uppercase text-muted">
                Progress
              </p>
              <p className="tabular mt-2 font-heading text-3xl leading-none text-foreground">
                {Math.round(progressPercent)}%
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-panel px-4 py-3">
              <p className="text-eyebrow font-bold uppercase text-muted">
                Speed
              </p>
              <p className="tabular mt-2 font-heading text-3xl leading-none text-foreground">
                {speed}x
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
