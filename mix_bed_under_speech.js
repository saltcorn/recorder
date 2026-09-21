const File = require("@saltcorn/data/models/file");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";

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
 * Mix a background bed underneath a speech clip (e.g. a spoken intro or
 * outro). The bed starts first, alone, for `leadInMs`; the speech then
 * comes in on top of it. The bed keeps running after the speech ends and
 * fades out over `fadeOutMs`, starting exactly when the speech ends. The
 * bed is looped if it is shorter than needed.
 *
 * @param {object}   opts
 * @param {string}   opts.output              Output mp3 path.
 * @param {string}   opts.speech              Speech (voice) mp3.
 * @param {string}   opts.bed                 Background bed mp3.
 * @param {number}   [opts.bedVolume=0.2]     Bed volume relative to speech (0-1).
 * @param {number}   [opts.leadInMs=1500]     How long the bed plays alone before the speech starts.
 * @param {number}   [opts.fadeInMs=300]      Bed fade-in duration at the very start.
 * @param {number}   [opts.fadeOutMs=1500]    Bed fade-out duration, starting when speech ends.
 * @returns {Promise<{output:string, file:object, durationMs:number}>}
 */
async function mixBedUnderSpeech(opts) {
  const {
    output,
    speech,
    bed,
    bedVolume = 0.15,
    leadInMs = 1500,
    fadeInMs = 300,
    fadeOutMs = 1500,
  } = opts;

  if (!output) throw new Error("output is required");
  if (!speech) throw new Error("speech is required");
  if (!bed) throw new Error("bed is required");

  const use_output = File.get_new_path(output, true);

  const speechDur = await probeDurationMs(speech);
  const totalMs = leadInMs + speechDur + fadeOutMs;
  const fadeOutStart = leadInMs + speechDur; // fade begins exactly when speech ends

  const parts = [];
  // speech: conform, delayed so the bed has a head start
  parts.push(`[0:a]${FMT},adelay=${leadInMs}:all=1[speech]`);
  // bed: looped at input level (-stream_loop -1), conform, cut to totalMs,
  // lowered under the speech, short fade-in, fade-out starting when speech ends
  parts.push(
    `[1:a]${FMT},atrim=0:${ms2s(totalMs)},volume=${bedVolume},afade=t=in:st=0:d=${ms2s(fadeInMs)},afade=t=out:st=${ms2s(fadeOutStart)}:d=${ms2s(fadeOutMs)}[bed]`,
  );
  parts.push(`[speech][bed]amix=inputs=2:duration=longest:normalize=0[mix]`);

  const filterComplex = parts.join(";");

  const args = [
    "-i",
    speech,
    "-stream_loop",
    "-1",
    "-i",
    bed,
    "-filter_complex",
    filterComplex,
    "-map",
    "[mix]",
    "-t",
    ms2s(totalMs),
    "-c:a",
    "libmp3lame",
    "-q:a",
    "2",
    "-y",
    use_output,
  ];

  await execFileAsync(FFMPEG, args);
  const relPath = File.absPathToServePath(use_output);

  return {
    output: use_output,
    file: await File.findOne(relPath),
    durationMs: totalMs,
  };
}

module.exports = {
  run: mixBedUnderSpeech,
  isAsync: true,
  description:
    "Mix a background bed under a speech clip, fading the bed out a set time after the speech ends",
  arguments: [
    {
      name: "options",
      type: "JSON",
      tstype: `{output: string, speech: string, bed: string, bedVolume?: number, fadeInMs?: number, fadeOutMs?: number}`,
      required: true,
    },
  ],
};
