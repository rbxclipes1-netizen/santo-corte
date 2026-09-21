import webpush from "web-push";
import { writeFileSync, existsSync } from "node:fs";
const path = ".env.vapid";
if (existsSync(path)) {
  console.error(
    ".env.vapid já existe. Preserve as chaves atuais para não invalidar os aparelhos cadastrados.",
  );
  process.exit(1);
}
const keys = webpush.generateVAPIDKeys();
writeFileSync(
  path,
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nVAPID_SUBJECT=mailto:SEU_EMAIL\n`,
  { mode: 0o600 },
);
console.log(
  "Chaves criadas em .env.vapid. Copie os valores para as variáveis da Netlify. Não envie esse arquivo ao GitHub.",
);
