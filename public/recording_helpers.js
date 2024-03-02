var recordingHelpers = (() => {
  let currentRecorder = null;

  function Recorder(form, fieldName) {
    const viewName = form.attr("data-viewname");
    const idVal = form.find("[name=id]").attr("value");
    const id = idVal ? parseInt(idVal) : undefined;
    const timeSlice = 1000;

    let socket = null;
    let mediaRecorder = null;
    let audioStream = null;
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
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      mediaRecorder = new MediaRecorder(audioStream);
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
          socket.emit("write_to_stream", audioBlob, (ack) => {});
      };
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
      },
      resume: () => {
        mediaRecorder.resume();
      },
      stop: async () => {
        mediaRecorder.stop();
        for (const track of audioStream.getTracks()) {
          track.stop();
        }
        await closeStream();
        socket.close();
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

  const updateRecordBtn = (fieldName, state) => {
    const domId = `#${fieldName}-start-recording-btn`;
    if (state === "recording") $(domId).addClass("recording-active");
    else $(domId).removeClass("recording-active");
  };

  return {
    toggleRecording: async (e, fieldName) => {
      try {
        if (currentRecorder) {
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
          } else if (state === "inactive") {
            if (oldFieldName === fieldName) {
              const oldFile = currentRecorder.getCurrentFile();
              if (oldFile) {
                if (
                  confirm(
                    `The field '${fieldName}' already has a recording, do you want to delete it?`
                  )
                ) {
                  removeAudioFromForm(fieldName);
                  currentRecorder = null;
                } else return;
              }
            }
            currentRecorder = null;
          }
        }

        if (!currentRecorder) {
          const form = $(e).closest("form");
          const recorder = new Recorder(form, fieldName);
          await recorder.start();
          addAudioToForm(form, fieldName, recorder.getCurrentFile());
          currentRecorder = recorder;
        } else if (currentRecorder.getRecordingState() === "paused") {
          currentRecorder.resume();
        } else if (currentRecorder.getRecordingState() === "recording") {
          currentRecorder.pause();
        }
        updateRecordBtn(fieldName, currentRecorder.getRecordingState());
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
          updateRecordBtn(fieldName, currentRecorder.getRecordingState());
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
