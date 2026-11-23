-- SSO-only: masuk hanya lewat Simtama ID.
-- 1) Sesi akun yang belum tertaut ke Simtama dicabut (berasal dari login kata sandi), agar
--    pemiliknya masuk ulang lewat SSO dan akunnya tertaut. Akun tertaut tetap masuk.
DELETE FROM "session"
WHERE "user_id" NOT IN (
  SELECT "user_id" FROM "account" WHERE "provider_id" = 'simtama'
);
--> statement-breakpoint
-- 2) Hash kata sandi lama tidak disimpan lagi.
DELETE FROM "account" WHERE "provider_id" = 'credential';
--> statement-breakpoint
UPDATE "user" SET "must_change_password" = false WHERE "must_change_password";
