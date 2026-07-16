const File = require("@saltcorn/data/models/file");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";

// All streams are conformed to this before concat/mix so that inputs with
// differing sample rates or channel counts (e.g. a mono voice memo) don't
// break the filter graph or produce artifacts. Change here if you want a
// different working format for the render.
const FMT =
  "aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo";

const ms2s = (ms) => (ms / 1000).toFixed(3);

async function probeDurationMs(file) {
  const { stdout } = await execFileAsync(FFPROBE, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  const seconds = parseFloat(stdout.trim());
  if (!Number.isFinite(seconds))
    throw new Error(`Could not read duration of ${file}`);
  return Math.round(seconds * 1000);
}

/**
 * Mix a podcast from intro + N voice segments (separated by a divider) + outro.
 *
 * Timeline (all values in ms):
 *   - intro plays full for (introDuration - crossfadeIntro), then fades out over crossfadeIntro
 *   - segment 1 starts introSegmentDelay after the intro fade BEGAN (so it overlaps the fade)
 *   - segments play back-to-back with `divider` between each pair
 *   - outro fades in over crossfadeOutro, starting outroSegmentDelay before the last segment ends
 *   - output ends when the outro ends
 *
 * @param {object}   opts
 * @param {string}   opts.output              Output mp3 path.
 * @param {string}   opts.intro               Intro mp3.
 * @param {string}   opts.outro               Outro mp3.
 * @param {string[]} opts.segments            One or more voice segment mp3s (in order).
 * @param {string}   [opts.divider]           Divider mp3, required when segments.length > 1.
 * @param {number}   [opts.crossfadeIntro=2000]     Intro fade-out duration.
 * @param {number}   [opts.introSegmentDelay=2000]  Delay from start of intro fade to segment 1.
 * @param {number}   [opts.crossfadeOutro=2000]     Outro fade-in duration.
 * @param {number}   [opts.outroSegmentDelay=2000]  How long before the last segment ends the outro begins.
 * @returns {Promise<{output:string, durationMs:number, timeline:object}>}
 */
async function mixPodcast(opts) {
  const {
    output,
    intro,
    outro,
    segments,
    divider,
    crossfadeIntro = 2000,
    introSegmentDelay = 2000,
    crossfadeOutro = 2000,
    outroSegmentDelay = 2000,
  } = opts;

  if (!output) throw new Error("output is required");
  if (!intro) throw new Error("intro is required");
  if (!outro) throw new Error("outro is required");
  if (!Array.isArray(segments) || segments.length === 0)
    throw new Error("segments must be a non-empty array");

  const use_output = File.get_new_path(output, true);

  const needDivider = segments.length > 1;
  if (needDivider && !divider)
    throw new Error("divider is required when there is more than one segment");

  // --- probe every clip's real duration (ms) ---
  const [IDur, ODur, segDurs, DDur] = await Promise.all([
    probeDurationMs(intro),
    probeDurationMs(outro),
    Promise.all(segments.map(probeDurationMs)),
    needDivider ? probeDurationMs(divider) : Promise.resolve(0),
  ]);

  // --- a fade can't be longer than the clip it lives on ---
  const cfIntro = Math.min(crossfadeIntro, IDur);
  const cfOutro = Math.min(crossfadeOutro, ODur);
  if (cfIntro !== crossfadeIntro)
    console.warn(`crossfadeIntro clamped to intro length (${IDur}ms)`);
  if (cfOutro !== crossfadeOutro)
    console.warn(`crossfadeOutro clamped to outro length (${ODur}ms)`);

  // --- timeline math (absolute ms) ---
  const introFadeStart = IDur - cfIntro; // intro begins fading here
  let segStart = introFadeStart + introSegmentDelay; // segment 1 absolute start
  const bodyDuration =
    segDurs.reduce((a, b) => a + b, 0) + (segments.length - 1) * DDur;
  const chainEnd = segStart + bodyDuration; // last segment finishes
  let outroStart = chainEnd - outroSegmentDelay; // outro begins fading in

  if (segStart < 0) {
    console.warn("segment start < 0; clamping to 0");
    segStart = 0;
  }
  if (outroStart < 0) {
    console.warn("outro start < 0; clamping to 0");
    outroStart = 0;
  }

  // --- input order: 0=intro, 1=outro, 2..=segments, last=divider (if needed) ---
  const inputs = [intro, outro, ...segments];
  if (needDivider) inputs.push(divider);
  const dividerIndex = needDivider ? inputs.length - 1 : -1;

  const parts = [];

  // intro: conform -> fade out at the tail (stays at t=0, no delay)
  parts.push(
    `[0:a]${FMT},afade=t=out:st=${ms2s(introFadeStart)}:d=${ms2s(cfIntro)}[intro]`,
  );

  // outro: conform -> fade in from its own t=0 -> delay into absolute position
  parts.push(
    `[1:a]${FMT},afade=t=in:st=0:d=${ms2s(cfOutro)},adelay=${outroStart}:all=1[outro]`,
  );

  // segments: conform each
  segments.forEach((_, i) => parts.push(`[${i + 2}:a]${FMT}[s${i}]`));

  // body: interleave segments with divider copies, then shift into place
  if (!needDivider) {
    parts.push(`[s0]adelay=${segStart}:all=1[body]`);
  } else {
    const dividerCount = segments.length - 1;
    if (dividerCount === 1) {
      parts.push(`[${dividerIndex}:a]${FMT}[d0]`);
    } else {
      // the divider input is reused between every pair, so split it into copies
      const outs = Array.from(
        { length: dividerCount },
        (_, i) => `[d${i}]`,
      ).join("");
      parts.push(`[${dividerIndex}:a]${FMT},asplit=${dividerCount}${outs}`);
    }
    const concatInputs = [];
    segments.forEach((_, i) => {
      concatInputs.push(`[s${i}]`);
      if (i < segments.length - 1) concatInputs.push(`[d${i}]`);
    });
    parts.push(
      `${concatInputs.join("")}concat=n=${concatInputs.length}:v=0:a=1,adelay=${segStart}:all=1[body]`,
    );
  }

  // sum the three time-positioned streams (normalize=0 keeps them at full level)
  parts.push(
    `[intro][outro][body]amix=inputs=3:duration=longest:normalize=0[mix]`,
  );

  const filterComplex = parts.join(";");

  const args = [];
  for (const f of inputs) args.push("-i", f);
  args.push(
    "-filter_complex",
    filterComplex,
    "-map",
    "[mix]",
    "-c:a",
    "libmp3lame",
    "-q:a",
    "2",
    "-y",
    use_output,
  );

  await execFileAsync(FFMPEG, args);
  const relPath = File.absPathToServePath(use_output);

  const totalMs = outroStart + ODur;
  return {
    output: use_output,
    file: await File.findOne(relPath),
    durationMs: totalMs,
    timeline: {
      IDur,
      ODur,
      introFadeStart,
      segStart,
      chainEnd,
      outroStart,
      totalMs,
    },
  };
}

module.exports = {
  run: mixPodcast,
  isAsync: true,
  description: "Mix audio files for a podcast",
  arguments: [
    {
      name: "options",
      type: "JSON",
      tstype: `{output: string, intro: string, outro: string, segments: string[], divider?: string, crossfadeIntro?:number,crossfadeOutro?:number, introSegmentDelay?:number,outroSegmentDelay?: number}`,
      required: true,
    },
  ],
};
