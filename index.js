const File = require("@saltcorn/data/models/file");
const Table = require("@saltcorn/data/models/table");
const {
  div,
  button,
  script,
  span,
  i,
  input,
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
      attributes: { options: ["microphone"] },
    },
  ];
};

const openStream = async (
  tableId,
  rowId,
  fieldName,
  user,
  cfg,
  { oldTarget, mimeType }
) => {
  let file = null,
    absolutePath = null,
    servePath = null;
  if (oldTarget) {
    file = await File.findOne(oldTarget);
    absolutePath = file.location;
    servePath = File.absPathToServePath(file.location);
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
      cfg.folder ? cfg.folder : "/"
    );
    absolutePath = file.absolutePath;
    servePath = file.location;
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
          onClick: `recordingHelpers.toggleRecording(this, '${field.name}')`,
        },
        i({ id: `${field.name}-start-recording-btn`, class: "fas fa-circle" })
      ),
      button(
        {
          class: "btn btn-sm btn-secondary me-2",
          type: "button",
          onClick: `recordingHelpers.stopRecording('${field.name}')`,
        },
        i({ id: `${field.name}-stop-recording-btn`, class: "fas fa-stop" })
      ),
      span(
        {
          id: `stream-file-${field.name}-badge`,
          class: `${file_name ? "" : "d-none"} badge bg-secondary p-2`,
        },
        span(
          { id: `stream-file-${field.name}-label`, class: "me-2" },
          file_name ? file_name : ""
        ),
        i({
          id: `${field.name}-stop-recording-btn`,
          class: "fas fa-times",
          role: "button",
          onclick: `recordingHelpers.removeRecording(this, '${field.name}')`,
        })
      ),
      script({
        src: `/static_assets/${db.connectObj.version_tag}/socket.io.min.js`,
      })
    );
  },
  openDataStream: openStream,
};

module.exports = {
  sc_plugin_api_version: 1,
  plugin_name: "recorder",
  fileviews: { Recorder: recorderFileView },
  headers: [
    {
      script: "/plugins/public/recorder/recording_helpers.js",
    },
    {
      css: "/plugins/public/recorder/recorder.css",
    },
  ],
};
