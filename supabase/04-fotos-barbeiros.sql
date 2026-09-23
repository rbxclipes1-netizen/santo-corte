-- Santo Corte: atualização incremental para fotos dos profissionais.
-- Execute no SQL Editor do projeto EXISTENTE antes de publicar os arquivos novos.
-- Pode ser executado novamente. Não recria tabelas nem remove agendamentos.
begin;
alter table public.barbers add column if not exists photo_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('barber-photos','barber-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- Fotos são públicas; somente administradores podem enviar e gerenciar arquivos.
drop policy if exists santo_photos_insert on storage.objects;
create policy santo_photos_insert on storage.objects for insert to authenticated
with check(bucket_id='barber-photos' and private.is_admin() and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$');
drop policy if exists santo_photos_read_admin on storage.objects;
create policy santo_photos_read_admin on storage.objects for select to authenticated
using(bucket_id='barber-photos' and private.is_admin());
-- Arquivos novos recebem nomes únicos. Fotos ainda utilizadas não podem ser apagadas pelo app.
drop policy if exists santo_photos_delete on storage.objects;
create policy santo_photos_delete on storage.objects for delete to authenticated
using(bucket_id='barber-photos' and private.is_admin() and not exists(select 1 from public.barbers where photo_path=storage.objects.name));
create or replace function public.save_barber(p_barber jsonb) returns void language plpgsql security definer set search_path='' as $$
declare n text;e text;id_value uuid;u uuid;x jsonb;ids jsonb;sched jsonb;photo text;
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
 if p_barber ? 'photo_path' then
  photo=nullif(p_barber->>'photo_path','');
  if photo is not null and (photo !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp)$' or not exists(select 1 from storage.objects where bucket_id='barber-photos' and name=photo)) then raise exception 'Envie uma foto válida antes de salvar.';end if;
 else select photo_path into photo from public.barbers where id=id_value;end if;
 select id into u from auth.users where lower(email)=e and email_confirmed_at is not null limit 1;
 insert into public.barbers(id,name,email,user_id,active,service_ids,schedule,photo_path) values(id_value,n,e,u,coalesce((p_barber->>'active')::int=1,false),ids,sched,photo)
 on conflict(id) do update set name=excluded.name,email=excluded.email,user_id=excluded.user_id,active=excluded.active,service_ids=excluded.service_ids,schedule=excluded.schedule,photo_path=excluded.photo_path;
end$$;
create or replace function public.public_catalog() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('services',coalesce((select jsonb_agg(to_jsonb(s) order by sort_order,name) from public.services s where active),'[]'::jsonb),
 'barbers',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'photo_path',b.photo_path,'active',b.active,'service_ids',b.service_ids,'schedule',b.schedule) order by b.name) from public.barbers b where b.active),'[]'::jsonb))
$$;
revoke execute on function public.save_barber(jsonb) from public,anon;
grant execute on function public.save_barber(jsonb) to authenticated;
revoke execute on function public.public_catalog() from public;
grant execute on function public.public_catalog() to anon,authenticated;
notify pgrst,'reload schema';
commit;
