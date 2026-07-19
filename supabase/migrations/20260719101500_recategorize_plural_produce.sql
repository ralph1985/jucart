update public.shopping_items
set category_id = case
  when lower(name) in ('aguacate', 'aguacates') then 'fruit'
  when lower(name) in ('cebolla', 'cebollas') then 'vegetables'
  else category_id
end
where lower(name) in ('aguacate', 'aguacates', 'cebolla', 'cebollas');
