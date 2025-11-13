console.log(
  "N8N_SINGLE_AUDIT_PATH:",
  JSON.stringify(process.env.N8N_SINGLE_AUDIT_PATH),
);
console.log(
  "N8N_BATCH_AUDIT_PATH:",
  JSON.stringify(process.env.N8N_BATCH_AUDIT_PATH),
);
console.log(
  "N8N_WEBHOOK_BASE_URL:",
  JSON.stringify(process.env.N8N_WEBHOOK_BASE_URL),
);
console.log(
  "N8N_WEBHOOK_SECRET:",
  JSON.stringify(process.env.N8N_WEBHOOK_SECRET),
);

const path1 = process.env.N8N_SINGLE_AUDIT_PATH;
const path2 = process.env.N8N_BATCH_AUDIT_PATH;

console.log("Path1 regex test:", /^\/.*/.test(path1), "Value:", path1);
console.log("Path2 regex test:", /^\/.*/.test(path2), "Value:", path2);
