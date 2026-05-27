//npx esbuild waveplayer.js --bundle --format=iife --global-name=WavePlayer --outfile=waveplayer.browser.js
"use strict";
var WavePlayer = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // waveplayer.js
  var require_waveplayer = __commonJS({
    "waveplayer.js"(exports) {
      function e(e2, t2, i2, r2) {
        return new (i2 || (i2 = Promise))(function(s2, n2) {
          function a2(e3) {
            try {
              h2(r2.next(e3));
            } catch (e4) {
              n2(e4);
            }
          }
          function o2(e3) {
            try {
              h2(r2.throw(e3));
            } catch (e4) {
              n2(e4);
            }
          }
          function h2(e3) {
            var t3;
            e3.done ? s2(e3.value) : (t3 = e3.value, t3 instanceof i2 ? t3 : new i2(function(e4) {
              e4(t3);
            })).then(a2, o2);
          }
          h2((r2 = r2.apply(e2, t2 || [])).next());
        });
      }
      var t = (e2, t2, i2) => e2 * (1 - i2) + t2 * i2;
      var i = (e2) => {
        let t2 = (3 + Math.log10(Math.min(Math.max(Math.abs(e2), 1e-3), 1))) / 3;
        return e2 < 0 && (t2 *= -1), t2;
      };
      var r = (r2, s2, n2) => e(void 0, void 0, void 0, function* () {
        var e2;
        const { points: a2, normalise: o2, logarithmic: h2 } = n2, l2 = yield s2.decodeAudioData(r2), d2 = Array(l2.numberOfChannels).fill(new Array(a2));
        for (let i2 = 0; i2 < l2.numberOfChannels; i2++) {
          const r3 = l2.getChannelData(i2), s3 = r3.length / a2;
          for (let n3 = 0, o3 = 0; n3 < a2; n3++, o3 += s3) {
            const s4 = Math.floor(o3);
            d2[i2][n3] = t(r3[s4], null !== (e2 = r3[s4 + 1]) && void 0 !== e2 ? e2 : 0, o3 - s4);
          }
        }
        const c2 = l2.numberOfChannels > 1 ? ((e3) => {
          const t2 = Array(e3[0].length);
          for (let i2 = 0; i2 < t2.length; i2++) {
            let r3 = 0;
            for (const t3 of e3) r3 += t3[i2];
            t2[i2] = r3 / e3.length;
          }
          return t2;
        })(d2) : d2[0];
        if (h2) for (let e3 = 0; e3 < c2.length; e3++) c2[e3] = i(c2[e3]);
        if (o2) {
          const e3 = Math.max.apply(null, c2.map(Math.abs));
          for (let t2 = 0; t2 < c2.length; t2++) c2[t2] = c2[t2] / e3;
        }
        return c2;
      });
      var s = class extends Error {
        constructor(e2, t2) {
          super(t2), Object.defineProperty(this, "status", { enumerable: true, configurable: true, writable: true, value: void 0 }), this.status = e2;
        }
      };
      var n = (e2, t2) => {
        for (const i2 in t2) e2.style.getPropertyValue(i2) !== t2[i2] && e2.style.setProperty(i2, t2[i2]);
        return e2;
      };
      var a = (e2, t2, i2) => {
        let r2 = 0;
        const s2 = Math.floor(t2), n2 = Math.floor(i2);
        for (let t3 = Math.min(s2, n2); t3 < Math.max(s2, n2); t3++) r2 += Math.abs(e2[t3]);
        return r2 / Math.abs(s2 - n2);
      };
      var o = ({ r: e2, g: t2, b: i2 }) => {
        let r2;
        const s2 = Math.max(e2, t2, i2), n2 = s2 - Math.min(e2, t2, i2);
        r2 = 0 === n2 ? 0 : e2 === s2 ? (t2 - i2) / n2 % 6 : t2 === s2 ? (i2 - e2) / n2 + 2 : (e2 - t2) / n2 + 4, r2 = Math.round(60 * r2), r2 < 0 && (r2 += 360);
        return { h: r2, s: Math.round(100 * (0 === s2 ? 0 : n2 / s2)), v: Math.round(s2 / 255 * 100) };
      };
      var h = ({ h: e2, s: t2, v: i2 }) => {
        e2 /= 60, t2 /= 100, i2 = i2 / 100 * 255;
        const r2 = Math.floor(e2), s2 = [i2 * (1 - t2), i2 * (1 - t2 * (e2 - r2)), i2 * (1 - t2 * (1 - (e2 - r2)))].map((e3) => Math.round(e3));
        switch (i2 = Math.round(i2), r2) {
          case 0:
            return { r: i2, g: s2[2], b: s2[0] };
          case 1:
            return { r: s2[1], g: i2, b: s2[0] };
          case 2:
            return { r: s2[0], g: i2, b: s2[2] };
          case 3:
            return { r: s2[0], g: s2[1], b: i2 };
          case 4:
            return { r: s2[2], g: s2[0], b: i2 };
          default:
            return { r: i2, g: s2[0], b: s2[1] };
        }
      };
      var l = (e2, t2) => t2.reduce((t3, i2) => (Object.hasOwn(e2, i2) && (t3[i2] = e2[i2]), t3), {});
      var d = class _d {
        constructor(e2, t2 = {}) {
          Object.defineProperty(this, "_view", { enumerable: true, configurable: true, writable: true, value: void 0 }), Object.defineProperty(this, "_options", { enumerable: true, configurable: true, writable: true, value: void 0 }), Object.defineProperty(this, "_audioElement", { enumerable: true, configurable: true, writable: true, value: void 0 }), Object.defineProperty(this, "_canPlayHandler", { enumerable: true, configurable: true, writable: true, value: void 0 }), Object.defineProperty(this, "_timeUpdateHandler", { enumerable: true, configurable: true, writable: true, value: void 0 }), Object.defineProperty(this, "_errorHandler", { enumerable: true, configurable: true, writable: true, value: void 0 }), Object.defineProperty(this, "_clickHandler", { enumerable: true, configurable: true, writable: true, value: void 0 }), this._view = e2, this._options = Object.assign(Object.assign({}, _d._defaultOptions), t2), this._options.audioElement ? this._audioElement = this.resolveAudioElement() : (this._audioElement = this.createAudioElement(), this._view.container.appendChild(this._audioElement)), this.initialise();
        }
        get volume() {
          return this._audioElement.volume;
        }
        set volume(e2) {
          this._audioElement.volume = e2;
        }
        get currentTime() {
          return this._audioElement.currentTime;
        }
        set currentTime(e2) {
          this._audioElement.currentTime = e2;
        }
        get duration() {
          return this._audioElement.duration;
        }
        get paused() {
          return this._audioElement.paused;
        }
        get view() {
          return this._view;
        }
        get audioElement() {
          return this._audioElement;
        }
        resolveAudioElement() {
          const e2 = "string" == typeof this._options.audioElement ? document.querySelector(this._options.audioElement) : this._options.audioElement;
          if (!e2) throw new Error("Audio element could not be located.");
          return e2.controls = false, e2.autoplay = false, e2.preload = this._options.preload, e2;
        }
        createAudioElement() {
          const e2 = document.createElement("audio");
          return e2.controls = false, e2.autoplay = false, e2.preload = this._options.preload, e2;
        }
        initialise() {
          return this._timeUpdateHandler && this._clickHandler || (this._timeUpdateHandler = (e2) => {
            const t2 = e2.currentTarget;
            t2 instanceof HTMLAudioElement && (this._view.progress = t2.currentTime / this._audioElement.duration);
          }, this._clickHandler = () => {
            this.currentTime = this._view.progress * this._audioElement.duration;
          }, this._audioElement.addEventListener("timeupdate", this._timeUpdateHandler.bind(this)), this._view.canvas.addEventListener("click", this._clickHandler.bind(this))), this;
        }
        load(t2, i2) {
          return e(this, void 0, void 0, function* () {
            return yield Promise.all([this.loadAudio(t2), this.loadWaveform(t2, i2)]), this;
          });
        }
        loadAudio(e2) {
          return this._canPlayHandler && this._errorHandler && (this._audioElement.removeEventListener("canplay", this._canPlayHandler), this._audioElement.removeEventListener("error", this._errorHandler)), this._audioElement.src = e2, this._audioElement.load(), new Promise((e3, t2) => {
            this._canPlayHandler = () => e3(this), this._errorHandler = (e4) => {
              const i2 = e4.currentTarget;
              if (!(i2 instanceof HTMLAudioElement)) return;
              const r2 = i2.error;
              if (r2) switch (r2.code) {
                case r2.MEDIA_ERR_ABORTED:
                  return void t2(new Error("Fetching process aborted by user."));
                case r2.MEDIA_ERR_NETWORK:
                  return void t2(new Error("There was a problem downloading the audio file."));
                case r2.MEDIA_ERR_DECODE:
                  return void t2(new Error("There was a problem decoding the audio file."));
                case r2.MEDIA_ERR_SRC_NOT_SUPPORTED:
                  return void t2(new Error("The audio file is not supported."));
                default:
                  t2(new Error("An unknown error occurred."));
              }
            }, this._audioElement.addEventListener("canplay", this._canPlayHandler.bind(this)), this._audioElement.addEventListener("error", this._errorHandler.bind(this));
          });
        }
        loadWaveform(t2, i2) {
          return e(this, void 0, void 0, function* () {
            return ((e2) => "data" === e2.type)(i2) ? this.applyDataStrategy(i2) : ((e2) => "json" === e2.type)(i2) ? this.applyJsonStrategy(i2) : ((e2) => "webAudio" === e2.type)(i2) && this.applyWebAudioStrategy(t2, i2), Promise.resolve(this);
          });
        }
        applyDataStrategy({ data: e2 }) {
          this._view.data = Array.isArray(e2) ? e2 : e2[Object.keys(e2)[0]];
        }
        applyJsonStrategy(t2) {
          return e(this, void 0, void 0, function* () {
            const { url: e2, cache: i2 } = Object.assign({ cache: true }, t2), r2 = yield this.resolveData(e2, i2, () => ((e3) => new Promise((t3, i3) => {
              const r3 = new XMLHttpRequest();
              r3.open("GET", e3), r3.responseType = "json", r3.onload = () => {
                200 === r3.status ? t3(r3.response) : i3(new s(r3.status, r3.statusText));
              }, r3.send();
            }))(e2));
            this.applyDataStrategy({ data: r2 });
          });
        }
        applyWebAudioStrategy(t2, i2) {
          return e(this, void 0, void 0, function* () {
            const { points: s2, normalise: n2, logarithmic: a2, cache: o2 } = Object.assign({ points: 800, normalise: true, logarithmic: true, cache: true }, i2), h2 = yield this.resolveData(t2, o2, () => ((t3, i3 = {}) => new Promise((s3) => {
              const n3 = new AudioContext(), a3 = new XMLHttpRequest();
              a3.open("GET", t3), a3.responseType = "arraybuffer", a3.onload = () => e(void 0, void 0, void 0, function* () {
                const e2 = yield r(a3.response, n3, Object.assign({ points: 800, normalise: true, logarithmic: true }, i3));
                s3(e2);
              }), a3.send();
            }))(t2, { points: s2, normalise: n2, logarithmic: a2 }));
            this.applyDataStrategy({ data: h2 });
          });
        }
        resolveData(t2, i2, r2) {
          return e(this, void 0, void 0, function* () {
            const e2 = this.cacheKey(t2), s2 = i2 && this.cachedDataExists(e2) ? this.parseCachedData(e2) : yield r2();
            return i2 && localStorage.setItem(e2, JSON.stringify(s2)), s2;
          });
        }
        cacheKey(e2) {
          return `waveplayer:${e2}`;
        }
        cachedDataExists(e2) {
          return null !== localStorage.getItem(e2);
        }
        parseCachedData(e2) {
          const t2 = JSON.parse(localStorage.getItem(e2) || "");
          return ((e3) => Array.isArray(e3) || null !== e3)(t2) ? t2 : [];
        }
        play() {
          return e(this, void 0, void 0, function* () {
            return yield this._audioElement.play(), this;
          });
        }
        pause() {
          return this._audioElement.pause(), this;
        }
        destroy() {
          this.pause(), this._timeUpdateHandler && this._audioElement.removeEventListener("timeupdate", this._timeUpdateHandler), this._canPlayHandler && this._audioElement.removeEventListener("canplay", this._canPlayHandler), this._errorHandler && this._audioElement.removeEventListener("error", this._errorHandler), this._clickHandler && this._view.canvas.removeEventListener("click", this._clickHandler), this._options.audioElement || this._view.container.removeChild(this._audioElement), this._view.destroy();
        }
      };
      Object.defineProperty(d, "_defaultOptions", { enumerable: true, configurable: true, writable: true, value: { preload: "metadata" } });
      var c = class _c {
        constructor(e2, t2, i2 = {}) {
          if (Object.defineProperty(this, "_options", { enumerable: true, configurable: true, writable: true, value: void 0 }), Object.defineProperty(this, "_player", { enumerable: true, configurable: true, writable: true, value: void 0 }), Object.defineProperty(this, "_tracks", { enumerable: true, configurable: true, writable: true, value: void 0 }), Object.defineProperty(this, "_current", { enumerable: true, configurable: true, writable: true, value: 0 }), Object.defineProperty(this, "_ended", { enumerable: true, configurable: true, writable: true, value: false }), Object.defineProperty(this, "_endedHandler", { enumerable: true, configurable: true, writable: true, value: void 0 }), !t2.length) throw new Error("A playlist needs to contain at least one track.");
          this._player = e2, this._tracks = t2, this._options = Object.assign(Object.assign({}, _c._defaultOptions), i2), this.initialise();
        }
        initialise() {
          return this._endedHandler || (this._endedHandler = () => e(this, void 0, void 0, function* () {
            yield this.next();
          }), this._player.audioElement.addEventListener("ended", this._endedHandler.bind(this))), this;
        }
        get forcePlay() {
          return this._options.forcePlay;
        }
        set forcePlay(e2) {
          this._options = Object.assign(Object.assign({}, this._options), { forcePlay: e2 });
        }
        get player() {
          return this._player;
        }
        get current() {
          return this._current;
        }
        get ended() {
          return this._ended;
        }
        play() {
          return e(this, void 0, void 0, function* () {
            return this._player.paused ? (yield this.handleCurrentTrack(false), yield this._player.play(), this) : this;
          });
        }
        pause() {
          return this._player.paused || this._player.pause(), this;
        }
        prepare() {
          return this.reset();
        }
        reset() {
          return e(this, void 0, void 0, function* () {
            return this.pause(), this._current = 0, this._ended = false, yield this.handleCurrentTrack(false), Promise.resolve(this);
          });
        }
        next() {
          return e(this, void 0, void 0, function* () {
            return this._current < this._tracks.length - 1 ? (this._current++, this._ended = false, yield this.handleCurrentTrack(this._options.forcePlay)) : this._ended = true, this;
          });
        }
        previous() {
          return e(this, void 0, void 0, function* () {
            return this._current > 0 && (this._current--, this._ended = false, yield this.handleCurrentTrack(this._options.forcePlay)), this;
          });
        }
        select(t2) {
          return e(this, void 0, void 0, function* () {
            return t2 >= 0 && t2 < this._tracks.length && (this._current = t2, this._ended = false, yield this.handleCurrentTrack(this._options.forcePlay)), this;
          });
        }
        handleCurrentTrack(t2) {
          return e(this, void 0, void 0, function* () {
            const e2 = this._player.paused;
            this._player.pause();
            const { url: i2, strategy: r2 } = this._tracks[this._current];
            yield this._player.load(i2, r2), !t2 && e2 || this._player.play();
          });
        }
        destroy() {
          this._endedHandler && this._player.audioElement.removeEventListener("ended", this._endedHandler), this._player.destroy();
        }
      };
      Object.defineProperty(c, "_defaultOptions", { enumerable: true, configurable: true, writable: true, value: { forcePlay: true } });
      var u = class _u {
        constructor(e2, t2) {
          Object.defineProperty(this, "_data", { enumerable: true, configurable: true, writable: true, value: void 0 }), Object.defineProperty(this, "_barCoordinates", { enumerable: true, configurable: true, writable: true, value: void 0 }), Object.defineProperty(this, "_progress", { enumerable: true, configurable: true, writable: true, value: 0 }), Object.defineProperty(this, "_options", { enumerable: true, configurable: true, writable: true, value: void 0 }), Object.defineProperty(this, "_container", { enumerable: true, configurable: true, writable: true, value: void 0 }), Object.defineProperty(this, "_waveContainer", { enumerable: true, configurable: true, writable: true, value: void 0 }), Object.defineProperty(this, "_canvas", { enumerable: true, configurable: true, writable: true, value: void 0 }), Object.defineProperty(this, "_colors", { enumerable: true, configurable: true, writable: true, value: void 0 }), Object.defineProperty(this, "_resizeHandler", { enumerable: true, configurable: true, writable: true, value: void 0 }), Object.defineProperty(this, "_clickHandler", { enumerable: true, configurable: true, writable: true, value: void 0 }), this._data = e2, this._options = Object.assign(Object.assign({}, _u._defaultOptions), t2), this._container = this.resolveContainer(this._options.container), this._waveContainer = this.createWaveContainer(), this._canvas = this.createCanvas(), this._colors = this.createColorVariations(), this._options.responsive && this.addResizeHandler(), this._options.interact && this.addClickHandler();
        }
        get data() {
          return this._data;
        }
        set data(e2) {
          this._data = e2, this._options.redraw && this.draw();
        }
        get progress() {
          return this._progress;
        }
        set progress(e2) {
          this._progress = Math.max(Math.min(e2, 1), 0), this._options.redraw && (this.clear(), this.drawBars(...this.computeBarCoordinates(true)));
        }
        get container() {
          return this._container;
        }
        set container(e2) {
          this._container = this.resolveContainer(e2);
        }
        get canvas() {
          return this._canvas;
        }
        get width() {
          return this._options.width;
        }
        set width(e2) {
          this._options = Object.assign(Object.assign({}, this._options), { width: e2 }), this._options.responsive || (n(this._waveContainer, { width: `${this._options.width}px` }), n(this._canvas, { width: `${this._options.width}px` }), this._canvas.width = this._options.width, this._options.redraw && this.draw());
        }
        get height() {
          return this._options.height;
        }
        set height(e2) {
          this._options = Object.assign(Object.assign({}, this._options), { height: e2 }), n(this._waveContainer, { height: `${this._options.height}px` }), n(this._canvas, { height: `${this._options.height}px` }), this._canvas.height = this._options.height, this._options.redraw && this.draw();
        }
        get barWidth() {
          return this._options.barWidth;
        }
        set barWidth(e2) {
          this._options = Object.assign(Object.assign({}, this._options), { barWidth: e2 }), this._options.redraw && this.draw();
        }
        get barGap() {
          return this._options.barGap;
        }
        set barGap(e2) {
          this._options = Object.assign(Object.assign({}, this._options), { barGap: e2 }), this._options.redraw && this.draw();
        }
        get responsive() {
          return this._options.responsive;
        }
        set responsive(e2) {
          this._options = Object.assign(Object.assign({}, this._options), { responsive: e2 }), e2 ? this.addResizeHandler() : this.removeResizeHandler();
        }
        get gradient() {
          return this._options.gradient;
        }
        set gradient(e2) {
          this._options = Object.assign(Object.assign({}, this._options), { gradient: e2 }), this._options.redraw && (this.clear(), this.drawBars(...this.computeBarCoordinates(true)));
        }
        get interact() {
          return this._options.interact;
        }
        set interact(e2) {
          this._options = Object.assign(Object.assign({}, this._options), { interact: e2 }), e2 ? this.addClickHandler() : this.removeClickHandler();
        }
        get redraw() {
          return this._options.redraw;
        }
        set redraw(e2) {
          this._options = Object.assign(Object.assign({}, this._options), { redraw: e2 });
        }
        resolveContainer(e2) {
          const t2 = "string" == typeof e2 ? document.querySelector(e2) : e2;
          if (!t2) throw new Error("Container element could not be located.");
          return t2;
        }
        createWaveContainer() {
          const e2 = document.createElement("div");
          return e2.className = "waveplayer-waveform-container", n(this._container.appendChild(e2), { display: "block", position: "relative", width: this._options.responsive ? "100%" : `${this._options.width}px`, height: `${this._options.height}px`, overflow: "hidden" }), e2;
        }
        createCanvas() {
          const e2 = document.createElement("canvas"), { clientWidth: t2 } = this._waveContainer;
          return n(this._waveContainer.appendChild(e2), { position: "absolute", top: "0", bottom: "0", zIndex: "1", height: `${this._options.height}px`, width: `${t2}px` }), e2.width = t2, e2.height = this._options.height, e2;
        }
        createColorVariations() {
          const e2 = (e3) => {
            const t2 = ((e4) => {
              const t3 = Number.parseInt("#" === e4.charAt(0) ? e4.substring(1, 7) : e4, 16);
              return { r: t3 >> 16 & 255, g: t3 >> 8 & 255, b: 255 & t3 };
            })(e3), i2 = o(t2);
            return [t2, h({ h: i2.h, s: i2.s, v: 1.4 * i2.v })];
          };
          return { waveformColor: e2(this._options.waveformColor), progressColor: e2(this._options.progressColor) };
        }
        addResizeHandler() {
          n(this._waveContainer, { width: "100%" }), this._resizeHandler && window.removeEventListener("resize", this._resizeHandler), this._resizeHandler = () => {
            (/* @__PURE__ */ ((e2, t2 = 250) => {
              let i2 = false;
              return () => {
                i2 || (i2 = true, setTimeout(() => {
                  e2(), i2 = false;
                }, t2));
              };
            })(() => {
              const e2 = this._waveContainer.clientWidth;
              n(this._canvas, { width: `${e2}px` }), this._canvas.width = e2, this.draw();
            }, 250))();
          }, window.addEventListener("resize", this._resizeHandler);
        }
        removeResizeHandler() {
          this._resizeHandler && window.removeEventListener("resize", this._resizeHandler), n(this._waveContainer, { width: `${this._options.width}px` });
        }
        addClickHandler() {
          this._clickHandler && this._canvas.removeEventListener("click", this._clickHandler), this._clickHandler = (e2) => {
            this._progress = e2.offsetX / this._waveContainer.clientWidth, this.clear(), this.drawBars(...this.computeBarCoordinates(true));
          }, this._canvas.addEventListener("click", this._clickHandler);
        }
        removeClickHandler() {
          this._clickHandler && this._canvas.removeEventListener("click", this._clickHandler);
        }
        draw() {
          return this.clear(), this.drawBars(...this.computeBarCoordinates()), this;
        }
        clear() {
          const e2 = this._canvas.getContext("2d");
          return e2 && e2.clearRect(0, 0, this._canvas.width, this._canvas.height), this;
        }
        computeBarCoordinates(e2 = false) {
          if (e2 && this._barCoordinates) return this._barCoordinates;
          const t2 = [], i2 = [], r2 = this._waveContainer.clientWidth, s2 = this._options.barWidth + this._options.barGap, n2 = s2 * (this._data.length / r2);
          for (let e3 = 0, r3 = 0; r3 + s2 < this._data.length; e3 += s2, r3 += n2) t2.push(e3), i2.push(a(this._data, r3, r3 + s2));
          return this._barCoordinates = [t2, i2, 1 / Math.max(...i2)], this._barCoordinates;
        }
        drawBars(e2, t2, i2) {
          const r2 = this._canvas.getContext("2d");
          if (!r2) return;
          const s2 = this._progress * this._waveContainer.clientWidth, n2 = this._options.barWidth + this._options.barGap;
          r2.fillStyle = this._options.gradient ? this.createGradient(r2, this._colors.progressColor) : this.createColor(this._colors.progressColor[0]);
          let a2 = 0;
          for (; e2[a2] < s2 - n2; ) this.drawBar(r2, e2[a2], t2[a2], i2), a2++;
          for (; e2[a2] < s2; ) {
            const o2 = (s2 - e2[a2]) / n2, h2 = this.createProgressIndicatorColorVariation(o2);
            r2.fillStyle = this._options.gradient ? this.createGradient(r2, h2) : this.createColor(h2[0]), this.drawBar(r2, e2[a2], t2[a2], i2), a2++;
          }
          for (r2.fillStyle = this._options.gradient ? this.createGradient(r2, this._colors.waveformColor) : this.createColor(this._colors.waveformColor[0]); a2 < e2.length; ) this.drawBar(r2, e2[a2], t2[a2], i2), a2++;
        }
        drawBar(e2, t2, i2, r2) {
          const s2 = Math.max(this._canvas.height * i2 * r2, 0.5);
          e2.fillRect(t2, (this._canvas.height - s2) / 2, this._options.barWidth, s2);
        }
        createProgressIndicatorColorVariation(e2) {
          const t2 = this._colors.waveformColor[0].r - this._colors.progressColor[0].r, i2 = this._colors.waveformColor[0].g - this._colors.progressColor[0].g, r2 = this._colors.waveformColor[0].b - this._colors.progressColor[0].b, s2 = { r: this._colors.waveformColor[0].r - t2 * e2, g: this._colors.waveformColor[0].g - i2 * e2, b: this._colors.waveformColor[0].b - r2 * e2 }, n2 = o(s2);
          return [s2, h({ h: n2.h, s: n2.s, v: 1.4 * n2.v })];
        }
        createGradient(e2, t2) {
          const i2 = e2.createLinearGradient(0, 0, 0, e2.canvas.height), r2 = `rgba(${Object.values(t2[1]).join(", ")}, 1)`;
          return i2.addColorStop(0, r2), i2.addColorStop(0.3, `rgba(${Object.values(t2[0]).join(", ")}, 1)`), i2.addColorStop(1, r2), i2;
        }
        createColor(e2) {
          return `rgb(${Object.values(e2).join(", ")})`;
        }
        destroy() {
          this.removeClickHandler(), this.removeResizeHandler(), this._container.removeChild(this._waveContainer);
        }
      };
      Object.defineProperty(u, "_defaultOptions", { enumerable: true, configurable: true, writable: true, value: { width: 512, height: 128, waveformColor: "#428bca", progressColor: "#31708f", barWidth: 4, barGap: 1, responsive: true, gradient: true, interact: true, redraw: true } });
      var p = ["audioElement", "preload"];
      var _ = ["container", "width", "height", "waveformColor", "progressColor", "barWidth", "barGap", "responsive", "gradient", "interact", "redraw"];
      exports.Factory = class {
        static createPlayer(e2) {
          return new d(new u([], l(e2, _)), l(e2, p));
        }
        static createPlaylist(e2, t2) {
          const i2 = new d(new u([], l(t2, _)), l(t2, p));
          return new c(i2, e2);
        }
      }, exports.Player = d, exports.Playlist = c, exports.View = u;
    }
  });
  return require_waveplayer();
})();
