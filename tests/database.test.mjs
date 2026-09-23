import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite({ extensions: { btree_gist } });
const base = new URL("../supabase/", import.meta.url);
let checks = 0;
async function ok(sql, args = []) {
  checks++;
  return (await db.query(sql, args)).rows;
}
async function deny(sql, args = []) {
  checks++;
  await assert.rejects(db.query(sql, args));
}
async function as(id, role = "authenticated") {
  await db.exec(`reset role;set role ${role};`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id || "",
  ]);
}
const admin = "11111111-1111-4111-8111-111111111111",
  barber = "22222222-2222-4222-8222-222222222222",
  customer = "33333333-3333-4333-8333-333333333333",
  other = "44444444-4444-4444-8444-444444444444",
  barber2 = "55555555-5555-4555-8555-555555555555";
try {
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`,
  );
  await db.exec(readFileSync(new URL("01-schema.sql", base), "utf8"));
  await db.exec(readFileSync(new URL("02-servicos.sql", base), "utf8"));
  // Storage tables are supplied by Supabase in production. Mock only its schema for PostgreSQL policy tests.
  await db.exec(`create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated,anon;
    grant select,insert,delete on storage.objects to authenticated,anon;`);
  await db.exec(readFileSync(new URL("04-fotos-barbeiros.sql", base), "utf8"));
  await db.exec(readFileSync(new URL("04-fotos-barbeiros.sql", base), "utf8"));

  for (const [id, email] of [
    [admin, "admin@example.com"],
    [barber, "barber@example.com"],
    [customer, "customer@example.com"],
    [other, "other@example.com"],
    [barber2, "barber2@example.com"],
  ])
    await db.query("insert into auth.users values($1,$2,now())", [id, email]);
  await db.query("insert into public.admin_users values($1)", [admin]);
  const date = (
    await db.query(
      "select to_char((now() at time zone 'America/Sao_Paulo')::date+1,'YYYY-MM-DD') as d",
    )
  ).rows[0].d;
  const schedule = Array.from({ length: 7 }, () => ({
    enabled: true,
    open: 480,
    close: 1200,
  }));
  await as(admin);
  for (const [id, name, email] of [
    [barber, "Barbeiro A", "barber@example.com"],
    [barber2, "Barbeiro B", "barber2@example.com"],
  ])
    await ok("select public.save_barber($1)", [
      JSON.stringify({
        id,
        name,
        email,
        active: 1,
        services: ["corte", "corte-barba"],
        schedule,
      }),
    ]);
  const photo = `${admin}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`;
  const record = {
    id: barber,
    name: "Barbeiro A",
    email: "barber@example.com",
    active: 1,
    services: ["corte", "corte-barba"],
    schedule,
  };
  await ok(
    "insert into storage.objects(bucket_id,name) values('barber-photos',$1)",
    [photo],
  );
  await ok("select public.save_barber($1)", [
    JSON.stringify({ ...record, photo_path: photo }),
  ]);
  await ok("select public.save_barber($1)", [JSON.stringify(record)]);
  assert.equal(
    (await ok("select photo_path from public.barbers where id=$1", [barber]))[0]
      .photo_path,
    photo,
    "Old client retains the existing photo",
  );
  assert.equal(
    (
      await db.query("delete from storage.objects where name=$1 returning id", [
        photo,
      ])
    ).rows.length,
    0,
    "Cannot delete a referenced photo",
  );
  await deny("select public.save_barber($1)", [
    JSON.stringify({ ...record, photo_path: "https://foreign.example/a.jpg" }),
  ]);
  await deny("select public.save_barber($1)", [
    JSON.stringify({
      ...record,
      photo_path: `${admin}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png`,
    }),
  ]);
  await as(customer);
  await deny(
    "insert into storage.objects(bucket_id,name) values('barber-photos',$1)",
    [photo],
  );
  await deny("select public.save_barber($1)", [
    JSON.stringify({ ...record, photo_path: null }),
  ]);
  await as(barber);
  await deny(
    "insert into storage.objects(bucket_id,name) values('barber-photos',$1)",
    [photo],
  );
  await as(null, "anon");
  await deny(
    "insert into storage.objects(bucket_id,name) values('barber-photos',$1)",
    [photo],
  );
  const catalog = (await ok("select public.public_catalog() as c"))[0].c;
  const publicBarber = catalog.barbers.find((b) => b.id === barber);
  assert.equal(publicBarber.photo_path, photo);
  assert.equal(publicBarber.email, undefined);
  assert.equal(publicBarber.user_id, undefined);
  await as(admin);
  await ok("select public.save_barber($1)", [
    JSON.stringify({ ...record, photo_path: null }),
  ]);
  assert.equal(
    (await ok("select photo_path from public.barbers where id=$1", [barber]))[0]
      .photo_path,
    null,
  );
  assert.equal(
    (
      await db.query("delete from storage.objects where name=$1 returning id", [
        photo,
      ])
    ).rows.length,
    1,
  );
  await ok("select public.save_barber($1)", [
    JSON.stringify({ ...record, active: 0 }),
  ]);
  assert.equal(
    (await ok("select public.public_catalog() as c"))[0].c.barbers.some(
      (b) => b.id === barber,
    ),
    false,
  );
  await ok("select public.save_barber($1)", [JSON.stringify(record)]);
  await as(null, "anon");
  assert.equal(
    (await ok("select public.public_catalog() as c"))[0].c.services.length,
    5,
  );
  await deny("select * from public.barbers");
  await deny("select * from public.reservations");
  await deny("select public.claim_push_jobs(10)");
  await as(customer);
  await deny("insert into public.admin_users values(auth.uid())");
  await deny("select public.save_barber($1)", [
    JSON.stringify({ id: barber, name: "Hijack" }),
  ]);
  await deny('select public.save_service(\'{"id":"corte","name":"Hijack"}\')');
  await deny("select public.claim_push_jobs(10)");
  await deny(
    "select public.create_reservation($1,'corte',$2,600,'Cliente','31999998888',gen_random_uuid(),'manual',null)",
    [barber, date],
  );
  await as(barber);
  assert.equal(
    (await ok("select public.my_access() as a"))[0].a.barber_id,
    barber,
  );
  const sub = {
    endpoint: "https://fcm.googleapis.com/fcm/send/test-device",
    keys: { p256dh: "A".repeat(87), auth: "B".repeat(22) },
  };
  await ok("select public.save_push_subscription($1)", [JSON.stringify(sub)]);
  await deny("select public.save_push_subscription($1)", [
    JSON.stringify({ ...sub, endpoint: "http://127.0.0.1/internal" }),
  ]);
  await as(customer);
  const key = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const booked = (
    await ok(
      "select public.create_reservation($1,'corte-barba',$2,600,'Cliente','31999998888',$3,'booking',null) as r",
      [barber, date, key],
    )
  )[0].r;
  assert.equal(booked.status, "confirmed");
  assert.equal(booked.end_min, 660);
  assert.equal(booked.price, 8000);
  await db.exec("reset role");
  await db.exec(readFileSync(new URL("04-fotos-barbeiros.sql", base), "utf8"));
  const afterMigration = (
    await ok("select to_jsonb(r) as r from public.reservations r where id=$1", [
      booked.id,
    ])
  )[0].r;
  assert.deepEqual(
    afterMigration,
    booked,
    "Rerunning the photo migration preserves existing booking data",
  );
  await as(customer);

  assert.equal(
    (
      await ok(
        "select public.create_reservation($1,'corte-barba',$2,600,'Cliente','31999998888',$3,'booking',null) as r",
        [barber, date, key],
      )
    )[0].r.id,
    booked.id,
  );
  await deny(
    "select public.create_reservation($1,'corte',$2,630,'Cliente','31999998888',gen_random_uuid(),'booking',null)",
    [barber, date],
  );
  const slots = (
    await ok("select * from public.available_slots($1,'corte',$2)", [
      barber,
      date,
    ])
  ).map((x) => x.start_min);
  assert(!slots.includes(585) && !slots.includes(600) && !slots.includes(645));
  assert(slots.includes(570) && slots.includes(660));
  assert.equal(
    (await ok("select public.my_bookings() as b"))[0].b[0].barber_name,
    "Barbeiro A",
  );
  await deny("select public.change_reservation_status($1,'completed')", [
    booked.id,
  ]);
  await as(other);
  assert.equal((await ok("select * from public.reservations")).length, 0);
  await deny("select public.change_reservation_status($1,'cancelled')", [
    booked.id,
  ]);
  await as(barber2);
  assert.equal((await ok("select * from public.reservations")).length, 0);
  await deny("select public.change_reservation_status($1,'cancelled')", [
    booked.id,
  ]);
  await deny(
    "select public.create_reservation($1,null,$2,720,'Intervalo','',gen_random_uuid(),'block',60)",
    [barber, date],
  );
  await as(barber);
  assert.equal((await ok("select * from public.reservations")).length, 1);
  await deny("select public.change_reservation_status($1,'completed')", [
    booked.id,
  ]);
  await as(null, "service_role");
  const jobs = await ok("select * from public.claim_push_jobs(10)");
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].endpoint, sub.endpoint);
  assert.equal(
    (await ok("select * from public.claim_push_jobs(10)")).length,
    0,
  );
  await ok("select public.finish_push_job($1,$2,true,null)", [
    jobs[0].id,
    jobs[0].claim_token,
  ]);
  assert.equal(
    (await ok("select state from public.push_jobs"))[0].state,
    "sent",
  );
  await as(customer);
  await ok("select public.change_reservation_status($1,'cancelled')", [
    booked.id,
  ]);
  assert(
    (
      await ok("select * from public.available_slots($1,'corte',$2)", [
        barber,
        date,
      ])
    ).some((x) => x.start_min === 600),
  );
  await as(barber);
  await ok(
    "select public.create_reservation($1,null,$2,600,'Intervalo','',gen_random_uuid(),'block',60)",
    [barber, date],
  );
  await as(customer);
  await deny(
    "select public.create_reservation($1,'corte',$2,615,'Cliente','31999998888',gen_random_uuid(),'booking',null)",
    [barber, date],
  );
  await deny(
    "select public.create_reservation($1,'corte',$2,1190,'Cliente','31999998888',gen_random_uuid(),'booking',null)",
    [barber, date],
  );
  await deny(
    "select public.create_reservation($1,'corte',current_date-1,600,'Cliente','31999998888',gen_random_uuid(),'booking',null)",
    [barber],
  );
  console.log(
    "PASS",
    checks,
    "SQL operations: schema, seed, RLS, privilege escalation, booking, overlap, replay, cancellation, staff separation, push queue, endpoints, photo migration and Storage policies.",
  );
} catch (e) {
  console.error("SQL TEST FAILURE:", e.message, e.detail, e.where);
  process.exitCode = 1;
} finally {
  await db.close();
}
