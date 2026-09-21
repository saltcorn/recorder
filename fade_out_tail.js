const File = require("@saltcorn/data/models/file");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";

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
 * Fade the tail of a clip out to silence. Used to soften trailing
 * artifacts (e.g. a breath sound) right before the clip is followed by
 * something else, such as a divider or the outro.
 *
 * @param {object} opts
 * @param {string} opts.output       Output mp3 path.
 * @param {string} opts.input        Input mp3.
 * @param {number} [opts.fadeMs=1300] Fade-out duration at the very end.
 * @returns {Promise<{output:string, file:object, durationMs:number}>}
 */
async function fadeOutTail(opts) {
  const { output, input, fadeMs = 1300 } = opts;

  if (!output) throw new Error("output is required");
  if (!input) throw new Error("input is required");

  const use_output = File.get_new_path(output, true);
  const durMs = await probeDurationMs(input);
  const fadeStart = Math.max(0, durMs - fadeMs);

  const args = [
    "-i",
    input,
    "-af",
    `afade=t=out:st=${ms2s(fadeStart)}:d=${ms2s(fadeMs)}`,
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
    durationMs: durMs,
  };
}

module.exports = {
  run: fadeOutTail,
  isAsync: true,
  description:
    "Fade the tail of a clip out to silence, to soften trailing artifacts before the next clip",
  arguments: [
    {
      name: "options",
      type: "JSON",
      tstype: `{output: string, input: string, fadeMs?: number}`,
      required: true,
    },
  ],
};
