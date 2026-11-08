import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";

/** Usage: npm run create-admin -- you@example.com "Full Name" 'a-strong-password' */
async function main() {
  const [email, name, password] = process.argv.slice(2);
  if (!email || !name || !password) throw new Error("Usage: npm run create-admin -- <email> <name> <password>");
  if (password.length < 12) throw new Error("Use a password of at least 12 characters.");
  const user = await db.user.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), name, role: "ADMIN", passwordHash: await bcrypt.hash(password, 12) },
    update: { name, passwordHash: await bcrypt.hash(password, 12), isActive: true },
  });
  console.log(`Admin ready: ${user.email}`);
}
main().then(() => db.$disconnect()).catch(async (e) => { console.error(e.message); await db.$disconnect(); process.exit(1); });
