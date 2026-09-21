-- PRIMEIRO entre uma vez no site com Google.
-- Depois substitua SEU_EMAIL_GOOGLE abaixo pelo mesmo e-mail e execute no SQL Editor.
-- Não execute no navegador e não conceda INSERT em admin_users para clientes.
do $$
declare target_id uuid;
begin
 select id into target_id from auth.users where lower(email)=lower('rbxclipes1@gmail.com') and email_confirmed_at is not null;
 if target_id is null then raise exception 'Entre no site com Google antes e confira o e-mail neste arquivo.';end if;
 insert into public.admin_users(user_id) values(target_id) on conflict do nothing;
end$$;
