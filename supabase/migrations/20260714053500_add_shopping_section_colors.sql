alter table public.shopping_sections
  add column color text not null default 'mint';

alter table public.shopping_sections
  add constraint shopping_sections_color_check check (
    color in ('mint', 'blue', 'violet', 'amber', 'rose', 'slate')
  );

update public.shopping_sections
set color = case id
  when 'alcampo' then 'blue'
  when 'dia' then 'rose'
  when 'mercadona' then 'mint'
  when 'farmacia' then 'violet'
  when 'general' then 'slate'
  else color
end;
