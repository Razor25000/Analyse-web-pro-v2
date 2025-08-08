import type { UploadFileAdapter } from "./upload-file";

export const fileAdapter: UploadFileAdapter = {
  uploadFile: async (params) => {
    const file = params.file;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64String = `data:${file.type};base64,${buffer.toString("base64")}`;
    return { error: null, data: { url: base64String } };
  },
  uploadFiles: async (params) => {
    const promises = params.map(async (param) => {
      const arrayBuffer = await param.file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64String = `data:${param.file.type};base64,${buffer.toString("base64")}`;
      return { error: null, data: { url: base64String } };
    });
    return Promise.all(promises);
  },
};
