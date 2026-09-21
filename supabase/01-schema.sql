-- Santo Corte v1. Execute uma vez em um projeto Supabase novo.
-- No SQL Editor do Supabase. Não desative RLS.
begin;
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set search_path=public,extensions;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated,anon,service_role;

create table public.admin_users(user_id uuid primary key references auth.users(id) on delete cascade);
create table public.services(
 id text primary key,name text not null check(length(name) between 2 and 100),duration int not null check(duration between 15 and 240 and duration%15=0),
 price int check(price between 0 and 10000000),price_kind text not null check(price_kind in ('consult','from','fixed')),active boolean not null default true,note text not null default '',sort_order int not null default 100,
 check((price_kind='consult' and price is null) or (price_kind!='consult' and price is not null))
);
create table public.barbers(
 id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 2 and 80),email text not null unique check(email=lower(trim(email))),
 user_id uuid unique references auth.users(id) on delete set null,active boolean not null default true,service_ids jsonb not null default '[]',schedule jsonb not null,
 check(jsonb_typeof(service_ids)='array'),check(jsonb_typeof(schedule)='array' and jsonb_array_length(schedule)=7)
);
create table public.reservations(
 id uuid primary key default gen_random_uuid(),barber_id uuid not null references public.barbers(id),service_id text references public.services(id),
 service_name text not null,created_by uuid not null references auth.users(id),customer_id uuid references auth.users(id),customer_name text not null,phone text not null,
 day date not null,start_min int not null,end_min int not null,price int,price_kind text not null,
 status text not null default 'confirmed' check(status in ('confirmed','completed','cancelled')),kind text not null check(kind in ('booking','manual','block')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),request_key uuid not null,
 check(start_min>=0 and end_min<=1440 and start_min<end_min),unique(created_by,request_key),
 constraint no_overlapping_reservations exclude using gist(barber_id with =,day with =,int4range(start_min,end_min,'[)') with &&) where(status!='cancelled')
);
create index reservations_customer_day on public.reservations(customer_id,day);
create index reservations_barber_day on public.reservations(barber_id,day);
create table public.push_subscriptions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,endpoint text not null unique,
 p256dh text not null,auth text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index push_subscriptions_user on public.push_subscriptions(user_id);
create table public.push_jobs(
 id uuid primary key default gen_random_uuid(),subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,reservation_id uuid references public.reservations(id),
 title text not null,body text not null,url text not null default '/painel',state text not null default 'pending' check(state in ('pending','sending','sent','failed')),
 attempts int not null default 0,available_at timestamptz not null default now(),locked_until timestamptz,claim_token uuid,last_error text,created_at timestamptz not null default now(),sent_at timestamptz
);
create index push_jobs_pending on public.push_jobs(available_at) where state in ('pending','sending');

create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.admin_users where user_id=auth.uid())$$;
create function private.my_barber() returns uuid language sql stable security definer set search_path='' as $$select id from public.barbers where user_id=auth.uid() and active limit 1$$;
create function private.is_staff() returns boolean language sql stable security definer set search_path='' as $$select private.is_admin() or private.my_barber() is not null$$;

alter table public.admin_users enable row level security;
alter table public.services enable row level security;
alter table public.barbers enable row level security;
alter table public.reservations enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_jobs enable row level security;
-- No direct client INSERT/UPDATE/DELETE. All writes use checked RPC functions below.
revoke all on public.admin_users,public.services,public.barbers,public.reservations,public.push_subscriptions,public.push_jobs from anon,authenticated;
grant select on public.services,public.barbers,public.reservations,public.push_subscriptions to authenticated;
grant all on public.push_subscriptions,public.push_jobs to service_role;
create policy services_read on public.services for select to authenticated using(active or private.is_staff());
-- All logged-in customers may read only the public barber projection via RPC,
-- but FK joins for their bookings need name access; grant column-specific SELECT below.
create policy barber_staff_read on public.barbers for select to authenticated using(private.is_admin() or user_id=auth.uid());
create policy reservation_read on public.reservations for select to authenticated using(private.is_admin() or barber_id=private.my_barber() or customer_id=auth.uid());
create policy push_read_own on public.push_subscriptions for select to authenticated using(user_id=auth.uid() and private.is_staff());

create function public.my_access() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('owner',private.is_admin(),'barber_id',private.my_barber())$$;
create function public.link_my_barber() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Entre com Google.';end if;
 update public.barbers b set user_id=auth.uid() from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and lower(u.email)=b.email and (b.user_id is null or b.user_id=u.id);
end$$;
create function public.public_catalog() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('services',coalesce((select jsonb_agg(to_jsonb(s) order by sort_order,name) from public.services s where active),'[]'::jsonb),
 'barbers',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'active',b.active,'service_ids',b.service_ids,'schedule',b.schedule) order by b.name) from public.barbers b where b.active),'[]'::jsonb))
$$;
create function public.available_slots(p_barber uuid,p_service text,p_day date) returns table(start_min int) language plpgsql stable security definer set search_path='' as $$
declare b public.barbers;s public.services;shift jsonb;opens int;closes int;
begin
 if p_day is null or p_day<(now() at time zone 'America/Sao_Paulo')::date or p_day>(now() at time zone 'America/Sao_Paulo')::date+90 then raise exception 'Escolha uma data nos próximos 90 dias.';end if;
 select * into b from public.barbers where id=p_barber and active;
 select * into s from public.services where id=p_service and active;
 if b.id is null or s.id is null or not b.service_ids ? p_service then raise exception 'Serviço indisponível para este profissional.';end if;
 shift=b.schedule->extract(dow from p_day)::int;
 if not coalesce((shift->>'enabled')::boolean,false) then return;end if;
 opens=(shift->>'open')::int;closes=(shift->>'close')::int;
 return query select t from generate_series(opens,closes-s.duration,15) t where (p_day+t*interval '1 minute') at time zone 'America/Sao_Paulo'>now()
 and not exists(select 1 from public.reservations r where r.barber_id=p_barber and r.day=p_day and r.status!='cancelled' and r.start_min<t+s.duration and r.end_min>t);
end$$;
create function public.create_reservation(p_barber uuid,p_service text,p_day date,p_start int,p_name text,p_phone text,p_key uuid,p_kind text default 'booking',p_duration int default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.barbers;s public.services;dur int;shift jsonb;old public.reservations;r public.reservations;customer uuid;phone text;
begin
 if auth.uid() is null then raise exception 'Entre com Google para confirmar.';end if;
 if p_key is null or p_barber is null or p_kind is null or p_kind not in ('booking','manual','block') then raise exception 'Dados inválidos.';end if;
 if p_kind!='booking' and not(private.is_admin() or coalesce(p_barber=private.my_barber(),false)) then raise exception 'Sem permissão para esta agenda.';end if;
 -- Serialize modifications for the same professional; exclusion constraint is a second atomic safeguard.
 select * into b from public.barbers where id=p_barber and active for update;
 if b.id is null then raise exception 'Profissional indisponível.';end if;
 select * into old from public.reservations where created_by=auth.uid() and request_key=p_key;
 if old.id is not null then return to_jsonb(old);end if;
 if p_kind='block' then dur=p_duration;else
  select * into s from public.services where id=p_service and active for share;
  if s.id is null or not b.service_ids ? p_service then raise exception 'Serviço indisponível para o profissional.';end if;dur=s.duration;
 end if;
 if p_day is null or p_day<(now() at time zone 'America/Sao_Paulo')::date or p_day>(now() at time zone 'America/Sao_Paulo')::date+90 then raise exception 'Data fora do período de agendamento.';end if;
 shift=b.schedule->extract(dow from p_day)::int;
 if dur is null or dur<15 or dur>720 or dur%15!=0 or p_start is null or p_start%15!=0 or not coalesce((shift->>'enabled')::boolean,false) or p_start<(shift->>'open')::int or p_start+dur>(shift->>'close')::int or (p_day+p_start*interval '1 minute') at time zone 'America/Sao_Paulo'<=now() then raise exception 'Horário fora do expediente ou no passado.';end if;
 if p_name is null or length(trim(p_name)) not between 2 and 100 then raise exception 'Informe o nome do cliente ou motivo do bloqueio.';end if;
 phone=regexp_replace(coalesce(p_phone,''),'[^0-9+]','','g');
 if p_kind!='block' and length(regexp_replace(phone,'[^0-9]','','g')) not between 10 and 15 then raise exception 'Informe um telefone válido com DDD.';end if;
 if p_kind='booking' then
  customer=auth.uid();
 end if;
 insert into public.reservations(barber_id,service_id,service_name,created_by,customer_id,customer_name,phone,day,start_min,end_min,price,price_kind,kind,request_key)
 values(b.id,s.id,coalesce(s.name,'Bloqueio'),auth.uid(),customer,trim(p_name),phone,p_day,p_start,p_start+dur,s.price,coalesce(s.price_kind,'consult'),p_kind,p_key) returning * into r;
 return to_jsonb(r);
end$$;
create function public.change_reservation_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare r public.reservations;staff_access boolean;
begin
 if auth.uid() is null then raise exception 'Entre com Google.';end if;
 select * into r from public.reservations where id=p_id for update;
 if r.id is null then raise exception 'Reserva não encontrada.';end if;
 staff_access=private.is_admin() or coalesce(r.barber_id=private.my_barber(),false);
 if not staff_access and r.customer_id is distinct from auth.uid() then raise exception 'Sem permissão para esta reserva.';end if;
 if p_status is null or p_status not in ('cancelled','completed') or (p_status='completed' and not staff_access) then raise exception 'Ação não permitida.';end if;
 if r.status!='confirmed' then raise exception 'Esta reserva já foi encerrada.';end if;
 if not staff_access and (r.day+r.start_min*interval '1 minute') at time zone 'America/Sao_Paulo'<=now() then raise exception 'Para cancelar após o início, fale com a barbearia.';end if;
 if p_status='completed' and (r.kind='block' or (r.day+r.start_min*interval '1 minute') at time zone 'America/Sao_Paulo'>now()) then raise exception 'O atendimento ainda não pode ser concluído.';end if;
 update public.reservations set status=p_status,updated_at=now() where id=p_id;
end$$;
create function public.save_service(p_service jsonb) returns void language plpgsql security definer set search_path='' as $$
declare n text;k text;id_value text;a boolean;
begin
 if not private.is_admin() then raise exception 'Somente o administrador pode editar serviços.';end if;
 n=trim(p_service->>'name');k=p_service->>'price_kind';id_value=coalesce(nullif(p_service->>'id',''),gen_random_uuid()::text);a=coalesce((p_service->>'active')::int=1,false);
 if n is null or length(n) not between 2 and 100 or (a and n like '%...%') then raise exception 'Complete o nome do serviço.';end if;
 if k is null or k not in ('consult','from','fixed') then raise exception 'Tipo de preço inválido.';end if;
 if (p_service->>'duration') is null or (p_service->>'duration')::int not between 15 and 240 or (p_service->>'duration')::int%15!=0 then raise exception 'Duração inválida. Use múltiplos de 15 minutos.';end if;
 insert into public.services(id,name,duration,price,price_kind,active) values(id_value,n,(p_service->>'duration')::int,case when k='consult' then null else (p_service->>'price')::int end,k,a)
 on conflict(id) do update set name=excluded.name,duration=excluded.duration,price=excluded.price,price_kind=excluded.price_kind,active=excluded.active,note='';
end$$;
create function public.save_barber(p_barber jsonb) returns void language plpgsql security definer set search_path='' as $$
declare n text;e text;id_value uuid;u uuid;x jsonb;ids jsonb;sched jsonb;
begin
 if not private.is_admin() then raise exception 'Somente o administrador pode editar profissionais.';end if;
 n=trim(p_barber->>'name');e=lower(trim(p_barber->>'email'));id_value=coalesce(nullif(p_barber->>'id','')::uuid,gen_random_uuid());ids=p_barber->'services';sched=p_barber->'schedule';
 if n is null or length(n) not between 2 and 80 or e is null or e !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Informe nome e e-mail válidos.';end if;
 if jsonb_typeof(ids) is distinct from 'array' or jsonb_array_length(ids)<1 then raise exception 'Selecione os serviços atendidos.';end if;
 if exists(select 1 from jsonb_array_elements_text(ids) v where not exists(select 1 from public.services s where s.id=v)) then raise exception 'Serviço não encontrado.';end if;
 if jsonb_typeof(sched) is distinct from 'array' or jsonb_array_length(sched)!=7 then raise exception 'Informe o expediente semanal.';end if;
 for x in select * from jsonb_array_elements(sched) loop
  if jsonb_typeof(x->'enabled') is distinct from 'boolean' or (x->>'open') is null or (x->>'close') is null or (x->>'open')::int<0 or (x->>'close')::int>1440 or (x->>'open')::int>=(x->>'close')::int or (x->>'open')::int%15!=0 or (x->>'close')::int%15!=0 then raise exception 'Confira os horários do expediente.';end if;
 end loop;
 select id into u from auth.users where lower(email)=e and email_confirmed_at is not null limit 1;
 insert into public.barbers(id,name,email,user_id,active,service_ids,schedule) values(id_value,n,e,u,coalesce((p_barber->>'active')::int=1,false),ids,sched)
 on conflict(id) do update set name=excluded.name,email=excluded.email,user_id=excluded.user_id,active=excluded.active,service_ids=excluded.service_ids,schedule=excluded.schedule;
end$$;
-- Customer projection returns professional name without exposing staff email.
create function public.my_bookings() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(t order by t.day desc,t.start_min desc),'[]'::jsonb) from(select r.*,b.name as barber_name from public.reservations r join public.barbers b on b.id=r.barber_id where r.customer_id=auth.uid() order by r.day desc,r.start_min desc limit 100)t
$$;

-- Push subscriptions: API and worker also validate vendor endpoints to prevent SSRF.
create function public.save_push_subscription(p_subscription jsonb) returns void language plpgsql security definer set search_path='' as $$
declare ep text;k1 text;k2 text;
begin
 if not private.is_staff() then raise exception 'Somente a equipe pode ativar avisos.';end if;
 ep=p_subscription->>'endpoint';k1=p_subscription->'keys'->>'p256dh';k2=p_subscription->'keys'->>'auth';
 if ep is null or length(ep)>2048 or ep !~ '^https://(fcm\.googleapis\.com|([a-zA-Z0-9-]+\.)*push\.services\.mozilla\.com|web\.push\.apple\.com|[a-zA-Z0-9-]+\.notify\.windows\.com)/' or k1 is null or k1 !~ '^[A-Za-z0-9_-]{80,100}$' or k2 is null or k2 !~ '^[A-Za-z0-9_-]{20,30}$' then raise exception 'Assinatura de notificações inválida.';end if;
 if (select count(*) from public.push_subscriptions where user_id=auth.uid())>=10 and not exists(select 1 from public.push_subscriptions where endpoint=ep and user_id=auth.uid()) then raise exception 'Limite de dispositivos atingido. Remova um dispositivo antigo.';end if;
 insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values(auth.uid(),ep,k1,k2)
 on conflict(endpoint) do update set user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth,updated_at=now();
end$$;
create function public.remove_push_subscription(p_endpoint text) returns void language plpgsql security definer set search_path='' as $$begin delete from public.push_subscriptions where endpoint=p_endpoint and user_id=auth.uid();end$$;
create function public.enqueue_test_push() returns int language plpgsql security definer set search_path='' as $$
declare total int;
begin
 if not private.is_staff() then raise exception 'Sem permissão.';end if;
 if exists(select 1 from public.push_jobs j join public.push_subscriptions s on s.id=j.subscription_id where s.user_id=auth.uid() and j.reservation_id is null and j.created_at>now()-interval '1 minute') then raise exception 'Aguarde um minuto antes de testar novamente.';end if;
 insert into public.push_jobs(subscription_id,title,body) select id,'Santo Corte · teste','Os avisos estão chegando neste aparelho.' from public.push_subscriptions where user_id=auth.uid();get diagnostics total=row_count;return total;
end$$;
create function private.queue_reservation_push() returns trigger language plpgsql security definer set search_path='' as $$
declare title_value text;body_value text;
begin
 if new.kind='block' then return new;end if;
 if tg_op='INSERT' then title_value='Novo agendamento · Santo Corte';elsif old.status is distinct from new.status and new.status='cancelled' then title_value='Agendamento cancelado · Santo Corte';else return new;end if;
 body_value=to_char(new.day,'DD/MM')||' às '||lpad((new.start_min/60)::text,2,'0')||':'||lpad((new.start_min%60)::text,2,'0')||'. Abra a agenda para ver os detalhes.';
 insert into public.push_jobs(subscription_id,reservation_id,title,body,url)
 select p.id,new.id,title_value,body_value,'/painel?date='||new.day::text from public.push_subscriptions p
 where p.user_id in(select user_id from public.admin_users union select user_id from public.barbers where id=new.barber_id and active);
 return new;
end$$;
create trigger reservation_push after insert or update of status on public.reservations for each row execute function private.queue_reservation_push();
create function public.claim_push_jobs(p_limit int default 10) returns table(id uuid,claim_token uuid,subscription_id uuid,title text,body text,url text,endpoint text,p256dh text,auth text) language sql security definer set search_path='' as $$
 with expired as(update public.push_jobs set state='failed',last_error='Lease expired after final attempt' where state='sending' and locked_until<now() and attempts>=6 returning id), selected as(select j.id from public.push_jobs j join public.push_subscriptions p on p.id=j.subscription_id where (j.state='pending' and j.available_at<=now() or j.state='sending' and j.locked_until<now()) and j.attempts<6 and (exists(select 1 from public.admin_users a where a.user_id=p.user_id) or exists(select 1 from public.barbers b where b.user_id=p.user_id and b.active)) order by j.created_at for update of j skip locked limit least(greatest(p_limit,1),10)),
 claimed as(update public.push_jobs j set state='sending',attempts=j.attempts+1,locked_until=now()+interval '1 minute',claim_token=gen_random_uuid() from selected where j.id=selected.id returning j.*)
 select c.id,c.claim_token,c.subscription_id,c.title,c.body,c.url,p.endpoint,p.p256dh,p.auth from claimed c join public.push_subscriptions p on p.id=c.subscription_id
$$;
create function public.finish_push_job(p_id uuid,p_token uuid,p_ok boolean,p_error text default null) returns void language sql security definer set search_path='' as $$
 update public.push_jobs set state=case when p_ok then 'sent' when attempts>=6 then 'failed' else 'pending' end,sent_at=case when p_ok then now() else null end,available_at=now()+(least(60,power(2,attempts)::int)*interval '1 minute'),locked_until=null,last_error=left(p_error,200)
 where id=p_id and claim_token=p_token and state='sending'
$$;
-- All RPCs are deny-by-default; grant only the explicitly needed callers.
revoke execute on all functions in schema private from public;
grant execute on function private.is_admin(),private.my_barber(),private.is_staff() to authenticated,anon;
revoke execute on function public.my_access(),public.link_my_barber(),public.public_catalog(),public.available_slots(uuid,text,date),public.create_reservation(uuid,text,date,int,text,text,uuid,text,int),public.change_reservation_status(uuid,text),public.save_service(jsonb),public.save_barber(jsonb),public.my_bookings(),public.save_push_subscription(jsonb),public.remove_push_subscription(text),public.enqueue_test_push(),public.claim_push_jobs(int),public.finish_push_job(uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.public_catalog(),public.available_slots(uuid,text,date) to anon,authenticated;
grant execute on function public.my_access(),public.link_my_barber(),public.create_reservation(uuid,text,date,int,text,text,uuid,text,int),public.change_reservation_status(uuid,text),public.save_service(jsonb),public.save_barber(jsonb),public.my_bookings(),public.save_push_subscription(jsonb),public.remove_push_subscription(text),public.enqueue_test_push() to authenticated;
grant execute on function public.claim_push_jobs(int),public.finish_push_job(uuid,uuid,boolean,text) to service_role;
create function public.my_push_status() returns jsonb language sql stable security definer set search_path='' as $$
select case when private.is_staff() then jsonb_build_object('devices',(select count(*) from public.push_subscriptions where user_id=auth.uid()),'pending',(select count(*) from public.push_jobs j join public.push_subscriptions s on s.id=j.subscription_id where s.user_id=auth.uid() and j.state in ('pending','sending')),'failed',(select count(*) from public.push_jobs j join public.push_subscriptions s on s.id=j.subscription_id where s.user_id=auth.uid() and j.state='failed')) else null end
$$;
revoke execute on function public.my_push_status() from public,anon;
grant execute on function public.my_push_status() to authenticated;
commit;
