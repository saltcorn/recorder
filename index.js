const File = require("@saltcorn/data/models/file");
const Table = require("@saltcorn/data/models/table");
const Workflow = require("@saltcorn/data/models/workflow");
const Form = require("@saltcorn/data/models/form");
const { eval_expression } = require("@saltcorn/data/models/expression");
const {
  div,
  button,
  script,
  span,
  i,
  input,
  video,
  domReady,
} = require("@saltcorn/markup/tags");
const db = require("@saltcorn/data/db");
const { createWriteStream } = require("fs");
const { extension } = require("mime-types");

const configFields = async (field) => {
  const dirs = await File.allDirectories();
  const table = Table.findOne(field.table_id);
  return [
    {
      name: "file_name_field",
      label: "Name field",
      sublabel:
        "The file name comes from this field or the field name will be used.",
      type: "String",
      attributes: {
        options: table
          .getFields()
          .filter((f) => f.type?.name === "String")
          .map((f) => f.name),
      },
    },
    {
      name: "folder",
      label: "Folder",
      type: "String",
      attributes: { options: dirs.map((d) => d.path_to_serve) },
    },
    {
      name: "device",
      label: "Device",
      type: "String",
      required: true,
      attributes: {
        options: ["microphone", "camera", "microphone and camera"],
      },
    },
  ];
};

const openStream = async (
  tableId,
  rowId,
  fieldName,
  user,
  cfg,
  { oldTarget, mimeType },
) => {
  let file = null,
    absolutePath = null,
    servePath = null;
  if (oldTarget) {
    file = await File.findOne(oldTarget);
    absolutePath = file.location;
    servePath = file.path_to_serve;
  } else {
    let fileName = null;
    if (rowId) {
      const table = Table.findOne(tableId);
      const row = await table.getRow({ id: rowId });
      fileName = row[cfg.file_name_field];
    }
    if (!fileName) fileName = `${fieldName}_${new Date().valueOf()}`;
    file = await File.from_contents(
      `${fileName}.${extension(mimeType)}`,
      mimeType,
      "",
      user.id,
      user.role_id,
      cfg.folder ? cfg.folder : "/",
    );
    absolutePath = file.absolutePath;
    servePath = file.path_to_serve;
  }

  const stream = createWriteStream(absolutePath, { flags: "a" });
  return { stream, target: { file: servePath } };
};

const recorderFileView = {
  isEdit: true,
  isStream: true,
  description: "Stream based Recorder",
  configFields,
  run: (nm, file_name, attrs, cls, reqd, field) => {
    const isVideo = ["camera", "microphone and camera"].includes(attrs.device);
    return div(
      { id: "recorder" },
      file_name
        ? input({
            id: `stream-field-${field.name}`,
            type: "hidden",
            name: field.name,
            value: file_name,
          })
        : "",
      button(
        {
          class: "btn btn-sm btn-secondary me-2",
          type: "button",
          onClick: `recordingHelpers.toggleRecording(this, '${field.name}', '${attrs.device}')`,
        },
        i({ id: `${field.name}-start-recording-btn`, class: "fas fa-circle" }),
      ),
      button(
        {
          class: "btn btn-sm btn-secondary me-2",
          type: "button",
          onClick: `recordingHelpers.stopRecording('${field.name}')`,
        },
        i({ id: `${field.name}-stop-recording-btn`, class: "fas fa-stop" }),
      ),
      span(
        {
          id: `stream-file-${field.name}-badge`,
          class: `${file_name ? "" : "d-none"} badge bg-secondary p-2`,
        },
        span(
          { id: `stream-file-${field.name}-label`, class: "me-2" },
          file_name ? file_name : "",
        ),
        i({
          id: `${field.name}-stop-recording-btn`,
          class: "fas fa-times",
          role: "button",
          onclick: `recordingHelpers.removeRecording(this, '${field.name}')`,
        }),
      ),
      isVideo
        ? video({
            class: "d-block mt-2",
            style: "border-style: inset; width: 350px;",
            id: `${field.name}-video-element`,
          })
        : "",
      script({
        src: `/static_assets/${db.connectObj.version_tag}/socket.io.min.js`,
      }),
    );
  },
  openDataStream: openStream,
};

const continuousRecorder = {
  name: "ContinuousRecorder",
  description:
    "Continuous recording with automatic segmentation into table rows",
  display_state_form: false,
  get_state_fields: () => [],
  configuration_workflow: (req) =>
    new Workflow({
      steps: [
        {
          name: "Recording settings",
          form: async (context) => {
            const table = Table.findOne({ id: context.table_id });
            const fields = table.getFields();
            const dirs = await File.allDirectories();
            const fileFields = fields.filter(
              (f) => f.type === "File" || f.type?.name === "File",
            );
            const stringFields = fields.filter(
              (f) => f.type?.name === "String",
            );
            return new Form({
              fields: [
                {
                  name: "file_field",
                  label: "File field",
                  sublabel: "The File field where recordings will be stored",
                  type: "String",
                  required: true,
                  attributes: {
                    options: fileFields.map((f) => f.name),
                  },
                },
                {
                  name: "file_name_field",
                  label: "Name field",
                  sublabel:
                    "Optional String field whose value is used as the file name",
                  type: "String",
                  attributes: {
                    options: stringFields.map((f) => f.name),
                  },
                },
                {
                  name: "folder",
                  label: "Folder",
                  type: "String",
                  attributes: { options: dirs.map((d) => d.path_to_serve) },
                },
                {
                  name: "device",
                  label: "Device",
                  type: "String",
                  required: true,
                  attributes: {
                    options: ["microphone", "camera", "microphone and camera"],
                  },
                },
                {
                  name: "recording_duration",
                  label: "Segment duration (seconds)",
                  sublabel:
                    "Auto-save and restart after this many seconds. Leave empty for manual stop only.",
                  type: "Integer",
                },
                {
                  name: "extra_row_values",
                  label: "Extra row values",
                  sublabel:
                    "JavaScript expression for an object with additional field values, e.g. {date: new Date(), user_id: user.id}",
                  type: "String",
                },
                {
                  name: "acquire_wake_lock",
                  label: "Acquire wake lock",
                  sublabel: "Keep the screen on during recording",
                  type: "Bool",
                },
              ],
            });
          },
        },
      ],
    }),
  run: async (table_id, viewname, config, state, { req }) => {
    const { device, recording_duration, acquire_wake_lock } = config;
    const isVideo = ["camera", "microphone and camera"].includes(device);
    const clientConfig = {
      viewname,
      device,
      recording_duration: recording_duration || 0,
      acquire_wake_lock: !!acquire_wake_lock,
    };
    return div(
      { id: `continuous-recorder-${viewname}` },
      button(
        {
          class: "btn btn-primary",
          type: "button",
          id: `cr-start-btn-${viewname}`,
          onclick: `continuousRecorder.start('${viewname}')`,
        },
        i({ class: "fas fa-circle me-1" }),
        "Start Recording",
      ),
      button(
        {
          class: "btn btn-danger d-none",
          type: "button",
          id: `cr-stop-btn-${viewname}`,
          onclick: `continuousRecorder.stop('${viewname}')`,
        },
        i({ class: "fas fa-stop me-1" }),
        "Stop Recording",
      ),
      div({ id: `cr-status-${viewname}`, class: "mt-2" }),
      isVideo
        ? video({
            class: "d-block mt-2",
            style: "border-style: inset; width: 350px;",
            id: `cr-video-${viewname}`,
          })
        : "",
      script({
        src: `/static_assets/${db.connectObj.version_tag}/socket.io.min.js`,
      }),
      script(
        domReady(`continuousRecorder.init(${JSON.stringify(clientConfig)})`),
      ),
    );
  },
  openDataStream: async (
    table_id,
    viewName,
    id,
    fieldName,
    fieldView,
    user,
    configuration,
    targetOpts,
  ) => {
    const { mimeType } = targetOpts;
    const fileName = `recording_${new Date().valueOf()}`;
    const file = await File.from_contents(
      `${fileName}.${extension(mimeType)}`,
      mimeType,
      "",
      user.id,
      user.role_id,
      configuration.folder || "/",
    );
    const stream = createWriteStream(file.absolutePath, { flags: "a" });
    return { stream, target: { file: file.path_to_serve } };
  },
  routes: {
    insert_row: async (table_id, viewname, config, body, { req, res }) => {
      const { file_field, file_name_field, extra_row_values } = config;
      const { file_path } = body;
      const table = Table.findOne({ id: table_id });

      let extraValues = {};
      if (extra_row_values) {
        extraValues = eval_expression(extra_row_values, {}, req.user);
      }

      const row = { ...extraValues, [file_field]: file_path };

      if (file_name_field && extraValues[file_name_field]) {
        const file = await File.findOne(file_path);
        if (file) {
          await file.rename(
            extraValues[file_name_field] + "." + file.filename.split(".").pop(),
          );
        }
      }

      await table.insertRow(row, req.user);
      res.json({ success: true });
    },
  },
};

module.exports = {
  sc_plugin_api_version: 1,
  plugin_name: "recorder",
  fileviews: { Recorder: recorderFileView },
  viewtemplates: [continuousRecorder],
  headers: [
    {
      script: `/plugins/public/recorder@${
        require("./package.json").version
      }/recording_helpers.js`,
    },
    {
      script: `/plugins/public/recorder@${
        require("./package.json").version
      }/waveplayer.js`,
    },
    {
      css: "/plugins/public/recorder/recorder.css",
    },
  ],
};
