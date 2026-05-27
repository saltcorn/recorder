var continuousRecorder = (() => {
  var instances = {};

  function getMediaConstraints(device) {
    switch (device) {
      case "microphone":
        return { audio: true };
      case "camera":
        return { video: true };
      case "microphone and camera":
        return { audio: true, video: true };
      default:
        throw new Error("Invalid device type");
    }
  }

  function connectSocket() {
    var socket = io("/datastream", { transports: ["websocket"] });
    return new Promise(function (resolve, reject) {
      socket.on("connect", function () {
        resolve(socket);
      });
      socket.on("connect_error", function (err) {
        reject(err);
      });
    });
  }

  function openServerStream(socket, viewname, mimeType) {
    return new Promise(function (resolve, reject) {
      socket.emit(
        "open_data_stream",
        [viewname, undefined, "file", "ContinuousRecorder", { mimeType: mimeType }],
        function (ack) {
          if (ack.status === "ok") resolve(ack.target.file);
          else reject(new Error(ack.msg || "Failed to open stream"));
        }
      );
    });
  }

  function closeServerStream(socket) {
    return new Promise(function (resolve, reject) {
      socket.emit("close_data_stream", function (ack) {
        if (ack.status === "ok") resolve();
        else reject(new Error(ack.msg || "Failed to close stream"));
      });
    });
  }

  function stopMediaRecorder(mr) {
    return new Promise(function (resolve) {
      if (mr.state === "inactive") {
        resolve();
        return;
      }
      mr.onstop = resolve;
      mr.stop();
    });
  }

  function postInsertRow(viewname, filePath) {
    return fetch("/view/" + viewname + "/insert_row", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CSRF-Token": _sc_globalCsrf,
      },
      body: JSON.stringify({ file_path: filePath }),
    }).then(function (resp) {
      if (!resp.ok) throw new Error("Failed to insert row");
      return resp.json();
    });
  }

  function formatTime(seconds) {
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function updateStatus(viewname) {
    var inst = instances[viewname];
    var el = document.getElementById("cr-status-" + viewname);
    if (!el) return;
    if (inst.statusInterval) {
      clearInterval(inst.statusInterval);
      inst.statusInterval = null;
    }
    if (inst.state !== "recording") {
      el.innerHTML = "";
      return;
    }
    var update = function () {
      var elapsed = Math.floor((Date.now() - inst.segmentStart) / 1000);
      el.innerHTML =
        '<span class="badge bg-danger cr-pulse me-2">Recording</span>' +
        '<span class="me-2">' +
        formatTime(elapsed) +
        "</span>" +
        '<span class="badge bg-secondary">Segment ' +
        inst.segmentCount +
        "</span>";
    };
    update();
    inst.statusInterval = setInterval(update, 1000);
  }

  function setButtons(viewname, recording) {
    var startBtn = document.getElementById("cr-start-btn-" + viewname);
    var stopBtn = document.getElementById("cr-stop-btn-" + viewname);
    if (recording) {
      startBtn.classList.add("d-none");
      stopBtn.classList.remove("d-none");
    } else {
      startBtn.classList.remove("d-none");
      stopBtn.classList.add("d-none");
    }
  }

  function setBusy(viewname, busy) {
    var startBtn = document.getElementById("cr-start-btn-" + viewname);
    var stopBtn = document.getElementById("cr-stop-btn-" + viewname);
    startBtn.disabled = busy;
    stopBtn.disabled = busy;
  }

  async function acquireWakeLock(inst) {
    if (!("wakeLock" in navigator)) return;
    try {
      inst.wakeLock = await navigator.wakeLock.request("screen");
      inst.wakeLock.addEventListener("release", function () {
        inst.wakeLock = null;
      });
      inst.visibilityHandler = async function () {
        if (
          document.visibilityState === "visible" &&
          inst.state === "recording" &&
          !inst.wakeLock
        ) {
          try {
            inst.wakeLock = await navigator.wakeLock.request("screen");
          } catch (e) {}
        }
      };
      document.addEventListener("visibilitychange", inst.visibilityHandler);
    } catch (e) {
      console.warn("Wake lock not available:", e);
    }
  }

  async function releaseWakeLock(inst) {
    if (inst.visibilityHandler) {
      document.removeEventListener("visibilitychange", inst.visibilityHandler);
      inst.visibilityHandler = null;
    }
    if (inst.wakeLock) {
      try {
        await inst.wakeLock.release();
      } catch (e) {}
      inst.wakeLock = null;
    }
  }

  async function startSegment(viewname) {
    var inst = instances[viewname];
    inst.lastWritePromise = Promise.resolve();

    var filePath = await openServerStream(
      inst.socket,
      viewname,
      inst.mimeType
    );
    inst.currentFile = filePath;

    var mr = new MediaRecorder(inst.mediaStream);
    inst.mediaRecorder = mr;

    mr.ondataavailable = function (e) {
      if (e.data.size > 0) {
        inst.lastWritePromise = new Promise(function (resolve) {
          inst.socket.emit("write_to_stream", e.data, function () {
            resolve();
          });
        });
      }
    };

    mr.start(1000);
    inst.segmentStart = Date.now();
    inst.segmentCount = (inst.segmentCount || 0) + 1;

    if (inst.config.recording_duration > 0) {
      inst.segmentTimer = setTimeout(function () {
        rotateSegment(viewname);
      }, inst.config.recording_duration * 1000);
    }

    updateStatus(viewname);
  }

  async function rotateSegment(viewname) {
    var inst = instances[viewname];
    if (inst.state !== "recording") return;

    await stopMediaRecorder(inst.mediaRecorder);
    await inst.lastWritePromise;
    await closeServerStream(inst.socket);
    await postInsertRow(viewname, inst.currentFile);
    await startSegment(viewname);
  }

  return {
    init: function (config) {
      instances[config.viewname] = {
        config: config,
        state: "idle",
        segmentCount: 0,
        wakeLock: null,
        visibilityHandler: null,
      };
    },

    start: async function (viewname) {
      var inst = instances[viewname];
      if (!inst || inst.state === "recording") return;
      setBusy(viewname, true);
      try {
        var constraints = getMediaConstraints(inst.config.device);
        inst.mediaStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );

        var videoEl = document.getElementById("cr-video-" + viewname);
        if (videoEl) {
          videoEl.srcObject = inst.mediaStream;
          videoEl.play();
        }

        inst.socket = await connectSocket();

        // start a throwaway recorder briefly to discover the mimeType
        var probe = new MediaRecorder(inst.mediaStream);
        inst.mimeType = await new Promise(function (resolve) {
          probe.onstart = function () {
            resolve(probe.mimeType);
            probe.stop();
          };
          probe.start();
        });

        if (inst.config.acquire_wake_lock) {
          await acquireWakeLock(inst);
        }

        inst.state = "recording";
        inst.segmentCount = 0;
        setButtons(viewname, true);
        await startSegment(viewname);
      } catch (err) {
        inst.state = "idle";
        setButtons(viewname, false);
        updateStatus(viewname);
        if (inst.mediaStream) {
          inst.mediaStream.getTracks().forEach(function (t) {
            t.stop();
          });
          inst.mediaStream = null;
        }
        if (inst.socket) {
          inst.socket.close();
          inst.socket = null;
        }
        await releaseWakeLock(inst);
        notifyAlert({
          type: "danger",
          text: err.message || "Failed to start recording",
        });
      } finally {
        setBusy(viewname, false);
      }
    },

    stop: async function (viewname) {
      var inst = instances[viewname];
      if (!inst || inst.state !== "recording") return;
      setBusy(viewname, true);
      try {
        inst.state = "stopping";

        if (inst.segmentTimer) {
          clearTimeout(inst.segmentTimer);
          inst.segmentTimer = null;
        }

        await stopMediaRecorder(inst.mediaRecorder);
        await inst.lastWritePromise;

        inst.mediaStream.getTracks().forEach(function (t) {
          t.stop();
        });

        await closeServerStream(inst.socket);
        inst.socket.close();
        inst.socket = null;

        await postInsertRow(viewname, inst.currentFile);
        await releaseWakeLock(inst);

        var videoEl = document.getElementById("cr-video-" + viewname);
        if (videoEl) videoEl.pause();

        inst.state = "idle";
        setButtons(viewname, false);
        updateStatus(viewname);
      } catch (err) {
        inst.state = "idle";
        setButtons(viewname, false);
        updateStatus(viewname);
        notifyAlert({
          type: "danger",
          text: err.message || "Failed to stop recording",
        });
      } finally {
        setBusy(viewname, false);
      }
    },
  };
})();

var recordingHelpers = (() => {
  let currentRecorder = null;

  function Recorder(form, fieldName, device) {
    const viewName = form.attr("data-viewname");
    const idVal = form.find("[name=id]").attr("value");
    const id = idVal ? parseInt(idVal) : undefined;
    const timeSlice = 1000;

    let socket = null;
    let mediaRecorder = null;
    let mediaStream = null;
    let mimeType = null;
    let currentFile = null;

    const initSocket = () => {
      socket = io("/datastream", { transports: ["websocket"] });
      return new Promise((resolve, reject) => {
        socket.on("connect", () => {
          resolve();
        });
      });
    };

    const initMediaRecorder = async () => {
      let cfg = null;
      switch (device) {
        case "microphone":
          cfg = { audio: true };
          break;
        case "camera":
          cfg = { video: true };
          break;
        case "microphone and camera":
          cfg = { audio: true, video: true };
          break;
        default:
          throw new Error("Invalid device type");
      }
      mediaStream = await navigator.mediaDevices.getUserMedia(cfg);
      const video = document.getElementById(`${fieldName}-video-element`);
      if (video) {
        video.srcObject = mediaStream;
        video.play();
      }
      mediaRecorder = new MediaRecorder(mediaStream);
      const result = new Promise((resolve, reject) => {
        mediaRecorder.onstart = (e) => {
          resolve(mediaRecorder.mimeType);
        };
        mediaRecorder.onerror = (e) => {
          reject(e);
        };
      });
      mediaRecorder.start(timeSlice);
      return result;
    };

    const openStream = () => {
      const targetOpts = {
        mimeType: mimeType,
        oldTarget: currentFile,
      };
      return new Promise((resolve, reject) => {
        socket.emit(
          "open_data_stream",
          [viewName, id, fieldName, "Recorder", targetOpts],
          (ack) => {
            if (ack.status === "ok") {
              resolve(ack.target.file);
            } else {
              reject();
            }
          }
        );
      });
    };

    const closeStream = () => {
      return new Promise((resolve, reject) => {
        socket.emit("close_data_stream", (ack) => {
          if (ack.status === "ok") {
            resolve();
          } else {
            reject({ message: ack.msg });
          }
        });
      });
    };

    const startWriteStream = () => {
      mediaRecorder.ondataavailable = (e) => {
        const audioBlob = e.data;
        if (mediaRecorder.state === "recording")
          socket.emit("write_to_stream", audioBlob, (ack) => {
            if (ack.status !== "ok") {
              console.log("unable to write into stream");
              // offline chuncks ??
            }
          });
      };
    };

    const pauseVideo = () => {
      const video = document.getElementById(`${fieldName}-video-element`);
      if (video) video.pause();
    };

    const resumeVideo = () => {
      const video = document.getElementById(`${fieldName}-video-element`);
      if (video) video.play();
    };

    return {
      start: async () => {
        await initSocket();
        mimeType = await initMediaRecorder();
        currentFile = await openStream();
        startWriteStream();
      },
      pause: () => {
        mediaRecorder.pause();
        pauseVideo();
      },
      resume: () => {
        mediaRecorder.resume();
        resumeVideo();
      },
      stop: async () => {
        mediaRecorder.stop();
        for (const track of mediaStream.getTracks()) {
          track.stop();
        }
        await closeStream();
        socket.close();
        pauseVideo();
      },
      getCurrentFile: () => currentFile,
      getRecordingState: () => mediaRecorder.state,
      getFieldName: () => fieldName,
    };
  }

  const addAudioToForm = (form, fieldName, file) => {
    const id = `stream-field-${fieldName}`;
    const existingInput = $(`#${id}`);
    if (existingInput.length > 0) existingInput.remove();
    form.prepend(
      `<input id="${id}" type="hidden" name="${fieldName}" value="${file}" />`
    );
    $(`#stream-file-${fieldName}-badge`).removeClass("d-none");
    $(`#stream-file-${fieldName}-label`).html(file);
  };

  const removeAudioFromForm = (fieldName) => {
    const id = `stream-field-${fieldName}`;
    $(`#${id}`).remove();
    $(`#stream-file-${fieldName}-badge`).addClass("d-none");
    $(`#stream-file-${fieldName}-label`).html("");
  };

  const hasAudioInput = (fieldName) => {
    const id = `stream-field-${fieldName}`;
    return $(`#${id}`).length > 0;
  };

  const updateControls = (fieldName, state) => {
    const jBtn = $(`#${fieldName}-start-recording-btn`);
    switch (state) {
      case "recording":
        jBtn.removeClass("fa-pause");
        jBtn.addClass("recording-active fa-circle");
        break;
      case "paused":
        jBtn.removeClass("recording-active fa-circle");
        jBtn.addClass("fa-pause");
        break;
      case "inactive":
        jBtn.removeClass("recording-active fa-pause");
        jBtn.addClass("fa-circle");
        break;
    }
  };

  return {
    toggleRecording: async (e, fieldName, device) => {
      try {
        if (
          (!currentRecorder ||
            currentRecorder.getRecordingState() === "inactive") &&
          hasAudioInput(fieldName)
        ) {
          // overwrite old recording?
          if (
            !confirm(
              `The field '${fieldName}' already has a recording, do you want to delete it?`
            )
          )
            return;
          else {
            removeAudioFromForm(fieldName);
            currentRecorder = null;
          }
        } else if (currentRecorder) {
          // is a recorder for another field recording or paused?
          const state = currentRecorder.getRecordingState();
          const oldFieldName = currentRecorder.getFieldName();
          if (
            ["paused", "recording"].includes(state) &&
            oldFieldName !== fieldName
          ) {
            notifyAlert({
              type: "danger",
              text: `A recorder for '${oldFieldName}' is ${state}, please stop it before starting a new one.`,
            });
            return;
          }
        }

        // do the toggle
        if (!currentRecorder) {
          const form = $(e).closest("form");
          const recorder = new Recorder(form, fieldName, device);
          await recorder.start();
          addAudioToForm(form, fieldName, recorder.getCurrentFile());
          currentRecorder = recorder;
        } else if (currentRecorder.getRecordingState() === "paused") {
          currentRecorder.resume();
        } else if (currentRecorder.getRecordingState() === "recording") {
          currentRecorder.pause();
        }
        updateControls(fieldName, currentRecorder.getRecordingState());
      } catch (err) {
        notifyAlert({
          type: "danger",
          text: err.message || "unknown error",
        });
      }
    },
    stopRecording: async (fieldName) => {
      try {
        if (!currentRecorder || currentRecorder.getFieldName() !== fieldName)
          return;
        else if (
          ["paused", "recording"].includes(currentRecorder.getRecordingState())
        ) {
          await currentRecorder.stop();
          updateControls(fieldName, currentRecorder.getRecordingState());
          currentRecorder = null;
        }
      } catch (err) {
        notifyAlert({
          type: "danger",
          text: err.message || "unknown error",
        });
      }
    },
    removeRecording: async (e, fieldName) => {
      try {
        if (currentRecorder && currentRecorder.getFieldName() === fieldName) {
          const currentState = currentRecorder.getRecordingState();
          if (currentState === "recording") {
            notifyAlert({
              type: "danger",
              text: "Please stop the recording before removing the file",
            });
            return;
          } else if (currentState === "paused") {
            if (confirm("Are you sure you want to delete this recording?")) {
              await currentRecorder.stop();
              removeAudioFromForm(fieldName);
              currentRecorder = null;
            } else return;
          } else {
            removeAudioFromForm(fieldName);
          }
        } else {
          removeAudioFromForm(fieldName);
        }
      } catch (err) {
        notifyAlert({
          type: "danger",
          text: err.message || "unknown error",
        });
      }
    },
  };
})();
