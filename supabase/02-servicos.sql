-- Dados dos prints enviados. Pode ser reexecutado sem sobrescrever suas edições.
insert into public.services(id,name,duration,price,price_kind,active,note,sort_order) values
('corte','Corte',30,null,'consult',true,'',1),
('corte-barba','Corte + Barba',60,8000,'from',true,'',2),
('barba','Barba',30,null,'consult',true,'',3),
('dois-cortes','2 Cortes',60,8000,'from',true,'',4),
('progressiva','Escova Progressiva',90,10000,'from',true,'',5),
('combo-pendente','Corte + Barba + S...',60,10000,'from',false,'Confirmar o nome completo antes de ativar.',6)
on conflict(id) do nothing;
