-- Migrate preset category icons from emoji to Lucide icon name strings.
-- The icon column type is text so the schema does not need to change.

update public.categories set icon = 'utensils'      where name = 'Food'          and is_preset = true;
update public.categories set icon = 'shopping-cart' where name = 'Groceries'     and is_preset = true;
update public.categories set icon = 'home'          where name = 'Housing'       and is_preset = true;
update public.categories set icon = 'car'           where name = 'Transport'     and is_preset = true;
update public.categories set icon = 'tv'            where name = 'Entertainment' and is_preset = true;
update public.categories set icon = 'shopping-bag' where name = 'Shopping'      and is_preset = true;
update public.categories set icon = 'heart'         where name = 'Health'        and is_preset = true;
update public.categories set icon = 'zap'           where name = 'Bills'         and is_preset = true;
update public.categories set icon = 'smartphone'    where name = 'Subscriptions' and is_preset = true;
update public.categories set icon = 'tag'           where name = 'Other'         and is_preset = true;
